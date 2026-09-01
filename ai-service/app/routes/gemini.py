from fastapi import APIRouter, HTTPException, Query
from typing import Optional, Dict, Any

from ..schemas.incident import IncidentAnalysisRequest, IncidentAnalysisResponse
from ..schemas.gemini import (
    ChatRequest,
    ChatResponse,
    DetectionExplanationRequest,
    DetectionExplanationResponse,
    TelemetryAnalysisRequest,
    TelemetryAnalysisResponse,
    ImageAnalysisRequest,
    ImageAnalysisResponse,
)
from ..services.gemini_service import gemini_service
from ..services.incident_service import incident_service
from ..utils.logger import logger

gemini_router = APIRouter(prefix="/api/ai", tags=["Gemini Intelligence"])

@gemini_router.post("/analyze", response_model=IncidentAnalysisResponse)
def analyze_incident_event(payload: IncidentAnalysisRequest, force: bool = Query(False, description="Bypass debounce cache")):
    """
    Structured Gemini Incident Intelligence Analysis:
    Consumes structured CV, OCR, face, and robot telemetry readings to produce
    a safety-vetted incident assessment.
    """
    try:
        return incident_service.analyze_event(payload, force_refresh=force)
    except Exception as e:
        logger.error(f"Error in /api/ai/analyze: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@gemini_router.post("/incident-summary")
def get_incident_summary(payload: Optional[Dict[str, Any]] = None, minutes: int = Query(5, ge=1, le=60)):
    """
    Generates a natural language summary of robot detections and incidents over the last N minutes.
    """
    try:
        context = payload or {}
        return incident_service.summarize_window(minutes=minutes, context=context)
    except Exception as e:
        logger.error(f"Error in /api/ai/incident-summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@gemini_router.post("/explain-detection", response_model=DetectionExplanationResponse)
def explain_detection_event(payload: DetectionExplanationRequest):
    """
    Explains a specific detection (ANPR plate, face match/unknown, vehicle, obstacle)
    without guessing OCR characters or claiming unverified identities.
    """
    try:
        return gemini_service.explain_detection(payload.detection, payload.telemetry)
    except Exception as e:
        logger.error(f"Error in /api/ai/explain-detection: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@gemini_router.post("/chat", response_model=ChatResponse)
def chat_assistant(payload: ChatRequest):
    """
    Interactive Dashboard AI Assistant:
    Answers operator queries grounded strictly in live robot telemetry, recent detections,
    and current traffic counts.
    """
    try:
        return gemini_service.generate_chat_reply(
            message=payload.message,
            history=payload.history,
            context=payload.context
        )
    except Exception as e:
        logger.error(f"Error in /api/ai/chat: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@gemini_router.post("/robot-status-analysis", response_model=TelemetryAnalysisResponse)
def analyze_robot_telemetry(payload: TelemetryAnalysisRequest):
    """
    Robot Hardware & Telemetry Diagnostics:
    Analyzes battery pack voltage, motor current symmetry, and sensor distance
    to detect mechanical stress or low-power conditions.
    """
    try:
        return gemini_service.analyze_telemetry(payload.telemetry)
    except Exception as e:
        logger.error(f"Error in /api/ai/robot-status-analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@gemini_router.post("/analyze-image", response_model=ImageAnalysisResponse)
def analyze_snapshot_image(payload: ImageAnalysisRequest):
    """
    Optional Multimodal Vision Snapshot Analysis:
    Operator-triggered scene reasoning for complex traffic scenarios.
    """
    try:
        return gemini_service.analyze_image(
            image_b64=payload.image,
            metadata=payload.event_metadata,
            existing_detections=payload.existing_detections
        )
    except Exception as e:
        logger.error(f"Error in /api/ai/analyze-image: {e}")
        raise HTTPException(status_code=500, detail=str(e))
