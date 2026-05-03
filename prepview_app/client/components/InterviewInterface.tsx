'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import axios from 'axios'
import BrandLogo from '@/components/BrandLogo'
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Code2,
  Loader2,
  LogOut,
  Mic,
  MonitorPause,
  Play,
  Square,
  Timer,
  Upload,
} from 'lucide-react'

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false })

interface InterviewInterfaceProps {
  fieldId: string
}

type InterviewQuestion = {
  id: number
  type?: 'verbal' | 'coding'
  question: string
  description: string
  timeLimitSec?: number | null
}

const languages = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python', label: 'Python' },
  { value: 'cpp', label: 'C++' },
  { value: 'java', label: 'Java' },
  
]

const REPORT_STATUS_MESSAGES = [
  'Gathering your answers from this session…',
  'Analyzing your speech, pace, and clarity…',
  'Reviewing eye contact and on-camera presence…',
  'Scoring each question against our rubric…',
  'Generating your personalized final report…',
  'Finalizing insights and recommendations…',
] as const

/** Verbal-only max recording length (no on-screen countdown for verbal) */
const VERBAL_MAX_RECORDING_MS = 5 * 60 * 1000

export default function InterviewInterface({ fieldId }: InterviewInterfaceProps) {
  const router = useRouter()
  // States
  const [isInterviewStarted, setIsInterviewStarted] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState(1)
  const [totalQuestions] = useState(5)
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null)
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const [code, setCode] = useState('// Write your code here\n')
  const [selectedLanguage, setSelectedLanguage] = useState('javascript')
  const [output, setOutput] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  
  const [isUploading, setIsUploading] = useState(false)
  /** Footer "Start Interview" — disable after first click until session starts or errors */
  const [isStartingInterview, setIsStartingInterview] = useState(false)
  const isStartingInterviewRef = useRef(false)

  const smallVideoRef = useRef<HTMLVideoElement>(null)
  const [isRecording, setIsRecording] = useState(false)
  
  // ⚡ CHANGE 1: State ki jagah Ref use karein (Fast & Synchronous)
  const mediaChunksRef = useRef<Blob[]>([]); 
  
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isStopped, setIsStopped] = useState(false)
  const [questions, setQuestion] = useState<any[]>([]) 
  const [timeLeftSec, setTimeLeftSec] = useState<number | null>(null)
  const timerIntervalRef = useRef<number | null>(null)
  const pausedByVisibilityRef = useRef(false)
  const [isTabHidden, setIsTabHidden] = useState(false)

  const verbalRecordingLimitTimerRef = useRef<number | null>(null)
  const verbalLimitFiredRef = useRef(false)
  const verbalFollowUpTimerRef = useRef<number | null>(null)
  const stopRecordingRef = useRef<() => Promise<void>>(async () => {})
  const currentQuestionRef = useRef(1)
  const [showVerbalTimeLimitModal, setShowVerbalTimeLimitModal] = useState(false)

  const [isFinishingInterview, setIsFinishingInterview] = useState(false)
  const [finishStatusIndex, setFinishStatusIndex] = useState(0)

  useEffect(() => {
    if (!isFinishingInterview) return
    setFinishStatusIndex(0)
    const id = window.setInterval(() => {
      setFinishStatusIndex((i) => (i + 1) % REPORT_STATUS_MESSAGES.length)
    }, 2600)
    return () => window.clearInterval(id)
  }, [isFinishingInterview])

  useEffect(() => {
    currentQuestionRef.current = currentQuestion
  }, [currentQuestion])

  useEffect(() => {
    return () => {
      if (verbalRecordingLimitTimerRef.current) {
        window.clearTimeout(verbalRecordingLimitTimerRef.current)
        verbalRecordingLimitTimerRef.current = null
      }
      if (verbalFollowUpTimerRef.current) {
        window.clearTimeout(verbalFollowUpTimerRef.current)
        verbalFollowUpTimerRef.current = null
      }
    }
  }, [])

  // 👇👇👇 --- UPDATED AI SPEAKING LOGIC --- 👇👇👇

  const speakQuestion = (text: string, onComplete?: () => void) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel(); 

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      utterance.pitch = 1;

      utterance.onend = () => {
        if (onComplete) onComplete();
      };

      utterance.onerror = () => {
        if (onComplete) onComplete();
      };

      window.speechSynthesis.speak(utterance);
    } else {
        if (onComplete) onComplete();
    }
  };

  useEffect(() => {
    if (isInterviewStarted && questions.length > 0 && mediaStream) {
      
      const currentQ = questions[currentQuestion - 1];
      
      if (currentQ) {
        if (recorder && recorder.state === 'recording') {
            recorder.pause();
        }

        const textToRead = `${currentQ.question}. ${currentQ.description}`;
        
        speakQuestion(textToRead, () => {
             console.log("🤖 AI finished speaking. Starting Recording...");
             startRecordingProcess(mediaStream);
        });
      }
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.speechSynthesis.cancel();
      }
    };
  }, [currentQuestion, isInterviewStarted, questions, mediaStream]);

  // Prevent accidental tab close/refresh during interview
  useEffect(() => {
    if (!isInterviewStarted) return
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
      return ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isInterviewStarted])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current)
        timerIntervalRef.current = null
      }
    }
  }, [])

  // Ensure floating camera preview gets the stream after it mounts
  useEffect(() => {
    if (!mediaStream) return
    if (!smallVideoRef.current) return
    try {
      smallVideoRef.current.srcObject = mediaStream
      // Some browsers require an explicit play() call
      smallVideoRef.current.play?.().catch(() => {})
    } catch {}
  }, [mediaStream, isInterviewStarted])

  // Pause/resume recording & timer if user switches tabs
  useEffect(() => {
    if (!isInterviewStarted) return
    const onVisibilityChange = () => {
      const hidden = document.visibilityState !== 'visible'
      setIsTabHidden(hidden)

      if (!recorder) return
      if (hidden) {
        if (recorder.state === 'recording') {
          recorder.pause()
          pausedByVisibilityRef.current = true
        }
      } else {
        if (pausedByVisibilityRef.current && recorder.state === 'paused') {
          recorder.resume()
        }
        pausedByVisibilityRef.current = false
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [isInterviewStarted, recorder])

  // 👆👆👆 --- LOGIC ENDS HERE --- 👆👆👆

  const startInterview = async () => {
    if (isStartingInterviewRef.current) return
    isStartingInterviewRef.current = true
    setIsStartingInterview(true)

    const token = localStorage.getItem('token')
    let createdSessionId: string | null = null

    try {
      const sessionResponse = await fetch('http://localhost:5000/api/interview/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ fieldId }),
      })

      const sessionData = await sessionResponse.json()
      if (!sessionResponse.ok) {
        throw new Error(sessionData.message || 'Failed to create session')
      }

      createdSessionId = sessionData.sessionId
      setSessionId(sessionData.sessionId)
      setQuestion(sessionData.questions)

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      })

      setMediaStream(stream)
      if (smallVideoRef.current) smallVideoRef.current.srcObject = stream

      setIsInterviewStarted(true)
    } catch (error) {
      console.error('Error starting interview:', error)
      if (createdSessionId && token) {
        try {
          await fetch('http://localhost:5000/api/interview/abandon-session', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ sessionId: createdSessionId }),
          })
        } catch {
          /* ignore */
        }
        setSessionId(null)
      }
      alert('Could not start interview. Please check permissions.')
      isStartingInterviewRef.current = false
      setIsStartingInterview(false)
    }
  }

  const startRecordingProcess = (stream: MediaStream) => {
    // ⚡ CHANGE 2: Ref ko reset karein
    mediaChunksRef.current = [];

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp8,opus',
    })

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        // ⚡ CHANGE 3: Direct Ref mein push karein (No State Delay)
        mediaChunksRef.current.push(event.data);
      }
    }

    // Note: onstop logic hum stopRecording function mein handle karenge promise ke zariye
    
    recorderRef.current = mediaRecorder
    setRecorder(mediaRecorder)
    mediaRecorder.start(1000) // Collect chunks every 1 second
    setIsRecording(true)
    setIsStopped(false)

    const currentQ = questions?.[currentQuestion - 1] as InterviewQuestion | undefined
    const isCoding = currentQ?.type === 'coding'

    if (verbalRecordingLimitTimerRef.current) {
      window.clearTimeout(verbalRecordingLimitTimerRef.current)
      verbalRecordingLimitTimerRef.current = null
    }

    // Start visible countdown only for coding questions
    if (isCoding) {
      const limit = Number(currentQ?.timeLimitSec) || 900
      setTimeLeftSec(limit)

      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current)
        timerIntervalRef.current = null
      }

      timerIntervalRef.current = window.setInterval(() => {
        if (document.visibilityState !== 'visible') return
        setTimeLeftSec((prev) => {
          if (prev === null) return prev
          if (prev <= 1) {
            window.setTimeout(() => {
              void stopRecordingRef.current()
            }, 0)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      setTimeLeftSec(null)
      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current)
        timerIntervalRef.current = null
      }
      // Verbal: hard 5 min cap, no UI timer — auto-stop then popup + next question
      verbalLimitFiredRef.current = false
      verbalRecordingLimitTimerRef.current = window.setTimeout(() => {
        verbalRecordingLimitTimerRef.current = null
        verbalLimitFiredRef.current = true
        void stopRecordingRef.current()
      }, VERBAL_MAX_RECORDING_MS)
    }
  }

  const stopRecording = async () => {
    if (!recorder || !isRecording || !sessionId) return

    setIsRecording(false)
    setIsUploading(true) 

    // Wait for REAL stop event
    await new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
        recorder.stop();
    });

    // Buffer safety
    await new Promise(r => setTimeout(r, 500));

    // Blob creation
    const blob = new Blob(mediaChunksRef.current, { type: 'video/webm' })
    
    console.log(`📹 Video Size: ${blob.size} bytes`);

    if (blob.size > 0) {
      const formData = new FormData()
      formData.append('video', blob, `question-${currentQuestion}.webm`)
      formData.append('questionId', `Q${currentQuestion}`) 
      formData.append('fieldId', fieldId)
      formData.append('sessionId', sessionId)
      
      // 🌟 NEW LOGIC: Backend ko question ka type aur details batayen
      const qType = currentQuestionData?.type || 'verbal';
      formData.append('questionType', qType);
      
      if (qType === 'coding') {
          // Agar coding question hai toh code editor ka data bhi sath bhejein
          formData.append('code', code); // Editor ka state variable
          formData.append('language', selectedLanguage); // Dropdown state
          formData.append('questionTitle', currentQuestionData.question);
          formData.append('questionDescription', currentQuestionData.description);
      }

      const token = localStorage.getItem('token')
      try {
        const response = await fetch('http://localhost:5000/api/interview/upload', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json()
          console.error('Upload failed:', errorData)
          alert('Upload failed. Please try again.')
        } else {
            console.log(`✅ Video uploaded & ${qType === 'coding' ? 'Code' : 'Verbal'} Analysis started`)
        }
      } catch (error) {
        console.error('Error uploading video:', error)
      } finally {
        setIsUploading(false) 
        setIsStopped(true)
      }
    } else {
        console.error("❌ Blob size is 0, nothing recorded!");
        setIsUploading(false)
        setIsStopped(true)
    }
  }

  stopRecordingRef.current = stopRecording

  const handleFinishInterview = async () => {
    if (!sessionId || isFinishingInterview) return
    setIsFinishingInterview(true)
    setFinishStatusIndex(0)
    try {
      console.log('🏁 Finishing Interview...')
      const token = localStorage.getItem('token')

      const response = await axios.post(
        'http://localhost:5000/api/interview/finish-interview',
        { sessionId },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      console.log('✅ Report Generated:', response.data)
      router.push(`/results/${sessionId}`)
    } catch (error) {
      console.error(' Error finishing interview:', error)
      setIsFinishingInterview(false)
      alert('Report generation failed. Please try again.')
    }
  }

  const handleNextQuestion = async () => {
    if (currentQuestion < totalQuestions) {
      setCurrentQuestion(currentQuestion + 1)
      setCode('// Write your code here\n')
      setOutput('')
      setIsStopped(false)
      setTimeLeftSec(null)
      
      // Clear chunks ref
      mediaChunksRef.current = [];
      setIsRecording(false) 

    } else {
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop())
      }
      
      const token = localStorage.getItem('token')
      try {
        await fetch('http://localhost:5000/api/interview/count', {
          headers: { Authorization: `Bearer ${token}` },
        })
        window.dispatchEvent(new Event('dashboard-refresh'))
      } catch (error) {
        console.error('Error updating stats:', error)
      }

      alert('Interview completed! Redirecting to dashboard...')
      router.push('/dashboard')
    }
  }

  const runCode = async () => {
    setIsRunning(true)
    setOutput('Running...\n')

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:5000/api/interview/run-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          code,
          language: selectedLanguage,
        }),
      })

      const data = await response.json()
      if (response.ok) {
        setOutput(data.output || data.result || 'Code executed successfully')
      } else {
        setOutput(`Error: ${data.error || data.message || 'Failed to execute code'}`)
      }
    } catch (error) {
      setOutput(`Error: ${error instanceof Error ? error.message : 'Failed to execute code.'}`)
    } finally {
      setIsRunning(false)
    }
  }

  useEffect(() => {
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [mediaStream])
  
  const currentQuestionData = (questions && questions.length > 0) 
  ? questions[currentQuestion - 1] 
  : { 
      question: "Welcome to PrepView AI", 
      description: "Click the 'Start Interview' button below to generate your AI-powered questions." 
    };

  const isCodingQuestion = (currentQuestionData as InterviewQuestion)?.type === 'coding'

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  const getMonacoLanguage = (lang: string) => {
    const mapping: { [key: string]: string } = {
      javascript: 'javascript',
      python: 'python',
      cpp: 'cpp',
      java: 'java',
      typescript: 'typescript',
      csharp: 'csharp',
    }
    return mapping[lang] || 'javascript'
  }

  return (
    <div className="h-screen overflow-hidden bg-background text-text-primary">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 bg-white border-b border-border px-6 py-4 shadow-sm z-30">
        <div className="flex items-center justify-between">
          <BrandLogo
            className="h-12 w-auto max-w-[min(85vw,300px)] object-contain sm:h-12 sm:max-w-[300px] md:h-12 md:max-w-[300px] lg:h-14 lg:max-w-[360px]"
            linkToHome={false}
          />
          <div className="flex items-center gap-3 sm:gap-4">
            <span className="text-gray-600 text-sm sm:text-base">
              Question {currentQuestion} of {questions.length || 5}
            </span>
            <button
              type="button"
              onClick={() => {
                if (!isInterviewStarted) {
                  if (typeof window !== 'undefined') window.speechSynthesis.cancel()
                  router.push('/dashboard')
                  return
                }
                const ok = window.confirm('Your interview is in progress. Are you sure you want to exit?')
                if (!ok) return

                const leave = async () => {
                  if (typeof window !== 'undefined') window.speechSynthesis.cancel()
                  const auth = localStorage.getItem('token')
                  const sid = sessionId
                  if (sid && auth) {
                    try {
                      const res = await fetch('http://localhost:5000/api/interview/abandon-session', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${auth}`,
                        },
                        body: JSON.stringify({ sessionId: sid }),
                      })
                      if (res.ok) {
                        window.dispatchEvent(new Event('dashboard-refresh'))
                      }
                    } catch (e) {
                      console.error(e)
                    }
                  }
                  if (mediaStream) {
                    mediaStream.getTracks().forEach((t) => t.stop())
                  }
                  router.push('/dashboard')
                }
                void leave()
              }}
              className="inline-flex items-center gap-1.5 text-sm sm:text-base text-gray-600 hover:text-text-primary transition-colors"
            >
              <LogOut className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" aria-hidden />
              <span>
                Exit<span className="hidden sm:inline"> Interview</span>
              </span>
            </button>
          </div>
        </div>
      </nav>

      {/* Scrollable mid section (navbar + bottom controls are fixed) */}
      <div className="h-full overflow-y-auto pt-16 pb-28">
        {/* Main Layout */}
        <div className="flex flex-col lg:flex-row">
          {/* Left Side */}
          <div className="w-full lg:w-1/2 flex flex-col p-6 space-y-6">
            <div className="bg-white rounded-xl p-6 border border-border shadow-md">
              <h3 className="text-xl font-bold mb-4 text-accent">Current Question</h3>
              <h4 className="text-lg font-semibold mb-2 text-text-primary">{currentQuestionData.question}</h4>
              <p className="text-gray-600">{currentQuestionData.description}</p>
            </div>
            <div className="bg-white rounded-xl p-8 border border-border flex items-center justify-center shadow-md">
              <div className="relative">
                <div className="w-48 h-48 rounded-full bg-gradient-to-br from-primary via-primary to-accent flex items-center justify-center shadow-2xl animate-pulse">
                  <div className="w-40 h-40 rounded-full bg-white flex items-center justify-center">
                    <Bot
                      className="h-24 w-24 text-primary sm:h-28 sm:w-28"
                      strokeWidth={1.35}
                      aria-hidden
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side (Monaco) */}
          <div className="w-full lg:w-1/2 flex flex-col p-6">
            <div className="bg-white rounded-xl border border-border overflow-hidden flex flex-col shadow-md relative min-h-[520px]">
             {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between gap-2">
              <h3 className="text-lg font-semibold text-text-primary inline-flex items-center gap-2 min-w-0">
                <Code2 className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                <span className="truncate">Code Editor</span>
              </h3>
              <div className="flex items-center space-x-3 shrink-0">
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  disabled={!isCodingQuestion}
                  className="px-3 py-1.5 border border-border rounded-lg text-sm bg-white disabled:opacity-50"
                >
                  {languages.map((lang) => (
                    <option key={lang.value} value={lang.value}>{lang.label}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={runCode}
                  disabled={isRunning || !isCodingQuestion}
                  className="inline-flex items-center justify-center gap-1.5 bg-button-primary text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
                      Running
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 shrink-0 fill-current" aria-hidden />
                      Run
                    </>
                  )}
                </button>
              </div>
            </div>
            
            {/* Editor */}
            {/* Editor should be usable while keeping Output visible */}
            <div className="flex-1 relative min-h-[220px]">
              <MonacoEditor
                height="100%"
                language={getMonacoLanguage(selectedLanguage)}
                theme="vs"
                value={code}
                onChange={(value) => setCode(value || '')}
                options={{ minimap: { enabled: true }, fontSize: 14, automaticLayout: true, readOnly: !isCodingQuestion }}
              />
            </div>
            
            {/* Output */}
            <div className="border-t border-border shrink-0">
              <div className="p-4 bg-gray-50">
                <h4 className="text-sm font-semibold text-text-primary mb-2">Output</h4>
                <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm text-green-400 h-[110px] lg:h-[140px] overflow-y-auto">
                  <pre className="whitespace-pre-wrap">{output || 'Output will appear here...'}</pre>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border px-6 py-4 shadow-lg z-20">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {!isInterviewStarted ? (
            <button
              type="button"
              disabled={isStartingInterview}
              aria-busy={isStartingInterview}
              onClick={startInterview}
              className="inline-flex items-center justify-center gap-2 bg-button-primary text-white px-8 py-3 rounded-lg font-semibold w-full md:w-auto enabled:hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70 disabled:pointer-events-none"
            >
              {isStartingInterview ? (
                <>
                  <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden />
                  Starting…
                </>
              ) : (
                <>
                  <Play className="h-5 w-5 shrink-0 fill-current" aria-hidden />
                  Start Interview
                </>
              )}
            </button>
          ) : (
            <div className="flex items-center justify-between w-full md:w-auto md:space-x-4">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex items-center gap-2 shrink-0" aria-hidden>
                  {isUploading ? (
                    <Upload className="h-5 w-5 text-primary animate-pulse" />
                  ) : isRecording ? (
                    <Mic className="h-5 w-5 text-red-600" />
                  ) : isStopped ? (
                    <CheckCircle2 className="h-5 w-5 text-gray-600" />
                  ) : (
                    <Mic className="h-5 w-5 text-gray-400" />
                  )}
                  <div className={`w-3.5 h-3.5 rounded-full shrink-0 ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`} />
                </div>
                <span className="text-text-primary text-sm sm:text-base truncate">
                  {isUploading ? 'Uploading & Analyzing...' : isRecording ? 'Recording...' : isStopped ? 'Stopped' : 'Paused'}
                </span>
              </div>

              {isCodingQuestion && timeLeftSec !== null && (
                <div className="text-sm font-semibold text-gray-700">
                  Time left: <span className={timeLeftSec <= 30 ? 'text-red-600' : ''}>{formatTime(timeLeftSec)}</span>
                </div>
              )}
              
              {isRecording ? (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="inline-flex items-center justify-center gap-2 bg-red-500 text-white px-8 py-3 rounded-lg font-semibold hover:opacity-90 mt-4 md:mt-0 w-full md:w-auto"
                >
                  <Square className="h-4 w-4 shrink-0 fill-current" aria-hidden />
                  Stop Recording
                </button>
              ) : isStopped ? (
                <button
                  type="button"
                  onClick={currentQuestion < totalQuestions ? handleNextQuestion : handleFinishInterview}
                  disabled={isUploading || isFinishingInterview}
                  aria-busy={isFinishingInterview}
                  className={`inline-flex items-center justify-center gap-2 bg-button-primary text-white px-8 py-3 rounded-lg font-semibold hover:opacity-90 mt-4 md:mt-0 w-full md:w-auto ${isUploading || isFinishingInterview ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {currentQuestion < totalQuestions ? (
                    <>
                      <ArrowRight className="h-5 w-5 shrink-0" aria-hidden />
                      Next Question
                    </>
                  ) : isFinishingInterview ? (
                    <>
                      <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden />
                      Generating report…
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden />
                      Finish Interview
                    </>
                  )}
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Floating camera preview (bottom-right) */}
      {isInterviewStarted && (
        <div className="hidden lg:block fixed bottom-28 right-6 w-44 h-36 bg-gray-900 rounded-xl overflow-hidden border-2 border-accent shadow-2xl z-40">
          <video
            ref={smallVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover transform scale-x-[-1]"
          />
        </div>
      )}

      {showVerbalTimeLimitModal && (
        <div
          className="fixed inset-0 z-[62] flex items-center justify-center bg-black/55 px-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="verbal-limit-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-border bg-white p-8 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <Timer className="h-7 w-7" strokeWidth={2} aria-hidden />
            </div>
            <h2 id="verbal-limit-title" className="text-xl font-bold text-text-primary sm:text-2xl">
              Taking a while to answer
            </h2>
            <p className="mt-3 text-gray-600">
              You&apos;ve reached the maximum time for this verbal response. Moving you to the next question…
            </p>
          </div>
        </div>
      )}

      {isInterviewStarted && isTabHidden && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-6">
          <div className="bg-white rounded-xl p-6 max-w-md w-full border border-border shadow-xl text-center">
            <div className="flex justify-center mb-3">
              <MonitorPause className="h-12 w-12 text-primary" strokeWidth={1.5} aria-hidden />
            </div>
            <div className="text-2xl font-bold text-text-primary mb-2">Interview paused</div>
            <p className="text-gray-600">
              Please return to this tab to continue. Your recording/timer will resume automatically.
            </p>
          </div>
        </div>
      )}

      {isFinishingInterview && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-gradient-to-br from-primary/95 via-primary-800/95 to-primary-900/98 px-6"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="finish-report-title"
          aria-describedby="finish-report-status"
        >
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/10 p-8 text-center shadow-2xl backdrop-blur-md">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
              <Loader2 className="h-9 w-9 animate-spin text-accent" strokeWidth={2} aria-hidden />
            </div>
            <h2 id="finish-report-title" className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Creating your report
            </h2>
            <p
              id="finish-report-status"
              key={finishStatusIndex}
              className="mt-5 min-h-[3.5rem] text-base leading-relaxed text-white/90 motion-reduce:animate-none motion-reduce:opacity-100 animate-fade-in-soft"
              aria-live="polite"
            >
              {REPORT_STATUS_MESSAGES[finishStatusIndex]}
            </p>
            <p className="mt-6 text-sm text-white/60">This can take a minute — please don&apos;t close this tab.</p>
          </div>
        </div>
      )}
    </div>
  )
}