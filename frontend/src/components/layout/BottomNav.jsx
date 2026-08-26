"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRobot } from '../../context/RobotContext';
import {
  LayoutDashboard,
  Gamepad2,
  Eye,
  BrainCircuit,
  Menu,
} from 'lucide-react';
import { MoreMenuModal } from './MoreMenuModal.jsx';

export const BottomNav = () => {
  const { activeTab, setActiveTab } = useRobot();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const pathname = usePathname();

  const mainTabs = [
    { id: 'dashboard', href: '/', label: 'Home', icon: LayoutDashboard },
    { id: 'control', href: '/control', label: 'Control', icon: Gamepad2 },
    { id: 'vision', href: '/vision', label: 'Vision', icon: Eye },
    { id: 'ai', href: '/ai', label: 'AI Suite', icon: BrainCircuit },
  ];

  return (
    <>
      <nav
        id="mobile-bottom-nav"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 px-3 py-2 flex items-center justify-around font-mono"
      >
        {mainTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            activeTab === tab.id ||
            pathname === tab.href ||
            (tab.id !== 'dashboard' && pathname?.startsWith(tab.href));

          return (
            <Link
              key={tab.id}
              id={`bottom-nav-${tab.id}`}
              href={tab.href}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition cursor-pointer ${
                isActive ? 'text-sky-400 font-black' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-sky-400 scale-110' : 'text-slate-400'}`} />
              <span className="text-[10px] tracking-tight">{tab.label}</span>
            </Link>
          );
        })}

        {/* More Menu Drawer / Modal trigger */}
        <button
          id="bottom-nav-more"
          onClick={() => setIsMoreOpen(true)}
          className="flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-slate-400 hover:text-slate-200 cursor-pointer"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] tracking-tight">More</span>
        </button>
      </nav>

      <MoreMenuModal isOpen={isMoreOpen} onClose={() => setIsMoreOpen(false)} />
    </>
  );
};

