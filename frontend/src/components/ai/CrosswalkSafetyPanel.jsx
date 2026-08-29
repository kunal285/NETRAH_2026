"use client";

import React from 'react';
import { useRobot } from '../../context/RobotContext';
import {
  UserCheck,
  AlertTriangle,
  ShieldCheck,
  Hand,
  CheckCircle2,
} from 'lucide-react';

export const CrosswalkSafetyPanel = () => {
  const { crosswalkRisk, wardenGesture } = useRobot();

  const isViolation = crosswalkRisk.risk_level === 'VIOLATION / RISK';

  return (
    <div
      id="crosswalk-safety-panel"
      className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4 font-sans"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <UserCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              PEDESTRIAN SAFETY & TRAFFIC WARDEN GESTURES
            </div>
            <p className="text-[11px] text-slate-500">
              Crosswalk Spatial Hazard Analysis + Officer Hand-Signal Classification
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isViolation ? (
            <span className="px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>PEDESTRIAN RISK DETECTED</span>
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>CROSSWALK SAFE</span>
            </span>
          )}
        </div>
      </div>

      {/* 2-Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: Pedestrian Crosswalk Risk */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500 font-medium">Crosswalk Occupancy:</span>
            <span className="text-slate-900 font-bold font-mono">
              {crosswalkRisk.pedestrian_count || 0} Persons
            </span>
          </div>

          <div className="text-xl font-black text-slate-900">
            {crosswalkRisk.risk_level || 'CLEAR'}
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            {crosswalkRisk.risk_level === 'VIOLATION / RISK'
              ? 'Vehicles encroaching on designated pedestrian crossing corridor. Preemption signal triggered.'
              : 'Pedestrian crossing zone clear of conflicting vehicle trajectories.'}
          </p>
        </div>

        {/* Right: Traffic Warden Hand Gesture */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500 font-medium">Traffic Warden Signal:</span>
            <span className="text-emerald-700 font-bold">
              {wardenGesture.confidence != null ? `${Math.round(wardenGesture.confidence * 100)}% Confidence` : 'Awaiting gesture'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-800">
              <Hand className="w-4 h-4" />
            </div>
            <div className="text-xl font-black text-slate-900">
              {wardenGesture.signal || 'NO ACTIVE GESTURE'}
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            {wardenGesture.action || 'Traffic officer hand gestures mapped in real-time to adjust intersection flow.'}
          </p>
        </div>
      </div>
    </div>
  );
};
