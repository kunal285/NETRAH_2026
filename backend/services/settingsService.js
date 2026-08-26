/**
 * SettingsService
 * Manages runtime configuration for PRAHARI Robot, including speed limits,
 * obstacle safety thresholds, battery cutoff voltages, and telemetry timings.
 */
class SettingsService {
  constructor() {
    this.settings = {
      defaultSpeed: 50,
      maxSpeed: 90,
      emergencyStopDistance: 0.35, // 35 cm obstacle stop
      obstacleWarningDistance: 0.80, // 80 cm obstacle warn
      maxMotorCurrent: 22.0, // 22A BTS7960 trip
      criticalBatteryVoltage: 31.0, // 31.0V critical cutoff for 36V pack
      telemetryIntervalMs: 200, // 5Hz telemetry cycle
      cameraFps: 30,
      enableAnpr: true,
      enableAmbulanceAlert: true,
      hardwarePort: '/dev/ttyUSB0',
      hardwareBaudRate: 115200,
    };
  }

  getSettings() {
    return { ...this.settings };
  }

  updateSettings(partial) {
    this.settings = {
      ...this.settings,
      ...partial,
    };
    return { ...this.settings };
  }

  resetDefaults() {
    this.settings = {
      defaultSpeed: 50,
      maxSpeed: 90,
      emergencyStopDistance: 0.35,
      obstacleWarningDistance: 0.80,
      maxMotorCurrent: 22.0,
      criticalBatteryVoltage: 31.0,
      telemetryIntervalMs: 200,
      cameraFps: 30,
      enableAnpr: true,
      enableAmbulanceAlert: true,
      hardwarePort: '/dev/ttyUSB0',
      hardwareBaudRate: 115200,
    };
    return { ...this.settings };
  }
}

export const settingsService = new SettingsService();
