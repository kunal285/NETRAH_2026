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
    // Default 4 equal lanes
    if (cx < 0.25) {
      return "Lane 1";
    } else if (cx < 0.50) {
      return "Lane 2";
    } else if (cx < 0.75) {
      return "Lane 3";
    } else {
      return "Lane 4";
    }
  }

  update(detections, lanes = null) {
    const now = Date.now() / 1000.0; // Unix timestamp in seconds
    const trackedResults = [];
    const matchedTrackIds = new Set();
    const matchedDetIndices = new Set();

    // Step 1: Match incoming detections to active tracks via IoU
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
        const oldCenter = [track.bbox[0] + track.bbox[2] / 2, track.bbox[1] + track.bbox[3] / 2];
        const newCenter = [det.bbox[0] + det.bbox[2] / 2, det.bbox[1] + det.bbox[3] / 2];

        // Approximate speed / velocity in normalized units/sec
        const dt = Math.max(0.01, now - track.last_seen);
        const vx = (newCenter[0] - oldCenter[0]) / dt;
        const vy = (newCenter[1] - oldCenter[1]) / dt;
        const speedEst = Math.sqrt(vx * vx + vy * vy) * 100; // Normalized speed score

        track.bbox = det.bbox;
        track.confidence = det.confidence !== undefined ? det.confidence : 0.9;
        track.last_seen = now;
        track.missing_frames = 0;
        track.hits += 1;
        track.speed_est = Number(speedEst.toFixed(1));
        track.lane = this._getLane(det.bbox, lanes);
        if (det.plate) {
          track.plate = det.plate;
        }

        matchedTrackIds.add(bestTrackId);
        matchedDetIndices.add(detIdx);

        const detCopy = { ...det };
        detCopy.track_id = bestTrackId;
        detCopy.lane = track.lane;
        detCopy.speed_est = track.speed_est;
        trackedResults.push(detCopy);
      }
    }

    // Step 2: Create new tracks for unmatched detections
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

    // Step 3: Age & clean up dead tracks
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
      if (laneCounts[l] !== undefined) {
        laneCounts[l] += 1;
      }
      const c = (track.class_name || "car").toLowerCase();
      if (classCounts[c] !== undefined) {
        classCounts[c] += 1;
      }
    }

    const totalActive = this.activeTracks.size;
    let densityScore = "LOW";
    if (totalActive > 12) {
      densityScore = "SEVERE";
    } else if (totalActive > 7) {
      densityScore = "HIGH";
    } else if (totalActive > 3) {
      densityScore = "MODERATE";
    }

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
