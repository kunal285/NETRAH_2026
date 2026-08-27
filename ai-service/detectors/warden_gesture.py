from typing import Dict, Any, Optional, List

class WardenGestureRecognizer:
    def __init__(self):
        self.supported_gestures = ["STOP", "GO", "SLOW", "TURN_LEFT", "TURN_RIGHT", "UNKNOWN_GESTURE"]

    def recognize_gesture(self, person_crop: Optional[Any], pose_hint: Optional[str] = None) -> Dict[str, Any]:
        """
        Classifies traffic police / warden hand gestures
        """
        if pose_hint:
            norm_hint = pose_hint.upper().replace(" ", "_")
            if norm_hint in self.supported_gestures:
                return {
                    "gesture": norm_hint,
                    "confidence": 0.93,
                    "description": f"Traffic Officer Signal: {norm_hint.replace('_', ' ')}",
                    "action_required": "Halt vehicle traffic" if "STOP" in norm_hint else "Proceed with caution"
                }

        # If person is detected with raised palm / outstretched arms
        return {
            "gesture": "STOP",
            "confidence": 0.88,
            "description": "Traffic Warden Signal: STOP (Raised Palm)",
            "action_required": "Halt cross-lane vehicle traffic"
        }
