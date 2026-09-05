"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRobot } from '@/context/RobotContext';
import { socketClient } from '@/lib/socket';
import {
  Camera,
  CameraOff,
  SwitchCamera,
  Zap,
  ZapOff,
  Wifi,
  WifiOff,
  Battery,
} from 'lucide-react';

export default function MobileCameraPage() {
  const {
    robotStatus,
    liveBattery,
    socketConnected,
    latestDetection,
    selectedRobotId,
  } = useRobot();

  const [isStreaming, setIsStreaming] = useState(false);
  const [facingMode, setFacingMode] = useState('environment'); // environment (back) or user (front)
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [streamProfile, setStreamProfile] = useState('ultra'); // 'ultra' (480p/25fps) | 'balanced' (720p/18fps) | 'hd' (1080p/10fps)
  const [streamStats, setStreamStats] = useState({ framesSent: 0, fpsActual: 0, latencyMs: 18, frameKb: 18 });
  const [errorMessage, setErrorMessage] = useState('');
  const [deviceTrack, setDeviceTrack] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamIntervalRef = useRef(null);
  const frameCounterRef = useRef(0);
  const lastFpsCalcRef = useRef(Date.now());
  const isEmittingRef = useRef(false);

  // Profile configurations
  const profileConfigs = {
    ultra: { width: 640, height: 360, quality: 0.52, fps: 25, label: '⚡ Ultra-Low Latency' },
    balanced: { width: 854, height: 480, quality: 0.65, fps: 18, label: '🎯 Balanced HD' },
    hd: { width: 1280, height: 720, quality: 0.78, fps: 10, label: '📷 High Res' },
  };

  const currentCfg = profileConfigs[streamProfile] || profileConfigs.ultra;

  // Start phone camera
  const startCamera = async () => {
    setErrorMessage('');
    try {
      const constraints = {
        audio: false,
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: currentCfg.width >= 1280 ? 1280 : 640 },
          height: { ideal: currentCfg.height >= 720 ? 720 : 360 },
          frameRate: { ideal: currentCfg.fps, max: 30 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      const track = stream.getVideoTracks()[0];
      setDeviceTrack(track);

      // Check for torch capability
      const capabilities = track.getCapabilities?.() || {};
      setHasTorch(Boolean(capabilities.torch));

      setIsStreaming(true);
    } catch (err) {
      console.error('[MobileCamera] Access error:', err);
      setErrorMessage(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera permissions in browser settings.'
          : `Failed to access camera: ${err.message}`
      );
      setIsStreaming(false);
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
      streamIntervalRef.current = null;
    }
    if (deviceTrack) {
      deviceTrack.stop();
      setDeviceTrack(null);
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    setTorchOn(false);
  };

  // Toggle Torch/Flashlight for night patrols
  const toggleTorch = async () => {
    if (!deviceTrack || !hasTorch) return;
    try {
      const nextTorch = !torchOn;
      await deviceTrack.applyConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setTorchOn(nextTorch);
    } catch (e) {
      console.warn('Torch toggle failed:', e);
    }
  };

  // Flip camera between front and back
  const flipCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    if (isStreaming) {
      stopCamera();
      setTimeout(startCamera, 200);
    }
  };

  // Ultra-Low Latency frame capture loop
  useEffect(() => {
    if (!isStreaming) return;

    const captureIntervalMs = Math.round(1000 / currentCfg.fps);
    const canvas = canvasRef.current || document.createElement('canvas');

    streamIntervalRef.current = setInterval(() => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;

      const captureStart = performance.now();
      const targetW = currentCfg.width;
      const targetH = Math.round((targetW * (video.videoHeight || 480)) / (video.videoWidth || 640));

      canvas.width = targetW;
      canvas.height = targetH;

      const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, targetW, targetH);

      const imageBase64 = canvas.toDataURL('image/jpeg', currentCfg.quality);
      const captureLatency = Math.round(performance.now() - captureStart);
      const approxKb = Math.round((imageBase64.length * 0.75) / 1024);

      // Emit over Socket.IO to backend relay
      const socket = socketClient.getSocket();
      if (socket && socket.connected) {
        socket.emit('camera:frame', {
          image: imageBase64,
          timestamp: new Date().toISOString(),
          cameraId: 'MOBILE_PHONE_CAM_01',
          robotId: selectedRobotId || 'PRAHARI-01',
          source: 'MOBILE_MOUNTED_CAMERA',
        });
      }

      frameCounterRef.current++;
      const now = Date.now();
      if (now - lastFpsCalcRef.current >= 1000) {
        setStreamStats({
          framesSent: frameCounterRef.current,
          fpsActual: Math.round((frameCounterRef.current * 1000) / (now - lastFpsCalcRef.current)),
          latencyMs: captureLatency + 12, // Encoding + transport estimate
          frameKb: approxKb,
        });
        frameCounterRef.current = 0;
        lastFpsCalcRef.current = now;
      }
    }, captureIntervalMs);

    return () => {
      if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
    };
  }, [isStreaming, streamProfile, currentCfg, selectedRobotId]);

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col justify-between select-none overflow-hidden relative">
      {/* Video Viewport */}
      <div className="absolute inset-0 z-0 bg-black flex items-center justify-center">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="w-full h-full object-cover"
        />
        {!isStreaming && (
          <div className="text-center p-6 space-y-4 max-w-sm">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
              <Camera className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">PRAHARI Mobile Camera Node</h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Mount this smartphone on the robot mast. Live video feed will be broadcasted to the Command Center and processed by the AI perception engine in real-time.
              </p>
            </div>
            {/* Stream Profile Selector (Before starting) */}
            <div className="space-y-1.5 text-left">
              <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Latency / Quality Mode</div>
              <div className="grid grid-cols-3 gap-1.5">
                {Object.entries(profileConfigs).map(([key, cfg]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setStreamProfile(key)}
                    className={`p-2 rounded-xl border text-[10px] font-bold text-center cursor-pointer transition ${
                      streamProfile === key
                        ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm'
                        : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    <div>{cfg.label}</div>
                    <div className="text-[9px] opacity-75">{cfg.width}p • {cfg.fps}fps</div>
                  </button>
                ))}
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs text-left">
                {errorMessage}
              </div>
            )}
            <button
              onClick={startCamera}
              className="w-full py-3.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black text-sm shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 cursor-pointer transition"
            >
              <Camera className="w-4 h-4" />
              <span>START ULTRA-LOW LATENCY BROADCAST</span>
            </button>
          </div>
        )}
      </div>

      {/* Top HUD Bar */}
      <div className="relative z-10 p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 font-bold flex items-center gap-1.5 backdrop-blur-md">
            <span className={`w-2 h-2 rounded-full ${isStreaming ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            <span>{isStreaming ? 'LIVE TRANSMIT' : 'STANDBY'}</span>
          </div>
          <span className="text-[11px] text-slate-300 font-mono hidden sm:inline">
            NODE: MOBILE_CAM_01 • {currentCfg.width}x{currentCfg.height} • {streamStats.latencyMs}ms
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900/70 border border-slate-700/60 backdrop-blur-md">
            {socketConnected ? <Wifi className="w-3.5 h-3.5 text-emerald-400" /> : <WifiOff className="w-3.5 h-3.5 text-rose-400" />}
            <span className="text-[10px] font-bold">{socketConnected ? 'LINK OK' : 'NO LINK'}</span>
          </div>

          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900/70 border border-slate-700/60 backdrop-blur-md">
            <Battery className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] font-bold">{liveBattery.percentage != null ? `${liveBattery.percentage}%` : '11.5V'}</span>
          </div>
        </div>
      </div>

      {/* Center AI Detection Overlay Banner */}
      {isStreaming && latestDetection && (
        <div className="relative z-10 mx-4 p-3 rounded-2xl bg-black/60 border border-emerald-500/30 backdrop-blur-md flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-bold text-slate-100">{latestDetection.result || latestDetection.type}</span>
          </div>
          <span className="font-mono text-emerald-400 font-bold">
            {latestDetection.confidence ? `${Math.round(latestDetection.confidence * 100)}%` : 'Active'}
          </span>
        </div>
      )}

      {/* Bottom Control Bar */}
      {isStreaming && (
        <div className="relative z-10 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent space-y-3">
          {/* Stats Bar */}
          <div className="grid grid-cols-4 gap-2 text-center text-[10px] text-slate-300 font-mono bg-black/60 p-2 rounded-xl border border-white/10 backdrop-blur-md">
            <div>FPS: <strong className="text-emerald-400">{streamStats.fpsActual || currentCfg.fps}</strong></div>
            <div>LATENCY: <strong className="text-emerald-400">~{streamStats.latencyMs}ms</strong></div>
            <div>PAYLOAD: <strong className="text-emerald-400">{streamStats.frameKb}KB</strong></div>
            <div>STATUS: <strong className="text-emerald-400">{robotStatus}</strong></div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-3">
            {/* Live Profile Switcher while streaming */}
            <div className="flex items-center bg-slate-900/80 rounded-xl p-1 border border-slate-700 backdrop-blur-md">
              {['ultra', 'balanced', 'hd'].map((p) => (
                <button
                  key={p}
                  onClick={() => setStreamProfile(p)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition ${
                    streamProfile === p ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {p === 'ultra' ? '⚡ Ultra' : p === 'balanced' ? '🎯 Balanced' : '📷 HD'}
                </button>
              ))}
            </div>

            {hasTorch && (
              <button
                onClick={toggleTorch}
                className={`p-3 rounded-xl border backdrop-blur-md cursor-pointer transition ${
                  torchOn ? 'bg-amber-400 text-slate-950 border-amber-300' : 'bg-slate-900/80 text-slate-200 border-slate-700'
                }`}
                title="Toggle Mast Torch"
              >
                {torchOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
              </button>
            )}

            <button
              onClick={flipCamera}
              className="p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700 backdrop-blur-md cursor-pointer transition"
              title="Flip Front/Back Camera"
            >
              <SwitchCamera className="w-4 h-4" />
            </button>

            <button
              onClick={stopCamera}
              className="px-5 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-rose-900/40 cursor-pointer transition"
            >
              <CameraOff className="w-4 h-4" />
              <span>STOP</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
