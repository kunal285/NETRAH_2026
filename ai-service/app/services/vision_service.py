import time
import base64
from typing import Dict, Any, Optional
import numpy as np

from .detector import PerceptionDetector

class VisionService:
    def __init__(self):
        self.detector = PerceptionDetector()

    def process_frame(self, frame_np: np.ndarray) -> Dict[str, Any]:
        return self.detector.process_frame(frame_np)

    def process_base64_frame(self, base64_str: str) -> Dict[str, Any]:
        clean_b64 = base64_str.replace("data:image/jpeg;base64,", "").replace("data:image/png;base64,", "")
        img_bytes = base64.b64decode(clean_b64)
        frame_np = self.detector.decode_image_bytes(img_bytes)
        if frame_np is None:
            raise ValueError("Invalid image bytes decoded")
        return self.detector.process_frame(frame_np)

vision_service = VisionService()
