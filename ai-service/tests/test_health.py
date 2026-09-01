import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "service" in data
    assert "gemini" in data
    assert "gemini_model" in data

def test_liveness_endpoint():
    response = client.get("/live")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
