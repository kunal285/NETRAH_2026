# PRAHARI V3 — Real-Time Robot Command Center

[![PRAHARI V3 Architecture](https://img.shields.io/badge/PRAHARI-Arduino%20Nano%20%2B%20ESP32--CAM%20%2B%20BTS7960-emerald.svg)](https://github.com/kunal285/NETRAH_2026)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

An end-to-end real-time robot teleoperation command center and edge AI system for the **PRAHARI Traffic Police Robot (MK3)**.

---

## 1. Hardware Architecture (CURRENT)

```
                    PRAHARI COMMAND CENTER (Website)
                                   │
                                   │ WebSocket
                                   ▼
                             NODE.JS BACKEND
                                   │
                                   │ USB / Serial (115200 Baud)
                                   ▼
                             ARDUINO NANO
                                   │
                     ┌─────────────┴─────────────┐
                     ▼                           ▼
               BTS7960 DRIVER              BTS7960 DRIVER
                     │                           │
                     ▼                           ▼
              LEFT REAR MOTOR             RIGHT REAR MOTOR

                            FRONT CASTER WHEEL
                          (360° Passive Mechanical)


CAMERA STREAM:
                  ESP32-CAM (Wi-Fi MJPEG :80 / :8080)
                         │
                         ▼
                WEBSITE & AI PERCEPTION


PHYSICAL RC REMOTE:
               RC TRANSMITTER ────▶ RC RECEIVER ────▶ ARDUINO NANO
                                                       (Interrupts D2/D3)
```

- **Microcontroller**: Arduino Nano (ATmega328P, 16 MHz, 5V)
- **Camera Sensor**: ESP32-CAM (OV2640, Wi-Fi MJPEG Video Streamer)
- **Motor Drivers**: 2 × BTS7960 43A High-Power H-Bridge Drivers
- **Motors**: 2 × DC Geared Drive Motors (Rear Left, Rear Right)
- **Front Wheels**: Heavy-Duty 360° Passive Caster Wheels (**NO front steering servo, NO front motor**)
- **Physical RC**: 2-4 Channel RC Receiver connected to Arduino Nano interrupt pins (Hardware Priority 2)
- **Safety System**: 400ms Arduino command timeout (Auto-Stop on connection loss), Ultrasonic distance sensor (HC-SR04), Hardware Emergency Stop

---

## 2. Differential Drive Movement Mathematics

The website utilizes a single continuous game-style differential joystick:
- **Y-Axis**: Throttle ($-1.0$ to $+1.0$)
- **X-Axis**: Steering ($-1.0$ to $+1.0$)

$$\text{leftMotor} = \text{clamp}(\text{throttle} + \text{steering}, -1.0, 1.0) \times \text{speedLimit}$$
$$\text{rightMotor} = \text{clamp}(\text{throttle} - \text{steering}, -1.0, 1.0) \times \text{speedLimit}$$

| Motion | Throttle | Steering | Left Motor Output | Right Motor Output |
| :--- | :---: | :---: | :---: | :---: |
| **Forward** | $+1.0$ | $0.0$ | $+100\%$ | $+100\%$ |
| **Reverse** | $-1.0$ | $0.0$ | $-100\%$ | $-100\%$ |
| **Turn Left** | $+0.7$ | $-0.3$ | $+40\%$ | $+100\%$ |
| **Turn Right** | $+0.7$ | $+0.3$ | $+100\%$ | $+40\%$ |
| **Spin Left** | $0.0$ | $-1.0$ | $-100\%$ | $+100\%$ |
| **Spin Right** | $0.0$ | $+1.0$ | $+100\%$ | $-100\%$ |
| **Stop** | $0.0$ | $0.0$ | $0\%$ | $0\%$ |

---

## 3. Quick Start & Setup Guide

### A. Arduino Nano Firmware Flashing
1. Open [`firmware/arduino_nano/prahari_nano_driver.ino`](file:///d:/others/prahari-traffic-police-robot-command-center/firmware/arduino_nano/prahari_nano_driver.ino) in Arduino IDE.
2. Select Board: **Arduino Nano**, Processor: **ATmega328P (Old Bootloader or standard)**.
3. Upload to Arduino Nano over USB.

### B. ESP32-CAM Firmware Flashing
1. Open [`firmware/esp32_cam/prahari_esp32_cam.ino`](file:///d:/others/prahari-traffic-police-robot-command-center/firmware/esp32_cam/prahari_esp32_cam.ino) in Arduino IDE.
2. Select Board: **AI Thinker ESP32-CAM**, configure Wi-Fi SSID & Password.
3. Upload and note the assigned IP address (e.g. `http://192.168.4.1/video`).

### C. Backend Setup (`backend/`)
```bash
cd backend
npm install
npm start
```
*Runs on `http://localhost:4000`. Auto-connects to Arduino Nano on USB Serial (`COM3` or `/dev/ttyUSB0`) or runs in responsive simulation mode.*

### D. AI Perception Microservice (`ai-service/`)
```bash
cd ai-service
pip install -r requirements.txt
python main.py
```
*Runs on `http://localhost:8000` for YOLOv8 multi-class tracking, ANPR OCR, and Face AI.*

### E. Next.js / React Command Center Frontend (`frontend/`)
```bash
cd frontend
npm install
npm run dev
```
*Access command console at `http://localhost:3000`.*

---

## 4. Control Modes & Priority Arbitration

1. **Priority 1 — Hardware / Web Emergency Stop**: Immediate hard cutoff of all motor PWM outputs.
2. **Priority 2 — Physical RC Transmitter**: When RC sticks are moved, Arduino Nano grants RC full driving priority and displays `🎮 RC CONTROL ACTIVE` on the web interface.
3. **Priority 3 — Web Manual Control**: Virtual Game-Style Joystick, W/A/S/D Keyboard controls, or Gamepad API.
4. **Priority 4 — Autonomous Mode**: High-level waypoint and AI navigation.

---

## 5. Desktop Keyboard & Gamepad Shortcuts

- `W` / `Up Arrow` : Forward
- `S` / `Down Arrow` : Reverse
- `A` / `Left Arrow` : Steer Left
- `D` / `Right Arrow` : Steer Right
- `Spacebar` : Instant Stop
- `E` : Emergency Stop (Hard Kill Switch)
- **Gamepad API**: Left analog stick controls Throttle & Steering with real-time deadzone compensation.

---

## 6. Telemetry & Failsafe Guarantees

- **Event-Driven Telemetry (10-20 Hz)**: Battery %, Voltage (36V), Left/Right Motor %, Left/Right Currents (A), Obstacle Distance (cm), Temperature (°C).
- **Zero Full-Page Refresh**: All indicators update via persistent WebSocket with auto-reconnect backoff (1s, 2s, 4s, 8s, 10s max).
- **Arduino Failsafe Timeout (400ms)**: If communication breaks between Backend and Arduino Nano, motors stop automatically within 400 milliseconds.
