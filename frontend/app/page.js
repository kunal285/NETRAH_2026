"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRobot } from '@/context/RobotContext';
import { DashboardView } from '@/components/dashboard/DashboardView';
import { ControlView } from '@/components/control/ControlView';
import { VisionView } from '@/components/vision/VisionView';
import { AiView } from '@/components/ai/AiView';
import { DetectionsView } from '@/components/detections/DetectionsView';
import { TelemetryView } from '@/components/telemetry/TelemetryView';
import { SensorsView } from '@/components/sensors/SensorsView';
import { ConfigurationView } from '@/components/configuration/ConfigurationView';
import { SystemView } from '@/components/system/SystemView';
import { SettingsView } from '@/components/settings/SettingsView';

const AUTH_KEY = 'prahari-auth';

export default function HomePage() {
  const router = useRouter();
  const { activeTab } = useRobot();

  useEffect(() => {
    const isAuthenticated = typeof window !== 'undefined' && localStorage.getItem(AUTH_KEY) === 'true';
    if (!isAuthenticated) {
      router.replace('/landing');
    }
  }, [router]);

  switch (activeTab) {
    case 'control':
      return <ControlView />;
    case 'vision':
      return <VisionView />;
    case 'ai':
      return <AiView />;
    case 'detections':
      return <DetectionsView />;
    case 'telemetry':
      return <TelemetryView />;
    case 'sensors':
      return <SensorsView />;
    case 'configuration':
      return <ConfigurationView />;
    case 'system':
      return <SystemView />;
    case 'settings':
      return <SettingsView />;
    case 'dashboard':
    default:
      return <DashboardView />;
  }
}
