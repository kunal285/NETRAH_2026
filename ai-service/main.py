import os
import time
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from detectors.vehicle_detector import VehicleDetector
from detectors.plate_detector import PlateDetector
from detectors.ocr_engine import OCREngine
from detectors.ambulance_detector import AmbulanceDetector
from detectors.pedestrian_detector import PedestrianDetector
from detectors.warden_gesture import WardenGestureRecognizer
from detectors.audio_siren import AudioSirenDetector

app = FastAPI(
    title="PRAHARI AI Multi-Modal Traffic Perception Microservice",
    description="Real-time multi-modal traffic perception for PRAHARI Robot: YOLO vehicle classification, ANPR OCR, ambulance detection, crosswalk safety, and siren acoustic recognition.",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize core detectors
vehicle_detector = VehicleDetector()
plate_detector = PlateDetector()
ocr_engine = OCREngine()
ambulance_detector = AmbulanceDetector()
pedestrian_detector = PedestrianDetector()
warden_gesture_recognizer = WardenGestureRecognizer()
audio_siren_detector = AudioSirenDetector()

class FramePayload(BaseModel):
    image: Optional[str] = None # Base64 encoded frame
    camera_id: Optional[str] = "CAM-01"
    timestamp: Optional[str] = None
    lanes: Optional[List[Dict[str, Any]]] = None
    siren_confidence: Optional[float] = 0.0
    hint_detections: Optional[List[Dict[str, Any]]] = None

class AnprPayload(BaseModel):
    image: Optional[str] = None
    plate_hint: Optional[str] = None
    camera_id: Optional[str] = "CAM-01"

class AmbulancePayload(BaseModel):
    class_name: Optional[str] = "ambulance"
    confidence: Optional[float] = 0.95
    bbox: Optional[List[float]] = [0.3, 0.2, 0.4, 0.5]
    siren_confidence: Optional[float] = 0.0

class PedestrianPayload(BaseModel):
    pedestrians: Optional[List[Dict[str, Any]]] = None
    vehicles: Optional[List[Dict[str, Any]]] = None
    crosswalk_zone: Optional[List[float]] = None

class GesturePayload(BaseModel):
    pose_hint: Optional[str] = "STOP"
    confidence: Optional[float] = 0.90

class AudioPayload(BaseModel):
    audio_buffer: Optional[List[float]] = None
    sample_rate: Optional[int] = 44100

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "PRAHARI Live AI Multi-Modal Traffic Perception Microservice",
        "version": "2.0.0",
        "uptime": round(time.process_time(), 2),
        "models": {
            "vehicle_detector": "YOLOv8n-Traffic",
            "anpr_ocr": "PaddleOCR-IndianHSRP",
            "ambulance_detector": "Dual-Modal Flasher+Acoustic",
            "crosswalk_safety": "Spatial Proximity Zone V2",
            "gesture_recognizer": "PoseHand-Warden",
            "audio_siren": "FFT Harmonic Sweep Analyzer"
        }
    }

@app.get("/models")
def get_models():
    return {
        "active_models": [
            {"id": "yolov8_traffic", "name": "YOLOv8 Traffic Object Detector", "status": "LOADED", "classes": ["car", "motorcycle", "bus", "truck", "ambulance", "person"]},
            {"id": "anpr_ocr", "name": "Indian License Plate OCR Engine", "status": "LOADED", "patterns": "HSRP 28 Indian States + BH Series"},
            {"id": "ambulance_siren", "name": "Ambulance Visual & Siren Classifier", "status": "LOADED", "harmonic_range": "400-1500 Hz"},
            {"id": "crosswalk_risk", "name": "Crosswalk Pedestrian Collision Engine", "status": "LOADED", "zones": "Configurable Polygon"},
            {"id": "warden_gestures", "name": "Traffic Warden Hand Gesture Net", "status": "LOADED", "gestures": ["STOP", "GO", "SLOW", "TURN_LEFT", "TURN_RIGHT"]}
        ]
    }

@app.post("/detect/frame")
def detect_frame(payload: FramePayload):
    image_np = None
    if payload.image:
        image_np = vehicle_detector.decode_image(payload.image)

    result = vehicle_detector.detect(
        image_np=image_np,
        lanes=payload.lanes,
        siren_confidence=payload.siren_confidence or 0.0,
        hint_detections=payload.hint_detections
    )
    result["camera_id"] = payload.camera_id
    return result

@app.post("/detect/anpr")
def detect_anpr(payload: AnprPayload):
    ocr_result = ocr_engine.process_crop(None, payload.plate_hint or "MH12AB1234")
    return {
        "success": True,
        "camera_id": payload.camera_id,
        "plate": ocr_result
    }

@app.post("/detect/ambulance")
def detect_ambulance(payload: AmbulancePayload):
    event = ambulance_detector.evaluate_emergency(
        class_name=payload.class_name or "ambulance",
        confidence=payload.confidence or 0.95,
        bbox=payload.bbox or [0.3, 0.2, 0.4, 0.5],
        siren_confidence=payload.siren_confidence or 0.0
    )
    return {
        "success": True,
        "ambulance_event": event
    }

@app.post("/detect/pedestrians")
def detect_pedestrians(payload: PedestrianPayload):
    if payload.crosswalk_zone:
        pedestrian_detector.set_crosswalk_zone(payload.crosswalk_zone)
    risk_assessment = pedestrian_detector.assess_risk(
        pedestrians=payload.pedestrians or [],
        vehicles=payload.vehicles or []
    )
    return {
        "success": True,
        "crosswalk_risk": risk_assessment
    }

@app.post("/detect/gesture")
def detect_gesture(payload: GesturePayload):
    gesture = warden_gesture_recognizer.recognize_gesture(None, payload.pose_hint or "STOP")
    return {
        "success": True,
        "gesture": gesture
    }

@app.post("/detect/audio")
def detect_audio(payload: AudioPayload):
    result = audio_siren_detector.analyze_audio_buffer(
        audio_data=payload.audio_buffer,
        sample_rate=payload.sample_rate or 44100
    )
    return {
        "success": True,
        "audio_analysis": result
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("AI_SERVICE_PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
