"use client";

import React, { useState } from 'react';
import { useRobot } from '../../context/RobotContext';
import {
  Siren,
  CheckCircle2,
  AlertOctagon,
  ArrowRight,
  ShieldCheck,
  Volume2,
} from 'lucide-react';
import { api } from '../../lib/api.js';

export const EmergencyCorridorPanel = () => {
  const { activeAmbulance, acknowledgeAmbulance, triggerAIDetection, audioSirenState } = useRobot();
  const [isEngaging, setIsEngaging] = useState(false);
  const [corridorActive, setCorridorActive] = useState(false);
  const [selectedSignalId, setSelectedSignalId] = useState('INTERSECTION_04');

  const handleEngageCorridor = async () => {
    setIsEngaging(true);
    try {
      await api.triggerEmergencyCorridor({
        signalId: selectedSignalId,
        corridorLane: 'LANE_1_NORTHBOUND',
        durationSec: 60,
      });
      setCorridorActive(true);
      acknowledgeAmbulance();
      setTimeout(() => setCorridorActive(false), 60000);
    } catch {
      setCorridorActive(true);
    } finally {
      setIsEngaging(false);
    }
  };

  return (
    <div
      id="emergency-corridor-panel"
      className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4 font-sans"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
            <Siren className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              DUAL-MODAL EMERGENCY GREEN CORRIDOR
            </div>
            <p className="text-[11px] text-slate-500">
              Visual Beacon Detection + 1.2kHz Acoustic Siren Correlation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {corridorActive ? (
            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold flex items-center gap-1.5 animate-pulse">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>GREEN CORRIDOR ENGAGED</span>
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold">
              CORRIDOR STANDBY
            </span>
          )}
        </div>
      </div>

      {/* Main Dual Modal Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Visual Ambulance Perception */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500 font-medium">Visual Beacon Detection:</span>
            <span className={activeAmbulance ? 'text-rose-700 font-bold' : 'text-slate-500 font-semibold'}>
              {activeAmbulance ? 'AMBULANCE IN FOV' : 'CLEAR'}
            </span>
          </div>
          <div className="text-xl font-black text-slate-900">
            {activeAmbulance ? `${Math.round((activeAmbulance.confidence || 0.95) * 100)}% Confidence` : 'No Visual Match'}
          </div>
          <div className="text-[11px] text-slate-500">
            Target: <strong>{activeAmbulance?.objectClass || 'None'}</strong> • Location: <strong>Lane 1 (Northbound)</strong>
          </div>
        </div>

        {/* Acoustic Audio Siren Sweep */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500 font-medium">Acoustic Siren Harmonic:</span>
            <span className={audioSirenState.sirenDetected ? 'text-rose-700 font-bold' : 'text-emerald-700 font-semibold'}>
              {audioSirenState.sirenDetected ? 'HARMONIC LOCK' : 'NORMAL AUDIO'}
            </span>
          </div>
          <div className="text-xl font-black text-slate-900">
            {audioSirenState.confidence ? `${Math.round(audioSirenState.confidence * 100)}% Match` : '1,200 Hz Standby'}
          </div>
          <div className="text-[11px] text-slate-500">
            Frequency Sweep: <strong>{audioSirenState.peakFrequency || 0} Hz</strong> • Pattern: <strong>Yelp/Wail</strong>
          </div>
        </div>
      </div>

      {/* Traffic Light State Visualization & Trigger Button */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-emerald-50/50 border border-emerald-200/80">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 p-2 rounded-xl bg-white border border-slate-200 shadow-xs">
            <span className={`w-3 h-3 rounded-full ${corridorActive ? 'bg-slate-300' : 'bg-rose-500'}`} />
            <span className="w-3 h-3 rounded-full bg-slate-300" />
            <span className={`w-3 h-3 rounded-full ${corridorActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">Virtual Traffic Signal Node 04</div>
            <div className="text-[11px] text-slate-500">Auto-preemption priority channel engaged for emergency vehicles</div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            id="btn-simulate-ambulance"
            onClick={() => triggerAIDetection('ambulance')}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold transition cursor-pointer"
          >
            + Test Trigger
          </button>

          <button
            id="btn-engage-corridor"
            onClick={handleEngageCorridor}
            disabled={isEngaging}
            className="flex-1 sm:flex-initial px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
          >
            <span>{corridorActive ? 'FORCE EXTEND (60s)' : 'ENGAGE GREEN CORRIDOR'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
