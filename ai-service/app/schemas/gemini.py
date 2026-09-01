from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from .incident import SeverityType, EventType

class ChatMessage(BaseModel):
    role: str = Field(..., description="'user' or 'assistant' or 'system'")
    content: str

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = Field(default_factory=list)
    context: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Current robot state, telemetry, vehicle counts, latest detections")

class ChatResponse(BaseModel):
    reply: str
    requires_operator_attention: bool = False
    severity: Optional[SeverityType] = "low"
    suggested_actions: Optional[List[str]] = Field(default_factory=list)
    latency_ms: Optional[float] = None
    ai_model: Optional[str] = None

class DetectionExplanationRequest(BaseModel):
    detection: Dict[str, Any]
    telemetry: Optional[Dict[str, Any]] = None
    context: Optional[Dict[str, Any]] = None

class DetectionExplanationResponse(BaseModel):
    detection_id: Optional[str] = None
    explanation: str
    severity: SeverityType = "low"
    confidence_assessment: str
    safety_advisory: str
    requires_operator_action: bool = False
    latency_ms: Optional[float] = None

class TelemetryAnalysisRequest(BaseModel):
    telemetry: Dict[str, Any]
    historical_trend: Optional[List[Dict[str, Any]]] = None

class TelemetryAnalysisResponse(BaseModel):
    status_summary: str
    health_rating: str  # e.g., 'OPTIMAL', 'WARNING', 'CRITICAL'
    warnings: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    requires_maintenance: bool = False
    latency_ms: Optional[float] = None

class ImageAnalysisRequest(BaseModel):
    image: str = Field(..., description="Base64 encoded JPEG / PNG snapshot")
    event_metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)
    existing_detections: Optional[List[Dict[str, Any]]] = Field(default_factory=list)

class ImageAnalysisResponse(BaseModel):
    scene_summary: str
    objects: List[Dict[str, Any]] = Field(default_factory=list)
    traffic_condition: str
    possible_risk: str
    requires_attention: bool
    confidence: float = 0.85
    latency_ms: Optional[float] = None
