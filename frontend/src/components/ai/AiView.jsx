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
      {/* 1. Header Banner & Calibration Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-xs">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <div>
            <div className="text-base font-bold text-slate-900 tracking-tight">
              AI TRAFFIC PERCEPTION & GREEN CORRIDOR SUITE
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live Edge Vision • Multi-Lane Vehicle Tracking • Indian HSRP ANPR • Dual-Modal Siren Acoustic Radar
            </p>
          </div>
        </div>

        <button
          id="btn-open-ai-settings"
          onClick={() => setIsSettingsOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold flex items-center gap-2 cursor-pointer transition shadow-xs"
        >
          <Sliders className="w-4 h-4 text-emerald-600" />
          <span>Calibrate AI & Lanes</span>
        </button>
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
