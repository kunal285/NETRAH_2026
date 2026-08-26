/**
 * API Client for PRAHARI Command Engine REST Endpoints
 */

const API_BASE = '/api';

export const api = {
  // Robot Core
  async getRobotState() {
    const res = await fetch(`${API_BASE}/robot/state`);
    if (!res.ok) throw new Error('Failed to fetch robot state');
    return res.json();
  },

  async setMode(mode) {
    const res = await fetch(`${API_BASE}/robot/mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    });
    if (!res.ok) throw new Error('Failed to set robot mode');
    return res.json();
  },

  async sendControl(command, speed) {
    const res = await fetch(`${API_BASE}/robot/control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command, speed }),
    });
    if (!res.ok) throw new Error('Failed to send control command');
    return res.json();
  },

  async emergencyStop(reason) {
    const res = await fetch(`${API_BASE}/robot/emergency-stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) throw new Error('Failed to execute emergency stop');
    return res.json();
  },

  async resetSafety() {
    const res = await fetch(`${API_BASE}/robot/reset-safety`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to reset safety interlocks');
    return res.json();
  },

  // Safety & Events
  async getSafetyEvents() {
    const res = await fetch(`${API_BASE}/safety/events`);
    if (!res.ok) throw new Error('Failed to fetch safety events');
    return res.json();
  },

  async clearSystemEvents() {
    const res = await fetch(`${API_BASE}/safety/events`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to clear safety events');
    return res.json();
  },

  // Simulator Scenario
  async triggerSimulatorScenario(scenario) {
    const res = await fetch(`${API_BASE}/simulator/scenario`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario }),
    });
    if (!res.ok) throw new Error('Failed to trigger scenario');
    return res.json();
  },

  // AI Perception
  async getDetectionsLog(params = {}) {
    const query = new URLSearchParams();
    if (params.type) query.append('type', params.type);
    if (params.search) query.append('search', params.search);
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());
    if (params.sortBy) query.append('sortBy', params.sortBy);

    const res = await fetch(`${API_BASE}/detections?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch detections');
    return res.json();
  },

  async clearDetectionsLog() {
    const res = await fetch(`${API_BASE}/detections`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to clear detections');
    return res.json();
  },

  async triggerAIDetection(type) {
    const res = await fetch(`${API_BASE}/ai/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    });
    if (!res.ok) throw new Error('Failed to trigger AI detection');
    return res.json();
  },

  async acknowledgeAmbulance() {
    const res = await fetch(`${API_BASE}/ai/acknowledge-ambulance`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to acknowledge ambulance');
    return res.json();
  },

  async getActiveAmbulance() {
    const res = await fetch(`${API_BASE}/ai/ambulance`);
    if (!res.ok) throw new Error('Failed to fetch ambulance state');
    return res.json();
  },

  // Settings & Parameters
  async getSettings() {
    const res = await fetch(`${API_BASE}/settings`);
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },

  async updateSettings(settings) {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (!res.ok) throw new Error('Failed to update settings');
    return res.json();
  },

  async resetSettings() {
    const res = await fetch(`${API_BASE}/settings/reset`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to reset settings');
    return res.json();
  },

  // Health
  async getHealth() {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Failed to check server health');
    return res.json();
  },

  async getCameraSources() {
    const res = await fetch(`${API_BASE}/camera`);
    if (!res.ok) throw new Error('Failed to fetch camera sources');
    return res.json();
  },

  async uploadCapturedImage(blob, metadata = {}) {
    const formData = new FormData();
    formData.append('image', blob, `prahari-capture-${Date.now()}.jpg`);
    Object.entries({ imageType: 'detection evidence', cameraSource: 'device', isDemo: false, ...metadata }).forEach(([key, value]) => formData.append(key, String(value)));
    const res = await fetch(`${API_BASE}/images/upload`, { method: 'POST', body: formData });
    if (!res.ok) throw new Error('Failed to save captured image');
    return res.json();
  },
};
