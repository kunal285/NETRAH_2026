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
  ShieldCheck,
  RotateCcw,
  Keyboard,
  Power,
  Gauge,
  Sliders,
  Zap,
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

  const isEstop = Boolean(robotState?.safety?.emergencyStop);
  const isObstacleLock = Boolean(robotState?.safety?.obstacleInterlock);

  // Global Keyboard event listeners for WASD movement & Spacebar Emergency Stop
  useEffect(() => {
    const handleKeyDown = (e) => {
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

      if (isEstop) return;

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

        const hasMovementKeys = Array.from(activeKeysRef.current).some((k) =>
          ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)
        );
        if (!hasMovementKeys && !isEstop) {
          stopRobot();
        }
      }
    };

    const handleBlur = () => {
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
    <div id="control-view" className="space-y-6 max-w-5xl mx-auto font-sans">
      {/* Top Banner / Mode Selector */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-slate-900">TELEOPERATION & ROBOT DRIVE</h2>
            <StatusBadge
              label={robotState.mode}
              variant={robotState.mode === 'WEB' ? 'blue' : robotState.mode === 'RC' ? 'purple' : 'green'}
            />
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Dual MY1016 350W Motors • 4-Wheel Skid Steer • BTS7960 PWM Driver
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200">
          {['WEB', 'RC', 'AUTO', 'DEMO'].map((m) => (
            <button
              key={m}
              id={`btn-mode-${m.toLowerCase()}`}
              onClick={() => setMode(m)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                robotState.mode === m
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Keyboard Controls Guide Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <Keyboard className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-slate-900 flex items-center gap-2">
              <span>ACTIVE KEYBOARD CONTROLS</span>
              {activeKeys.size > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 animate-pulse">
                  KEY: {Array.from(activeKeys).map((k) => k.toUpperCase()).join(' + ')}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Hold <kbd className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300 text-[10px] font-bold">W</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300 text-[10px] font-bold ml-1">A</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300 text-[10px] font-bold ml-1">S</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300 text-[10px] font-bold ml-1">D</kbd> or Arrows to steer • Hit <kbd className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200 text-[10px] font-bold ml-1">SPACE</kbd> for Emergency Stop
            </p>
          </div>
        </div>

        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
          isEstop
            ? 'bg-rose-50 text-rose-700 border-rose-200'
            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
        }`}>
          {isEstop ? 'E-STOP ARMED' : 'CONTROLS ACTIVE'}
        </span>
      </div>

      {/* Main Drive Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Touch Virtual Joystick & Speed Control */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              TOUCH JOYSTICK & SPEED CAP
            </span>
            <span className="text-xs text-emerald-700 font-bold">PWM Throttle: {sliderSpeed}%</span>
          </div>

          <div className="flex justify-center py-2">
            <VirtualJoystick
              disabled={isEstop || robotState.mode === 'RC'}
              onMove={(cmd) => sendControl(cmd, sliderSpeed)}
              onStop={() => stopRobot()}
            />
          </div>

          {/* Speed Slider */}
          <div className="space-y-2.5 pt-3 border-t border-slate-100">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500 font-medium">Drive Speed Limit:</span>
              <span className="font-bold text-slate-900">{sliderSpeed}% PWM</span>
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
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Min 10% (Crawl)</span>
              <span>Default 50%</span>
              <span>Max {settings.maxSpeed || 90}% (Governed)</span>
            </div>
          </div>
        </div>

        {/* Right Column: Directional Buttons & Motor Telemetry */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              TACTICAL DIRECTIONAL KEYPAD
            </span>
            <span className="text-[11px] text-slate-400">WASD / Arrow Keys</span>
          </div>

          {/* D-Pad Buttons Matrix */}
          <div className="flex flex-col items-center justify-center gap-2.5 py-2">
            <button
              id="btn-ctrl-forward"
              onPointerDown={() => sendControl('FORWARD', sliderSpeed)}
              onPointerUp={() => stopRobot()}
              disabled={isEstop || (isObstacleLock && robotState.movement === 'FORWARD')}
              aria-label="Drive Forward (Key W or Up Arrow)"
              className={`w-20 h-14 rounded-2xl font-bold flex flex-col items-center justify-center gap-1 border shadow-xs transition cursor-pointer ${
                isKeyActive(['w', 'arrowup'])
                  ? 'bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-500'
                  : 'bg-slate-50 hover:bg-emerald-600 active:bg-emerald-700 hover:text-white text-slate-800 border-slate-200'
              } disabled:opacity-40`}
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
                className={`w-20 h-14 rounded-2xl font-bold flex flex-col items-center justify-center gap-1 border shadow-xs transition cursor-pointer ${
                  isKeyActive(['a', 'arrowleft'])
                    ? 'bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-500'
                    : 'bg-slate-50 hover:bg-emerald-600 active:bg-emerald-700 hover:text-white text-slate-800 border-slate-200'
                } disabled:opacity-40`}
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="text-[10px]">LEFT [A]</span>
              </button>

              <button
                id="btn-ctrl-stop"
                onClick={() => emergencyStop('D-Pad Emergency Stop')}
                aria-label="Emergency Stop (Spacebar)"
                className={`w-20 h-14 rounded-2xl font-black flex flex-col items-center justify-center gap-1 shadow-xs transition cursor-pointer ${
                  isKeyActive(['space']) || isEstop
                    ? 'bg-rose-700 text-white ring-2 ring-rose-400'
                    : 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white'
                }`}
              >
                <Square className="w-5 h-5" />
                <span className="text-[9px]">E-STOP</span>
              </button>

              <button
                id="btn-ctrl-right"
                onPointerDown={() => sendControl('RIGHT', sliderSpeed)}
                onPointerUp={() => stopRobot()}
                disabled={isEstop}
                aria-label="Turn Right (Key D or Right Arrow)"
                className={`w-20 h-14 rounded-2xl font-bold flex flex-col items-center justify-center gap-1 border shadow-xs transition cursor-pointer ${
                  isKeyActive(['d', 'arrowright'])
                    ? 'bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-500'
                    : 'bg-slate-50 hover:bg-emerald-600 active:bg-emerald-700 hover:text-white text-slate-800 border-slate-200'
                } disabled:opacity-40`}
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
              className={`w-20 h-14 rounded-2xl font-bold flex flex-col items-center justify-center gap-1 border shadow-xs transition cursor-pointer ${
                isKeyActive(['s', 'arrowdown'])
                  ? 'bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-500'
                  : 'bg-slate-50 hover:bg-emerald-600 active:bg-emerald-700 hover:text-white text-slate-800 border-slate-200'
              } disabled:opacity-40`}
            >
              <ArrowDown className="w-5 h-5" />
              <span className="text-[10px]">REV [S]</span>
            </button>
          </div>

          {/* Motor Status Feedback Strip */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex justify-between text-slate-500">
                <span>Left Motor:</span>
                <span className="text-slate-900 font-bold">{telemetry.leftMotorSpeed || 0}% PWM</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>Current:</span>
                <span className="text-emerald-700 font-bold">{telemetry.leftMotorCurrent || 0.4} A</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex justify-between text-slate-500">
                <span>Right Motor:</span>
                <span className="text-slate-900 font-bold">{telemetry.rightMotorSpeed || 0}% PWM</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>Current:</span>
                <span className="text-emerald-700 font-bold">{telemetry.rightMotorCurrent || 0.4} A</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Safety Interlock Action Strip */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">HARDWARE INTERLOCK & SAFETY SYSTEM</div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Front HC-SR04 Cutoff: {settings.emergencyStopDistance || 0.4}m • Current Cutoff: {settings.maxMotorCurrent || 15}A
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {isEstop ? (
            <button
              id="btn-ctrl-reset-safety"
              onClick={() => resetSafety()}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>RESET INTERLOCK</span>
            </button>
          ) : (
            <button
              id="btn-ctrl-estop"
              onClick={() => emergencyStop('Control View E-Stop Button')}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
            >
              <Power className="w-4 h-4" />
              <span>TRIGGER E-STOP (SPACE)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
