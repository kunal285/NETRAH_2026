"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRobot } from '../../context/RobotContext';
import { VirtualJoystick } from './VirtualJoystick.jsx';
import { StatusBadge } from '../common/StatusBadge';
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Square,
  ShieldAlert,
  Gauge,
  Zap,
  Sliders,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Keyboard,
  Info,
} from 'lucide-react';

export const ControlView = () => {
  const {
    robotState,
    telemetry,
    sendControl,
    stopRobot,
    emergencyStop,
    resetSafety,
    setMode,
    settings,
  } = useRobot();

  const [sliderSpeed, setSliderSpeed] = useState(robotState.speed || 50);
  const [activeKeys, setActiveKeys] = useState(new Set());
  const activeKeysRef = useRef(new Set());

  const isEstop = robotState.safety.emergencyStop;
  const isObstacleLock = robotState.safety.obstacleInterlock;

  // Global Keyboard event listeners for WASD movement & Spacebar Emergency Stop
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is currently typing in an input, textarea, or contentEditable element
      const targetTag = (e.target && e.target.tagName) || '';
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(targetTag) || e.target?.isContentEditable) {
        return;
      }

      const key = e.key.toLowerCase();

      // Emergency Stop trigger via Spacebar
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        activeKeysRef.current.add('space');
        setActiveKeys(new Set(activeKeysRef.current));
        emergencyStop('Keyboard E-Stop (Spacebar Triggered)');
        return;
      }

      // If E-Stop is engaged, do not process drive commands
      if (isEstop) return;

      // Handle WASD & Arrow keys for movement
      let movementCmd = null;
      if (key === 'w' || key === 'arrowup') {
        movementCmd = 'FORWARD';
      } else if (key === 's' || key === 'arrowdown') {
        movementCmd = 'REVERSE';
      } else if (key === 'a' || key === 'arrowleft') {
        movementCmd = 'LEFT';
      } else if (key === 'd' || key === 'arrowright') {
        movementCmd = 'RIGHT';
      }

      if (movementCmd) {
        e.preventDefault();
        activeKeysRef.current.add(key);
        setActiveKeys(new Set(activeKeysRef.current));
        sendControl(movementCmd, sliderSpeed);
      }
    };

    const handleKeyUp = (e) => {
      const targetTag = (e.target && e.target.tagName) || '';
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(targetTag) || e.target?.isContentEditable) {
        return;
      }

      const key = e.key.toLowerCase();
      if (e.code === 'Space' || e.key === ' ') {
        activeKeysRef.current.delete('space');
        setActiveKeys(new Set(activeKeysRef.current));
        return;
      }

      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        activeKeysRef.current.delete(key);
        setActiveKeys(new Set(activeKeysRef.current));

        // If no movement keys are currently held down, stop the robot
        const hasMovementKeys = Array.from(activeKeysRef.current).some((k) =>
          ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)
        );
        if (!hasMovementKeys && !isEstop) {
          stopRobot();
        }
      }
    };

    const handleBlur = () => {
      // Clear all active keys if window loses focus to prevent stuck movement
      activeKeysRef.current.clear();
      setActiveKeys(new Set());
      if (!isEstop) {
        stopRobot();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [isEstop, sliderSpeed, sendControl, stopRobot, emergencyStop]);

  const handleSpeedChange = (val) => {
    setSliderSpeed(val);
    if (robotState.movement !== 'STOPPED') {
      sendControl(robotState.movement, val);
    }
  };

  const isKeyActive = (keys) => keys.some((k) => activeKeys.has(k.toLowerCase()));

  return (
    <div id="control-view" className="space-y-6 max-w-5xl mx-auto font-mono">
      {/* Top Banner / Mode selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black text-white">TELEOPERATION & ROBOT DRIVE</h2>
            <StatusBadge
              label={robotState.mode}
              variant={robotState.mode === 'WEB' ? 'blue' : robotState.mode === 'RC' ? 'purple' : 'green'}
            />
          </div>
          <p className="text-xs text-slate-400">
            Dual MY1016 350W Motors • 4-Wheel Differential Skid Steer • BTS7960 PWM Driver
          </p>
        </div>

        <div className="flex items-center gap-2">
          {['WEB', 'RC', 'AUTO'].map((m) => (
            <button
              key={m}
              id={`btn-mode-${m.toLowerCase()}`}
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                robotState.mode === m
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {m} Mode
            </button>
          ))}
        </div>
      </div>

      {/* Keyboard Controls & Accessibility Guide Banner */}
      <div className="bg-slate-900/90 border border-sky-500/20 rounded-xl p-3.5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Keyboard className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-white flex items-center gap-2">
              <span>ACTIVE KEYBOARD CONTROLS</span>
              {activeKeys.size > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40 animate-pulse">
                  KEY PRESSED: {Array.from(activeKeys).map((k) => k.toUpperCase()).join(' + ')}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Hold <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 text-[10px] font-bold">W</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 text-[10px] font-bold ml-1">A</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 text-[10px] font-bold ml-1">S</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 text-[10px] font-bold ml-1">D</kbd> or Arrows to steer • Hit <kbd className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 text-[10px] font-bold ml-1">SPACE</kbd> for E-Stop
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition-colors ${
            isEstop
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
          }`}>
            {isEstop ? 'E-STOP ARMED' : 'CONTROLS ACTIVE'}
          </span>
        </div>
      </div>

      {/* Main Drive Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Touch Virtual Joystick & Speed Control */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-6 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              TOUCH JOYSTICK & SPEED CAP
            </span>
            <span className="text-xs text-sky-400 font-bold">PWM Throttle: {sliderSpeed}%</span>
          </div>

          <div className="flex justify-center py-2">
            <VirtualJoystick
              disabled={isEstop || robotState.mode === 'RC'}
              onMove={(cmd) => sendControl(cmd, sliderSpeed)}
              onStop={() => stopRobot()}
            />
          </div>

          {/* Speed Slider */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Drive Speed Cap:</span>
              <span className="font-bold text-white">{sliderSpeed}% PWM</span>
            </div>
            <input
              id="slider-control-speed"
              type="range"
              min="10"
              max={settings.maxSpeed || 90}
              step="5"
              value={sliderSpeed}
              onChange={(e) => handleSpeedChange(parseInt(e.target.value, 10))}
              disabled={isEstop}
              aria-label="Drive speed percentage"
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>Min 10% (Crawl)</span>
              <span>Default 50%</span>
              <span>Max {settings.maxSpeed || 90}% (Governed)</span>
            </div>
          </div>
        </div>

        {/* Right Column: Directional Buttons & Motor Telemetry */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-6 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              KEYPAD & TACTICAL D-PAD
            </span>
            <span className="text-[11px] text-slate-500">WASD / Arrow Keys</span>
          </div>

          {/* D-Pad Buttons Matrix */}
          <div className="flex flex-col items-center justify-center gap-2.5 py-2">
            <button
              id="btn-ctrl-forward"
              onPointerDown={() => sendControl('FORWARD', sliderSpeed)}
              onPointerUp={() => stopRobot()}
              disabled={isEstop || (isObstacleLock && robotState.movement === 'FORWARD')}
              aria-label="Drive Forward (Key W or Up Arrow)"
              aria-keyshortcuts="w ArrowUp"
              className={`w-20 h-14 rounded-xl font-bold flex flex-col items-center justify-center gap-1 border shadow-md transition cursor-pointer ${
                isKeyActive(['w', 'arrowup'])
                  ? 'bg-sky-500 text-white border-sky-300 ring-2 ring-sky-400 ring-offset-2 ring-offset-slate-900'
                  : 'bg-slate-800 hover:bg-sky-600 active:bg-sky-700 text-white border-slate-700'
              } disabled:opacity-40 disabled:hover:bg-slate-800`}
            >
              <ArrowUp className="w-5 h-5" />
              <span className="text-[10px]">FWD [W]</span>
            </button>

            <div className="flex items-center gap-2.5">
              <button
                id="btn-ctrl-left"
                onPointerDown={() => sendControl('LEFT', sliderSpeed)}
                onPointerUp={() => stopRobot()}
                disabled={isEstop}
                aria-label="Turn Left (Key A or Left Arrow)"
                aria-keyshortcuts="a ArrowLeft"
                className={`w-20 h-14 rounded-xl font-bold flex flex-col items-center justify-center gap-1 border shadow-md transition cursor-pointer ${
                  isKeyActive(['a', 'arrowleft'])
                    ? 'bg-sky-500 text-white border-sky-300 ring-2 ring-sky-400 ring-offset-2 ring-offset-slate-900'
                    : 'bg-slate-800 hover:bg-sky-600 active:bg-sky-700 text-white border-slate-700'
                } disabled:opacity-40 disabled:hover:bg-slate-800`}
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="text-[10px]">LEFT [A]</span>
              </button>

              <button
                id="btn-ctrl-stop"
                onClick={() => emergencyStop('D-Pad Emergency Stop')}
                aria-label="Emergency Stop (Spacebar)"
                aria-keyshortcuts="Space"
                className={`w-20 h-14 rounded-xl font-black flex flex-col items-center justify-center gap-1 border shadow-md transition cursor-pointer ${
                  isKeyActive(['space']) || isEstop
                    ? 'bg-rose-700 text-white border-rose-300 ring-2 ring-rose-400 ring-offset-2 ring-offset-slate-900 animate-pulse'
                    : 'bg-rose-600/80 hover:bg-rose-600 active:bg-rose-700 text-white border-rose-500'
                }`}
              >
                <Square className="w-5 h-5" />
                <span className="text-[9px]">E-STOP [SPC]</span>
              </button>

              <button
                id="btn-ctrl-right"
                onPointerDown={() => sendControl('RIGHT', sliderSpeed)}
                onPointerUp={() => stopRobot()}
                disabled={isEstop}
                aria-label="Turn Right (Key D or Right Arrow)"
                aria-keyshortcuts="d ArrowRight"
                className={`w-20 h-14 rounded-xl font-bold flex flex-col items-center justify-center gap-1 border shadow-md transition cursor-pointer ${
                  isKeyActive(['d', 'arrowright'])
                    ? 'bg-sky-500 text-white border-sky-300 ring-2 ring-sky-400 ring-offset-2 ring-offset-slate-900'
                    : 'bg-slate-800 hover:bg-sky-600 active:bg-sky-700 text-white border-slate-700'
                } disabled:opacity-40 disabled:hover:bg-slate-800`}
              >
                <ArrowRight className="w-5 h-5" />
                <span className="text-[10px]">RIGHT [D]</span>
              </button>
            </div>

            <button
              id="btn-ctrl-reverse"
              onPointerDown={() => sendControl('REVERSE', sliderSpeed)}
              onPointerUp={() => stopRobot()}
              disabled={isEstop}
              aria-label="Drive Reverse (Key S or Down Arrow)"
              aria-keyshortcuts="s ArrowDown"
              className={`w-20 h-14 rounded-xl font-bold flex flex-col items-center justify-center gap-1 border shadow-md transition cursor-pointer ${
                isKeyActive(['s', 'arrowdown'])
                  ? 'bg-sky-500 text-white border-sky-300 ring-2 ring-sky-400 ring-offset-2 ring-offset-slate-900'
                  : 'bg-slate-800 hover:bg-sky-600 active:bg-sky-700 text-white border-slate-700'
              } disabled:opacity-40 disabled:hover:bg-slate-800`}
            >
              <ArrowDown className="w-5 h-5" />
              <span className="text-[10px]">REV [S]</span>
            </button>
          </div>

          {/* Motor Status Feedback Strip */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Left Motor:</span>
                <span className="text-sky-400 font-bold">{telemetry.leftMotorSpeed}% PWM</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>Current:</span>
                <span className="text-white font-bold">{telemetry.leftMotorCurrent} A</span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Right Motor:</span>
                <span className="text-sky-400 font-bold">{telemetry.rightMotorSpeed}% PWM</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>Current:</span>
                <span className="text-white font-bold">{telemetry.rightMotorCurrent} A</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Safety Interlock Action Strip */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">HARDWARE INTERLOCK & E-STOP CONTROLLER</div>
            <div className="text-[11px] text-slate-400">
              Front HC-SR04 Obstacle Cutoff: {settings.emergencyStopDistance}m • Overcurrent: {settings.maxMotorCurrent}A
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {isEstop ? (
            <button
              id="btn-ctrl-reset-safety"
              onClick={() => resetSafety()}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 border border-emerald-400 shadow-lg cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>RESET INTERLOCK</span>
            </button>
          ) : (
            <button
              id="btn-ctrl-estop"
              onClick={() => emergencyStop('Control View E-Stop Button')}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-black text-xs flex items-center justify-center gap-2 border border-rose-400 shadow-lg cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>TRIGGER E-STOP (SPACE)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

