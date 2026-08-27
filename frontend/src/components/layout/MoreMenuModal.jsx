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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in font-sans"
    >
      <div className="bg-white border-t sm:border border-slate-200 rounded-t-3xl sm:rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            ROBOTICS MODULES
          </div>
          <button
            id="btn-close-more-menu"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-900 cursor-pointer transition"
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
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className={`p-2 rounded-lg ${isActive ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">{item.label}</div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};
