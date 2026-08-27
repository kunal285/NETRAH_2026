"use client";

import React from 'react';
import { useRobot } from '../../context/RobotContext';
import { AlertOctagon, RotateCcw } from 'lucide-react';

export const EmergencyBanner = () => {
  const { robotState, resetSafety } = useRobot();

  if (!robotState?.safety?.emergencyStop && !robotState?.safety?.obstacleInterlock && !robotState?.safety?.overcurrentInterlock) {
    return null;
  }

  return (
    <div
      id="emergency-banner"
      className="bg-rose-50 border border-rose-200 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3 text-rose-900 font-sans"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
          <AlertOctagon className="w-5 h-5 shrink-0" />
        </div>
        <div>
          <span className="font-bold text-sm">
            {robotState?.safety?.message || 'EMERGENCY INTERLOCK ACTIVE: ALL MOTORS SHUT DOWN'}
          </span>
          <p className="text-xs text-rose-700 mt-0.5">
            Hardware interlock engaged. Inspect physical robot perimeter before resetting.
          </p>
        </div>
      </div>

      <button
        id="btn-banner-reset-safety"
        onClick={() => resetSafety()}
        className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        <span>CLEAR SAFETY INTERLOCK</span>
      </button>
    </div>
  );
};
