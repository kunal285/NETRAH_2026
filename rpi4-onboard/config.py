"""
PRAHARI Raspberry Pi 4 Onboard Controller Configuration
Pin-to-Pin Mapping, Safety Thresholds & Network Configuration
"""

import os

# ==============================================================================
# 1. RASPBERRY PI 4 40-PIN GPIO ASSIGNMENTS
# ==============================================================================

# LEFT MOTOR BTS7960 DRIVER
# Dual high-current half-bridge module
GPIO_LEFT_RPWM = 12   # Physical Pin 32 (Hardware PWM0) - Forward PWM Speed
GPIO_LEFT_LPWM = 13   # Physical Pin 33 (Hardware PWM1) - Reverse PWM Speed
GPIO_LEFT_R_EN = 22   # Physical Pin 15 - Forward Enable
GPIO_LEFT_L_EN = 23   # Physical Pin 16 - Reverse Enable
GPIO_LEFT_IS_ALARM = 24 # Physical Pin 18 - Overcurrent Alarm Input

# RIGHT MOTOR BTS7960 DRIVER
GPIO_RIGHT_RPWM = 18  # Physical Pin 12 (Hardware PWM0) - Forward PWM Speed
GPIO_RIGHT_LPWM = 19  # Physical Pin 35 (Hardware PWM1) - Reverse PWM Speed
GPIO_RIGHT_R_EN = 27  # Physical Pin 13 - Forward Enable
GPIO_RIGHT_L_EN = 17  # Physical Pin 11 - Reverse Enable
GPIO_RIGHT_IS_ALARM = 25 # Physical Pin 22 - Overcurrent Alarm Input

# HC-SR04 ULTRASONIC SENSORS
# NOTE: Echo pin MUST use 1kΩ / 2kΩ voltage divider to convert 5V to 3.3V!
GPIO_SONAR_FRONT_TRIG = 5   # Physical Pin 29 - Front Trigger Out
GPIO_SONAR_FRONT_ECHO = 6   # Physical Pin 31 - Front Echo In (3.3V Divided)
GPIO_SONAR_REAR_TRIG  = 20  # Physical Pin 38 - Rear Trigger Out
GPIO_SONAR_REAR_ECHO  = 21  # Physical Pin 40 - Rear Echo In (3.3V Divided)

# PHYSICAL RC RECEIVER CHANNELS (PPM or Individual PWM)
GPIO_RC_CH1_STEERING = 16   # Physical Pin 36 - Steering PWM Pulse In
GPIO_RC_CH2_THROTTLE = 26   # Physical Pin 37 - Throttle PWM Pulse In
GPIO_RC_CH6_MODE     = 4    # Physical Pin 7  - 3-Pos Mode Switch (Manual/Web/Auto)

# PHYSICAL EMERGENCY KILL SWITCH INPUT
GPIO_ESTOP_SENSE = 25       # Physical Pin 22 - Active LOW with Hardware Pull-up

# SYSTEM STATUS LEDS & BUZZER
GPIO_LED_STATUS_GREEN = 7   # Physical Pin 26 - System Nominal / Online
GPIO_LED_STATUS_RED   = 8   # Physical Pin 24 - E-Stop / Safety Tripped
GPIO_BUZZER_ALARM     = 1   # Physical Pin 28 - Safety / Siren Warning

# I2C BUS (Standard RPi 4 Hardware I2C-1)
# GPIO 2 (Physical Pin 3) = I2C1_SDA
# GPIO 3 (Physical Pin 5) = I2C1_SCL
I2C_BUS_ID = 1
I2C_ADDR_MPU6050 = 0x68    # 6-DOF IMU (Accelerometer + Gyroscope)
I2C_ADDR_ADS1115 = 0x48    # 16-Bit 4-Channel ADC (Voltage & Current Sensing)

# ADS1115 ADC CHANNELS
ADC_CH_BATTERY_VOLTAGE = 0 # Voltage divider from 36V battery pack (15:1 divider)
ADC_CH_LEFT_CURRENT    = 1 # ACS712 / ACS758 50A Hall current sensor Left Motor
ADC_CH_RIGHT_CURRENT   = 2 # ACS712 / ACS758 50A Hall current sensor Right Motor
ADC_CH_5V_RAIL         = 3 # Regulated logic rail monitoring

# ==============================================================================
# 2. MOTOR CONTROL & SAFETY LIMITS
# ==============================================================================

PWM_FREQUENCY_HZ = 1000     # 1 kHz PWM for smooth motor commutation
MAX_PWM_VALUE = 255         # 8-bit resolution (0-255)
MIN_MOTOR_DEADZONE = 30     # Minimum PWM to overcome initial friction

# Soft-Start Acceleration Ramp
ACCEL_RAMP_STEP = 5         # PWM step per cycle
RAMP_INTERVAL_MS = 20       # 20ms update rate = 50Hz ramp cycle

# Current & Voltage Interlocks
MAX_MOTOR_CURRENT_AMPS = 22.0     # Trip if motor draws >22A for >250ms
CURRENT_FAULT_DURATION_SEC = 0.25
BATTERY_NOMINAL_VOLTS = 36.0
BATTERY_CRITICAL_LOW_VOLTS = 31.0 # Auto-stop threshold to prevent LiFePO4 / Li-ion damage
BATTERY_WARNING_VOLTS = 33.0

# Obstacle Safety Distances
OBSTACLE_EMERGENCY_STOP_METERS = 0.35 # Hard-stop threshold (35 cm)
OBSTACLE_WARNING_METERS = 0.80        # Speed reduction threshold (80 cm)

# Communication Watchdog
COMMAND_HEARTBEAT_TIMEOUT_SEC = 0.50  # 500ms timeout for web/mobile controls

# ==============================================================================
# 3. BACKEND & NETWORK IDENTIFIERS
# ==============================================================================

ROBOT_ID = os.getenv("ROBOT_ID", "PRAHARI-01")
BACKEND_HOST = os.getenv("BACKEND_HOST", "127.0.0.1")
BACKEND_PORT = int(os.getenv("BACKEND_PORT", "4000"))
BACKEND_WS_URL = f"http://{BACKEND_HOST}:{BACKEND_PORT}"
DEVICE_SECRET_TOKEN = os.getenv("DEVICE_SECRET_TOKEN", "PRAHARI_SECURE_TOKEN_2026")
TELEMETRY_INTERVAL_SEC = 0.10 # 10 Hz telemetry publish rate
