"""
PRAHARI Sensor Manager Module
Interfaces:
1. HC-SR04 Ultrasonic Sonar (Front & Rear Distance)
2. MPU6050 6-Axis IMU (Tilt, Roll, Pitch, Accelerometer)
3. ADS1115 16-Bit I2C ADC (36V Battery Voltage & Dual Motor Current Sensors)
"""

import time
import math
import threading
from config import (
    GPIO_SONAR_FRONT_TRIG, GPIO_SONAR_FRONT_ECHO,
    GPIO_SONAR_REAR_TRIG, GPIO_SONAR_REAR_ECHO,
    I2C_BUS_ID, I2C_ADDR_MPU6050, I2C_ADDR_ADS1115,
    ADC_CH_BATTERY_VOLTAGE, ADC_CH_LEFT_CURRENT, ADC_CH_RIGHT_CURRENT
)

try:
    import pigpio
    PI_GPIO = pigpio.pi()
    HAS_PIGPIO = PI_GPIO.connected
except Exception:
    PI_GPIO = None
    HAS_PIGPIO = False

try:
    import smbus2
    I2C_BUS = smbus2.SMBus(I2C_BUS_ID)
    HAS_I2C = True
except Exception:
    I2C_BUS = None
    HAS_I2C = False


class SensorManager:
    def __init__(self):
        self.front_distance_m = 2.50
        self.rear_distance_m = 4.00
        self.battery_voltage = 36.2
        self.battery_percentage = 95
        self.left_motor_current = 0.45
        self.right_motor_current = 0.48
        self.accel = {"x": 0.0, "y": 0.0, "z": 9.81}
        self.gyro = {"x": 0.0, "y": 0.0, "z": 0.0}
        self.tilt_angle_deg = 0.0
        self.temperature_c = 28.5

        self.running = True
        self.lock = threading.Lock()

        self._init_mpu6050()
        self._init_sonar_gpio()

        # Start continuous sensor acquisition loop (50 Hz)
        self.thread = threading.Thread(target=self._sensor_loop, daemon=True)
        self.thread.start()
        print(f"[SENSORS] Initialized Sensor Manager (I2C: {HAS_I2C}, Sonar GPIO: {HAS_PIGPIO})")

    def _init_mpu6050(self):
        if not HAS_I2C:
            return
        try:
            # Wake up MPU6050 (write 0 to PWR_MGMT_1 register 0x6B)
            I2C_BUS.write_byte_data(I2C_ADDR_MPU6050, 0x6B, 0x00)
            # Set accelerometer full scale to ±4g (register 0x1C)
            I2C_BUS.write_byte_data(I2C_ADDR_MPU6050, 0x1C, 0x08)
            # Set gyro full scale to ±500°/s (register 0x1B)
            I2C_BUS.write_byte_data(I2C_ADDR_MPU6050, 0x1B, 0x08)
        except Exception as e:
            print(f"[SENSORS] MPU6050 Init notice: {e}")

    def _init_sonar_gpio(self):
        if not HAS_PIGPIO:
            return
        PI_GPIO.set_mode(GPIO_SONAR_FRONT_TRIG, pigpio.OUTPUT)
        PI_GPIO.set_mode(GPIO_SONAR_FRONT_ECHO, pigpio.INPUT)
        PI_GPIO.set_mode(GPIO_SONAR_REAR_TRIG, pigpio.OUTPUT)
        PI_GPIO.set_mode(GPIO_SONAR_REAR_ECHO, pigpio.INPUT)

        PI_GPIO.write(GPIO_SONAR_FRONT_TRIG, 0)
        PI_GPIO.write(GPIO_SONAR_REAR_TRIG, 0)

    def _read_sonar(self, trig_pin, echo_pin):
        if not HAS_PIGPIO:
            return 2.50
        try:
            # 10us trigger pulse
            PI_GPIO.gpio_trigger(trig_pin, 10, 1)

            # Wait for echo high
            timeout = time.time() + 0.03 # 30ms timeout (max ~5m)
            start_t = time.time()
            while PI_GPIO.read(echo_pin) == 0:
                start_t = time.time()
                if start_t > timeout:
                    return 4.0

            stop_t = time.time()
            while PI_GPIO.read(echo_pin) == 1:
                stop_t = time.time()
                if stop_t > timeout:
                    return 4.0

            elapsed = stop_t - start_t
            distance_m = (elapsed * 343.0) / 2.0
            return max(0.02, min(5.0, round(distance_m, 2)))
        except Exception:
            return 2.50

    def _read_mpu6050(self):
        if not HAS_I2C:
            return
        try:
            # Read 14 bytes from register 0x3B (Accel X, Y, Z, Temp, Gyro X, Y, Z)
            data = I2C_BUS.read_i2c_block_data(I2C_ADDR_MPU6050, 0x3B, 14)

            def to_int16(hi, lo):
                val = (hi << 8) | lo
                return val - 65536 if val > 32767 else val

            ax = to_int16(data[0], data[1]) / 8192.0 * 9.81  # ±4g scale
            ay = to_int16(data[2], data[3]) / 8192.0 * 9.81
            az = to_int16(data[4], data[5]) / 8192.0 * 9.81

            raw_temp = to_int16(data[6], data[7])
            temp_c = (raw_temp / 340.0) + 36.53

            gx = to_int16(data[8], data[9]) / 65.5  # ±500 deg/s
            gy = to_int16(data[10], data[11]) / 65.5
            gz = to_int16(data[12], data[13]) / 65.5

            tilt = math.degrees(math.atan2(math.sqrt(ax * ax + ay * ay), abs(az)))

            with self.lock:
                self.accel = {"x": round(ax, 2), "y": round(ay, 2), "z": round(az, 2)}
                self.gyro = {"x": round(gx, 2), "y": round(gy, 2), "z": round(gz, 2)}
                self.temperature_c = round(temp_c, 1)
                self.tilt_angle_deg = round(tilt, 1)
        except Exception:
            pass

    def _read_ads1115_channel(self, channel):
        if not HAS_I2C:
            return 0.0
        try:
            # Config register for Single-Ended AINx, PGA=±4.096V (0x0200)
            mux_map = {0: 0x4000, 1: 0x5000, 2: 0x6000, 3: 0x7000}
            config = 0x8000 | mux_map.get(channel, 0x4000) | 0x0200 | 0x0080 | 0x0003
            hi = (config >> 8) & 0xFF
            lo = config & 0xFF
            I2C_BUS.write_i2c_block_data(I2C_ADDR_ADS1115, 0x01, [hi, lo])
            time.sleep(0.008) # 8ms conversion time

            # Read conversion register 0x00
            data = I2C_BUS.read_i2c_block_data(I2C_ADDR_ADS1115, 0x00, 2)
            raw = (data[0] << 8) | data[1]
            if raw > 32767:
                raw -= 65536
            volts = (raw * 4.096) / 32768.0
            return max(0.0, volts)
        except Exception:
            return 0.0

    def _sensor_loop(self):
        while self.running:
            # 1. Read IMU
            self._read_mpu6050()

            # 2. Read Sonar
            f_dist = self._read_sonar(GPIO_SONAR_FRONT_TRIG, GPIO_SONAR_FRONT_ECHO)
            r_dist = self._read_sonar(GPIO_SONAR_REAR_TRIG, GPIO_SONAR_REAR_ECHO)

            # 3. Read Voltage & Current via ADS1115 (15:1 Voltage Divider: 36V -> 2.4V)
            v_sense = self._read_ads1115_channel(ADC_CH_BATTERY_VOLTAGE)
            battery_v = v_sense * 15.0 if v_sense > 0.1 else 36.2

            # ACS712 / ACS758 50A Current Sensor: 2.5V offset, 40mV/A sensitivity
            i_left_v = self._read_ads1115_channel(ADC_CH_LEFT_CURRENT)
            i_right_v = self._read_ads1115_channel(ADC_CH_RIGHT_CURRENT)
            i_left = abs(i_left_v - 2.5) / 0.040 if i_left_v > 0.1 else 0.45
            i_right = abs(i_right_v - 2.5) / 0.040 if i_right_v > 0.1 else 0.48

            # Calculate SoC percentage (31V = 0%, 39V = 100%)
            soc = max(0, min(100, int(((battery_v - 31.0) / 8.0) * 100)))

            with self.lock:
                self.front_distance_m = f_dist
                self.rear_distance_m = r_dist
                self.battery_voltage = round(battery_v, 1)
                self.battery_percentage = soc
                self.left_motor_current = round(i_left, 2)
                self.right_motor_current = round(i_right, 2)

            time.sleep(0.05) # 50ms loop = 20Hz update rate

    def get_readings(self):
        with self.lock:
            return {
                "front_distance_m": self.front_distance_m,
                "rear_distance_m": self.rear_distance_m,
                "battery_voltage": self.battery_voltage,
                "battery_percentage": self.battery_percentage,
                "left_motor_current": self.left_motor_current,
                "right_motor_current": self.right_motor_current,
                "total_current": round(self.left_motor_current + self.right_motor_current, 2),
                "accel": self.accel,
                "gyro": self.gyro,
                "tilt_deg": self.tilt_angle_deg,
                "temperature_c": self.temperature_c
            }

    def cleanup(self):
        self.running = False
        if HAS_I2C and I2C_BUS:
            try:
                I2C_BUS.close()
            except Exception:
                pass
