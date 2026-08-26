"use client";

import React, { useState } from 'react';
import { useRobot } from '../../context/RobotContext';
import { StatusBadge } from '../common/StatusBadge';
import {
  BrainCircuit,
  Siren,
  FileText,
  Car,
  UserCheck,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Play,
  Shield,
} from 'lucide-react';

export const AiView = () => {
  const {
    latestDetection,
    activeAmbulance,
    triggerAIDetection,
    acknowledgeAmbulance,
  } = useRobot();

  const [simType, setSimType] = useState('anpr');
  const [loading, setLoading] = useState(false);

  const handleTrigger = async (type) => {
    setLoading(true);
    await triggerAIDetection(type);
    setLoading(false);
  };

  return (
    <div id="ai-suite-view" className="space-y-6 max-w-6xl mx-auto font-mono">
      {/* Header Info */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <BrainCircuit className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">AI MULTI-MODAL TRAFFIC PERCEPTION SUITE</div>
            <p className="text-[11px] text-slate-400">
              Edge vision AI models: Automatic Number Plate Recognition (ANPR) & Ambulance Green Corridor.
            </p>
          </div>
        </div>

        <StatusBadge label="YOLOv8 + OCR ACTIVE" variant="purple" />
      </div>

      {/* Ambulance Emergency Corridor Active Card */}
      {activeAmbulance ? (
        <div className="bg-rose-950/80 border-2 border-rose-500 rounded-xl p-5 shadow-2xl space-y-4 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-900 border border-rose-400 flex items-center justify-center text-rose-300">
                <Siren className="w-6 h-6 animate-bounce" />
              </div>
              <div>
                <div className="text-xs font-black text-rose-300 tracking-wider">
                  CRITICAL EMERGENCY CORRIDOR ACTIVE
                </div>
                <div className="text-sm font-bold text-white">
                  {activeAmbulance.result}
                </div>
              </div>
            </div>
            <button
              id="btn-ai-ack-ambulance"
              onClick={() => acknowledgeAmbulance()}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow border border-emerald-400 cursor-pointer"
            >
              Clear / Acknowledge
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-950/80 border border-rose-900">
              <div className="text-slate-400 text-[10px]">Confidence:</div>
              <div className="text-emerald-400 font-bold">
                {Math.round((activeAmbulance.confidence || 0.95) * 100)}%
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950/80 border border-rose-900">
              <div className="text-slate-400 text-[10px]">Siren Acoustic Match:</div>
              <div className="text-sky-400 font-bold">VERIFIED (108 Hz Harmonic)</div>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950/80 border border-rose-900">
              <div className="text-slate-400 text-[10px]">Signal Control:</div>
              <div className="text-amber-400 font-bold">GREEN LIGHT HELD</div>
            </div>
          </div>
        </div>
      ) : null}

      {/* 4 Multi-Modal Capabilities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Capability 1: ANPR */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sky-400">
              <FileText className="w-4 h-4" />
              <span className="text-xs font-bold uppercase">ANPR Engine</span>
            </div>
            <div className="text-xs font-bold text-white">License Plate Recognition</div>
            <p className="text-[11px] text-slate-400">
              High-speed OCR parser for High-Security Registration Plates (HSRP) across Indian states.
            </p>
          </div>
          <button
            id="btn-ai-test-anpr"
            onClick={() => handleTrigger('anpr')}
            disabled={loading}
            className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-sky-600 text-sky-300 hover:text-white text-xs font-bold transition border border-slate-700 cursor-pointer"
          >
            Simulate ANPR Scan
          </button>
        </div>

        {/* Capability 2: Ambulance */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-rose-400">
              <Siren className="w-4 h-4" />
              <span className="text-xs font-bold uppercase">Emergency Corridor</span>
            </div>
            <div className="text-xs font-bold text-white">Ambulance Detection</div>
            <p className="text-[11px] text-slate-400">
              Combined visual beacon flashing light detection + siren frequency classifier for green corridor.
            </p>
          </div>
          <button
            id="btn-ai-test-ambulance"
            onClick={() => handleTrigger('ambulance')}
            disabled={loading}
            className="w-full py-2 px-3 rounded-lg bg-rose-950/80 hover:bg-rose-600 text-rose-300 hover:text-white text-xs font-bold transition border border-rose-800 cursor-pointer"
          >
            Simulate Ambulance
          </button>
        </div>

        {/* Capability 3: Vehicle Type */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-amber-400">
              <Car className="w-4 h-4" />
              <span className="text-xs font-bold uppercase">Traffic Density</span>
            </div>
            <div className="text-xs font-bold text-white">Vehicle Classifier</div>
            <p className="text-[11px] text-slate-400">
              Real-time classification for Cars, Buses, 2-Wheelers, Heavy Trucks and lane occupancy.
            </p>
          </div>
          <button
            id="btn-ai-test-vehicle"
            onClick={() => handleTrigger('vehicle')}
            disabled={loading}
            className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-amber-600 text-amber-300 hover:text-white text-xs font-bold transition border border-slate-700 cursor-pointer"
          >
            Simulate Vehicle Count
          </button>
        </div>

        {/* Capability 4: Face / Pedestrian */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-emerald-400">
              <UserCheck className="w-4 h-4" />
              <span className="text-xs font-bold uppercase">Crosswalk Safety</span>
            </div>
            <div className="text-xs font-bold text-white">Pedestrian & Warden</div>
            <p className="text-[11px] text-slate-400">
              Pedestrian crosswalk safety and traffic police hand-signal recognition support.
            </p>
          </div>
          <button
            id="btn-ai-test-face"
            onClick={() => handleTrigger('face')}
            disabled={loading}
            className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-emerald-600 text-emerald-300 hover:text-white text-xs font-bold transition border border-slate-700 cursor-pointer"
          >
            Simulate Pedestrian
          </button>
        </div>
      </div>

      {/* Latest AI Perception Output Card */}
      {latestDetection && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              LATEST LIVE PERCEPTION EVENT
            </span>
            <span className="text-xs text-slate-400">
              {new Date(latestDetection.timestamp).toLocaleTimeString()}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-sky-400 uppercase">
                {latestDetection.type} DETECTION
              </div>
              <div className="text-base font-bold text-white mt-0.5">
                {latestDetection.result}
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] text-slate-500">Confidence Score:</div>
              <div className="text-emerald-400 font-black text-sm">
                {Math.round((latestDetection.confidence || 0.9) * 100)}%
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
