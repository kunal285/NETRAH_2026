import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_analyze_endpoint():
    payload = {
        "event_id": "api_test_01",
        "event_type": "ambulance_detected",
        "ambulance_detected": True,
        "ambulance_confidence": 0.96,
        "robot": {"battery_voltage": 34.5}
    }
    response = client.post("/api/ai/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["severity"] == "high"
    assert "summary" in data

def test_chat_endpoint():
    payload = {
        "message": "What is the robot status?",
        "context": {
            "vehicle_counts": {"cars": 5},
            "telemetry": {"batteryVoltage": 34.8}
        }
    }
    response = client.post("/api/ai/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "reply" in data
    assert "suggested_actions" in data

def test_explain_detection_endpoint():
    payload = {
        "detection": {
            "id": "det_123",
            "type": "ANPR",
            "detectionInfo": "MH12AB1234",
            "confidence": 0.93
        }
    }
    response = client.post("/api/ai/explain-detection", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "explanation" in data
    assert "confidence_assessment" in data

def test_robot_status_analysis_endpoint():
    payload = {
        "telemetry": {
            "battery_voltage": 34.2,
            "motor_current_left": 8.0,
            "motor_current_right": 8.2,
            "obstacle_distance_cm": 95.0
        }
    }
    response = client.post("/api/ai/robot-status-analysis", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "status_summary" in data
    assert "health_rating" in data
