from typing import List, Dict, Any, Optional
import numpy as np

class AmbulanceDetector:
    def __init__(self):
        self.emergency_keywords = ["ambulance", "emergency", "108", "hospital", "paramedic", "ems"]
        self.active_emergency: Optional[Dict[str, Any]] = None

    def evaluate_emergency(self, class_name: str, confidence: float, bbox: List[float], siren_confidence: float = 0.0) -> Optional[Dict[str, Any]]:
        is_ambulance = class_name.lower() in self.emergency_keywords or "ambulance" in class_name.lower()
        
        if not is_ambulance and siren_confidence < 0.75:
            return None

        visual_conf = confidence if is_ambulance else 0.5
        # Weighted combination: 65% visual + 35% acoustic siren
        combined_conf = round(0.65 * visual_conf + 0.35 * siren_confidence, 3)

        if combined_conf < 0.60:
            return None

        # Distance estimation based on normalized bounding box height (larger height = closer to robot)
        box_h = bbox[3] if len(bbox) >= 4 else 0.3
        dist_est_meters = round(max(3.0, (1.0 - box_h) * 45.0), 1)

        # Direction based on center x
        box_cx = bbox[0] + bbox[2] / 2.0 if len(bbox) >= 4 else 0.5
        if box_cx < 0.35:
            direction = "APPROACHING_LEFT"
            lane = "Lane 1"
        elif box_cx > 0.65:
            direction = "APPROACHING_RIGHT"
            lane = "Lane 3"
        else:
            direction = "APPROACHING_CENTER"
            lane = "Lane 2"

        emergency_event = {
            "is_emergency": True,
            "type": "AMBULANCE_DETECTED",
            "confidence": visual_conf,
            "siren_confidence": siren_confidence,
            "combined_confidence": combined_conf,
            "distance_meters": dist_est_meters,
            "direction": direction,
            "lane": lane,
            "status": "APPROACHING" if dist_est_meters > 15 else "CORRIDOR_ACTIVE",
            "priority": "PRIORITY_1_CRITICAL",
            "suggested_action": "Switch Traffic Signals to Virtual Green Corridor"
        }

        self.active_emergency = emergency_event
        return emergency_event

    def get_active(self) -> Optional[Dict[str, Any]]:
        return self.active_emergency

    def clear(self):
        self.active_emergency = None
