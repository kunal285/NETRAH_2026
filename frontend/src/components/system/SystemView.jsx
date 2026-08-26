"use client";

import React, { useState, useEffect } from 'react';
import { useRobot } from '../../context/RobotContext';
import { api } from '../../lib/api.js';
import { StatusBadge } from '../common/StatusBadge';
import {
  Network,
  Cpu,
  Server,
  Activity,
  Trash2,
  RefreshCw,
  Clock,
  ShieldCheck,
  Radio,
} from 'lucide-react';

export const SystemView = () => {
  const { systemEvents, socketConnected, backendOnline, robotCameraStatus } = useRobot();
  const [levelFilter, setLevelFilter] = useState('all');
  const [pingLatency, setPingLatency] = useState(null);
  const [pinging, setPinging] = useState(false);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    setEvents(systemEvents);
  }, [systemEvents]);

  const handlePing = async () => {
    setPinging(true);
    const start = performance.now();
    try {
      await api.getHealth();
      const latency = Math.round(performance.now() - start);
      setPingLatency(latency);
    } catch (e) {
      setPingLatency(-1);
    } finally {
      setPinging(false);
    }
  };

  const handleClear = async () => {
    await api.clearSystemEvents();
    setEvents([]);
  };

  const filteredEvents = events.filter((e) => {
    if (levelFilter === 'all') return true;
    return e.level === levelFilter;
  });

  return (
    <div id="system-diagnostics-view" className="space-y-6 max-w-6xl mx-auto font-mono">
      {/* Header Info */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sky-600/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
            <Network className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">SYSTEM ARCHITECTURE & DIAGNOSTICS</div>
            <p className="text-[11px] text-slate-400">
              Host backend runtime telemetry, Socket.IO channels, and real-time security events.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-system-ping"
            onClick={handlePing}
            disabled={pinging}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${pinging ? 'animate-spin' : ''}`} />
            <span>{pingLatency !== null ? `${pingLatency} ms Latency` : 'Test Ping'}</span>
          </button>
          <StatusBadge
            label={socketConnected ? 'SOCKET.IO LIVE' : 'SOCKET OFFLINE'}
            variant={socketConnected ? 'green' : 'red'}
          />
        </div>
      </div>

      {/* Subsystem Health Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Node.js Backend Server */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">NODE.JS BACKEND</span>
            <Server className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-xl font-black text-white">ONLINE 200 OK</div>
          <div className="text-[11px] text-slate-400 space-y-0.5">
            <div>Framework: Express v4 + Vite</div>
            <div>Real-Time: Socket.IO Engine</div>
            <div>Simulator: MockRobotAdapter</div>
          </div>
        </div>

        {/* ESP32 Firmware Subsystem */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">ESP32 LOGIC MCU</span>
            <Cpu className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-black text-white">240 MHz DUAL-CORE</div>
          <div className="text-[11px] text-slate-400 space-y-0.5">
            <div>Firmware: PRAHARI_ESP32_v1.2</div>
            <div>ADC Channels: ADC1 12-Bit</div>
            <div>Free Heap: 284 KB</div>
          </div>
        </div>

        {/* Safety Engine Core */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">SAFETY ENGINE CORE</span>
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl font-black text-white">ACTIVE INTERLOCK</div>
          <div className="text-[11px] text-slate-400 space-y-0.5">
            <div>Obstacle Radar: Active</div>
            <div>Current Protection: Active</div>
            <div>Under-Voltage Lockout: Armed</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">PRAHARI ROBOT CAMERA</span>
            <Radio className="w-4 h-4 text-sky-400" />
          </div>
          <div className={`text-xl font-black ${robotCameraStatus === 'STREAMING' ? 'text-emerald-400' : 'text-rose-400'}`}>
            {robotCameraStatus === 'STREAMING' ? 'ROBOT CAMERA ONLINE' : 'ROBOT CAMERA OFFLINE'}
          </div>
          <div className="text-[11px] text-slate-400">Status: {robotCameraStatus}</div>
        </div>
      </div>

      {/* Live System Events Log Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 font-bold text-white text-sm">
            <Activity className="w-4 h-4 text-sky-400" />
            <span>REAL-TIME SYSTEM DIAGNOSTIC LOG</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {['all', 'info', 'warning', 'danger', 'critical'].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setLevelFilter(lvl)}
                  className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition cursor-pointer border ${
                    levelFilter === lvl
                      ? 'bg-sky-600 text-white border-sky-400'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>

            <button
              id="btn-clear-system-events"
              onClick={handleClear}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
              title="Clear event log"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {filteredEvents.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No system diagnostic events in current filter.
            </div>
          ) : (
            filteredEvents.map((evt) => (
              <div
                key={evt.id}
                className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs flex items-start justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                        evt.level === 'critical'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : evt.level === 'danger'
                          ? 'bg-rose-900 text-rose-200 border border-rose-700'
                          : evt.level === 'warning'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-sky-950 text-sky-300 border border-sky-800'
                      }`}
                    >
                      {evt.level}
                    </span>
                    <span className="font-bold text-white">{evt.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-400">{evt.description}</p>
                </div>
                <span className="text-[10px] text-slate-500 whitespace-nowrap">
                  {new Date(evt.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
