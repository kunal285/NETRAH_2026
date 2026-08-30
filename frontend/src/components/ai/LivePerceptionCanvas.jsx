"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useRobot } from '../../context/RobotContext';
import {
  Eye,
  Camera,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../../lib/api.js';

export const LivePerceptionCanvas = ({ videoRef }) => {
  const {
    liveDetections,
    isLiveAiMode,
    fpsMetrics,
    activeAmbulance,
    crosswalkRisk,
    liveUltrasonic,
    liveMotors,
    activeMediaStream,
    cameraActive,
    cameraSource,
  } = useRobot();

  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const videoDisplayRef = useRef(null);
  const [showHUD, setShowHUD] = useState(true);
  const [showLanes, setShowLanes] = useState(true);
  const [showCrosswalk, setShowCrosswalk] = useState(true);
  const [savedSnapshot, setSavedSnapshot] = useState(null);

  // Attach live MediaStream to video element so real camera footage displays
  useEffect(() => {
    if (videoDisplayRef.current) {
      if (activeMediaStream) {
        videoDisplayRef.current.srcObject = activeMediaStream;
        videoDisplayRef.current.play().catch(() => {});
      } else {
        videoDisplayRef.current.srcObject = null;
      }
    }
  }, [activeMediaStream]);

  // Render bounding box overlays and HUD directly on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // 1. Draw Virtual Lanes Overlay
    if (showLanes) {
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 6]);

      for (let i = 1; i <= 3; i++) {
        const x = (width / 4) * i;
        ctx.beginPath();
        ctx.moveTo(x, height * 0.25);
        ctx.lineTo(x, height);
        ctx.stroke();

        ctx.font = '10px monospace';
        ctx.fillStyle = 'rgba(220, 252, 231, 0.8)';
        ctx.fillText(`LANE ${i}`, x - 20, height * 0.32);
      }
      ctx.setLineDash([]);
    }

    // 2. Draw Crosswalk Safety Zone
    if (showCrosswalk) {
      const zMinX = width * 0.10;
      const zMinY = height * 0.50;
      const zW = width * 0.80;
      const zH = height * 0.35;

      ctx.fillStyle = crosswalkRisk.risk_level === 'VIOLATION / RISK' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.10)';
      ctx.fillRect(zMinX, zMinY, zW, zH);
      ctx.strokeStyle = crosswalkRisk.risk_level === 'VIOLATION / RISK' ? '#ef4444' : '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(zMinX, zMinY, zW, zH);

      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = crosswalkRisk.risk_level === 'VIOLATION / RISK' ? '#ef4444' : '#f59e0b';
      ctx.fillText('CROSSWALK SAFETY ZONE', zMinX + 8, zMinY + 16);
    }

    // 3. Render Object Detections & Bounding Boxes
    if (liveDetections && liveDetections.length > 0) {
      liveDetections.forEach((det) => {
        const bbox = det.bbox || [0.2, 0.3, 0.3, 0.3];
        const x = bbox[0] * width;
        const y = bbox[1] * height;
        const w = bbox[2] * width;
        const h = bbox[3] * height;

        const cls = (det.class_name || 'car').toLowerCase();
        const confPercent = Math.round((det.confidence || 0.9) * 100);
        const trackId = det.track_id ? `#${det.track_id}` : '';

        let strokeColor = '#10b981'; // Emerald for Vehicles
        let fillColor = 'rgba(16, 185, 129, 0.18)';

        if (cls.includes('ambulance')) {
          strokeColor = '#ef4444'; // Red for Ambulance
          fillColor = 'rgba(239, 68, 68, 0.25)';
        } else if (cls.includes('plate') || det.plate) {
          strokeColor = '#22c55e'; // Green for ANPR Plates
          fillColor = 'rgba(34, 197, 94, 0.22)';
        } else if (cls.includes('person') || cls.includes('pedestrian')) {
          strokeColor = '#8b5cf6'; // Purple for Pedestrians
          fillColor = 'rgba(139, 92, 246, 0.20)';
        } else if (cls.includes('truck') || cls.includes('bus')) {
          strokeColor = '#f59e0b'; // Amber for Heavy Vehicles
          fillColor = 'rgba(245, 158, 11, 0.20)';
        }

        // Draw Bounding Box
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2;
        ctx.fillStyle = fillColor;
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);

        // Draw Label Tag
        const labelText = det.plate?.text
          ? `PLATE: ${det.plate.text} (${confPercent}%)`
          : `${cls.toUpperCase()} ${trackId} (${confPercent}%)`;

        ctx.font = 'bold 11px monospace';
        const textMetrics = ctx.measureText(labelText);
        const tagW = textMetrics.width + 10;
        const tagH = 18;

        ctx.fillStyle = strokeColor;
        ctx.fillRect(x, Math.max(0, y - tagH), tagW, tagH);

        ctx.fillStyle = '#ffffff';
        ctx.fillText(labelText, x + 5, Math.max(12, y - 4));
      });
    }

    // 4. Optical Center Reticle HUD
    if (showHUD) {
      const cx = width / 2;
      const cy = height / 2;

      ctx.strokeStyle = 'rgba(52, 211, 153, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, 32, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx - 40, cy);
      ctx.lineTo(cx - 10, cy);
      ctx.moveTo(cx + 10, cy);
      ctx.lineTo(cx + 40, cy);
      ctx.moveTo(cx, cy - 40);
      ctx.lineTo(cx, cy - 10);
      ctx.moveTo(cx, cy + 10);
      ctx.lineTo(cx, cy + 40);
      ctx.stroke();
    }
  }, [liveDetections, showHUD, showLanes, showCrosswalk, crosswalkRisk]);

  const captureSnapshot = async () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.90);
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const image = await api.uploadCapturedImage(blob, {
        cameraSource: cameraSource || 'live_stream',
        imageType: 'detection evidence',
      });
      setSavedSnapshot(image.imageUrl);
      setTimeout(() => setSavedSnapshot(null), 3000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4 font-sans">
      {/* Header Viewport Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <Eye className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              LIVE TRAFFIC PERCEPTION VIEWPORT
            </div>
            <div className="text-[11px] text-slate-500">Real-time Multi-Lane Detection</div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <button
            onClick={() => setShowLanes(!showLanes)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
              showLanes ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}
          >
            Lanes
          </button>
          <button
            onClick={() => setShowCrosswalk(!showCrosswalk)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
              showCrosswalk ? 'bg-amber-50 border-amber-300 text-amber-800' : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}
          >
            Crosswalk
          </button>
          <button
            onClick={() => setShowHUD(!showHUD)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
              showHUD ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}
          >
            HUD
          </button>

          <button
            id="btn-take-snapshot"
            onClick={captureSnapshot}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs flex items-center gap-1 shadow-xs cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Snap</span>
          </button>
        </div>
      </div>

      {/* Main Viewport Container */}
      <div
        ref={containerRef}
        className="relative aspect-video w-full rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center shadow-inner group"
      >
        {/* Live Camera Video Stream Footage */}
        <video
          ref={videoDisplayRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover z-0 transition-opacity duration-300 ${
            activeMediaStream ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        />

        {/* Synthetic Road / Optical Stream backdrop if video not attached */}
        <div className={`absolute inset-0 flex flex-col justify-between p-4 pointer-events-none z-10 ${
          activeMediaStream ? 'bg-transparent' : 'bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900'
        }`}>
          <div className="flex justify-between items-start text-[10px] text-slate-400">
            <div className="bg-slate-900/90 backdrop-blur px-2.5 py-1 rounded-md border border-slate-700 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${activeMediaStream ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
              <span>SRC: {cameraSource?.toUpperCase() || 'LOCAL CAM'}</span>
            </div>
            <div className="bg-slate-900/90 backdrop-blur px-2.5 py-1 rounded-md border border-slate-700 text-emerald-400 font-bold">
              {isLiveAiMode ? 'LIVE YOLOv8 INFERENCE' : 'DEMO SYNTHETIC BENCH'}
            </div>
          </div>

          {/* If no objects detected, show clean HUD status */}
          {(!liveDetections || liveDetections.length === 0) && (
            <div className="text-center space-y-1 z-10">
              <div className="inline-block px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-xs text-slate-300 font-semibold">
                {cameraActive ? 'Scanning roadway — No objects detected' : 'Camera stream offline — Click Start Camera'}
              </div>
            </div>
          )}

          {/* Bottom HUD Bar */}
          <div className="flex justify-between items-end text-[10px] text-slate-400 z-10 font-mono">
            <div>DIST: {liveUltrasonic?.frontDistanceM ?? '2.85'}m</div>
            <div>RADAR: {liveUltrasonic?.status || 'CLEAR'}</div>
            <div>SPEED: {liveMotors?.left?.pwm ?? 0}% PWM</div>
          </div>
        </div>

        {/* Live Canvas Overlay */}
        <canvas
          ref={canvasRef}
          width={640}
          height={360}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none z-20"
        />

        {savedSnapshot && (
          <div className="absolute top-4 right-4 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-bold shadow-lg animate-fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>Snapshot Saved</span>
          </div>
        )}
      </div>
    </div>
  );
};
