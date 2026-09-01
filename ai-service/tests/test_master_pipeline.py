import pytest
import numpy as np
import cv2
import base64
from fastapi.testclient import TestClient

from app.main import app
from app.services.camera_service import camera_service
from app.services.plate_service import plate_service

client = TestClient(app)

def test_camera_status_and_frame_endpoints():
    # 1. Test Camera Status
    resp = client.get("/api/ai/camera/status")
    assert resp.status_code == 200
    data = resp.json()
    assert "connected" in data
    assert "width" in data
    assert "height" in data
    assert "fps" in data

    # 2. Test Camera Frame Binary JPEG Stream
    resp_frame = client.get("/api/ai/camera/frame")
    assert resp_frame.status_code == 200
    assert resp_frame.headers["content-type"] == "image/jpeg"
    assert len(resp_frame.content) > 500  # Valid JPEG buffer

def test_dedicated_anpr_with_valid_plate():
    # Create synthetic vehicle frame with HSRP plate
    frame = np.zeros((480, 640, 3), dtype=np.uint8)
    # Vehicle body
    cv2.rectangle(frame, (100, 150), (540, 420), (120, 120, 120), -1)
    # White Number Plate (Aspect ratio ~3.3, optimal contrast)
    cv2.rectangle(frame, (220, 320), (420, 380), (240, 240, 240), -1)
    cv2.putText(frame, "MH12AB1234", (230, 365), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (10, 10, 10), 2)

    ret, buf = cv2.imencode('.jpg', frame)
    b64 = base64.b64encode(buf).decode('utf-8')

    resp = client.post("/api/ai/anpr", json={"image": b64, "vehicle_bbox": [100, 150, 440, 270], "track_id": 12})
    assert resp.status_code == 200
    data = resp.json()
    assert data["plate_detected"] is True
    assert data["status"] == "verified"
    assert data["confidence"] >= 0.80
    assert data["plate_text"] is not None

def test_dedicated_anpr_without_plate():
    # Synthetic frame with NO vehicle plate (e.g. empty black frame)
    frame = np.zeros((200, 200, 3), dtype=np.uint8)
    ret, buf = cv2.imencode('.jpg', frame)
    b64 = base64.b64encode(buf).decode('utf-8')

    resp = client.post("/api/ai/anpr", json={"image": b64})
    assert resp.status_code == 200
    data = resp.json()
    assert data["plate_detected"] is False
    assert data["plate_text"] is None
    assert data["confidence"] == 0.0

def test_snapshot_capture_endpoint():
    resp = client.post("/api/snapshot", json={"robotId": "PRAHARI-01"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert "snapshot_id" in data
    assert "filename" in data
    assert data["filename"].startswith("prahari_")
    assert "url" in data
    assert data["size"] > 100
