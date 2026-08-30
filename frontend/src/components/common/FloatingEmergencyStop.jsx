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
      await emergencyStopRobot('Mobile Fixed E-Stop Button');
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
      className="lg:hidden fixed bottom-[72px] right-3 sm:right-6 z-40 select-none pointer-events-auto"
      style={{ paddingBottom: 'var(--safe-area-inset-bottom)' }}
    >
      {emergencyStop ? (
        <button
          id="btn-mobile-floating-reset"
          onClick={handleReset}
          disabled={isPressing}
          className="px-4 py-3 rounded-full bg-emerald-600 active:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-2xl shadow-emerald-950/40 border-2 border-emerald-300 ring-4 ring-emerald-500/20 cursor-pointer transition-transform active:scale-95 animate-bounce"
          aria-label="Reset Safety Interlock"
        >
          <RotateCcw className="w-5 h-5 animate-spin" style={{ animationDuration: '3s' }} />
          <div className="text-left">
            <div className="text-[10px] leading-tight opacity-90">ROBOT STOPPED</div>
            <div className="text-xs leading-tight font-black tracking-wide">RESET SAFETY</div>
          </div>
        </button>
      ) : (
        <button
          id="btn-mobile-floating-estop"
          onClick={handleEstop}
          disabled={isPressing}
          className="px-4 py-3 rounded-full bg-rose-600 active:bg-rose-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-2xl shadow-rose-950/40 border-2 border-rose-400 ring-4 ring-rose-500/20 cursor-pointer transition-transform active:scale-95"
          aria-label="Emergency Stop Robot"
        >
          <div className="w-7 h-7 rounded-full bg-white text-rose-600 flex items-center justify-center font-black">
            <Power className="w-4 h-4" />
          </div>
          <div className="text-left pr-1">
            <div className="text-[9px] leading-tight opacity-90 uppercase tracking-wider">HARDWARE CUTOFF</div>
            <div className="text-xs leading-tight font-black tracking-wide">🛑 E-STOP</div>
          </div>
        </button>
      )}
    </div>
  );
};
