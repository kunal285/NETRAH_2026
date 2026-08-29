export class PedestrianDetector {
  constructor() {
    // Default crosswalk zone: [min_x, min_y, max_x, max_y] normalized
    this.crosswalkZone = [0.10, 0.45, 0.90, 0.85];
  }

  setCrosswalkZone(zone) {
    if (zone && zone.length === 4) {
      this.crosswalkZone = zone;
    }
  }

  isInCrosswalk(bbox) {
    if (!bbox || bbox.length < 4) return false;
    // Check if bottom-center of pedestrian box falls inside crosswalk zone
    const px = bbox[0] + bbox[2] / 2.0;
    const py = bbox[1] + bbox[3]; // foot contact point
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

    // Check vehicle proximity & closing speed towards crosswalk
    const highRiskVehicles = [];
    for (const v of vehicles) {
      const vBox = v.bbox || [0, 0, 0, 0];
      const vBottom = vBox[1] + vBox[3];
      if (vBottom > this.crosswalkZone[1] - 0.20) {
        highRiskVehicles.append ? highRiskVehicles.push(v) : highRiskVehicles.push(v);
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
