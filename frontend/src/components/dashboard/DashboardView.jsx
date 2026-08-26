"use client";

import React from 'react';
import { useRobot } from '../../context/RobotContext';
import { StatusBadge } from '../common/StatusBadge';
import {
  Battery,
  ShieldCheck,
  ShieldAlert,
  Gauge,
  Cpu,
  Eye,
  BrainCircuit,
  Activity,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Square,
  AlertTriangle,
  Zap,
  Sliders,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export const DashboardView = () => {
  const {
    robotState,
    telemetry,
    sendControl,
    stopRobot,
    emergencyStop,
    resetSafety,
    setActiveTab,
    triggerAIDetection,
    triggerScenario,
  } = useRobot();

  const isEstop = robotState.safety.emergencyStop;

  return (
    <div id="dashboard-view" className="space-y-6 max-w-7xl mx-auto font-mono">
      {/* Top Metric Strip: Critical 4-Card Hero */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* 1. Robot Status & Movement */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400">ROBOT STATUS</span>
            <StatusBadge
              label={robotState.status}
              variant={robotState.status === 'ONLINE' ? 'green' : 'amber'}
            />
          </div>
          <div className="text-lg font-black text-white">{robotState.movement}</div>
          <div className="text-[10px] text-slate-500 flex justify-between">
            <span>Mode: {robotState.mode}</span>
            <span>Speed: {robotState.speed}%</span>
          </div>
        </div>

        {/* 2. 36V Li-ion Energy Pack */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400">36V PACK VOLTAGE</span>
            <Battery className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-lg font-black text-emerald-400">
            {telemetry.batteryVoltage == null ? 'DATA UNAVAILABLE' : `${telemetry.batteryVoltage} V`}{' '}
            {telemetry.batteryVoltage != null && <span className="text-xs text-slate-400 font-normal">({telemetry.batteryPercentage ?? 0}%)</span>}
          </div>
          <div className="text-[10px] text-slate-500 flex justify-between">
            <span>Total Draw: {telemetry.totalCurrent} A</span>
            <span>Temp: {telemetry.batteryTemp}°C</span>
          </div>
        </div>

        {/* 3. Obstacle Proximity Radar */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400">OBSTACLE RADAR</span>
            <StatusBadge
              label={telemetry.obstacleStatus}
              variant={
                telemetry.obstacleStatus === 'CLEAR'
                  ? 'green'
                  : telemetry.obstacleStatus === 'WARNING'
                  ? 'amber'
                  : 'red'
              }
            />
          </div>
          <div className="text-lg font-black text-sky-400">
            {telemetry.obstacleDistance == null ? 'DATA UNAVAILABLE' : `${telemetry.obstacleDistance} m`}
          </div>
          <div className="text-[10px] text-slate-500">HC-SR04 Ultrasonic Range</div>
        </div>

        {/* 4. Safety Interlock State */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400">SAFETY STATE</span>
            {isEstop ? (
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            )}
          </div>
          <div className={`text-lg font-black ${isEstop ? 'text-rose-400' : 'text-emerald-400'}`}>
            {isEstop ? 'E-STOPPED' : robotState.safety.state}
          </div>
          <div className="text-[10px] text-slate-500 truncate">
            {isEstop ? 'Motors Locked (0% PWM)' : 'All interlocks armed'}
          </div>
        </div>
      </div>

      {/* Main Grid: Control & Live Camera Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Camera Stream & AI Overlay */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  FRONT OPTICAL STREAM (1080p UVC)
                </span>
              </div>
              <StatusBadge label="LIVE 30 FPS" variant="green" pulse={true} />
            </div>

            {/* Synthetic Video Viewport with HUD Canvas */}
            <div className="relative aspect-video w-full rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center group shadow-inner">
              {/* Synthetic Road / City View Background */}
              <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 flex flex-col justify-between p-4">
                {/* Sky / Distant Horizon */}
                <div className="flex justify-between items-start text-[10px] text-slate-400 z-10">
                  <div className="bg-slate-900/80 px-2 py-1 rounded border border-slate-700">
                    CAM: UVC_HOST_01 [HD]
                  </div>
                  <div className="bg-slate-900/80 px-2 py-1 rounded border border-slate-700 text-sky-400 font-bold">
                    ANPR & AMBULANCE DETECTOR ACTIVE
                  </div>
                </div>

                {/* Center Reticle & Bounding Box Overlays */}
                <div className="relative w-full h-36 flex items-center justify-center pointer-events-none">
                  {/* Simulated Detected Vehicle Bounding Box */}
                  <div className="absolute border-2 border-emerald-400 bg-emerald-500/10 rounded px-2 py-1 text-[10px] font-bold text-emerald-300 left-8 top-4">
                    <span>MH12AB1234 (94%)</span>
                  </div>

                  {/* Simulated Traffic Light Status Box */}
                  <div className="absolute border border-amber-400/70 bg-amber-500/10 rounded px-2 py-0.5 text-[9px] font-bold text-amber-300 right-12 bottom-6">
                    <span>LANE 1: CLEAR</span>
                  </div>

                  {/* Optical HUD Crosshair */}
                  <div className="w-20 h-20 border border-sky-500/30 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-sky-400 rounded-full animate-ping" />
                  </div>
                </div>

                {/* Bottom HUD Bar */}
                <div className="flex justify-between items-end text-[10px] text-slate-400 z-10">
                  <div>DIST: {telemetry.obstacleDistance}m</div>
                  <div>BATTERY: {telemetry.batteryVoltage}V</div>
                  <div>SPEED: {robotState.speed}% PWM</div>
                </div>
              </div>
            </div>

            {/* Quick Trigger Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2">
                <button
                  id="btn-dash-test-anpr"
                  onClick={() => triggerAIDetection('anpr')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 text-xs font-bold transition cursor-pointer"
                >
                  + Simulate ANPR Plate
                </button>
                <button
                  id="btn-dash-test-ambulance"
                  onClick={() => triggerAIDetection('ambulance')}
                  className="px-3 py-1.5 rounded-lg bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs font-bold transition cursor-pointer"
                >
                  + Trigger Ambulance
                </button>
              </div>

              <button
                id="btn-dash-view-stream"
                onClick={() => setActiveTab('vision')}
                className="text-xs text-sky-400 hover:text-sky-300 font-bold cursor-pointer"
              >
                Expand Vision View →
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Rapid Teleoperation D-Pad & Motor Vitals */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  QUICK TELEOPERATION
                </span>
              </div>
              <button
                id="btn-dash-open-control"
                onClick={() => setActiveTab('control')}
                className="text-xs text-sky-400 hover:text-sky-300 font-bold cursor-pointer"
              >
                Full Controls →
              </button>
            </div>

            {/* Directional Pad */}
            <div className="flex flex-col items-center justify-center gap-2 py-2">
              <button
                id="btn-dash-fwd"
                onPointerDown={() => sendControl('FORWARD')}
                onPointerUp={() => stopRobot()}
                disabled={isEstop}
                className="w-16 h-12 rounded-xl bg-slate-800 hover:bg-sky-600 active:bg-sky-700 disabled:opacity-40 text-white font-bold flex flex-col items-center justify-center gap-0.5 border border-slate-700 shadow-md transition cursor-pointer"
              >
                <ArrowUp className="w-4 h-4" />
                <span className="text-[9px]">FWD</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  id="btn-dash-left"
                  onPointerDown={() => sendControl('LEFT')}
                  onPointerUp={() => stopRobot()}
                  disabled={isEstop}
                  className="w-16 h-12 rounded-xl bg-slate-800 hover:bg-sky-600 active:bg-sky-700 disabled:opacity-40 text-white font-bold flex flex-col items-center justify-center gap-0.5 border border-slate-700 shadow-md transition cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="text-[9px]">LEFT</span>
                </button>

                <button
                  id="btn-dash-stop"
                  onClick={() => stopRobot()}
                  disabled={isEstop}
                  className="w-16 h-12 rounded-xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-black flex flex-col items-center justify-center gap-0.5 border border-rose-400 shadow-md transition cursor-pointer"
                >
                  <Square className="w-4 h-4" />
                  <span className="text-[9px]">STOP</span>
                </button>

                <button
                  id="btn-dash-right"
                  onPointerDown={() => sendControl('RIGHT')}
                  onPointerUp={() => stopRobot()}
                  disabled={isEstop}
                  className="w-16 h-12 rounded-xl bg-slate-800 hover:bg-sky-600 active:bg-sky-700 disabled:opacity-40 text-white font-bold flex flex-col items-center justify-center gap-0.5 border border-slate-700 shadow-md transition cursor-pointer"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span className="text-[9px]">RIGHT</span>
                </button>
              </div>

              <button
                id="btn-dash-rev"
                onPointerDown={() => sendControl('REVERSE')}
                onPointerUp={() => stopRobot()}
                disabled={isEstop}
                className="w-16 h-12 rounded-xl bg-slate-800 hover:bg-sky-600 active:bg-sky-700 disabled:opacity-40 text-white font-bold flex flex-col items-center justify-center gap-0.5 border border-slate-700 shadow-md transition cursor-pointer"
              >
                <ArrowDown className="w-4 h-4" />
                <span className="text-[9px]">REV</span>
              </button>
            </div>

            {/* Dual BTS7960 Driver Feedback */}
            <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-800 pt-3">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400 font-bold">LEFT MOTOR (MY1016)</div>
                <div className="text-sm font-black text-sky-400">{telemetry.leftMotorSpeed}% PWM</div>
                <div className="text-[10px] text-slate-500">Current: {telemetry.leftMotorCurrent}A</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400 font-bold">RIGHT MOTOR (MY1016)</div>
                <div className="text-sm font-black text-sky-400">{telemetry.rightMotorSpeed}% PWM</div>
                <div className="text-[10px] text-slate-500">Current: {telemetry.rightMotorCurrent}A</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
