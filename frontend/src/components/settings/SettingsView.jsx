"use client";

import React, { useState } from 'react';
import { useRobot } from '../../context/RobotContext';
import { StatusBadge } from '../common/StatusBadge';
import {
  Settings,
  Cpu,
  Radio,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Shield,
  Zap,
} from 'lucide-react';

export const SettingsView = () => {
  const { triggerScenario, resetSafety } = useRobot();
  const [hardwareMode, setHardwareMode] = useState('simulator');
  const [serialPort, setSerialPort] = useState('/dev/ttyUSB0');
  const [baudRate, setBaudRate] = useState('115200');
  const [officerId, setOfficerId] = useState('NETRA-OP-01');
  const [stationName, setStationName] = useState('SIH Smart Traffic Command Cell');
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSavePreferences = (e) => {
    e.preventDefault();
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  return (
    <div id="settings-view" className="space-y-6 max-w-5xl mx-auto font-mono">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sky-600/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
            <Settings className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">PLATFORM SETTINGS & HARDWARE BRIDGE</div>
            <p className="text-[11px] text-slate-400">
              Hardware abstraction layer, simulator environment triggers, and deployment config.
            </p>
          </div>
        </div>

        {savedNotice && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-lg text-xs font-bold">
            <CheckCircle2 className="w-4 h-4" />
            <span>Preferences Updated</span>
          </div>
        )}
      </div>

      {/* Simulator Quick Scenarios Test Bench */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 font-bold text-white text-sm">
            <Sparkles className="w-4 h-4 text-sky-400" />
            <span>PRAHARI ROBOT SIMULATION SCENARIO BENCH</span>
          </div>
          <StatusBadge label="MOCK ROBOT ENGINE" variant="purple" />
        </div>

        <p className="text-xs text-slate-400">
          Trigger simulated hardware edge cases to evaluate frontend and backend safety reaction times.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <button
            id="btn-scen-clear"
            onClick={() => triggerScenario('clear')}
            className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 transition cursor-pointer text-left space-y-1"
          >
            <div className="font-bold text-emerald-400">1. Normal Patrol</div>
            <div className="text-[10px] text-slate-400">Full 36V battery, clear roadway (2.5m)</div>
          </button>

          <button
            id="btn-scen-obstacle"
            onClick={() => triggerScenario('obstacle_close')}
            className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 transition cursor-pointer text-left space-y-1"
          >
            <div className="font-bold text-rose-400">2. Emergency Obstacle</div>
            <div className="text-[10px] text-slate-400">Vehicle / object at 0.25m distance</div>
          </button>

          <button
            id="btn-scen-lowbatt"
            onClick={() => triggerScenario('low_battery')}
            className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 transition cursor-pointer text-left space-y-1"
          >
            <div className="font-bold text-amber-400">3. Low Battery</div>
            <div className="text-[10px] text-slate-400">Voltage sags to 31.5V (15% SoC)</div>
          </button>

          <button
            id="btn-scen-overcurrent"
            onClick={() => triggerScenario('overcurrent')}
            className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 transition cursor-pointer text-left space-y-1"
          >
            <div className="font-bold text-indigo-400">4. Motor Stall Overcurrent</div>
            <div className="text-[10px] text-slate-400">Spikes to 26A draw to test cutoff</div>
          </button>
        </div>
      </div>

      {/* Hardware Adapter & ESP32 Bridge Configuration */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 font-bold text-white text-sm">
            <Cpu className="w-4 h-4 text-emerald-400" />
            <span>HARDWARE ABSTRACTION LAYER (HAL) SELECTION</span>
          </div>
          <span className="text-xs text-slate-400">Hardware Integration Ready</span>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 mb-2 font-bold">Active Communication Layer:</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setHardwareMode('simulator')}
                className={`p-3 rounded-xl border text-left font-bold transition cursor-pointer ${
                  hardwareMode === 'simulator'
                    ? 'bg-sky-950 text-sky-300 border-sky-500 shadow-md'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <div>● Mock Robot Simulator</div>
                <div className="text-[10px] font-normal text-slate-400 mt-1">
                  Simulates full 36V physics, differential dynamics & ADC
                </div>
              </button>

              <button
                type="button"
                onClick={() => setHardwareMode('serial')}
                className={`p-3 rounded-xl border text-left font-bold transition cursor-pointer ${
                  hardwareMode === 'serial'
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-500 shadow-md'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <div>● ESP32 USB Serial UART</div>
                <div className="text-[10px] font-normal text-slate-400 mt-1">
                  Direct physical micro-USB UART bridge (115200 baud)
                </div>
              </button>

              <button
                type="button"
                onClick={() => setHardwareMode('espnow')}
                className={`p-3 rounded-xl border text-left font-bold transition cursor-pointer ${
                  hardwareMode === 'espnow'
                    ? 'bg-indigo-950 text-indigo-300 border-indigo-500 shadow-md'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <div>● ESP-NOW Wireless Bridge</div>
                <div className="text-[10px] font-normal text-slate-400 mt-1">
                  Low-latency 2.4GHz mesh for remote field unit
                </div>
              </button>
            </div>
          </div>

          {hardwareMode !== 'simulator' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
              <div>
                <label className="block text-slate-400 mb-1">Serial COM Port / Device Path</label>
                <input
                  type="text"
                  value={serialPort}
                  onChange={(e) => setSerialPort(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Baud Rate</label>
                <select
                  value={baudRate}
                  onChange={(e) => setBaudRate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white font-bold cursor-pointer"
                >
                  <option value="115200">115200 (Standard ESP32)</option>
                  <option value="921600">921600 (High-Speed DMA)</option>
                  <option value="9600">9600 (Legacy)</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Operator & Deployment Info */}
      <form
        onSubmit={handleSavePreferences}
        className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 font-bold text-white text-sm">
            <Radio className="w-4 h-4 text-sky-400" />
            <span>OPERATOR STATION PROFILE (SIH 2024 NETRA ROBOTICS)</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">Officer / Operator ID</label>
            <input
              type="text"
              value={officerId}
              onChange={(e) => setOfficerId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white font-bold"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Traffic Sector / Command Hub</label>
            <input
              type="text"
              value={stationName}
              onChange={(e) => setStationName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white font-bold"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            id="btn-save-settings"
            className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold transition shadow-md border border-sky-400 cursor-pointer text-xs"
          >
            Save Preferences
          </button>
        </div>
      </form>
    </div>
  );
};
