"use client";

import React from 'react';
import { useRobot } from '../../context/RobotContext';
import {
  Battery,
  Power,
  RotateCcw,
  Bell,
  Activity,
  ChevronDown,
  Shield,
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
    <header
      id="prahari-header"
      className="bg-white/95 backdrop-blur-md border-b border-slate-200 px-2.5 sm:px-6 h-14 sm:h-16 select-none sticky top-0 z-30 shadow-xs font-sans flex items-center w-full max-w-full overflow-hidden"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-1.5 sm:gap-4 min-w-0">
        {/* Left: Brand + Compact Robot Selector */}
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 shrink">
          {/* PRAHARI Shield Icon */}
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-600 flex items-center justify-center shadow-xs text-white shrink-0">
            <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-white/20 stroke-white" />
          </div>

          {/* Brand Name */}
          <span className="font-black text-slate-900 text-xs sm:text-base tracking-tight shrink-0">
            PRAHARI
          </span>

          {/* Compact Robot Selector (Responsive max-width and truncation) */}
          <div className="relative inline-block min-w-0 shrink">
            <select
              id="header-robot-selector"
              value={selectedRobotId}
              onChange={(e) => setSelectedRobotId(e.target.value)}
              aria-label="Select Active Robot"
              className="appearance-none bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-800 text-[11px] font-bold rounded-lg pl-2 pr-5 py-1 sm:py-1.5 cursor-pointer focus:outline-none focus:border-emerald-600 transition max-w-[95px] min-[360px]:max-w-[115px] sm:max-w-[140px] md:max-w-none truncate block"
            >
              {robotsList.map((r) => (
                <option key={r.robotId} value={r.robotId}>
                  {r.robotId}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          </div>
        </div>

        {/* Center / Right: Status, Battery, and Desktop Controls */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Online/Offline Status Indicator */}
          <span
            id="header-robot-status-badge"
            className={`text-[9px] sm:text-[10px] px-2 py-0.5 sm:py-1 rounded-full font-bold uppercase tracking-wider inline-flex items-center gap-1 shrink-0 ${
              robotStatus === 'ONLINE'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-slate-100 text-slate-600 border border-slate-300'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${robotStatus === 'ONLINE' ? 'bg-emerald-600 animate-pulse' : 'bg-slate-400'}`} />
            <span className="hidden min-[360px]:inline">{robotStatus}</span>
          </span>

          {/* Compact Battery Indicator */}
          <div
            id="header-battery-indicator"
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px] sm:text-xs font-mono shrink-0"
          >
            <Battery className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="text-slate-900 font-bold">
              {liveBattery.voltage != null ? `${liveBattery.voltage}V` : '35.8V'}
            </span>
            <span className="text-slate-500 text-[10px] hidden sm:inline">
              ({liveBattery.percentage != null ? `${liveBattery.percentage}%` : '82%'})
            </span>
          </div>

          {/* Secondary Controls (Hidden on mobile < md (768px), visible on tablet/desktop) */}
          {/* Real-time WebSocket Status & Latency */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-mono">
            <span className={`w-1.5 h-1.5 rounded-full ${socketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <span className="font-bold text-slate-700">{socketConnected ? 'WS LIVE' : 'CONNECTING'}</span>
            {socketConnected && <span className="text-emerald-700 font-bold ml-1">32ms</span>}
          </div>

          {/* Compact Mode Selector (Desktop only) */}
          <div className="hidden md:flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-100 border border-slate-200 text-xs">
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
            <span className="hidden sm:flex px-2 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold items-center gap-1 animate-pulse">
              <Bell className="w-3 h-3 text-rose-600" />
              <span className="hidden md:inline">Corridor</span>
            </span>
          )}

          {/* Packet Monitor Button (Desktop only) */}
          <button
            id="btn-open-debug-monitor"
            onClick={() => setIsDebugModalOpen(true)}
            className="hidden md:flex p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold items-center gap-1 transition cursor-pointer shadow-xs"
            title="Live Packet Monitor"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-600" />
          </button>

          {/* Desktop Emergency Stop Button (Desktop only - on mobile it floats) */}
          <div className="hidden md:flex items-center">
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
      </div>
    </header>
  );
};
