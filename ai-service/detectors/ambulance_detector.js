export class AmbulanceDetector {
  constructor() {
    this.emergencyKeywords = ["ambulance", "emergency", "108", "hospital", "paramedic", "ems"];
    this.activeEmergency = null;
  }

  evaluateEmergency(className, confidence, bbox, sirenConfidence = 0.0) {
    const isAmbulance = this.emergencyKeywords.some(kw => (className || "").toLowerCase().includes(kw));

    if (!isAmbulance && sirenConfidence < 0.75) {
      return null;
    }

    const visualConf = isAmbulance ? confidence : 0.5;
    // Weighted combination: 65% visual + 35% acoustic siren
    const combinedConf = Number((0.65 * visualConf + 0.35 * sirenConfidence).toFixed(3));

    if (combinedConf < 0.60) {
      return null;
    }

    // Distance estimation based on normalized bounding box height (larger height = closer to robot)
    const boxH = bbox && bbox.length >= 4 ? bbox[3] : 0.3;
    const distEstMeters = Number(Math.max(3.0, (1.0 - boxH) * 45.0).toFixed(1));

    // Direction based on center x
    const boxCx = bbox && bbox.length >= 4 ? (bbox[0] + bbox[2] / 2.0) : 0.5;
    let direction = "APPROACHING_CENTER";
    let lane = "Lane 2";

    if (boxCx < 0.35) {
      direction = "APPROACHING_LEFT";
      lane = "Lane 1";
    } else if (boxCx > 0.65) {
      direction = "APPROACHING_RIGHT";
      lane = "Lane 3";
    }

    const emergencyEvent = {
      is_emergency: true,
      type: "AMBULANCE_DETECTED",
      confidence: visualConf,
      siren_confidence: sirenConfidence,
      combined_confidence: combinedConf,
      distance_meters: distEstMeters,
      direction,
      lane,
      status: distEstMeters > 15 ? "APPROACHING" : "CORRIDOR_ACTIVE",
      priority: "PRIORITY_1_CRITICAL",
      suggested_action: "Switch Traffic Signals to Virtual Green Corridor"
    };

    this.activeEmergency = emergencyEvent;
    return emergencyEvent;
  }

  getActive() {
    return this.activeEmergency;
  }

  clear() {
    this.activeEmergency = null;
  }
}
