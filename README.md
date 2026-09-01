# PRAHARI V3 — Autonomous & RC-Assisted Traffic-Police Robot Command Center

[![PRAHARI V3 Architecture](https://img.shields.io/badge/PRAHARI-Arduino%20Nano%20%2B%20ESP32--CAM%20%2B%20Google%20Gemini%20LLM-emerald.svg)](https://github.com/kunal285/NETRAH_2026)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Google GenAI SDK](https://img.shields.io/badge/Google%20GenAI-2.0%2B-4285F4.svg)](https://ai.google.dev/)
[![Docker Compose](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://docker.com)

**PRAHARI** is an autonomous and RC-assisted traffic-police robot developed by **NETRA Robotics**. This command center platform provides teleoperation, real-time computer vision (YOLOv8 vehicle detection & classification, ANPR plate recognition, face AI), emergency ambulance corridor detection, and a high-level **Google Gemini LLM Intelligence Layer** for automated incident reasoning, operator alerts, and diagnostic analysis.

---

## 1. System Architecture

```
Robot (MY1016 Motors + 2x BTS7960 + HC-SR04)
  │
  ▼
Controller (Arduino Nano / ESP32-class)
  │
  ▼
Camera (ESP32-CAM / RPi Cam) + Serial Telemetry (115200 Baud)
  │
  ▼ (Wi-Fi / Network)
Backend API Gateway & WebSocket Engine (:4000)
  │
  ├── AI Perception & Intelligence Service (:8000)
  │     ├── YOLOv8 Multi-Class Vehicle Detection
  │     ├── ByteTrack Object Tracking
  │     ├── Indian HSRP ANPR / OCR
  │     ├── Face Recognition (Enrolled vs Unknown)
  │     └── Google Gemini LLM Layer (Reasoning & Incident Intelligence)
  │
  ▼ (Socket.IO + REST)
Web Dashboard Console (:3000)
```

---

## 2. Gemini LLM Intelligence & Safety Architecture

> [!IMPORTANT]
> **Deterministic Control Safety Policy**:
> - **Gemini LLM NEVER controls motors directly.** Gemini cannot issue motor PWM, steering, speed commands, or emergency stop overrides.
> - Deterministic safety firmware (400ms auto-stop timer, ultrasonic proximity threshold, physical RC priority override, operator E-stop) retains 100% control authority.
> - **Zero Frontend Credential Exposure**: `GEMINI_API_KEY` resides strictly on the server-side AI service/backend environment and is never exposed to the browser.
> - **Event-Driven AI**: Gemini is invoked only on meaningful events (ambulance detection, unknown plates, congestion spikes, hardware warnings, or operator questions), throttled with configurable cooldowns (e.g. 5 seconds) to prevent redundant API calls.

### AI Pipeline Responsibilities
- **YOLO / CV (Real-Time 10–30 FPS)**: Vehicle detection, classification (Car, Motorcycle, Truck, Bus), ambulance visual beacon detection, object tracking.
- **ANPR / OCR**: Plate localization, crop extraction, character normalization.
- **Face Recognition**: Embedding matching against enrolled police personnel.
- **Google Gemini LLM**: High-level reasoning, incident summaries, natural language explanation, operator chat assistant, electrical/mechanical telemetry diagnostics.

---

## 3. Quick Start & Setup Guide

### Option A. Docker Compose (Recommended for Production)

Run the entire stack with a single command:

```bash
# 1. Clone repository and copy environment template
cp .env.example .env

# 2. Add your Google Gemini API key to .env
# GEMINI_API_KEY=your_gemini_api_key_here

# 3. Build and launch all services
docker compose up --build
```

Services will be available at:
- **Frontend Dashboard**: `http://localhost:3000`
- **Backend API Gateway**: `http://localhost:4000`
- **AI Perception & Gemini Service**: `http://localhost:8000`
- **MongoDB**: `localhost:27017`

---

### Option B. Local Development (Without Docker)

#### 1. AI Service Setup
```bash
cd ai-service
pip install -r requirements.txt
python main.py
# Runs on http://localhost:8000
```

#### 2. Backend Setup
```bash
cd backend
npm install
npm start
# Runs on http://localhost:4000
```

#### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:3000
```

---

## 4. Environment Variables

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Google Gemini API Key (**Server-side ONLY**) | `AIzaSy...` |
| `GEMINI_MODEL` | Gemini LLM Model | `gemini-2.5-flash` |
| `GEMINI_EVENT_COOLDOWN_SECONDS` | Debounce period between identical event analyses | `5` |
| `AI_SERVICE_URL` | Microservice URL for AI perception & LLM | `http://localhost:8000` |
| `BACKEND_URL` | Backend Gateway URL | `http://localhost:4000` |
| `ROBOT_CAMERA_STREAM_URL` | ESP32-CAM or RPi camera stream URL | `http://192.168.4.1:8080/video` |
| `PORT` | Backend HTTP Port | `4000` |
| `DATABASE_URL` | MongoDB connection string (auto-fallbacks in-memory) | `mongodb://localhost:27017/prahari` |
| `NEXT_PUBLIC_API_URL` | Frontend REST API target | `http://localhost:4000` |
| `NEXT_PUBLIC_SOCKET_URL` | Frontend Socket.IO target | `http://localhost:4000` |

---

## 5. API Endpoints

### AI Service Endpoints (`ai-service` :8000)
- `GET /health` — Service health & Gemini connectivity status
- `POST /api/ai/analyze` — Structured incident analysis on detection & telemetry payload
- `POST /api/ai/incident-summary?minutes=5` — Natural language incident summary over time window
- `POST /api/ai/explain-detection` — Safety-vetted detection & OCR explanation
- `POST /api/ai/chat` — Operator AI Assistant grounded in live robot telemetry
- `POST /api/ai/robot-status-analysis` — Battery, motor current, and sensor diagnostics
- `POST /api/ai/analyze-image` — Multimodal camera snapshot scene analysis
- `POST /api/ai/process-frame` — Live camera frame YOLO/OCR inference
- `GET /api/faces` & `POST /api/faces/enroll` — Face recognition database management

### Backend Gateway Endpoints (`backend` :4000)
- `GET /health` — Full system health check (Backend, DB, S3, Arduino, AI)
- `GET /api/ai/health` — AI service health proxy
- `POST /api/ai/chat` — AI Assistant chat gateway with auto-enriched telemetry
- `POST /api/ai/analyze-event` — On-demand event analysis trigger
- `POST /api/ai/incident-summary` — Time-windowed incident summary
- `POST /api/ai/explain-detection` — Detection explanation gateway
- `POST /api/ai/robot-status-analysis` — Telemetry analysis gateway
- `GET /api/detections` & `POST /api/detections` — Detection logs & ingestion
- `POST /api/robot/command` — Teleoperation drive & steering commands

---

## 6. Real-Time Socket.IO Events

| Event | Direction | Description |
| :--- | :--- | :--- |
| `ai:incident` | Server ➔ Client | Structured Gemini incident report (`summary`, `severity`, `recommended_action`) |
| `ai:alert` | Server ➔ Client | High / Critical priority emergency vehicle or safety alert |
| `ai:analysis` | Server ➔ Client | Diagnostic intelligence updates |
| `ai:status` | Server ➔ Client | AI engine model, OCR status, latency metrics |
| `robot:telemetry` | Server ➔ Client | Real-time battery voltage, motor current, ultrasonic distance |
| `control:drive_vector` | Client ➔ Server | Continuous differential joystick throttle & steering |
| `control:estop` | Client ➔ Server | Immediate hardware safety emergency stop |

---

## 7. Testing & Verification

### Run AI Service Unit Tests
```bash
python -m pytest ai-service/tests
```
*Validates health checks, Gemini client, deterministic safety fallbacks, structured Pydantic response validation, telemetry analysis, event debouncing, and REST routes.*

### Run Backend Gateway Integration Tests
```bash
node backend/scripts/test-ai-gateway.js
```
*Validates backend-to-AI communication, health aggregation, fallback responses, chat assistant, and telemetry analysis.*

---

## 8. Safety & Failsafe Guarantees

1. **RC Hardware Priority**: Physical RC controller interrupts on Arduino Nano take instantaneous priority over web commands.
2. **Watchdog Auto-Stop**: If no packet is received for >400ms, motors immediately cut power.
3. **Obstacle Collision Avoidance**: Front ultrasonic sensor distance (<30cm) initiates deterministic cutoff.
4. **Current Limiting**: BTS7960 drivers monitor motor current draw to prevent stall overcurrent.
5. **Deterministic Emergency Stop**: E-stop latches in hardware firmware and ignores all autonomous/AI inputs until manually reset by operator.

---

## License
MIT License — NETRA Robotics (2026).
