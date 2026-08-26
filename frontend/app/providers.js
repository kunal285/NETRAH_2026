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
import { PwaInstallPrompt } from '@/components/common/PwaInstallPrompt';

const AUTH_KEY = 'prahari-auth';

function NavigationSync() {
  const pathname = usePathname();
  const router = useRouter();
  const { setActiveTab } = useRobot();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const savedAuth = typeof window !== 'undefined' ? localStorage.getItem(AUTH_KEY) : null;
    const authed = savedAuth === 'true';
    setIsAuthenticated(authed);

    const publicPaths = ['/', '/login'];
    if (!authed && !publicPaths.includes(pathname || '/')) {
      router.replace('/login');
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsAuthenticated(localStorage.getItem(AUTH_KEY) === 'true');
    }
  }, [pathname]);

  if (!isAuthenticated && pathname !== '/login') {
    return <>{children}</>;
  }

  return (
    <div id="prahari-app-root" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-mono selection:bg-sky-500 selection:text-white">
      <NavigationSync />
      <Header />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 pb-24 lg:pb-6 bg-slate-950">
          <div className="max-w-7xl mx-auto space-y-4">
            <EmergencyBanner />
            {children}
          </div>
        </main>
      </div>

      <AmbulanceAlertModal />
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
