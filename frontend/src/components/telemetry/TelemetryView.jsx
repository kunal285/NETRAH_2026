"use client";

import React from 'react';
import { useRobot } from '../../context/RobotContext';
import { StatusBadge } from '../common/StatusBadge';
import {
  Activity,
  Battery,
  Zap,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  AreaChart,
  Area,
} from 'recharts';

export const TelemetryView = () => {
  const { liveBattery, liveMotors, liveWifi, telemetryHistory, robotStatus, formatFreshness, selectedRobotId } = useRobot();

  const chartData = telemetryHistory.map((t) => ({
    time: t.timestamp ? new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    batteryVoltage: t.batteryVoltage,
    batteryPercentage: t.batteryPercentage,
    totalCurrent: t.batteryCurrent || t.totalCurrent,
    leftCurrent: t.leftMotorCurrent,
    rightCurrent: t.rightMotorCurrent,
    leftPWM: t.leftMotorPWM,
    rightPWM: t.rightMotorPWM,
    obstacleDistance: t.obstacleDistance,
    temperature: t.temperature,
  }));

  return (
    <div id="telemetry-view" className="space-y-6 max-w-6xl mx-auto font-sans">
      {/* Header Stat Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-1">
          <div className="text-xs text-slate-500 font-semibold uppercase">36V Pack Voltage</div>
          <div className="text-xl font-black text-emerald-700 font-mono">
            {liveBattery.voltage != null ? `${liveBattery.voltage} V` : 'N/A'}
          </div>
          <div className="text-[11px] text-slate-400">
            SoC: {liveBattery.percentage != null ? `${liveBattery.percentage}%` : 'N/A'} • {formatFreshness(liveBattery.updatedAt).text}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-1">
          <div className="text-xs text-slate-500 font-semibold uppercase">Total Battery Draw</div>
          <div className="text-xl font-black text-slate-900 font-mono">
            {liveBattery.current != null ? `${liveBattery.current} A` : 'N/A'}
          </div>
          <div className="text-[11px] text-slate-400">Fused: 40A Inline Protection</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-1">
          <div className="text-xs text-slate-500 font-semibold uppercase">WiFi RSSI & Link</div>
          <div className="text-xl font-black text-slate-900 font-mono">
            {liveWifi.rssi != null ? `${liveWifi.rssi} dBm` : 'N/A'}
          </div>
          <div className="text-[11px] text-slate-400">{robotStatus} • Uptime: {liveWifi.uptimeSeconds || 0}s</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-1">
          <div className="text-xs text-slate-500 font-semibold uppercase">5V Regulated Rail</div>
          <div className="text-xl font-black text-slate-900 font-mono">
            {liveBattery.voltage != null ? '5.00 V' : 'N/A'}
          </div>
          <div className="text-[11px] text-slate-400">
            {liveBattery.voltage != null ? 'LM2596 Step-Down: OK' : 'Rail Inactive'}
          </div>
        </div>
      </div>

      {/* Primary Graphs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graph 1: Battery Voltage */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <Battery className="w-4 h-4 text-emerald-600" />
              <span>36V BATTERY VOLTAGE & SAG — {selectedRobotId}</span>
            </div>
            <StatusBadge
              label={robotStatus === 'ONLINE' ? 'NOMINAL 36V' : 'NO LIVE DATA'}
              variant={robotStatus === 'ONLINE' ? 'green' : 'slate'}
            />
          </div>

          <div className="h-64 w-full text-xs">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400">
                Awaiting live telemetry packets from physical robot...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorVoltage" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16a34a" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="time" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                  <YAxis domain={[28, 44]} stroke="#94a3b8" tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', color: '#0f172a' }}
                  />
                  <Area type="monotone" dataKey="batteryVoltage" stroke="#16a34a" strokeWidth={2} fillOpacity={1} fill="url(#colorVoltage)" name="Voltage (V)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Graph 2: Dual Motor Current Draw */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <Zap className="w-4 h-4 text-emerald-600" />
              <span>DUAL BTS7960 MOTOR CURRENT</span>
            </div>
            <StatusBadge label="LIMIT: 22A/MOTOR" variant="slate" />
          </div>

          <div className="h-64 w-full text-xs">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400">
                Awaiting live motor current sampling...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="time" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', color: '#0f172a' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="leftCurrent" stroke="#16a34a" strokeWidth={2} dot={false} name="Left Motor (A)" />
                  <Line type="monotone" dataKey="rightCurrent" stroke="#64748b" strokeWidth={2} dot={false} name="Right Motor (A)" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
