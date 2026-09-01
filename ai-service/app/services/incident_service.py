import time
import hashlib
import json
from typing import Dict, Any, List, Optional
from collections import deque

from ..config import settings
from ..utils.logger import logger
from ..schemas.incident import IncidentAnalysisRequest, IncidentAnalysisResponse
from .gemini_service import gemini_service

class IncidentService:
    def __init__(self):
        self.incident_history: deque = deque(maxlen=200)
        self.debounce_cache: Dict[str, Dict[str, Any]] = {}
        self.cooldown_sec = settings.GEMINI_EVENT_COOLDOWN_SECONDS

    def _generate_event_hash(self, req: IncidentAnalysisRequest) -> str:
        key_components = [
            req.event_type or "general",
            str(req.ambulance_detected),
            str(len(req.plates)),
            str(req.plates[0].get("text") if req.plates else ""),
            str(req.faces[0].get("personId") if req.faces else ""),
            str(sum(req.vehicle_counts.values()) if req.vehicle_counts else 0),
        ]
        key_str = "|".join(key_components)
        return hashlib.md5(key_str.encode("utf-8")).hexdigest()

    def analyze_event(self, req: IncidentAnalysisRequest, force_refresh: bool = False) -> IncidentAnalysisResponse:
        now = time.time()
        event_hash = self._generate_event_hash(req)

        # Check debounce cache
        if not force_refresh and event_hash in self.debounce_cache:
            cached_entry = self.debounce_cache[event_hash]
            if (now - cached_entry["timestamp"]) < self.cooldown_sec:
                logger.info(f"Returning debounced Gemini response for event_hash: {event_hash}")
                cached_res = cached_entry["response"].model_copy()
                cached_res.cached = True
                return cached_res

        # Call Gemini Service
        response = gemini_service.analyze_incident(req)

        # Cache response
        self.debounce_cache[event_hash] = {
            "timestamp": now,
            "response": response,
        }

        # Store in history
        self.incident_history.appendleft({
            "event_id": req.event_id or f"inc_{int(now*1000)}",
            "timestamp": req.timestamp or time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "analysis": response.model_dump(),
            "input_data": req.model_dump(exclude={"recent_detections"}),
        })

        return response

    def get_recent_incidents(self, limit: int = 20) -> List[Dict[str, Any]]:
        return list(self.incident_history)[:limit]

    def summarize_window(self, minutes: int = 5, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Summarize traffic conditions and incidents over the last N minutes."""
        now = time.time()
        cutoff = now - (minutes * 60)
        recent = [inc for inc in self.incident_history if inc.get("timestamp")]

        ambulance_count = sum(1 for inc in recent if inc.get("analysis", {}).get("event_type") == "ambulance_detected")
        high_severity = sum(1 for inc in recent if inc.get("analysis", {}).get("severity") in ["high", "critical"])

        summary_req = IncidentAnalysisRequest(
            event_id=f"window_{minutes}m_{int(now)}",
            event_type="multiple_events",
            custom_context=f"Summary of activity in the last {minutes} minutes: {len(recent)} events recorded, {ambulance_count} ambulances, {high_severity} high/critical priority events.",
            vehicle_counts=context.get("vehicle_counts") if context else {},
            robot=context.get("robot") if context else {},
        )

        analysis = gemini_service.analyze_incident(summary_req)
        return {
            "window_minutes": minutes,
            "total_events_in_window": len(recent),
            "ambulances_in_window": ambulance_count,
            "high_severity_in_window": high_severity,
            "ai_summary": analysis.model_dump(),
        }

incident_service = IncidentService()
