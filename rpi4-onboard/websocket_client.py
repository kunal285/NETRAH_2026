"""
PRAHARI WebSocket / Socket.IO Client for Raspberry Pi 4
Connects directly to the Command Center Node.js backend to receive drive commands and stream 10Hz telemetry.
"""

import time
import threading
import socketio
from config import BACKEND_WS_URL, ROBOT_ID, DEVICE_SECRET_TOKEN


class RobotWebSocketClient:
    def __init__(self, command_callback, estop_callback, reset_callback, mode_callback):
        self.sio = socketio.Client(reconnection=True, reconnection_attempts=0, reconnection_delay=2)
        self.connected = False
        self.robot_id = ROBOT_ID
        self.command_callback = command_callback
        self.estop_callback = estop_callback
        self.reset_callback = reset_callback
        self.mode_callback = mode_callback

        self._setup_handlers()

    def _setup_handlers(self):
        @self.sio.event
        def connect():
            self.connected = True
            print(f"[WS] Connected to Command Center Backend at {BACKEND_WS_URL}")
            # Register device presence
            self.sio.emit("device:heartbeat", {
                "robotId": self.robot_id,
                "token": DEVICE_SECRET_TOKEN,
                "firmwareVersion": "v2.5.0-RPI4-ARM64-PIGPIO",
                "timestamp": time.time()
            })

        @self.sio.event
        def disconnect():
            self.connected = False
            print("[WS] Disconnected from Command Center Backend. Retrying...")

        @self.sio.on("device:command_out")
        def on_command(data):
            target_id = data.get("robotId", "")
            if target_id and target_id.upper() != self.robot_id.upper():
                return
            cmd = data.get("command", "STOP")
            speed = data.get("speed", 50)
            self.command_callback(cmd, speed)

        @self.sio.on("control:move")
        def on_move(data):
            target_id = data.get("robotId", "")
            if target_id and target_id.upper() != self.robot_id.upper():
                return
            cmd = data.get("command", "STOP")
            speed = data.get("speed", 50)
            self.command_callback(cmd, speed)

        @self.sio.on("control:estop")
        def on_estop(data):
            reason = data.get("reason", "Remote Web E-Stop Triggered")
            self.estop_callback(reason)

        @self.sio.on("control:reset_safety")
        def on_reset(data):
            self.reset_callback()

        @self.sio.on("control:mode")
        def on_mode(data):
            mode = data.get("mode", "WEB")
            self.mode_callback(mode)

    def start(self):
        def _connect_loop():
            while True:
                try:
                    if not self.connected:
                        self.sio.connect(BACKEND_WS_URL, transports=["websocket", "polling"])
                        self.sio.wait()
                except Exception as e:
                    time.sleep(3)

        thread = threading.Thread(target=_connect_loop, daemon=True)
        thread.start()

    def send_telemetry(self, telemetry_payload):
        if self.connected:
            try:
                self.sio.emit("device:telemetry", telemetry_payload)
            except Exception:
                pass

    def stop(self):
        if self.connected:
            try:
                self.sio.disconnect()
            except Exception:
                pass
