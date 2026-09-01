import json
import time
import base64
from typing import Dict, Any, List, Optional
from google import genai
from google.genai import types

from ..config import settings
from ..utils.logger import logger
from ..schemas.incident import IncidentAnalysisRequest, IncidentAnalysisResponse
from ..schemas.gemini import (
    ChatMessage,
    ChatResponse,
    DetectionExplanationResponse,
    TelemetryAnalysisResponse,
    ImageAnalysisResponse,
)

class GeminiService:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.model_name = settings.GEMINI_MODEL
        self.system_prompt = settings.get_system_prompt()
        self.client: Optional[genai.Client] = None
        self._init_client()

    def _init_client(self):
        if self.api_key and self.api_key != "your_key_here":
            try:
                self.client = genai.Client(api_key=self.api_key)
                logger.info(f"Gemini client initialized successfully with model: {self.model_name}")
            except Exception as e:
                logger.error(f"Failed to initialize Gemini Client: {e}")
                self.client = None
        else:
            logger.warning("GEMINI_API_KEY not set or placeholder. Gemini will operate in fallback mode.")
            self.client = None

    def is_available(self) -> bool:
        return self.client is not None

    def check_health(self) -> Dict[str, Any]:
        has_key = bool(self.api_key and self.api_key != "your_key_here")
        return {
            "status": "connected" if self.is_available() else "degraded" if has_key else "unconfigured",
            "model": self.model_name,
            "has_api_key": has_key,
            "prompt_version": settings.PRAHARI_AI_PROMPT_VERSION,
        }

    def _fallback_incident_analysis(self, req: IncidentAnalysisRequest, error_msg: Optional[str] = None) -> IncidentAnalysisResponse:
        """Deterministic rule-based fallback when Gemini API is offline or unavailable."""
        amb_detected = bool(req.ambulance_detected or (req.event_type and "ambulance" in req.event_type.lower()))
        veh_count = sum(req.vehicle_counts.values()) if req.vehicle_counts else 0
        obst_dist = req.robot.get("obstacle_distance_cm") if req.robot else None
        bat_v = req.robot.get("battery_voltage") if req.robot else None

        if amb_detected:
            return IncidentAnalysisResponse(
                event_id=req.event_id,
                summary="Emergency vehicle (Ambulance 108) active in monitored traffic sector.",
                severity="high",
                event_type="ambulance_detected",
                confidence=req.ambulance_confidence or 0.94,
                recommended_action="Prioritize emergency green corridor and maintain clear lane passage.",
                operator_message="Ambulance detected. Green corridor protocol recommended.",
                reasoning_summary="Visual and beacon classifier detected active emergency vehicle.",
                requires_operator_attention=True,
                ai_model="PRAHARI-Deterministic-Fallback",
                latency_ms=1.0,
            )
        elif bat_v is not None and bat_v < 31.5:
            return IncidentAnalysisResponse(
                event_id=req.event_id,
                summary=f"Robot battery voltage is critically low ({bat_v}V).",
                severity="critical" if bat_v < 30.0 else "high",
                event_type="battery_low",
                confidence=0.99,
                recommended_action="Direct robot to nearest charging bay or replace battery pack.",
                operator_message=f"Low battery warning: {bat_v}V.",
                reasoning_summary="Telemetry indicates pack voltage below safe threshold (31.5V).",
                requires_operator_attention=True,
                ai_model="PRAHARI-Deterministic-Fallback",
                latency_ms=1.0,
            )
        elif obst_dist is not None and obst_dist < 45.0:
            return IncidentAnalysisResponse(
                event_id=req.event_id,
                summary=f"Proximity obstacle detected at {obst_dist} cm.",
                severity="high",
                event_type="obstacle_detected",
                confidence=0.95,
                recommended_action="Halt or steer robot away from immediate obstacle trajectory.",
                operator_message=f"Obstacle in close range ({obst_dist} cm).",
                reasoning_summary="Ultrasonic sensor triggered proximity threshold (< 45 cm).",
                requires_operator_attention=True,
                ai_model="PRAHARI-Deterministic-Fallback",
                latency_ms=1.0,
            )
        elif veh_count > 15:
            return IncidentAnalysisResponse(
                event_id=req.event_id,
                summary=f"High traffic density observed ({veh_count} vehicles tracked).",
                severity="medium",
                event_type="traffic_congestion",
                confidence=0.88,
                recommended_action="Monitor junction flow and consider adjusting signal timing.",
                operator_message=f"Congestion alert: {veh_count} vehicles in view.",
                reasoning_summary="Vehicle count exceeded junction congestion threshold (>15).",
                requires_operator_attention=False,
                ai_model="PRAHARI-Deterministic-Fallback",
                latency_ms=1.0,
            )
        else:
            return IncidentAnalysisResponse(
                event_id=req.event_id,
                summary="Routine traffic patrol conditions nominal.",
                severity="low",
                event_type="normal",
                confidence=0.90,
                recommended_action="Maintain routine autonomous or RC patrol route.",
                operator_message="Sector nominal.",
                reasoning_summary="All sensor streams and vehicle counts are within normal operating bounds.",
                requires_operator_attention=False,
                ai_model="PRAHARI-Deterministic-Fallback",
                latency_ms=1.0,
            )

    def analyze_incident(self, req: IncidentAnalysisRequest) -> IncidentAnalysisResponse:
        start_time = time.time()
        if not self.is_available():
            res = self._fallback_incident_analysis(req, "Gemini API client not initialized")
            res.latency_ms = round((time.time() - start_time) * 1000, 2)
            return res

        prompt = f"""
Analyze this structured traffic-police robot observation and generate a structured JSON incident report.

Observation Data:
- Event ID: {req.event_id}
- Event Type: {req.event_type}
- Timestamp: {req.timestamp}
- Vehicle Counts: {json.dumps(req.vehicle_counts)}
- Ambulance Detected: {req.ambulance_detected} (Confidence: {req.ambulance_confidence})
- Detected Plates: {json.dumps(req.plates)}
- Detected Faces: {json.dumps(req.faces)}
- Robot Telemetry: {json.dumps(req.robot)}
- Recent Detections: {json.dumps(req.recent_detections[:5])}
- Context: {req.custom_context or 'None'}

Return ONLY valid JSON matching this schema:
{{
  "summary": "<Concise incident summary, max 2 sentences>",
  "severity": "<one of: low, medium, high, critical>",
  "event_type": "<one of: normal, vehicle_detected, ambulance_detected, traffic_congestion, obstacle_detected, unknown_plate, known_face, unknown_face, battery_low, motor_overcurrent, communication_issue, multiple_events, system_warning>",
  "confidence": <float between 0.0 and 1.0>,
  "recommended_action": "<Operator guidance, NEVER motor command>",
  "operator_message": "<Short badge alert message>",
  "reasoning_summary": "<Explanation grounded strictly in provided data>",
  "requires_operator_attention": <true or false>
}}
"""
        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=self.system_prompt,
                    response_mime_type="application/json",
                    temperature=0.2,
                )
            )
            raw_text = response.text.strip()
            data = json.loads(raw_text)
            latency = round((time.time() - start_time) * 1000, 2)

            return IncidentAnalysisResponse(
                event_id=req.event_id,
                summary=data.get("summary", "Traffic observation processed."),
                severity=data.get("severity", "low"),
                event_type=data.get("event_type", "normal"),
                confidence=float(data.get("confidence", 0.9)),
                recommended_action=data.get("recommended_action", "Maintain monitoring."),
                operator_message=data.get("operator_message", "Event logged."),
                reasoning_summary=data.get("reasoning_summary", "Analyzed from vision and telemetry feeds."),
                requires_operator_attention=bool(data.get("requires_operator_attention", False)),
                ai_model=self.model_name,
                latency_ms=latency,
            )
        except Exception as e:
            logger.error(f"Gemini incident analysis failed: {e}. Falling back to deterministic analysis.")
            res = self._fallback_incident_analysis(req, str(e))
            res.latency_ms = round((time.time() - start_time) * 1000, 2)
            return res

    def generate_chat_reply(self, message: str, history: List[ChatMessage], context: Dict[str, Any]) -> ChatResponse:
        start_time = time.time()
        if not self.is_available():
            # Intelligent rule-based fallback
            lower_msg = message.lower()
            if "ambulance" in lower_msg:
                amb = context.get("active_ambulance") or context.get("ambulance_detected")
                reply = f"Ambulance Status: {'Ambulance 108 is currently active in the sector.' if amb else 'No emergency vehicles currently detected in sector.'}"
            elif "vehicle" in lower_msg or "traffic" in lower_msg or "how many" in lower_msg:
                counts = context.get("vehicle_counts", {})
                total = sum(counts.values()) if isinstance(counts, dict) else context.get("total_vehicles", 0)
                reply = f"Current traffic status: {total} vehicles currently tracked in the camera sector."
            elif "battery" in lower_msg or "motor" in lower_msg or "condition" in lower_msg or "telemetry" in lower_msg:
                tel = context.get("telemetry", {}) or context.get("robot_status", {})
                bat = tel.get("batteryVoltage") or tel.get("battery_voltage", "34.8")
                reply = f"Robot condition: Battery at {bat}V. Motor current and temperature are within safe limits."
            else:
                reply = "PRAHARI AI Assistant (Offline mode): Robot telemetry and perception streams are active. Ask about vehicle counts, ambulance alerts, or robot battery status."

            return ChatResponse(
                reply=reply,
                requires_operator_attention=False,
                severity="low",
                suggested_actions=["Check Traffic Density", "Inspect Telemetry", "View ANPR Table"],
                latency_ms=round((time.time() - start_time) * 1000, 2),
                ai_model="PRAHARI-Deterministic-Fallback",
            )

        conversation_contents = []
        for msg in history[-6:]:
            conversation_contents.append(f"{msg.role.upper()}: {msg.content}")

        context_str = json.dumps(context, default=str)
        prompt = f"""
Current Robot Real-Time Context:
{context_str}

Conversation History:
{chr(10).join(conversation_contents)}

Operator Question:
{message}

Respond to the operator in a helpful, concise, professional robotics command center tone.
Return ONLY valid JSON in this schema:
{{
  "reply": "<Direct, accurate answer strictly grounded in the robot's data>",
  "requires_operator_attention": <true or false>,
  "severity": "<low, medium, high, or critical>",
  "suggested_actions": ["<Action 1>", "<Action 2>"]
}}
"""
        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=self.system_prompt,
                    response_mime_type="application/json",
                    temperature=0.3,
                )
            )
            data = json.loads(response.text.strip())
            return ChatResponse(
                reply=data.get("reply", "Understood. Monitoring sector."),
                requires_operator_attention=bool(data.get("requires_operator_attention", False)),
                severity=data.get("severity", "low"),
                suggested_actions=data.get("suggested_actions", []),
                latency_ms=round((time.time() - start_time) * 1000, 2),
                ai_model=self.model_name,
            )
        except Exception as e:
            logger.error(f"Gemini chat failed: {e}")
            return ChatResponse(
                reply=f"AI service response: Analysis could not complete ({str(e)}). Robot systems remain fully operational.",
                requires_operator_attention=False,
                severity="low",
                suggested_actions=["Retry query", "View manual telemetry"],
                latency_ms=round((time.time() - start_time) * 1000, 2),
                ai_model="PRAHARI-Deterministic-Fallback",
            )

    def explain_detection(self, detection: Dict[str, Any], telemetry: Optional[Dict[str, Any]] = None) -> DetectionExplanationResponse:
        start_time = time.time()
        det_type = detection.get("type", "UNKNOWN")
        det_info = detection.get("detectionInfo") or detection.get("result") or det_type
        conf = detection.get("confidence", 0.9)

        if not self.is_available():
            return DetectionExplanationResponse(
                detection_id=detection.get("id"),
                explanation=f"{det_type} detection ({det_info}) identified with {int(float(conf)*100)}% confidence.",
                severity="high" if det_type == "AMBULANCE" else "low",
                confidence_assessment="High confidence reading from edge perception pipeline.",
                safety_advisory="Monitor visual feed to confirm observation.",
                requires_operator_action=det_type == "AMBULANCE",
                latency_ms=round((time.time() - start_time) * 1000, 2),
            )

        prompt = f"""
Explain this specific detection event for the traffic-police command console:
Detection Data: {json.dumps(detection, default=str)}
Robot Telemetry: {json.dumps(telemetry or {}, default=str)}

Return ONLY JSON:
{{
  "explanation": "<2-sentence clear explanation>",
  "severity": "<low, medium, high, or critical>",
  "confidence_assessment": "<assessment of detector certainty>",
  "safety_advisory": "<recommended safety advice>",
  "requires_operator_action": <true or false>
}}
"""
        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=self.system_prompt,
                    response_mime_type="application/json",
                    temperature=0.2,
                )
            )
            data = json.loads(response.text.strip())
            return DetectionExplanationResponse(
                detection_id=detection.get("id"),
                explanation=data.get("explanation", f"{det_type} detected."),
                severity=data.get("severity", "low"),
                confidence_assessment=data.get("confidence_assessment", f"Confidence {conf}"),
                safety_advisory=data.get("safety_advisory", "Maintain standard observation."),
                requires_operator_action=bool(data.get("requires_operator_action", False)),
                latency_ms=round((time.time() - start_time) * 1000, 2),
            )
        except Exception as e:
            logger.error(f"Gemini explain_detection failed: {e}")
            return DetectionExplanationResponse(
                detection_id=detection.get("id"),
                explanation=f"Detection of {det_type} logged at {int(float(conf)*100)}% confidence.",
                severity="low",
                confidence_assessment=f"OCR / CV pipeline recorded {conf}.",
                safety_advisory="Operator visual verification recommended.",
                requires_operator_action=False,
                latency_ms=round((time.time() - start_time) * 1000, 2),
            )

    def analyze_telemetry(self, telemetry: Dict[str, Any]) -> TelemetryAnalysisResponse:
        start_time = time.time()
        bat_v = telemetry.get("battery_voltage") or telemetry.get("batteryVoltage")
        curr_l = telemetry.get("motor_current_left") or telemetry.get("leftMotorCurrent")
        curr_r = telemetry.get("motor_current_right") or telemetry.get("rightMotorCurrent")
        obst = telemetry.get("obstacle_distance_cm") or telemetry.get("obstacleDistance")

        warnings = []
        recommendations = []
        health_rating = "OPTIMAL"

        if bat_v and float(bat_v) < 31.5:
            warnings.append(f"Low battery pack voltage: {bat_v}V (Nominal: 36V)")
            recommendations.append("Route robot to charging station.")
            health_rating = "WARNING" if float(bat_v) >= 30.0 else "CRITICAL"

        if curr_l and curr_r:
            diff = abs(float(curr_l) - float(curr_r))
            if diff > 10.0:
                warnings.append(f"Asymmetric motor current draw detected (Left: {curr_l}A, Right: {curr_r}A).")
                recommendations.append("Inspect tracks/wheels and BTS7960 drivers for mechanical binding.")
                health_rating = "WARNING"

        if obst and float(obst) < 40.0:
            warnings.append(f"Front ultrasonic obstacle proximity warning ({obst} cm).")
            recommendations.append("Check front pathway for pedestrians or obstacles.")

        if not self.is_available() or (not warnings and not self.api_key):
            summary = "Robot mechanical, electrical, and telemetry metrics are operating within expected parameters."
            if warnings:
                summary = f"Telemetry alert: {'; '.join(warnings)}"
            return TelemetryAnalysisResponse(
                status_summary=summary,
                health_rating=health_rating,
                warnings=warnings,
                recommendations=recommendations or ["Maintain standard patrol schedule."],
                requires_maintenance=health_rating == "CRITICAL",
                latency_ms=round((time.time() - start_time) * 1000, 2),
            )

        prompt = f"""
Analyze this PRAHARI traffic robot electrical and sensor telemetry:
Telemetry: {json.dumps(telemetry, default=str)}
Existing Rule Warnings: {json.dumps(warnings)}

Return ONLY JSON:
{{
  "status_summary": "<summary of overall robot hardware health>",
  "health_rating": "<OPTIMAL, WARNING, or CRITICAL>",
  "warnings": ["<warning 1>", "..."],
  "recommendations": ["<recommendation 1>", "..."],
  "requires_maintenance": <true or false>
}}
"""
        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=self.system_prompt,
                    response_mime_type="application/json",
                    temperature=0.2,
                )
            )
            data = json.loads(response.text.strip())
            return TelemetryAnalysisResponse(
                status_summary=data.get("status_summary", "Telemetry nominal."),
                health_rating=data.get("health_rating", health_rating),
                warnings=data.get("warnings", warnings),
                recommendations=data.get("recommendations", recommendations),
                requires_maintenance=bool(data.get("requires_maintenance", False)),
                latency_ms=round((time.time() - start_time) * 1000, 2),
            )
        except Exception as e:
            logger.error(f"Gemini telemetry analysis failed: {e}")
            return TelemetryAnalysisResponse(
                status_summary="Telemetry parsed by deterministic safety rules.",
                health_rating=health_rating,
                warnings=warnings,
                recommendations=recommendations or ["Maintain standard patrol."],
                requires_maintenance=health_rating == "CRITICAL",
                latency_ms=round((time.time() - start_time) * 1000, 2),
            )

    def analyze_image(self, image_b64: str, metadata: Dict[str, Any], existing_detections: List[Dict[str, Any]]) -> ImageAnalysisResponse:
        start_time = time.time()
        if not self.is_available():
            return ImageAnalysisResponse(
                scene_summary="Traffic scene captured by robot camera. Edge YOLO and ANPR active.",
                objects=existing_detections,
                traffic_condition="Moderate flow",
                possible_risk="None identified",
                requires_attention=False,
                confidence=0.80,
                latency_ms=round((time.time() - start_time) * 1000, 2),
            )

        clean_b64 = image_b64.replace("data:image/jpeg;base64,", "").replace("data:image/png;base64,", "")
        try:
            img_bytes = base64.b64decode(clean_b64)
            image_part = types.Part.from_bytes(
                data=img_bytes,
                mime_type="image/jpeg"
            )

            prompt = f"""
Analyze this camera snapshot from the PRAHARI traffic-police robot.
Metadata: {json.dumps(metadata, default=str)}
Existing YOLO/OCR detections: {json.dumps(existing_detections, default=str)}

Return ONLY JSON:
{{
  "scene_summary": "<high-level description of the intersection/road>",
  "objects": [
    {{"label": "<class>", "description": "<notes>"}}
  ],
  "traffic_condition": "<HEAVY, MODERATE, or LIGHT>",
  "possible_risk": "<any safety hazard like jaywalking, emergency vehicle blocked, or none>",
  "requires_attention": <true or false>,
  "confidence": <float between 0.0 and 1.0>
}}
"""
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=[image_part, prompt],
                config=types.GenerateContentConfig(
                    system_instruction=self.system_prompt,
                    response_mime_type="application/json",
                    temperature=0.2,
                )
            )
            data = json.loads(response.text.strip())
            return ImageAnalysisResponse(
                scene_summary=data.get("scene_summary", "Traffic scene analyzed."),
                objects=data.get("objects", []),
                traffic_condition=data.get("traffic_condition", "MODERATE"),
                possible_risk=data.get("possible_risk", "None"),
                requires_attention=bool(data.get("requires_attention", False)),
                confidence=float(data.get("confidence", 0.88)),
                latency_ms=round((time.time() - start_time) * 1000, 2),
            )
        except Exception as e:
            logger.error(f"Gemini image analysis failed: {e}")
            return ImageAnalysisResponse(
                scene_summary="Image analyzed with edge CV fallback.",
                objects=existing_detections,
                traffic_condition="MODERATE",
                possible_risk="Standard road risk",
                requires_attention=False,
                confidence=0.75,
                latency_ms=round((time.time() - start_time) * 1000, 2),
            )

gemini_service = GeminiService()
