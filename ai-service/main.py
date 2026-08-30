#!/usr/bin/env python3
"""
PRAHARI Standalone AI Perception Service
Consumes live robot camera stream, runs YOLOv8 + ANPR inference,
and pushes detections directly to Command Center Backend.
"""

import os
import time
import base64
import threading
import requests
import cv2
import uvicorn
from fastapi import FastAPI, UploadFile, File, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from dotenv import load_dotenv

from detector import PerceptionDetector

load_dotenv()

app = FastAPI(
    title="PRAHARI AI Perception Service",
    description="Edge AI & ANPR detection service for PRAHARI Traffic Police Robot",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

detector = PerceptionDetector()

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:4000")
ROBOT_CAMERA_STREAM_URL = os.getenv("ROBOT_CAMERA_STREAM_URL", "")
ROBOT_ID = os.getenv("ROBOT_ID", "PRAHARI-01")
INFERENCE_INTERVAL_SEC = float(os.getenv("INFERENCE_INTERVAL_SEC", "1.0"))

stream_worker_running = False
stream_worker_thread = None

class FrameInferenceRequest(BaseModel):
    image: str # Base64 encoded JPEG
    robotId: Optional[str] = "PRAHARI-01"
    cameraId: Optional[str] = "CAMERA-01"

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "PRAHARI AI Perception Engine",
        "ai": "online",
        "model": detector.model_name,
        "ocr": detector.ocr_status,
        "inference": "ACTIVE",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }

@app.get("/status")
def get_status():
    return {
        "aiStatus": "AI ONLINE",
        "model": detector.model_name,
        "ocr": detector.ocr_status,
        "inference": "ACTIVE",
        "fps": detector.fps,
        "totalProcessed": detector.total_processed,
        "backendUrl": BACKEND_URL,
        "streamUrl": ROBOT_CAMERA_STREAM_URL,
        "isStreamingActive": stream_worker_running
    }

@app.post("/detect/frame")
async def detect_frame(payload: FrameInferenceRequest):
    try:
        clean_b64 = payload.image.replace("data:image/jpeg;base64,", "").replace("data:image/png;base64,", "")
        img_bytes = base64.b64decode(clean_b64)
        frame_np = detector.decode_image_bytes(img_bytes)
        result = detector.process_frame(frame_np)
        return {
            "success": True,
            "data": result
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

def _stream_worker():
    """
    Background worker: connects to ROBOT_CAMERA_STREAM_URL, reads frames, runs inference,
    and pushes detections with image snapshots to the Backend.
    """
    global stream_worker_running
    print(f"[AI STREAM] Starting live stream consumer on {ROBOT_CAMERA_STREAM_URL}...")

    while stream_worker_running:
        if not ROBOT_CAMERA_STREAM_URL:
            time.sleep(2)
            continue

        try:
            cap = cv2.VideoCapture(ROBOT_CAMERA_STREAM_URL)
            if not cap.isOpened():
                print(f"[AI STREAM] Cannot open camera stream at {ROBOT_CAMERA_STREAM_URL}. Retrying in 3s...")
                time.sleep(3)
                continue

            print(f"[AI STREAM] Successfully connected to live robot stream!")

            while stream_worker_running and cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    print("[AI STREAM] Frame read failed. Reconnecting...")
                    break

                # Process frame
                result = detector.process_frame(frame)
                detections = result.get("detections", [])

                if detections:
                    # Encode frame to JPEG for S3 upload
                    _, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
                    img_b64 = base64.b64encode(buffer).decode('utf-8')

                    for det in detections:
                        payload = {
                            "robotId": ROBOT_ID,
                            "type": det.get("type"),
                            "detectionInfo": det.get("detectionInfo"),
                            "confidence": det.get("confidence"),
                            "source": det.get("source", "CAMERA-01"),
                            "plate": det.get("plate"),
                            "image": f"data:image/jpeg;base64,{img_b64}",
                            "details": det.get("details", {})
                        }

                        try:
                            # Forward detection event to Backend API
                            res = requests.post(
                                f"{BACKEND_URL}/api/detections",
                                json=payload,
                                timeout=3
                            )
                            if res.status_code == 201:
                                print(f"[AI STREAM] Pushed {det.get('type')} detection to Backend.")
                        except Exception as post_err:
                            print(f"[AI STREAM] Failed to push to Backend: {post_err}")

                time.sleep(INFERENCE_INTERVAL_SEC)

            cap.release()
        except Exception as e:
            print(f"[AI STREAM] Worker error: {e}")
            time.sleep(3)

@app.on_event("startup")
def startup_event():
    global stream_worker_running, stream_worker_thread
    if ROBOT_CAMERA_STREAM_URL:
        stream_worker_running = True
        stream_worker_thread = threading.Thread(target=_stream_worker, daemon=True)
        stream_worker_thread.start()

@app.on_event("shutdown")
def shutdown_event():
    global stream_worker_running
    stream_worker_running = False

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
