"use client";

import React from 'react';
import { useRobot } from '../../context/RobotContext';
import { Siren, CheckCircle2 } from 'lucide-react';

export const AmbulanceAlertModal = () => {
  const { activeAmbulance, isEmergencyModalOpen, acknowledgeAmbulance } = useRobot();

  if (!isEmergencyModalOpen || !activeAmbulance) {
    return null;
  }

  return (
    <div
      id="ambulance-alert-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in font-sans"
    >
      <div className="bg-white border border-rose-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-slate-800 relative overflow-hidden">
        {/* Top Priority Strip */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-rose-600" />

        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
            <Siren className="w-6 h-6 animate-pulse" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-600 text-white uppercase tracking-wider">
                PRIORITY 1
              </span>
              <span className="text-xs text-rose-700 font-bold">EMERGENCY CORRIDOR</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              Emergency Vehicle Approaching
            </h3>
          </div>
        </div>

        {/* Details Box */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5 text-xs">
          <div className="flex justify-between border-b border-slate-200/60 pb-2">
            <span className="text-slate-500">Perception Model:</span>
            <span className="text-slate-900 font-semibold">PRAHARI Multi-Modal Vision + Siren Audio</span>
          </div>
          <div className="flex justify-between border-b border-slate-200/60 pb-2">
            <span className="text-slate-500">Confidence Score:</span>
            <span className="text-emerald-700 font-bold">
              {activeAmbulance.confidence != null ? `${Math.round(activeAmbulance.confidence * 100)}% Match` : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between border-b border-slate-200/60 pb-2">
            <span className="text-slate-500">Timestamp:</span>
            <span className="text-slate-700 font-medium">
              {activeAmbulance.timestamp ? new Date(activeAmbulance.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString()}
            </span>
          </div>
          <div className="flex justify-between pt-0.5">
            <span className="text-slate-500">Recommended Action:</span>
            <span className="text-amber-800 font-semibold">Switch Traffic Signal to Green Corridor</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
          <button
            id="btn-ack-ambulance"
            onClick={() => acknowledgeAmbulance()}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-xs cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>ACKNOWLEDGE & ENGAGE CORRIDOR</span>
          </button>
        </div>
      </div>
    </div>
  );
};
