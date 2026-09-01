import base64
from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from typing import Optional, Dict, Any

from ..schemas.detection import FrameInferenceRequest
from ..services.vision_service import vision_service
from ..config import settings

perception_router = APIRouter(tags=["Perception"])

@perception_router.get("/status")
@perception_router.get("/api/ai/status")
def get_status():
    detector = vision_service.detector
    return {
        "aiStatus": "AI ONLINE",
        "models": detector.model_metadata,
        "ocr": detector.ocr_status,
        "inference": "ACTIVE",
        "fps": detector.fps,
        "totalProcessed": detector.total_processed,
        "framesReceived": detector.frames_received,
        "stats": detector.stats,
        "backendUrl": settings.BACKEND_URL,
        "streamUrl": settings.ROBOT_CAMERA_STREAM_URL,
        "roi": {
            "x1": settings.ROI_X1,
            "y1": settings.ROI_Y1,
            "x2": settings.ROI_X2,
            "y2": settings.ROI_Y2
        }
    }

@perception_router.get("/api/ai/models")
def get_model_metadata():
    """
    Exposes model versioning and hardware acceleration diagnostics.
    """
    detector = vision_service.detector
    return {
        "status": "online",
        "models": detector.model_metadata,
        "thresholds": {
            "vehicle": settings.VEHICLE_CONFIDENCE_THRESHOLD,
            "plate": settings.PLATE_CONFIDENCE_THRESHOLD,
            "ambulance": settings.AMBULANCE_CONFIDENCE_THRESHOLD,
            "face": settings.FACE_CONFIDENCE_THRESHOLD,
            "ocr": settings.OCR_CONFIDENCE_THRESHOLD,
            "ambulance_confirmation_frames": settings.AMBULANCE_CONFIRMATION_FRAMES
        }
    }

@perception_router.get("/api/ai/camera-status")
def get_camera_status():
    detector = vision_service.detector
    return {
        "connected": bool(settings.ROBOT_CAMERA_STREAM_URL),
        "streamUrl": settings.ROBOT_CAMERA_STREAM_URL,
        "fps": detector.fps or 30.0,
        "width": 1280,
        "height": 720,
        "framesReceived": detector.frames_received,
        "framesProcessed": detector.total_processed,
        "lastFrameAt": detector.last_frame_time,
        "status": "● LIVE" if settings.ROBOT_CAMERA_STREAM_URL else "CAMERA OFFLINE",
        "error": None,
    }

@perception_router.get("/api/ai/debug")
def get_debug_metrics():
    detector = vision_service.detector
    return {
        "cameraConnected": bool(settings.ROBOT_CAMERA_STREAM_URL),
        "framesReceived": detector.frames_received,
        "framesProcessed": detector.total_processed,
        "inferenceFps": detector.fps,
        "vehiclesDetected": detector.stats["totalVehicles"],
        "vehiclesTracked": len(detector.tracker.tracked_objects),
        "anprDetected": detector.stats["anprPlates"],
        "facesDetected": detector.stats["faces"],
        "ambulancesDetected": detector.stats["ambulances"],
        "stats": detector.stats,
        "lastError": None,
    }

@perception_router.post("/detect/frame")
@perception_router.post("/api/ai/process-frame")
async def detect_frame(payload: FrameInferenceRequest, debug: bool = Query(False, description="Include annotated frame in response")):
    try:
        if debug:
            settings.AI_DEBUG = True
        result = vision_service.process_base64_frame(payload.image)
        return {
            "success": True,
            "data": result
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

@perception_router.post("/api/ai/test-image")
async def test_image_inference(file: Optional[UploadFile] = File(None), payload: Optional[FrameInferenceRequest] = None):
    try:
        frame_np = None
        detector = vision_service.detector
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
            "pipeline": "PRAHARI-ACCURACY-FIRST-CV",
            "frameDimensions": [int(frame_np.shape[1]), int(frame_np.shape[0])],
            "data": result,
            "detections": result["detections"],
            "trackedCount": result["trackedCount"],
            "stats": result["stats"],
            "latencyMs": result["latencyMs"]
        }
    except Exception as e:
        return {"success": False, "error": str(e)}
