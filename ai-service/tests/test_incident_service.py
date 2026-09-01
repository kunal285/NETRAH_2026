import time
import pytest
from app.services.incident_service import IncidentService
from app.schemas.incident import IncidentAnalysisRequest

def test_incident_debouncing():
    service = IncidentService()
    service.cooldown_sec = 2.0

    req1 = IncidentAnalysisRequest(
        event_id="test_deb_001",
        event_type="ambulance_detected",
        ambulance_detected=True,
        ambulance_confidence=0.95
    )

    res1 = service.analyze_event(req1)
    assert res1.cached is False

    # Second immediate call with same data must be debounced
    res2 = service.analyze_event(req1)
    assert res2.cached is True

def test_incident_window_summary():
    service = IncidentService()
    req = IncidentAnalysisRequest(
        event_id="test_win_001",
        event_type="ambulance_detected",
        ambulance_detected=True
    )
    service.analyze_event(req)
    summary = service.summarize_window(minutes=5)
    assert summary["window_minutes"] == 5
    assert "ai_summary" in summary
