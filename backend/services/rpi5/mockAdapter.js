export class MockAdapter {
  constructor(controller) {
    this.controller = controller;
  }
  
  readSensors() {
    this.controller.uptime = Math.floor((Date.now() - this.controller.startTime) / 1000);
    
    // Accel noise walk
    this.controller.accel = {
      x: Number((0.01 + (Math.random() - 0.5) * 0.04).toFixed(2)),
      y: Number((-0.02 + (Math.random() - 0.5) * 0.04).toFixed(2)),
      z: Number((9.81 + (Math.random() - 0.5) * 0.04).toFixed(2)),
    };
    this.controller.gyro = { x: 0.00, y: 0.00, z: 0.00 };
    
    // GPS coordinate walk
    this.controller.gpsLat = Number((18.52043 + (Math.random() - 0.5) * 0.0001).toFixed(6));
    this.controller.gpsLng = Number((73.85674 + (Math.random() - 0.5) * 0.0001).toFixed(6));
    this.controller.gpsSpeed = Math.abs(this.controller.leftPwm) > 0 ? Number((12.5 + Math.random()).toFixed(1)) : 0.0;
    
    // Battery calculations
    this.controller.batteryVoltage = Number((38.2 - (this.controller.uptime * 0.0001) % 4.0).toFixed(1));
    this.controller.batteryPercentage = Math.max(10, Math.min(100, Math.round((this.controller.batteryVoltage - 30) / 8.2 * 100)));
    
    // Ultrasound distance fluctuations
    this.controller.frontDistance = Number((2.45 + (Math.random() - 0.5) * 0.1).toFixed(2));
    this.controller.rearDistance = Number((4.10 + (Math.random() - 0.5) * 0.1).toFixed(2));
  }
}
