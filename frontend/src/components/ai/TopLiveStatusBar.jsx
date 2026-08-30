"use client";

import React from 'react';
import { useRobot } from '../../context/RobotContext';
import {
  BrainCircuit,
  Camera,
  Wifi,
  WifiOff,
  Database,
  Volume2,
  VolumeX,
  Bot,
  Sparkles,
} from 'lucide-react';

export const TopLiveStatusBar = ({ cameraActive: propCameraActive, currentCameraName }) => {
  const {
    aiStatus,
    socketConnected,
    backendOnline,
    robotCameraStatus,
    audioSirenState,
    isLiveAiMode = true,
    setIsLiveAiMode,
    fpsMetrics,
    robotStatus,
    cameraActive: ctxCameraActive,
    cameraSource: ctxCameraSource,
  } = useRobot();

  const isCamActive = propCameraActive ?? (robotCameraStatus === 'LIVE' || ctxCameraActive);
  const camName = currentCameraName || ctxCameraSource || 'Robot Mast Cam';

  return (
    <div
      id="top-live-status-bar"
      className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3 font-sans"
    >
      {/* Top Strip: Real-time Service Health */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* AI Engine Status */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
            <BrainCircuit className={`w-3.5 h-3.5 ${aiStatus?.online ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span className="text-slate-500">AI Engine:</span>
            <span className={aiStatus?.online ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
              {aiStatus?.online ? 'ONLINE' : 'EDGE FALLBACK'}
            </span>
          </div>

          {/* Camera Status */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
            <Camera className={`w-3.5 h-3.5 ${isCamActive ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span className="text-slate-500">Camera:</span>
            <span className={isCamActive ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>
              {isCamActive ? `LIVE (${camName})` : 'OFFLINE'}
            </span>
          </div>

          {/* WebSocket Status */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
            {socketConnected ? (
              <Wifi className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-rose-500" />
            )}
            <span className="text-slate-500">Socket:</span>
            <span className={socketConnected ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>
              {socketConnected ? 'CONNECTED' : 'RECONNECTING'}
            </span>
          </div>

          {/* Database Status */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
            <Database className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-500">DB:</span>
            <span className={backendOnline ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>
              {backendOnline ? 'CONNECTED' : 'STANDALONE'}
            </span>
          </div>

          {/* Audio Microphone Status */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
            {audioSirenState?.active ? (
              <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span className="text-slate-500">Acoustic:</span>
            <span className={audioSirenState?.active ? 'text-emerald-700 font-bold' : 'text-slate-500 font-semibold'}>
              {audioSirenState?.active ? 'ARMED' : 'MUTED'}
            </span>
          </div>

          {/* Robot Connection */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
            <Bot className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-500">Robot:</span>
            <span className={robotStatus === 'ONLINE' ? 'text-emerald-700 font-bold' : 'text-slate-500 font-semibold'}>
              {robotStatus === 'ONLINE' ? 'ONLINE' : 'STANDBY'}
            </span>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center gap-2">
          {setIsLiveAiMode && (
            <button
              id="btn-toggle-live-mode"
              onClick={() => setIsLiveAiMode(!isLiveAiMode)}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs ${
                isLiveAiMode
                  ? 'bg-emerald-600 text-white'
                  : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isLiveAiMode ? 'MODE: LIVE AI' : 'MODE: DEMO BENCH'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Bottom Performance Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2 border-t border-slate-100">
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80">
          <span className="text-slate-500 text-[11px]">Inference FPS:</span>
          <span className="text-emerald-700 font-bold">{fpsMetrics?.inferenceFps || 28} FPS</span>
        </div>
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80">
          <span className="text-slate-500 text-[11px]">Camera FPS:</span>
          <span className="text-slate-900 font-bold">{fpsMetrics?.cameraFps || 30} FPS</span>
        </div>
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80">
          <span className="text-slate-500 text-[11px]">Latency:</span>
          <span className="text-emerald-700 font-bold">{fpsMetrics?.latencyMs || 12} ms</span>
        </div>
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80">
          <span className="text-slate-500 text-[11px]">Model:</span>
          <span className="text-slate-800 font-semibold truncate">YOLOv8 + HSRP OCR</span>
        </div>
      </div>
    </div>
  );
};
