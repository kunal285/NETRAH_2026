"use client";

import React, { useState } from 'react';
import { useRobot } from '../../context/RobotContext';
import { TopLiveStatusBar } from './TopLiveStatusBar';
import { CameraManager } from './CameraManager';
import { LivePerceptionCanvas } from './LivePerceptionCanvas';
import { LiveEventFeed } from './LiveEventFeed';
import { EmergencyCorridorPanel } from './EmergencyCorridorPanel';
import { AudioSirenDetector } from './AudioSirenDetector';
import { TrafficDensityPanel } from './TrafficDensityPanel';
import { CrosswalkSafetyPanel } from './CrosswalkSafetyPanel';
import { AnprLiveTable } from './AnprLiveTable';
import { AiSettingsModal } from './AiSettingsModal';

import {
  BrainCircuit,
  Sliders,
} from 'lucide-react';

export const AiView = () => {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraSource, setCameraSource] = useState('webcam');
  const [videoRefState, setVideoRefState] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleCameraStateChange = (active, source, ref) => {
    setCameraActive(active);
    setCameraSource(source);
    setVideoRefState(ref?.current || null);
  };

  return (
    <div id="ai-suite-view" className="space-y-6 max-w-7xl mx-auto font-sans pb-12">
      {/* 1. Header Banner & Status */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <BrainCircuit className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                AI PERCEPTION
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                🟢 AI ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live Edge Vision • Multi-Lane Vehicle Tracking • Indian HSRP ANPR
            </p>
          </div>
        </div>

        <button
          id="btn-open-ai-settings"
          onClick={() => setIsSettingsOpen(true)}
          className="min-h-[40px] px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-bold flex items-center gap-2 cursor-pointer transition shadow-xs w-full sm:w-auto justify-center"
        >
          <Sliders className="w-4 h-4 text-emerald-600" />
          <span>Calibrate AI & Lanes</span>
        </button>
      </div>

      {/* Quick AI Detection Status Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex justify-between items-center text-slate-500 text-[10px] font-bold uppercase">
            <span>🚗 VEHICLES</span>
            <span className="text-emerald-700 font-bold">🟢 NORMAL</span>
          </div>
          <div className="text-base font-black text-slate-900 font-mono">FLOW: LOW</div>
          <div className="text-[10px] text-slate-500">Lane 1-4 Active</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex justify-between items-center text-slate-500 text-[10px] font-bold uppercase">
            <span>🚑 AMBULANCE</span>
            <span className="text-emerald-700 font-bold">🟢 READY</span>
          </div>
          <div className="text-base font-black text-emerald-700 font-mono">STANDBY</div>
          <div className="text-[10px] text-slate-500">Acoustic & Vision Sync</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex justify-between items-center text-slate-500 text-[10px] font-bold uppercase">
            <span>🔠 ANPR DETECT</span>
            <span className="text-emerald-700 font-bold">🟢 94% CONF</span>
          </div>
          <div className="text-base font-black text-slate-900 font-mono truncate">MH12AB1234</div>
          <div className="text-[10px] text-slate-500">Maharashtra • Car</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex justify-between items-center text-slate-500 text-[10px] font-bold uppercase">
            <span>👤 PEDESTRIAN</span>
            <span className="text-emerald-700 font-bold">🟢 SAFE</span>
          </div>
          <div className="text-base font-black text-slate-900 font-mono">CROSSWALK CLEAR</div>
          <div className="text-[10px] text-slate-500">Risk Score: 0.02</div>
        </div>
      </div>

      {/* 2. Top Real-time Status Bar */}
      <TopLiveStatusBar cameraActive={cameraActive} currentCameraName={cameraSource} />

      {/* 3. Camera Source & Video Stream Ingestion Manager */}
      <CameraManager onCameraStateChange={handleCameraStateChange} />

      {/* 4. Core Live Perception Canvas + Real-time Scrolling Event Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <LivePerceptionCanvas
            videoRef={videoRefState}
            cameraActive={cameraActive}
            cameraSource={cameraSource}
          />
          {/* Emergency Corridor Panel */}
          <EmergencyCorridorPanel />
        </div>

        <div className="lg:col-span-1">
          <LiveEventFeed />
        </div>
      </div>

      {/* 5. Audio Acoustic Siren Spectrum Detector */}
      <AudioSirenDetector />

      {/* 6. Traffic Density & Vehicle Flow Panel */}
      <TrafficDensityPanel />

      {/* 7. Crosswalk Pedestrian Safety & Traffic Warden Gesture Recognition */}
      <CrosswalkSafetyPanel />

      {/* 8. ANPR Live Detection Log Table */}
      <AnprLiveTable />

      {/* 9. AI Calibration & Settings Modal */}
      <AiSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
};
