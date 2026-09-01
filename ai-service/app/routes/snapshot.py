import time
import base64
import cv2
from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import Optional
from pydantic import BaseModel

from ..services.camera_service import camera_service

snapshot_router = APIRouter(tags=["Snapshot"])

class SnapshotRequest(BaseModel):
    robotId: Optional[str] = "PRAHARI-01"
    source: Optional[str] = "CAMERA-01"

@snapshot_router.post("/api/snapshot")
@snapshot_router.post("/api/ai/snapshot")
async def capture_ai_snapshot(payload: Optional[SnapshotRequest] = None):
    """
    Captures live frame from camera buffer, encodes to JPEG, and returns standard metadata.
    """
    success, jpeg_bytes, err = camera_service.get_latest_jpeg()
    if not success or not jpeg_bytes:
        raise HTTPException(
            status_code=503,
            detail={
                "success": False,
                "error": "CAMERA_UNAVAILABLE",
                "message": "Unable to capture a frame from the robot camera."
            }
        )

    ts_now = time.strftime("%Y%m%d_%H%M%S", time.gmtime())
    ts_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    snap_id = f"snap_{int(time.time() * 1000)}"
    filename = f"prahari_{ts_now}_001.jpg"

    b64_data = f"data:image/jpeg;base64,{base64.b64encode(jpeg_bytes).decode('utf-8')}"

    return {
        "success": True,
        "snapshot_id": snap_id,
        "filename": filename,
        "url": f"/api/camera/frame?t={int(time.time())}",
        "data_url": b64_data,
        "timestamp": ts_iso,
        "size": len(jpeg_bytes),
        "width": camera_service.width,
        "height": camera_service.height
    }
