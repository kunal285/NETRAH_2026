"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRobot } from '../../context/RobotContext';
import { StatusBadge } from '../common/StatusBadge';
import {
  Camera,
  Maximize2,
  RotateCcw,
  Sparkles,
  Eye,
  Sliders,
  AlertTriangle,
  RefreshCw,
  VideoOff,
  Radio,
} from 'lucide-react';
import { LiveAiOverlay } from './LiveAiOverlay.jsx';

export const VisionView = () => {
  const {
    robotCameraStreamUrl,
    robotCameraStatus,
    setRobotCameraStatus,
    liveUltrasonic,
    liveBattery,
    controlMode,
    triggerAIDetection,
    fpsMetrics,
    selectedRobotId,
    liveDetections,
  } = useRobot();

  const [showAiOverlay, setShowAiOverlay] = useState(true);
  const [showHUD, setShowHUD] = useState(true);
  const [isStreamLoading, setIsStreamLoading] = useState(true);
  const [streamError, setStreamError] = useState(false);
  const [streamKey, setStreamKey] = useState(Date.now()); // For forced reload/reconnection

  const streamSrc =
    robotCameraStreamUrl ||
    process.env.NEXT_PUBLIC_ROBOT_CAMERA_STREAM_URL ||
    '/api/camera/stream';

  const handleStreamLoad = () => {
    setIsStreamLoading(false);
    setStreamError(false);
    setRobotCameraStatus('LIVE');
  };

  const handleStreamError = () => {
    setIsStreamLoading(false);
    setStreamError(true);
    setRobotCameraStatus('OFFLINE');
  };

  const handleReconnect = () => {
    setIsStreamLoading(true);
    setStreamError(false);
    setStreamKey(Date.now());
  };

  return (
    <div id="vision-view" className="space-y-4 sm:space-y-6 max-w-6xl mx-auto font-sans select-none pb-8">
      {/* 1. Camera Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black text-slate-900 tracking-tight">
                PRAHARI LIVE MAST CAMERA
              </span>
              <span
                className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider inline-flex items-center gap-1.5 ${
                  !streamError
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${!streamError ? 'bg-emerald-600 animate-pulse' : 'bg-rose-600'}`} />
                <span>{!streamError ? '● LIVE' : 'CAMERA OFFLINE'}</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Target: <strong className="text-slate-800 font-bold">{selectedRobotId}</strong> • Source: MJPEG Live Video Stream
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleReconnect}
            className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            title="Reconnect Stream"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isStreamLoading ? 'animate-spin' : ''}`} />
            <span>Reconnect</span>
          </button>

          <button
            id="btn-toggle-ai-overlay"
            onClick={() => setShowAiOverlay(!showAiOverlay)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${
              showAiOverlay
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                : 'bg-slate-50 text-slate-700 border-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI: {showAiOverlay ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      {/* 2. Live Robot Camera Viewport */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="relative aspect-video w-full rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center shadow-inner group">
          {/* Actual MJPEG Stream from Raspberry Pi / Stream Server */}
          {streamSrc && !streamError && (
            <img
              key={streamKey}
              src={`${streamSrc}${streamSrc.includes('?') ? '&' : '?'}_t=${streamKey}`}
              alt="PRAHARI Robot Live Camera Feed"
              onLoad={handleStreamLoad}
              onError={handleStreamError}
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}

          {/* Loading Indicator */}
          {isStreamLoading && (
            <div className="absolute inset-0 z-20 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center text-slate-300 space-y-2">
              <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
              <div className="text-xs font-mono font-bold tracking-wider text-emerald-400">
                CONNECTING TO ROBOT CAMERA STREAM...
              </div>
            </div>
          )}

          {/* Error / Offline State */}
          {streamError && (
            <div className="absolute inset-0 z-20 bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500">
                <VideoOff className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-black text-rose-400 uppercase tracking-wide">
                  ROBOT CAMERA OFFLINE
                </div>
                <p className="text-xs text-slate-400 max-w-sm">
                  Cannot connect to live camera stream at <code className="text-slate-300 font-mono text-[11px]">{streamSrc}</code>. Ensure Raspberry Pi camera daemon is running.
                </p>
              </div>
              <button
                onClick={handleReconnect}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Connection</span>
              </button>
            </div>
          )}

          {/* Real-Time HUD Overlay */}
          <div className="absolute inset-0 z-10 flex flex-col justify-between p-3 select-none pointer-events-none">
            {/* Top HUD */}
            {showHUD && (
              <div className="flex justify-between items-start text-[10px] text-slate-300 font-mono">
                <div className="bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${!streamError ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                  <span className="font-bold">{!streamError ? 'LIVE ROBOT CAM' : 'NO FEED'}</span>
                  <span className="text-slate-500">|</span>
                  <span className="text-emerald-400 font-bold">{selectedRobotId}</span>
                </div>

                <div className="bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 text-emerald-400 font-bold">
                  {fpsMetrics.cameraFps} FPS • 1280x720 • AI ACTIVE
                </div>
              </div>
            )}

            {/* Dynamic AI Detection Boxes & Reticles */}
            {showAiOverlay && <LiveAiOverlay />}

            {/* Bottom HUD */}
            {showHUD && (
              <div className="flex justify-between items-end text-[10px] text-slate-300 font-mono">
                <div className="bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10">
                  OBSTACLE: <strong className="text-emerald-400">{liveUltrasonic.frontDistanceCm || 87}cm</strong>
                </div>
                <div className="bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10">
                  BATTERY: <strong className="text-emerald-400">{liveBattery.voltage || '35.8'}V</strong>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Simulation / Test Triggers */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <button
              onClick={() => triggerAIDetection('vehicle')}
              className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition cursor-pointer"
            >
              + Vehicle Detection
            </button>
            <button
              onClick={() => triggerAIDetection('anpr')}
              className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition cursor-pointer"
            >
              + ANPR Plate (HSRP)
            </button>
            <button
              onClick={() => triggerAIDetection('ambulance')}
              className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition cursor-pointer"
            >
              + Ambulance Trigger
            </button>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Stream Source: <span className="font-mono text-slate-800">{streamSrc}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
