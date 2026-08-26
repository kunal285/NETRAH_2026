"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { socketClient } from '../lib/socket.js';
import { api } from '../lib/api.js';

const initialRobotState = {
  status: 'ONLINE',
  mode: 'WEB',
  demoMode: false,
  movement: 'STOPPED',
  speed: 50,
  leftMotor: {
    speed: 0,
    current: 0.0,
    voltage: 36.0,
    temp: 32.0,
    status: 'NORMAL',
  },
  rightMotor: {
    speed: 0,
    current: 0.0,
    voltage: 36.0,
    temp: 32.0,
    status: 'NORMAL',
  },
  battery: {
    voltage: 37.8,
    current: 0.8,
    percentage: 92,
    temperature: 28.5,
    status: 'NORMAL',
  },
  ultrasonic: {
    distance: 2.85,
    status: 'CLEAR',
  },
  safety: {
    emergencyStop: false,
    obstacleInterlock: false,
    overcurrentInterlock: false,
    undervoltageInterlock: false,
    state: 'SAFE',
    message: 'System nominal. Safety interlocks armed.',
  },
  uptimeSeconds: 0,
};

const initialTelemetry = {
  timestamp: new Date().toISOString(),
  batteryVoltage: null,
  batteryCurrent: 0.8,
  batteryPercentage: 92,
  batteryTemp: 28.5,
  leftMotorSpeed: 0,
  leftMotorCurrent: 0.0,
  leftMotorVoltage: 36.0,
  leftMotorTemp: 32.0,
  rightMotorSpeed: 0,
  rightMotorCurrent: 0.0,
  rightMotorVoltage: 36.0,
  rightMotorTemp: 32.0,
  obstacleDistance: 2.85,
  obstacleStatus: 'CLEAR',
  movement: 'STOPPED',
  mode: 'WEB',
  speedPWM: 50,
  emergencyStop: false,
  totalCurrent: 0.8,
  internal5VRail: 5.02,
  cpuLoad: 18,
  loopRateHz: 50,
};

const initialSettings = {
  defaultSpeed: 50,
  maxSpeed: 90,
  emergencyStopDistance: 0.35,
  obstacleWarningDistance: 0.80,
  maxMotorCurrent: 22.0,
  criticalBatteryVoltage: 31.0,
  telemetryIntervalMs: 200,
  cameraFps: 30,
  enableAnpr: true,
  enableAmbulanceAlert: true,
  hardwarePort: '/dev/ttyUSB0',
  hardwareBaudRate: 115200,
};

const RobotContext = createContext(undefined);

export const RobotProvider = ({ children }) => {
  const [robotState, setRobotState] = useState(initialRobotState);
  const [telemetry, setTelemetry] = useState(initialTelemetry);
  const [telemetryHistory, setTelemetryHistory] = useState([]);
  const [systemEvents, setSystemEvents] = useState([]);
  const [latestDetection, setLatestDetection] = useState(null);
  const [activeAmbulance, setActiveAmbulance] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [backendOnline, setBackendOnline] = useState(true);
  const [settings, setSettings] = useState(initialSettings);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [robotCameraStatus, setRobotCameraStatus] = useState('OFFLINE');

  // Sync initial configuration & state from backend
  const fetchInitialData = useCallback(async () => {
    try {
      const [stateData, eventsData, ambData, settsData] = await Promise.allSettled([
        api.getRobotState(),
        api.getSafetyEvents(),
        api.getActiveAmbulance(),
        api.getSettings(),
      ]);

      if (stateData.status === 'fulfilled') setRobotState(stateData.value);
      if (eventsData.status === 'fulfilled') setSystemEvents(eventsData.value);
      if (ambData.status === 'fulfilled' && ambData.value?.activeAmbulance) {
        setActiveAmbulance(ambData.value.activeAmbulance);
      }
      if (settsData.status === 'fulfilled') setSettings(settsData.value);
      setBackendOnline(true);
    } catch (err) {
      console.warn('[RobotContext] Initial data sync warning:', err);
      setBackendOnline(false);
    }
  }, []);

  // Initialize Socket.IO connection
  useEffect(() => {
    fetchInitialData();
    const socket = socketClient.connect();

    const handleConnect = () => setSocketConnected(true);
    const handleDisconnect = () => setSocketConnected(false);

    const handleState = (state) => {
      setRobotState(state);
    };

    const handleTelemetry = (data) => {
      setTelemetry(data);
      setTelemetryHistory((prev) => {
        const updated = [...prev, data];
        return updated.slice(-30); // Keep last 30 data points for responsive real-time charts
      });
    };

    const handleSystemEvent = (evt) => {
      setSystemEvents((prev) => [evt, ...prev.slice(0, 49)]);
    };

    const handleAIDetection = (det) => {
      setLatestDetection(det);
    };

    const handleRobotCamera = (status) => {
      setRobotCameraStatus(status?.status || 'OFFLINE');
    };

    const handleAmbulanceAlert = (amb) => {
      setActiveAmbulance(amb);
      setIsEmergencyModalOpen(true);
    };

    const handleAmbulanceCleared = () => {
      setActiveAmbulance(null);
      setIsEmergencyModalOpen(false);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('robot:state', handleState);
    socket.on('robot:telemetry', handleTelemetry);
    socket.on('system:event', handleSystemEvent);
    socket.on('ai:detection', handleAIDetection);
    socket.on('ai:ambulance_alert', handleAmbulanceAlert);
    socket.on('ai:ambulance_cleared', handleAmbulanceCleared);
    socket.on('robot:camera', handleRobotCamera);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('robot:state', handleState);
      socket.off('robot:telemetry', handleTelemetry);
      socket.off('system:event', handleSystemEvent);
      socket.off('ai:detection', handleAIDetection);
      socket.off('ai:ambulance_alert', handleAmbulanceAlert);
      socket.off('ai:ambulance_cleared', handleAmbulanceCleared);
      socket.off('robot:camera', handleRobotCamera);
    };
  }, [fetchInitialData]);

  // Actions
  const sendControl = useCallback(async (command, speed) => {
    socketClient.sendMove(command, speed);
  }, []);

  const stopRobot = useCallback(async () => {
    socketClient.sendStop();
  }, []);

  const emergencyStop = useCallback(async (reason) => {
    socketClient.sendEmergencyStop(reason);
  }, []);

  const resetSafety = useCallback(async () => {
    socketClient.sendResetSafety();
  }, []);

  const setMode = useCallback(async (mode) => {
    socketClient.sendMode(mode);
  }, []);

  const triggerScenario = useCallback(async (scenario) => {
    try {
      await api.triggerSimulatorScenario(scenario);
    } catch (e) {
      console.error('Failed to trigger scenario', e);
    }
  }, []);

  const triggerAIDetection = useCallback(async (type) => {
    try {
      const res = await api.triggerAIDetection(type);
      return res.detection;
    } catch (e) {
      console.error('Failed to trigger AI detection', e);
    }
  }, []);

  const acknowledgeAmbulance = useCallback(async () => {
    try {
      await api.acknowledgeAmbulance();
      setActiveAmbulance(null);
      setIsEmergencyModalOpen(false);
    } catch (e) {
      console.error('Failed to acknowledge ambulance', e);
    }
  }, []);

  const updateSettings = useCallback(async (newSettings) => {
    try {
      const res = await api.updateSettings(newSettings);
      setSettings(res.settings);
    } catch (e) {
      console.error('Failed to update settings', e);
    }
  }, []);

  const resetSettings = useCallback(async () => {
    try {
      const res = await api.resetSettings();
      setSettings(res.settings);
    } catch (e) {
      console.error('Failed to reset settings', e);
    }
  }, []);

  const value = {
    robotState,
    telemetry,
    telemetryHistory,
    systemEvents,
    latestDetection,
    activeAmbulance,
    socketConnected,
    backendOnline,
    settings,
    activeTab,
    setActiveTab,
    isEmergencyModalOpen,
    setIsEmergencyModalOpen,
    robotCameraStatus,
    sendControl,
    stopRobot,
    emergencyStop,
    resetSafety,
    setMode,
    triggerScenario,
    triggerAIDetection,
    acknowledgeAmbulance,
    updateSettings,
    resetSettings,
  };

  return <RobotContext.Provider value={value}>{children}</RobotContext.Provider>;
};

export const useRobot = () => {
  const context = useContext(RobotContext);
  if (!context) {
    throw new Error('useRobot must be used within a RobotProvider');
  }
  return context;
};
