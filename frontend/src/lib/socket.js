import { io } from 'socket.io-client';

class SocketClient {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect() {
    if (typeof window === 'undefined') return null;
    if (this.socket) return this.socket;

    let defaultUrl = '';
    if (typeof window !== 'undefined') {
      // If running on port 3000 (Next.js default dev port), default socket target to port 4000 (backend)
      if (window.location.port === '3000') {
        defaultUrl = `${window.location.protocol}//${window.location.hostname}:4000`;
      } else {
        defaultUrl = window.location.origin;
      }
    }

    const targetUrl = process.env.NEXT_PUBLIC_SOCKET_URL || defaultUrl;

    this.socket = io(targetUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected to PRAHARI Command Engine, ID:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('[Socket] Disconnected:', reason);
    });

    this.socket.on('connect_error', (err) => {
      console.error('[Socket] Connection Error:', err);
    });

    return this.socket;
  }

  getSocket() {
    if (!this.socket) {
      return this.connect();
    }
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  sendMove(command, speed) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('control:move', { command, speed });
    }
  }

  sendStop() {
    if (this.socket && this.socket.connected) {
      this.socket.emit('control:stop');
    }
  }

  sendEmergencyStop(reason) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('control:estop', { reason });
    }
  }

  sendResetSafety() {
    if (this.socket && this.socket.connected) {
      this.socket.emit('control:reset_safety');
    }
  }

  sendMode(mode) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('control:mode', { mode });
    }
  }
}

export const socketClient = new SocketClient();
