"use client";

import React, { useState } from 'react';
import { useRobot } from '../../context/RobotContext';
import { Power, RotateCcw } from 'lucide-react';

export const FloatingEmergencyStop = () => {
  const { emergencyStop, emergencyStopRobot, resetSafety } = useRobot();
  const [isPressing, setIsPressing] = useState(false);

  const handleEstop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      setIsPressing(true);
      await emergencyStopRobot('Mobile Floating E-Stop Button');
    } catch (err) {
      console.error('Failed to trigger emergency stop:', err);
    } finally {
      setIsPressing(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      setIsPressing(true);
      await resetSafety();
    } catch (err) {
      console.error('Failed to reset safety:', err);
    } finally {
      setIsPressing(false);
    }
  };

  return (
    <div
      id="floating-emergency-stop-container"
      className="md:hidden fixed z-40 select-none pointer-events-auto transition-all"
      style={{
        bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))',
        right: '16px',
      }}
    >
      {emergencyStop ? (
        <button
          id="btn-mobile-floating-reset"
          onClick={handleReset}
          disabled={isPressing}
          className="px-3.5 py-2.5 rounded-full bg-emerald-600 active:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-2xl shadow-emerald-950/40 border-2 border-emerald-300 ring-4 ring-emerald-500/20 cursor-pointer transition-transform active:scale-95 animate-pulse min-h-[44px]"
          aria-label="Reset Safety Interlock"
        >
          <RotateCcw className="w-4.5 h-4.5 animate-spin" style={{ animationDuration: '3s' }} />
          <div className="text-left">
            <div className="text-[9px] leading-tight opacity-90 uppercase tracking-tight">STOPPED</div>
            <div className="text-xs leading-tight font-black tracking-wide">RESET SAFETY</div>
          </div>
        </button>
      ) : (
        <button
          id="btn-mobile-floating-estop"
          onClick={handleEstop}
          disabled={isPressing}
          className="px-3.5 py-2.5 rounded-full bg-rose-600 active:bg-rose-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-2xl shadow-rose-950/40 border-2 border-rose-400 ring-4 ring-rose-500/20 cursor-pointer transition-transform active:scale-95 min-h-[44px]"
          aria-label="Emergency Stop Robot"
        >
          <div className="w-6 h-6 rounded-full bg-white text-rose-600 flex items-center justify-center font-black shrink-0 shadow-xs">
            <Power className="w-3.5 h-3.5 stroke-[3]" />
          </div>
          <div className="text-left pr-0.5">
            <div className="text-[8px] leading-tight opacity-90 uppercase tracking-widest font-bold">EMERGENCY</div>
            <div className="text-xs leading-tight font-black tracking-wider">E-STOP</div>
          </div>
        </button>
      )}
    </div>
  );
};
