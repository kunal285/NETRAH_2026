"use client";

import React, { useState } from 'react';
import { useRobot } from '../../context/RobotContext';
import { VirtualJoystick } from '../control/VirtualJoystick.jsx';
import { LiveAiOverlay } from '../vision/LiveAiOverlay.jsx';
import { AiAssistantPanel } from '../ai/AiAssistantPanel.jsx';
import {
  Battery,
  ShieldCheck,
  ShieldAlert,
  Gauge,
  Eye,
  Camera,
  Activity,
  Zap,
  AlertTriangle,
  RefreshCw,
  VideoOff,
  Maximize2,
  Sliders,
  Cpu,
  Radio,
  Gamepad2,
  FileText,
  Siren,
  Car,
  OctagonAlert,
} from 'lucide-react';

export const DashboardView = () => {
  const {
    robotStatus,
    arduinoStatus,
    rcStatus,
    controlMode,
    changeControlMode,
    speedLimiter,
    setSpeedLimiter,
    liveBattery,
    liveMotors,
    liveUltrasonic,
    emergencyStop,
    sendControlCommand,
    emergencyStopRobot,
    resetSafety,
    setActiveTab,
    triggerAIDetection,
    selectedRobotId,
    socketConnected,
    robotCameraStreamUrl,
    counters,
    cameraSource,
    setCameraSource,
    liveMobileFrame,
    activeMediaStream,
    setActiveMediaStream,
    cameraActive,
    setCameraActive,
    activeFacingMode,
    cameraError,
    localCamStarting,
    startLocalCamera,
    stopLocalCamera,
    flipCamera,
  } = useRobot();

  const [showAiOverlay, setShowAiOverlay] = useState(true);
  const [streamError, setStreamError] = useState(false);
  const [streamKey, setStreamKey] = useState(Date.now());
  const isEstop = Boolean(emergencyStop);

  const localVideoRef = React.useRef(null);

  // Attach local media stream if running on this device
  React.useEffect(() => {
    if (localVideoRef.current) {
      if (activeMediaStream) {
        localVideoRef.current.srcObject = activeMediaStream;
        localVideoRef.current.play().catch(() => {});
      } else {
        localVideoRef.current.srcObject = null;
      }
    }
  }, [activeMediaStream]);

  const streamSrc =
    robotCameraStreamUrl ||
    process.env.NEXT_PUBLIC_ROBOT_CAMERA_STREAM_URL ||
    '/api/camera/stream';

  const speedLimits = [25, 50, 75, 100];

  const handleStop = () => {
    sendControlCommand('STOP', 0).catch(() => {});
  };

  const handleEStop = () => {
    emergencyStopRobot('Operator E-Stop Triggered from Dashboard').catch(() => {});
  };

  return (
    <div id="dashboard-view" className="space-y-4 sm:space-y-6 max-w-7xl mx-auto font-sans select-none pb-12">
      {/* 1. Header: Status & Connection Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-slate-900 tracking-tight">PRAHARI</span>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider inline-flex items-center gap-1.5 ${
                  robotStatus === 'ONLINE'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${robotStatus === 'ONLINE' ? 'bg-emerald-600 animate-pulse' : 'bg-rose-600'}`} />
                <span>{robotStatus === 'ONLINE' ? '🟢 ONLINE' : '🔴 OFFLINE'}</span>
              </span>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider inline-flex items-center gap-1 ${
                  controlMode === 'RC'
                    ? 'bg-purple-50 text-purple-800 border border-purple-200'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                }`}
              >
                <span>{controlMode === 'RC' ? '🎮 RC CONTROL' : '🌐 WEB CONTROL'}</span>
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-0.5">
              Node: <strong className="text-slate-800 font-bold">{selectedRobotId}</strong> • Arduino Nano + 2× BTS7960 + Mobile Camera (Primary)
            </div>
          </div>

          {/* Mode Selector */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200 w-full sm:w-auto justify-between sm:justify-start">
            {['WEB', 'RC', 'AUTO', 'DEMO'].map((mode) => (
              <button
                key={mode}
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

        {/* 4-Pill Device Status Strip */}
        <div className="pt-2.5 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-bold">
          <div
            className={`p-2 rounded-xl border flex items-center justify-center gap-2 ${
              arduinoStatus === 'CONNECTED'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${arduinoStatus === 'CONNECTED' ? 'bg-emerald-600' : 'bg-rose-600'}`} />
            <span>Arduino Nano: {arduinoStatus === 'CONNECTED' ? 'Connected' : 'Disconnected'}</span>
          </div>

          <div
            className={`p-2 rounded-xl border flex items-center justify-center gap-2 ${
              cameraActive || liveMobileFrame
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${cameraActive || liveMobileFrame ? 'bg-emerald-600 animate-pulse' : 'bg-amber-500'}`} />
            <span>Mobile Camera: {cameraActive || liveMobileFrame ? 'Live Feed Active' : 'Standby / Ready'}</span>
          </div>

          <div
            className={`p-2 rounded-xl border flex items-center justify-center gap-2 ${
              controlMode === 'RC'
                ? 'bg-purple-50 text-purple-800 border-purple-200'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${controlMode === 'RC' ? 'bg-purple-600' : 'bg-emerald-600'}`} />
            <span>RC: {controlMode === 'RC' ? 'Active' : 'Standby'}</span>
          </div>

          <div
            className={`p-2 rounded-xl border flex items-center justify-center gap-2 ${
              socketConnected
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-emerald-600' : 'bg-rose-600'}`} />
            <span>WebSocket: {socketConnected ? 'Connected' : 'Lost'}</span>
          </div>
        </div>
      </div>

      {/* 2. Embedded Camera Live Viewport (Mobile Camera Primary + ESP32 Option) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-extrabold text-slate-900 uppercase">
              {cameraSource === 'esp32' ? 'ESP32-CAM STREAM (OPTION)' : 'PRIMARY ROBOT CAMERA (MOBILE / LAPTOP)'}
            </span>
          </div>

          {/* Camera Source Selector & Action Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-[11px] font-bold">
              <button
                onClick={() => setCameraSource('mobile')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                  cameraSource === 'mobile' || cameraSource === 'rear_mobile'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>📱 Device / Mobile Cam</span>
              </button>
              <button
                onClick={() => {
                  setCameraSource('esp32');
                  setStreamError(false);
                }}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                  cameraSource === 'esp32' || cameraSource === 'robot'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>📷 ESP32-CAM</span>
              </button>
            </div>

            {cameraActive && (
              <>
                <button
                  onClick={flipCamera}
                  title="Flip front/laptop vs rear/mobile camera"
                  className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition cursor-pointer flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Flip ({activeFacingMode === 'user' ? 'Front' : 'Rear'})</span>
                </button>
                <button
                  onClick={stopLocalCamera}
                  className="px-2 py-1 rounded-lg text-[10px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition cursor-pointer flex items-center gap-1"
                >
                  <VideoOff className="w-3 h-3" />
                  <span>Stop</span>
                </button>
              </>
            )}

            <button
              onClick={() => setShowAiOverlay(!showAiOverlay)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                showAiOverlay ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}
            >
              AI HUD: {showAiOverlay ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={() => setActiveTab('vision')}
              className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 cursor-pointer"
              title="Full Camera View"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Camera Error / Permission Banner */}
        {cameraError && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-semibold flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{cameraError}</span>
            </div>
            <button
              onClick={() => startLocalCamera('user')}
              className="px-2.5 py-1 rounded-lg bg-amber-600 text-white text-[11px] font-bold hover:bg-amber-700 cursor-pointer shrink-0"
            >
              Retry Laptop Cam
            </button>
          </div>
        )}

        <div className="relative aspect-video w-full rounded-xl bg-slate-950 overflow-hidden border border-slate-800 shadow-inner flex items-center justify-center">
          {/* A. ESP32-CAM Option Stream */}
          {(cameraSource === 'esp32' || cameraSource === 'robot') && (
            <>
              {!streamError && (
                <img
                  src={`${streamSrc}${streamSrc.includes('?') ? '&' : '?'}_t=${streamKey}`}
                  alt="ESP32-CAM Live Stream"
                  onLoad={() => setStreamError(false)}
                  onError={() => setStreamError(true)}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}

              {streamError && (
                <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-4 text-center space-y-2 z-20">
                  <VideoOff className="w-8 h-8 text-amber-500" />
                  <div className="text-xs font-bold text-amber-400">📷 ESP32-CAM STREAM STANDBY / DISCONNECTED</div>
                  <p className="text-[11px] text-slate-400 max-w-sm">
                    ESP32-CAM is an optional secondary stream. Switch to <strong>Mobile / Laptop Camera</strong> for high-res primary patrol feed or retry connection.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => setCameraSource('mobile')}
                      className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer"
                    >
                      Switch to Device Camera
                    </button>
                    <button
                      onClick={() => {
                        setStreamError(false);
                        setStreamKey(Date.now());
                      }}
                      className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Retry Stream</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* B. Mobile / Laptop Camera Stream (Primary Default) */}
          {cameraSource !== 'esp32' && cameraSource !== 'robot' && (
            <>
              {/* Local MediaStream Video Track */}
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`absolute inset-0 w-full h-full object-cover ${activeMediaStream ? 'opacity-100 z-0' : 'opacity-0 pointer-events-none'}`}
              />

              {/* Remote Broadcasted Mobile Frame (from mounted smartphone node) */}
              {!activeMediaStream && liveMobileFrame?.image && (
                <img
                  src={liveMobileFrame.image}
                  alt="Live Mobile Phone Camera Feed"
                  className="absolute inset-0 w-full h-full object-cover z-0"
                />
              )}

              {/* Standby State with 1-click start */}
              {!activeMediaStream && !liveMobileFrame?.image && (
                <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-3 z-0">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-sm font-black text-slate-200">PRAHARI CAMERA FEED (OFFLINE / STANDBY)</div>
                    <p className="text-xs text-slate-400 max-w-sm mt-1">
                      Connect your laptop webcam, robot mast camera, or smartphone to stream live video directly to the command center.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    <button
                      onClick={() => startLocalCamera('user')}
                      disabled={localCamStarting}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>{localCamStarting ? 'Connecting...' : '💻 Connect Laptop Webcam'}</span>
                    </button>
                    <button
                      onClick={() => startLocalCamera('environment')}
                      disabled={localCamStarting}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>📱 Connect Mobile / Rear Cam</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('vision')}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer border border-slate-700"
                    >
                      <span>Vision Suite ↗</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Real-Time HUD Overlay */}
          <div className="absolute inset-0 z-10 flex flex-col justify-between p-3 select-none pointer-events-none">
            <div className="flex justify-between items-start text-[10px] text-slate-300 font-mono">
              <div className="bg-black/70 backdrop-blur-md px-2 py-0.5 rounded border border-white/10 flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${cameraActive || liveMobileFrame || (!streamError && (cameraSource === 'esp32' || cameraSource === 'robot')) ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
                <span>
                  {cameraSource === 'esp32' || cameraSource === 'robot'
                    ? (!streamError ? '● LIVE (ESP32-CAM)' : 'OFFLINE')
                    : cameraActive
                    ? '● LIVE (MOBILE CAMERA)'
                    : liveMobileFrame
                    ? '● LIVE (PHONE BROADCAST)'
                    : 'STANDBY'}
                </span>
              </div>
              <div className="bg-black/70 backdrop-blur-md px-2 py-0.5 rounded border border-white/10 text-emerald-400 font-bold">
                {cameraSource === 'esp32' ? 'ESP32 OPTION • 30 FPS' : 'MOBILE PRIMARY • 1080p HD'}
              </div>
            </div>

            {showAiOverlay && <LiveAiOverlay />}

            <div className="flex justify-between items-end text-[10px] text-slate-300 font-mono">
              <div className="bg-black/70 backdrop-blur-md px-2 py-0.5 rounded border border-white/10">
                OBSTACLE: <strong className="text-emerald-400">{liveUltrasonic.frontDistanceCm || 87}cm</strong>
              </div>
              <div className="bg-black/70 backdrop-blur-md px-2 py-0.5 rounded border border-white/10">
                VOLTAGE: <strong className="text-emerald-400">{liveBattery.voltage || '11.8'}V</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Real-Time Telemetry Strip (Section 43: 🔋 82% | ⚡ 11.8V | LEFT 65% | RIGHT 58% | 🚧 87cm | 🌡 42°C) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-center text-xs font-mono font-bold">
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs space-y-0.5">
          <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-center gap-1">
            <Battery className="w-3.5 h-3.5 text-emerald-600" />
            <span>BATTERY</span>
          </div>
          <div className="text-lg font-black text-slate-900">{liveBattery.percentage || 82}%</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs space-y-0.5">
          <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-center gap-1">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>VOLTAGE</span>
          </div>
          <div className="text-lg font-black text-slate-900">{liveBattery.voltage || '11.8'}V</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs space-y-0.5">
          <div className="text-[10px] text-slate-400 uppercase font-bold">LEFT REAR</div>
          <div className="text-lg font-black text-emerald-700">
            {liveMotors.left.pwm != null ? `${liveMotors.left.pwm}%` : '0%'}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs space-y-0.5">
          <div className="text-[10px] text-slate-400 uppercase font-bold">RIGHT REAR</div>
          <div className="text-lg font-black text-emerald-700">
            {liveMotors.right.pwm != null ? `${liveMotors.right.pwm}%` : '0%'}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs space-y-0.5">
          <div className="text-[10px] text-slate-400 uppercase font-bold">OBSTACLE</div>
          <div className="text-lg font-black text-slate-900">
            {liveUltrasonic.frontDistanceCm || 87} cm
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs space-y-0.5">
          <div className="text-[10px] text-slate-400 uppercase font-bold">TEMPERATURE</div>
          <div className="text-lg font-black text-slate-900">{liveBattery.temperature || 38}°C</div>
        </div>
      </div>

      {/* 4. Teleoperation Control Pad: Virtual Joystick + Speed Limiter + Emergency Stop */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4 max-w-xl mx-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Gauge className="w-5 h-5 text-emerald-600" />
            <div>
              <div className="text-sm font-black text-slate-900 uppercase">🕹️ DIFFERENTIAL DRIVE JOYSTICK</div>
              <div className="text-[11px] text-slate-500">60 FPS Smooth Visuals • 25Hz Arduino Dispatch</div>
            </div>
          </div>
          <span
            className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${
              controlMode === 'RC'
                ? 'bg-purple-50 text-purple-800 border-purple-200'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}
          >
            {controlMode === 'RC' ? '🎮 RC PRIORITY ACTIVE' : '📱 WEB TOUCH READY'}
          </span>
        </div>

        {controlMode === 'RC' && (
          <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs font-bold text-center">
            🎮 PHYSICAL RC TRANSMITTER HAS PRIORITY OVER WEB CONTROLS
          </div>
        )}

        {/* Game-Style Virtual Joystick */}
        <div className="flex justify-center py-2">
          <VirtualJoystick
            disabled={isEstop || controlMode === 'RC'}
            speed={speedLimiter}
            onDrive={(vector) => {
              if (isEstop || controlMode === 'RC') return;
              sendControlCommand('DRIVE_VECTOR', speedLimiter, vector).catch(() => {});
            }}
            onStop={() => sendControlCommand('STOP', 0).catch(() => {})}
          />
        </div>

        {/* Speed Limiter Selector (Section 28: 25%, 50%, 75%, 100%) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <span>SPEED LIMITER</span>
            <span className="text-emerald-700 font-mono">{speedLimiter}%</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {speedLimits.map((limit) => (
              <button
                key={limit}
                onClick={() => setSpeedLimiter(limit)}
                className={`py-2 rounded-xl text-xs font-black transition cursor-pointer border ${
                  speedLimiter === limit
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {limit}%
              </button>
            ))}
          </div>
        </div>

        {/* Direct Action Buttons: STOP and EMERGENCY STOP */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            id="btn-dash-stop"
            onClick={handleStop}
            className="py-3 rounded-xl bg-slate-800 hover:bg-slate-900 active:bg-black text-white font-extrabold text-xs shadow-xs transition cursor-pointer flex items-center justify-center gap-2"
          >
            <span>[ STOP MOTORS ]</span>
          </button>

          <button
            id="btn-dash-estop"
            onClick={handleEStop}
            className="py-3 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-extrabold text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-2"
          >
            <OctagonAlert className="w-4 h-4" />
            <span>[ 🛑 EMERGENCY STOP ]</span>
          </button>
        </div>

        {isEstop && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center justify-between">
            <span>⚠️ EMERGENCY STOP ACTIVE</span>
            <button
              onClick={() => resetSafety()}
              className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold cursor-pointer"
            >
              Reset Safety
            </button>
          </div>
        )}
      </div>

      {/* 5. Google Gemini AI Assistant & Incident Intelligence Panel */}
      <AiAssistantPanel />
    </div>
  );
};
