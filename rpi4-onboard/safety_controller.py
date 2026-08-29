"""
PRAHARI Safety Controller & Control Hierarchy Engine
Enforces 4-Tier Control Priority:
  Priority 1: Physical E-Stop / Kill Switch
  Priority 2: Physical RC Remote Override
  Priority 3: Mobile / Web Control
  Priority 4: Autonomous / AI Commands
Monitors: Obstacle Interlock, Overcurrent Trip, Battery Undervoltage, and Heartbeat Watchdog.
"""

import time
from config import (
    GPIO_ESTOP_SENSE, GPIO_LED_STATUS_GREEN, GPIO_LED_STATUS_RED, GPIO_BUZZER_ALARM,
    OBSTACLE_EMERGENCY_STOP_METERS, MAX_MOTOR_CURRENT_AMPS,
    BATTERY_CRITICAL_LOW_VOLTS, COMMAND_HEARTBEAT_TIMEOUT_SEC
)

try:
    import pigpio
    PI_GPIO = pigpio.pi()
    HAS_GPIO = PI_GPIO.connected
except Exception:
    PI_GPIO = None
    HAS_GPIO = False


class SafetyController:
    def __init__(self):
        self.emergency_stop_tripped = False
        self.obstacle_interlock_tripped = False
        self.overcurrent_tripped = False
        self.undervoltage_tripped = False
        self.watchdog_tripped = False
        self.trip_reason = "System Nominal"

        self.last_valid_web_command_time = time.time()
        self.last_overcurrent_time = 0

        self._setup_gpio()
        print(f"[SAFETY] Initialized Safety Interlock Controller (Hardware GPIO: {HAS_GPIO})")

    def _setup_gpio(self):
        if not HAS_GPIO:
            return

        PI_GPIO.set_mode(GPIO_ESTOP_SENSE, pigpio.INPUT)
        PI_GPIO.set_pull_up_down(GPIO_ESTOP_SENSE, pigpio.PUD_UP)

        PI_GPIO.set_mode(GPIO_LED_STATUS_GREEN, pigpio.OUTPUT)
        PI_GPIO.set_mode(GPIO_LED_STATUS_RED, pigpio.OUTPUT)
        PI_GPIO.set_mode(GPIO_BUZZER_ALARM, pigpio.OUTPUT)

        PI_GPIO.write(GPIO_LED_STATUS_GREEN, 1)
        PI_GPIO.write(GPIO_LED_STATUS_RED, 0)
        PI_GPIO.write(GPIO_BUZZER_ALARM, 0)

    def register_web_command(self):
        """
        Pet the web command watchdog.
        """
        self.last_valid_web_command_time = time.time()
        self.watchdog_tripped = False

    def evaluate_safety(self, sensors, rc_state):
        """
        Evaluates all safety constraints in strict priority order.
        Returns (is_safe_to_drive, allowed_mode, message).
        """
        # 1. PRIORITY 1: Physical E-Stop / Kill Switch Sense
        if HAS_GPIO:
            # Active LOW when E-Stop is pressed
            if PI_GPIO.read(GPIO_ESTOP_SENSE) == 0:
                self.emergency_stop_tripped = True
                self.trip_reason = "Physical E-Stop / Kill Switch Engaged"
                self._update_hardware_indicators(is_tripped=True)
                return False, "ESTOP", self.trip_reason

        if self.emergency_stop_tripped:
            self._update_hardware_indicators(is_tripped=True)
            return False, "ESTOP", self.trip_reason

        # 2. Obstacle Distance Interlock (Front Obstacle < 35cm)
        front_dist = sensors.get("front_distance_m", 2.5)
        if front_dist < OBSTACLE_EMERGENCY_STOP_METERS:
            self.obstacle_interlock_tripped = True
            self.trip_reason = f"Obstacle Interlock: Object detected at {front_dist:.2f}m (<{OBSTACLE_EMERGENCY_STOP_METERS}m)"
            self._update_hardware_indicators(is_tripped=True)
            return False, "INTERLOCK", self.trip_reason
        else:
            self.obstacle_interlock_tripped = False

        # 3. Motor Over-Current Protection (>22A)
        i_left = sensors.get("left_motor_current", 0.0)
        i_right = sensors.get("right_motor_current", 0.0)
        if i_left > MAX_MOTOR_CURRENT_AMPS or i_right > MAX_MOTOR_CURRENT_AMPS:
            now = time.time()
            if self.last_overcurrent_time == 0:
                self.last_overcurrent_time = now
            elif now - self.last_overcurrent_time > 0.25: # >250ms sustained
                self.overcurrent_tripped = True
                self.trip_reason = f"Overcurrent Trip: L={i_left:.1f}A, R={i_right:.1f}A (> {MAX_MOTOR_CURRENT_AMPS}A)"
                self._update_hardware_indicators(is_tripped=True)
                return False, "OVERCURRENT", self.trip_reason
        else:
            self.last_overcurrent_time = 0
            self.overcurrent_tripped = False

        # 4. Battery Undervoltage Protection (<31V)
        v_pack = sensors.get("battery_voltage", 36.0)
        if v_pack < BATTERY_CRITICAL_LOW_VOLTS:
            self.undervoltage_tripped = True
            self.trip_reason = f"Critical Battery Undervoltage ({v_pack:.1f}V < {BATTERY_CRITICAL_LOW_VOLTS}V)"
            self._update_hardware_indicators(is_tripped=True)
            return False, "LOW_BATTERY", self.trip_reason
        else:
            self.undervoltage_tripped = False

        # 5. PRIORITY 2: Physical RC Manual Mode Override
        if rc_state.get("rc_connected") and rc_state.get("mode") == "MANUAL_RC":
            self.trip_reason = "Physical RC Remote in Control (Priority 2)"
            self._update_hardware_indicators(is_tripped=False)
            return True, "MANUAL_RC", self.trip_reason

        # 6. PRIORITY 3: Web / Mobile Command Mode
        # Check command watchdog timeout (500ms)
        if (time.time() - self.last_valid_web_command_time) > COMMAND_HEARTBEAT_TIMEOUT_SEC:
            self.watchdog_tripped = True
            # In web mode with timeout, hold position safely
            self._update_hardware_indicators(is_tripped=False)
            return True, "WEB_TIMEOUT", "Web Heartbeat Standby (Braked)"

        self._update_hardware_indicators(is_tripped=False)
        return True, "WEB", "System Nominal (Web Control Active)"

    def manual_estop(self, reason="Manual Operator E-Stop"):
        self.emergency_stop_tripped = True
        self.trip_reason = reason
        self._update_hardware_indicators(is_tripped=True)

    def reset_safety(self):
        self.emergency_stop_tripped = False
        self.obstacle_interlock_tripped = False
        self.overcurrent_tripped = False
        self.undervoltage_tripped = False
        self.watchdog_tripped = False
        self.trip_reason = "System Nominal"
        self._update_hardware_indicators(is_tripped=False)

    def _update_hardware_indicators(self, is_tripped):
        if not HAS_GPIO:
            return
        if is_tripped:
            PI_GPIO.write(GPIO_LED_STATUS_GREEN, 0)
            PI_GPIO.write(GPIO_LED_STATUS_RED, 1)
            PI_GPIO.write(GPIO_BUZZER_ALARM, 1)
        else:
            PI_GPIO.write(GPIO_LED_STATUS_GREEN, 1)
            PI_GPIO.write(GPIO_LED_STATUS_RED, 0)
            PI_GPIO.write(GPIO_BUZZER_ALARM, 0)

    def get_state(self):
        return {
            "emergency_stop": self.emergency_stop_tripped,
            "obstacle_interlock": self.obstacle_interlock_tripped,
            "overcurrent_trip": self.overcurrent_tripped,
            "undervoltage_trip": self.undervoltage_tripped,
            "watchdog_timeout": self.watchdog_tripped,
            "reason": self.trip_reason,
            "state": "TRIPPED" if self.emergency_stop_tripped or self.obstacle_interlock_tripped or self.overcurrent_tripped else "SAFE"
        }
