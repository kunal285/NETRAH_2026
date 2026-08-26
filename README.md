<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/cc4d1879-b1c8-4a73-8171-6d60f06d5422

## Run Locally

**Prerequisites:**  Node.js


1. Install frontend dependencies from `frontend/`:
   `cd frontend; npm install`
2. Install backend dependencies from `backend/`:
   `cd ..\backend; npm install`
3. Copy `frontend/.env.example` to `frontend/.env.local` and `backend/.env.example` to `backend/.env`.
4. Start the backend in one terminal:
   `cd backend; npm run dev`
5. Start the frontend in another terminal:
   `cd frontend; npm run dev`

The frontend runs at `http://localhost:3000` and proxies API requests to the standalone backend at `http://localhost:4000`.

## Persistent Backend Upgrade

Copy `.env.example` to `.env.local` (or `.env`) and set `MONGODB_URI` and `JWT_SECRET` to enable MongoDB persistence. The custom Node.js server keeps the existing DEMO MODE fallback when MongoDB is unavailable, while sampled telemetry, sensor readings, detections, alerts, safety events, control sessions, and image metadata are stored when connected.

Images are stored outside MongoDB under `IMAGE_STORAGE_PATH` by default. Use `POST /api/images/upload`, `GET /api/images/:id`, and `DELETE /api/images/:id` for image lifecycle operations. AI clients can submit records with `POST /api/detections`; live records are broadcast through Socket.IO without polling MongoDB.
# PRAHARI
