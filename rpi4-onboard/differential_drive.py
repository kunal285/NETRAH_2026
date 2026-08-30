"""
PRAHARI Differential Drive Mixing Engine
Calculates independent Left and Right motor outputs from throttle and steering inputs.

Physical Configuration:
- 1 x LEFT rear powered wheel (MY1016 DC motor + BTS7960)
- 1 x RIGHT rear powered wheel (MY1016 DC motor + BTS7960)
- Front wheels: PASSIVE CASTER WHEELS (No steering actuator, no servo, no front motor)
"""

def clamp(val, min_val=-1.0, max_val=1.0):
    return max(min_val, min(max_val, val))

class DifferentialDrive:
    def __init__(self, deadzone=0.08, max_speed_percent=90):
        self.deadzone = deadzone
        self.max_speed_percent = max_speed_percent

    def compute_motors(self, throttle, steering, speed_limit_percent=None):
        """
        Takes normalized throttle (-1.0 to +1.0) and steering (-1.0 to +1.0).
        Returns normalized left_motor (-1.0 to +1.0) and right_motor (-1.0 to +1.0),
        along with PWM values (-255 to +255) and percentage (-100 to +100).
        """
        # Apply deadzone filtering
        if abs(throttle) < self.deadzone:
            throttle = 0.0
        if abs(steering) < self.deadzone:
            steering = 0.0

        if throttle == 0.0 and steering == 0.0:
            return {
                "left_normalized": 0.0,
                "right_normalized": 0.0,
                "left_percent": 0.0,
                "right_percent": 0.0,
                "left_pwm": 0,
                "right_pwm": 0,
            }

        # Differential Drive Mixing
        # left = throttle + steering
        # right = throttle - steering
        raw_left = throttle + steering
        raw_right = throttle - steering

        # Clamp between -1.0 and +1.0
        left_normalized = clamp(raw_left, -1.0, 1.0)
        right_normalized = clamp(raw_right, -1.0, 1.0)

        # Scale by governed speed limit
        governed_limit = speed_limit_percent if speed_limit_percent is not None else self.max_speed_percent
        scale_factor = clamp(governed_limit / 100.0, 0.1, 1.0)

        left_percent = left_normalized * scale_factor * 100.0
        right_percent = right_normalized * scale_factor * 100.0

        # Convert to 8-bit PWM (-255 to +255)
        left_pwm = int(left_normalized * scale_factor * 255.0)
        right_pwm = int(right_normalized * scale_factor * 255.0)

        return {
            "left_normalized": left_normalized,
            "right_normalized": right_normalized,
            "left_percent": left_percent,
            "right_percent": right_percent,
            "left_pwm": left_pwm,
            "right_pwm": right_pwm,
        }
