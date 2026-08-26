"use client";

import React from 'react';
import { useRobot } from '../../context/RobotContext';
import { StatusBadge } from '../common/StatusBadge';
import {
  ShieldAlert,
  Battery,
  Zap,
  Radio,
  Wifi,
  WifiOff,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

export const Header = () => {
  const { robotState, telemetry, socketConnected, emergencyStop, resetSafety, setMode } = useRobot();

  const getBatteryVariant = () => {
    if (telemetry.batteryPercentage > 50) return 'green';
    if (telemetry.batteryPercentage > 20) return 'amber';
    return 'red';
  };

  const getSafetyVariant = () => {
    if (robotState.safety.state === 'DANGER' || robotState.safety.emergencyStop) return 'red';
    if (robotState.safety.state === 'WARNING') return 'amber';
    return 'green';
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 font-mono text-slate-200 select-none sticky top-0 z-30">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        {/* Left: Brand / Title */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 p-0.5 flex items-center justify-center shadow-lg shadow-sky-950/50">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center font-black text-sky-400 text-base tracking-tighter">
              P
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-white text-base tracking-wider">PRAHARI</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800/80 font-bold hidden sm:inline-block">
                NETRA ROBOTICS
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block">
              Autonomous & RC-Assisted Traffic-Police Platform
            </p>
          </div>
        </div>

        {/* Center: System Telemetry Pills (Desktop / Tablet) */}
        <div className="hidden lg:flex items-center gap-3">
          {/* Connection Status */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs">
            {socketConnected ? (
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            )}
            <span className="text-slate-400">Telemetry:</span>
            <span className={socketConnected ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
              {socketConnected ? '50Hz LIVE' : 'OFFLINE'}
            </span>
          </div>

          {/* Battery State */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs">
            <Battery className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-slate-400">36V Pack:</span>
            <span className="text-white font-bold">{telemetry.batteryVoltage}V</span>
            <span className="text-slate-500">({telemetry.batteryPercentage}%)</span>
          </div>

          {/* Current Mode Toggle */}
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-950 border border-slate-800 text-xs">
            {['WEB', 'RC', 'AUTO', 'DEMO'].map((mode) => (
              <button
                key={mode}
                onClick={() => setMode(mode)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                  robotState.mode === mode
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {robotState.demoMode && (
            <div className="px-2 py-1 rounded-md bg-amber-500/15 border border-amber-500/40 text-[10px] font-black text-amber-300 uppercase tracking-wider">
              DEMO MODE
            </div>
          )}

          {/* Safety Status Pill */}
          <StatusBadge
            label={robotState.safety.emergencyStop ? 'E-STOPPED' : robotState.safety.state}
            variant={getSafetyVariant()}
            pulse={robotState.safety.emergencyStop}
          />
        </div>

        {/* Right: Master Emergency Stop Button */}
        <div className="flex items-center gap-2">
          {robotState.safety.emergencyStop ? (
            <button
              id="btn-header-reset-safety"
              onClick={() => resetSafety()}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg border border-emerald-400 transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">RESET SAFETY</span>
              <span className="sm:hidden">RESET</span>
            </button>
          ) : (
            <button
              id="btn-header-estop"
              onClick={() => emergencyStop('Operator Header E-Stop')}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-black text-xs sm:text-sm tracking-wider flex items-center gap-2 shadow-xl shadow-rose-950/60 border border-rose-400 animate-pulse cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>EMERGENCY STOP</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
