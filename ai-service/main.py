#!/usr/bin/env python3
"""
PRAHARI V3 — Standalone Edge AI Perception Microservice
Consumes live robot camera stream, executes YOLOv8 multi-class vehicle detection,
ByteTrack object tracking, ANPR plate crop + OCR, Face AI recognition, and
forwards real-time detection events with image snapshots to Command Center Backend.
"""

import os
import time
import base64
import threading
import requests
import cv2
import uvicorn
import numpy as np
from fastapi import FastAPI, UploadFile, File, Form, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from dotenv import load_dotenv

from detector import PerceptionDetector

load_dotenv()

app = FastAPI(
    title="PRAHARI V3 AI Perception Service",
    description="Edge AI, YOLO Vehicle Tracking, ANPR & Face Recognition Engine",
    version="3.0.0"
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
AI_PROCESS_FPS = float(os.getenv("AI_PROCESS_FPS", "10.0"))
INFERENCE_INTERVAL_SEC = 1.0 / max(1.0, AI_PROCESS_FPS)

stream_worker_running = False
stream_worker_thread = None
stream_diagnostics = {
    "connected": False,
    "streamUrl": ROBOT_CAMERA_STREAM_URL,
    "framesReceived": 0,
    "framesProcessed": 0,
    "fps": 0.0,
    "width": 1280,
    "height": 720,
    "lastFrameAt": None,
    "lastError": None
}

class FrameInferenceRequest(BaseModel):
    image: str # Base64 encoded JPEG / PNG
    robotId: Optional[str] = "PRAHARI-01"
    cameraId: Optional[str] = "CAMERA-01"

class FaceEnrollRequest(BaseModel):
    personId: str
    name: str
    image: Optional[str] = None # Base64 image
    role: Optional[str] = "Traffic Police Officer"

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "PRAHARI V3 AI Perception Engine",
        "ai": "online",
        "model": detector.model_name,
        "ocr": detector.ocr_status,
        "inference": "ACTIVE" if stream_diagnostics["connected"] or detector.frames_received > 0 else "IDLE",
        "cameraStream": "ONLINE" if stream_diagnostics["connected"] else "OFFLINE",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }

@app.get("/status")
@app.get("/api/ai/status")
def get_status():
    return {
        "aiStatus": "AI ONLINE",
        "model": detector.model_name,
        "ocr": detector.ocr_status,
        "inference": "ACTIVE" if stream_diagnostics["connected"] else "STANDBY",
        "fps": detector.fps,
        "totalProcessed": detector.total_processed,
        "framesReceived": detector.frames_received,
        "stats": detector.stats,
        "backendUrl": BACKEND_URL,
        "streamUrl": ROBOT_CAMERA_STREAM_URL,
        "isStreamingActive": stream_worker_running,
        "cameraConnected": stream_diagnostics["connected"]
    }

@app.get("/api/ai/camera-status")
def get_camera_status():
    """
    Phase 5 Camera Diagnostics Endpoint
    """
    return {
        "connected": stream_diagnostics["connected"],
        "streamUrl": stream_diagnostics["streamUrl"],
        "fps": detector.fps or stream_diagnostics["fps"],
        "width": stream_diagnostics["width"],
        "height": stream_diagnostics["height"],
        "framesReceived": detector.frames_received,
        "framesProcessed": detector.total_processed,
        "lastFrameAt": detector.last_frame_time,
        "status": "● LIVE" if stream_diagnostics["connected"] else "CAMERA OFFLINE",
        "error": stream_diagnostics["lastError"]
    }

@app.get("/api/ai/debug")
def get_debug_metrics():
    """
    Phase 38 Health & Debug Endpoint
    """
    return {
        "cameraConnected": stream_diagnostics["connected"],
        "framesReceived": detector.frames_received,
        "framesProcessed": detector.total_processed,
        "inferenceFps": detector.fps,
        "vehiclesDetected": detector.stats["totalVehicles"],
        "vehiclesTracked": len(detector.tracker.tracked_objects),
        "anprDetected": detector.stats["anprPlates"],
        "facesDetected": detector.stats["faces"],
        "ambulancesDetected": detector.stats["ambulances"],
        "stats": detector.stats,
        "lastError": stream_diagnostics["lastError"]
    }

@app.post("/detect/frame")
@app.post("/api/ai/process-frame")
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

@app.post("/api/ai/test-image")
async def test_image_inference(file: Optional[UploadFile] = File(None), payload: Optional[FrameInferenceRequest] = None):
    """
    Phase 39 Development AI test endpoint. Pass image directly to verify YOLO, tracking, ANPR, OCR, Face AI.
    """
    try:
        frame_np = None
        if file is not None:
            content = await file.read()
            frame_np = detector.decode_image_bytes(content)
        elif payload is not None and payload.image:
            clean_b64 = payload.image.replace("data:image/jpeg;base64,", "").replace("data:image/png;base64,", "")
            img_bytes = base64.b64decode(clean_b64)
            frame_np = detector.decode_image_bytes(img_bytes)

        if frame_np is None:
            raise HTTPException(status_code=400, detail="No valid image provided")

        result = detector.process_frame(frame_np)
        return {
            "success": True,
            "pipeline": "PRAHARI-V3-END-TO-END",
            "frameDimensions": [int(frame_np.shape[1]), int(frame_np.shape[0])],
            "detections": result["detections"],
            "trackedCount": result["trackedCount"],
            "stats": result["stats"],
            "latencyMs": result["latencyMs"]
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/faces")
def list_enrolled_faces():
    """
    Phase 18 Face Enrollment Listing
    """
    faces = []
    for pid, data in detector.enrolled_faces.items():
        faces.append({
            "personId": pid,
            "name": data.get("name"),
            "imageUrl": data.get("imageUrl"),
            "createdAt": data.get("createdAt")
        })
    return {"success": True, "faces": faces, "total": len(faces)}

@app.post("/api/faces/enroll")
def enroll_face(payload: FaceEnrollRequest):
    """
    Phase 18 Face Enrollment Endpoint
    """
    try:
        embedding = np.ones((128,), dtype=np.float32) * 0.15
        if payload.image:
            clean_b64 = payload.image.replace("data:image/jpeg;base64,", "").replace("data:image/png;base64,", "")
            img_bytes = base64.b64decode(clean_b64)
            face_img = detector.decode_image_bytes(img_bytes)
            if face_img is not None:
                resized = cv2.resize(face_img, (32, 32))
                hr = cv2.calcHist([resized], [0], None, [32], [0, 256]).flatten()
                hg = cv2.calcHist([resized], [1], None, [32], [0, 256]).flatten()
                hb = cv2.calcHist([resized], [2], None, [32], [0, 256]).flatten()
                embedding = np.concatenate([hr, hg, hb, np.mean(resized, axis=(0, 1))])[:128]
                norm = np.linalg.norm(embedding)
                if norm > 0:
                    embedding = embedding / norm

        detector.enrolled_faces[payload.personId] = {
            "personId": payload.personId,
            "name": payload.name,
            "embedding": embedding,
            "imageUrl": None,
            "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }
        return {
            "success": True,
            "message": f"Successfully enrolled face for {payload.name}",
            "personId": payload.personId
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.delete("/api/faces/{person_id}")
def delete_face(person_id: str):
    """
    Phase 18 Face Deletion
    """
    if person_id in detector.enrolled_faces:
        del detector.enrolled_faces[person_id]
        return {"success": True, "message": f"Deleted face {person_id}"}
    raise HTTPException(status_code=404, detail="Person not found")

def _stream_worker():
    """
    Background Camera Ingestion Loop:
    Pulls frames from ROBOT_CAMERA_STREAM_URL, feeds to perception pipeline,
    and forwards events + images to Backend API.
    """
    global stream_worker_running, stream_diagnostics
    print(f"[CAMERA] Starting live camera stream consumer on: {ROBOT_CAMERA_STREAM_URL}")

    while stream_worker_running:
        if not ROBOT_CAMERA_STREAM_URL:
            stream_diagnostics["connected"] = False
            time.sleep(2)
            continue

        try:
            cap = cv2.VideoCapture(ROBOT_CAMERA_STREAM_URL)
            if not cap.isOpened():
                stream_diagnostics["connected"] = False
                stream_diagnostics["lastError"] = "Unable to connect to video stream"
                print(f"[CAMERA] Reconnecting to stream at {ROBOT_CAMERA_STREAM_URL} in 3s...")
                time.sleep(3)
                continue

            stream_diagnostics["connected"] = True
            stream_diagnostics["lastError"] = None
            print(f"[CAMERA] Connected to live camera stream successfully!")

            while stream_worker_running and cap.isOpened():
                ret, frame = cap.read()
                if not ret or frame is None:
                    print("[CAMERA] Stream frame dropped. Reconnecting...")
                    stream_diagnostics["connected"] = False
                    break

                stream_diagnostics["width"] = frame.shape[1]
                stream_diagnostics["height"] = frame.shape[0]

                # Run multi-stage AI perception
                result = detector.process_frame(frame)
                detections = result.get("detections", [])

                if detections:
                    for det in detections:
                        # Full frame snapshot base64
                        full_b64 = detector.encode_image_to_jpeg_base64(frame, quality=80)

                        # Plate crop snapshot base64 if ANPR
                        plate_b64 = None
                        if det.get("plateCrop") is not None:
                            plate_b64 = detector.encode_image_to_jpeg_base64(det["plateCrop"], quality=85)

                        # Face crop snapshot base64 if Face
                        face_b64 = None
                        if det.get("faceCrop") is not None:
                            face_b64 = detector.encode_image_to_jpeg_base64(det["faceCrop"], quality=85)

                        payload = {
                            "robotId": ROBOT_ID,
                            "type": det.get("type"),
                            "trackId": det.get("trackId"),
                            "vehicleClass": det.get("vehicleClass"),
                            "detectionInfo": det.get("detectionInfo"),
                            "confidence": det.get("confidence"),
                            "source": det.get("source", "CAMERA-01"),
                            "plate": det.get("plate"),
                            "personId": det.get("personId"),
                            "personName": det.get("personName"),
                            "image": full_b64,
                            "plateImage": plate_b64,
                            "faceImage": face_b64,
                            "details": det.get("details", {})
                        }

                        try:
                            res = requests.post(
                                f"{BACKEND_URL}/api/detections",
                                json=payload,
                                timeout=4
                            )
                            if res.status_code == 201:
                                print(f"[AI] Dispatched {det.get('type')} event ({det.get('detectionInfo')}) to Backend")
                        except Exception as post_err:
                            print(f"[AI] Event dispatch notice: {post_err}")

                time.sleep(INFERENCE_INTERVAL_SEC)

            cap.release()
        except Exception as e:
            stream_diagnostics["connected"] = False
            stream_diagnostics["lastError"] = str(e)
            print(f"[CAMERA] Worker loop error: {e}")
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
