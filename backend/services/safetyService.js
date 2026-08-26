import { mockRobot } from '../simulator/mockRobot.js';

/**
 * SafetyService
 * Real-time monitoring and event dispatch for safety interlocks, obstacle alerts,
 * and emergency system stops.
 */
class SafetyService {
  constructor() {
    this.events = [];
    this.maxEvents = 100;

    // Listen to events emitted by mock robot hardware/simulator
    mockRobot.on('event', (evt) => {
      this.recordEvent(evt);
    });

    // Seed initial startup event
    this.recordEvent({
      id: `evt-${Date.now()}`,
      timestamp: new Date().toISOString(),
      level: 'info',
      title: 'Safety Interlocks Armed',
      description: 'Ultrasonic front radar, BTS7960 current limits & 36V battery monitors active.',
    });
  }

  recordEvent(evt) {
    this.events.unshift(evt);
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(0, this.maxEvents);
    }
  }

  getEvents(limit = 50) {
    return this.events.slice(0, limit);
  }

  clearEvents() {
    this.events = [];
    return { success: true };
  }

  triggerEmergencyStop(reason = 'Manual UI Trigger') {
    return mockRobot.emergencyStop(reason);
  }

  resetSafety() {
    return mockRobot.resetSafety();
  }

  triggerScenario(type) {
    mockRobot.triggerScenario(type);
    return { success: true, scenario: type };
  }
}

export const safetyService = new SafetyService();
