"""
PRAHARI Motor Controller Module
Controls dual BTS7960 H-bridges for MY1016 brushed DC motors with soft-start acceleration ramp.
"""

import time
import threading
from config import (
    GPIO_LEFT_RPWM, GPIO_LEFT_LPWM, GPIO_LEFT_R_EN, GPIO_LEFT_L_EN,
    GPIO_RIGHT_RPWM, GPIO_RIGHT_LPWM, GPIO_RIGHT_R_EN, GPIO_RIGHT_L_EN,
    PWM_FREQUENCY_HZ, MAX_PWM_VALUE, MIN_MOTOR_DEADZONE,
    ACCEL_RAMP_STEP, RAMP_INTERVAL_MS
)

try:
    import pigpio
    PI_GPIO = pigpio.pi()
    HAS_HARDWARE_GPIO = PI_GPIO.connected
except Exception:
    PI_GPIO = None
    HAS_HARDWARE_GPIO = False


class MotorController:
    def __init__(self):
        self.is_hardware = HAS_HARDWARE_GPIO
        self.left_target_pwm = 0
        self.right_target_pwm = 0
        self.left_current_pwm = 0
        self.right_current_pwm = 0
        self.running = True
        self.lock = threading.Lock()

        self._setup_gpio()

        # Start soft-start ramp loop
        self.ramp_thread = threading.Thread(target=self._ramp_loop, daemon=True)
        self.ramp_thread.start()
        print(f"[MOTOR] Initialized BTS7960 Controller (Hardware GPIO: {self.is_hardware})")

    def _setup_gpio(self):
        if not self.is_hardware:
            return

        pins = [
            GPIO_LEFT_RPWM, GPIO_LEFT_LPWM, GPIO_LEFT_R_EN, GPIO_LEFT_L_EN,
            GPIO_RIGHT_RPWM, GPIO_RIGHT_LPWM, GPIO_RIGHT_R_EN, GPIO_RIGHT_L_EN
        ]
        for pin in pins:
            PI_GPIO.set_mode(pin, pigpio.OUTPUT)
            PI_GPIO.write(pin, 0)

        # Set PWM frequency (1000 Hz)
        PI_GPIO.set_PWM_frequency(GPIO_LEFT_RPWM, PWM_FREQUENCY_HZ)
        PI_GPIO.set_PWM_frequency(GPIO_LEFT_LPWM, PWM_FREQUENCY_HZ)
        PI_GPIO.set_PWM_frequency(GPIO_RIGHT_RPWM, PWM_FREQUENCY_HZ)
        PI_GPIO.set_PWM_frequency(GPIO_RIGHT_LPWM, PWM_FREQUENCY_HZ)

        # Set PWM range to 255
        PI_GPIO.set_PWM_range(GPIO_LEFT_RPWM, 255)
        PI_GPIO.set_PWM_range(GPIO_LEFT_LPWM, 255)
        PI_GPIO.set_PWM_range(GPIO_RIGHT_RPWM, 255)
        PI_GPIO.set_PWM_range(GPIO_RIGHT_LPWM, 255)

        # Enable H-bridge logic
        PI_GPIO.write(GPIO_LEFT_R_EN, 1)
        PI_GPIO.write(GPIO_LEFT_L_EN, 1)
        PI_GPIO.write(GPIO_RIGHT_R_EN, 1)
        PI_GPIO.write(GPIO_RIGHT_L_EN, 1)

    def set_drive(self, left_pwm, right_pwm):
        """
        Sets target PWM for left and right motors (-255 to +255).
        Positive = Forward, Negative = Reverse.
        """
        with self.lock:
            self.left_target_pwm = max(-MAX_PWM_VALUE, min(MAX_PWM_VALUE, int(left_pwm)))
            self.right_target_pwm = max(-MAX_PWM_VALUE, min(MAX_PWM_VALUE, int(right_pwm)))

    def drive_command(self, command, speed=50):
        """
        Translates directional commands to differential PWM values.
        """
        pwm_val = int((speed / 100.0) * MAX_PWM_VALUE)

        if command == "FORWARD":
            self.set_drive(pwm_val, pwm_val)
        elif command == "REVERSE":
            self.set_drive(-pwm_val, -pwm_val)
        elif command == "LEFT":
            # Turn in place: Left reverse, Right forward
            self.set_drive(-int(pwm_val * 0.75), int(pwm_val * 0.75))
        elif command == "RIGHT":
            # Turn in place: Left forward, Right reverse
            self.set_drive(int(pwm_val * 0.75), -int(pwm_val * 0.75))
        elif command in ["STOP", "BRAKE"]:
            self.stop()
        else:
            self.stop()

    def stop(self):
        """
        Brings target PWM to 0.
        """
        with self.lock:
            self.left_target_pwm = 0
            self.right_target_pwm = 0

    def emergency_stop(self):
        """
        Instant hard stop bypassing acceleration ramp for emergency situations.
        """
        with self.lock:
            self.left_target_pwm = 0
            self.right_target_pwm = 0
            self.left_current_pwm = 0
            self.right_current_pwm = 0
            self._write_hw_pwm(0, 0)

    def _ramp_loop(self):
        """
        Smooth acceleration and deceleration ramp loop.
        Prevents motor stall current surges and gearbox wear.
        """
        while self.running:
            with self.lock:
                # Left Motor Ramp
                if self.left_current_pwm < self.left_target_pwm:
                    self.left_current_pwm = min(self.left_target_pwm, self.left_current_pwm + ACCEL_RAMP_STEP)
                elif self.left_current_pwm > self.left_target_pwm:
                    self.left_current_pwm = max(self.left_target_pwm, self.left_current_pwm - ACCEL_RAMP_STEP)

                # Right Motor Ramp
                if self.right_current_pwm < self.right_target_pwm:
                    self.right_current_pwm = min(self.right_target_pwm, self.right_current_pwm + ACCEL_RAMP_STEP)
                elif self.right_current_pwm > self.right_target_pwm:
                    self.right_current_pwm = max(self.right_target_pwm, self.right_current_pwm - ACCEL_RAMP_STEP)

                # Apply to hardware
                self._write_hw_pwm(self.left_current_pwm, self.right_current_pwm)

            time.sleep(RAMP_INTERVAL_MS / 1000.0)

    def _write_hw_pwm(self, left_pwm, right_pwm):
        if not self.is_hardware:
            return

        # LEFT MOTOR BTS7960
        if left_pwm > MIN_MOTOR_DEADZONE:
            PI_GPIO.set_PWM_dutycycle(GPIO_LEFT_RPWM, int(left_pwm))
            PI_GPIO.set_PWM_dutycycle(GPIO_LEFT_LPWM, 0)
        elif left_pwm < -MIN_MOTOR_DEADZONE:
            PI_GPIO.set_PWM_dutycycle(GPIO_LEFT_RPWM, 0)
            PI_GPIO.set_PWM_dutycycle(GPIO_LEFT_LPWM, int(abs(left_pwm)))
        else:
            # Dynamic Braking (Both PWM 0 with Enables High)
            PI_GPIO.set_PWM_dutycycle(GPIO_LEFT_RPWM, 0)
            PI_GPIO.set_PWM_dutycycle(GPIO_LEFT_LPWM, 0)

        # RIGHT MOTOR BTS7960
        if right_pwm > MIN_MOTOR_DEADZONE:
            PI_GPIO.set_PWM_dutycycle(GPIO_RIGHT_RPWM, int(right_pwm))
            PI_GPIO.set_PWM_dutycycle(GPIO_RIGHT_LPWM, 0)
        elif right_pwm < -MIN_MOTOR_DEADZONE:
            PI_GPIO.set_PWM_dutycycle(GPIO_RIGHT_RPWM, 0)
            PI_GPIO.set_PWM_dutycycle(GPIO_RIGHT_LPWM, int(abs(right_pwm)))
        else:
            PI_GPIO.set_PWM_dutycycle(GPIO_RIGHT_RPWM, 0)
            PI_GPIO.set_PWM_dutycycle(GPIO_RIGHT_LPWM, 0)

    def get_state(self):
        return {
            "left_pwm": self.left_current_pwm,
            "right_pwm": self.right_current_pwm,
            "left_target": self.left_target_pwm,
            "right_target": self.right_target_pwm,
            "status": "RUNNING" if (abs(self.left_current_pwm) > 0 or abs(self.right_current_pwm) > 0) else "IDLE"
        }

    def cleanup(self):
        self.running = False
        self.emergency_stop()
        if self.is_hardware:
            PI_GPIO.stop()
