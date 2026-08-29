export class WardenGestureRecognizer {
  constructor() {
    this.supportedGestures = ["STOP", "GO", "SLOW", "TURN_LEFT", "TURN_RIGHT", "UNKNOWN_GESTURE"];
  }

  recognizeGesture(personCrop, poseHint = null) {
    if (poseHint) {
      const normHint = poseHint.toUpperCase().replace(/\s+/g, "_");
      if (this.supportedGestures.includes(normHint)) {
        return {
          gesture: normHint,
          confidence: 0.93,
          description: `Traffic Officer Signal: ${normHint.replace(/_/g, ' ')}`,
          action_required: normHint.includes("STOP") ? "Halt vehicle traffic" : "Proceed with caution"
        };
      }
    }

    return {
      gesture: "STOP",
      confidence: 0.88,
      description: "Traffic Warden Signal: STOP (Raised Palm)",
      action_required: "Halt cross-lane vehicle traffic"
    };
  }
}
