"""
PRAHARI Physical RC Remote Controller Module
Decodes standard PWM/PPM RC receiver channels (CH1 Steering, CH2 Throttle, CH6 Mode Selection).
Enforces physical RC priority and signal timeout failsafe.
"""

import time
import threading
from config import (
    GPIO_RC_CH1_STEERING, GPIO_RC_CH2_THROTTLE, GPIO_RC_CH6_MODE
)

try:
    import pigpio
    PI_GPIO = pigpio.pi()
    HAS_HARDWARE = PI_GPIO.connected
except Exception:
    PI_GPIO = None
    HAS_HARDWARE = False


class RCController:
    def __init__(self):
        self.is_hardware = HAS_HARDWARE
        self.ch1_pulse_us = 1500  # Steering (1000=Full Left, 1500=Center, 2000=Full Right)
        self.ch2_pulse_us = 1500  # Throttle (1000=Full Reverse, 1500=Neutral, 2000=Full Forward)
        self.ch6_pulse_us = 1000  # Mode Switch (1000=MANUAL_RC, 1500=WEB, 2000=AUTONOMOUS)

        self.last_signal_time = 0
        self.is_connected = False
        self.active_mode = "WEB"  # Default mode if no RC attached

        self._ch1_tick = 0
        self._ch2_tick = 0
        self._ch6_tick = 0

        self._setup_callbacks()
        print(f"[RC] Initialized Physical RC Receiver Subsystem (Hardware: {self.is_hardware})")

    def _setup_callbacks(self):
        if not self.is_hardware:
            return

        PI_GPIO.set_mode(GPIO_RC_CH1_STEERING, pigpio.INPUT)
        PI_GPIO.set_mode(GPIO_RC_CH2_THROTTLE, pigpio.INPUT)
        PI_GPIO.set_mode(GPIO_RC_CH6_MODE, pigpio.INPUT)

        PI_GPIO.set_pull_up_down(GPIO_RC_CH1_STEERING, pigpio.PUD_DOWN)
        PI_GPIO.set_pull_up_down(GPIO_RC_CH2_THROTTLE, pigpio.PUD_DOWN)
        PI_GPIO.set_pull_up_down(GPIO_RC_CH6_MODE, pigpio.PUD_DOWN)

        PI_GPIO.callback(GPIO_RC_CH1_STEERING, pigpio.EITHER_EDGE, self._cbf_ch1)
        PI_GPIO.callback(GPIO_RC_CH2_THROTTLE, pigpio.EITHER_EDGE, self._cbf_ch2)
        PI_GPIO.callback(GPIO_RC_CH6_MODE, pigpio.EITHER_EDGE, self._cbf_ch6)

    def _cbf_ch1(self, gpio, level, tick):
        if level == 1:
            self._ch1_tick = tick
        elif level == 0:
            if self._ch1_tick != 0:
                width = pigpio.tickDiff(self._ch1_tick, tick)
                if 800 <= width <= 2200:
                    self.ch1_pulse_us = width
                    self.last_signal_time = time.time()

    def _cbf_ch2(self, gpio, level, tick):
        if level == 1:
            self._ch2_tick = tick
        elif level == 0:
            if self._ch2_tick != 0:
                width = pigpio.tickDiff(self._ch2_tick, tick)
                if 800 <= width <= 2200:
                    self.ch2_pulse_us = width
                    self.last_signal_time = time.time()

    def _cbf_ch6(self, gpio, level, tick):
        if level == 1:
            self._ch6_tick = tick
        elif level == 0:
            if self._ch6_tick != 0:
                width = pigpio.tickDiff(self._ch6_tick, tick)
                if 800 <= width <= 2200:
                    self.ch6_pulse_us = width
                    self.last_signal_time = time.time()

    def update(self):
        """
        Evaluates RC link health and current 3-position mode switch.
        """
        # RC Signal Timeout (0.3s)
        if (time.time() - self.last_signal_time) < 0.3:
            self.is_connected = True
        else:
            self.is_connected = False

        if self.is_connected:
            # 3-Position Mode Switch on CH6:
            # Pos 1: <1300us -> MANUAL_RC
            # Pos 2: 1300-1700us -> WEB
            # Pos 3: >1700us -> AUTONOMOUS
            if self.ch6_pulse_us < 1300:
                self.active_mode = "MANUAL_RC"
            elif self.ch6_pulse_us > 1700:
                self.active_mode = "AUTONOMOUS"
            else:
                self.active_mode = "WEB"
        else:
            # When RC is not physically transmitting, maintain WEB control mode
            if self.active_mode == "MANUAL_RC":
                self.active_mode = "WEB"

    def get_drive_command(self):
        """
        Maps CH1 (Steering) and CH2 (Throttle) to differential Left/Right PWM (-255 to +255).
        """
        if not self.is_connected or self.active_mode != "MANUAL_RC":
            return 0, 0

        # Normalize 1000-2000us to -1.0 to +1.0
        throttle = (self.ch2_pulse_us - 1500) / 500.0  # -1.0 (rev) to +1.0 (fwd)
        steering = (self.ch1_pulse_us - 1500) / 500.0  # -1.0 (left) to +1.0 (right)

        # Apply deadzone
        if abs(throttle) < 0.08:
            throttle = 0.0
        if abs(steering) < 0.08:
            steering = 0.0

        # Differential mixing
        left = (throttle + steering) * 255.0
        right = (throttle - steering) * 255.0

        # Clamp to [-255, 255]
        left_pwm = max(-255, min(255, int(left)))
        right_pwm = max(-255, min(255, int(right)))

        return left_pwm, right_pwm

    def get_state(self):
        self.update()
        return {
            "rc_connected": self.is_connected,
            "mode": self.active_mode,
            "ch1_steering_us": self.ch1_pulse_us,
            "ch2_throttle_us": self.ch2_pulse_us,
            "ch6_mode_us": self.ch6_pulse_us,
        }
