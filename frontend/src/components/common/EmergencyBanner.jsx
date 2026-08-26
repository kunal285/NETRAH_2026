"use client";

import React from 'react';
import { useRobot } from '../../context/RobotContext';
import { AlertOctagon, RotateCcw } from 'lucide-react';

export const EmergencyBanner = () => {
  const { robotState, resetSafety } = useRobot();

  if (!robotState.safety.emergencyStop && !robotState.safety.obstacleInterlock && !robotState.safety.overcurrentInterlock) {
    return null;
  }

  return (
    <div
      id="emergency-banner"
      className="bg-rose-950/90 border-y border-rose-600/80 px-4 py-2.5 shadow-xl flex flex-wrap items-center justify-between gap-3 text-rose-100 font-mono animate-pulse"
    >
      <div className="flex items-center gap-2.5">
        <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0" />
        <span className="font-bold text-sm tracking-wide">
          {robotState.safety.message || 'EMERGENCY INTERLOCK ACTIVE: ALL MOTORS SHUT DOWN'}
        </span>
      </div>

      <button
        id="btn-banner-reset-safety"
        onClick={() => resetSafety()}
        className="px-4 py-1.5 rounded-lg bg-rose-800 hover:bg-rose-700 active:bg-rose-900 text-white font-bold text-xs flex items-center gap-1.5 transition border border-rose-400 shadow-md cursor-pointer"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        <span>CLEAR SAFETY INTERLOCK</span>
      </button>
    </div>
  );
};
