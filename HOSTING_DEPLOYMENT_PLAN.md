# PRAHARI V3 — Complete Cloud Hosting & Deployment Architecture Plan

[![PRAHARI Cloud Architecture](https://img.shields.io/badge/PRAHARI-Production%20Cloud%20Hosting-emerald.svg)](https://github.com/kunal285/NETRAH_2026)
[![Target: Render + Vercel + AWS S3 + MongoDB Atlas](https://img.shields.io/badge/Deployment-Render%20%7C%20Vercel%20%7C%20AWS-blue.svg)](https://render.com)

This document details the production cloud deployment strategy, networking architecture, environment configurations, and step-by-step setup for the **PRAHARI V3 Smart Traffic Police Robot Command Center**.

---

## 1. High-Level Multi-Tier Hosting Architecture

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             PUBLIC INTERNET CLIENTS                              │
│                    (Mobile Phones, Laptops, Control Rooms)                       │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │ HTTPS / WSS
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND HOSTING (Vercel / Render)                       │
│                           Next.js / React Web Application                        │
│                                URL: https://prahari.app                          │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │ REST API & WebSocket (Socket.IO)
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                        BACKEND HOSTING (Render Web Service)                      │
│                           Node.js Express + Socket.IO Server                     │
│                        URL: https://api.prahari.onrender.com                     │
│                                                                                  │
│   ┌────────────────────────┬─────────────────────────┬───────────────────────┐   │
│   │                        │                         │                       │   │
│   ▼                        ▼                         ▼                       ▼   │
│ ┌────────────────┐   ┌─────────────────┐   ┌───────────────────┐   ┌─────────┴─┐ │
│ │  MongoDB Atlas │   │  AWS S3 Bucket  │   │ AI Microservice   │   │ Edge RPi4/│ │
│ │  (Persistence) │   │ (Private Images)│   │ (Python / YOLOv8) │   │ Nano VPN  │ │
│ └────────────────┘   └─────────────────┘   └───────────────────┘   └───────────┘ │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Infrastructure Component Breakdown

| Tier | Component | Recommended Provider | Pricing / Plan | Role |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend** | React / Next.js Console | **Vercel** / **Render Static** | Free / Pro ($20/mo) | Global CDN edge serving, 60 FPS Joystick, Video HUD |
| **Backend** | Node.js Express + Socket.IO | **Render Web Service** | Starter ($7/mo) | REST APIs, Serial bridge, WebSocket hub, S3 uploads |
| **Edge AI** | YOLOv8 + ANPR + Face AI | **Render / RunPod / EC2** | CPU / T4 GPU ($0.20/hr) | Multi-class tracking, OCR, Embeddings |
| **Database** | MongoDB Database | **MongoDB Atlas** | M0 Free / M10 ($0.08/hr) | Snapshots, Detections, Telemetry history, Faces DB |
| **Storage** | Object Storage | **AWS S3 (ap-south-1)** | Pay-as-you-go (~$1-5/mo) | Private encrypted storage for snapshots & evidence crops |
| **Edge Network**| Robot Stream & Serial Tunnel | **Tailscale / Cloudflare Tunnel** | Free | Secure remote access to ESP32-CAM stream & Arduino Nano |

---

## 3. Step-by-Step Deployment Instructions

### Tier 1: Database Setup (MongoDB Atlas)

1. Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. In **Network Access**, add `0.0.0.0/0` (Allow Access from Anywhere) to let Render servers connect.
3. In **Database Access**, create a user `prahari_admin` with read/write privileges.
4. Copy the connection string:
   ```
   mongodb+srv://prahari_admin:<PASSWORD>@cluster0.prahari.mongodb.net/prahari?retryWrites=true&w=majority
   ```

---

### Tier 2: Object Storage Setup (AWS S3)

1. Open AWS S3 Console in region `ap-south-1` (Mumbai) or your preferred region.
2. Create bucket: `prahari-image-storage-2026` (Block all public access enabled — private bucket).
3. **CORS Configuration**: Paste the following JSON under **Bucket Permissions $\rightarrow$ Cross-origin resource sharing (CORS)**:
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
       "AllowedOrigins": ["*"],
       "ExposeHeaders": ["ETag", "Content-Length"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
4. **IAM Policy**: Create an IAM User `prahari-s3-service-user` with policy:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "s3:PutObject",
           "s3:GetObject",
           "s3:DeleteObject",
           "s3:ListBucket"
         ],
         "Resource": [
           "arn:aws:s3:::prahari-image-storage-2026",
           "arn:aws:s3:::prahari-image-storage-2026/*"
         ]
       }
     ]
   }
   ```
5. Save the `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`.

---

### Tier 3: Backend Deployment (Render Web Service)

1. Push your repository to GitHub.
2. Log in to [Render.com](https://dashboard.render.com/) and click **New + $\rightarrow$ Web Service**.
3. Connect your GitHub repository.
4. Set the following build configuration:
   - **Name**: `prahari-backend`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Instance Type**: `Starter` ($7/mo) or `Free`
5. Under **Environment Variables**, add:
   ```env
   NODE_ENV=production
   PORT=4000
   BACKEND_PORT=4000
   DATABASE_URL=mongodb+srv://prahari_admin:<PASSWORD>@cluster0.prahari.mongodb.net/prahari?retryWrites=true&w=majority
   MONGODB_URI=mongodb+srv://prahari_admin:<PASSWORD>@cluster0.prahari.mongodb.net/prahari?retryWrites=true&w=majority
   
   # AWS S3 Storage
   AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
   AWS_SECRET_ACCESS_KEY=YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY
   AWS_REGION=ap-south-1
   AWS_S3_BUCKET_NAME=prahari-image-storage-2026
   
   # AI Thresholds
   AI_PROCESS_FPS=10
   VEHICLE_CONFIDENCE=0.40
   PLATE_CONFIDENCE=0.40
   AMBULANCE_CONFIDENCE=0.50
   FACE_CONFIDENCE=0.50
   
   # Security
   JWT_SECRET=your-super-secure-production-jwt-key-2026
   DEFAULT_ROBOT_ID=PRAHARI-01
   ROBOT_ID=PRAHARI-01
   ```
6. Click **Deploy Web Service**.
7. Note your assigned backend URL: `https://prahari-backend.onrender.com`.

---

### Tier 4: AI Perception Engine Deployment (Render / AWS EC2)

1. In Render, create another **Web Service**:
   - **Name**: `prahari-ai-service`
   - **Root Directory**: `ai-service`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
2. Under **Environment Variables**, add:
   ```env
   BACKEND_URL=https://prahari-backend.onrender.com
   ROBOT_ID=PRAHARI-01
   AI_PROCESS_FPS=10
   ```
3. Copy the URL: `https://prahari-ai-service.onrender.com` and update `AI_SERVICE_URL` in the backend.

---

### Tier 5: Frontend Operator Console Deployment (Vercel)

1. Open [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New... $\rightarrow$ Project**.
2. Import the GitHub repository.
3. In **Project Settings**:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: `frontend`
4. In **Environment Variables**, add:
   ```env
   NEXT_PUBLIC_API_URL=https://prahari-backend.onrender.com
   NEXT_PUBLIC_SOCKET_URL=https://prahari-backend.onrender.com
   NEXT_PUBLIC_AI_SERVICE_URL=https://prahari-ai-service.onrender.com
   NEXT_PUBLIC_ROBOT_CAMERA_STREAM_URL=https://camera.prahari.live/video
   NEXT_PUBLIC_DEMO_MODE=false
   ```
5. Click **Deploy**.
6. Your command center will be live at `https://prahari.vercel.app`.

---

### Tier 6: Edge Robot Hardware Internet Tunneling (Tailscale / Cloudflare)

To allow the cloud-hosted backend and website to communicate securely with the ESP32-CAM on a mobile 4G/5G Wi-Fi hotspot:

#### Option A: Cloudflare Tunnels (Zero Trust - Recommended)
1. Install `cloudflared` on the local edge router or Raspberry Pi / laptop gateway:
   ```bash
   cloudflared tunnel create prahari-camera
   cloudflared tunnel route dns prahari-camera camera.prahari.live
   cloudflared tunnel run --url http://192.168.4.1:80
   ```
2. The live ESP32-CAM video stream is now globally accessible via HTTPS at `https://camera.prahari.live/video`.

#### Option B: Tailscale Mesh VPN
1. Install Tailscale on the Edge gateway and Render container.
2. Join both to your private tailnet `tailscale up`.
3. Directly route traffic via internal 100.x.x.x IPs without exposing any open ports.

---

## 4. Production Environment Variables Reference Matrix

| Variable Name | Environment | Sample Value | Secret? | Description |
| :--- | :---: | :--- | :---: | :--- |
| `NODE_ENV` | Backend | `production` | No | Enables production optimizations |
| `PORT` | Backend / AI | `4000` / `8000` | No | Listening port assigned by Render |
| `DATABASE_URL` | Backend | `mongodb+srv://...` | **YES** | MongoDB connection string |
| `AWS_ACCESS_KEY_ID` | Backend | `AKIA...` | **YES** | AWS IAM key with S3 PutObject |
| `AWS_SECRET_ACCESS_KEY` | Backend | `YYYY...` | **YES** | AWS Secret Key |
| `AWS_REGION` | Backend | `ap-south-1` | No | AWS S3 Bucket Region |
| `AWS_S3_BUCKET_NAME` | Backend | `prahari-image-storage-2026` | No | S3 Bucket Name |
| `JWT_SECRET` | Backend | `super-secret-key-2026` | **YES** | Authentication signature key |
| `NEXT_PUBLIC_API_URL` | Frontend | `https://api.prahari.app` | No | Backend REST base URL |
| `NEXT_PUBLIC_SOCKET_URL` | Frontend | `https://api.prahari.app` | No | Backend WebSocket URL |
| `NEXT_PUBLIC_ROBOT_CAMERA_STREAM_URL` | Frontend | `https://cam.prahari.app/video` | No | Live MJPEG stream URL |

---

## 5. Health Monitoring & Zero-Downtime Verification

Once deployed, set up an [UptimeRobot](https://uptimerobot.com) or Render Health Check monitor on these endpoints:

| Endpoint | Method | Expected Code | Purpose |
| :--- | :---: | :---: | :--- |
| `/health` | `GET` | `200 OK` | Verifies Backend, MongoDB, S3, and Socket.IO |
| `/api/camera/snapshot-status` | `GET` | `200 OK` | Verifies camera frame availability & S3 upload capability |
| `/api/ai/debug` | `GET` | `200 OK` | Verifies AI perception tracker & YOLO model health |
| `/api/dev/test-s3` | `POST` | `200 OK` | Verifies S3 PutObject and signed URL creation |

---

## 6. Troubleshooting Cloud Deployments

| Symptom | Probable Cause | Action |
| :--- | :--- | :--- |
| **WebSocket connection fails on Vercel** | Socket.IO requires a stateful server | Ensure `NEXT_PUBLIC_SOCKET_URL` points to Render (`https://...`), not Vercel serverless routes |
| **S3 Upload Failed** | Invalid IAM credentials or CORS | Verify `AWS_ACCESS_KEY_ID` and check that the bucket name matches `AWS_S3_BUCKET_NAME` |
| **Live Stream Blank in HTTPS** | Mixed content blocked (HTTP stream on HTTPS site) | Use Cloudflare Tunnel or an SSL reverse proxy (`https://...`) for the camera stream |
| **Database disconnected** | MongoDB Atlas IP access blocked | Check that `0.0.0.0/0` is added to Atlas Network Access Whitelist |
