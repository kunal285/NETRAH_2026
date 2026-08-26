import { io } from 'socket.io-client';

class SocketClient {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect() {
    if (typeof window === 'undefined') return null;
    if (this.socket) return this.socket;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;

    this.socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin, {
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
