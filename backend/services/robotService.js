import { mockRobot } from '../simulator/mockRobot.js';

/**
 * RobotService
 * High-level orchestration for PRAHARI Robot telemetry and motion commands.
 * Handles both simulator layer and future ESP32 serial/ESP-NOW hardware layers.
 */
class RobotService {
  constructor() {
    this.adapter = mockRobot;
  }

  getAdapter() {
    return this.adapter;
  }

  getState() {
    return this.adapter.getState();
  }

  setMode(mode) {
    this.adapter.setMode(mode);
    return this.getState();
  }

  sendControl(command, speed, vector = null) {
    return this.adapter.setMovement(command, speed, vector);
  }

  stop() {
    return this.adapter.stop();
  }

  emergencyStop(reason) {
    return this.adapter.emergencyStop(reason);
  }

  resetSafety() {
    return this.adapter.resetSafety();
  }
}

export const robotService = new RobotService();
