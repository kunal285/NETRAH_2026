import base64
import cv2
import numpy as np
from fastapi import APIRouter, Request, UploadFile, File, HTTPException
from typing import Optional, Dict, Any
from pydantic import BaseModel

from ..services.plate_service import plate_service
from ..services.detector import PerceptionDetector

anpr_router = APIRouter(tags=["ANPR"])

class AnprInferenceRequest(BaseModel):
    image: Optional[str] = None
    vehicle_bbox: Optional[list] = None
    track_id: Optional[int] = None

@anpr_router.post("/api/ai/anpr")
@anpr_router.post("/anpr/detect")
async def detect_anpr(request: Request):
    """
    Dedicated ANPR Endpoint:
    Accepts JSON body (base64 image), form data, or multipart file upload.
    Executes plate detection, quality check, OCR, and returns standardized JSON result.
    """
    frame_np = None
    vehicle_bbox = None
    track_id = None

    try:
        content_type = request.headers.get("content-type", "")

        if "multipart/form-data" in content_type:
            form = await request.form()
            file = form.get("file") or form.get("image")
            if file and hasattr(file, "read"):
                content = await file.read()
                nparr = np.frombuffer(content, np.uint8)
                frame_np = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        elif "application/json" in content_type:
            body = await request.json()
            raw_img = body.get("image")
            vehicle_bbox = body.get("vehicle_bbox")
            track_id = body.get("track_id")

            if raw_img:
                clean_b64 = raw_img.replace("data:image/jpeg;base64,", "").replace("data:image/png;base64,", "")
                img_bytes = base64.b64decode(clean_b64)
                nparr = np.frombuffer(img_bytes, np.uint8)
                frame_np = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if frame_np is None or frame_np.size == 0:
            return {
                "plate_detected": False,
                "plate_text": None,
                "confidence": 0.0,
                "status": "not_detected",
                "message": "Empty or invalid image frame"
            }

        result = plate_service.extract_and_recognize_plate(frame_np, vehicle_bbox=vehicle_bbox, track_id=track_id)
        return {
            "success": True,
            "data": result,
            **result
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
