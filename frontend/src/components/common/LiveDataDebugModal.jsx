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
} from 'lucide-react';

export const LiveDataDebugModal = () => {
  const {
    isDebugModalOpen,
    setIsDebugModalOpen,
    selectedRobotId,
    robotStatus,
    liveBattery,
    liveMotors,
    liveUltrasonic,
    liveGps,
    liveImu,
    liveWifi,
    commandStatus,
    lastCommandAck,
    formatFreshness,
    dataSource,
  } = useRobot();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/device/debug/stats').then((r) => r.json());
      if (res.success) setStats(res.stats);
    } catch (e) {
      console.warn('Failed to load debug stats', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isDebugModalOpen) {
      fetchStats();
      const interval = setInterval(fetchStats, 1500);
      return () => clearInterval(interval);
    }
  }, [isDebugModalOpen]);

  if (!isDebugModalOpen) return null;

  return (
    <div
      id="live-data-debug-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in font-sans"
    >
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-slate-900 uppercase tracking-tight">LIVE DATA MONITOR & PACKET INSPECTOR</span>
                <StatusBadge label={dataSource} variant={dataSource === 'LIVE DEVICE' ? 'green' : 'slate'} />
              </div>
              <p className="text-xs text-slate-500">Real-time ESP32 ingestion diagnostics, latency, and raw payload telemetry</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchStats}
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
          {/* Top Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Target Robot ID</div>
              <div className="text-base font-black text-slate-900 font-mono">{selectedRobotId}</div>
              <div className="text-[11px] text-emerald-700 font-semibold">{robotStatus}</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Packets Ingested</div>
              <div className="text-base font-black text-emerald-700 font-mono">{stats?.packetsReceived ?? 0}</div>
              <div className="text-[11px] text-slate-400">Rejected: {stats?.packetsRejected ?? 0}</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase">WiFi RSSI & IP</div>
              <div className="text-base font-black text-slate-900 font-mono">{liveWifi.rssi != null ? `${liveWifi.rssi} dBm` : 'N/A'}</div>
              <div className="text-[11px] text-slate-400 truncate">{liveWifi.ipAddress || '192.168.4.1'}</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Command Ack Status</div>
              <div className="text-base font-black text-slate-900 font-mono">{commandStatus}</div>
              <div className="text-[11px] text-slate-400">Last: {lastCommandAck?.status || 'None'}</div>
            </div>
          </div>

          {/* Subsystem Live Packet Snapshot */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Battery & Powertrain */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-bold text-slate-900 uppercase text-[11px]">36V BATTERY & POWER RAIL</span>
                <span className="text-[10px] text-slate-400 font-mono">{formatFreshness(liveBattery.updatedAt).text}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 font-mono">
                <div>Voltage: <strong className="text-slate-900">{liveBattery.voltage != null ? `${liveBattery.voltage} V` : 'N/A'}</strong></div>
                <div>Percentage: <strong className="text-slate-900">{liveBattery.percentage != null ? `${liveBattery.percentage}%` : 'N/A'}</strong></div>
                <div>Current: <strong className="text-slate-900">{liveBattery.current != null ? `${liveBattery.current} A` : 'N/A'}</strong></div>
                <div>Temp: <strong className="text-slate-900">{liveBattery.temperature != null ? `${liveBattery.temperature}°C` : 'N/A'}</strong></div>
              </div>
            </div>

            {/* Ultrasonic & Safety */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-bold text-slate-900 uppercase text-[11px]">HC-SR04 RADAR & SAFETY</span>
                <span className="text-[10px] text-slate-400 font-mono">{formatFreshness(liveUltrasonic.updatedAt).text}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 font-mono">
                <div>Front Radar: <strong className="text-slate-900">{liveUltrasonic.frontDistanceM != null ? `${liveUltrasonic.frontDistanceM} m` : 'N/A'}</strong></div>
                <div>Rear Radar: <strong className="text-slate-900">{liveUltrasonic.rearDistanceM != null ? `${liveUltrasonic.rearDistanceM} m` : 'N/A'}</strong></div>
                <div>Radar Status: <strong className="text-emerald-700">{liveUltrasonic.status}</strong></div>
                <div>E-Stop: <strong className={liveBattery.status === 'CRITICAL' ? 'text-rose-600' : 'text-slate-900'}>{commandStatus}</strong></div>
              </div>
            </div>

            {/* IMU 6-DOF */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-bold text-slate-900 uppercase text-[11px]">IMU 6-DOF SENSORS</span>
                <span className="text-[10px] text-slate-400 font-mono">{formatFreshness(liveImu.updatedAt).text}</span>
              </div>
              {liveImu.available ? (
                <div className="grid grid-cols-2 gap-2 font-mono">
                  <div>Accel X/Y/Z: <strong className="text-slate-900">{liveImu.accel.x}, {liveImu.accel.y}, {liveImu.accel.z}</strong></div>
                  <div>Gyro X/Y/Z: <strong className="text-slate-900">{liveImu.gyro.x}, {liveImu.gyro.y}, {liveImu.gyro.z}</strong></div>
                </div>
              ) : (
                <div className="text-slate-400 text-[11px]">IMU NOT AVAILABLE (Awaiting physical sensor packet)</div>
              )}
            </div>

            {/* GPS Hardware */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-bold text-slate-900 uppercase text-[11px]">GPS SATELLITE MODULE</span>
                <span className="text-[10px] text-slate-400 font-mono">{formatFreshness(liveGps.updatedAt).text}</span>
              </div>
              {liveGps.available ? (
                <div className="grid grid-cols-2 gap-2 font-mono">
                  <div>Lat/Lng: <strong className="text-slate-900">{liveGps.latitude}, {liveGps.longitude}</strong></div>
                  <div>Speed/Sat: <strong className="text-slate-900">{liveGps.speed} km/h • {liveGps.satellites || 0} Sats</strong></div>
                </div>
              ) : (
                <div className="text-slate-400 text-[11px]">GPS UNAVAILABLE (No satellite fix)</div>
              )}
            </div>
          </div>

          {/* Raw Telemetry JSON Ingestion Stream */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-bold uppercase text-[11px]">
              <Terminal className="w-3.5 h-3.5 text-emerald-600" />
              <span>LATEST INGESTED HARDWARE TELEMETRY PACKET (RAW JSON)</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-48">
              <pre>
                {JSON.stringify(
                  stats?.rawTelemetryHistory?.length
                    ? stats.rawTelemetryHistory[stats.rawTelemetryHistory.length - 1]
                    : {
                        message: 'No live telemetry packet received yet. Send POST to /api/device/telemetry to ingest real device data.',
                        sampleEndpoint: '/api/device/telemetry',
                        samplePayload: {
                          robotId: selectedRobotId,
                          batteryVoltage: 37.8,
                          batteryPercentage: 92,
                          batteryCurrent: 0.82,
                          leftMotorCurrent: 0.45,
                          rightMotorCurrent: 0.48,
                          leftMotorPWM: 140,
                          rightMotorPWM: 140,
                          obstacleDistance: 2.85,
                          temperature: 28.5,
                          wifiRSSI: -48,
                          controlMode: 'WEB',
                          emergencyStop: false,
                        },
                      },
                  null,
                  2
                )}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>Backend Port: 4000 • Socket.IO Ingestion: ACTIVE</span>
          <button
            onClick={() => setIsDebugModalOpen(false)}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold transition cursor-pointer"
          >
            Close Monitor
          </button>
        </div>
      </div>
    </div>
  );
};
