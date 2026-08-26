"use client";

import React from 'react';
import { useRobot } from '../../context/RobotContext';
import { StatusBadge } from '../common/StatusBadge';
import {
  Activity,
  Battery,
  Cpu,
  Gauge,
  Radio,
  Thermometer,
  Zap,
  TrendingUp,
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
  const { robotState, telemetry, telemetryHistory } = useRobot();

  // Prepare chart data from telemetryHistory
  const chartData = telemetryHistory.map((t) => ({
    time: new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    batteryVoltage: t.batteryVoltage,
    batteryPercentage: t.batteryPercentage,
    totalCurrent: t.totalCurrent,
    leftCurrent: t.leftMotorCurrent,
    rightCurrent: t.rightMotorCurrent,
    leftSpeed: Math.abs(t.leftMotorSpeed),
    rightSpeed: Math.abs(t.rightMotorSpeed),
    obstacleDistance: t.obstacleDistance,
    motorTemp: t.leftMotorTemp,
    cpuLoad: t.cpuLoad,
  }));

  return (
    <div id="telemetry-view" className="space-y-6 max-w-6xl mx-auto font-mono">
      {/* Header Stat Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <div className="text-xs text-slate-400">36V Pack Voltage</div>
          <div className="text-xl font-black text-emerald-400">{telemetry.batteryVoltage == null ? 'DATA UNAVAILABLE' : `${telemetry.batteryVoltage} V`}</div>
          <div className="text-[11px] text-slate-500">State of Charge: {telemetry.batteryPercentage == null ? 'N/A' : `${telemetry.batteryPercentage}%`}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <div className="text-xs text-slate-400">Total System Draw</div>
          <div className="text-xl font-black text-sky-400">{telemetry.totalCurrent == null ? 'DATA UNAVAILABLE' : `${telemetry.totalCurrent} A`}</div>
          <div className="text-[11px] text-slate-500">Peak Load: 35.0A (Fused 40A)</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <div className="text-xs text-slate-400">Telemetry Loop Rate</div>
          <div className="text-xl font-black text-indigo-400">{telemetry.loopRateHz} Hz</div>
          <div className="text-[11px] text-slate-500">ESP32 Core Frequency: 240MHz</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <div className="text-xs text-slate-400">Internal 5V Regulated Rail</div>
          <div className="text-xl font-black text-white">{telemetry.internal5VRail} V</div>
          <div className="text-[11px] text-slate-500">LM2596 Step-Down: OK</div>
        </div>
      </div>

      {/* Primary Graphs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graph 1: Battery Voltage & State of Charge */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 font-bold text-white text-sm">
              <Battery className="w-4 h-4 text-emerald-400" />
              <span>36V BATTERY VOLTAGE & SAG</span>
            </div>
            <StatusBadge label="NOMINAL 36V / 42V PEAK" variant="green" />
          </div>

          <div className="h-64 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorVoltage" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis domain={[28, 44]} stroke="#64748b" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    color: '#f8fafc',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="batteryVoltage"
                  name="Pack Voltage (V)"
                  stroke="#10b981"
                  fillOpacity={1}
                  fill="url(#colorVoltage)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graph 2: Dual Motor Current Draw */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 font-bold text-white text-sm">
              <Zap className="w-4 h-4 text-sky-400" />
              <span>DUAL MOTOR CURRENT DRAW (A)</span>
            </div>
            <StatusBadge label="BTS7960 DUAL H-BRIDGE" variant="blue" />
          </div>

          <div className="h-64 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 25]} stroke="#64748b" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    color: '#f8fafc',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="leftCurrent"
                  name="Left Motor (A)"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="rightCurrent"
                  name="Right Motor (A)"
                  stroke="#fbbf24"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graph 3: Ultrasonic Obstacle Proximity Distance */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 font-bold text-white text-sm">
              <Activity className="w-4 h-4 text-rose-400" />
              <span>OBSTACLE PROXIMITY DISTANCE (m)</span>
            </div>
            <StatusBadge label="HC-SR04 RADAR" variant="purple" />
          </div>

          <div className="h-64 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 4.5]} stroke="#64748b" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    color: '#f8fafc',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Line
                  type="stepAfter"
                  dataKey="obstacleDistance"
                  name="Front Obstacle Distance (m)"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graph 4: Motor Temperature & CPU Load */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 font-bold text-white text-sm">
              <Thermometer className="w-4 h-4 text-amber-400" />
              <span>THERMAL & CPU LOAD PROFILES</span>
            </div>
            <StatusBadge label="HEATSINK DISSIPATION" variant="amber" />
          </div>

          <div className="h-64 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    color: '#f8fafc',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="motorTemp"
                  name="Driver Temp (°C)"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="cpuLoad"
                  name="ESP32 CPU Load (%)"
                  stroke="#a855f7"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
