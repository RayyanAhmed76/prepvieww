import requests
import json
import os
from dotenv import load_dotenv
from typing import Dict, Any
import concurrent.futures  # ✨ NAYA IMPORT FOR PARALLEL PROCESSING

from prepview_engine.utils.common import logger
from prepview_engine.config.configuration import CodeAnalysisConfig

import cv2
import numpy as np
from ultralytics import YOLO
import mediapipe as mp

load_dotenv()

class CodeAnalyzer:
    def __init__(self, config: CodeAnalysisConfig):
        """
        Initializes the Code Analyzer and PRE-LOADS HEAVY AI MODELS.
        """
        try:
            self.config = config
            self.weights = self.config.weights
            
            logger.info("⏳ Pre-loading YOLO & MediaPipe models into memory (Optimization)...")
            # ✨ OPTIMIZATION 1: Models ek hi dafa load honge memory mein
            self.yolo_model = YOLO('yolov8s.pt') 
            self.mp_face_mesh = mp.solutions.face_mesh
            
            logger.info(f"🚀 Code Analyzer Initialized (Provider: {self.config.provider}, Model: {self.config.model_name})")
            
        except Exception as e:
            logger.error(f"Failed to initialize CodeAnalyzer: {e}")
            raise e

    def evaluate_code(self, question: str, code: str, language: str) -> Dict[str, Any]:
        """
        Evaluates candidate's code using Groq or Ollama. (Logic unchanged)
        """
        if not code or not question:
            return {"success": False, "final_score": 0, "error_message": "Missing question or code for evaluation."}

        try:
            system_prompt = f"""
            You are an expert Technical Interviewer evaluating a candidate's code submission.
            Evaluate the candidate's solution strictly on 5 dimensions. Assign a raw score from 0 to 10 for each category (where 0 is terrible and 10 is perfect).

            STRICT RULES (CRITICAL):
            1. correctness (0-10): Does the code logically solve the core problem?
            2. code_quality (0-10): Is the code clean, readable, modular, and well-structured?
            3. problem_solving (0-10): Is the algorithm and approach sound?
            4. efficiency (0-10): Is the time/space complexity optimal?
            5. best_practices (0-10): Are edge cases, errors, and null values handled properly?

            REQUIRED JSON OUTPUT FORMAT:
            Return a raw JSON object with ONLY a "scores" object. Do NOT include any feedback strings.
            Example:
            {{
                "scores": {{
                    "correctness": 8, "code_quality": 7, "problem_solving": 9,
                    "efficiency": 8, "best_practices": 7
                }}
            }}
            """

            user_prompt = f"INTERVIEW QUESTION:\n{question}\n\nCANDIDATE'S SUBMITTED CODE ({language}):\n{code}"

            logger.info(f"⏳ Sending code evaluation request to {self.config.provider.upper()}...")
            result_text = ""

            if self.config.provider == "groq":
                api_key = os.getenv("GROQ_API_KEY")
                if not api_key: raise ValueError("API Key missing in environment.")
                headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
                payload = {
                    "model": self.config.model_name,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    "temperature": self.config.temperature,
                    "max_tokens": self.config.max_tokens,
                    "response_format": {"type": "json_object"}
                }
                response = requests.post(self.config.base_url, headers=headers, json=payload, timeout=30)
                if response.status_code == 200:
                    result_text = response.json()["choices"][0]["message"]["content"]
                else:
                    raise Exception(f"Groq API Error: {response.status_code}")
            else:
                payload = {
                    "model": self.config.model_name,
                    "prompt": f"{system_prompt}\n\n{user_prompt}",
                    "stream": False, "format": "json",
                    "options": {"temperature": self.config.temperature, "num_predict": self.config.max_tokens}
                }
                response = requests.post(self.config.base_url, json=payload, timeout=300)
                if response.status_code == 200:
                    result_text = response.json().get("response", "")
                else:
                    raise Exception(f"Ollama Error: {response.status_code}")

            clean_json_str = result_text.replace("```json", "").replace("```", "").strip()
            raw_scores = json.loads(clean_json_str).get("scores", {})

            final_score = 0.0
            final_score += float(raw_scores.get("correctness", 0)) * self.weights.get("correctness", 0.30) * 10
            final_score += float(raw_scores.get("code_quality", 0)) * self.weights.get("code_quality", 0.25) * 10
            final_score += float(raw_scores.get("problem_solving", 0)) * self.weights.get("problem_solving", 0.20) * 10
            final_score += float(raw_scores.get("efficiency", 0)) * self.weights.get("efficiency", 0.15) * 10
            final_score += float(raw_scores.get("best_practices", 0)) * self.weights.get("best_practices", 0.10) * 10

            return {
                "success": True,
                "final_score": round(final_score),
                "category_scores": raw_scores
            }

        except Exception as e:
            logger.error(f"Code Evaluation Failure: {e}")
            return {"success": False, "final_score": 0, "error_message": str(e)}

    # ... (analyze_gaze_and_face func same as before) ...
    def analyze_gaze_and_face(self, frame, face_mesh_model, img_w, img_h):
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mesh_results = face_mesh_model.process(rgb_frame)
        
        persons_in_frame, is_looking_away = 0, False
        if not mesh_results.multi_face_landmarks:
            return persons_in_frame, is_looking_away
            
        persons_in_frame = len(mesh_results.multi_face_landmarks)
        primary_face = mesh_results.multi_face_landmarks[0]
        
        face_3d = np.array([
            [0.0, 0.0, 0.0], [0.0, 330.0, -65.0], [-225.0, -170.0, -135.0],
            [225.0, -170.0, -135.0], [-150.0, 150.0, -125.0], [150.0, 150.0, -125.0]
        ], dtype=np.float64)
        
        face_2d = np.array([[int(primary_face.landmark[idx].x * img_w), int(primary_face.landmark[idx].y * img_h)] 
                            for idx in [1, 152, 33, 263, 61, 291]], dtype=np.float64)

        focal_length = 1 * img_w
        cam_matrix = np.array([[focal_length, 0, img_h / 2], [0, focal_length, img_w / 2], [0, 0, 1]], dtype=np.float64)
        
        success, rot_vec, trans_vec = cv2.solvePnP(face_3d, face_2d, cam_matrix, np.zeros((4, 1), dtype=np.float64))
        if success:
            rmat, _ = cv2.Rodrigues(rot_vec)
            angles, _, _, _, _, _ = cv2.RQDecomp3x3(rmat)
            pitch, yaw = angles[0], angles[1]
            if yaw < -25 or yaw > 25 or pitch < -25 or pitch > 35:
                is_looking_away = True
                
        return persons_in_frame, is_looking_away

    def analyze_video_for_cheating_master(self, video_path: str) -> Dict[str, Any]:
        """
        Uses pre-loaded YOLOv8 and MediaPipe for faster processing.
        """
        if not os.path.exists(video_path): return {"success": False, "error": "Video not found"}
        logger.info(f"--- Starting Master Proctoring Analysis for: {os.path.basename(video_path)} ---")
        
        # Fresh face_mesh context for this specific run
        face_mesh = self.mp_face_mesh.FaceMesh(min_detection_confidence=0.5, min_tracking_confidence=0.5, max_num_faces=5)

        cap = cv2.VideoCapture(video_path)
        fps = int(cap.get(cv2.CAP_PROP_FPS)) or 30 
        img_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        img_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        total_frames_processed = 0
        phone_detected_frames, book_or_laptop_detected_frames = 0, 0
        multiple_persons_frames, no_person_frames, looking_away_frames = 0, 0, 0

        frame_skip = max(1, fps // 2) 
        frame_count = 0
        
        while cap.isOpened():
            # ✨ OPTIMIZATION 3: Fast Frame Skipping
            ret = cap.grab() # Sirf frame pakarta hai, decode nahi karta (Fast)
            if not ret: break
                
            frame_count += 1
            if frame_count % frame_skip != 0:
                continue 
                
            # Jis frame ki baari hai, usey decode karo
            ret, frame = cap.retrieve()
            if not ret: continue

            total_frames_processed += 1

            # A. Face Analysis
            persons_in_frame, is_looking_away = self.analyze_gaze_and_face(frame, face_mesh, img_w, img_h)
            if persons_in_frame == 0: no_person_frames += 1
            elif persons_in_frame > 1: multiple_persons_frames += 1
            if is_looking_away: looking_away_frames += 1

            # B. Object Detection (Uses pre-loaded self.yolo_model)
            yolo_results = self.yolo_model(frame, conf=0.25, verbose=False)
            for r in yolo_results:
                for box in r.boxes:
                    cls_id = int(box.cls[0])
                    if cls_id == 67: phone_detected_frames += 1
                    elif cls_id in [73, 63]: book_or_laptop_detected_frames += 1

        cap.release()
        face_mesh.close()

        # ... (Baaki math calculations unchanged) ...
        seconds_per_processed_frame = frame_skip / fps 
        total_seconds_analyzed = round(total_frames_processed * seconds_per_processed_frame, 1)
        phone_seconds = round(phone_detected_frames * seconds_per_processed_frame, 1)
        book_seconds = round(book_or_laptop_detected_frames * seconds_per_processed_frame, 1)
        multiple_people_seconds = round(multiple_persons_frames * seconds_per_processed_frame, 1)
        away_from_camera_seconds = round(no_person_frames * seconds_per_processed_frame, 1)
        gaze_away_seconds = round(looking_away_frames * seconds_per_processed_frame, 1)

        multiple_people_pct = (multiple_persons_frames / total_frames_processed) * 100 if total_frames_processed > 0 else 0
        away_pct = (no_person_frames / total_frames_processed) * 100 if total_frames_processed > 0 else 0
        gaze_away_pct = (looking_away_frames / total_frames_processed) * 100 if total_frames_processed > 0 else 0

        is_cheating = False
        reasons = []

        if phone_detected_frames >= 3:
            is_cheating, reasons = True, reasons + [f"Cell phone detected (visible for ~{phone_seconds} seconds)."]
        if book_or_laptop_detected_frames >= 3:
            is_cheating, reasons = True, reasons + [f"Book/Notes/Screen detected (visible for ~{book_seconds} seconds)."]
        if total_frames_processed > 0:
            if multiple_people_pct > 2.0:
                is_cheating, reasons = True, reasons + [f"Multiple people detected in frame (for ~{multiple_people_seconds} seconds)."]
            if away_pct > 10.0: 
                is_cheating, reasons = True, reasons + [f"Candidate left the camera view (for ~{away_from_camera_seconds} seconds)."]
            if gaze_away_pct > 15.0:
                is_cheating, reasons = True, reasons + [f"Candidate frequently looked away from the screen (for ~{gaze_away_seconds} seconds)."]

        return {
            "success": True, "is_cheating_suspected": is_cheating, "reasons": reasons,
            "stats": {"total_video_duration_analyzed_seconds": total_seconds_analyzed, "phone_detected_seconds": phone_seconds, "book_or_laptop_detected_seconds": book_seconds, "multiple_people_pct": round(multiple_people_pct, 2), "away_from_camera_pct": round(away_pct, 2), "gaze_away_pct": round(gaze_away_pct, 2)}
        }

    def generate_final_interview_score(self, question: str, code: str, language: str, video_path: str) -> Dict[str, Any]:
        """
        Calculates final score by running Code Evaluation and Proctoring IN PARALLEL.
        """
        logger.info("Generating Final Interview Score (Running Tasks Parallelly)...")

        # ✨ OPTIMIZATION 2: PARALLEL EXECUTION 
        # API call aur Video Processing dono ek sath start honge
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future_code = executor.submit(self.evaluate_code, question, code, language)
            future_video = executor.submit(self.analyze_video_for_cheating_master, video_path)

            # Wait for both tasks to finish
            eval_result = future_code.result()
            proctoring_result = future_video.result()

        tech_score = eval_result.get("final_score", 0)
        is_cheating = proctoring_result.get("is_cheating_suspected", False)
        reasons = proctoring_result.get("reasons", [])
        
        total_penalty = 0
        if is_cheating:
            for reason in reasons:
                if "Cell phone detected" in reason or "Book/Notes/Screen" in reason: total_penalty += 100
                elif "Multiple people" in reason: total_penalty += 40
                elif "left the camera" in reason: total_penalty += 20
                elif "looked away" in reason: total_penalty += 15

        return {
            "success": eval_result.get("success", False) and proctoring_result.get("success", False),
            "original_technical_score": tech_score,
            "score_with_penalties": max(0, tech_score - total_penalty),
            "proctoring_results": {
                "is_cheating_suspected": is_cheating,
                "reasons": reasons,
                "stats": proctoring_result.get("stats", {})
            }
        }

    def run(self, question: str, code: str, language: str, video_path_str: str) -> Dict[str, Any]:
        # (Unchanged logic)
        import os 
        logger.info(f"--- Starting Full Interview Analysis for {language.upper()} submission ---")
        
        if not code or not code.strip():
            return {"success": False, "original_technical_score": 0, "score_with_penalties": 0, "error_message": "No code was provided to analyze."}
            
        if not video_path_str or not os.path.exists(video_path_str):
            return {"success": False, "original_technical_score": 0, "score_with_penalties": 0, "error_message": "Proctoring video is missing."}
            
        final_results = self.generate_final_interview_score(question=question, code=code, language=language, video_path=video_path_str)
        return final_results