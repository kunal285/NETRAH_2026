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
  const [arduinoStatus, setArduinoStatus] = useState('DISCONNECTED'); // 'CONNECTED' | 'DISCONNECTED'
  const [rcStatus, setRcStatus] = useState('DISCONNECTED'); // 'CONNECTED' | 'DISCONNECTED'
  const [controlMode, setControlMode] = useState('WEB'); // 'WEB' | 'RC' | 'AUTO' | 'DEMO'
  const [speedLimiter, setSpeedLimiter] = useState(70); // 25, 50, 75, 100
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

  // Dynamic Real-Time Counters
  const [counters, setCounters] = useState({
    totalDetections: 0,
    totalVehicles: 0,
    cars: 0,
    motorcycles: 0,
    trucks: 0,
    buses: 0,
    bicycles: 0,
    other: 0,
    anprPlates: 0,
    ambulanceTriggers: 0,
    vehiclesClassified: 0,
    faces: 0,
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
    criticalBatteryVoltage: 10.5,
    lowBatteryVoltage: 10.5,
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
    gemini: 'CONNECTED',
    geminiModel: 'gemini-2.5-flash',
    latencyMs: 12,
  });
  const [latestAiIncident, setLatestAiIncident] = useState({
    summary: 'PRAHARI AI Intelligence layer active. Monitoring traffic sector.',
    severity: 'low',
    event_type: 'normal',
    confidence: 0.95,
    recommended_action: 'Maintain nominal autonomous or RC patrol.',
    operator_message: 'Sector clear.',
    reasoning_summary: 'Edge perception and sensor telemetry nominal.',
    requires_operator_attention: false,
    timestamp: new Date().toISOString(),
  });
  const [aiIncidentsHistory, setAiIncidentsHistory] = useState([]);
  const [aiAssistantMessages, setAiAssistantMessages] = useState([
    {
      id: 'init-1',
      role: 'assistant',
      content: 'Hello Officer. I am PRAHARI AI, your command center intelligence assistant. I analyze live telemetry, vehicle counts, emergency corridors, and ANPR events. How can I assist you?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      severity: 'low',
      suggested_actions: ['Summarize traffic conditions', 'Was an ambulance detected?', 'Check robot condition', 'Are there safety concerns?'],
    },
  ]);
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [liveDetections, setLiveDetections] = useState([]);
  const [liveEvents, setLiveEvents] = useState([]);
  const [anprList, setAnprList] = useState([]);
  const [snapshotsList, setSnapshotsList] = useState([]);
  const [latestSnapshot, setLatestSnapshot] = useState(null);
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
  const [cameraSource, setCameraSource] = useState('mobile'); // 'mobile' (Primary) | 'esp32' | 'webcam' | 'video_file'
  const [liveMobileFrame, setLiveMobileFrame] = useState(null);
  const [isLiveAiMode, setIsLiveAiMode] = useState(true);
  const [activeFacingMode, setActiveFacingMode] = useState('user'); // 'user' (laptop/front) | 'environment' (rear/mobile mast)
  const [cameraError, setCameraError] = useState('');
  const [localCamStarting, setLocalCamStarting] = useState(false);

  // Multi-tier robust camera initiator for Laptop Webcams and Mobile Phone Cameras
  const startLocalCamera = useCallback(async (targetFacing = 'user') => {
    setLocalCamStarting(true);
    setCameraError('');
    try {
      if (typeof window === 'undefined' || !navigator?.mediaDevices?.getUserMedia) {
        throw new Error('Camera access (getUserMedia) is not available. Please ensure you are running on localhost or an HTTPS connection.');
      }

      let stream = null;

      // Tier 1: Try with requested facing mode & 720p HD resolution
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: targetFacing },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (e1) {
        console.warn('[Camera] Tier 1 constraint failed, trying unconstrained HD:', e1.message);
        // Tier 2: Try without facingMode constraint (standard for laptop webcams / USB cameras)
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false,
          });
        } catch (e2) {
          console.warn('[Camera] Tier 2 constraint failed, trying basic video:', e2.message);
          // Tier 3: Universal fallback: basic video stream
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
      }

      if (stream) {
        setActiveMediaStream((prevStream) => {
          if (prevStream) {
            prevStream.getTracks().forEach((t) => t.stop());
          }
          return stream;
        });
        setCameraActive(true);
        setRobotCameraStatus('LIVE');
        setActiveFacingMode(targetFacing);
        setCameraSource('mobile');
        return stream;
      }
    } catch (err) {
      console.error('[Camera] Initialization error:', err);
      let msg = `Unable to connect to camera: ${err.message}`;
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera permission was denied. Please click the camera/lock icon in your browser address bar and choose "Allow".';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No camera device found on this laptop or mobile phone.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        msg = 'Camera is already in use by another app (e.g. Zoom, Teams, or another browser window).';
      }
      setCameraError(msg);
      return null;
    } finally {
      setLocalCamStarting(false);
    }
  }, []);

  const stopLocalCamera = useCallback(() => {
    setActiveMediaStream((prevStream) => {
      if (prevStream) {
        prevStream.getTracks().forEach((t) => t.stop());
      }
      return null;
    });
    setCameraActive(false);
    setRobotCameraStatus('OFFLINE');
  }, []);

  const flipCamera = useCallback(() => {
    const nextMode = activeFacingMode === 'user' ? 'environment' : 'user';
    return startLocalCamera(nextMode);
  }, [activeFacingMode, startLocalCamera]);

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
      const [healthRes, statsRes, detLogRes, anprRes, settsRes, camRes, snapsRes] = await Promise.allSettled([
        api.getHealth(),
        fetch('/api/detections/stats').then((r) => r.json()),
        api.getDetectionsLog({ limit: 30 }),
        api.getAnprList({}),
        api.getSettings(),
        api.getCameraSources(),
        api.getSnapshots({ limit: 30 }),
      ]);

      if (snapsRes.status === 'fulfilled' && snapsRes.value?.snapshots) {
        setSnapshotsList(snapsRes.value.snapshots);
      }

      if (healthRes.status === 'fulfilled' && healthRes.value) {
        setBackendOnline(true);
        setDatabaseStatus(healthRes.value.database === 'ok' ? 'connected' : 'fallback');
        const isArdConnected = healthRes.value.arduinoNano === 'connected';
        const isRobOnline = healthRes.value.robot === 'online' && isArdConnected;
        setArduinoStatus(isArdConnected ? 'CONNECTED' : 'DISCONNECTED');
        setRobotStatus(isRobOnline ? 'ONLINE' : 'OFFLINE');
        setIsLiveDevice(isRobOnline);
        if (healthRes.value.s3 === 'ok') setS3Status('OK');
      }

      if (statsRes.status === 'fulfilled' && statsRes.value?.stats) {
        const s = statsRes.value.stats;
        setCounters({
          totalDetections: s.total || s.totalDetections || 0,
          totalVehicles: s.totalVehicles || s.vehicle || 0,
          cars: s.cars || 0,
          motorcycles: s.motorcycles || 0,
          trucks: s.trucks || 0,
          buses: s.buses || 0,
          bicycles: s.bicycles || 0,
          other: s.other || 0,
          anprPlates: s.anpr || s.anprPlates || 0,
          ambulanceTriggers: s.ambulance || s.ambulances || 0,
          vehiclesClassified: s.vehicle || s.totalVehicles || 0,
          faces: s.faces || 0,
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
        setRobotCameraStatus('LIVE');
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

      const isArdConnected = data.arduinoStatus === 'CONNECTED' || (data.arduinoStatus == null && data.status === 'ONLINE');
      const isOnline = isArdConnected && data.status !== 'OFFLINE';

      setArduinoStatus(isArdConnected ? 'CONNECTED' : 'DISCONNECTED');
      setRobotStatus(isOnline ? 'ONLINE' : 'OFFLINE');
      setIsLiveDevice(isOnline);

      const nowIso = data.timestamp || new Date().toISOString();
      if (isOnline) {
        setLastTelemetryTimestamp(nowIso);
      }

      // Handle battery (both Arduino and schema format)
      const volt = data.voltage != null ? data.voltage : data.batteryVoltage;
      const pct = data.battery != null ? data.battery : data.batteryPercentage;
      const temp = data.temperature != null ? data.temperature : null;
      const cur = data.leftCurrent != null && data.rightCurrent != null ? data.leftCurrent + data.rightCurrent : data.batteryCurrent;

      if (volt != null || pct != null) {
        setLiveBattery({
          voltage: volt != null ? Number(volt) : null,
          percentage: pct != null ? Number(pct) : null,
          current: cur != null ? Number(cur) : null,
          temperature: temp != null ? Number(temp) : null,
          status: volt < 31 ? 'CRITICAL' : volt < 33 ? 'WARNING' : 'NORMAL',
          updatedAt: nowIso,
        });
      }

      // Handle differential motors (both Arduino and schema format)
      const lMotor = data.leftMotor != null ? data.leftMotor : data.leftMotorSpeed;
      const rMotor = data.rightMotor != null ? data.rightMotor : data.rightMotorSpeed;
      const lCur = data.leftCurrent != null ? data.leftCurrent : data.leftMotorCurrent;
      const rCur = data.rightCurrent != null ? data.rightCurrent : data.rightMotorCurrent;

      if (lMotor != null || rMotor != null || lCur != null || rCur != null) {
        setLiveMotors({
          left: {
            current: lCur != null ? Number(lCur) : 0,
            pwm: lMotor != null ? Number(lMotor) : 0,
            speed: lMotor != null ? Number(lMotor) : 0,
            status: (lCur || 0) > 20 ? 'WARNING' : 'NORMAL',
          },
          right: {
            current: rCur != null ? Number(rCur) : 0,
            pwm: rMotor != null ? Number(rMotor) : 0,
            speed: rMotor != null ? Number(rMotor) : 0,
            status: (rCur || 0) > 20 ? 'WARNING' : 'NORMAL',
          },
          updatedAt: nowIso,
        });
      }

      // Handle obstacle ultrasonic
      const obsCm = data.obstacle != null ? data.obstacle : data.frontDistanceCm;
      const obsM = obsCm != null ? Number((obsCm / 100).toFixed(2)) : data.obstacleDistance;

      if (obsCm != null || obsM != null) {
        setLiveUltrasonic({
          frontDistanceCm: obsCm,
          rearDistanceCm: data.rearDistanceCm || null,
          frontDistanceM: obsM,
          rearDistanceM: data.rearDistance || null,
          status: obsCm && obsCm < 30 ? 'CRITICAL' : 'CLEAR',
          updatedAt: nowIso,
        });
      }

      if (data.mode) setControlMode(data.mode);
      else if (data.controlMode) setControlMode(data.controlMode);

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
        const vClass = String(det.vehicleClass || '').toUpperCase();
        return {
          ...prev,
          totalDetections: prev.totalDetections + 1,
          anprPlates: type === 'ANPR' ? prev.anprPlates + 1 : prev.anprPlates,
          ambulanceTriggers: type === 'AMBULANCE' ? prev.ambulanceTriggers + 1 : prev.ambulanceTriggers,
          vehiclesClassified: type === 'VEHICLE' || type === 'AMBULANCE' ? prev.vehiclesClassified + 1 : prev.vehiclesClassified,
          cars: vClass === 'CAR' ? prev.cars + 1 : prev.cars,
          motorcycles: vClass === 'MOTORCYCLE' ? prev.motorcycles + 1 : prev.motorcycles,
          trucks: vClass === 'TRUCK' ? prev.trucks + 1 : prev.trucks,
          buses: vClass === 'BUS' ? prev.buses + 1 : prev.buses,
          bicycles: vClass === 'BICYCLE' ? prev.bicycles + 1 : prev.bicycles,
          faces: type === 'FACE' ? prev.faces + 1 : prev.faces,
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
          vehicleType: det.details?.vehicleType || det.vehicleClass || 'CAR',
          confidence: det.confidence || 0.94,
          imageUrl: det.plateImageUrl || det.imageUrl,
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

    // 4. Vehicle Counts Update from Tracker
    const handleVehicleCount = (stats) => {
      if (stats) {
        setCounters((prev) => ({
          ...prev,
          totalVehicles: stats.totalVehicles !== undefined ? stats.totalVehicles : prev.totalVehicles,
          cars: stats.cars !== undefined ? stats.cars : prev.cars,
          motorcycles: stats.motorcycles !== undefined ? stats.motorcycles : prev.motorcycles,
          trucks: stats.trucks !== undefined ? stats.trucks : prev.trucks,
          buses: stats.buses !== undefined ? stats.buses : prev.buses,
          bicycles: stats.bicycles !== undefined ? stats.bicycles : prev.bicycles,
          other: stats.other !== undefined ? stats.other : prev.other,
          vehiclesClassified: stats.totalVehicles !== undefined ? stats.totalVehicles : prev.vehiclesClassified,
        }));
      }
    };

    // 5. Camera Status
    const handleCameraStatus = (status) => {
      if (status && status.status) {
        setRobotCameraStatus(status.status.includes('LIVE') ? 'LIVE' : 'OFFLINE');
      }
      if (status && status.streamUrl) {
        setRobotCameraStreamUrl(status.streamUrl);
      }
    };

    // 6. Command Acknowledgments
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
    socket.on('camera:live_stream', (streamData) => {
      if (streamData && streamData.image) {
        setLiveMobileFrame(streamData);
        setRobotCameraStatus('LIVE');
      }
    });
    socket.on('detection:new', handleDetectionNew);
    socket.on('ai:detection', handleDetectionNew);
    socket.on('robot:detection', handleDetectionNew);
    socket.on('vehicle:count', handleVehicleCount);
    socket.on('ambulance:detected', (det) => handleDetectionNew({ ...det, type: 'AMBULANCE' }));
    socket.on('anpr:detected', (det) => handleDetectionNew({ ...det, type: 'ANPR' }));
    socket.on('face:detected', (det) => handleDetectionNew({ ...det, type: 'FACE' }));
    socket.on('vehicle:detected', (det) => handleDetectionNew({ ...det, type: 'VEHICLE' }));

    socket.on('command:ack', handleCommandAck);
    socket.on('device:ack', handleCommandAck);

    socket.on('snapshot:created', (snap) => {
      if (snap) {
        setLatestSnapshot(snap);
        setSnapshotsList((prev) => [snap, ...prev.slice(0, 49)]);
      }
    });

    // Gemini AI Intelligence Socket Events
    const handleAiIncident = (incident) => {
      if (!incident) return;
      setLatestAiIncident(incident);
      setAiIncidentsHistory((prev) => [incident, ...prev.slice(0, 49)]);
      if (incident.latency_ms) {
        setAiStatus((prev) => ({ ...prev, latencyMs: incident.latency_ms }));
      }
    };

    socket.on('ai:incident', handleAiIncident);
    socket.on('ai:alert', handleAiIncident);
    socket.on('ai:analysis', handleAiIncident);
    socket.on('ai:status', (st) => {
      if (st) setAiStatus((prev) => ({ ...prev, ...st }));
    });

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('robot:status', handleRobotStatus);
      socket.off('robot:heartbeat', handleHeartbeat);
      socket.off('robot:telemetry', handleTelemetry);
      socket.off('device:telemetry', handleTelemetry);
      socket.off('device:heartbeat', handleHeartbeat);
      socket.off('camera:status', handleCameraStatus);
      socket.off('camera:live_stream');
      socket.off('detection:new', handleDetectionNew);
      socket.off('ai:detection', handleDetectionNew);
      socket.off('robot:detection', handleDetectionNew);
      socket.off('vehicle:count', handleVehicleCount);
      socket.off('ambulance:detected');
      socket.off('anpr:detected');
      socket.off('face:detected');
      socket.off('vehicle:detected');
      socket.off('command:ack', handleCommandAck);
      socket.off('device:ack', handleCommandAck);
      socket.off('ai:incident', handleAiIncident);
      socket.off('ai:alert', handleAiIncident);
      socket.off('ai:analysis', handleAiIncident);
      socket.off('ai:status');
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
        totalVehicles: 0,
        cars: 0,
        motorcycles: 0,
        trucks: 0,
        buses: 0,
        bicycles: 0,
        other: 0,
        anprPlates: 0,
        ambulanceTriggers: 0,
        vehiclesClassified: 0,
        faces: 0,
      });
    } catch (err) {
      console.error('Failed to clear detections log:', err);
    }
  }, []);

  // AI Assistant Chat Dispatch
  const sendAiChatMessage = useCallback(
    async (userMessage) => {
      if (!userMessage || !userMessage.trim()) return;

      const userMsgObj = {
        id: `usr-${Date.now()}`,
        role: 'user',
        content: userMessage.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setAiAssistantMessages((prev) => [...prev, userMsgObj]);
      setIsAiResponding(true);

      try {
        const historyPayload = aiAssistantMessages.slice(-6).map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const contextPayload = {
          robot_id: selectedRobotId,
          robot_status: robotStatus,
          control_mode: controlMode,
          battery_voltage: liveBattery.voltage,
          obstacle_distance: liveUltrasonic.frontDistanceM,
          vehicle_counts: counters,
          active_ambulance: Boolean(activeAmbulance),
          recent_incident: latestAiIncident,
        };

        const res = await api.chatWithAi({
          message: userMessage.trim(),
          history: historyPayload,
          context: contextPayload,
        });

        const aiMsgObj = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: res.reply || 'Understood. Monitoring sector.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          severity: res.severity || 'low',
          suggested_actions: res.suggested_actions || [],
        };

        setAiAssistantMessages((prev) => [...prev, aiMsgObj]);
      } catch (err) {
        const fallbackMsgObj = {
          id: `ai-err-${Date.now()}`,
          role: 'assistant',
          content: `AI Service notice: ${err.message || 'Unable to connect'}. Robot control and telemetry remain fully operational.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          severity: 'low',
          suggested_actions: ['Retry question', 'Inspect Telemetry'],
        };
        setAiAssistantMessages((prev) => [...prev, fallbackMsgObj]);
      } finally {
        setIsAiResponding(false);
      }
    },
    [selectedRobotId, robotStatus, controlMode, liveBattery, liveUltrasonic, counters, activeAmbulance, latestAiIncident, aiAssistantMessages]
  );

  const requestAiIncidentSummary = useCallback(
    async (minutes = 5) => {
      try {
        const summary = await api.getAiIncidentSummary(minutes, {
          vehicle_counts: counters,
          active_ambulance: Boolean(activeAmbulance),
        });
        if (summary?.ai_summary) {
          setLatestAiIncident(summary.ai_summary);
        }
        return summary;
      } catch (err) {
        console.warn('Incident summary request error:', err);
      }
    },
    [counters, activeAmbulance]
  );

  const requestRobotStatusAnalysis = useCallback(async () => {
    try {
      const res = await api.analyzeRobotStatus({
        battery_voltage: liveBattery.voltage,
        motor_current_left: liveMotors.left.current,
        motor_current_right: liveMotors.right.current,
        obstacle_distance_cm: liveUltrasonic.frontDistanceCm,
      });
      return res;
    } catch (err) {
      console.warn('Robot status analysis error:', err);
    }
  }, [liveBattery, liveMotors, liveUltrasonic]);

  const requestAiDetectionExplanation = useCallback(async (detection) => {
    try {
      const res = await api.explainDetection(detection, {
        battery_voltage: liveBattery.voltage,
      });
      return res;
    } catch (err) {
      console.warn('Detection explanation error:', err);
    }
  }, [liveBattery]);

  const updateSettings = useCallback(async (newSettings) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
    try {
      if (api.updateSettings) {
        await api.updateSettings(newSettings);
      }
    } catch (e) {
      console.warn('Backend updateSettings failed or offline', e);
    }
  }, []);

  const resetSettings = useCallback(async () => {
    const defaultSettings = {
      defaultSpeed: 60,
      maxSpeed: 90,
      emergencyStopDistance: 0.35,
      obstacleWarningDistance: 0.80,
      maxMotorCurrent: 22.0,
      criticalBatteryVoltage: 10.5,
      lowBatteryVoltage: 10.5,
    };
    setSettings(defaultSettings);
    try {
      if (api.updateSettings) {
        await api.updateSettings(defaultSettings);
      }
    } catch (e) {
      console.warn('Backend resetSettings failed or offline', e);
    }
  }, []);

  const triggerScenario = useCallback((scenarioType) => {
    const now = new Date().toISOString();
    if (scenarioType === 'clear') {
      setLiveBattery({
        voltage: 11.8,
        current: 0.8,
        percentage: 95,
        temperature: 32,
        status: 'NOMINAL',
        updatedAt: now,
      });
      setLiveUltrasonic({
        frontDistanceCm: 142,
        rearDistanceCm: 210,
        frontDistanceM: 1.42,
        rearDistanceM: 2.1,
        status: 'CLEAR',
        updatedAt: now,
      });
      setLiveMotors({
        left: { current: 1.2, pwm: 0, speed: 0, status: 'IDLE' },
        right: { current: 1.1, pwm: 0, speed: 0, status: 'IDLE' },
        updatedAt: now,
      });
    } else if (scenarioType === 'obstacle_close') {
      setLiveUltrasonic({
        frontDistanceCm: 25,
        rearDistanceCm: 180,
        frontDistanceM: 0.25,
        rearDistanceM: 1.8,
        status: 'OBSTACLE_DETECTED',
        updatedAt: now,
      });
    } else if (scenarioType === 'low_battery') {
      setLiveBattery({
        voltage: 10.2,
        current: 1.4,
        percentage: 15,
        temperature: 36,
        status: 'LOW_BATTERY',
        updatedAt: now,
      });
    } else if (scenarioType === 'motor_stall') {
      setLiveMotors({
        left: { current: 26.5, pwm: 90, speed: 0, status: 'OVERCURRENT' },
        right: { current: 27.2, pwm: 90, speed: 0, status: 'OVERCURRENT' },
        updatedAt: now,
      });
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
        setRobotStatus,
        arduinoStatus,
        setArduinoStatus,
        rcStatus,
        setRcStatus,
        controlMode,
        setControlMode,
        speedLimiter,
        setSpeedLimiter,
        emergencyStop,
        setEmergencyStop,
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
        totalVehicles: counters.totalVehicles,
        cars: counters.cars,
        motorcycles: counters.motorcycles,
        trucks: counters.trucks,
        buses: counters.buses,
        bicycles: counters.bicycles,
        other: counters.other,
        faces: counters.faces,

        // Camera & Perception
        robotCameraStreamUrl,
        setRobotCameraStreamUrl,
        robotCameraStatus,
        setRobotCameraStatus,
        aiStatus,
        liveDetections,
        liveEvents,
        anprList,
        snapshotsList,
        latestSnapshot,
        setSnapshotsList,
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
        liveMobileFrame,
        setLiveMobileFrame,
        isLiveAiMode,
        setIsLiveAiMode,
        activeFacingMode,
        cameraError,
        localCamStarting,
        startLocalCamera,
        stopLocalCamera,
        flipCamera,
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
        updateSettings,
        resetSettings,
        triggerScenario,
        activeTab,
        setActiveTab,
        isEmergencyModalOpen,
        setIsEmergencyModalOpen,

        // Gemini AI Intelligence Suite
        latestAiIncident,
        setLatestAiIncident,
        aiIncidentsHistory,
        aiAssistantMessages,
        isAiResponding,
        sendAiChatMessage,
        requestAiIncidentSummary,
        requestRobotStatusAnalysis,
        requestAiDetectionExplanation,

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
