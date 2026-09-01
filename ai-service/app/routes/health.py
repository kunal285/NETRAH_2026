import time
from fastapi import APIRouter
from ..services.gemini_service import gemini_service
from ..services.detector import PerceptionDetector
from ..config import settings

health_router = APIRouter(tags=["Health"])

@health_router.get("/health")
def health_check():
    gemini_health = gemini_service.check_health()
    return {
        "status": "healthy",
        "service": "PRAHARI V3 AI Perception & Intelligence Engine",
        "ai": "online",
        "gemini": gemini_health["status"],
        "gemini_model": gemini_health["model"],
        "ocr": "ONLINE",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }

@health_router.get("/ready")
@health_router.get("/live")
def liveness_check():
    return {
        "status": "ok",
        "service": "prahari-ai",
        "timestamp": time.time()
    }
