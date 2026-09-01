from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any, Literal

class FrameInferenceRequest(BaseModel):
    image: str = Field(..., description="Base64 encoded JPEG or PNG image")
    robotId: Optional[str] = "PRAHARI-01"
    cameraId: Optional[str] = "CAMERA-01"
    hint_detections: Optional[List[Dict[str, Any]]] = None

class FaceEnrollRequest(BaseModel):
    personId: str
    name: str
    image: Optional[str] = None
    role: Optional[str] = "Traffic Police Officer"

class VehicleDetectionItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    track_id: int
    class_name: str = Field(..., alias="class")
    confidence: float
    bbox: List[int]  # [x, y, w, h]

class AmbulanceRecord(BaseModel):
    detected: bool = False
    confidence: Optional[float] = None
    track_id: Optional[int] = None
    confirmed: bool = False
    candidate_frames: int = 0

class PlateRecord(BaseModel):
    track_id: Optional[int] = None
    text: Optional[str] = None
    raw_text: Optional[str] = None
    confidence: float
    status: Literal["verified", "uncertain", "low_quality"] = "uncertain"
    bbox: Optional[List[int]] = None
    quality_score: Optional[float] = None

class FaceRecord(BaseModel):
    track_id: Optional[int] = None
    match: Optional[str] = None
    personId: Optional[str] = None
    personName: Optional[str] = None
    confidence: float
    status: Literal["verified", "unknown", "low_quality"] = "unknown"
    bbox: Optional[List[int]] = None
    quality_score: Optional[float] = None

class ProcessingMetrics(BaseModel):
    inference_ms: int
    fps: float
    device: str = "CPU"

class StructuredPerceptionOutput(BaseModel):
    timestamp: str
    frame_id: int
    vehicles: List[VehicleDetectionItem] = Field(default_factory=list)
    counts: Dict[str, int] = Field(default_factory=dict)
    ambulance: AmbulanceRecord = Field(default_factory=AmbulanceRecord)
    plates: List[PlateRecord] = Field(default_factory=list)
    faces: List[FaceRecord] = Field(default_factory=list)
    processing: ProcessingMetrics
    annotated_frame: Optional[str] = None

class PlateDetection(BaseModel):
    text: str
    confidence: float
    state: Optional[str] = None
    bbox: Optional[List[int]] = None

class FaceDetection(BaseModel):
    match: str
    personId: Optional[str] = None
    personName: Optional[str] = None
    confidence: float

class VehicleCounts(BaseModel):
    total: int = 0
    cars: int = 0
    motorcycles: int = 0
    trucks: int = 0
    buses: int = 0
    bicycles: int = 0
    other: int = 0

class RobotTelemetrySnapshot(BaseModel):
    battery_voltage: Optional[float] = None
    battery_percentage: Optional[int] = None
    battery_current: Optional[float] = None
    motor_current_left: Optional[float] = None
    motor_current_right: Optional[float] = None
    motor_pwm_left: Optional[int] = None
    motor_pwm_right: Optional[int] = None
    obstacle_distance_cm: Optional[float] = None
    temperature_c: Optional[float] = None
    wifi_rssi: Optional[int] = None
    control_mode: Optional[str] = "WEB"
    safety_status: Optional[str] = "NORMAL"
