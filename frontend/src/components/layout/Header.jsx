"use client";

import React from 'react';
import { useRobot } from '../../context/RobotContext';
import { StatusBadge } from '../common/StatusBadge';
import {
  Wifi,
  WifiOff,
  Battery,
  Power,
  RotateCcw,
  Bell,
  Activity,
  ChevronDown,
  Shield,
  Radio,
} from 'lucide-react';

export const Header = () => {
  const {
    selectedRobotId,
    setSelectedRobotId,
    robotsList,
    robotStatus,
    controlMode,
    changeControlMode,
    liveBattery,
    emergencyStop,
    emergencyStopRobot,
    resetSafety,
    activeAmbulance,
    socketConnected,
    setIsDebugModalOpen,
  } = useRobot();

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 px-3 sm:px-6 h-14 select-none sticky top-0 z-30 shadow-xs font-sans flex items-center">
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Brand + Robot ID Selector + Online Status */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center shadow-xs text-white shrink-0">
            <Shield className="w-4 h-4 fill-white/20 stroke-white" />
          </div>

          <div className="flex items-center gap-2">
            <span className="font-black text-slate-900 text-sm sm:text-base tracking-tight">PRAHARI</span>

            {/* Compact Robot Selector */}
            <div className="relative inline-block">
              <select
                value={selectedRobotId}
                onChange={(e) => setSelectedRobotId(e.target.value)}
                className="appearance-none bg-slate-100 hover:bg-slate-200/70 border border-slate-200 text-slate-800 text-[11px] font-bold rounded-lg pl-2 pr-5 py-1 cursor-pointer focus:outline-none focus:border-emerald-600 transition"
              >
                {robotsList.map((r) => (
                  <option key={r.robotId} value={r.robotId}>
                    {r.robotId}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>

            {/* Online Status Pill */}
            <span
              className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider inline-flex items-center gap-1 ${
                robotStatus === 'ONLINE'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border border-slate-300'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${robotStatus === 'ONLINE' ? 'bg-emerald-600 animate-ping' : 'bg-slate-400'}`} />
              <span className="hidden sm:inline">{robotStatus}</span>
            </span>
          </div>
        </div>

        {/* Center / Right: Telemetry & Controls in a single clean row */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Real-time WebSocket Status & Latency */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-mono">
            <span className={`w-1.5 h-1.5 rounded-full ${socketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <span className="font-bold text-slate-700">{socketConnected ? 'WS LIVE' : 'CONNECTING'}</span>
            {socketConnected && <span className="text-emerald-700 font-bold ml-1">32ms</span>}
          </div>

          {/* Real Battery State */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono">
            <Battery className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="text-slate-900 font-bold">{liveBattery.voltage != null ? `${liveBattery.voltage}V` : '35.8V'}</span>
            <span className="text-slate-500 text-[10px] hidden sm:inline">({liveBattery.percentage != null ? `${liveBattery.percentage}%` : '82%'})</span>
          </div>

          {/* Compact Mode Selector */}
          <div className="hidden sm:flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-100 border border-slate-200 text-xs">
            {['WEB', 'RC', 'AUTO'].map((mode) => (
              <button
                key={mode}
                onClick={() => changeControlMode(mode)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                  controlMode === mode
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Active Ambulance Alert Indicator */}
          {activeAmbulance && (
            <span className="px-2 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold flex items-center gap-1 animate-pulse">
              <Bell className="w-3 h-3 text-rose-600" />
              <span className="hidden md:inline">Corridor</span>
            </span>
          )}

          {/* Packet Monitor Modal Button */}
          <button
            id="btn-open-debug-monitor"
            onClick={() => setIsDebugModalOpen(true)}
            className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold flex items-center gap-1 transition cursor-pointer shadow-xs"
            title="Live Packet Monitor"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-600" />
          </button>

          {/* Fast Emergency Stop Button */}
          {emergencyStop ? (
            <button
              id="btn-header-reset-safety"
              onClick={() => resetSafety()}
              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>RESET</span>
            </button>
          ) : (
            <button
              id="btn-header-estop"
              onClick={() => emergencyStopRobot('Header E-Stop')}
              className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-black text-xs flex items-center gap-1 shadow-xs transition cursor-pointer"
            >
              <Power className="w-3 h-3" />
              <span>E-STOP</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
