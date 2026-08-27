from typing import List, Dict, Any, Optional

class PedestrianDetector:
    def __init__(self):
        # Default crosswalk zone: [min_x, min_y, max_x, max_y] normalized
        self.crosswalk_zone = [0.10, 0.45, 0.90, 0.85]

    def set_crosswalk_zone(self, zone: List[float]):
        if len(zone) == 4:
            self.crosswalk_zone = zone

    def is_in_crosswalk(self, bbox: List[float]) -> bool:
        # Check if bottom-center of pedestrian box falls inside crosswalk zone
        px = bbox[0] + bbox[2] / 2.0
        py = bbox[1] + bbox[3] # foot contact point
        z = self.crosswalk_zone
        return (z[0] <= px <= z[2]) and (z[1] <= py <= z[3])

    def assess_risk(self, pedestrians: List[Dict[str, Any]], vehicles: List[Dict[str, Any]]) -> Dict[str, Any]:
        if not pedestrians:
            return {
                "risk_level": "SAFE",
                "score": 0.05,
                "in_crosswalk_count": 0,
                "total_pedestrians": 0,
                "message": "Crosswalk zone clear. No pedestrians detected."
            }

        peds_in_crosswalk = [p for p in pedestrians if self.is_in_crosswalk(p.get("bbox", [0, 0, 0, 0]))]
        in_crosswalk_count = len(peds_in_crosswalk)

        if in_crosswalk_count == 0:
            return {
                "risk_level": "SAFE",
                "score": 0.15,
                "in_crosswalk_count": 0,
                "total_pedestrians": len(pedestrians),
                "message": f"{len(pedestrians)} pedestrians near curb, crosswalk clear."
            }

        # Check vehicle proximity & closing speed towards crosswalk
        high_risk_vehicles = []
        for v in vehicles:
            v_box = v.get("bbox", [0, 0, 0, 0])
            # If vehicle is above or inside crosswalk moving forward
            v_bottom = v_box[1] + v_box[3]
            if v_bottom > self.crosswalk_zone[1] - 0.20:
                high_risk_vehicles.append(v)

        if high_risk_vehicles and in_crosswalk_count > 0:
            return {
                "risk_level": "VIOLATION / RISK",
                "score": 0.92,
                "in_crosswalk_count": in_crosswalk_count,
                "total_pedestrians": len(pedestrians),
                "approaching_vehicles": len(high_risk_vehicles),
                "message": f"CRITICAL: {in_crosswalk_count} pedestrian(s) in crosswalk with {len(high_risk_vehicles)} approaching vehicle(s)!"
            }

        if in_crosswalk_count > 0 and len(vehicles) > 0:
            return {
                "risk_level": "CAUTION",
                "score": 0.65,
                "in_crosswalk_count": in_crosswalk_count,
                "total_pedestrians": len(pedestrians),
                "approaching_vehicles": 0,
                "message": f"CAUTION: {in_crosswalk_count} pedestrian(s) crossing roadway."
            }

        return {
            "risk_level": "SAFE",
            "score": 0.25,
            "in_crosswalk_count": in_crosswalk_count,
            "total_pedestrians": len(pedestrians),
            "message": "Pedestrians crossing safely with traffic halted."
        }
