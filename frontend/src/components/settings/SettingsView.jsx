"use client";

import React, { useState } from 'react';
import { useRobot } from '../../context/RobotContext';
import { StatusBadge } from '../common/StatusBadge';
import {
  Settings,
  Bot,
  Camera,
  BrainCircuit,
  ShieldCheck,
  Wifi,
  Sparkles,
  CheckCircle2,
  Sliders,
  RotateCcw,
} from 'lucide-react';

export const SettingsView = () => {
  const {
    robotStatus,
    controlMode,
    changeControlMode,
    selectedRobotId,
    setSelectedRobotId,
    availableRobots,
    socketConnected,
    liveBattery,
    liveUltrasonic,
    triggerScenario,
    resetSafety,
    settings,
    updateSettings,
  } = useRobot();

  const [activeTab, setActiveTab] = useState('robot'); // 'robot' | 'camera' | 'ai' | 'safety' | 'network'
  const [maxSpeed, setMaxSpeed] = useState(settings?.maxSpeed || 85);
  const [obstacleDistance, setObstacleDistance] = useState(settings?.emergencyStopDistance || 0.4);
  const [resolution, setResolution] = useState('1080p');
  const [targetFps, setTargetFps] = useState('30');
  const [yoloEnabled, setYoloEnabled] = useState(true);
  const [anprEnabled, setAnprEnabled] = useState(true);
  const [ambulanceEnabled, setAmbulanceEnabled] = useState(true);
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    if (updateSettings) {
      updateSettings({
        maxSpeed,
        emergencyStopDistance: obstacleDistance,
      });
    }
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  return (
    <div id="settings-view" className="space-y-4 sm:space-y-6 max-w-5xl mx-auto font-sans select-none">
      {/* 1. Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">OPERATOR SETTINGS</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Configuration for Robot Drive, AI Perception, Safety Interlocks & Network
            </p>
          </div>
        </div>

        {savedNotice && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold animate-pulse">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Settings Saved</span>
          </div>
        )}
      </div>

      {/* 2. Mobile Tab Bar */}
      <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-100 border border-slate-200 overflow-x-auto text-xs font-black">
        {[
          { id: 'robot', label: '🤖 ROBOT', icon: Bot },
          { id: 'camera', label: '📷 CAMERA', icon: Camera },
          { id: 'ai', label: '🧠 AI', icon: BrainCircuit },
          { id: 'safety', label: '🛡️ SAFETY', icon: ShieldCheck },
          { id: 'network', label: '📶 NETWORK', icon: Wifi },
        ].map((tab) => (
          <button
            key={tab.id}
            id={`tab-settings-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 min-w-[75px] py-2.5 px-3 rounded-xl transition cursor-pointer min-h-[44px] flex items-center justify-center gap-1.5 text-center ${
              activeTab === tab.id
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 active:bg-slate-200'
            }`}
          >
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 3. Tab Contents Form */}
      <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
        {/* TAB 1: ROBOT */}
        {activeTab === 'robot' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider">ROBOT IDENTIFICATION & DRIVE</span>
              <StatusBadge label={robotStatus} variant={robotStatus === 'ONLINE' ? 'green' : 'red'} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Active Robot ID</label>
                <select
                  value={selectedRobotId || 'PRAHARI-01'}
                  onChange={(e) => setSelectedRobotId?.(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800 focus:outline-emerald-500 min-h-[44px]"
                >
                  {(availableRobots || ['PRAHARI-01', 'PRAHARI-02', 'PRAHARI-SIM-01']).map((id) => (
                    <option key={id} value={id}>{id}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Control Mode</label>
                <select
                  value={controlMode}
                  onChange={(e) => changeControlMode(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800 focus:outline-emerald-500 min-h-[44px]"
                >
                  <option value="WEB">WEB (Mobile Controller Active)</option>
                  <option value="RC">RC (Physical Transmitter Priority)</option>
                  <option value="AUTO">AUTO (Autonomous Patrol)</option>
                  <option value="DEMO">DEMO (Exhibition Mode)</option>
                </select>
              </div>
            </div>

            {/* Max Speed Slider */}
            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-600">Maximum Governed Drive Speed:</span>
                <span className="text-emerald-700 font-mono font-black">{maxSpeed}% PWM</span>
              </div>
              <input
                type="range"
                min="20"
                max="100"
                step="5"
                value={maxSpeed}
                onChange={(e) => setMaxSpeed(parseInt(e.target.value, 10))}
                className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 touch-target"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>20% (Low Speed)</span>
                <span>85% (Recommended)</span>
                <span>100% (Full Power)</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CAMERA */}
        {activeTab === 'camera' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider">CAMERA STREAMING & RESOLUTION</span>
              <span className="text-xs text-emerald-700 font-bold">1080p Ready</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Stream Resolution</label>
                <select
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800 focus:outline-emerald-500 min-h-[44px]"
                >
                  <option value="1080p">1080p Full HD (1920x1080)</option>
                  <option value="720p">720p HD (1280x720)</option>
                  <option value="480p">480p SD (640x480 - Low Latency)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Frame Rate</label>
                <select
                  value={targetFps}
                  onChange={(e) => setTargetFps(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800 focus:outline-emerald-500 min-h-[44px]"
                >
                  <option value="30">30 FPS (Smooth)</option>
                  <option value="20">20 FPS (Balanced)</option>
                  <option value="15">15 FPS (Low Bandwidth)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: AI */}
        {activeTab === 'ai' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider">AI PERCEPTION MODULES</span>
              <span className="text-xs text-emerald-700 font-bold">🟢 AI ACTIVE</span>
            </div>

            <div className="space-y-3 text-xs">
              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer min-h-[48px]">
                <div>
                  <div className="font-bold text-slate-900">YOLOv8 Multi-Class Vehicle Detection</div>
                  <div className="text-[11px] text-slate-500">Detects Cars, Buses, Trucks, Motorcycles</div>
                </div>
                <input
                  type="checkbox"
                  checked={yoloEnabled}
                  onChange={(e) => setYoloEnabled(e.target.checked)}
                  className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer min-h-[48px]">
                <div>
                  <div className="font-bold text-slate-900">Indian HSRP ANPR OCR Pipeline</div>
                  <div className="text-[11px] text-slate-500">Automated Number Plate Recognition (MH12AB1234)</div>
                </div>
                <input
                  type="checkbox"
                  checked={anprEnabled}
                  onChange={(e) => setAnprEnabled(e.target.checked)}
                  className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer min-h-[48px]">
                <div>
                  <div className="font-bold text-slate-900">Ambulance Acoustic & Vision Preemption</div>
                  <div className="text-[11px] text-slate-500">Automatic Green Corridor Signal Clearing</div>
                </div>
                <input
                  type="checkbox"
                  checked={ambulanceEnabled}
                  onChange={(e) => setAmbulanceEnabled(e.target.checked)}
                  className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                />
              </label>
            </div>
          </div>
        )}

        {/* TAB 4: SAFETY */}
        {activeTab === 'safety' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider">HARDWARE INTERLOCK & SAFETY THRESHOLDS</span>
              <span className="text-xs text-emerald-700 font-bold">🟢 SAFETY ACTIVE</span>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <div className="flex justify-between font-bold mb-1">
                  <span className="text-slate-600">Front Ultrasonic Cutoff Threshold:</span>
                  <span className="text-emerald-700 font-mono font-black">{obstacleDistance}m ({Math.round(obstacleDistance * 100)}cm)</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="1.5"
                  step="0.05"
                  value={obstacleDistance}
                  onChange={(e) => setObstacleDistance(parseFloat(e.target.value))}
                  className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 touch-target"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>0.20m (Tight)</span>
                  <span>0.40m (Standard)</span>
                  <span>1.50m (Cautious)</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 font-mono">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
                  <div className="text-[10px] text-slate-400 font-sans uppercase font-bold">MAX MOTOR CURRENT</div>
                  <div className="text-sm font-black text-slate-900">15.0 A (Trip)</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
                  <div className="text-[10px] text-slate-400 font-sans uppercase font-bold">LOW BATT THRESHOLD</div>
                  <div className="text-sm font-black text-amber-700">33.0 V (Warn)</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: NETWORK */}
        {activeTab === 'network' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider">NETWORK & WEBSOCKET LINK</span>
              <StatusBadge label={socketConnected ? 'LINK OK' : 'OFFLINE'} variant={socketConnected ? 'green' : 'red'} />
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                <span className="text-slate-500 font-sans">Socket.IO State:</span>
                <span className="font-bold text-emerald-700">{socketConnected ? 'CONNECTED' : 'DISCONNECTED'}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                <span className="text-slate-500 font-sans">Backend Gateway:</span>
                <span className="font-bold text-slate-800">/api (Internal Proxy)</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                <span className="text-slate-500 font-sans">Robot Stream:</span>
                <span className="font-bold text-slate-800">/api/camera/stream</span>
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t border-slate-100">
          <button
            type="submit"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-xs shadow-xs cursor-pointer transition min-h-[44px]"
          >
            SAVE PREFERENCES
          </button>
        </div>
      </form>

      {/* 4. Simulator Scenario Bench (For SIH Demonstration) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 font-black text-slate-900 text-xs">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>SIH DEMO SCENARIO BENCH</span>
          </div>
          <StatusBadge label="DEMO SIMULATOR" variant="purple" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <button
            id="btn-scen-clear"
            type="button"
            onClick={() => triggerScenario?.('clear')}
            className="p-3 rounded-xl bg-slate-50 hover:bg-emerald-50 active:bg-emerald-100 text-slate-800 border border-slate-200 transition cursor-pointer text-left space-y-1 min-h-[60px]"
          >
            <div className="font-bold text-emerald-700 text-xs">1. Normal Patrol</div>
            <div className="text-[10px] text-slate-500">11.8V Batt, 2.5m Road</div>
          </button>

          <button
            id="btn-scen-obstacle"
            type="button"
            onClick={() => triggerScenario?.('obstacle_close')}
            className="p-3 rounded-xl bg-slate-50 hover:bg-rose-50 active:bg-rose-100 text-slate-800 border border-slate-200 transition cursor-pointer text-left space-y-1 min-h-[60px]"
          >
            <div className="font-bold text-rose-700 text-xs">2. Obstacle Alert</div>
            <div className="text-[10px] text-slate-500">Object at 0.25m</div>
          </button>

          <button
            id="btn-scen-lowbatt"
            type="button"
            onClick={() => triggerScenario?.('low_battery')}
            className="p-3 rounded-xl bg-slate-50 hover:bg-amber-50 active:bg-amber-100 text-slate-800 border border-slate-200 transition cursor-pointer text-left space-y-1 min-h-[60px]"
          >
            <div className="font-bold text-amber-800 text-xs">3. Low Battery</div>
            <div className="text-[10px] text-slate-500">Sag to 10.2V (15%)</div>
          </button>

          <button
            id="btn-scen-overcurrent"
            type="button"
            onClick={() => triggerScenario?.('motor_stall')}
            className="p-3 rounded-xl bg-slate-50 hover:bg-rose-50 active:bg-rose-100 text-slate-800 border border-slate-200 transition cursor-pointer text-left space-y-1 min-h-[60px]"
          >
            <div className="font-bold text-rose-700 text-xs">4. Motor Stall</div>
            <div className="text-[10px] text-slate-500">Spike to 22.4A</div>
          </button>
        </div>
      </div>
    </div>
  );
};
