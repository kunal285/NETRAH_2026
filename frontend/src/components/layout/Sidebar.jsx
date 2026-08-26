"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRobot } from '../../context/RobotContext';
import {
  LayoutDashboard,
  Gamepad2,
  Eye,
  BrainCircuit,
  FileSearch,
  Activity,
  Cpu,
  Wrench,
  Server,
  Settings,
} from 'lucide-react';

export const Sidebar = () => {
  const { activeTab, setActiveTab } = useRobot();
  const pathname = usePathname();

  const navItems = [
    { id: 'dashboard', href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'control', href: '/control', label: 'Robot Control', icon: Gamepad2 },
    { id: 'vision', href: '/vision', label: 'Vision Stream', icon: Eye },
    { id: 'ai', href: '/ai', label: 'AI Suite & ANPR', icon: BrainCircuit },
    { id: 'detections', href: '/detections', label: 'Detection Logs', icon: FileSearch },
    { id: 'telemetry', href: '/telemetry', label: 'Telemetry & Graphs', icon: Activity },
    { id: 'sensors', href: '/sensors', label: 'Sensor Array', icon: Cpu },
    { id: 'configuration', href: '/configuration', label: 'Parameters / Specs', icon: Wrench },
    { id: 'system', href: '/system', label: 'System Diagnostics', icon: Server },
    { id: 'settings', href: '/settings', label: 'Hardware HAL', icon: Settings },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-slate-900/95 border-r border-slate-800 p-4 font-mono select-none">
      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-2">
        COMMAND CONSOLE
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
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer text-left ${
                isActive
                  ? 'bg-sky-600/20 text-sky-400 border border-sky-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* SIH Hackathon NETRA Footer Badge */}
      <div className="pt-4 border-t border-slate-800/80">
        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-[10px] text-slate-400 space-y-1">
          <div className="font-bold text-slate-200">SIH 2024 NETRA</div>
          <div>Dual 36V 350W MY1016</div>
          <div className="text-emerald-400">● BTS7960 Driver Ready</div>
        </div>
      </div>
    </aside>
  );
};

