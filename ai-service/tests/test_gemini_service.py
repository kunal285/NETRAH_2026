import pytest
from unittest.mock import MagicMock, patch
from app.services.gemini_service import GeminiService
from app.schemas.incident import IncidentAnalysisRequest
from app.schemas.gemini import ChatMessage, TelemetryAnalysisRequest

def test_fallback_ambulance_detection():
    service = GeminiService()
    service.client = None  # Force fallback
    req = IncidentAnalysisRequest(
        event_id="test_amb_001",
        event_type="ambulance_detected",
        ambulance_detected=True,
        ambulance_confidence=0.95,
        vehicle_counts={"cars": 3, "trucks": 1}
    )
    result = service.analyze_incident(req)
    assert result.event_id == "test_amb_001"
    assert result.severity == "high"
    assert result.event_type == "ambulance_detected"
    assert result.requires_operator_attention is True
    assert "ambulance" in result.summary.lower()

def test_fallback_low_battery():
    service = GeminiService()
    service.client = None
    req = IncidentAnalysisRequest(
        event_id="test_bat_001",
        robot={"battery_voltage": 29.5}
    )
    result = service.analyze_incident(req)
    assert result.severity in ["high", "critical"]
    assert result.event_type == "battery_low"
    assert result.requires_operator_attention is True

def test_chat_reply_fallback():
    service = GeminiService()
    service.client = None
    res = service.generate_chat_reply(
        message="Was an ambulance detected?",
        history=[],
        context={"active_ambulance": True}
    )
    assert "ambulance" in res.reply.lower()

def test_telemetry_analysis_overcurrent():
    service = GeminiService()
    res = service.analyze_telemetry({
        "battery_voltage": 35.0,
        "motor_current_left": 25.0,
        "motor_current_right": 5.0,
        "obstacle_distance_cm": 120.0
    })
    assert len(res.warnings) > 0
    assert "Asymmetric motor current" in res.warnings[0] or "motor" in str(res.warnings).lower()

@patch("google.genai.Client")
def test_mock_gemini_structured_response(mock_client_class):
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.text = '{"summary": "Test incident", "severity": "medium", "event_type": "vehicle_detected", "confidence": 0.92, "recommended_action": "Monitor", "operator_message": "Alert", "reasoning_summary": "Testing", "requires_operator_attention": false}'
    mock_client.models.generate_content.return_value = mock_response

    service = GeminiService()
    service.client = mock_client
    req = IncidentAnalysisRequest(event_id="mock_001", event_type="vehicle_detected")
    result = service.analyze_incident(req)

    assert result.summary == "Test incident"
    assert result.severity == "medium"
    assert result.confidence == 0.92
