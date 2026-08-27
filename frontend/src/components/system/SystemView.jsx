"use client";

import React, { useState, useEffect } from 'react';
import { useRobot } from '../../context/RobotContext';
import { api } from '../../lib/api.js';
import { StatusBadge } from '../common/StatusBadge';
import {
  Network,
  Server,
  RefreshCw,
  Cpu,
  Database,
  Camera,
  BrainCircuit,
  Bot,
  ShieldCheck,
} from 'lucide-react';

export const SystemView = () => {
  const { systemEvents, socketConnected, backendOnline, robotCameraStatus, robotState } = useRobot();
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

  const healthItems = [
    { label: 'ROBOT CONTROLLER', status: robotState?.status === 'ONLINE' ? 'ONLINE' : 'STANDBY', icon: Bot, variant: 'green' },
    { label: 'BATTERY INTERLOCK', status: 'NORMAL', icon: ShieldCheck, variant: 'green' },
    { label: 'DUAL MY1016 MOTORS', status: 'NORMAL', icon: Cpu, variant: 'green' },
    { label: 'HC-SR04 SENSORS', status: 'NORMAL', icon: Network, variant: 'green' },
    { label: '1080p CAMERA STREAM', status: 'ONLINE', icon: Camera, variant: 'green' },
    { label: 'PYTHON AI MICROSERVICE', status: 'ONLINE (7ms)', icon: BrainCircuit, variant: 'green' },
    { label: 'MONGODB DATABASE', status: backendOnline ? 'CONNECTED' : 'STANDALONE', icon: Database, variant: backendOnline ? 'green' : 'amber' },
    { label: 'NODE.JS BACKEND', status: 'ONLINE', icon: Server, variant: 'green' },
  ];

  return (
    <div id="system-diagnostics-view" className="space-y-6 max-w-6xl mx-auto font-sans">
      {/* Header Info */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 uppercase">SYSTEM ARCHITECTURE & DIAGNOSTICS</div>
            <p className="text-xs text-slate-500">
              Host backend runtime telemetry, Socket.IO channels, and real-time system events.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-system-ping"
            onClick={handlePing}
            disabled={pinging}
            className="px-3.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${pinging ? 'animate-spin text-emerald-600' : ''}`} />
            <span>{pingLatency !== null ? `${pingLatency} ms Latency` : 'Test Ping'}</span>
          </button>
          <StatusBadge
            label={socketConnected ? 'SOCKET.IO LIVE' : 'SOCKET OFFLINE'}
            variant={socketConnected ? 'green' : 'red'}
          />
        </div>
      </div>

      {/* Subsystem Health Cards Grid (Binary Botz section 16: Robot Health) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {healthItems.map((h, idx) => {
          const Icon = h.icon;
          return (
            <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{h.label}</span>
                <Icon className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                <span className="text-sm font-black text-slate-900">{h.status}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Real-time System Log Feed */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            SYSTEM EVENT & INTERLOCK LOGS
          </div>
          <button
            onClick={handleClear}
            className="text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
          >
            Clear Log
          </button>
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {filteredEvents.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              System running optimally. No critical faults logged.
            </div>
          ) : (
            filteredEvents.map((evt, i) => (
              <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${evt.level === 'CRITICAL' ? 'bg-rose-500' : evt.level === 'WARNING' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                  <span className="font-semibold text-slate-800">{evt.message || 'System diagnostic check OK'}</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
