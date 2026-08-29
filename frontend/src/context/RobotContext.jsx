"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { socketClient } from '../lib/socket.js';
import { api } from '../lib/api.js';

const RobotContext = createContext(undefined);

export const RobotProvider = ({ children }) => {
  // Multi-Device Registry
  const [robotsList, setRobotsList] = useState([
    { robotId: 'PRAHARI-01', name: 'PRAHARI MK1 Patrol', status: 'OFFLINE', location: 'Chowk 01' },
    { robotId: 'PRAHARI-02', name: 'PRAHARI MK2 Highway', status: 'OFFLINE', location: 'North Corridor' },
  ]);
  const [selectedRobotId, setSelectedRobotId] = useState('PRAHARI-01');

  // Real Hardware Device States (null / N/A until live packet arrives)
  const [isLiveDevice, setIsLiveDevice] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const [liveBattery, setLiveBattery] = useState({
    voltage: null,
    current: null,
    percentage: null,
    temperature: null,
    status: 'NO_DATA',
    updatedAt: null,
  });

  const [liveMotors, setLiveMotors] = useState({
    left: { current: null, pwm: null, speed: null, status: 'NO_DATA' },
    right: { current: null, pwm: null, speed: null, status: 'NO_DATA' },
    updatedAt: null,
  });

  const [liveUltrasonic, setLiveUltrasonic] = useState({
    frontDistanceCm: null,
    rearDistanceCm: null,
    frontDistanceM: null,
    rearDistanceM: null,
    status: 'NO_DATA',
    updatedAt: null,
  });

  const [liveGps, setLiveGps] = useState({
    available: false,
    latitude: null,
    longitude: null,
    speed: null,
    accuracy: null,
    satellites: null,
    updatedAt: null,
  });

  const [liveImu, setLiveImu] = useState({
    available: false,
    accel: { x: null, y: null, z: null },
    gyro: { x: null, y: null, z: null },
    updatedAt: null,
  });

  const [liveWifi, setLiveWifi] = useState({
    rssi: null,
    lastHeartbeatAt: null,
    uptimeSeconds: 0,
    firmwareVersion: 'v2.4.0-ESP32',
    ipAddress: null,
  });

  const [robotStatus, setRobotStatus] = useState('OFFLINE'); // 'ONLINE' | 'OFFLINE' | 'CONNECTING' | 'ERROR'
  const [controlMode, setControlMode] = useState('WEB'); // 'WEB' | 'RC' | 'AUTO' | 'DEMO'
  const [emergencyStop, setEmergencyStop] = useState(false);
  const [safetyMessage, setSafetyMessage] = useState('Awaiting device connection...');

  // Command Acknowledgment State
  const [commandStatus, setCommandStatus] = useState('IDLE'); // 'IDLE' | 'PENDING' | 'SUCCESS' | 'FAILED'
  const [lastCommandAck, setLastCommandAck] = useState(null);

  // Live Telemetry & History
  const [telemetryHistory, setTelemetryHistory] = useState([]);
  const [systemEvents, setSystemEvents] = useState([]);
  const [latestDetection, setLatestDetection] = useState(null);
  const [activeAmbulance, setActiveAmbulance] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [backendOnline, setBackendOnline] = useState(true);

  // Debug / Live Data Monitor Metrics
  const [debugStats, setDebugStats] = useState({
    packetsReceived: 0,
    packetsRejected: 0,
    lastPacketAt: null,
    lastSenderIp: null,
    lastSocketEvent: null,
    rawTelemetryHistory: [],
  });
  const [isDebugModalOpen, setIsDebugModalOpen] = useState(false);

  // Settings & Navigation
  const [settings, setSettings] = useState({
    defaultSpeed: 50,
    maxSpeed: 90,
    emergencyStopDistance: 0.35,
    obstacleWarningDistance: 0.80,
    maxMotorCurrent: 22.0,
    criticalBatteryVoltage: 31.0,
  });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);

  // Camera & AI Perception Suite
  const [robotCameraStatus, setRobotCameraStatus] = useState('OFFLINE');
  const [activeMediaStream, setActiveMediaStream] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraSource, setCameraSource] = useState('webcam');
  const [isLiveAiMode, setIsLiveAiMode] = useState(true);
  const [aiStatus, setAiStatus] = useState({ online: true, latencyMs: 7, models: {} });
  const [liveDetections, setLiveDetections] = useState([]);
  const [liveEvents, setLiveEvents] = useState([]);
  const [anprList, setAnprList] = useState([]);
  const [trafficMetrics, setTrafficMetrics] = useState({
    total_vehicles: 0,
    total_counted_cumulative: 0,
    cars: 0,
    motorcycles: 0,
    buses: 0,
    trucks: 0,
    pedestrians: 0,
    plates_detected: 0,
    lane_occupancy: { 'Lane 1': 0, 'Lane 2': 0, 'Lane 3': 0, 'Lane 4': 0 },
    congestion_level: 'LOW',
  });
  const [crosswalkRisk, setCrosswalkRisk] = useState({
    risk_level: 'SAFE',
    score: 0.1,
    in_crosswalk_count: 0,
    total_pedestrians: 0,
    message: 'Crosswalk zone clear.',
  });
  const [wardenGesture, setWardenGesture] = useState({
    gesture: 'STOP',
    confidence: 0.92,
    description: 'Traffic Officer: Ready',
  });
  const [audioSirenState, setAudioSirenState] = useState({
    active: false,
    probability: 0.0,
    dbLevel: -60.0,
    status: 'INACTIVE',
  });
  const [fpsMetrics, setFpsMetrics] = useState({
    cameraFps: 30,
    inferenceFps: 28,
    latencyMs: 35,
  });

  // Calculate Data Freshness Helper (Used across all components)
  const formatFreshness = useCallback((timestamp, staleThresholdSeconds = 2.5) => {
    if (!timestamp) return { text: 'NO DATA', isStale: true, isNull: true };
    const diffSeconds = (Date.now() - new Date(timestamp).getTime()) / 1000;
    if (isNaN(diffSeconds) || diffSeconds < 0) return { text: '0.1s ago', isStale: false, isNull: false };
    if (diffSeconds > staleThresholdSeconds) {
      return { text: `STALE (${diffSeconds.toFixed(0)}s ago)`, isStale: true, isNull: false };
    }
    return { text: `${diffSeconds < 1 ? (diffSeconds * 1000).toFixed(0) + 'ms' : diffSeconds.toFixed(1) + 's'} ago`, isStale: false, isNull: false };
  }, []);

  // Fetch initial devices & configurations
  const fetchInitialData = useCallback(async () => {
    try {
      const [devListRes, ambData, settsData, aiStat, aiEvts, anprRes] = await Promise.allSettled([
        fetch('http://localhost:4000/api/devices/all').then((r) => r.json()),
        api.getActiveAmbulance(),
        api.getSettings(),
        api.getAiStatus(),
        api.getAiEvents({ limit: 30 }),
        api.getAnprList({}),
      ]);

      if (devListRes.status === 'fulfilled' && devListRes.value?.devices) {
        setRobotsList(devListRes.value.devices);
      }
      if (ambData.status === 'fulfilled' && ambData.value?.activeAmbulance) {
        setActiveAmbulance(ambData.value.activeAmbulance);
      }
      if (settsData.status === 'fulfilled') setSettings(settsData.value);
      if (aiStat.status === 'fulfilled') setAiStatus(aiStat.value);
      if (aiEvts.status === 'fulfilled' && aiEvts.value?.events) setLiveEvents(aiEvts.value.events);
      if (anprRes.status === 'fulfilled' && anprRes.value?.plates) setAnprList(anprRes.value.plates);
      setBackendOnline(true);
    } catch (err) {
      console.warn('[RobotContext] Initial data sync warning:', err);
      setBackendOnline(false);
    }
  }, []);

  // Socket.IO real-time listeners for live device & AI streams
  useEffect(() => {
    fetchInitialData();
    const socket = socketClient.connect();

    const handleConnect = () => setSocketConnected(true);
    const handleDisconnect = () => setSocketConnected(false);

    // 1. Live Device Telemetry
    const handleDeviceTelemetry = (data) => {
      if (!data) return;
      if (data.robotId && data.robotId !== selectedRobotId) return;

      setIsLiveDevice(true);
      setRobotStatus('ONLINE');

      if (data.batteryVoltage != null || data.batteryPercentage != null) {
        setLiveBattery({
          voltage: data.batteryVoltage,
          percentage: data.batteryPercentage,
          current: data.batteryCurrent || data.totalCurrent,
          temperature: data.temperature,
          status: data.batteryVoltage < 31 ? 'CRITICAL' : data.batteryVoltage < 33 ? 'WARNING' : 'NORMAL',
          updatedAt: data.timestamp || new Date().toISOString(),
        });
      }

      if (data.leftMotorCurrent != null || data.rightMotorCurrent != null || data.leftMotorPWM != null) {
        setLiveMotors({
          left: {
            current: data.leftMotorCurrent,
            pwm: data.leftMotorPWM,
            speed: data.leftMotorSpeed,
            status: (data.leftMotorCurrent || 0) > 20 ? 'WARNING' : 'NORMAL',
          },
          right: {
            current: data.rightMotorCurrent,
            pwm: data.rightMotorPWM,
            speed: data.rightMotorSpeed,
            status: (data.rightMotorCurrent || 0) > 20 ? 'WARNING' : 'NORMAL',
          },
          updatedAt: data.timestamp || new Date().toISOString(),
        });
      }

      if (data.obstacleDistance != null || data.frontDistanceCm != null) {
        setLiveUltrasonic({
          frontDistanceCm: data.frontDistanceCm || (data.obstacleDistance != null ? Math.round(data.obstacleDistance * 100) : null),
          rearDistanceCm: data.rearDistanceCm || (data.rearDistance != null ? Math.round(data.rearDistance * 100) : null),
          frontDistanceM: data.obstacleDistance || (data.frontDistanceCm != null ? Number((data.frontDistanceCm / 100).toFixed(2)) : null),
          rearDistanceM: data.rearDistance || (data.rearDistanceCm != null ? Number((data.rearDistanceCm / 100).toFixed(2)) : null),
          status: data.obstacleDistance && data.obstacleDistance < 0.4 ? 'CRITICAL' : 'CLEAR',
          updatedAt: data.timestamp || new Date().toISOString(),
        });
      }

      if (data.controlMode) setControlMode(data.controlMode);
      if (data.emergencyStop !== undefined) setEmergencyStop(Boolean(data.emergencyStop));

      setTelemetryHistory((prev) => [...prev.slice(-40), data]);
    };

    // 2. Live Device Heartbeat
    const handleDeviceHeartbeat = (hb) => {
      if (hb.robotId && hb.robotId !== selectedRobotId) return;
      setIsLiveDevice(true);
      setRobotStatus(hb.status || 'ONLINE');
      setLiveWifi({
        rssi: hb.wifiRSSI,
        lastHeartbeatAt: hb.lastHeartbeatAt || new Date().toISOString(),
        uptimeSeconds: hb.uptimeSeconds || 0,
        firmwareVersion: hb.firmwareVersion || 'v2.4.0-ESP32',
        ipAddress: hb.ipAddress,
      });
    };

    // 3. Live Device GPS
    const handleDeviceGps = (data) => {
      if (data.robotId && data.robotId !== selectedRobotId) return;
      if (data.gps) setLiveGps(data.gps);
    };

    // 4. Live Device IMU
    const handleDeviceImu = (data) => {
      if (data.robotId && data.robotId !== selectedRobotId) return;
      if (data.imu) setLiveImu(data.imu);
    };

    // 5. Live Device Status & Safety
    const handleDeviceStatus = (data) => {
      if (data.robotId && data.robotId !== selectedRobotId) return;
      setRobotStatus(data.status);
    };

    const handleDeviceSafety = (data) => {
      if (data.robotId && data.robotId !== selectedRobotId) return;
      if (data.safety) {
        setEmergencyStop(Boolean(data.safety.emergencyStop));
        setSafetyMessage(data.safety.message || 'Safety update');
      }
    };

    // 6. Device Command Acknowledgement
    const handleDeviceAck = (ack) => {
      setLastCommandAck(ack);
      if (ack.status === 'SUCCESS') {
        setCommandStatus('SUCCESS');
        setTimeout(() => setCommandStatus('IDLE'), 2000);
      } else {
        setCommandStatus('FAILED');
        setTimeout(() => setCommandStatus('IDLE'), 3000);
      }
    };

    // 7. System Alerts & Events
    const handleSystemAlert = (alert) => {
      setSystemEvents((prev) => [alert, ...prev.slice(0, 49)]);
    };

    // 8. AI Detection & ANPR
    const handleAIDetection = (det) => setLatestDetection(det);
    const handleAiEvent = (evt) => setLiveEvents((prev) => [evt, ...prev.slice(0, 49)]);
    const handleAnpr = (anpr) => {
      setAnprList((prev) => [{
        id: anpr.eventId || `PLT-${Date.now()}`,
        timestamp: anpr.timestamp || new Date().toISOString(),
        plateNumber: anpr.metadata?.plateNumber || anpr.plateNumber || 'MH12AB1234',
        state: anpr.metadata?.state || 'Maharashtra',
        vehicleType: anpr.metadata?.vehicleType || 'CAR',
        confidence: anpr.confidence || 0.94,
        cameraId: anpr.cameraId || 'Optical 1080p',
        lane: anpr.lane || 'Lane 1',
        isDemo: anpr.isDemo,
      }, ...prev.slice(0, 99)]);
    };

    const handleTrafficUpdate = (data) => {
      if (data.counts) setTrafficMetrics(data.counts);
    };

    const handleCrosswalkRisk = (risk) => {
      setCrosswalkRisk(risk.metadata || risk);
    };

    const handleAmbulanceAlert = (amb) => {
      setActiveAmbulance(amb);
      setIsEmergencyModalOpen(true);
    };

    const handleAmbulanceCleared = () => {
      setActiveAmbulance(null);
      setIsEmergencyModalOpen(false);
    };

    // Register all listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('device:telemetry', handleDeviceTelemetry);
    socket.on('device:heartbeat', handleDeviceHeartbeat);
    socket.on('device:battery', (d) => d.battery && setLiveBattery(d.battery));
    socket.on('device:motor', (d) => d.motors && setLiveMotors(d.motors));
    socket.on('device:sensor', (d) => d.ultrasonic && setLiveUltrasonic(d.ultrasonic));
    socket.on('device:gps', handleDeviceGps);
    socket.on('device:imu', handleDeviceImu);
    socket.on('device:status', handleDeviceStatus);
    socket.on('device:safety', handleDeviceSafety);
    socket.on('device:mode', (d) => d.controlMode && setControlMode(d.controlMode));
    socket.on('device:ack', handleDeviceAck);
    socket.on('system:alert', handleSystemAlert);

    socket.on('ai:detection', handleAIDetection);
    socket.on('ai:event', handleAiEvent);
    socket.on('ai:anpr', handleAnpr);
    socket.on('ai:traffic_update', handleTrafficUpdate);
    socket.on('ai:crosswalk_risk', handleCrosswalkRisk);
    socket.on('ai:ambulance_alert', handleAmbulanceAlert);
    socket.on('ai:ambulance_cleared', handleAmbulanceCleared);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('device:telemetry', handleDeviceTelemetry);
      socket.off('device:heartbeat', handleDeviceHeartbeat);
      socket.off('device:gps', handleDeviceGps);
      socket.off('device:imu', handleDeviceImu);
      socket.off('device:status', handleDeviceStatus);
      socket.off('device:safety', handleDeviceSafety);
      socket.off('device:ack', handleDeviceAck);
      socket.off('system:alert', handleSystemAlert);
      socket.off('ai:detection', handleAIDetection);
      socket.off('ai:event', handleAiEvent);
      socket.off('ai:anpr', handleAnpr);
      socket.off('ai:traffic_update', handleTrafficUpdate);
      socket.off('ai:crosswalk_risk', handleCrosswalkRisk);
      socket.off('ai:ambulance_alert', handleAmbulanceAlert);
      socket.off('ai:ambulance_cleared', handleAmbulanceCleared);
    };
  }, [fetchInitialData, selectedRobotId]);

  // Teleoperation Command Dispatch with Acknowledgment Lifecycle
  const sendControlCommand = async (command, speed) => {
    setCommandStatus('PENDING');
    try {
      const res = await fetch('http://localhost:4000/api/robot/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, speed, robotId: selectedRobotId }),
      }).then((r) => r.json());

      if (res.status === 'COMMAND_SENT') {
        // Awaiting ESP32 hardware acknowledgement
        return res;
      } else {
        setCommandStatus('SUCCESS');
        setTimeout(() => setCommandStatus('IDLE'), 2000);
        return res;
      }
    } catch (err) {
      setCommandStatus('FAILED');
      setTimeout(() => setCommandStatus('IDLE'), 3000);
      throw err;
    }
  };

  const emergencyStopRobot = async (reason) => {
    setEmergencyStop(true);
    return fetch('http://localhost:4000/api/robot/emergency-stop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: reason || 'Operator E-Stop', robotId: selectedRobotId }),
    }).then((r) => r.json());
  };

  const resetSafety = async () => {
    setEmergencyStop(false);
    return fetch('http://localhost:4000/api/robot/reset-safety', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ robotId: selectedRobotId }),
    }).then((r) => r.json());
  };

  const changeControlMode = async (mode) => {
    setControlMode(mode);
    setIsDemoMode(mode === 'DEMO');
    return fetch('http://localhost:4000/api/robot/mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, robotId: selectedRobotId }),
    }).then((r) => r.json());
  };

  const updateSettings = async (newSettings) => {
    const res = await api.updateSettings(newSettings);
    setSettings(res.settings || newSettings);
    return res;
  };

  const resetSettings = async () => {
    const res = await api.resetSettings();
    setSettings(res.settings);
    return res;
  };

  const triggerScenario = async (scenario) => {
    return api.triggerSimulatorScenario(scenario);
  };

  // Backward compatible normalized state object for existing components
  const robotState = {
    status: robotStatus,
    mode: controlMode,
    demoMode: isDemoMode,
    battery: {
      voltage: liveBattery.voltage,
      percentage: liveBattery.percentage,
      current: liveBattery.current,
      temperature: liveBattery.temperature,
      status: liveBattery.status,
      updatedAt: liveBattery.updatedAt,
    },
    leftMotor: {
      current: liveMotors.left.current,
      pwm: liveMotors.left.pwm,
      speed: liveMotors.left.speed,
      status: liveMotors.left.status,
    },
    rightMotor: {
      current: liveMotors.right.current,
      pwm: liveMotors.right.pwm,
      speed: liveMotors.right.speed,
      status: liveMotors.right.status,
    },
    ultrasonic: {
      distance: liveUltrasonic.frontDistanceM,
      distanceCm: liveUltrasonic.frontDistanceCm,
      rearDistanceCm: liveUltrasonic.rearDistanceCm,
      status: liveUltrasonic.status,
      updatedAt: liveUltrasonic.updatedAt,
    },
    gps: liveGps,
    imu: liveImu,
    wifi: liveWifi,
    safety: {
      emergencyStop,
      state: emergencyStop ? 'EMERGENCY_STOP' : robotStatus === 'ONLINE' ? 'SAFE' : 'OFFLINE',
      message: safetyMessage,
    },
  };

  const telemetry = {
    batteryVoltage: liveBattery.voltage,
    batteryPercentage: liveBattery.percentage,
    batteryCurrent: liveBattery.current,
    totalCurrent: liveBattery.current,
    leftMotorCurrent: liveMotors.left.current,
    rightMotorCurrent: liveMotors.right.current,
    leftMotorSpeed: liveMotors.left.speed,
    rightMotorSpeed: liveMotors.right.speed,
    obstacleDistance: liveUltrasonic.frontDistanceM,
    temperature: liveBattery.temperature,
    wifiRSSI: liveWifi.rssi,
    loopRateHz: 10,
    internal5VRail: '5.02',
    timestamp: liveBattery.updatedAt || new Date().toISOString(),
  };

  const triggerAIDetection = useCallback(async (type) => {
    try {
      const res = await api.triggerAIDetection(type);
      return res;
    } catch (err) {
      console.error('Failed to trigger AI detection:', err);
    }
  }, []);

  const acknowledgeAmbulance = useCallback(async () => {
    try {
      const res = await api.acknowledgeAmbulance();
      setActiveAmbulance(null);
      setIsEmergencyModalOpen(false);
      return res;
    } catch (err) {
      console.error('Failed to acknowledge ambulance:', err);
    }
  }, []);

  return (
    <RobotContext.Provider
      value={{
        // Multi-Robot Selection
        robotsList,
        selectedRobotId,
        setSelectedRobotId,

        // Data Source Indicators
        isLiveDevice,
        isDemoMode,
        dataSource: isDemoMode ? 'DEMO DATA' : isLiveDevice && robotStatus === 'ONLINE' ? 'LIVE DEVICE' : 'OFFLINE / NO DATA',

        // True Hardware States
        liveBattery,
        liveMotors,
        liveUltrasonic,
        liveGps,
        liveImu,
        liveWifi,
        robotStatus,
        controlMode,
        emergencyStop,
        commandStatus,
        lastCommandAck,

        // Helpers
        formatFreshness,

        // Normalized Backward Compatible Objects
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
        setRobotCameraStatus,
        activeMediaStream,
        setActiveMediaStream,
        cameraActive,
        setCameraActive,
        cameraSource,
        setCameraSource,
        isLiveAiMode,
        setIsLiveAiMode,
        aiStatus,
        liveDetections,
        liveEvents,
        anprList,
        trafficMetrics,
        crosswalkRisk,
        wardenGesture,
        audioSirenState,
        setAudioSirenState,
        fpsMetrics,
        setFpsMetrics,

        // Actions
        sendControlCommand,
        emergencyStopRobot,
        resetSafety,
        changeControlMode,
        updateSettings,
        resetSettings,
        triggerScenario,
        triggerAIDetection,
        acknowledgeAmbulance,

        // Live Data Monitor Debug
        debugStats,
        isDebugModalOpen,
        setIsDebugModalOpen,
      }}
    >
      {children}
    </RobotContext.Provider>
  );
};

export const useRobot = () => {
  const context = useContext(RobotContext);
  if (!context) {
    throw new Error('useRobot must be used within a RobotProvider');
  }
  return context;
};
