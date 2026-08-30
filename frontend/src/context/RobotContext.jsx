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
  const [isDemoMode, setIsDemoMode] = useState(
    typeof window !== 'undefined' && process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
  );

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
    firmwareVersion: 'v2.5.0-RPI4-ARM64',
    ipAddress: null,
  });

  const [robotStatus, setRobotStatus] = useState('OFFLINE'); // 'ONLINE' | 'OFFLINE' | 'CONNECTING'
  const [controlMode, setControlMode] = useState('WEB'); // 'WEB' | 'RC' | 'AUTO' | 'DEMO'
  const [emergencyStop, setEmergencyStop] = useState(false);
  const [safetyMessage, setSafetyMessage] = useState('Awaiting device heartbeat...');

  // Command Acknowledgment State
  const [commandStatus, setCommandStatus] = useState('IDLE'); // 'IDLE' | 'PENDING' | 'SUCCESS' | 'FAILED'
  const [lastCommandAck, setLastCommandAck] = useState(null);

  // Live Telemetry & Event Stream
  const [telemetryHistory, setTelemetryHistory] = useState([]);
  const [systemEvents, setSystemEvents] = useState([]);
  const [latestDetection, setLatestDetection] = useState(null);
  const [activeAmbulance, setActiveAmbulance] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [backendOnline, setBackendOnline] = useState(true);
  const [databaseStatus, setDatabaseStatus] = useState('disconnected');
  const [s3Status, setS3Status] = useState('OK');

  // Dynamic Real-Time Counters (Calculated directly from real backend/socket data)
  const [counters, setCounters] = useState({
    totalDetections: 0,
    anprPlates: 0,
    ambulanceTriggers: 0,
    vehiclesClassified: 0,
  });

  // Diagnostics Metrics
  const [lastHeartbeatTimestamp, setLastHeartbeatTimestamp] = useState(null);
  const [lastTelemetryTimestamp, setLastTelemetryTimestamp] = useState(null);
  const [lastDetectionTimestamp, setLastDetectionTimestamp] = useState(null);
  const [isDebugModalOpen, setIsDebugModalOpen] = useState(false);

  // Settings & Navigation
  const [settings, setSettings] = useState({
    defaultSpeed: 60,
    maxSpeed: 90,
    emergencyStopDistance: 0.35,
    obstacleWarningDistance: 0.80,
    maxMotorCurrent: 22.0,
    criticalBatteryVoltage: 31.0,
  });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);

  // Camera & AI Perception Suite
  const cameraStreamEnv = process.env.NEXT_PUBLIC_ROBOT_CAMERA_STREAM_URL || '';
  const [robotCameraStreamUrl, setRobotCameraStreamUrl] = useState(cameraStreamEnv);
  const [robotCameraStatus, setRobotCameraStatus] = useState('OFFLINE');
  const [aiStatus, setAiStatus] = useState({
    online: true,
    model: 'YOLOv8',
    ocr: 'ONLINE',
    inference: 'ACTIVE',
    latencyMs: 12,
  });
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
  const [audioSirenState, setAudioSirenState] = useState({
    active: false,
    probability: 0.0,
    dbLevel: -60.0,
    status: 'INACTIVE',
  });
  const [fpsMetrics, setFpsMetrics] = useState({
    cameraFps: 30,
    inferenceFps: 28,
  });
  const [crosswalkRisk, setCrosswalkRisk] = useState({
    risk_level: 'SAFE',
    score: 0.12,
    in_crosswalk_count: 0,
    total_pedestrians: 0,
    message: 'Crosswalk zone clear.',
  });
  const [wardenGesture, setWardenGesture] = useState({
    gesture: 'NO ACTIVE GESTURE',
    confidence: 0.95,
    description: 'Awaiting officer gesture',
  });
  const [activeMediaStream, setActiveMediaStream] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraSource, setCameraSource] = useState('robot');
  const [isLiveAiMode, setIsLiveAiMode] = useState(true);

  // Calculate Data Freshness Helper
  const formatFreshness = useCallback((timestamp, staleThresholdSeconds = 3.0) => {
    if (!timestamp) return { text: 'NO DATA', isStale: true, isNull: true };
    const diffSeconds = (Date.now() - new Date(timestamp).getTime()) / 1000;
    if (isNaN(diffSeconds) || diffSeconds < 0) return { text: '0.1s ago', isStale: false, isNull: false };
    if (diffSeconds > staleThresholdSeconds) {
      return { text: `STALE (${diffSeconds.toFixed(0)}s ago)`, isStale: true, isNull: false };
    }
    return {
      text: `${diffSeconds < 1 ? (diffSeconds * 1000).toFixed(0) + 'ms' : diffSeconds.toFixed(1) + 's'} ago`,
      isStale: false,
      isNull: false,
    };
  }, []);

  // Fetch initial data & detection stats
  const fetchInitialData = useCallback(async () => {
    try {
      const [healthRes, statsRes, detLogRes, anprRes, settsRes, camRes] = await Promise.allSettled([
        api.getHealth(),
        fetch('/api/detections/stats').then((r) => r.json()),
        api.getDetectionsLog({ limit: 30 }),
        api.getAnprList({}),
        api.getSettings(),
        api.getCameraSources(),
      ]);

      if (healthRes.status === 'fulfilled' && healthRes.value?.services) {
        setBackendOnline(true);
        setDatabaseStatus(healthRes.value.database === 'ok' ? 'connected' : 'fallback');
        if (healthRes.value.robot === 'online') setRobotStatus('ONLINE');
      }

      if (statsRes.status === 'fulfilled' && statsRes.value?.stats) {
        const s = statsRes.value.stats;
        setCounters({
          totalDetections: s.total || 0,
          anprPlates: s.anpr || 0,
          ambulanceTriggers: s.ambulance || 0,
          vehiclesClassified: s.vehicle || 0,
        });
      }

      if (detLogRes.status === 'fulfilled' && detLogRes.value?.data) {
        setLiveEvents(detLogRes.value.data);
      }

      if (anprRes.status === 'fulfilled' && anprRes.value?.plates) {
        setAnprList(anprRes.value.plates);
      }

      if (settsRes.status === 'fulfilled') {
        setSettings(settsRes.value);
      }

      if (camRes.status === 'fulfilled' && camRes.value?.sources?.robot?.streamUrl) {
        setRobotCameraStreamUrl(camRes.value.sources.robot.streamUrl);
      }
    } catch (err) {
      console.warn('[RobotContext] Initial data sync warning:', err);
    }
  }, []);

  // Heartbeat Watchdog: Check if robot heartbeat is missing for > 4s
  useEffect(() => {
    const interval = setInterval(() => {
      if (lastHeartbeatTimestamp && !isDemoMode) {
        const elapsed = Date.now() - new Date(lastHeartbeatTimestamp).getTime();
        if (elapsed > 4500 && robotStatus === 'ONLINE') {
          console.warn('[Watchdog] Heartbeat timeout elapsed. Marking robot OFFLINE.');
          setRobotStatus('OFFLINE');
          setIsLiveDevice(false);
        }
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [lastHeartbeatTimestamp, isDemoMode, robotStatus]);

  // Socket.IO Real-Time Engine Integration
  useEffect(() => {
    fetchInitialData();
    const socket = socketClient.connect();

    const handleConnect = () => {
      setSocketConnected(true);
      setBackendOnline(true);
    };

    const handleDisconnect = () => {
      setSocketConnected(false);
    };

    // 1. Robot Status & Heartbeat
    const handleRobotStatus = (data) => {
      if (!data) return;
      if (data.robotId && data.robotId !== selectedRobotId) return;
      const status = data.status || 'ONLINE';
      setRobotStatus(status);
      setIsLiveDevice(status === 'ONLINE');
      setLastHeartbeatTimestamp(data.timestamp || new Date().toISOString());
    };

    const handleHeartbeat = (hb) => {
      if (!hb) return;
      if (hb.robotId && hb.robotId !== selectedRobotId) return;
      setRobotStatus('ONLINE');
      setIsLiveDevice(true);
      const nowIso = hb.timestamp ? (typeof hb.timestamp === 'number' ? new Date(hb.timestamp * 1000).toISOString() : hb.timestamp) : new Date().toISOString();
      setLastHeartbeatTimestamp(nowIso);

      if (hb.batteryVoltage || hb.batteryPercentage) {
        setLiveBattery((prev) => ({
          ...prev,
          voltage: hb.batteryVoltage != null ? Number(hb.batteryVoltage) : prev.voltage,
          percentage: hb.batteryPercentage != null ? Number(hb.batteryPercentage) : prev.percentage,
          temperature: hb.temperature != null ? Number(hb.temperature) : prev.temperature,
          updatedAt: nowIso,
        }));
      }

      setLiveWifi({
        rssi: hb.wifiRSSI != null ? Number(hb.wifiRSSI) : null,
        lastHeartbeatAt: nowIso,
        uptimeSeconds: hb.uptimeSeconds || 0,
        firmwareVersion: hb.firmwareVersion || 'v2.5.0-RPI4-ARM64',
        ipAddress: hb.ipAddress || null,
      });
    };

    // 2. Robot Telemetry
    const handleTelemetry = (data) => {
      if (!data) return;
      if (data.robotId && data.robotId !== selectedRobotId) return;

      setIsLiveDevice(true);
      setRobotStatus('ONLINE');
      const nowIso = data.timestamp || new Date().toISOString();
      setLastTelemetryTimestamp(nowIso);

      if (data.batteryVoltage != null || data.batteryPercentage != null) {
        setLiveBattery({
          voltage: data.batteryVoltage,
          percentage: data.batteryPercentage,
          current: data.batteryCurrent || data.totalCurrent,
          temperature: data.temperature,
          status: data.batteryVoltage < 31 ? 'CRITICAL' : data.batteryVoltage < 33 ? 'WARNING' : 'NORMAL',
          updatedAt: nowIso,
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
          updatedAt: nowIso,
        });
      }

      if (data.obstacleDistance != null || data.frontDistanceCm != null) {
        setLiveUltrasonic({
          frontDistanceCm: data.frontDistanceCm || (data.obstacleDistance != null ? Math.round(data.obstacleDistance * 100) : null),
          rearDistanceCm: data.rearDistanceCm || null,
          frontDistanceM: data.obstacleDistance || (data.frontDistanceCm != null ? Number((data.frontDistanceCm / 100).toFixed(2)) : null),
          rearDistanceM: data.rearDistance || null,
          status: data.obstacleDistance && data.obstacleDistance < 0.4 ? 'CRITICAL' : 'CLEAR',
          updatedAt: nowIso,
        });
      }

      if (data.controlMode) setControlMode(data.controlMode);
      if (data.emergencyStop !== undefined) setEmergencyStop(Boolean(data.emergencyStop));

      setTelemetryHistory((prev) => [...prev.slice(-40), data]);
    };

    // 3. New Live AI Detections (Instant Non-Polling Feed Update)
    const handleDetectionNew = (det) => {
      if (!det) return;
      setLatestDetection(det);
      setLastDetectionTimestamp(det.timestamp || new Date().toISOString());

      // Prepend to live events stream
      setLiveEvents((prev) => [det, ...prev.slice(0, 99)]);

      // Dynamically increment counters
      setCounters((prev) => {
        const type = String(det.type).toUpperCase();
        return {
          totalDetections: prev.totalDetections + 1,
          anprPlates: type === 'ANPR' ? prev.anprPlates + 1 : prev.anprPlates,
          ambulanceTriggers: type === 'AMBULANCE' ? prev.ambulanceTriggers + 1 : prev.ambulanceTriggers,
          vehiclesClassified: type === 'VEHICLE' ? prev.vehiclesClassified + 1 : prev.vehiclesClassified,
        };
      });

      // Update Live Visual Detections (Bounding Boxes)
      const visualItem = {
        id: det.id || `det-${Date.now()}`,
        timestamp: det.timestamp || new Date().toISOString(),
        type: det.type,
        result: det.detectionInfo || det.result || det.type,
        confidence: det.confidence || 0.92,
        imageUrl: det.imageUrl,
        bbox: det.bbox || (det.type === 'AMBULANCE' ? [20, 18, 55, 48] : det.type === 'ANPR' ? [65, 30, 22, 40] : [30, 30, 35, 35]),
        details: det.details || {},
        receivedAt: Date.now(),
      };
      setLiveDetections((prev) => [visualItem, ...prev.filter((p) => Date.now() - (p.receivedAt || 0) < 4000).slice(0, 10)]);

      // If ANPR, add to plate table
      if (det.type === 'ANPR' || det.plate) {
        const plateRecord = {
          id: det.id,
          timestamp: det.timestamp || new Date().toISOString(),
          plateNumber: det.plate || det.detectionInfo || 'MH12AB1234',
          state: det.details?.state || 'Maharashtra',
          vehicleType: det.details?.vehicleType || 'CAR',
          confidence: det.confidence || 0.94,
          imageUrl: det.imageUrl,
          source: det.source || 'CAMERA-01',
        };
        setAnprList((prev) => [plateRecord, ...prev.slice(0, 99)]);
      }

      // If AMBULANCE, activate emergency alert
      if (det.type === 'AMBULANCE') {
        setActiveAmbulance(det);
        setIsEmergencyModalOpen(true);
      }
    };

    // 4. Camera Status
    const handleCameraStatus = (status) => {
      if (status && status.status) {
        setRobotCameraStatus(status.status.includes('LIVE') ? 'LIVE' : 'OFFLINE');
      }
      if (status && status.streamUrl) {
        setRobotCameraStreamUrl(status.streamUrl);
      }
    };

    // 5. Command Acknowledgments
    const handleCommandAck = (ack) => {
      setLastCommandAck(ack);
      setCommandStatus(ack.status === 'SUCCESS' || ack.status === 'COMMAND_SENT' ? 'SUCCESS' : 'FAILED');
      setTimeout(() => setCommandStatus('IDLE'), 2000);
    };

    // Register all Socket.IO listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    socket.on('robot:status', handleRobotStatus);
    socket.on('robot:heartbeat', handleHeartbeat);
    socket.on('robot:telemetry', handleTelemetry);
    socket.on('device:telemetry', handleTelemetry);
    socket.on('device:heartbeat', handleHeartbeat);

    socket.on('camera:status', handleCameraStatus);
    socket.on('detection:new', handleDetectionNew);
    socket.on('ai:detection', handleDetectionNew);
    socket.on('robot:detection', handleDetectionNew);
    socket.on('ambulance:detected', (det) => handleDetectionNew({ ...det, type: 'AMBULANCE' }));
    socket.on('anpr:detected', (det) => handleDetectionNew({ ...det, type: 'ANPR' }));
    socket.on('vehicle:detected', (det) => handleDetectionNew({ ...det, type: 'VEHICLE' }));

    socket.on('command:ack', handleCommandAck);
    socket.on('device:ack', handleCommandAck);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('robot:status', handleRobotStatus);
      socket.off('robot:heartbeat', handleHeartbeat);
      socket.off('robot:telemetry', handleTelemetry);
      socket.off('device:telemetry', handleTelemetry);
      socket.off('device:heartbeat', handleHeartbeat);
      socket.off('camera:status', handleCameraStatus);
      socket.off('detection:new', handleDetectionNew);
      socket.off('ai:detection', handleDetectionNew);
      socket.off('robot:detection', handleDetectionNew);
      socket.off('ambulance:detected');
      socket.off('anpr:detected');
      socket.off('vehicle:detected');
      socket.off('command:ack', handleCommandAck);
      socket.off('device:ack', handleCommandAck);
    };
  }, [fetchInitialData, selectedRobotId]);

  // Real-Time WebSocket Command Dispatch (Zero Page Refresh)
  const sendControlCommand = useCallback(
    async (command, speed = 60, vector = null) => {
      setCommandStatus('PENDING');

      if (command === 'DRIVE_VECTOR' && vector) {
        socketClient.sendDriveVector(vector.throttle, vector.steering, speed, selectedRobotId);
      } else if (command === 'STOP') {
        socketClient.sendStop(selectedRobotId);
      } else {
        socketClient.sendMove(command, speed, selectedRobotId);
      }

      setCommandStatus('SUCCESS');
      setTimeout(() => setCommandStatus('IDLE'), 1000);
      return { success: true, command, speed };
    },
    [selectedRobotId]
  );

  const emergencyStopRobot = useCallback(
    async (reason = 'Operator E-Stop') => {
      setEmergencyStop(true);
      socketClient.sendEmergencyStop(reason, selectedRobotId);
      fetch('/api/robot/emergency-stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, robotId: selectedRobotId }),
      }).catch(() => {});
      return { success: true };
    },
    [selectedRobotId]
  );

  const resetSafety = useCallback(async () => {
    setEmergencyStop(false);
    socketClient.sendResetSafety(selectedRobotId);
    fetch('/api/robot/reset-safety', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ robotId: selectedRobotId }),
    }).catch(() => {});
    return { success: true };
  }, [selectedRobotId]);

  const changeControlMode = useCallback(
    async (mode) => {
      setControlMode(mode);
      setIsDemoMode(mode === 'DEMO');
      socketClient.sendMode(mode, selectedRobotId);
      fetch('/api/robot/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, robotId: selectedRobotId }),
      }).catch(() => {});
      return { success: true };
    },
    [selectedRobotId]
  );

  const triggerAIDetection = useCallback(
    async (type) => {
      try {
        const res = await api.triggerAIDetection(type);
        return res;
      } catch (err) {
        console.error('Failed to trigger AI detection:', err);
      }
    },
    []
  );

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

  const clearAiEvents = useCallback(async () => {
    try {
      await api.clearDetectionsLog();
      setLiveEvents([]);
      setAnprList([]);
      setCounters({
        totalDetections: 0,
        anprPlates: 0,
        ambulanceTriggers: 0,
        vehiclesClassified: 0,
      });
    } catch (err) {
      console.error('Failed to clear detections log:', err);
    }
  }, []);

  return (
    <RobotContext.Provider
      value={{
        robotsList,
        selectedRobotId,
        setSelectedRobotId,

        // Live status & mode
        isLiveDevice,
        isDemoMode,
        setIsDemoMode,
        dataSource: isDemoMode ? 'DEMO MODE' : isLiveDevice && robotStatus === 'ONLINE' ? 'LIVE ROBOT' : 'OFFLINE / NO DATA',
        robotStatus,
        controlMode,
        emergencyStop,
        safetyMessage,
        commandStatus,
        lastCommandAck,

        // Telemetry
        liveBattery,
        liveMotors,
        liveUltrasonic,
        liveGps,
        liveImu,
        liveWifi,
        telemetryHistory,
        systemEvents,
        latestDetection,
        activeAmbulance,

        // Dynamic Counters
        counters,
        totalDetections: counters.totalDetections,
        anprPlates: counters.anprPlates,
        ambulanceTriggers: counters.ambulanceTriggers,
        vehiclesClassified: counters.vehiclesClassified,

        // Camera & Perception
        robotCameraStreamUrl,
        setRobotCameraStreamUrl,
        robotCameraStatus,
        setRobotCameraStatus,
        aiStatus,
        liveDetections,
        liveEvents,
        anprList,
        trafficMetrics,
        crosswalkRisk,
        setCrosswalkRisk,
        wardenGesture,
        setWardenGesture,
        activeMediaStream,
        setActiveMediaStream,
        cameraActive,
        setCameraActive,
        cameraSource,
        setCameraSource,
        isLiveAiMode,
        setIsLiveAiMode,
        audioSirenState,
        fpsMetrics,
        setFpsMetrics,

        // Diagnostics
        lastHeartbeatTimestamp,
        lastTelemetryTimestamp,
        lastDetectionTimestamp,
        socketConnected,
        backendOnline,
        databaseStatus,
        s3Status,
        isDebugModalOpen,
        setIsDebugModalOpen,
        settings,
        activeTab,
        setActiveTab,
        isEmergencyModalOpen,
        setIsEmergencyModalOpen,

        // Helpers & Dispatches
        formatFreshness,
        sendControlCommand,
        emergencyStopRobot,
        resetSafety,
        changeControlMode,
        triggerAIDetection,
        acknowledgeAmbulance,
        clearAiEvents,
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
