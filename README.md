# 🚦 PRAHARI Traffic Police Robot Command Center

**PRAHARI** is a traffic-operations command center designed to monitor and control a police robot.

It provides a web-based operator dashboard with:

* 🤖 Robot monitoring and control
* 📡 Real-time telemetry
* 📷 Camera and sensor views
* 🚗 Vehicle detection
* 🔢 Number-plate detection (ANPR)
* 🚨 Traffic and safety alerts
* 🧠 AI-assisted events
* 🔐 Authentication
* 💾 Optional MongoDB persistence
* ⚡ Real-time communication using Socket.IO

---

# 1. System Architecture

PRAHARI consists of four application components:

```text
                         PRAHARI
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │ Frontend │  │ Backend  │  │AI Service│
        │ Next.js  │  │ Express  │  │ FastAPI  │
        │          │  │ Socket.IO│  │ Python   │
        │ Port 3000│  │Port 4000 │  │Port 8000 │
        └────┬─────┘  └────┬─────┘  └────┬─────┘
             │             │             │
             └─────────────┼─────────────┘
                           │
                      ┌────▼─────┐
                      │ MongoDB  │
                      │ Optional │
                      └──────────┘
```

### Frontend

The `frontend/` directory contains the **Next.js operator dashboard**.

It provides the user interface for:

* Robot controls
* Telemetry
* Camera feeds
* Sensors
* Alerts
* AI events

### Backend

The `backend/` directory contains the **Express and Socket.IO server**.

It handles:

* REST APIs
* Authentication
* Real-time communication
* Robot services
* Telemetry
* Alerts
* Database persistence
* Communication with the AI service

### AI Service

The `ai-service/` directory contains the **Python AI service**.

It handles detection and inference tasks such as:

* Vehicle detection
* Number-plate detection
* Ambulance detection
* Pedestrian detection
* Gesture detection
* Audio detection
* General object/frame detection

### RPi5 Bridge

The `rpi5-bridge/` directory contains the Raspberry Pi 5 daemon installed on the
physical robot. It reads sensors, controls motors, and exchanges telemetry and
commands with the backend through HTTP and Socket.IO. It is installed directly
on the robot, not on the web host.

---

# 2. Project Structure

```text
PRAHARI/
│
├── frontend/
│   ├── Next.js dashboard
│   └── Operator controls
│
├── backend/
│   ├── Express API
│   ├── Socket.IO server
│   ├── Authentication
│   ├── Database
│   └── Robot services
│
├── ai-service/
│   ├── FastAPI server
│   ├── AI models
│   └── Detection services
│
├── rpi5-bridge/
│   ├── Raspberry Pi 5 hardware daemon
│   ├── Motor and sensor drivers
│   └── systemd service
│
└── package.json
```

---

# 3. Prerequisites

Install the following before starting the project.

### Required

* **Node.js 18 or newer**
* **npm**

### Optional

* **Python 3.10 or newer** — required for AI features
* **MongoDB** — required for persistent database storage

> MongoDB is optional. PRAHARI can run in demo mode without MongoDB.

---

# 4. Installation

Open **PowerShell** in the project root directory.

Install the root dependencies:

```powershell
npm install
```

Install frontend dependencies:

```powershell
npm install --prefix frontend
```

Install backend dependencies:

```powershell
npm install --prefix backend
```

---

# 5. Environment Configuration

Create the frontend environment file:

```powershell
Copy-Item frontend/.env.example frontend/.env.local
```

Create the backend environment file:

```powershell
Copy-Item backend/.env.example backend/.env
```

---

## Backend Environment Variables

Open:

```text
backend/.env
```

Configure the required values.

```env
JWT_SECRET=<your-long-random-secret>
MONGODB_URI=<your-mongodb-connection-string>
GEMINI_API_KEY=<your-gemini-api-key>
AI_SERVICE_URL=http://localhost:8000
```

### What these variables do

| Variable         | Purpose                      |
| ---------------- | ---------------------------- |
| `JWT_SECRET`     | Authentication/security      |
| `MONGODB_URI`    | MongoDB database connection  |
| `GEMINI_API_KEY` | Gemini-powered features      |
| `AI_SERVICE_URL` | URL of the Python AI service |

Only configure the variables required by the features you are using.

---

# 6. Run PRAHARI Locally

PRAHARI uses three software services locally; the optional `rpi5-bridge/` runs
separately on the physical Raspberry Pi 5 robot.

For local development, open **three PowerShell terminals**. When testing with a
physical robot, run the RPi5 bridge on the robot instead of another Windows
terminal.

Start them in this order:

```text
1. Backend
2. AI Service
3. Frontend
```

---

## Terminal 1 — Backend

From the project root:

```powershell
npm run dev:backend
```

The backend normally runs on:

```text
http://localhost:4000
```

Keep this terminal running.

---

## Terminal 2 — AI Service

The AI service is separate from Node.js.

Go to the AI service directory:

```powershell
cd ai-service
```

Create a Python virtual environment:

```powershell
python -m venv .venv
```

Activate it:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install Python dependencies:

```powershell
pip install -r requirements.txt
```

Start the AI service:

```powershell
python main.py
```

The AI service normally runs on:

```text
http://localhost:8000
```

### Important

The Python code does **not** run inside Node.js.

`main.py` starts a FastAPI application using Uvicorn.

Keep this terminal running while using AI features.

---

# 7. Change the AI Service Port

If port `8000` is already being used, choose another port.

For example:

```powershell
$env:AI_SERVICE_PORT = "8001"
python main.py
```

Then update the backend `.env` file:

```env
AI_SERVICE_URL=http://localhost:8001
```

---

# 8. AI Service API

The AI service provides the following endpoints.

### Health Check

```text
GET /health
```

Used to verify that the AI service is running.

### Available Models

```text
GET /models
```

Returns the available AI models.

### Detection APIs

```text
POST /detect/frame
POST /detect/anpr
POST /detect/ambulance
POST /detect/pedestrians
POST /detect/gesture
POST /detect/audio
```

These endpoints perform the corresponding AI detection tasks.

---

# 9. Terminal 3 — Frontend

From the project root:

```powershell
npm run dev:frontend
```

The Next.js dashboard normally runs at:

```text
http://localhost:3000
```

Open this address in your browser.

```text
http://localhost:3000
```

---

# 10. Local Service URLs

| Service    | Default Port | URL                     |
| ---------- | -----------: | ----------------------- |
| Frontend   |       `3000` | `http://localhost:3000` |
| Backend    |       `4000` | `http://localhost:4000` |
| AI Service |       `8000` | `http://localhost:8000` |

---

# 11. How Communication Works

The frontend communicates with the backend using APIs and Socket.IO.

The backend communicates with:

* The robot
* MongoDB
* The AI service

```text
Operator
   │
   ▼
Next.js Dashboard
   │
   │ API / Socket.IO
   ▼
Express + Socket.IO Backend
   │
   ├──────────────► Robot
   │
   ├──────────────► MongoDB
   │
   └──────────────► Python AI Service
                         │
                         ▼
                    AI Detection
```

The frontend proxies:

```text
/api
/socket.io
```

to the backend.

---

# 12. Production Deployment

For production, PRAHARI uses three hosted services plus the hardware bridge.

| Service    | Recommended Hosting             |
| ---------- | ------------------------------- |
| Frontend   | Vercel or another Node.js host  |
| Backend    | Render, Railway, Fly.io, or VPS |
| AI Service | Python host or GPU-enabled VPS  |
| Database   | MongoDB Atlas                   |
| RPi5 Bridge | Raspberry Pi 5 on the robot    |

For production database storage, **MongoDB Atlas** is recommended.

---

# 13. Deploy MongoDB

Create a MongoDB Atlas cluster.

After creating the cluster:

1. Create a database user.
2. Configure network access.
3. Add the IP address of your backend host.
4. Copy the MongoDB connection string.

Example:

```text
mongodb+srv://username:password@cluster.mongodb.net/prahari
```

Keep this connection string private.

---

# 14. Deploy the Backend

Create a Node.js web service using:

```text
Root Directory:
backend/
```

Use:

```text
Build Command:
npm install
```

and:

```text
Start Command:
npm start
```

Configure these environment variables:

```env
NODE_ENV=production

BACKEND_PORT=10000

MONGODB_URI=<your-mongodb-atlas-connection-string>

JWT_SECRET=<a-long-random-secret>

AI_SERVICE_URL=https://<your-ai-service-host>

APP_URL=https://<your-frontend-host>
```

### Important

Set `BACKEND_PORT` according to the port required by your hosting provider.

After deployment, test the backend health endpoint:

```text
https://<your-backend-host>/api/health
```

It should return a successful health response.

---

# 15. Deploy the AI Service

Create a Python web service using:

```text
Root Directory:
ai-service/
```

Use:

```text
Build Command:
pip install -r requirements.txt
```

Start the service with:

```text
uvicorn main:app --host 0.0.0.0 --port $PORT
```

After deployment, test:

```text
https://<your-ai-service-host>/health
```

If the health endpoint works, update the backend environment:

```env
AI_SERVICE_URL=https://<your-ai-service-host>
```

### Is the AI service required?

No.

The AI service is **optional** if you are running PRAHARI without AI detection features.

If the AI models require significant CPU, RAM, or GPU resources, use an appropriate GPU-enabled hosting environment.

---

# 16. Deploy the Frontend

Deploy the `frontend/` directory as a Next.js application.

For Vercel, the standard Next.js build settings can be used.

### Build Command

```text
npm run build
```

Configure:

```env
NEXT_PUBLIC_API_URL=https://<your-backend-host>

NEXT_PUBLIC_SOCKET_URL=https://<your-backend-host>
```

After deployment, copy the final frontend URL.

For example:

```text
https://prahari.example.com
```

Then update the backend:

```env
APP_URL=https://prahari.example.com
```

---

# 17. Deploy the RPi5 Bridge

Install the bridge on the Raspberry Pi 5 connected to the robot hardware:

```bash
cd rpi5-bridge
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
```

Set `BACKEND_HTTP_URL`, `BACKEND_SOCKET_URL`, and `ROBOT_ID` in
`rpi5_bridge.py`, and check the wiring against
[`rpi5-bridge/PINOUT_GUIDE.md`](rpi5-bridge/PINOUT_GUIDE.md).

For automatic startup, update the paths and user in
`rpi5-bridge/prahari-rpi5.service`, then run:

```bash
sudo cp prahari-rpi5.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now prahari-rpi5.service
sudo systemctl status prahari-rpi5.service
```

View logs with:

```bash
sudo journalctl -u prahari-rpi5.service -f
```

Do not expose the Raspberry Pi directly to the public internet. It should make
outbound connections to the secured backend.

---

# 18. Production Connection

Your final production architecture should look like this:

```text
                     INTERNET
                         │
                         ▼
              ┌──────────────────┐
              │ PRAHARI Frontend │
              │     Next.js      │
              └────────┬─────────┘
                       │
                 HTTPS / WebSocket
                       │
                       ▼
              ┌──────────────────┐
              │ PRAHARI Backend  │
              │ Express + Socket │
              └───────┬───┬──────┘
                      │   │
             ┌────────┘   └─────────┐
             ▼                      ▼
      ┌─────────────┐       ┌─────────────┐
      │ MongoDB      │       │ AI Service  │
      │ Atlas        │       │ FastAPI     │
      └─────────────┘       └─────────────┘
                                     ▲
                                     │ HTTPS / Socket.IO
                             ┌───────┴───────┐
                             │ Raspberry Pi 5│
                             │ RPi5 Bridge   │
                             └───────────────┘
```

---

# 19. Production Requirements

Make sure:

* Frontend uses HTTPS.
* Backend uses HTTPS.
* Socket.IO/WebSocket connections are supported.
* Backend CORS is restricted to the frontend domain.
* MongoDB Atlas allows connections from the backend host.
* AI service is reachable by the backend.
* Required environment variables are configured.
* `.env` files are never committed to Git.

---

# 20. Physical Robot Configuration

If PRAHARI is connected to a physical robot, configure:

```env
ROBOT_API_URL=<robot-api-url>

ROBOT_CAMERA_STREAM_URL=<robot-camera-stream-url>
```

These variables allow the backend/dashboard to communicate with the physical robot and access its camera stream.

---

# 21. Production Security Checklist

Before going live, verify the following:

* [ ] Use a strong and unique `JWT_SECRET`.
* [ ] Never commit `.env` files.
* [ ] Never expose API keys publicly.
* [ ] Restrict backend CORS to the frontend domain.
* [ ] Configure `ROBOT_API_URL` when using a physical robot.
* [ ] Configure `ROBOT_CAMERA_STREAM_URL` when using a robot camera.
* [ ] Verify the backend `/api/health` endpoint.
* [ ] Verify the AI `/health` endpoint.
* [ ] Verify Socket.IO/WebSocket connectivity.
* [ ] Confirm MongoDB Atlas network access.
* [ ] Use sufficient CPU/RAM for AI inference.
* [ ] Use a GPU-enabled host if required by the AI models.

---

# 22. Troubleshooting

## Port 3000 Is Already in Use

If port `3000` is already occupied, start the frontend on another port:

```powershell
npm run dev --prefix frontend -- -p 3001
```

Then open:

```text
http://localhost:3001
```

Alternatively, stop the process currently using port `3000`.

---

## Next.js Cannot Find a Chunk

If you see an error such as:

```text
Cannot find a chunk such as ./818.js
```

the `.next` directory may contain stale or mixed build files.

### Fix

Stop the frontend process.

Delete the generated Next.js directory:

```powershell
Remove-Item -Recurse -Force frontend/.next
```

Restart the frontend:

```powershell
npm run dev:frontend
```

Next.js will automatically create a new `.next` directory.

> `.next/` is generated automatically and should not be committed to Git.

---

# 23. Production Frontend Build

To create a production build:

```powershell
npm run build
```

Start the production frontend:

```powershell
npm run start
```

---

# 24. Quick Start

For local development, use three terminals.

### Terminal 1 — Backend

```powershell
npm run dev:backend
```

### Terminal 2 — AI Service

```powershell
cd ai-service
.\.venv\Scripts\Activate.ps1
python main.py
```

### Terminal 3 — Frontend

```powershell
npm run dev:frontend
```

Then open:

```text
http://localhost:3000
```

---

# 25. Useful Commands

| Command                           | Description                           |
| --------------------------------- | ------------------------------------- |
| `npm install`                     | Install root dependencies             |
| `npm install --prefix frontend`   | Install frontend dependencies         |
| `npm install --prefix backend`    | Install backend dependencies          |
| `npm run dev:frontend`            | Start the Next.js dashboard           |
| `npm run dev:backend`             | Start the backend in development mode |
| `npm run build`                   | Create a production frontend build    |
| `npm run start`                   | Start the production frontend         |
| `python main.py`                  | Start the AI service                  |
| `pip install -r requirements.txt` | Install Python dependencies           |

---

# 26. Summary

PRAHARI is made up of three independent services:

### 🖥️ Frontend

**Next.js**

Responsible for the operator dashboard and controls.

### ⚙️ Backend

**Express + Socket.IO**

Responsible for APIs, authentication, robot communication, real-time data, alerts, and database operations.

### 🧠 AI Service

**Python + FastAPI + Uvicorn**

Responsible for AI-based detection and inference.

For local development, run all three services separately.

For production, deploy them independently and connect them using environment variables.

```text
Frontend
   ↓
Backend
   ↓
 ┌──────────────┬──────────────┐
 ▼              ▼              ▼
Robot        MongoDB       AI Service
```

Once all required services are running and correctly configured, PRAHARI is ready for development, testing, and production deployment.
