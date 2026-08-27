"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRobot } from '../../context/RobotContext';
import {
  LayoutDashboard,
  Gamepad2,
  Camera,
  BrainCircuit,
  FileSearch,
  Activity,
  Cpu,
  Wrench,
  Server,
  Settings,
  ShieldCheck,
} from 'lucide-react';

export const Sidebar = () => {
  const { activeTab, setActiveTab } = useRobot();
  const pathname = usePathname();

  const navItems = [
    { id: 'dashboard', href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'control', href: '/control', label: 'Live Control', icon: Gamepad2 },
    { id: 'vision', href: '/vision', label: 'Camera Stream', icon: Camera },
    { id: 'ai', href: '/ai', label: 'AI Perception & ANPR', icon: BrainCircuit },
    { id: 'detections', href: '/detections', label: 'Detection Logs', icon: FileSearch },
    { id: 'telemetry', href: '/telemetry', label: 'Telemetry & Graphs', icon: Activity },
    { id: 'sensors', href: '/sensors', label: 'Sensor Dashboard', icon: Cpu },
    { id: 'configuration', href: '/configuration', label: 'Robot Health & Specs', icon: Wrench },
    { id: 'system', href: '/system', label: 'System Diagnostics', icon: Server },
    { id: 'settings', href: '/settings', label: 'Hardware HAL', icon: Settings },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 p-4 font-sans select-none shadow-2xs">
      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
        ROBOTICS CONSOLE
      </div>

      <nav className="space-y-1 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            activeTab === item.id ||
            pathname === item.href ||
            (item.id !== 'dashboard' && pathname?.startsWith(item.href));

          return (
            <Link
              key={item.id}
              id={`sidebar-nav-${item.id}`}
              href={item.href}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer text-left ${
                isActive
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Raspberry Pi 5 Engineering Specs Card */}
      <div className="pt-4 border-t border-slate-100">
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-500 space-y-1.5">
          <div className="flex items-center justify-between font-bold text-slate-800">
            <span>Raspberry Pi 5 (8GB)</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">ARM64</span>
          </div>
          <div className="text-[10px]">Dual 36V 350W MY1016 • RP1 I/O</div>
          <div className="flex items-center gap-1.5 text-emerald-600 font-medium text-[10px]">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>BTS7960 Driver Online</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
