const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const { exec } = require('child_process');
const util = require('util');
const axios = require('axios');
const aiEngine = require('../utils/aiEngine.js'); 

const execPromise = util.promisify(exec);
const prisma = new PrismaClient();

/** Match multer filename prefix — filesystem-safe segment of session_id */
function safeSessionFilePrefix(sessionId) {
  return String(sessionId || '').replace(/[^a-zA-Z0-9._-]/g, '_') || 'nosession';
}

const VIDEOS_UPLOAD_DIR = path.join(__dirname, '../../uploads/videos');
/** Python preprocessing writes `{video_stem}_audio.wav` next to config temp_video_path */
function resolveTempUploadsDir() {
  const fromEnv = process.env.PREPVIEW_TEMP_UPLOADS;
  if (fromEnv) return path.resolve(fromEnv);
  return path.join(__dirname, '../../../server/artifacts/temp_uploads');
}

/**
 * Deletes interview video files for this session from Node uploads and derived WAVs in the engine temp folder.
 * Safe to call after report is saved; no-ops if folders are missing.
 */
function deleteInterviewMediaForSession(sessionId) {
  const prefix = `${safeSessionFilePrefix(sessionId)}__`;
  let removed = 0;
  try {
    if (fs.existsSync(VIDEOS_UPLOAD_DIR)) {
      const names = fs.readdirSync(VIDEOS_UPLOAD_DIR);
      const tempDir = resolveTempUploadsDir();
      for (const name of names) {
        if (!name.startsWith(prefix)) continue;
        const videoPath = path.join(VIDEOS_UPLOAD_DIR, name);
        try {
          fs.unlinkSync(videoPath);
          removed += 1;
          console.log(`[Media cleanup] Removed video: ${name}`);
        } catch (e) {
          console.error(`[Media cleanup] Failed to delete video ${name}:`, e.message);
        }
        const stem = path.parse(name).name;
        const wavPath = path.join(tempDir, `${stem}_audio.wav`);
        try {
          if (fs.existsSync(wavPath)) {
            fs.unlinkSync(wavPath);
            console.log(`[Media cleanup] Removed audio: ${path.basename(wavPath)}`);
          }
        } catch (e) {
          console.error(`[Media cleanup] Failed to delete audio for ${name}:`, e.message);
        }
      }
    }
  } catch (e) {
    console.error('[Media cleanup] Error scanning uploads:', e.message);
  }
  if (removed === 0) {
    console.log(`[Media cleanup] No files matched prefix for session (legacy names or empty): ${sessionId}`);
  }
}

// Simple in-memory cache to keep dashboard fast
const __cache = {
  leaderboard: { at: 0, data: null },
};

async function getLeaderboardCached() {
  const now = Date.now();
  if (__cache.leaderboard.data && now - __cache.leaderboard.at < 60_000) {
    return __cache.leaderboard.data;
  }

  const reports = await prisma.finalReport.findMany({
    select: {
      userId: true,
      nlp_aggregate: true,
      cv_aggregate: true,
      user: {
        select: {
          id: true,
          username: true,
        },
      },
    },
  });

  const toNumber = (value) => {
    const n = typeof value === 'string' ? Number(value) : value;
    return Number.isFinite(n) ? n : 0;
  };

  const extractAvg = (jsonValue, key) => {
    if (!jsonValue) return 0;
    if (typeof jsonValue === 'string') {
      try {
        const parsed = JSON.parse(jsonValue);
        return toNumber(parsed?.[key]);
      } catch {
        return 0;
      }
    }
    return toNumber(jsonValue?.[key]);
  };

  // Aggregate per user (mean score across all their reports)
  const byUser = new Map();
  for (const r of reports) {
    const userId = r.userId;
    const username = r.user?.username || 'Unknown';
    const avgNlp = extractAvg(r.nlp_aggregate, 'avg_nlp_score');
    const avgCv = extractAvg(r.cv_aggregate, 'avg_cv_score');
    const score = (avgNlp + avgCv) / 2;

    const existing = byUser.get(userId) || {
      userId,
      username,
      totalScore: 0,
      totalNlp: 0,
      totalCv: 0,
      count: 0,
    };
    existing.totalScore += score;
    existing.totalNlp += avgNlp;
    existing.totalCv += avgCv;
    existing.count += 1;
    byUser.set(userId, existing);
  }

  const leaderboard = Array.from(byUser.values())
    .map((u) => {
      const denom = u.count || 1;
      return {
        userId: u.userId,
        username: u.username,
        score: Math.round((u.totalScore / denom) * 10) / 10, // 1 decimal
        avg_nlp_score: Math.round((u.totalNlp / denom) * 10) / 10,
        avg_cv_score: Math.round((u.totalCv / denom) * 10) / 10,
        reports_count: u.count,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((u, idx) => ({ rank: idx + 1, ...u }));

  __cache.leaderboard = { at: now, data: leaderboard };
  return leaderboard;
}

// Middleware to verify token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key-change-in-production'
    );
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Configure multer for video uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Ensure absolute path for compatibility with Python
    const uploadsDir = path.join(__dirname, '../../uploads/videos'); 
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const userId = req.userId;
    const sessionSeg = safeSessionFilePrefix(req.body?.sessionId);
    const questionId = String(req.body?.questionId || 'unknown').replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname) || '.webm';
    // Prefix with session so we can delete all clips (+ matching *_audio.wav) after final report
    cb(null, `${sessionSeg}__${userId}_${questionId}_${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'));
    }
  },
});

// ==========================================
// 1. CREATE SESSION (With Detailed CV Fetch)
// ==========================================
router.post('/session', verifyToken, async (req, res) => {
  try {
    const { fieldId } = req.body;
    console.log(`👉 Session Request - User: ${req.userId}, Field: ${fieldId}`);

    // ---------------------------------------------------------
    // 👇 STEP A: Fetch User's CV Data (Summary, Skills, Projects) 🗄️
    // ---------------------------------------------------------
    const userWithCV = await prisma.user.findUnique({
      where: { id: req.userId },
      include: {
        // Hum man kar chal rahay hain ke relation ka naam 'cv' hai
        cv: {
          select: {
            summary: true,
            skills: true,
            projects: true
          }
        }
      }
    });

    if (!userWithCV) {
      return res.status(404).json({ message: "User not found" });
    }

    // Data Format karna (AI ke liye)
    // Agar CV nahi bani hui, toh empty object rakhein
    const cvData = userWithCV.cv ? {
      summary: userWithCV.cv.summary || "Not provided",
      skills: userWithCV.cv.skills || [],
      projects: userWithCV.cv.projects || []
    } : { summary: "No CV found", skills: [], projects: [] };

    console.log("📄 CV Data Fetched:", cvData ? "Yes" : "No");
    console.log(cvData)
    // ---------------------------------------------------------
    // 👇 STEP B: Generate Questions (AI) 🧠
    // ---------------------------------------------------------
    console.log("🤖 Generating AI Questions...");
    
    // Ab hum poora Object bhej rahay hain (Summary + Skills + Projects)
    const questions = await aiEngine.generateQuestions(cvData, fieldId || 'General');
    
    console.log(`✅ Generated ${questions.length} Questions`);

    // ---------------------------------------------------------
    // 👇 STEP C: Create Session (DB) 💾
    // ---------------------------------------------------------
    const generatedSessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const session = await prisma.interviewSession.create({
      data: {
        session_id: generatedSessionId,
        userId: req.userId,
        fieldid: fieldId || 'General',
      },
    });

    // ---------------------------------------------------------
    // 👇 STEP D: Send Response 🚀
    // ---------------------------------------------------------
    res.json({
      message: 'Interview session created',
      sessionId: session.session_id,
      fieldId: session.fieldid,
      questions: questions 
    });

  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ message: 'Error creating session', error: error.message });
  }
});

// Abandon in-progress session (exit mid-interview) — removes session, chunks, and any report
router.post('/abandon-session', verifyToken, async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ message: 'sessionId is required' });
    }
    const session = await prisma.interviewSession.findFirst({
      where: { session_id: sessionId, userId: req.userId },
    });
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    deleteInterviewMediaForSession(sessionId);
    await prisma.interviewSession.delete({
      where: { session_id: sessionId },
    });
    res.json({ ok: true });
  } catch (error) {
    console.error('abandon-session error:', error);
    res.status(500).json({ message: 'Failed to abandon session' });
  }
});

// ==========================================
// 2. UPLOAD VIDEO & TRIGGER PYTHON AI
// ==========================================

// ==========================================
// UPLOAD VIDEO & DYNAMICALLY TRIGGER PYTHON AI
// ==========================================
router.post('/upload', verifyToken, upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No video file uploaded' });
    }

    // Frontend se bheja gaya saara data yahan receive hoga
    const { 
        questionId, 
        sessionId, 
        questionType, 
        code, 
        language, 
        questionTitle, 
        questionDescription 
    } = req.body;

    if (!sessionId) {
      return res.status(400).json({ message: 'Session ID is required' });
    }

    // Fix Windows path issues
    let videoAbsolutePath = path.resolve(req.file.path);
    videoAbsolutePath = videoAbsolutePath.replace(/\\/g, '/'); 

    console.log(`[Node] 📹 Video Saved at: ${videoAbsolutePath}`);

    // 🌟 SMART ROUTING: Check question type to hit the right Python API
    if (questionType === 'coding') {
        
        console.log(`[Node] 💻 Handshaking with Python CODE Analyzer for Q: ${questionId}`);
        
        const engineUrl = (process.env.ENGINE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');
        axios.post(`${engineUrl}/analyze_code`, {
            session_id: sessionId,
            question_id: questionId,
            code: code,
            language: language,
            question_title: questionTitle,
            question_description: questionDescription,
            video_file_path: videoAbsolutePath // Path bhej rahe hain in case aapko coding mein bhi visual tracking chahiye ho
        })
        .then(pyRes => console.log(`[Python Code Success] Status: ${pyRes.data.status}`))
        .catch(err => console.error(`[Python Code Failed] Error: ${err.message}`));

    } else {
        
        console.log(`[Node] 🗣️ Handshaking with Python VERBAL Analyzer for Q: ${questionId}`);
        
        const engineUrl = (process.env.ENGINE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');
        axios.post(`${engineUrl}/analyze_chunk`, {
            session_id: sessionId,
            question_id: questionId,
            video_file_path: videoAbsolutePath
        })
        .then(pyRes => console.log(`[Python Verbal Success] Status: ${pyRes.data.status}`))
        .catch(err => console.error(`[Python Verbal Failed] Error: ${err.message}`));
    }

    // Response back to React immediately (Don't wait for Python)
    res.json({
      message: `Video uploaded successfully. ${questionType === 'coding' ? 'Code' : 'Verbal'} analysis started in background.`,
      sessionId: sessionId,
      filename: req.file.filename,
      pythonTriggered: true,
      analysisType: questionType
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Error uploading video', error: error.message });
  }
});





// ==========================================
// 🏁 FINISH INTERVIEW & GENERATE REPORT
// ==========================================
router.post('/finish-interview', verifyToken, async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ message: 'Session ID is required' });
    }

    const session = await prisma.interviewSession.findFirst({
      where: { session_id: sessionId, userId: req.userId },
    });
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    console.log(`[Node] 🏁 Finishing Interview for Session: ${sessionId}`);

  

    // Call Python API to Generate Report
    // Yahan hum 'await' use karenge kyunki User report ka wait kar raha hai
    const engineUrl = (process.env.ENGINE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');
    const pythonResponse = await axios.post(`${engineUrl}/generate_finalreport`, {
      session_id: sessionId,
      user_id: req.userId // Token se nikala hua secure User ID
    });

    console.log("[Node] ✅ Report Generated Successfully!");

    deleteInterviewMediaForSession(sessionId);

    // Frontend ko data wapis bhejein
    res.json({
      message: 'Report generated successfully',
      data: pythonResponse.data 
    });

  } catch (error) {
    console.error('[Node] ❌ Report Generation Failed:', error.message);
    
    // Agar Python ne error diya
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    res.status(500).json({ message: 'Failed to generate report', error: error.message });
  }
});

// ==========================================
// 3. GET SESSION RESULTS (Updated for Report)
// ==========================================
router.get('/results/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    console.log("🔍 Searching FinalReport for Session:", sessionId);

    // 👇 FIX: Model ka naam 'FinalReport' hai, toh 'prisma.finalReport' use hoga
    const report = await prisma.finalReport.findFirst({
      where: { 
        session_id: sessionId // Schema mein yehi naam hai
      }
    });

    if (!report) {
      console.log(" Report not found in DB");
      return res.status(404).json({ message: "Report abhi generate nahi hui" });
    }

    console.log("✅ Report Found ID:", report.id);

    // Report ka data bhej dein
    res.status(200).json({
       success: true,
       data: report 
    });

  } catch (error) {
    console.error(' Database Error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});
// ==========================================
// 4. CODE EXECUTION (No Changes Needed)
// ==========================================
router.post('/run-code', verifyToken, async (req, res) => {
  try {
    const { code, language } = req.body;
    
    // JDoodle language codes
    const JDOODLE_LANGS = {
      javascript: 'nodejs',
      python: 'python3',
      cpp: 'cpp17',
      java: 'java'
    };

    const targetLang = JDOODLE_LANGS[language];
    if (!targetLang) return res.status(400).json({ message: 'Unsupported language' });

    const response = await fetch('https://api.jdoodle.com/v1/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: process.env.JDOODLE_CLIENT_ID,
        clientSecret: process.env.JDOODLE_CLIENT_SECRET,
        script: code,
        language: targetLang,
        versionIndex: "0" 
      })
    });

    const data = await response.json();
    
    // JDoodle returns output directly
    res.json({ 
      output: data.output, 
      error: data.error || null 
    });

  } catch (error) {
    res.status(500).json({ message: 'Execution error', error: error.message });
  }
});

// ==========================================
// 5. USER STATS ROUTES
// ==========================================
router.get('/count', verifyToken, async (req, res) => {
  try {
    // ✅ Schema Update: userId (camelCase) is correct based on schema
    const uniqueSessions = await prisma.interviewSession.groupBy({
      by: ['session_id'],
      where: { userId: req.userId },
    });
    res.json({ count: uniqueSessions.length });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/sessions', verifyToken, async (req, res) => {
  try {
    const includeChunks = String(req.query?.includeChunks || 'true') !== 'false';
    const sessions = await prisma.interviewSession.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' }, // ✅ Schema uses createdAt
      include: includeChunks
        ? { chunks: true }
        : undefined
    });
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ==========================================
// 6. LEADERBOARD (Top 10 users)
// ==========================================
router.get('/leaderboard', verifyToken, async (req, res) => {
  try {
    const leaderboard = await getLeaderboardCached();
    res.json({ leaderboard });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ message: 'Failed to fetch leaderboard' });
  }
});

// ==========================================
// 6.5 DASHBOARD SUMMARY (Fast, lightweight)
// ==========================================
router.get('/dashboard-summary', verifyToken, async (req, res) => {
  try {
    // 1) Completed interviews: sessions that still exist with a final report (abandon removes partials)
    const interviewCount = await prisma.interviewSession.count({
      where: {
        userId: req.userId,
        report: { isNot: null },
      },
    });

    // 2) Recent completed interviews (latest reports)
    const recentReportRows = await prisma.finalReport.findMany({
      where: { userId: req.userId },
      orderBy: { created_at: 'desc' },
      take: 8,
      select: {
        session_id: true,
        created_at: true,
        session: {
          select: {
            fieldid: true,
            createdAt: true,
          },
        },
      },
    });
    const recentSessions = recentReportRows.map((r) => ({
      session_id: r.session_id,
      fieldid: r.session?.fieldid ?? 'General',
      createdAt: r.created_at,
      created_at: r.created_at,
    }));

    // 3) Best streak (consecutive active days)
    const allSessionDates = await prisma.interviewSession.findMany({
      where: { userId: req.userId },
      select: { createdAt: true },
    });
    const daySet = new Set();
    for (const s of allSessionDates) {
      const d = new Date(s.createdAt);
      if (Number.isNaN(d.getTime())) continue;
      const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      daySet.add(dayKey);
    }
    const days = Array.from(daySet)
      .map((k) => new Date(`${k}T00:00:00`))
      .filter((d) => !Number.isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    let bestStreak = 0;
    let current = 0;
    let prev = null;
    for (const d of days) {
      if (!prev) current = 1;
      else {
        const diffDays = Math.round((d.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000));
        current = diffDays === 1 ? current + 1 : 1;
      }
      bestStreak = Math.max(bestStreak, current);
      prev = d;
    }

    // 4) Total practice time (span between first/last chunk per session)
    // Fetch only timestamps + session_id via relation
    const chunks = await prisma.interviewChunk.findMany({
      where: { session: { userId: req.userId } },
      select: { session_id: true, created_at: true },
      orderBy: { created_at: 'asc' },
      take: 5000, // safety cap
    });

    const sessionMinMax = new Map();
    for (const c of chunks) {
      const sid = c.session_id;
      const t = new Date(c.created_at).getTime();
      if (!Number.isFinite(t)) continue;
      const mm = sessionMinMax.get(sid) || { min: t, max: t };
      mm.min = Math.min(mm.min, t);
      mm.max = Math.max(mm.max, t);
      sessionMinMax.set(sid, mm);
    }

    let totalPracticeMs = 0;
    for (const mm of sessionMinMax.values()) {
      if (mm.max > mm.min) totalPracticeMs += mm.max - mm.min;
    }

    // 5) Leaderboard (real data, cached for 60s)
    const leaderboard = await getLeaderboardCached();

    res.json({
      interviewCount,
      bestStreak,
      totalPracticeMs,
      recentSessions,
      leaderboard,
    });
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard summary' });
  }
});

// ==========================================
// 7. PERFORMANCE (Overall aggregated metrics)
// ==========================================
router.get('/performance-overall', verifyToken, async (req, res) => {
  try {
    const reports = await prisma.finalReport.findMany({
      where: { userId: req.userId },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        session_id: true,
        nlp_aggregate: true,
        cv_aggregate: true,
        ai_feedback: true,
        created_at: true,
      },
    });

    const toNumber = (value) => {
      const n = typeof value === 'string' ? Number(value) : value;
      return Number.isFinite(n) ? n : 0;
    };

    const extractAvg = (jsonValue, key) => {
      if (!jsonValue) return 0;
      if (typeof jsonValue === 'string') {
        try {
          const parsed = JSON.parse(jsonValue);
          return toNumber(parsed?.[key]);
        } catch {
          return 0;
        }
      }
      return toNumber(jsonValue?.[key]);
    };

    const clamp = (n, min = 0, max = 100) => Math.max(min, Math.min(max, n));

    const wpmFitScore = (wpm) => {
      const idealMin = 120;
      const idealMax = 150;
      if (!wpm || wpm <= 0) return 0;
      if (wpm >= idealMin && wpm <= idealMax) return 100;
      const dist = wpm < idealMin ? idealMin - wpm : wpm - idealMax;
      // -2 points per WPM away from range, capped at 0
      return clamp(100 - dist * 2);
    };

    const fillerScore = (avgFillerRate) => {
      // avg_filler_rate in this project is typically 0..1-ish (lower is better)
      const r = avgFillerRate || 0;
      // Map 0 -> 100, 0.12 -> 0 (matches params.yaml high threshold)
      return clamp(100 - (r / 0.12) * 100);
    };

    const calmnessScore = (avgNervousnessPct) => {
      // avg_nervousness is stored as percentage (0..100)
      return clamp(100 - (avgNervousnessPct || 0));
    };

    if (!reports.length) {
      return res.json({
        reportsCount: 0,
        overall: null,
        bars: [],
        latest: null,
      });
    }

    let sumNlp = 0;
    let sumCv = 0;
    let sumEye = 0;
    let sumWpm = 0;
    let sumFiller = 0;
    let sumNerv = 0;

    for (const r of reports) {
      sumNlp += extractAvg(r.nlp_aggregate, 'avg_nlp_score');
      sumCv += extractAvg(r.cv_aggregate, 'avg_cv_score');
      sumEye += extractAvg(r.cv_aggregate, 'avg_eye_contact');
      sumWpm += extractAvg(r.nlp_aggregate, 'avg_wpm');
      sumFiller += extractAvg(r.nlp_aggregate, 'avg_filler_rate');
      sumNerv += extractAvg(r.cv_aggregate, 'avg_nervousness');
    }

    const denom = reports.length || 1;
    const overall = {
      avg_nlp_score: Math.round((sumNlp / denom) * 10) / 10,
      avg_cv_score: Math.round((sumCv / denom) * 10) / 10,
      avg_eye_contact: Math.round((sumEye / denom) * 10) / 10,
      avg_wpm: Math.round((sumWpm / denom) * 10) / 10,
      avg_filler_rate: Math.round((sumFiller / denom) * 1000) / 1000,
      avg_nervousness: Math.round((sumNerv / denom) * 10) / 10,
    };

    const bars = [
      {
        key: 'communication_quality',
        label: 'Communication Quality (NLP)',
        value: clamp(overall.avg_nlp_score),
      },
      {
        key: 'visual_presence',
        label: 'Visual Presence (Body Language)',
        value: clamp(overall.avg_cv_score),
      },
      {
        key: 'eye_contact',
        label: 'Eye Contact Consistency',
        value: clamp(overall.avg_eye_contact),
      },
      {
        key: 'speaking_pace',
        label: 'Speaking Pace (WPM Fit)',
        value: wpmFitScore(overall.avg_wpm),
      },
      {
        key: 'fluency',
        label: 'Fluency (Low Fillers)',
        value: fillerScore(overall.avg_filler_rate),
      },
      {
        key: 'calmness',
        label: 'Calmness (Low Nervousness)',
        value: calmnessScore(overall.avg_nervousness),
      },
    ];

    const latestReport = reports[0];
    res.json({
      reportsCount: reports.length,
      overall,
      bars,
      latest: {
        sessionId: latestReport.session_id,
        createdAt: latestReport.created_at,
        ai_feedback: latestReport.ai_feedback,
      },
    });
  } catch (error) {
    console.error('Performance overall error:', error);
    res.status(500).json({ message: 'Failed to fetch performance summary' });
  }
});

// ==========================================
// 8. PERFORMANCE (Latest 3 reports trend)
// ==========================================
router.get('/performance-latest3', verifyToken, async (req, res) => {
  try {
    const reports = await prisma.finalReport.findMany({
      where: { userId: req.userId },
      orderBy: { created_at: 'desc' },
      take: 3,
      select: {
        session_id: true,
        nlp_aggregate: true,
        cv_aggregate: true,
        created_at: true,
      },
    });

    const toNumber = (value) => {
      const n = typeof value === 'string' ? Number(value) : value;
      return Number.isFinite(n) ? n : 0;
    };

    const extractAvg = (jsonValue, key) => {
      if (!jsonValue) return 0;
      if (typeof jsonValue === 'string') {
        try {
          const parsed = JSON.parse(jsonValue);
          return toNumber(parsed?.[key]);
        } catch {
          return 0;
        }
      }
      return toNumber(jsonValue?.[key]);
    };

    const clamp = (n, min = 0, max = 100) => Math.max(min, Math.min(max, n));

    const trend = reports
      .map((r) => {
        const nlp = extractAvg(r.nlp_aggregate, 'avg_nlp_score');
        const cv = extractAvg(r.cv_aggregate, 'avg_cv_score');
        const overall = (nlp + cv) / 2;
        return {
          sessionId: r.session_id,
          createdAt: r.created_at,
          nlp: clamp(nlp),
          cv: clamp(cv),
          overall: clamp(overall),
        };
      })
      // For charts: oldest -> newest
      .reverse();

    res.json({ trend });
  } catch (error) {
    console.error('Performance latest3 error:', error);
    res.status(500).json({ message: 'Failed to fetch latest performance trend' });
  }
});

module.exports = router;