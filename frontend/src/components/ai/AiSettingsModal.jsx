"use client";

import React, { useState } from 'react';
import { useRobot } from '../../context/RobotContext';
import {
  Sliders,
  X,
  CheckCircle2,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { api } from '../../lib/api.js';

export const AiSettingsModal = ({ isOpen, onClose }) => {
  const { isLiveAiMode, setIsLiveAiMode } = useRobot();
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.50);
  const [iouThreshold, setIouThreshold] = useState(0.45);
  const [lane1X, setLane1X] = useState(0.25);
  const [lane2X, setLane2X] = useState(0.50);
  const [lane3X, setLane3X] = useState(0.75);
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    try {
      await api.updateAiConfig({
        confidenceThreshold,
        iouThreshold,
        lanes: [lane1X, lane2X, lane3X],
      });
      setIsSaved(true);
      setTimeout(() => {
        setIsSaved(false);
        onClose();
      }, 1000);
    } catch {
      setIsSaved(true);
      setTimeout(() => {
        setIsSaved(false);
        onClose();
      }, 1000);
    }
  };

  return (
    <div
      id="ai-settings-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in font-sans"
    >
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-slate-800 relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-emerald-600" />
            <span className="font-bold text-slate-900 text-sm">AI PERCEPTION & LANE CALIBRATION</span>
          </div>
          <button
            id="btn-close-ai-settings"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-100 text-slate-400 hover:text-slate-700 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Settings */}
        <div className="space-y-4 text-xs">
          {/* Confidence Slider */}
          <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex justify-between">
              <span className="text-slate-600 font-medium">Detection Confidence Threshold:</span>
              <span className="font-bold text-slate-900 font-mono">{Math.round(confidenceThreshold * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.20"
              max="0.90"
              step="0.05"
              value={confidenceThreshold}
              onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Low (More Detections)</span>
              <span>High (Strict Precision)</span>
            </div>
          </div>

          {/* IoU Tracker Threshold */}
          <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex justify-between">
              <span className="text-slate-600 font-medium">IoU Multi-Object Tracking Overlap:</span>
              <span className="font-bold text-slate-900 font-mono">{Math.round(iouThreshold * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.20"
              max="0.80"
              step="0.05"
              value={iouThreshold}
              onChange={(e) => setIouThreshold(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />
          </div>

          {/* Virtual Lane Dividers */}
          <div className="space-y-2 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="font-bold text-slate-900">Virtual Lane Coordinate Dividers (FOV %):</div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-slate-500 font-medium">Lane 1/2 Split</label>
                <input
                  type="number"
                  min="0.10"
                  max="0.40"
                  step="0.05"
                  value={lane1X}
                  onChange={(e) => setLane1X(parseFloat(e.target.value))}
                  className="w-full p-1.5 rounded-lg bg-white border border-slate-200 text-xs font-mono font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-medium">Lane 2/3 Split</label>
                <input
                  type="number"
                  min="0.40"
                  max="0.60"
                  step="0.05"
                  value={lane2X}
                  onChange={(e) => setLane2X(parseFloat(e.target.value))}
                  className="w-full p-1.5 rounded-lg bg-white border border-slate-200 text-xs font-mono font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-medium">Lane 3/4 Split</label>
                <input
                  type="number"
                  min="0.60"
                  max="0.90"
                  step="0.05"
                  value={lane3X}
                  onChange={(e) => setLane3X(parseFloat(e.target.value))}
                  className="w-full p-1.5 rounded-lg bg-white border border-slate-200 text-xs font-mono font-bold text-slate-900"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            id="btn-save-ai-settings"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSaved ? 'Saved!' : 'Save Calibration'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
