"use client";

import React, { useState } from 'react';
import { useRobot } from '../../context/RobotContext';
import { StatusBadge } from '../common/StatusBadge';
import {
  Settings,
  Cpu,
  Sliders,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export const SettingsView = () => {
  const { triggerScenario, resetSafety } = useRobot();
  const [hardwareMode, setHardwareMode] = useState('rpi5_lgpio');
  const [serialPort, setSerialPort] = useState('/dev/serial0');
  const [baudRate, setBaudRate] = useState('9600');
  const [officerId, setOfficerId] = useState('NETRA-OP-01');
  const [stationName, setStationName] = useState('SIH Smart Traffic Command Cell');
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSavePreferences = (e) => {
    e.preventDefault();
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  return (
    <div id="settings-view" className="space-y-6 max-w-5xl mx-auto font-sans">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 uppercase">PLATFORM SETTINGS & RASPBERRY PI 5 HAL</div>
            <p className="text-xs text-slate-500">
              Hardware abstraction layer, RP1 GPIO bridge, and simulator test bench.
            </p>
          </div>
        </div>

        {savedNotice && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Preferences Updated</span>
          </div>
        )}
      </div>

      {/* Simulator Scenario Bench */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>PRAHARI ROBOT SIMULATION SCENARIO BENCH</span>
          </div>
          <StatusBadge label="MOCK ROBOT ENGINE" variant="purple" />
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Trigger simulated hardware edge cases to evaluate frontend and backend safety reaction times.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <button
            id="btn-scen-clear"
            onClick={() => triggerScenario('clear')}
            className="p-3.5 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-800 border border-slate-200 transition cursor-pointer text-left space-y-1"
          >
            <div className="font-bold text-emerald-700">1. Normal Patrol</div>
            <div className="text-[11px] text-slate-500">Full 36V battery, clear roadway (2.5m)</div>
          </button>

          <button
            id="btn-scen-obstacle"
            onClick={() => triggerScenario('obstacle_close')}
            className="p-3.5 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-800 border border-slate-200 transition cursor-pointer text-left space-y-1"
          >
            <div className="font-bold text-rose-700">2. Emergency Obstacle</div>
            <div className="text-[11px] text-slate-500">Vehicle / object at 0.25m distance</div>
          </button>

          <button
            id="btn-scen-lowbatt"
            onClick={() => triggerScenario('low_battery')}
            className="p-3.5 rounded-xl bg-slate-50 hover:bg-amber-50 text-slate-800 border border-slate-200 transition cursor-pointer text-left space-y-1"
          >
            <div className="font-bold text-amber-800">3. Low Battery</div>
            <div className="text-[11px] text-slate-500">Voltage sags to 31.5V (15% SoC)</div>
          </button>

          <button
            id="btn-scen-overcurrent"
            onClick={() => triggerScenario('motor_stall')}
            className="p-3.5 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-800 border border-slate-200 transition cursor-pointer text-left space-y-1"
          >
            <div className="font-bold text-rose-700">4. Motor Stall</div>
            <div className="text-[11px] text-slate-500">Current spikes to 22.4A (Trip)</div>
          </button>
        </div>
      </div>

      {/* Hardware Interface Mode & Serial Bridge */}
      <form onSubmit={handleSavePreferences} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
            <Cpu className="w-4 h-4 text-emerald-600" />
            <span>RASPBERRY PI 5 HAL & HARDWARE BUS BRIDGE</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-bold text-slate-800 mb-1">Hardware Interface Mode</label>
            <select
              value={hardwareMode}
              onChange={(e) => setHardwareMode(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500"
            >
              <option value="rpi5_lgpio">Raspberry Pi 5 Direct GPIO / RP1 Controller (rpi5_bridge.py)</option>
              <option value="rpi5_usb">Raspberry Pi 5 USB / UART MCU Bridge (/dev/ttyACM0)</option>
              <option value="simulator">Mock Software Simulator (Demo Mode)</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1">GPS UART Port (/dev/serial0)</label>
            <select
              value={baudRate}
              onChange={(e) => setBaudRate(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500"
            >
              <option value="9600">9600 bps (NEO-6M NMEA Standard)</option>
              <option value="115200">115200 bps (High Speed Binary)</option>
              <option value="38400">38400 bps</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1">Officer / Operator ID</label>
            <input
              type="text"
              value={officerId}
              onChange={(e) => setOfficerId(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1">Station / Command Cell Name</label>
            <input
              type="text"
              value={stationName}
              onChange={(e) => setStationName(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs shadow-xs cursor-pointer transition"
          >
            Save HAL Preferences
          </button>
        </div>
      </form>
    </div>
  );
};
