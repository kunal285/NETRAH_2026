"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRobot } from '../../context/RobotContext';
import {
  Home,
  Gamepad2,
  Camera,
  Bot,
  Settings,
  Menu,
} from 'lucide-react';
import { MoreMenuModal } from './MoreMenuModal.jsx';

export const BottomNav = () => {
  const { activeTab, setActiveTab } = useRobot();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const pathname = usePathname();

  const mainTabs = [
    { id: 'dashboard', href: '/', label: 'HOME', icon: Home },
    { id: 'control', href: '/control', label: 'CONTROL', icon: Gamepad2 },
    { id: 'vision', href: '/vision', label: 'CAMERA', icon: Camera },
    { id: 'ai', href: '/ai', label: 'AI', icon: Bot },
    { id: 'settings', href: '/settings', label: 'SETTINGS', icon: Settings },
  ];

  return (
    <>
      <nav
        id="mobile-bottom-nav"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-2 py-1.5 flex items-center justify-around font-sans shadow-lg select-none"
        style={{ paddingBottom: 'calc(0.375rem + var(--safe-area-inset-bottom))' }}
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
              className={`flex-1 min-h-[48px] flex flex-col items-center justify-center gap-1 py-1 px-1 rounded-xl transition cursor-pointer ${
                isActive
                  ? 'text-emerald-700 font-extrabold bg-emerald-50/70 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 active:bg-slate-100'
              }`}
            >
              <Icon className={`w-5 h-5 transition-transform ${isActive ? 'text-emerald-600 scale-110' : 'text-slate-400'}`} />
              <span className="text-[10px] tracking-tight font-bold">{tab.label}</span>
            </Link>
          );
        })}

        {/* More Menu Drawer / Diagnostics trigger */}
        <button
          id="bottom-nav-more"
          onClick={() => setIsMoreOpen(true)}
          className="min-h-[48px] px-2 flex flex-col items-center justify-center gap-1 py-1 rounded-xl text-slate-400 hover:text-slate-900 active:bg-slate-100 cursor-pointer"
          title="More Diagnostics & Logs"
        >
          <Menu className="w-5 h-5 text-slate-400" />
          <span className="text-[9px] tracking-tight font-medium">MORE</span>
        </button>
      </nav>

      <MoreMenuModal isOpen={isMoreOpen} onClose={() => setIsMoreOpen(false)} />
    </>
  );
};
