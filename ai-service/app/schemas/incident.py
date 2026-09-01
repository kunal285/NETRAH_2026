from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Literal

SeverityType = Literal["low", "medium", "high", "critical"]

EventType = Literal[
    "normal",
    "vehicle_detected",
    "ambulance_detected",
    "traffic_congestion",
    "obstacle_detected",
    "unknown_plate",
    "known_face",
    "unknown_face",
    "battery_low",
    "motor_overcurrent",
    "communication_issue",
    "multiple_events",
    "system_warning"
]

class IncidentAnalysisRequest(BaseModel):
    event_id: Optional[str] = None
    event_type: Optional[str] = "multiple_events"
    timestamp: Optional[str] = None
    robot_id: Optional[str] = "PRAHARI-01"
    vehicle_counts: Optional[Dict[str, int]] = Field(default_factory=dict)
    ambulance_detected: Optional[bool] = False
    ambulance_confidence: Optional[float] = None
    plates: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    faces: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    robot: Optional[Dict[str, Any]] = Field(default_factory=dict)
    recent_detections: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    custom_context: Optional[str] = None

class IncidentAnalysisResponse(BaseModel):
    event_id: Optional[str] = None
    summary: str
    severity: SeverityType
    event_type: EventType
    confidence: float
    recommended_action: str
    operator_message: str
    reasoning_summary: str
    requires_operator_attention: bool
    ai_model: Optional[str] = None
    latency_ms: Optional[float] = None
    cached: Optional[bool] = False
