"""
PRAHARI Main Robot Controller Core
Integrates Motors, RC Receiver, Sensors, Safety Interlocks, Telemetry, and WebSocket Client.
"""

import time
import threading
from motor_controller import MotorController
from rc_controller import RCController
from differential_drive import DifferentialDrive
from sensor_manager import SensorManager
from safety_controller import SafetyController
from telemetry import TelemetryAggregator
from websocket_client import RobotWebSocketClient
from camera_manager import CameraManager
from config import TELEMETRY_INTERVAL_SEC


class RobotController:
    def __init__(self):
        print("==================================================")
        print("  STARTING PRAHARI RASPBERRY PI 4 ONBOARD SYSTEM  ")
        print("==================================================")

        self.motors = MotorController()
        self.rc = RCController()
        self.diff_drive = DifferentialDrive()
        self.sensors = SensorManager()
        self.safety = SafetyController()
        self.telemetry = TelemetryAggregator()
        self.camera = CameraManager()

        self.active_mode = "WEB"  # MANUAL_RC | WEB | AUTONOMOUS
        self.web_target_command = "STOP"
        self.web_target_speed = 50
        self.web_vector = None
        self.running = True

        # Initialize WebSocket Client
        self.ws_client = RobotWebSocketClient(
            command_callback=self._handle_web_command,
            estop_callback=self._handle_web_estop,
            reset_callback=self._handle_web_reset_safety,
            mode_callback=self._handle_web_mode_change
        )
        self.ws_client.start()

        # Start primary 50Hz control loop
        self.control_thread = threading.Thread(target=self._control_loop, daemon=True)
        self.control_thread.start()

        # Start 10Hz telemetry publication loop
        self.telemetry_thread = threading.Thread(target=self._telemetry_loop, daemon=True)
        self.telemetry_thread.start()

    def _handle_web_command(self, command, speed, vector=None):
        self.safety.register_web_command()
        self.web_target_command = command.upper()
        self.web_target_speed = max(0, min(100, int(speed)))
        self.web_vector = vector

    def _handle_web_estop(self, reason):
        self.safety.manual_estop(reason)
        self.motors.emergency_stop()

    def _handle_web_reset_safety(self):
        self.safety.reset_safety()

    def _handle_web_mode_change(self, mode):
        # Only allow web to set mode if RC is not actively forcing MANUAL_RC (Priority 2)
        rc_state = self.rc.get_state()
        if not (rc_state.get("rc_connected") and rc_state.get("mode") == "MANUAL_RC"):
            self.active_mode = mode.upper()
            print(f"[MODE] Mode switched to {self.active_mode}")

    def _control_loop(self):
        """
        Primary 50Hz Control Arbitration Loop.
        Enforces Strict 4-Tier Priority:
          1. E-Stop / Kill Switch
          2. Physical RC Remote
          3. Web / Mobile Control
          4. Autonomous / AI
        """
        while self.running:
            sensor_data = self.sensors.get_readings()
            rc_state = self.rc.get_state()

            # 1. Evaluate safety constraints
            is_safe, safety_mode, message = self.safety.evaluate_safety(sensor_data, rc_state)

            if not is_safe:
                # Interlock or E-Stop Tripped -> Motors hard stopped
                self.motors.emergency_stop()
            else:
                # 2. Control Hierarchy Arbitration
                if safety_mode == "MANUAL_RC":
                    # Priority 2: Physical RC Remote
                    self.active_mode = "MANUAL_RC"
                    left_pwm, right_pwm = self.rc.get_drive_command()
                    self.motors.set_drive(left_pwm, right_pwm)

                elif self.active_mode == "WEB":
                    # Priority 3: Mobile / Web Control
                    if safety_mode == "WEB_TIMEOUT":
                        # Heartbeat watchdog timed out -> safely brake
                        self.motors.stop()
                    elif self.web_target_command == "DRIVE_VECTOR" and self.web_vector:
                        throttle = self.web_vector.get("throttle", 0.0)
                        steering = self.web_vector.get("steering", 0.0)
                        calc = self.diff_drive.compute_motors(throttle, steering, self.web_target_speed)
                        self.motors.set_drive(calc["left_pwm"], calc["right_pwm"])
                    else:
                        self.motors.drive_command(self.web_target_command, self.web_target_speed)

                elif self.active_mode == "AUTONOMOUS":
                    # Priority 4: Autonomous / AI Corridor Follower
                    self.motors.drive_command(self.web_target_command, self.web_target_speed)
                else:
                    self.motors.stop()

            time.sleep(0.020) # 50Hz loop rate

    def _telemetry_loop(self):
        """
        10Hz Real-Time Telemetry Stream to Command Center.
        """
        while self.running:
            sensor_data = self.sensors.get_readings()
            motor_state = self.motors.get_state()
            rc_state = self.rc.get_state()
            safety_state = self.safety.get_state()

            payload = self.telemetry.compile(
                sensor_readings=sensor_data,
                motor_state=motor_state,
                rc_state=rc_state,
                safety_state=safety_state,
                current_mode=self.active_mode,
                ws_connected=self.ws_client.connected
            )

            self.ws_client.send_telemetry(payload)
            time.sleep(TELEMETRY_INTERVAL_SEC)

    def shutdown(self):
        print("[SYSTEM] Shutting down PRAHARI onboard controller...")
        self.running = False
        self.motors.cleanup()
        self.sensors.cleanup()
        self.camera.cleanup()
        self.ws_client.stop()
