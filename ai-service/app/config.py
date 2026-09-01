import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from ai-service or root
env_path = Path(__file__).resolve().parent.parent / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

class Settings:
    # Service & Network
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", os.getenv("AI_SERVICE_PORT", "8000")))
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    BACKEND_URL: str = os.getenv("BACKEND_URL", "http://localhost:4000")
    ROBOT_ID: str = os.getenv("ROBOT_ID", "PRAHARI-01")

    # Camera Stream Source
    ROBOT_CAMERA_STREAM_URL: str = os.getenv("ROBOT_CAMERA_STREAM_URL", "")
    AI_PROCESS_FPS: float = float(os.getenv("AI_PROCESS_FPS", "10.0"))
    AI_DEBUG: bool = os.getenv("AI_DEBUG", "false").lower() in ("true", "1", "yes")

    # Model Configuration & Metadata
    YOLO_MODEL_PATH: str = os.getenv("YOLO_MODEL_PATH", "")
    PLATE_MODEL_PATH: str = os.getenv("PLATE_MODEL_PATH", "")
    FACE_MODEL_PATH: str = os.getenv("FACE_MODEL_PATH", "")

    VEHICLE_MODEL_NAME: str = os.getenv("VEHICLE_MODEL_NAME", "YOLOv8n-TrafficNet")
    VEHICLE_MODEL_VERSION: str = os.getenv("VEHICLE_MODEL_VERSION", "v3.2.0")
    PLATE_MODEL_NAME: str = os.getenv("PLATE_MODEL_NAME", "PRAHARI-HSRP-OCR")
    PLATE_MODEL_VERSION: str = os.getenv("PLATE_MODEL_VERSION", "v2.1.0")
    FACE_MODEL_NAME: str = os.getenv("FACE_MODEL_NAME", "PRAHARI-FaceEmbed-128")
    FACE_MODEL_VERSION: str = os.getenv("FACE_MODEL_VERSION", "v1.4.0")

    # Granular Per-Task Confidence Thresholds
    VEHICLE_CONFIDENCE_THRESHOLD: float = float(os.getenv("VEHICLE_CONFIDENCE_THRESHOLD", os.getenv("VEHICLE_CONFIDENCE", "0.40")))
    PLATE_CONFIDENCE_THRESHOLD: float = float(os.getenv("PLATE_CONFIDENCE_THRESHOLD", os.getenv("PLATE_CONFIDENCE", "0.40")))
    AMBULANCE_CONFIDENCE_THRESHOLD: float = float(os.getenv("AMBULANCE_CONFIDENCE_THRESHOLD", os.getenv("AMBULANCE_CONFIDENCE", "0.70")))
    FACE_CONFIDENCE_THRESHOLD: float = float(os.getenv("FACE_CONFIDENCE_THRESHOLD", os.getenv("FACE_CONFIDENCE", "0.50")))
    OCR_CONFIDENCE_THRESHOLD: float = float(os.getenv("OCR_CONFIDENCE_THRESHOLD", os.getenv("OCR_CONFIDENCE", "0.65")))

    # Temporal Confirmation Windows
    AMBULANCE_CONFIRMATION_FRAMES: int = int(os.getenv("AMBULANCE_CONFIRMATION_FRAMES", "3"))
    FACE_CONFIRMATION_FRAMES: int = int(os.getenv("FACE_CONFIRMATION_FRAMES", "2"))
    ANPR_BEST_FRAME_BUFFER_SIZE: int = int(os.getenv("ANPR_BEST_FRAME_BUFFER_SIZE", "5"))

    # Image Quality Thresholds
    MIN_LAPLACIAN_BLUR_SCORE: float = float(os.getenv("MIN_LAPLACIAN_BLUR_SCORE", "35.0"))
    MIN_BRIGHTNESS: float = float(os.getenv("MIN_BRIGHTNESS", "30.0"))
    MAX_BRIGHTNESS: float = float(os.getenv("MAX_BRIGHTNESS", "235.0"))

    # Configurable Region of Interest (Normalized 0.0 to 1.0)
    ROI_X1: float = float(os.getenv("ROI_X1", "0.05"))
    ROI_Y1: float = float(os.getenv("ROI_Y1", "0.10"))
    ROI_X2: float = float(os.getenv("ROI_X2", "0.95"))
    ROI_Y2: float = float(os.getenv("ROI_Y2", "0.95"))

    # Event Cooldowns (in seconds)
    VEHICLE_EVENT_COOLDOWN_SECONDS: float = float(os.getenv("VEHICLE_EVENT_COOLDOWN_MS", "2000")) / 1000.0
    ANPR_EVENT_COOLDOWN_SECONDS: float = float(os.getenv("ANPR_EVENT_COOLDOWN_MS", "5000")) / 1000.0
    FACE_EVENT_COOLDOWN_SECONDS: float = float(os.getenv("FACE_EVENT_COOLDOWN_MS", "5000")) / 1000.0
    AMBULANCE_EVENT_COOLDOWN_SECONDS: float = float(os.getenv("AMBULANCE_EVENT_COOLDOWN_MS", "5000")) / 1000.0

    # Virtual Counting Line
    COUNTING_LINE_ENABLED: bool = os.getenv("COUNTING_LINE_ENABLED", "true").lower() == "true"
    COUNTING_LINE_Y_RATIO: float = float(os.getenv("COUNTING_LINE_Y_RATIO", "0.65"))

    # Google Gemini LLM Configuration
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    GEMINI_EVENT_COOLDOWN_SECONDS: float = float(os.getenv("GEMINI_EVENT_COOLDOWN_SECONDS", "5.0"))
    GEMINI_TIMEOUT_SECONDS: float = float(os.getenv("GEMINI_TIMEOUT_SECONDS", "15.0"))
    PRAHARI_AI_PROMPT_VERSION: str = os.getenv("PRAHARI_AI_PROMPT_VERSION", "v1")

    # System Prompt Path
    SYSTEM_PROMPT_PATH: Path = Path(__file__).resolve().parent / "prompts" / "prahari_system.txt"

    def get_system_prompt(self) -> str:
        if self.SYSTEM_PROMPT_PATH.exists():
            return self.SYSTEM_PROMPT_PATH.read_text(encoding="utf-8").strip()
        return "You are PRAHARI AI, the intelligence assistant for the PRAHARI traffic-police robot."

settings = Settings()
