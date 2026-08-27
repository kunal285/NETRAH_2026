# PRAHARI — RASPBERRY PI 5 HARDWARE PINOUT & WIRING GUIDE

This guide specifies the complete physical wiring diagram between the **Raspberry Pi 5 (RP1 I/O Controller)** and the PRAHARI robot hardware subsystems.

---

## 1. Dual BTS7960 43A Motor Drivers (2× MY1016 350W 36V DC)

| BTS7960 Pin | Function | Raspberry Pi 5 Pin (BCM / Physical) | Description |
| :--- | :--- | :--- | :--- |
| **LEFT RPWM** | Forward PWM | `GPIO 12` (Physical Pin 32) | Hardware PWM0 Channel 0 |
| **LEFT LPWM** | Reverse PWM | `GPIO 13` (Physical Pin 33) | Hardware PWM1 Channel 1 |
| **LEFT R_EN** | Forward Enable | `GPIO 5` (Physical Pin 29) | High = Active |
| **LEFT L_EN** | Reverse Enable | `GPIO 6` (Physical Pin 31) | High = Active |
| **RIGHT RPWM**| Forward PWM | `GPIO 18` (Physical Pin 12) | Hardware PWM0 Channel 0 |
| **RIGHT LPWM**| Reverse PWM | `GPIO 19` (Physical Pin 35) | Hardware PWM1 Channel 1 |
| **RIGHT R_EN**| Forward Enable | `GPIO 23` (Physical Pin 16) | High = Active |
| **RIGHT L_EN**| Reverse Enable | `GPIO 24` (Physical Pin 18) | High = Active |
| **VCC** | Logic Power | `5V` (Physical Pin 2 or 4) | From LM2596 5V Power Rail |
| **GND** | Ground | `GND` (Physical Pin 6, 9, 14, 20) | Common System Ground |

---

## 2. HC-SR04 Ultrasonic Radar (Front & Rear Obstacle Interlocks)

| HC-SR04 Pin | Raspberry Pi 5 Pin | Notes |
| :--- | :--- | :--- |
| **VCC** | `5V` (Physical Pin 2) | Stabilized 5.0V from LM2596 |
| **TRIG (Front)** | `GPIO 20` (Physical Pin 38) | 10µs trigger pulse |
| **ECHO (Front)** | `GPIO 21` (Physical Pin 40) | *Use 1kΩ / 2kΩ voltage divider to step 5V echo to 3.3V* |
| **GND** | `GND` (Physical Pin 39) | Common Ground |

---

## 3. MPU-6050 6-DOF IMU (Accelerometer & Gyroscope)

| MPU-6050 Pin | Raspberry Pi 5 Pin | Bus / Interface |
| :--- | :--- | :--- |
| **VCC** | `3.3V` (Physical Pin 1) | 3.3V Logic Rail |
| **GND** | `GND` (Physical Pin 9) | Ground |
| **SDA** | `GPIO 2` (Physical Pin 3) | I2C-1 Data (`0x68`) |
| **SCL** | `GPIO 3` (Physical Pin 5) | I2C-1 Clock |

---

## 4. NEO-6M GPS Satellite Module (NMEA Geodetic Positioning)

| NEO-6M Pin | Raspberry Pi 5 Pin | Interface |
| :--- | :--- | :--- |
| **VCC** | `5V` or `3.3V` (Physical Pin 1) | Logic Power |
| **GND** | `GND` (Physical Pin 6) | Ground |
| **TX** | `GPIO 15` / `RXD0` (Physical Pin 10) | `/dev/serial0` @ 9600 bps |
| **RX** | `GPIO 14` / `TXD0` (Physical Pin 8) | `/dev/serial0` @ 9600 bps |

---

## 5. Running the Bridge Daemon on Raspberry Pi 5

1. Clone or copy the repo to your Raspberry Pi 5:
   ```bash
   cd prahari-traffic-police-robot-command-center/rpi5-bridge
   pip install -r requirements.txt
   ```
2. Launch the hardware bridge daemon:
   ```bash
   python3 rpi5_bridge.py
   ```
3. To enable autostart on boot via `systemd`:
   ```bash
   sudo cp prahari-rpi5.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable --now prahari-rpi5.service
   ```
