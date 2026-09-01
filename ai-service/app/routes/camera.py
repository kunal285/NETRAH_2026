import base64
import numpy as np
from fastapi import APIRouter, Response, HTTPException, UploadFile, File
from typing import Optional

from ..services.camera_service import camera_service
from ..schemas.detection import FrameInferenceRequest

camera_router = APIRouter(tags=["Camera"])

@camera_router.get("/api/ai/camera/status")
@camera_router.get("/api/camera/status")
def get_camera_status():
    """
    Returns live camera connection status, dimensions, frame rates, and last frame timestamp.
    """
    return camera_service.get_status()

@camera_router.get("/api/ai/camera/frame")
@camera_router.get("/api/camera/frame")
def get_latest_camera_frame():
    """
    Streams the latest valid raw JPEG frame directly from the camera buffer.
    Used by backend, operators, and test harnesses to visually inspect live camera intake.
    """
    success, jpeg_bytes, err = camera_service.get_latest_jpeg()
    if not success or not jpeg_bytes:
        raise HTTPException(
            status_code=503,
            detail={
                "error": "CAMERA_UNAVAILABLE",
                "message": err or "No valid frame currently available in camera buffer"
            }
        )

    return Response(
        content=jpeg_bytes,
        media_type="image/jpeg",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
            "Content-Disposition": "inline; filename=prahari_live_frame.jpg"
        }
    )

@camera_router.post("/api/ai/camera/feed")
async def update_camera_feed(file: Optional[UploadFile] = File(None), payload: Optional[FrameInferenceRequest] = None):
    """
    Injects a live frame or updates stream URL dynamically.
    """
    try:
        import cv2
        frame_np = None
        if file is not None:
            content = await file.read()
            nparr = np.frombuffer(content, np.uint8)
            frame_np = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        elif payload is not None and payload.image:
            clean_b64 = payload.image.replace("data:image/jpeg;base64,", "").replace("data:image/png;base64,", "")
            img_bytes = base64.b64decode(clean_b64)
            nparr = np.frombuffer(img_bytes, np.uint8)
            frame_np = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if frame_np is not None and frame_np.size > 0:
            camera_service.inject_frame(frame_np)
            return {
                "success": True,
                "message": "Frame injected into live buffer",
                "dimensions": [int(frame_np.shape[1]), int(frame_np.shape[0])]
            }

        raise HTTPException(status_code=400, detail="Invalid frame data")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
