import time
import math
from typing import List, Dict, Any, Tuple

class ObjectTracker:
    def __init__(self, max_missing_frames: int = 15, iou_threshold: float = 0.3):
        self.max_missing_frames = max_missing_frames
        self.iou_threshold = iou_threshold
        self.next_track_id = 1
        self.active_tracks: Dict[int, Dict[str, Any]] = {}
        self.total_counted = 0
        self.history_by_class: Dict[str, int] = {
            "car": 0,
            "motorcycle": 0,
            "bus": 0,
            "truck": 0,
            "ambulance": 0,
            "person": 0,
            "other": 0
        }

    def _iou(self, bbox1: List[float], bbox2: List[float]) -> float:
        # bbox is [x, y, w, h] in normalized or pixel coordinates
        x1, y1, w1, h1 = bbox1
        x2, y2, w2, h2 = bbox2
        
        box1_x2, box1_y2 = x1 + w1, y1 + h1
        box2_x2, box2_y2 = x2 + w2, y2 + h2

        xi1 = max(x1, x2)
        yi1 = max(y1, y2)
        xi2 = min(box1_x2, box2_x2)
        yi2 = min(box1_y2, box2_y2)

        inter_area = max(0, xi2 - xi1) * max(0, yi2 - yi1)
        box1_area = max(0, w1 * h1)
        box2_area = max(0, w2 * h2)
        union_area = box1_area + box2_area - inter_area

        if union_area <= 0:
            return 0.0
        return inter_area / union_area

    def _get_lane(self, bbox: List[float], lanes: List[Dict[str, Any]] = None) -> str:
        # Normalized center x
        cx = bbox[0] + bbox[2] / 2.0
        if lanes and len(lanes) > 0:
            for lane in lanes:
                if lane.get("min_x", 0) <= cx <= lane.get("max_x", 1.0):
                    return lane.get("name", "L1")
        # Default 4 equal lanes
        if cx < 0.25:
            return "Lane 1"
        elif cx < 0.50:
            return "Lane 2"
        elif cx < 0.75:
            return "Lane 3"
        else:
            return "Lane 4"

    def update(self, detections: List[Dict[str, Any]], lanes: List[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        now = time.time()
        tracked_results = []
        matched_track_ids = set()
        matched_det_indices = set()

        # Step 1: Match incoming detections to active tracks via IoU
        for det_idx, det in enumerate(detections):
            best_iou = self.iou_threshold
            best_track_id = None

            for track_id, track in self.active_tracks.items():
                if track_id in matched_track_ids:
                    continue
                if track["class_name"] != det.get("class_name"):
                    continue

                iou = self._iou(det["bbox"], track["bbox"])
                if iou > best_iou:
                    best_iou = iou
                    best_track_id = track_id

            if best_track_id is not None:
                # Update existing track
                track = self.active_tracks[best_track_id]
                old_center = (track["bbox"][0] + track["bbox"][2]/2, track["bbox"][1] + track["bbox"][3]/2)
                new_center = (det["bbox"][0] + det["bbox"][2]/2, det["bbox"][1] + det["bbox"][3]/2)
                
                # Approximate speed / velocity in normalized units/sec
                dt = max(0.01, now - track["last_seen"])
                vx = (new_center[0] - old_center[0]) / dt
                vy = (new_center[1] - old_center[1]) / dt
                speed_est = math.sqrt(vx*vx + vy*vy) * 100 # Normalized speed score

                track["bbox"] = det["bbox"]
                track["confidence"] = det.get("confidence", 0.9)
                track["last_seen"] = now
                track["missing_frames"] = 0
                track["hits"] += 1
                track["speed_est"] = round(speed_est, 1)
                track["lane"] = self._get_lane(det["bbox"], lanes)
                if "plate" in det:
                    track["plate"] = det["plate"]

                matched_track_ids.add(best_track_id)
                matched_det_indices.add(det_idx)

                det_copy = dict(det)
                det_copy["track_id"] = best_track_id
                det_copy["lane"] = track["lane"]
                det_copy["speed_est"] = track["speed_est"]
                tracked_results.append(det_copy)

        # Step 2: Create new tracks for unmatched detections
        for det_idx, det in enumerate(detections):
            if det_idx in matched_det_indices:
                continue

            track_id = self.next_track_id
            self.next_track_id += 1

            cls_name = det.get("class_name", "other").lower()
            lane = self._get_lane(det["bbox"], lanes)

            self.active_tracks[track_id] = {
                "track_id": track_id,
                "class_name": det.get("class_name", "car"),
                "bbox": det["bbox"],
                "confidence": det.get("confidence", 0.9),
                "first_seen": now,
                "last_seen": now,
                "missing_frames": 0,
                "hits": 1,
                "lane": lane,
                "speed_est": 0.0,
                "plate": det.get("plate")
            }

            self.total_counted += 1
            if cls_name in self.history_by_class:
                self.history_by_class[cls_name] += 1
            else:
                self.history_by_class["other"] += 1

            det_copy = dict(det)
            det_copy["track_id"] = track_id
            det_copy["lane"] = lane
            det_copy["speed_est"] = 0.0
            tracked_results.append(det_copy)

        # Step 3: Age & clean up dead tracks
        dead_tracks = []
        for track_id, track in self.active_tracks.items():
            if track_id not in matched_track_ids:
                track["missing_frames"] += 1
                if track["missing_frames"] > self.max_missing_frames or (now - track["last_seen"] > 5.0):
                    dead_tracks.append(track_id)

        for track_id in dead_tracks:
            del self.active_tracks[track_id]

        return tracked_results

    def get_stats(self) -> Dict[str, Any]:
        lane_counts = {"Lane 1": 0, "Lane 2": 0, "Lane 3": 0, "Lane 4": 0}
        class_counts = {"car": 0, "motorcycle": 0, "bus": 0, "truck": 0, "ambulance": 0, "person": 0}

        for track in self.active_tracks.values():
            l = track.get("lane", "Lane 1")
            if l in lane_counts:
                lane_counts[l] += 1
            c = track.get("class_name", "car").lower()
            if c in class_counts:
                class_counts[c] += 1

        total_active = len(self.active_tracks)
        density_score = "LOW"
        if total_active > 12:
            density_score = "SEVERE"
        elif total_active > 7:
            density_score = "HIGH"
        elif total_active > 3:
            density_score = "MODERATE"

        return {
            "active_vehicles": total_active,
            "total_counted": self.total_counted,
            "lane_occupancy": lane_counts,
            "current_class_counts": class_counts,
            "history_class_counts": self.history_by_class,
            "congestion_level": density_score
        }
