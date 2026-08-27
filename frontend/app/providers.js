"use client";

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { RobotProvider, useRobot } from '@/context/RobotContext';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomNav } from '@/components/layout/BottomNav';
import { EmergencyBanner } from '@/components/common/EmergencyBanner';
import { AmbulanceAlertModal } from '@/components/common/AmbulanceAlertModal';
import { LiveDataDebugModal } from '@/components/common/LiveDataDebugModal';
import { PwaInstallPrompt } from '@/components/common/PwaInstallPrompt';

const AUTH_KEY = 'prahari-auth';

function NavigationSync() {
  const pathname = usePathname();
  const router = useRouter();
  const { setActiveTab } = useRobot();
  const [isAuthenticated, setIsAuthenticated] = useState(true);

  useEffect(() => {
    const savedAuth = typeof window !== 'undefined' ? localStorage.getItem(AUTH_KEY) : null;
    const authed = savedAuth !== 'false';
    setIsAuthenticated(authed);

    const publicPaths = ['/', '/login', '/landing'];
    if (!authed && !publicPaths.includes(pathname || '/')) {
      router.replace('/landing');
    }

    if (!pathname) return;
    const tab = pathname.replace(/^\//, '') || 'dashboard';
    const validTabs = [
      'dashboard',
      'control',
      'vision',
      'ai',
      'detections',
      'telemetry',
      'sensors',
      'configuration',
      'system',
      'settings',
    ];
    if (validTabs.includes(tab)) {
      setActiveTab(tab);
    }
  }, [pathname, router, setActiveTab]);

  return null;
}

function AppShell({ children }) {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsAuthenticated(localStorage.getItem(AUTH_KEY) !== 'false');
    }
  }, [pathname]);

  const isPublicPage = pathname === '/login' || pathname === '/landing';
  if (isPublicPage) {
    return <>{children}</>;
  }

  return (
    <div id="prahari-app-root" className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-600 selection:text-white">
      <NavigationSync />
      <Header />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8 bg-slate-50">
          <div className="max-w-7xl mx-auto space-y-6">
            <EmergencyBanner />
            {children}
          </div>
        </main>
      </div>

      <AmbulanceAlertModal />
      <LiveDataDebugModal />
      <PwaInstallPrompt />
      <BottomNav />
    </div>
  );
}

export function Providers({ children }) {
  return (
    <ErrorBoundary>
      <RobotProvider>
        <AppShell>{children}</AppShell>
      </RobotProvider>
    </ErrorBoundary>
  );
}
