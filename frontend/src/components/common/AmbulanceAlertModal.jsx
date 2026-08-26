"use client";

import React from 'react';
import { useRobot } from '../../context/RobotContext';
import { Siren, CheckCircle2, ShieldAlert, Sparkles } from 'lucide-react';

export const AmbulanceAlertModal = () => {
  const { activeAmbulance, isEmergencyModalOpen, acknowledgeAmbulance } = useRobot();

  if (!isEmergencyModalOpen || !activeAmbulance) {
    return null;
  }

  return (
    <div
      id="ambulance-alert-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-slate-900 border-2 border-rose-500 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 font-mono text-slate-100 relative overflow-hidden">
        {/* Glowing Top Beacon Strip */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-rose-600 via-amber-500 to-rose-600 animate-pulse" />

        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-950/80 border border-rose-500/60 flex items-center justify-center text-rose-400 shrink-0 animate-bounce">
            <Siren className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-rose-600 text-white uppercase tracking-widest">
                PRIORITY 1 EMERGENCY
              </span>
              <span className="text-xs text-rose-400 font-bold">GREEN CORRIDOR REQUESTED</span>
            </div>
            <h3 className="text-lg font-black text-white">
              EMERGENCY AMBULANCE DETECTED
            </h3>
          </div>
        </div>

        {/* Details Box */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
          <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
            <span className="text-slate-400">Perception Model:</span>
            <span className="text-sky-400 font-bold">PRAHARI Multi-Modal Vision + Siren Audio</span>
          </div>
          <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
            <span className="text-slate-400">Confidence Score:</span>
            <span className="text-emerald-400 font-bold">
              {Math.round((activeAmbulance.confidence || 0.95) * 100)}% Match
            </span>
          </div>
          <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
            <span className="text-slate-400">Timestamp:</span>
            <span className="text-slate-300">
              {new Date(activeAmbulance.timestamp).toLocaleTimeString()}
            </span>
          </div>
          <div className="flex justify-between pt-0.5">
            <span className="text-slate-400">Suggested Action:</span>
            <span className="text-amber-300 font-bold">Switch Traffic Lights to Green Corridor</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
          <button
            id="btn-ack-ambulance"
            onClick={() => acknowledgeAmbulance()}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-950/40 border border-emerald-400 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>ACKNOWLEDGE & ENGAGE CORRIDOR</span>
          </button>
        </div>
      </div>
    </div>
  );
};
