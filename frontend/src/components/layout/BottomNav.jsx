"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRobot } from '../../context/RobotContext';
import {
  LayoutDashboard,
  Gamepad2,
  Camera,
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
    { id: 'vision', href: '/vision', label: 'Camera', icon: Camera },
    { id: 'ai', href: '/ai', label: 'AI Suite', icon: BrainCircuit },
  ];

  return (
    <>
      <nav
        id="mobile-bottom-nav"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-2 flex items-center justify-around font-sans shadow-lg"
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
                isActive ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-600 scale-105' : 'text-slate-400'}`} />
              <span className="text-[10px] tracking-tight">{tab.label}</span>
            </Link>
          );
        })}

        {/* More Menu Drawer / Modal trigger */}
        <button
          id="bottom-nav-more"
          onClick={() => setIsMoreOpen(true)}
          className="flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-slate-500 hover:text-slate-900 cursor-pointer"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] tracking-tight">More</span>
        </button>
      </nav>

      <MoreMenuModal isOpen={isMoreOpen} onClose={() => setIsMoreOpen(false)} />
    </>
  );
};
