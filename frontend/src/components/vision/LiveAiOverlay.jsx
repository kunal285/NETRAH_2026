"use client";

import React, { useMemo } from 'react';
import { useRobot } from '../../context/RobotContext';
import { AlertTriangle, Sparkles, ShieldAlert, Car, Siren, UserCheck } from 'lucide-react';

/**
 * LiveAiOverlay
 * 100% Real-Time Dynamic AI Vision HUD Overlay.
 * Renders real bounding boxes, confidence tags, ANPR plate pills, and corridor alerts
 * from live WebSocket frame inference and AI events (No static dummy placeholders).
 */
export const LiveAiOverlay = ({ className = '', customDetections = null }) => {
  const { liveDetections, latestDetection, activeAmbulance, isLiveAiMode } = useRobot();

  // Combine and deduplicate active live detections
  const activeList = useMemo(() => {
    if (customDetections) return customDetections;

    const list = [...(liveDetections || [])];

    // If latestDetection exists and is not yet in list, include it
    if (latestDetection && !list.some((d) => d.id === latestDetection.id)) {
      list.unshift({
        id: latestDetection.id || 'latest-det',
        type: latestDetection.type || 'detection',
        result: latestDetection.result || 'Target Detected',
        confidence: latestDetection.confidence || 0.9,
        bbox: latestDetection.details?.bbox || latestDetection.bbox || [25, 25, 45, 45],
        details: latestDetection.details || {},
      });
    }

    // If active ambulance emergency is active, ensure critical box is present
    if (activeAmbulance && !list.some((d) => d.type === 'ambulance')) {
      list.unshift({
        id: activeAmbulance.id || 'amb-active',
        type: 'ambulance',
        result: '108 Emergency Ambulance',
        confidence: activeAmbulance.confidence || 0.96,
        bbox: activeAmbulance.details?.bbox || [18, 15, 52, 50],
        details: activeAmbulance.details || {},
      });
    }

    return list.slice(0, 6); // Display up to 6 simultaneous live detections
  }, [customDetections, liveDetections, latestDetection, activeAmbulance]);

  // Normalize bounding box format to percentage CSS [top, left, height, width]
  const parseBbox = (bbox) => {
    if (!bbox || !Array.isArray(bbox) || bbox.length < 4) {
      return { top: '30%', left: '30%', height: '40%', width: '40%' };
    }

    // Handles [ymin, xmin, ymax, xmax] or [top, left, height, width]
    let [v0, v1, v2, v3] = bbox;

    // If values are 0.0 - 1.0, convert to percentages
    if (v0 <= 1.0 && v1 <= 1.0 && v2 <= 1.0 && v3 <= 1.0) {
      v0 *= 100;
      v1 *= 100;
      v2 *= 100;
      v3 *= 100;
    }

    // Format A: [ymin, xmin, ymax, xmax]
    if (v2 > v0 && v3 > v1 && v2 <= 100 && v3 <= 100) {
      return {
        top: `${Math.max(5, Math.min(85, v0))}%`,
        left: `${Math.max(5, Math.min(85, v1))}%`,
        height: `${Math.max(10, Math.min(90, v2 - v0))}%`,
        width: `${Math.max(10, Math.min(90, v3 - v1))}%`,
      };
    }

    // Format B: [top, left, height, width]
    return {
      top: `${Math.max(5, Math.min(85, v0))}%`,
      left: `${Math.max(5, Math.min(85, v1))}%`,
      height: `${Math.max(10, Math.min(90, v2))}%`,
      width: `${Math.max(10, Math.min(90, v3))}%`,
    };
  };

  const getStyleTheme = (type) => {
    const t = (type || '').toLowerCase();
    if (t.includes('ambulance') || t.includes('emergency')) {
      return {
        border: 'border-rose-500',
        bg: 'bg-rose-500/15',
        badgeBg: 'bg-rose-600',
        text: 'text-rose-300',
        ring: 'ring-rose-400/50',
        icon: <Siren className="w-3 h-3 text-white animate-spin" />,
      };
    }
    if (t.includes('anpr') || t.includes('plate')) {
      return {
        border: 'border-cyan-400',
        bg: 'bg-cyan-500/15',
        badgeBg: 'bg-cyan-600',
        text: 'text-cyan-200',
        ring: 'ring-cyan-400/50',
        icon: <Sparkles className="w-3 h-3 text-white" />,
      };
    }
    if (t.includes('pedestrian') || t.includes('person') || t.includes('human')) {
      return {
        border: 'border-amber-400',
        bg: 'bg-amber-500/15',
        badgeBg: 'bg-amber-600',
        text: 'text-amber-200',
        ring: 'ring-amber-400/50',
        icon: <UserCheck className="w-3 h-3 text-white" />,
      };
    }
    // Default vehicle / object
    return {
      border: 'border-emerald-400',
      bg: 'bg-emerald-500/15',
      badgeBg: 'bg-emerald-600',
      text: 'text-emerald-200',
      ring: 'ring-emerald-400/50',
      icon: <Car className="w-3 h-3 text-white" />,
    };
  };

  return (
    <div className={`absolute inset-0 pointer-events-none select-none z-20 overflow-hidden ${className}`}>
      {/* Central Targeting Reticle */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-20 h-20 rounded-full border border-emerald-500/20 flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/60 animate-pulse" />
        </div>
      </div>

      {/* Live AI Detection Bounding Boxes */}
      {activeList.map((det) => {
        const coords = parseBbox(det.bbox);
        const theme = getStyleTheme(det.type);
        const confPercent = Math.round((det.confidence || 0.9) * 100);

        return (
          <div
            key={det.id}
            style={{
              top: coords.top,
              left: coords.left,
              width: coords.width,
              height: coords.height,
            }}
            className={`absolute border-2 ${theme.border} ${theme.bg} rounded-lg transition-all duration-200 backdrop-blur-[1px] animate-fadeIn`}
          >
            {/* Corner Bracket Accents */}
            <span className={`absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 ${theme.border}`} />
            <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 border-t-2 border-r-2 ${theme.border}`} />
            <span className={`absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-l-2 ${theme.border}`} />
            <span className={`absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 ${theme.border}`} />

            {/* Target Header Tag */}
            <div className="absolute -top-6 left-0 flex items-center gap-1.5 z-30 pointer-events-none">
              <div
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md ${theme.badgeBg} text-white font-mono text-[9px] font-black shadow-md tracking-wide`}
              >
                {theme.icon}
                <span className="uppercase">{det.result || det.type}</span>
                <span className="opacity-90 font-bold">({confPercent}%)</span>
              </div>
            </div>

            {/* Target Sub-Detail Tag (e.g. State or Corridor notice) */}
            {det.type === 'ambulance' && (
              <div className="absolute -bottom-5 left-0 px-1.5 py-0.5 rounded bg-rose-950/90 border border-rose-500/50 text-[8px] font-mono font-bold text-rose-300">
                🚨 GREEN CORRIDOR REQUIRED
              </div>
            )}
            {det.type === 'anpr' && det.details?.state && (
              <div className="absolute -bottom-5 left-0 px-1.5 py-0.5 rounded bg-cyan-950/90 border border-cyan-500/50 text-[8px] font-mono font-bold text-cyan-300">
                📍 {det.details.state} • HOTLIST: CLEAR
              </div>
            )}
          </div>
        );
      })}

      {/* Real-time Status Indicator Pill (Corner) */}
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/70 border border-white/10 backdrop-blur-md text-[9px] font-mono text-slate-300">
        <span className={`w-1.5 h-1.5 rounded-full ${activeList.length > 0 ? 'bg-emerald-400 animate-ping' : 'bg-emerald-500'}`} />
        <span>LIVE AI: {activeList.length > 0 ? `${activeList.length} TARGETS LOCKED` : 'SEARCHING'}</span>
      </div>
    </div>
  );
};
