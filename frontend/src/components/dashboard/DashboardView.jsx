"use client";

import React from 'react';
import { useRobot } from '../../context/RobotContext';
import { StatusBadge } from '../common/StatusBadge';
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
  Sparkles,
  Radio,
  Gamepad2,
  Camera,
  Activity,
  Compass,
  MapPin,
  Wifi,
} from 'lucide-react';

export const DashboardView = () => {
  const {
    robotStatus,
    controlMode,
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
  } = useRobot();

  const isEstop = emergencyStop;

  const handleMove = (cmd) => {
    if (isEstop) return;
    sendControlCommand(cmd, 50).catch((e) => console.error('Move command failed', e));
  };

  const handleStop = () => {
    sendControlCommand('STOP', 0).catch((e) => console.error('Stop command failed', e));
  };

  return (
    <div id="dashboard-view" className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* 1. Hero Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
            <span className={`w-2 h-2 rounded-full ${robotStatus === 'ONLINE' ? 'bg-emerald-600 animate-ping' : 'bg-slate-400'}`} />
            <span>{selectedRobotId} • {dataSource}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Monitor. Detect. Respond.
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Real-time physical device telemetry, 36V Li-ion powertrain sampling, HC-SR04 obstacle radar, and multi-lane emergency green corridor preemption.
          </p>
        </div>

        {/* Hero CTAs */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button
            id="btn-hero-control"
            onClick={() => setActiveTab('control')}
            className="flex-1 md:flex-initial px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
          >
            <Gamepad2 className="w-4 h-4" />
            <span>LIVE CONTROL</span>
          </button>
          <button
            id="btn-hero-camera"
            onClick={() => setActiveTab('vision')}
            className="flex-1 md:flex-initial px-5 py-2.5 rounded-xl bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-600 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>VIEW CAMERA</span>
          </button>
        </div>
      </div>

      {/* 2. Top Metric Strip: Real Device Ingestion Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Robot Communication & Status */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">ROBOT STATUS</span>
            <StatusBadge
              label={robotStatus}
              variant={robotStatus === 'ONLINE' ? 'green' : 'slate'}
            />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">
            {robotStatus === 'ONLINE' ? 'LIVE CONNECTED' : 'ROBOT OFFLINE'}
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Mode: <strong className="text-slate-700 font-semibold">{controlMode}</strong></span>
            <span>Seen: <strong className="text-slate-700 font-semibold">{formatFreshness(liveWifi.lastHeartbeatAt).text}</strong></span>
          </div>
        </div>

        {/* Card 2: Real 36V Battery Pack */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">36V BATTERY PACK</span>
            <Battery className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700 tracking-tight font-mono">
              {liveBattery.voltage != null ? `${liveBattery.voltage} V` : 'N/A'}
            </span>
            <span className="text-xs font-semibold text-slate-500 font-mono">
              ({liveBattery.percentage != null ? `${liveBattery.percentage}%` : 'N/A'})
            </span>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Draw: <strong className="text-slate-700 font-semibold">{liveBattery.current != null ? `${liveBattery.current} A` : 'N/A'}</strong></span>
            <span>Freshness: <strong className="text-emerald-700 font-semibold">{formatFreshness(liveBattery.updatedAt).text}</strong></span>
          </div>
        </div>

        {/* Card 3: Real HC-SR04 Ultrasonic Radar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">FRONT RADAR</span>
            <StatusBadge
              label={liveUltrasonic.status}
              variant={liveUltrasonic.status === 'CLEAR' ? 'green' : liveUltrasonic.status === 'CRITICAL' ? 'red' : 'slate'}
            />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">
            {liveUltrasonic.frontDistanceM != null ? `${liveUltrasonic.frontDistanceM} m` : 'N/A'}
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Rear: <strong className="text-slate-700 font-semibold">{liveUltrasonic.rearDistanceM != null ? `${liveUltrasonic.rearDistanceM} m` : 'N/A'}</strong></span>
            <span>Freshness: <strong className="text-emerald-700 font-semibold">{formatFreshness(liveUltrasonic.updatedAt).text}</strong></span>
          </div>
        </div>

        {/* Card 4: Safety & Hardware E-Stop Interlock */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">SAFETY INTERLOCK</span>
            {isEstop ? (
              <ShieldAlert className="w-4 h-4 text-rose-600" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            )}
          </div>
          <div className={`text-2xl font-black tracking-tight ${isEstop ? 'text-rose-600' : 'text-emerald-700'}`}>
            {isEstop ? 'EMERGENCY STOP' : robotStatus === 'ONLINE' ? 'ARMED & SAFE' : 'INTERLOCK STANDBY'}
          </div>
          <div className="pt-2 border-t border-slate-100 text-xs text-slate-500 truncate">
            {isEstop ? 'Physical E-Stop Active — PWM Locked' : 'BTS7960 Drivers Nominal'}
          </div>
        </div>
      </div>

      {/* 3. Main Dashboard Layout: Camera Overview & Real-Time Teleoperation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Optical Camera Preview */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    OPTICAL SURVEILLANCE FEED
                  </div>
                  <div className="text-[11px] text-slate-500">Full HD 1080p Optical Sensor</div>
                </div>
              </div>
              <StatusBadge label="ONLINE • 30 FPS" variant="green" pulse={true} />
            </div>

            {/* Video Viewport Container */}
            <div className="relative aspect-video w-full rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center group shadow-inner">
              <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 flex flex-col justify-between p-4 pointer-events-none">
                <div className="flex justify-between items-start text-[10px] text-slate-400 z-10">
                  <div className="bg-slate-900/90 backdrop-blur px-2.5 py-1 rounded-md border border-slate-700 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>CAM: UVC_HOST_01</span>
                  </div>
                  <div className="bg-slate-900/90 backdrop-blur px-2.5 py-1 rounded-md border border-slate-700 text-emerald-400 font-bold">
                    YOLOv8 & ANPR ACTIVE
                  </div>
                </div>

                {/* Reticle */}
                <div className="relative w-full flex-1 flex items-center justify-center">
                  <div className="w-20 h-20 border border-emerald-500/30 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
                  </div>
                </div>

                <div className="flex justify-between items-end text-[10px] text-slate-400 z-10 font-mono">
                  <div>RADAR: {liveUltrasonic.frontDistanceM != null ? `${liveUltrasonic.frontDistanceM}m` : 'N/A'}</div>
                  <div>BATTERY: {liveBattery.voltage != null ? `${liveBattery.voltage}V` : 'N/A'}</div>
                  <div>MODE: {controlMode}</div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <button
                  id="btn-dash-test-anpr"
                  onClick={() => triggerAIDetection('anpr')}
                  className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold transition cursor-pointer"
                >
                  + Simulate ANPR Plate
                </button>
                <button
                  id="btn-dash-test-ambulance"
                  onClick={() => triggerAIDetection('ambulance')}
                  className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition cursor-pointer"
                >
                  + Trigger Ambulance
                </button>
              </div>

              <button
                id="btn-dash-view-stream"
                onClick={() => setActiveTab('vision')}
                className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>Full Camera View</span>
                <span>→</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Real Teleoperation D-Pad with Ack Status */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                  <Gauge className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    TELEOPERATION D-PAD
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Ack: <strong className={commandStatus === 'SUCCESS' ? 'text-emerald-700' : commandStatus === 'FAILED' ? 'text-rose-600' : 'text-slate-600'}>{commandStatus}</strong>
                  </div>
                </div>
              </div>
              <button
                id="btn-dash-open-control"
                onClick={() => setActiveTab('control')}
                className="text-xs text-emerald-700 hover:text-emerald-800 font-bold cursor-pointer"
              >
                Full Controls →
              </button>
            </div>

            {/* Directional Pad */}
            <div className="flex flex-col items-center justify-center gap-2.5 py-3">
              <button
                id="btn-dash-fwd"
                onPointerDown={() => handleMove('FORWARD')}
                onPointerUp={() => handleStop()}
                disabled={isEstop}
                className="w-16 h-12 rounded-xl bg-slate-100 hover:bg-emerald-600 active:bg-emerald-700 hover:text-white disabled:opacity-40 text-slate-800 font-bold flex flex-col items-center justify-center gap-0.5 border border-slate-200 shadow-xs transition cursor-pointer"
              >
                <ArrowUp className="w-4 h-4" />
                <span className="text-[9px]">FWD</span>
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  id="btn-dash-left"
                  onPointerDown={() => handleMove('LEFT')}
                  onPointerUp={() => handleStop()}
                  disabled={isEstop}
                  className="w-16 h-12 rounded-xl bg-slate-100 hover:bg-emerald-600 active:bg-emerald-700 hover:text-white disabled:opacity-40 text-slate-800 font-bold flex flex-col items-center justify-center gap-0.5 border border-slate-200 shadow-xs transition cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="text-[9px]">LEFT</span>
                </button>

                <button
                  id="btn-dash-stop"
                  onClick={() => handleStop()}
                  disabled={isEstop}
                  className="w-16 h-12 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-black flex flex-col items-center justify-center gap-0.5 shadow-xs transition cursor-pointer"
                >
                  <Square className="w-4 h-4" />
                  <span className="text-[9px]">STOP</span>
                </button>

                <button
                  id="btn-dash-right"
                  onPointerDown={() => handleMove('RIGHT')}
                  onPointerUp={() => handleStop()}
                  disabled={isEstop}
                  className="w-16 h-12 rounded-xl bg-slate-100 hover:bg-emerald-600 active:bg-emerald-700 hover:text-white disabled:opacity-40 text-slate-800 font-bold flex flex-col items-center justify-center gap-0.5 border border-slate-200 shadow-xs transition cursor-pointer"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span className="text-[9px]">RIGHT</span>
                </button>
              </div>

              <button
                id="btn-dash-rev"
                onPointerDown={() => handleMove('REVERSE')}
                onPointerUp={() => handleStop()}
                disabled={isEstop}
                className="w-16 h-12 rounded-xl bg-slate-100 hover:bg-emerald-600 active:bg-emerald-700 hover:text-white disabled:opacity-40 text-slate-800 font-bold flex flex-col items-center justify-center gap-0.5 border border-slate-200 shadow-xs transition cursor-pointer"
              >
                <ArrowDown className="w-4 h-4" />
                <span className="text-[9px]">REV</span>
              </button>
            </div>

            {/* Real Motor Current Readings */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
                <div className="text-[10px] text-slate-400 font-sans font-bold uppercase">LEFT (BTS7960)</div>
                <div className="text-sm font-black text-slate-900">{liveMotors.left.pwm != null ? `PWM ${liveMotors.left.pwm}` : 'N/A'}</div>
                <div className="text-[10px] text-slate-500">Current: {liveMotors.left.current != null ? `${liveMotors.left.current}A` : 'N/A'}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
                <div className="text-[10px] text-slate-400 font-sans font-bold uppercase">RIGHT (BTS7960)</div>
                <div className="text-sm font-black text-slate-900">{liveMotors.right.pwm != null ? `PWM ${liveMotors.right.pwm}` : 'N/A'}</div>
                <div className="text-[10px] text-slate-500">Current: {liveMotors.right.current != null ? `${liveMotors.right.current}A` : 'N/A'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Live GPS & IMU Hardware Ribbon */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* GPS Hardware Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">HARDWARE GPS COORDINATES</div>
              {liveGps.available ? (
                <div className="text-sm font-bold text-slate-900 font-mono">
                  {liveGps.latitude}, {liveGps.longitude} ({liveGps.speed} km/h • {liveGps.satellites || 0} Sats)
                </div>
              ) : (
                <div className="text-sm font-bold text-slate-400 font-mono">GPS UNAVAILABLE</div>
              )}
            </div>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">{formatFreshness(liveGps.updatedAt).text}</span>
        </div>

        {/* IMU 6-DOF Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">6-DOF IMU INERTIAL VECTORS</div>
              {liveImu.available ? (
                <div className="text-sm font-bold text-slate-900 font-mono">
                  Accel: [{liveImu.accel.x}, {liveImu.accel.y}, {liveImu.accel.z}]
                </div>
              ) : (
                <div className="text-sm font-bold text-slate-400 font-mono">IMU NOT AVAILABLE</div>
              )}
            </div>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">{formatFreshness(liveImu.updatedAt).text}</span>
        </div>
      </div>
    </div>
  );
};
