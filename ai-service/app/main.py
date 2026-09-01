#!/usr/bin/env python3
"""
PRAHARI V3 — Edge AI Perception & Google Gemini LLM Intelligence Microservice
Consumes live robot camera streams, executes YOLOv8 multi-class vehicle detection,
ByteTrack tracking, ANPR plate extraction, Face AI, and powers the Gemini LLM
Intelligence reasoning layer for the Traffic-Police Command Center.
"""

import os
import time
import threading
import requests
import cv2
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .config import settings
from .utils.logger import logger
from .services.vision_service import vision_service
from .services.gemini_service import gemini_service
from .routes.health import health_router
from .routes.camera import camera_router
from .routes.anpr import anpr_router
from .routes.snapshot import snapshot_router
from .routes.gemini import gemini_router
from .routes.perception import perception_router
from .routes.faces import faces_router

stream_worker_running = False
stream_worker_thread = None

def _stream_worker():
    """
    Background Camera Ingestion Loop:
    Pulls frames from ROBOT_CAMERA_STREAM_URL, feeds to perception pipeline,
    and forwards events + images to Backend API.
    """
    global stream_worker_running
    url = settings.ROBOT_CAMERA_STREAM_URL
    if not url:
        return

    logger.info(f"[CAMERA] Starting live camera consumer on: {url}")
    detector = vision_service.detector
    inference_interval = 1.0 / max(1.0, settings.AI_PROCESS_FPS)

    while stream_worker_running:
        try:
            cap = cv2.VideoCapture(url)
            if not cap.isOpened():
                time.sleep(3)
                continue

            logger.info(f"[CAMERA] Connected to stream: {url}")
            while stream_worker_running and cap.isOpened():
                ret, frame = cap.read()
                if not ret or frame is None:
                    break

                result = detector.process_frame(frame)
                detections = result.get("detections", [])

                for det in detections:
                    full_b64 = detector.encode_image_to_jpeg_base64(frame, quality=80)
                    plate_b64 = detector.encode_image_to_jpeg_base64(det["plateCrop"], quality=85) if det.get("plateCrop") is not None else None
                    face_b64 = detector.encode_image_to_jpeg_base64(det["faceCrop"], quality=85) if det.get("faceCrop") is not None else None

                    payload = {
                        "robotId": settings.ROBOT_ID,
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
                        requests.post(f"{settings.BACKEND_URL}/api/detections", json=payload, timeout=4)
                    except Exception:
                        pass

                time.sleep(inference_interval)

            cap.release()
        except Exception as e:
            logger.warning(f"[CAMERA] Stream worker warning: {e}")
            time.sleep(3)

from .services.camera_service import camera_service

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing PRAHARI AI Perception & Intelligence Service...")
    if settings.ROBOT_CAMERA_STREAM_URL:
        camera_service.connect(settings.ROBOT_CAMERA_STREAM_URL)
    yield
    logger.info("Shutting down PRAHARI AI Service...")
    camera_service.release()

app = FastAPI(
    title="PRAHARI V3 AI Perception & Intelligence Service",
    description="Edge AI, YOLO Vehicle Tracking, ANPR, Face Recognition & Google Gemini LLM Engine",
    version="3.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register modular routes
app.include_router(health_router)
app.include_router(camera_router)
app.include_router(anpr_router)
app.include_router(snapshot_router)
app.include_router(gemini_router)
app.include_router(perception_router)
app.include_router(faces_router)

if __name__ == "__main__":
    port = int(os.getenv("PORT", os.getenv("AI_SERVICE_PORT", "8000")))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=False)
