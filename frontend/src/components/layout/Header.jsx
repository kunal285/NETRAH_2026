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
  Bot,
  ChevronDown,
} from 'lucide-react';

export const Header = () => {
  const {
    selectedRobotId,
    setSelectedRobotId,
    robotsList,
    dataSource,
    robotStatus,
    controlMode,
    changeControlMode,
    liveBattery,
    liveWifi,
    emergencyStop,
    emergencyStopRobot,
    resetSafety,
    activeAmbulance,
    socketConnected,
    setIsDebugModalOpen,
    formatFreshness,
  } = useRobot();

  const getSafetyVariant = () => {
    if (emergencyStop) return 'red';
    if (robotStatus === 'ONLINE') return 'green';
    return 'slate';
  };

  return (
    <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 text-slate-800 select-none sticky top-0 z-30 shadow-xs font-sans">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left: PRAHARI Brand & Multi-Robot Selector */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-xs text-white font-black text-lg tracking-tight">
            P
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 text-lg tracking-tight">PRAHARI</span>
              
              {/* Robot Selection Dropdown */}
              <div className="relative inline-block">
                <select
                  value={selectedRobotId}
                  onChange={(e) => setSelectedRobotId(e.target.value)}
                  className="appearance-none bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold rounded-lg px-2.5 py-1 pr-6 cursor-pointer focus:outline-none focus:border-emerald-600"
                >
                  {robotsList.map((r) => (
                    <option key={r.robotId} value={r.robotId}>
                      {r.robotId} ({r.status})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              </div>

              {/* Data Source Indicator (Live Device vs Demo) */}
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider hidden sm:inline-flex items-center gap-1 ${
                  dataSource === 'LIVE DEVICE'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${dataSource === 'LIVE DEVICE' ? 'bg-emerald-600 animate-ping' : 'bg-amber-600'}`} />
                {dataSource}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
              Real-Time Traffic Police Robot Command Center
            </p>
          </div>
        </div>

        {/* Center: Real-time Telemetry & Mode */}
        <div className="hidden lg:flex items-center gap-3">
          {/* Connection Status */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            {robotStatus === 'ONLINE' ? (
              <Wifi className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span className="text-slate-500">Robot:</span>
            <span className={robotStatus === 'ONLINE' ? 'text-emerald-700 font-bold' : 'text-slate-500 font-bold'}>
              {robotStatus}
            </span>
          </div>

          {/* Real Battery State */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <Battery className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-slate-500">36V Pack:</span>
            <span className="text-slate-900 font-bold font-mono">
              {liveBattery.voltage != null ? `${liveBattery.voltage}V` : 'N/A'}
            </span>
            <span className="text-slate-500 text-[11px]">
              ({liveBattery.percentage != null ? `${liveBattery.percentage}%` : 'N/A'})
            </span>
          </div>

          {/* Current Mode Selector */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs">
            {['WEB', 'RC', 'AUTO', 'DEMO'].map((mode) => (
              <button
                key={mode}
                onClick={() => changeControlMode(mode)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  controlMode === mode
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Safety Status Pill */}
          <StatusBadge
            label={emergencyStop ? 'E-STOPPED' : robotStatus === 'ONLINE' ? 'SAFE' : 'STANDBY'}
            variant={getSafetyVariant()}
            pulse={emergencyStop}
          />
        </div>

        {/* Right: Debug Monitor & E-Stop */}
        <div className="flex items-center gap-2.5">
          {/* Live Data Monitor Trigger */}
          <button
            id="btn-open-debug-monitor"
            onClick={() => setIsDebugModalOpen(true)}
            className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            title="Live Packet Monitor"
          >
            <Activity className="w-4 h-4 text-emerald-600" />
            <span className="hidden md:inline">Monitor</span>
          </button>

          {activeAmbulance && (
            <span className="px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-1 animate-pulse">
              <Bell className="w-3.5 h-3.5 text-rose-600" />
              <span>Corridor Active</span>
            </span>
          )}

          {emergencyStop ? (
            <button
              id="btn-header-reset-safety"
              onClick={() => resetSafety()}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>RESET SAFETY</span>
            </button>
          ) : (
            <button
              id="btn-header-estop"
              onClick={() => emergencyStopRobot('Header E-Stop Button')}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Power className="w-4 h-4" />
              <span>E-STOP</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
