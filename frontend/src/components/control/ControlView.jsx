"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRobot } from '../../context/RobotContext';
import { VirtualJoystick } from './VirtualJoystick.jsx';
import { LiveAiOverlay } from '../vision/LiveAiOverlay.jsx';
import { StatusBadge } from '../common/StatusBadge';
import {
  Gamepad2,
  Camera,
  Battery,
  AlertTriangle,
  Zap,
  Thermometer,
  Square,
  Power,
  RotateCcw,
  Radio,
  Sliders,
  Keyboard,
  Maximize2,
  Sparkles,
} from 'lucide-react';

export const ControlView = () => {
  const {
    robotStatus,
    controlMode,
    changeControlMode,
    liveBattery,
    liveMotors,
    liveUltrasonic,
    emergencyStop,
    emergencyStopRobot,
    resetSafety,
    sendControlCommand,
    settings,
  } = useRobot();

  const [sliderSpeed, setSliderSpeed] = useState(70);
  const [showAiOverlay, setShowAiOverlay] = useState(true);
  const [activeKeys, setActiveKeys] = useState(new Set());
  const activeKeysRef = useRef(new Set());

  const isEstop = Boolean(emergencyStop);
  const isRcActive = controlMode === 'RC';

  // Continuous Differential Drive Dispatcher
  const handleDriveVector = (vector) => {
    if (isEstop || isRcActive) return;
    const { throttle, steering } = vector;

    // Differential Drive Calculation:
    // Left = clamp(throttle + steering, -1.0, 1.0)
    // Right = clamp(throttle - steering, -1.0, 1.0)
    let left = Math.max(-1.0, Math.min(1.0, throttle + steering));
    let right = Math.max(-1.0, Math.min(1.0, throttle - steering));

    // Determine cardinal direction for logging / backward-compatible telemetry
    let cmd = 'DRIVE_VECTOR';
    if (throttle > 0.3 && Math.abs(steering) <= 0.3) cmd = 'FORWARD';
    else if (throttle < -0.3 && Math.abs(steering) <= 0.3) cmd = 'REVERSE';
    else if (steering < -0.3 && Math.abs(throttle) <= 0.3) cmd = 'LEFT';
    else if (steering > 0.3 && Math.abs(throttle) <= 0.3) cmd = 'RIGHT';

    sendControlCommand(cmd, sliderSpeed).catch(() => {});
  };

  const handleStop = () => {
    sendControlCommand('STOP', 0).catch(() => {});
  };

  // Inactive / Blur Safety Handler: Automatically STOP motors if window loses focus or page hides
  useEffect(() => {
    const handleWindowBlur = () => {
      activeKeysRef.current.clear();
      setActiveKeys(new Set());
      if (!isEstop && controlMode === 'WEB') {
        sendControlCommand('STOP', 0).catch(() => {});
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && !isEstop && controlMode === 'WEB') {
        sendControlCommand('STOP', 0).catch(() => {});
      }
    };

    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (controlMode === 'WEB') {
        sendControlCommand('STOP', 0).catch(() => {});
      }
    };
  }, [isEstop, controlMode, sendControlCommand]);

  // Multi-Key Keyboard Differential Drive Engine
  useEffect(() => {
    let keyLoopTimer = null;

    const computeAndDispatchVector = () => {
      if (isEstop || isRcActive) return;

      const keys = activeKeysRef.current;
      let throttle = 0;
      let steering = 0;

      const forward = keys.has('w') || keys.has('arrowup');
      const reverse = keys.has('s') || keys.has('arrowdown');
      const left = keys.has('a') || keys.has('arrowleft');
      const right = keys.has('d') || keys.has('arrowright');

      if (forward && !reverse) throttle = 1.0;
      else if (reverse && !forward) throttle = -1.0;

      if (left && !right) steering = forward || reverse ? -0.6 : -1.0;
      else if (right && !left) steering = forward || reverse ? 0.6 : 1.0;

      if (throttle !== 0 || steering !== 0) {
        sendControlCommand('DRIVE_VECTOR', sliderSpeed, { throttle, steering }).catch(() => {});
      }
    };

    const handleKeyDown = (e) => {
      const targetTag = (e.target && e.target.tagName) || '';
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(targetTag) || e.target?.isContentEditable) {
        return;
      }

      const key = e.key.toLowerCase();

      // Space = Stop
      if (e.code === 'Space' || key === ' ') {
        e.preventDefault();
        activeKeysRef.current.clear();
        setActiveKeys(new Set());
        handleStop();
        return;
      }

      // E = Emergency Stop
      if (key === 'e') {
        e.preventDefault();
        activeKeysRef.current.clear();
        setActiveKeys(new Set());
        emergencyStopRobot('Keyboard E-Stop (E Key)');
        return;
      }

      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        e.preventDefault();
        if (!activeKeysRef.current.has(key)) {
          activeKeysRef.current.add(key);
          setActiveKeys(new Set(activeKeysRef.current));
          computeAndDispatchVector();

          if (!keyLoopTimer) {
            keyLoopTimer = setInterval(computeAndDispatchVector, 40); // 25Hz loop
          }
        }
      }
    };

    const handleKeyUp = (e) => {
      const targetTag = (e.target && e.target.tagName) || '';
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(targetTag) || e.target?.isContentEditable) {
        return;
      }

      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        activeKeysRef.current.delete(key);
        setActiveKeys(new Set(activeKeysRef.current));

        if (activeKeysRef.current.size === 0) {
          if (keyLoopTimer) {
            clearInterval(keyLoopTimer);
            keyLoopTimer = null;
          }
          if (!isEstop && !isRcActive) {
            handleStop();
          }
        } else {
          computeAndDispatchVector();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      if (keyLoopTimer) clearInterval(keyLoopTimer);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isEstop, isRcActive, sliderSpeed, sendControlCommand, emergencyStopRobot]);

  return (
    <div id="game-control-view" className="space-y-4 max-w-5xl mx-auto font-sans select-none pb-8">
      {/* 1. Top HUD Strip */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
            <Gamepad2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black text-slate-900 tracking-tight">PRAHARI</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                {robotStatus === 'ONLINE' ? '🟢 ONLINE' : '🔴 OFFLINE'}
              </span>
            </div>
            <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
              Differential Drive (Dual Rear MY1016 • Passive Front Casters)
            </div>
          </div>
        </div>

        {/* Mode Selector Chips */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200 w-full sm:w-auto justify-between sm:justify-start">
          {['WEB', 'RC', 'AUTO'].map((m) => (
            <button
              key={m}
              id={`btn-game-mode-${m.toLowerCase()}`}
              onClick={() => changeControlMode(m)}
              className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer min-h-[36px] flex items-center justify-center ${
                controlMode === m
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 active:bg-slate-200'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Priority Lockout Banner (If RC active) */}
      {isRcActive ? (
        <div className="p-3.5 rounded-2xl bg-purple-50 border-2 border-purple-300 text-purple-950 flex items-center gap-3 shadow-xs">
          <Radio className="w-5 h-5 text-purple-600 animate-pulse shrink-0" />
          <div>
            <div className="text-xs font-black tracking-tight">🎮 RC CONTROL ACTIVE (PRIORITY OVERRIDE)</div>
            <p className="text-[11px] text-purple-800">
              Physical RC Transmitter has priority. Web movement joystick is locked for safety.
            </p>
          </div>
        </div>
      ) : null}

      {/* 3. Main Driving Interface: Live Camera + Differential Joystick */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left / Upper: Live Camera Feed with HUD */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-xs space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-1.5 text-xs font-black text-slate-800">
              <Camera className="w-4 h-4 text-emerald-600" />
              <span>LIVE CAMERA MONITOR</span>
            </div>
            <button
              onClick={() => setShowAiOverlay(!showAiOverlay)}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                showAiOverlay
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}
            >
              AI: {showAiOverlay ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Camera Viewport */}
          <div className="relative aspect-video w-full rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center shadow-inner">
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 flex flex-col justify-between p-3 select-none pointer-events-none">
              {/* Top HUD */}
              <div className="flex justify-between items-start text-[10px] text-slate-300 z-10 font-mono">
                <div className="bg-black/70 backdrop-blur-md px-2 py-0.5 rounded border border-white/10 text-emerald-400 font-bold">
                  🟢 PRAHARI 1080p
                </div>
                <div className="bg-black/70 backdrop-blur-md px-2 py-0.5 rounded border border-white/10 text-emerald-400 font-bold">
                  MODE: {controlMode}
                </div>
              </div>

              {/* Live Dynamic AI Overlay */}
              {showAiOverlay && <LiveAiOverlay />}

              {/* Bottom HUD */}
              <div className="flex justify-between items-end text-[10px] text-slate-300 z-10 font-mono">
                <div className="bg-black/70 backdrop-blur-md px-2 py-0.5 rounded border border-white/10">
                  RADAR: <strong className="text-emerald-400">{liveUltrasonic.frontDistanceCm || 87}cm</strong>
                </div>
                <div className="bg-black/70 backdrop-blur-md px-2 py-0.5 rounded border border-white/10">
                  SPEED: <strong className="text-emerald-400">{sliderSpeed}%</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Telemetry Strip below camera */}
          <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono pt-1">
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[9px] text-slate-400 font-sans font-bold uppercase">BATTERY</div>
              <div className="text-xs font-black text-emerald-700">{liveBattery.voltage || '35.8'}V</div>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[9px] text-slate-400 font-sans font-bold uppercase">OBSTACLE</div>
              <div className="text-xs font-black text-slate-900">{liveUltrasonic.frontDistanceCm || 87}cm</div>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[9px] text-slate-400 font-sans font-bold uppercase">CURRENT</div>
              <div className="text-xs font-black text-slate-900">{liveBattery.current || '12.4'}A</div>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[9px] text-slate-400 font-sans font-bold uppercase">TEMP</div>
              <div className="text-xs font-black text-slate-900">{liveBattery.temperature || '42'}°C</div>
            </div>
          </div>

          {/* Interactive Keyboard Controls Cheat Sheet */}
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-white flex flex-wrap items-center justify-between gap-2 shadow-inner">
            <div className="flex items-center gap-2">
              <Keyboard className="w-4 h-4 text-emerald-400" />
              <span className="text-[11px] font-bold text-slate-200">KEYBOARD TELEOPERATION</span>
            </div>

            <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold">
              {['W', 'A', 'S', 'D'].map((k) => {
                const isActive = activeKeys.has(k.toLowerCase()) || (k === 'W' && activeKeys.has('arrowup')) || (k === 'S' && activeKeys.has('arrowdown')) || (k === 'A' && activeKeys.has('arrowleft')) || (k === 'D' && activeKeys.has('arrowright'));
                return (
                  <span
                    key={k}
                    className={`px-2 py-0.5 rounded border transition-all ${
                      isActive
                        ? 'bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-500/50 scale-110'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {k}
                  </span>
                );
              })}
              <span className="text-slate-600 px-0.5">|</span>
              <span
                className={`px-2 py-0.5 rounded border transition-all text-[10px] ${
                  activeKeys.has(' ')
                    ? 'bg-amber-500 text-white border-amber-400 scale-105'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                SPACE [STOP]
              </span>
              <span
                className={`px-2 py-0.5 rounded border transition-all text-[10px] ${
                  activeKeys.has('e')
                    ? 'bg-rose-500 text-white border-rose-400 scale-105'
                    : 'bg-slate-800 text-rose-300 border-slate-700'
                }`}
              >
                E [E-STOP]
              </span>
            </div>
          </div>
        </div>

        {/* Right / Lower: Game Joystick & Speed Slider */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
              🕹️ MOVEMENT JOYSTICK
            </span>
            <span className="text-xs font-black text-emerald-700 font-mono">
              THROTTLE: {sliderSpeed}%
            </span>
          </div>

          {/* The Large Analog Differential Joystick */}
          <div className="flex justify-center py-2">
            <VirtualJoystick
              disabled={isEstop || isRcActive}
              onDrive={handleDriveVector}
              onStop={handleStop}
            />
          </div>

          {/* Speed Limit Slider & Presets */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-600 font-bold">Speed Limit (PWM):</span>
              <span className="text-sm font-black text-emerald-700 font-mono">{sliderSpeed}%</span>
            </div>

            <input
              id="slider-game-speed"
              type="range"
              min="10"
              max={settings.maxSpeed || 90}
              step="5"
              value={sliderSpeed}
              onChange={(e) => setSliderSpeed(parseInt(e.target.value, 10))}
              disabled={isEstop || isRcActive}
              aria-label="Drive speed percentage"
              className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 touch-target"
            />

            <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono font-bold">
              {[25, 50, 70, 90].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setSliderSpeed(preset)}
                  disabled={isEstop || isRcActive}
                  className={`py-1.5 rounded-lg border transition cursor-pointer min-h-[36px] ${
                    sliderSpeed === preset
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {preset}%
                </button>
              ))}
            </div>
          </div>

          {/* Stop & Emergency Stop Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              id="btn-game-soft-stop"
              onClick={handleStop}
              disabled={isEstop || isRcActive}
              className="w-full min-h-[48px] rounded-xl bg-slate-900 hover:bg-black active:bg-slate-800 text-white font-black text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
            >
              <Square className="w-4 h-4 text-amber-400" />
              <span>STOP (SPACE)</span>
            </button>

            {isEstop ? (
              <button
                id="btn-game-reset-safety"
                onClick={() => resetSafety()}
                className="w-full min-h-[48px] rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>RESET SAFETY</span>
              </button>
            ) : (
              <button
                id="btn-game-estop"
                onClick={() => emergencyStopRobot('Game Controller E-Stop')}
                className="w-full min-h-[48px] rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-black text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
              >
                <Power className="w-4 h-4" />
                <span>🛑 E-STOP</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
