"use client";

import React, { useState } from 'react';
import { useRobot } from '../../context/RobotContext';
import { StatusBadge } from '../common/StatusBadge';
import { VirtualJoystick } from '../control/VirtualJoystick.jsx';
import { LiveAiOverlay } from '../vision/LiveAiOverlay.jsx';
import {
  Battery,
  ShieldCheck,
  ShieldAlert,
  Gauge,
  Eye,
  BrainCircuit,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Square,
  Radio,
  Gamepad2,
  Camera,
  Activity,
  Compass,
  MapPin,
  Wifi,
  Thermometer,
  Zap,
  AlertTriangle,
  RotateCcw,
  Maximize2,
  Sparkles,
  Siren,
  FileText,
  Car,
  VideoOff,
  RefreshCw,
} from 'lucide-react';

export const DashboardView = () => {
  const {
    robotStatus,
    controlMode,
    changeControlMode,
    liveBattery,
    liveMotors,
    liveUltrasonic,
    liveGps,
    liveImu,
    liveWifi,
    emergencyStop,
    commandStatus,
    sendControlCommand,
    emergencyStopRobot,
    resetSafety,
    setActiveTab,
    triggerAIDetection,
    formatFreshness,
    dataSource,
    selectedRobotId,
    latestDetection,
    activeAmbulance,
    socketConnected,
    robotCameraStreamUrl,
    counters,
    liveEvents,
  } = useRobot();

  const [showAiOverlay, setShowAiOverlay] = useState(true);
  const [streamError, setStreamError] = useState(false);
  const [streamKey, setStreamKey] = useState(Date.now());
  const isEstop = Boolean(emergencyStop);

  const streamSrc =
    robotCameraStreamUrl ||
    process.env.NEXT_PUBLIC_ROBOT_CAMERA_STREAM_URL ||
    '/api/camera/stream';

  const handleMove = (cmd) => {
    if (isEstop || controlMode === 'RC') return;
    sendControlCommand(cmd, 65).catch((e) => console.error('Move command failed', e));
  };

  const handleStop = () => {
    sendControlCommand('STOP', 0).catch((e) => console.error('Stop command failed', e));
  };

  return (
    <div id="dashboard-view" className="space-y-4 sm:space-y-6 max-w-7xl mx-auto font-sans select-none pb-8">
      {/* 1. Top Section: Operator Status & Connection Indicators */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-black text-slate-900 tracking-tight">PRAHARI</span>
              <span
                className={`text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider inline-flex items-center gap-1.5 ${
                  robotStatus === 'ONLINE'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${robotStatus === 'ONLINE' ? 'bg-emerald-600 animate-pulse' : 'bg-rose-600'}`} />
                <span>{robotStatus === 'ONLINE' ? 'PRAHARI ONLINE' : 'PRAHARI OFFLINE'}</span>
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-0.5">
              Node: <strong className="text-slate-800 font-bold">{selectedRobotId}</strong> • {dataSource}
            </div>
          </div>

          {/* Mode Switcher Chips */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200 w-full sm:w-auto justify-between sm:justify-start">
            {['WEB', 'RC', 'AUTO', 'DEMO'].map((mode) => (
              <button
                key={mode}
                id={`btn-mode-chip-${mode.toLowerCase()}`}
                onClick={() => changeControlMode(mode)}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer min-h-[36px] flex items-center justify-center ${
                  controlMode === mode
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 active:bg-slate-200'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* 5-Pill Connection Health Strip */}
        <div className="pt-2.5 border-t border-slate-100 grid grid-cols-5 gap-1.5 text-center text-[10px] font-bold">
          <div className={`p-1.5 rounded-lg border flex flex-col items-center gap-0.5 ${
            robotStatus === 'ONLINE' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${robotStatus === 'ONLINE' ? 'bg-emerald-600 animate-pulse' : 'bg-slate-400'}`} />
            <span>Robot</span>
          </div>
          <div className={`p-1.5 rounded-lg border flex flex-col items-center gap-0.5 ${
            controlMode === 'RC'
              ? 'bg-purple-50 text-purple-800 border-purple-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${controlMode === 'RC' ? 'bg-purple-600' : 'bg-emerald-600'}`} />
            <span>RC</span>
          </div>
          <div className={`p-1.5 rounded-lg border flex flex-col items-center gap-0.5 ${
            socketConnected ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${socketConnected ? 'bg-emerald-600' : 'bg-rose-600'}`} />
            <span>Socket</span>
          </div>
          <div className={`p-1.5 rounded-lg border flex flex-col items-center gap-0.5 ${
            !streamError ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${!streamError ? 'bg-emerald-600' : 'bg-slate-400'}`} />
            <span>Camera</span>
          </div>
          <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 flex flex-col items-center gap-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            <span>AI Suite</span>
          </div>
        </div>
      </div>

      {/* 2. Dynamic Real-Time Counters Strip (4 Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">TOTAL DETECTIONS</span>
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
            {counters.totalDetections}
          </div>
          <div className="text-[10px] text-slate-500">Real-time Streamed Events</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">ANPR PLATES</span>
            <FileText className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 font-mono">
            {counters.anprPlates}
          </div>
          <div className="text-[10px] text-slate-500">HSRP OCR Indexed</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">AMBULANCE TRIGGERS</span>
            <Siren className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-600 font-mono">
            {counters.ambulanceTriggers}
          </div>
          <div className="text-[10px] text-slate-500">Emergency Corridor Events</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">VEHICLES CLASSIFIED</span>
            <Car className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
            {counters.vehiclesClassified}
          </div>
          <div className="text-[10px] text-slate-500">YOLO Multi-Class Tracking</div>
        </div>
      </div>

      {/* 3. Embedded Live Camera + Direct Teleoperation Driving Pad */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left / Top: Live Optical Video Feed */}
        <div className="lg:col-span-7 space-y-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-extrabold text-slate-900 uppercase">LIVE ROBOT CAMERA STREAM</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAiOverlay(!showAiOverlay)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                    showAiOverlay
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  AI: {showAiOverlay ? 'ON' : 'OFF'}
                </button>
                <button
                  onClick={() => setActiveTab('vision')}
                  className="p-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 cursor-pointer"
                  title="Full Screen Camera"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Video Viewport Container */}
            <div className="relative aspect-video w-full rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center group shadow-inner">
              {/* Actual Live MJPEG Robot Feed */}
              {streamSrc && !streamError && (
                <img
                  key={streamKey}
                  src={`${streamSrc}${streamSrc.includes('?') ? '&' : '?'}_t=${streamKey}`}
                  alt="PRAHARI Mast Camera Feed"
                  onLoad={() => setStreamError(false)}
                  onError={() => setStreamError(true)}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}

              {streamError && (
                <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-4 text-center space-y-2 z-20">
                  <VideoOff className="w-6 h-6 text-rose-500" />
                  <div className="text-xs font-bold text-rose-400">CAMERA OFFLINE</div>
                  <button
                    onClick={() => {
                      setStreamError(false);
                      setStreamKey(Date.now());
                    }}
                    className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Retry</span>
                  </button>
                </div>
              )}

              <div className="absolute inset-0 z-10 flex flex-col justify-between p-3 select-none pointer-events-none">
                {/* Top HUD */}
                <div className="flex justify-between items-start text-[10px] text-slate-300 font-mono">
                  <div className="bg-black/70 backdrop-blur-md px-2 py-0.5 rounded border border-white/10 flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${!streamError ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                    <span>{!streamError ? '● LIVE MAST CAM' : 'OFFLINE'}</span>
                  </div>
                  <div className="bg-black/70 backdrop-blur-md px-2 py-0.5 rounded border border-white/10 text-emerald-400 font-bold">
                    30 FPS • 1080p
                  </div>
                </div>

                {/* Reticle & Live Dynamic AI Overlay */}
                {showAiOverlay && <LiveAiOverlay />}

                {/* Bottom HUD */}
                <div className="flex justify-between items-end text-[10px] text-slate-300 font-mono">
                  <div className="bg-black/70 backdrop-blur-md px-2 py-0.5 rounded border border-white/10">
                    RADAR: <strong className="text-emerald-400">{liveUltrasonic.frontDistanceCm || 87}cm</strong>
                  </div>
                  <div className="bg-black/70 backdrop-blur-md px-2 py-0.5 rounded border border-white/10">
                    PACK: <strong className="text-emerald-400">{liveBattery.voltage || '35.8'}V</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Demo Test Action Buttons */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-1.5">
                <button
                  id="btn-dash-anpr-sim"
                  onClick={() => triggerAIDetection('anpr')}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-bold transition cursor-pointer min-h-[36px]"
                >
                  + ANPR Plate
                </button>
                <button
                  id="btn-dash-amb-sim"
                  onClick={() => triggerAIDetection('ambulance')}
                  className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold transition cursor-pointer min-h-[36px]"
                >
                  + Ambulance
                </button>
              </div>

              <button
                id="btn-open-full-control"
                onClick={() => setActiveTab('control')}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition cursor-pointer min-h-[40px]"
              >
                <Gamepad2 className="w-4 h-4" />
                <span>DRIVE ROBOT →</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right / Bottom: Quick Teleoperation Driving Pad */}
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3 flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-extrabold text-slate-900 uppercase">DIFFERENTIAL JOYSTICK</span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                controlMode === 'RC'
                  ? 'bg-purple-50 text-purple-800 border-purple-200'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}>
                {controlMode === 'RC' ? '🎮 RC PRIORITY' : '📱 WEB / MOBILE ACTIVE'}
              </span>
            </div>

            {/* If RC mode active notice */}
            {controlMode === 'RC' && (
              <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs font-bold text-center">
                🎮 RC TRANSMITTER HAS CONTROL PRIORITY
                <div className="text-[11px] text-purple-700 font-normal mt-0.5">
                  Web touch controls are disabled for operator safety.
                </div>
              </div>
            )}

            {/* Differential Drive Virtual Joystick */}
            <div className="flex justify-center py-2">
              <VirtualJoystick
                disabled={isEstop || controlMode === 'RC'}
                onDrive={(vector) => {
                  if (isEstop || controlMode === 'RC') return;
                  const { throttle, steering } = vector;
                  let cmd = 'DRIVE_VECTOR';
                  if (throttle > 0.3 && Math.abs(steering) <= 0.3) cmd = 'FORWARD';
                  else if (throttle < -0.3 && Math.abs(steering) <= 0.3) cmd = 'REVERSE';
                  else if (steering < -0.3 && Math.abs(throttle) <= 0.3) cmd = 'LEFT';
                  else if (steering > 0.3 && Math.abs(throttle) <= 0.3) cmd = 'RIGHT';
                  sendControlCommand(cmd, 60, vector).catch(() => {});
                }}
                onStop={() => sendControlCommand('STOP', 0).catch(() => {})}
              />
            </div>

            {/* Motor Currents Strip */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs font-mono">
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[9px] text-slate-400 uppercase font-bold">LEFT REAR MOTOR</div>
                <div className="text-xs font-bold text-slate-900">
                  {liveMotors.left.pwm != null ? `PWM ${liveMotors.left.pwm}` : 'PWM 0'}
                </div>
                <div className="text-[10px] text-slate-500">
                  {liveMotors.left.current != null ? `${liveMotors.left.current}A` : '0.0A'}
                </div>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[9px] text-slate-400 uppercase font-bold">RIGHT REAR MOTOR</div>
                <div className="text-xs font-bold text-slate-900">
                  {liveMotors.right.pwm != null ? `PWM ${liveMotors.right.pwm}` : 'PWM 0'}
                </div>
                <div className="text-[10px] text-slate-500">
                  {liveMotors.right.current != null ? `${liveMotors.right.current}A` : '0.0A'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
