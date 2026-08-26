import React from 'react';
import { RobotProvider, useRobot } from './context/RobotContext.jsx';
import { ErrorBoundary } from './components/common/ErrorBoundary.jsx';
import { Header } from './components/layout/Header.jsx';
import { Sidebar } from './components/layout/Sidebar.jsx';
import { BottomNav } from './components/layout/BottomNav.jsx';
import { EmergencyBanner } from './components/common/EmergencyBanner.jsx';
import { AmbulanceAlertModal } from './components/common/AmbulanceAlertModal.jsx';
import { PwaInstallPrompt } from './components/common/PwaInstallPrompt.jsx';

import { DashboardView } from './components/dashboard/DashboardView.jsx';
import { ControlView } from './components/control/ControlView.jsx';
import { VisionView } from './components/vision/VisionView.jsx';
import { AiView } from './components/ai/AiView.jsx';
import { DetectionsView } from './components/detections/DetectionsView.jsx';
import { TelemetryView } from './components/telemetry/TelemetryView.jsx';
import { SensorsView } from './components/sensors/SensorsView.jsx';
import { ConfigurationView } from './components/configuration/ConfigurationView.jsx';
import { SystemView } from './components/system/SystemView.jsx';
import { SettingsView } from './components/settings/SettingsView.jsx';

const MainContent = () => {
  const { activeTab } = useRobot();

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
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
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-950 text-slate-100 overflow-y-auto pb-20 lg:pb-8">
      <EmergencyBanner />
      <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-fade-in">
        {renderActiveView()}
      </main>
      <AmbulanceAlertModal />
      <PwaInstallPrompt />
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <RobotProvider>
        <div id="prahari-app-root" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-sky-500 selection:text-white">
          <Header />
          <div className="flex-1 flex overflow-hidden">
            <Sidebar />
            <MainContent />
          </div>
          <BottomNav />
        </div>
      </RobotProvider>
    </ErrorBoundary>
  );
}

