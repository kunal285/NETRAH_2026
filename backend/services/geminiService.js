/**
 * PRAHARI Backend — Gemini AI Gateway Service
 * Manages communication with the dedicated AI Microservice (ai-service).
 * Formats context payloads, handles error fallbacks, and triggers real-time events.
 */

class GeminiService {
  constructor() {
    this.aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    this.timeoutMs = Number(process.env.GEMINI_TIMEOUT_MS || 12000);
    this.debounceCache = new Map(); // key -> { timestamp, response }
    this.cooldownMs = Number(process.env.GEMINI_EVENT_COOLDOWN_SECONDS || 5) * 1000;
  }

  getServiceUrl() {
    return process.env.AI_SERVICE_URL || this.aiServiceUrl;
  }

  async _fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(id);
      return res;
    } catch (err) {
      clearTimeout(id);
      throw err;
    }
  }

  /**
   * Health check for AI Service & Gemini connectivity
   */
  async getHealth() {
    try {
      const res = await this._fetchWithTimeout(`${this.getServiceUrl()}/health`, { method: 'GET' });
      if (res.ok) {
        return await res.json();
      }
      return {
        status: 'degraded',
        service: 'prahari-ai',
        gemini: 'unavailable',
        error: `HTTP ${res.status}`,
      };
    } catch (err) {
      return {
        status: 'offline',
        service: 'prahari-ai',
        gemini: 'disconnected',
        error: err.message,
      };
    }
  }

  /**
   * Trigger structured incident analysis on an event
   */
  async analyzeEvent(eventData, force = false) {
    const eventId = eventData.event_id || eventData.id || `evt_${Date.now()}`;
    const debounceKey = `${eventData.event_type || eventData.type}_${eventData.ambulance_detected || false}_${eventData.plate || ''}`;

    const now = Date.now();
    if (!force && this.debounceCache.has(debounceKey)) {
      const cached = this.debounceCache.get(debounceKey);
      if (now - cached.timestamp < this.cooldownMs) {
        return { ...cached.response, cached: true };
      }
    }

    try {
      const res = await this._fetchWithTimeout(`${this.getServiceUrl()}/api/ai/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      });

      if (!res.ok) {
        throw new Error(`AI service returned status ${res.status}`);
      }

      const result = await res.json();
      this.debounceCache.set(debounceKey, { timestamp: now, response: result });
      return result;
    } catch (err) {
      console.warn(`[GEMINI GATEWAY] Analysis fallback: ${err.message}`);
      return this._generateLocalFallback(eventData);
    }
  }

  /**
   * Interactive Operator Chat Assistant
   */
  async chat(message, history = [], context = {}) {
    try {
      const res = await this._fetchWithTimeout(`${this.getServiceUrl()}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history, context }),
      });

      if (!res.ok) {
        throw new Error(`AI service chat returned status ${res.status}`);
      }

      return await res.json();
    } catch (err) {
      console.warn(`[GEMINI GATEWAY] Chat fallback: ${err.message}`);
      const lower = (message || '').toLowerCase();
      let reply = 'PRAHARI AI Assistant: Connected to local robot telemetry. Control systems and perception feeds are online.';
      if (lower.includes('ambulance')) {
        reply = context.active_ambulance
          ? 'Ambulance is currently detected and active in the corridor.'
          : 'No active ambulance detections in the last 5 minutes.';
      } else if (lower.includes('vehicle') || lower.includes('traffic')) {
        const counts = context.vehicle_counts || {};
        const total = Object.values(counts).reduce((a, b) => a + Number(b), 0) || context.total_vehicles || 0;
        reply = `Current junction traffic count: ${total} vehicles tracked.`;
      }
      return {
        reply,
        requires_operator_attention: false,
        severity: 'low',
        suggested_actions: ['Review Telemetry', 'Check Live Stream', 'Inspect ANPR'],
        latency_ms: 1.0,
        ai_model: 'PRAHARI-Local-Fallback',
      };
    }
  }

  /**
   * Explain a specific detection record
   */
  async explainDetection(detection, telemetry = {}) {
    try {
      const res = await this._fetchWithTimeout(`${this.getServiceUrl()}/api/ai/explain-detection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ detection, telemetry }),
      });

      if (!res.ok) {
        throw new Error(`AI service returned ${res.status}`);
      }

      return await res.json();
    } catch (err) {
      return {
        detection_id: detection.id,
        explanation: `${detection.type || 'Object'} detection (${detection.detectionInfo || detection.plate || 'observed'}) recorded with ${Math.round((detection.confidence || 0.9) * 100)}% confidence.`,
        severity: detection.type === 'AMBULANCE' ? 'high' : 'low',
        confidence_assessment: 'Standard perception model confidence.',
        safety_advisory: 'Verify visual observation on live camera feed.',
        requires_operator_action: detection.type === 'AMBULANCE',
        latency_ms: 1.0,
      };
    }
  }

  /**
   * Analyze robot telemetry (battery, motor currents, distance)
   */
  async analyzeRobotStatus(telemetry) {
    try {
      const res = await this._fetchWithTimeout(`${this.getServiceUrl()}/api/ai/robot-status-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telemetry }),
      });

      if (!res.ok) {
        throw new Error(`AI service returned ${res.status}`);
      }

      return await res.json();
    } catch (err) {
      const bat = Number(telemetry.batteryVoltage || telemetry.battery_voltage || 11.8);
      const isLow = bat < 10.5;
      return {
        status_summary: isLow ? `Battery low (${bat}V). Telemetry nominal otherwise.` : 'Robot hardware metrics within normal operating bounds.',
        health_rating: isLow ? 'WARNING' : 'OPTIMAL',
        warnings: isLow ? [`Battery voltage low: ${bat}V`] : [],
        recommendations: isLow ? ['Return robot to charging bay.'] : ['Continue standard patrol.'],
        requires_maintenance: false,
        latency_ms: 1.0,
      };
    }
  }

  /**
   * Incident window summary
   */
  async getIncidentSummary(minutes = 5, context = {}) {
    try {
      const res = await this._fetchWithTimeout(`${this.getServiceUrl()}/api/ai/incident-summary?minutes=${minutes}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(context),
      });

      if (!res.ok) {
        throw new Error(`AI service returned ${res.status}`);
      }

      return await res.json();
    } catch (err) {
      return {
        window_minutes: minutes,
        total_events_in_window: 0,
        ambulances_in_window: 0,
        high_severity_in_window: 0,
        ai_summary: {
          summary: `Summary of activity in the last ${minutes} minutes. Systems operational.`,
          severity: 'low',
          event_type: 'normal',
          confidence: 0.9,
          recommended_action: 'Maintain monitoring.',
          operator_message: 'Nominal conditions.',
          reasoning_summary: 'Local fallback summary generated.',
          requires_operator_attention: false,
        },
      };
    }
  }

  /**
   * Multimodal snapshot image analysis
   */
  async analyzeImage(image, eventMetadata = {}, existingDetections = []) {
    try {
      const res = await this._fetchWithTimeout(`${this.getServiceUrl()}/api/ai/analyze-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image,
          event_metadata: eventMetadata,
          existing_detections: existingDetections,
        }),
      });

      if (!res.ok) {
        throw new Error(`AI service returned ${res.status}`);
      }

      return await res.json();
    } catch (err) {
      return {
        scene_summary: 'Camera snapshot received. Local AI inference active.',
        objects: existingDetections,
        traffic_condition: 'MODERATE',
        possible_risk: 'None identified',
        requires_attention: false,
        confidence: 0.85,
        latency_ms: 1.0,
      };
    }
  }

  _generateLocalFallback(eventData) {
    const isAmb = Boolean(eventData.ambulance_detected || (eventData.type && eventData.type.toUpperCase() === 'AMBULANCE'));
    return {
      event_id: eventData.event_id || eventData.id || `fallback_${Date.now()}`,
      summary: isAmb ? 'Emergency vehicle detected in monitored area.' : 'Traffic patrol event logged.',
      severity: isAmb ? 'high' : 'low',
      event_type: isAmb ? 'ambulance_detected' : 'vehicle_detected',
      confidence: eventData.confidence || (isAmb ? 0.94 : 0.88),
      recommended_action: isAmb ? 'Prioritize emergency passage and monitor corridor.' : 'Maintain standard monitoring.',
      operator_message: isAmb ? 'Ambulance detected.' : 'Traffic event recorded.',
      reasoning_summary: 'Deterministic safety rules applied in fallback mode.',
      requires_operator_attention: isAmb,
      ai_model: 'PRAHARI-Deterministic-Fallback',
      latency_ms: 1.0,
    };
  }
}

export const geminiService = new GeminiService();
