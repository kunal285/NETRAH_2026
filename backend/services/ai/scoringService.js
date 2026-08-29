export const INDIAN_STATES = {
  "AN": "Andaman and Nicobar Islands",
  "AP": "Andhra Pradesh",
  "AR": "Arunachal Pradesh",
  "AS": "Assam",
  "BR": "Bihar",
  "CH": "Chandigarh",
  "CG": "Chhattisgarh",
  "DD": "Daman and Diu",
  "DL": "Delhi",
  "DN": "Dadra and Nagar Haveli",
  "GA": "Goa",
  "GJ": "Gujarat",
  "HP": "Himachal Pradesh",
  "HR": "Haryana",
  "JH": "Jharkhand",
  "JK": "Jammu and Kashmir",
  "KA": "Karnataka",
  "KL": "Kerala",
  "LA": "Ladakh",
  "LD": "Lakshadweep",
  "MH": "Maharashtra",
  "ML": "Meghalaya",
  "MN": "Manipur",
  "MP": "Madhya Pradesh",
  "MZ": "Mizoram",
  "NL": "Nagaland",
  "OD": "Odisha",
  "OR": "Odisha",
  "PB": "Punjab",
  "PY": "Puducherry",
  "RJ": "Rajasthan",
  "SK": "Sikkim",
  "TN": "Tamil Nadu",
  "TR": "Tripura",
  "TS": "Telangana",
  "UK": "Uttarakhand",
  "UP": "Uttar Pradesh",
  "WB": "West Bengal",
  "BH": "Bharat Series"
};

const INDIAN_PLATE_PATTERN = /^([A-Z]{2})\s*([0-9]{1,2})\s*([A-Z]{1,3})\s*([0-9]{4})$/i;
const BHARAT_SERIES_PATTERN = /^([0-9]{2})\s*(BH)\s*([0-9]{4})\s*([A-Z]{1,2})$/i;

export class PlateDetector {
  cleanText(rawText) {
    if (!rawText) return "";
    return rawText.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  }

  parseIndianPlate(text) {
    const cleaned = this.cleanText(text);
    if (cleaned.length < 8 || cleaned.length > 12) {
      if (cleaned.length >= 6) {
        const stateCode = cleaned.slice(0, 2);
        if (INDIAN_STATES[stateCode]) {
          return {
            plate_number: cleaned,
            state_code: stateCode,
            state_name: INDIAN_STATES[stateCode],
            is_valid: false,
            confidence_rating: "PARTIAL"
          };
        }
      }
      return null;
    }

    const m = cleaned.match(INDIAN_PLATE_PATTERN);
    if (m) {
      const stateCode = m[1].toUpperCase();
      const rtoCode = m[2];
      const series = m[3].toUpperCase();
      const num = m[4];
      const formatted = `${stateCode}${rtoCode.padStart(2, '0')}${series}${num}`;
      return {
        plate_number: formatted,
        state_code: stateCode,
        state_name: INDIAN_STATES[stateCode] || "Unknown State",
        is_valid: true,
        confidence_rating: "HIGH"
      };
    }

    const mBh = cleaned.match(BHARAT_SERIES_PATTERN);
    if (mBh) {
      const year = mBh[1];
      const bh = mBh[2].toUpperCase();
      const num = mBh[3];
      const series = mBh[4].toUpperCase();
      return {
        plate_number: `${year}${bh}${num}${series}`,
        state_code: "BH",
        state_name: "Bharat Series (All-India)",
        is_valid: true,
        confidence_rating: "HIGH"
      };
    }

    const stateCode = cleaned.slice(0, 2);
    if (INDIAN_STATES[stateCode]) {
      return {
        plate_number: cleaned,
        state_code: stateCode,
        state_name: INDIAN_STATES[stateCode],
        is_valid: false,
        confidence_rating: "MEDIUM"
      };
    }

    return null;
  }
}

export class OCREngine {
  constructor() {
    this.plateDetector = new PlateDetector();
  }

  processCrop(cropImageNp, fallbackText = null) {
    if (!cropImageNp || cropImageNp.length === 0) {
      if (fallbackText) {
        const parsed = this.plateDetector.parseIndianPlate(fallbackText);
        if (parsed) {
          return {
            text: parsed.plate_number,
            state: parsed.state_name,
            confidence: 0.94,
            is_valid: parsed.is_valid
          };
        }
      }
      return {
        text: "UNREADABLE",
        state: "Unknown",
        confidence: 0.0,
        is_valid: false
      };
    }

    if (fallbackText) {
      const parsed = this.plateDetector.parseIndianPlate(fallbackText);
      if (parsed) {
        return {
          text: parsed.plate_number,
          state: parsed.state_name,
          confidence: 0.95,
          is_valid: parsed.is_valid
        };
      }
    }

    return {
      text: "SCANNING_PLATE",
      state: "Analyzing State RTO",
      confidence: 0.85,
      is_valid: true
    };
  }
}

export class AmbulanceDetector {
  constructor() {
    this.emergencyKeywords = ["ambulance", "emergency", "108", "hospital", "paramedic", "ems"];
    this.activeEmergency = null;
  }

  evaluateEmergency(className, confidence, bbox, sirenConfidence = 0.0) {
    const isAmbulance = this.emergencyKeywords.some(kw => (className || "").toLowerCase().includes(kw));
    if (!isAmbulance && sirenConfidence < 0.75) return null;

    const visualConf = isAmbulance ? confidence : 0.5;
    const combinedConf = Number((0.65 * visualConf + 0.35 * sirenConfidence).toFixed(3));
    if (combinedConf < 0.60) return null;

    const boxH = bbox && bbox.length >= 4 ? bbox[3] : 0.3;
    const distEstMeters = Number(Math.max(3.0, (1.0 - boxH) * 45.0).toFixed(1));

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

export class PedestrianDetector {
  constructor() {
    this.crosswalkZone = [0.10, 0.45, 0.90, 0.85];
  }

  setCrosswalkZone(zone) {
    if (zone && zone.length === 4) {
      this.crosswalkZone = zone;
    }
  }

  isInCrosswalk(bbox) {
    if (!bbox || bbox.length < 4) return false;
    const px = bbox[0] + bbox[2] / 2.0;
    const py = bbox[1] + bbox[3];
    const z = this.crosswalkZone;
    return (z[0] <= px && px <= z[2]) && (z[1] <= py && py <= z[3]);
  }

  assessRisk(pedestrians = [], vehicles = []) {
    if (!pedestrians || pedestrians.length === 0) {
      return {
        risk_level: "SAFE",
        score: 0.05,
        in_crosswalk_count: 0,
        total_pedestrians: 0,
        message: "Crosswalk zone clear. No pedestrians detected."
      };
    }

    const pedsInCrosswalk = pedestrians.filter(p => this.isInCrosswalk(p.bbox));
    const inCrosswalkCount = pedsInCrosswalk.length;

    if (inCrosswalkCount === 0) {
      return {
        risk_level: "SAFE",
        score: 0.15,
        in_crosswalk_count: 0,
        total_pedestrians: pedestrians.length,
        message: `${pedestrians.length} pedestrians near curb, crosswalk clear.`
      };
    }

    const highRiskVehicles = [];
    for (const v of vehicles) {
      const vBox = v.bbox || [0, 0, 0, 0];
      const vBottom = vBox[1] + vBox[3];
      if (vBottom > this.crosswalkZone[1] - 0.20) {
        highRiskVehicles.push(v);
      }
    }

    if (highRiskVehicles.length > 0 && inCrosswalkCount > 0) {
      return {
        risk_level: "VIOLATION / RISK",
        score: 0.92,
        in_crosswalk_count: inCrosswalkCount,
        total_pedestrians: pedestrians.length,
        approaching_vehicles: highRiskVehicles.length,
        message: `CRITICAL: ${inCrosswalkCount} pedestrian(s) in crosswalk with ${highRiskVehicles.length} approaching vehicle(s)!`
      };
    }

    if (inCrosswalkCount > 0 && vehicles.length > 0) {
      return {
        risk_level: "CAUTION",
        score: 0.65,
        in_crosswalk_count: inCrosswalkCount,
        total_pedestrians: pedestrians.length,
        approaching_vehicles: 0,
        message: `CAUTION: ${inCrosswalkCount} pedestrian(s) crossing roadway.`
      };
    }

    return {
      risk_level: "SAFE",
      score: 0.25,
      in_crosswalk_count: inCrosswalkCount,
      total_pedestrians: pedestrians.length,
      message: "Pedestrians crossing safely with traffic halted."
    };
  }
}

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

export class ObjectTracker {
  constructor(maxMissingFrames = 15, iouThreshold = 0.3) {
    this.maxMissingFrames = maxMissingFrames;
    this.iouThreshold = iouThreshold;
    this.nextTrackId = 1;
    this.activeTracks = new Map();
    this.totalCounted = 0;
    this.historyByClass = {
      "car": 0,
      "motorcycle": 0,
      "bus": 0,
      "truck": 0,
      "ambulance": 0,
      "person": 0,
      "other": 0
    };
  }

  _iou(bbox1, bbox2) {
    const [x1, y1, w1, h1] = bbox1;
    const [x2, y2, w2, h2] = bbox2;
    const box1_x2 = x1 + w1;
    const box1_y2 = y1 + h1;
    const box2_x2 = x2 + w2;
    const box2_y2 = y2 + h2;

    const xi1 = Math.max(x1, x2);
    const yi1 = Math.max(y1, y2);
    const xi2 = Math.min(box1_x2, box2_x2);
    const yi2 = Math.min(box1_y2, box2_y2);

    const interArea = Math.max(0, xi2 - xi1) * Math.max(0, yi2 - yi1);
    const box1Area = Math.max(0, w1 * h1);
    const box2Area = Math.max(0, w2 * h2);
    const unionArea = box1Area + box2Area - interArea;

    if (unionArea <= 0) return 0.0;
    return interArea / unionArea;
  }

  _getLane(bbox, lanes = null) {
    const cx = bbox[0] + bbox[2] / 2.0;
    if (lanes && lanes.length > 0) {
      for (const lane of lanes) {
        if (lane.min_x <= cx && cx <= lane.max_x) {
          return lane.name || "L1";
        }
      }
    }
    if (cx < 0.25) return "Lane 1";
    if (cx < 0.50) return "Lane 2";
    if (cx < 0.75) return "Lane 3";
    return "Lane 4";
  }

  update(detections, lanes = null) {
    const now = Date.now() / 1000.0;
    const trackedResults = [];
    const matchedTrackIds = new Set();
    const matchedDetIndices = new Set();

    for (let detIdx = 0; detIdx < detections.length; detIdx++) {
      const det = detections[detIdx];
      let bestIou = this.iouThreshold;
      let bestTrackId = null;

      for (const [trackId, track] of this.activeTracks.entries()) {
        if (matchedTrackIds.has(trackId)) continue;
        if (track.class_name !== det.class_name) continue;

        const iou = this._iou(det.bbox, track.bbox);
        if (iou > bestIou) {
          bestIou = iou;
          bestTrackId = trackId;
        }
      }

      if (bestTrackId !== null) {
        const track = this.activeTracks.get(bestTrackId);
        const oldCenter = [track.bbox[0] + track.bbox[2]/2, track.bbox[1] + track.bbox[3]/2];
        const newCenter = [det.bbox[0] + det.bbox[2]/2, det.bbox[1] + det.bbox[3]/2];
        const dt = Math.max(0.01, now - track.last_seen);
        const vx = (newCenter[0] - oldCenter[0]) / dt;
        const vy = (newCenter[1] - oldCenter[1]) / dt;
        const speedEst = Math.sqrt(vx*vx + vy*vy) * 100;

        track.bbox = det.bbox;
        track.confidence = det.confidence !== undefined ? det.confidence : 0.9;
        track.last_seen = now;
        track.missing_frames = 0;
        track.hits += 1;
        track.speed_est = Number(speedEst.toFixed(1));
        track.lane = this._getLane(det.bbox, lanes);
        if (det.plate) track.plate = det.plate;

        matchedTrackIds.add(bestTrackId);
        matchedDetIndices.add(detIdx);

        const detCopy = { ...det };
        detCopy.track_id = bestTrackId;
        detCopy.lane = track.lane;
        detCopy.speed_est = track.speed_est;
        trackedResults.push(detCopy);
      }
    }

    for (let detIdx = 0; detIdx < detections.length; detIdx++) {
      if (matchedDetIndices.has(detIdx)) continue;
      const det = detections[detIdx];
      const trackId = this.nextTrackId;
      this.nextTrackId += 1;
      const className = (det.class_name || "other").toLowerCase();
      const lane = this._getLane(det.bbox, lanes);

      this.activeTracks.set(trackId, {
        track_id: trackId,
        class_name: det.class_name || "car",
        bbox: det.bbox,
        confidence: det.confidence !== undefined ? det.confidence : 0.9,
        first_seen: now,
        last_seen: now,
        missing_frames: 0,
        hits: 1,
        lane: lane,
        speed_est: 0.0,
        plate: det.plate
      });

      this.totalCounted += 1;
      if (this.historyByClass[className] !== undefined) {
        this.historyByClass[className] += 1;
      } else {
        this.historyByClass["other"] += 1;
      }

      const detCopy = { ...det };
      detCopy.track_id = trackId;
      detCopy.lane = lane;
      detCopy.speed_est = 0.0;
      trackedResults.push(detCopy);
    }

    const deadTracks = [];
    for (const [trackId, track] of this.activeTracks.entries()) {
      if (!matchedTrackIds.has(trackId)) {
        track.missing_frames += 1;
        if (track.missing_frames > this.maxMissingFrames || (now - track.last_seen > 5.0)) {
          deadTracks.push(trackId);
        }
      }
    }
    for (const trackId of deadTracks) {
      this.activeTracks.delete(trackId);
    }

    return trackedResults;
  }

  getStats() {
    const laneCounts = { "Lane 1": 0, "Lane 2": 0, "Lane 3": 0, "Lane 4": 0 };
    const classCounts = { "car": 0, "motorcycle": 0, "bus": 0, "truck": 0, "ambulance": 0, "person": 0 };

    for (const track of this.activeTracks.values()) {
      const l = track.lane || "Lane 1";
      if (laneCounts[l] !== undefined) laneCounts[l] += 1;
      const c = (track.class_name || "car").toLowerCase();
      if (classCounts[c] !== undefined) classCounts[c] += 1;
    }

    const totalActive = this.activeTracks.size;
    let densityScore = "LOW";
    if (totalActive > 12) densityScore = "SEVERE";
    else if (totalActive > 7) densityScore = "HIGH";
    else if (totalActive > 3) densityScore = "MODERATE";

    return {
      active_vehicles: totalActive,
      total_counted: this.totalCounted,
      lane_occupancy: laneCounts,
      current_class_counts: classCounts,
      history_class_counts: this.historyByClass,
      congestion_level: densityScore
    };
  }
}
