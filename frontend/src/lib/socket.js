import { io } from 'socket.io-client';

class SocketClient {
  constructor() {
    this.socket = null;
    this.latencyMs = 0;
    this.pingInterval = null;
    this.listeners = new Map();
  }

  connect() {
    if (typeof window === 'undefined') return null;
    if (this.socket) return this.socket;

    let defaultUrl = '';
    if (typeof window !== 'undefined') {
      if (window.location.port === '3000') {
        defaultUrl = `${window.location.protocol}//${window.location.hostname}:4000`;
      } else {
        defaultUrl = window.location.origin;
      }
    }

    const targetUrl = process.env.NEXT_PUBLIC_SOCKET_URL || defaultUrl;

    this.socket = io(targetUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      randomizationFactor: 0.2,
      timeout: 5000,
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected to PRAHARI Command Engine, ID:', this.socket?.id);
      this._startLatencyCheck();
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('[Socket] Disconnected:', reason);
      this._stopLatencyCheck();
    });

    this.socket.on('connect_error', (err) => {
      console.error('[Socket] Connection Error:', err.message);
    });

    return this.socket;
  }

  _startLatencyCheck() {
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.pingInterval = setInterval(() => {
      if (this.socket && this.socket.connected) {
        const start = Date.now();
        this.socket.emit('system:ping', () => {
          this.latencyMs = Math.max(1, Date.now() - start);
          if (this.onLatencyChange) this.onLatencyChange(this.latencyMs);
        });
      }
    }, 2000);
  }

  _stopLatencyCheck() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  getSocket() {
    if (!this.socket) {
      return this.connect();
    }
    return this.socket;
  }

  disconnect() {
    this._stopLatencyCheck();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  sendDriveVector(throttle, steering, speed = 70, robotId = 'PRAHARI-01') {
    if (this.socket && this.socket.connected) {
      this.socket.emit('control:drive_vector', {
        robotId,
        source: 'web',
        throttle: Number(throttle),
        steering: Number(steering),
        speed: Number(speed),
        timestamp: Date.now(),
      });
    }
  }

  sendMove(command, speed = 50, robotId = 'PRAHARI-01') {
    if (this.socket && this.socket.connected) {
      this.socket.emit('control:move', {
        robotId,
        command,
        speed: Number(speed),
        timestamp: Date.now(),
      });
    }
  }

  sendStop(robotId = 'PRAHARI-01') {
    if (this.socket && this.socket.connected) {
      this.socket.emit('control:stop', {
        robotId,
        source: 'web',
        timestamp: Date.now(),
      });
    }
  }

  sendEmergencyStop(reason = 'Operator E-Stop', robotId = 'PRAHARI-01') {
    if (this.socket && this.socket.connected) {
      this.socket.emit('control:estop', {
        robotId,
        reason,
        timestamp: Date.now(),
      });
    }
  }

  sendResetSafety(robotId = 'PRAHARI-01') {
    if (this.socket && this.socket.connected) {
      this.socket.emit('control:reset_safety', {
        robotId,
        timestamp: Date.now(),
      });
    }
  }

  sendMode(mode, robotId = 'PRAHARI-01') {
    if (this.socket && this.socket.connected) {
      this.socket.emit('control:mode', {
        robotId,
        mode,
        timestamp: Date.now(),
      });
    }
  }
}

export const socketClient = new SocketClient();
