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
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-1 py-1 flex items-center justify-around font-sans shadow-lg select-none w-full max-w-full overflow-hidden"
        style={{
          paddingBottom: 'calc(0.25rem + env(safe-area-inset-bottom, 0px))',
          minHeight: '64px',
        }}
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
              className={`flex-1 min-w-0 min-h-[44px] flex flex-col items-center justify-center gap-0.5 py-1 px-0.5 rounded-xl transition cursor-pointer text-center ${
                isActive
                  ? 'text-emerald-800 font-extrabold bg-emerald-50/90 border border-emerald-200/60 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 active:bg-slate-100'
              }`}
            >
              <Icon className={`w-4.5 h-4.5 transition-transform shrink-0 ${isActive ? 'text-emerald-600 scale-105' : 'text-slate-400'}`} />
              <span className="text-[10px] tracking-tight font-bold truncate max-w-full">{tab.label}</span>
            </Link>
          );
        })}

        {/* More Menu Drawer / Diagnostics trigger */}
        <button
          id="bottom-nav-more"
          onClick={() => setIsMoreOpen(true)}
          className="flex-1 min-w-0 min-h-[44px] flex flex-col items-center justify-center gap-0.5 py-1 px-0.5 rounded-xl text-slate-500 hover:text-slate-900 active:bg-slate-100 cursor-pointer text-center"
          title="More Diagnostics & Modules"
        >
          <Menu className="w-4.5 h-4.5 text-slate-400 shrink-0" />
          <span className="text-[10px] tracking-tight font-bold truncate max-w-full">MORE</span>
        </button>
      </nav>

      <MoreMenuModal isOpen={isMoreOpen} onClose={() => setIsMoreOpen(false)} />
    </>
  );
};
