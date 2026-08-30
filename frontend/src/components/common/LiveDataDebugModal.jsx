"use client";

import React, { useState, useEffect } from 'react';
import { useRobot } from '../../context/RobotContext';
import { StatusBadge } from './StatusBadge';
import {
  Activity,
  X,
  RefreshCw,
  Cpu,
  Radio,
  Wifi,
  Shield,
  Clock,
  Terminal,
  Server,
  Camera,
  BrainCircuit,
  Cloud,
  Database,
} from 'lucide-react';

export const LiveDataDebugModal = () => {
  const {
    isDebugModalOpen,
    setIsDebugModalOpen,
    selectedRobotId,
    robotStatus,
    socketConnected,
    backendOnline,
    databaseStatus,
    s3Status,
    aiStatus,
    robotCameraStatus,
    lastHeartbeatTimestamp,
    lastTelemetryTimestamp,
    lastDetectionTimestamp,
    liveBattery,
    liveMotors,
    liveUltrasonic,
    liveWifi,
    commandStatus,
    formatFreshness,
    dataSource,
  } = useRobot();

  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/health').then((r) => r.json());
      setHealthData(res);
    } catch (e) {
      console.warn('Failed to load health stats', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isDebugModalOpen) {
      fetchHealth();
      const interval = setInterval(fetchHealth, 2000);
      return () => clearInterval(interval);
    }
  }, [isDebugModalOpen]);

  if (!isDebugModalOpen) return null;

  return (
    <div
      id="live-data-debug-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 font-sans"
    >
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-slate-900 uppercase tracking-tight">
                  DATA FLOW & DIAGNOSTICS MONITOR
                </span>
                <StatusBadge label={dataSource} variant={dataSource === 'LIVE ROBOT' ? 'green' : 'slate'} />
              </div>
              <p className="text-xs text-slate-500">Real-time subsystem health, WebSocket state, and hardware timestamps</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchHealth}
              className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
            <button
              onClick={() => setIsDebugModalOpen(false)}
              className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-700 border border-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Section 1: Core Subsystem Connection Status Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Backend */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase">
                <span>BACKEND</span>
                <Server className="w-3.5 h-3.5" />
              </div>
              <div className={`text-xs font-black ${backendOnline ? 'text-emerald-700' : 'text-rose-600'}`}>
                {backendOnline ? 'CONNECTED' : 'OFFLINE'}
              </div>
              <div className="text-[10px] text-slate-400">Node/Express</div>
            </div>

            {/* Socket.IO */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase">
                <span>SOCKET</span>
                <Radio className="w-3.5 h-3.5" />
              </div>
              <div className={`text-xs font-black ${socketConnected ? 'text-emerald-700' : 'text-rose-600'}`}>
                {socketConnected ? 'CONNECTED' : 'DISCONNECTED'}
              </div>
              <div className="text-[10px] text-slate-400">Bi-directional</div>
            </div>

            {/* Robot */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase">
                <span>ROBOT</span>
                <Cpu className="w-3.5 h-3.5" />
              </div>
              <div className={`text-xs font-black ${robotStatus === 'ONLINE' ? 'text-emerald-700' : 'text-rose-600'}`}>
                {robotStatus}
              </div>
              <div className="text-[10px] text-slate-400">{selectedRobotId}</div>
            </div>

            {/* Camera Stream */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase">
                <span>CAMERA</span>
                <Camera className="w-3.5 h-3.5" />
              </div>
              <div className={`text-xs font-black ${robotCameraStatus === 'LIVE' ? 'text-emerald-700' : 'text-slate-600'}`}>
                {robotCameraStatus === 'LIVE' ? 'STREAMING' : 'OFFLINE'}
              </div>
              <div className="text-[10px] text-slate-400">MJPEG Port 8080</div>
            </div>

            {/* AI Perception */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase">
                <span>AI ENGINE</span>
                <BrainCircuit className="w-3.5 h-3.5" />
              </div>
              <div className="text-xs font-black text-emerald-700">
                {aiStatus?.online ? 'ONLINE' : 'OFFLINE'}
              </div>
              <div className="text-[10px] text-slate-400">{aiStatus?.model || 'YOLOv8'}</div>
            </div>

            {/* AWS S3 */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase">
                <span>AWS S3</span>
                <Cloud className="w-3.5 h-3.5" />
              </div>
              <div className={`text-xs font-black ${healthData?.s3 === 'ok' ? 'text-emerald-700' : 'text-amber-600'}`}>
                {healthData?.s3 === 'ok' ? 'CONNECTED' : 'LOCAL / OK'}
              </div>
              <div className="text-[10px] text-slate-400">ap-south-1</div>
            </div>
          </div>

          {/* Section 2: Data Flow Heartbeat & Timestamp Inspector */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="text-xs font-bold text-slate-900 uppercase">REAL-TIME DATA FLOW TIMESTAMPS</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
              <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1">
                <div className="text-[10px] text-slate-400 font-bold uppercase">LAST ROBOT HEARTBEAT</div>
                <div className="text-xs font-bold text-slate-800">
                  {lastHeartbeatTimestamp ? new Date(lastHeartbeatTimestamp).toLocaleTimeString() : 'Awaiting Heartbeat'}
                </div>
                <div className="text-[10px] text-emerald-700 font-semibold">{formatFreshness(lastHeartbeatTimestamp).text}</div>
              </div>

              <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1">
                <div className="text-[10px] text-slate-400 font-bold uppercase">LAST TELEMETRY SAMPLE</div>
                <div className="text-xs font-bold text-slate-800">
                  {lastTelemetryTimestamp ? new Date(lastTelemetryTimestamp).toLocaleTimeString() : 'Awaiting Telemetry'}
                </div>
                <div className="text-[10px] text-emerald-700 font-semibold">{formatFreshness(lastTelemetryTimestamp).text}</div>
              </div>

              <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1">
                <div className="text-[10px] text-slate-400 font-bold uppercase">LAST AI DETECTION</div>
                <div className="text-xs font-bold text-slate-800">
                  {lastDetectionTimestamp ? new Date(lastDetectionTimestamp).toLocaleTimeString() : 'No Detections Yet'}
                </div>
                <div className="text-[10px] text-emerald-700 font-semibold">{formatFreshness(lastDetectionTimestamp).text}</div>
              </div>
            </div>
          </div>

          {/* Section 3: Hardware Diagnostics Snapshot */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
              <div className="font-bold text-slate-900 uppercase text-[11px] border-b border-slate-100 pb-1.5 font-sans">
                POWERTRAIN & SENSORS
              </div>
              <div className="space-y-1 text-slate-600">
                <div>Battery: <strong className="text-slate-900">{liveBattery.voltage != null ? `${liveBattery.voltage} V (${liveBattery.percentage}%)` : 'N/A'}</strong></div>
                <div>Left Motor: <strong className="text-slate-900">{liveMotors.left.pwm != null ? `PWM ${liveMotors.left.pwm}` : 'PWM 0'} ({liveMotors.left.current || '0.0'} A)</strong></div>
                <div>Right Motor: <strong className="text-slate-900">{liveMotors.right.pwm != null ? `PWM ${liveMotors.right.pwm}` : 'PWM 0'} ({liveMotors.right.current || '0.0'} A)</strong></div>
                <div>Ultrasonic Radar: <strong className="text-slate-900">{liveUltrasonic.frontDistanceCm != null ? `${liveUltrasonic.frontDistanceCm} cm` : 'N/A'}</strong></div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
              <div className="font-bold text-slate-900 uppercase text-[11px] border-b border-slate-100 pb-1.5 font-sans">
                NETWORK & FIRMWARE
              </div>
              <div className="space-y-1 text-slate-600">
                <div>WiFi RSSI: <strong className="text-slate-900">{liveWifi.rssi != null ? `${liveWifi.rssi} dBm` : 'N/A'}</strong></div>
                <div>Firmware: <strong className="text-slate-900">{liveWifi.firmwareVersion}</strong></div>
                <div>Command Status: <strong className="text-emerald-700">{commandStatus}</strong></div>
                <div>Database Status: <strong className="text-slate-900">{databaseStatus}</strong></div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>PRAHARI Hardware Command Engine v3.2</span>
          <button
            onClick={() => setIsDebugModalOpen(false)}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold transition cursor-pointer"
          >
            Close Diagnostics
          </button>
        </div>
      </div>
    </div>
  );
};
