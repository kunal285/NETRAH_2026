"use client";

import React from 'react';
import Link from 'next/link';
import { useRobot } from '../../context/RobotContext';
import {
  FileSearch,
  Activity,
  Cpu,
  Wrench,
  Server,
  Settings,
  X,
} from 'lucide-react';

export const MoreMenuModal = ({ isOpen, onClose }) => {
  const { activeTab, setActiveTab } = useRobot();

  if (!isOpen) return null;

  const extraTabs = [
    { id: 'detections', href: '/detections', label: 'Detection Logs & Plates', icon: FileSearch, desc: 'Perception history & ANPR query' },
    { id: 'telemetry', href: '/telemetry', label: 'Telemetry & Real-Time Graphs', icon: Activity, desc: 'Voltage, BTS7960 current & radar logs' },
    { id: 'sensors', href: '/sensors', label: 'Sensor Array & Injection', icon: Cpu, desc: 'HC-SR04, ACS712, LM2596 diagnostics' },
    { id: 'configuration', href: '/configuration', label: 'Robot Parameters & Hardware Specs', icon: Wrench, desc: 'Speed limits & safety interlocks' },
    { id: 'system', href: '/system', label: 'System Diagnostics & Log', icon: Server, desc: 'Node.js & ESP32 backend diagnostics' },
    { id: 'settings', href: '/settings', label: 'Hardware HAL & Bench', icon: Settings, desc: 'Switch simulator / ESP32 serial bridge' },
  ];

  const handleSelect = (id) => {
    setActiveTab(id);
    onClose();
  };

  return (
    <div
      id="more-menu-modal"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in font-mono"
    >
      <div className="bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="text-sm font-bold text-white uppercase tracking-wider">
            ADDITIONAL COMMAND MODULES
          </div>
          <button
            id="btn-close-more-menu"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {extraTabs.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <Link
                key={item.id}
                id={`more-menu-${item.id}`}
                href={item.href}
                onClick={() => handleSelect(item.id)}
                className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition cursor-pointer ${
                  isActive
                    ? 'bg-sky-950/80 border-sky-500 text-sky-300 shadow-md'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/80'
                }`}
              >
                <div className={`p-2 rounded-lg ${isActive ? 'bg-sky-600/30 text-sky-400' : 'bg-slate-900 text-slate-400'}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">{item.label}</div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{item.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

