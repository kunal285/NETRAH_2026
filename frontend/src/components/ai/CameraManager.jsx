"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRobot } from '../../context/RobotContext';
import { socketClient } from '../../lib/socket.js';
import { api } from '../../lib/api.js';
import {
  Camera,
  SwitchCamera,
  Play,
  Square,
  Upload,
  Bot,
  AlertTriangle,
  Smartphone,
} from 'lucide-react';

export const CameraManager = ({ onFrameCaptured, onCameraStateChange }) => {
  const {
    isLiveAiMode,
    fpsMetrics,
    setFpsMetrics,
    setLiveDetections,
    setActiveMediaStream,
    cameraActive,
    setCameraActive,
    cameraSource,
    setCameraSource,
  } = useRobot();
  const [deviceList, setDeviceList] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [resolution, setResolution] = useState('720p');
  const [cameraError, setCameraError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const frameIntervalRef = useRef(null);
  const lastFrameTimeRef = useRef(Date.now());
  const frameCountRef = useRef(0);

  // Enumerate video devices
  const refreshDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return [];
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');
      setDeviceList(videoDevices);
      if (videoDevices.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoDevices[0].deviceId);
      }
      return videoDevices;
    } catch {
      return [];
    }
  }, [selectedDeviceId]);

  useEffect(() => {
    refreshDevices();
    return () => stopCamera();
  }, [refreshDevices]);

  // Start selected camera stream
  const startCamera = async (sourceType = cameraSource, deviceId = selectedDeviceId) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera access is not supported on this browser or origin.');
      return;
    }

    setCameraError('');
    stopCamera();

    try {
      const constraints = {
        video: {
          width: resolution === '1080p' ? { ideal: 1920 } : resolution === '720p' ? { ideal: 1280 } : { ideal: 640 },
          height: resolution === '1080p' ? { ideal: 1080 } : resolution === '720p' ? { ideal: 720 } : { ideal: 480 },
        },
        audio: false,
      };

      if (sourceType === 'rear_mobile') {
        constraints.video.facingMode = { ideal: 'environment' };
      } else if (sourceType === 'front_mobile') {
        constraints.video.facingMode = { ideal: 'user' };
      } else if (deviceId) {
        constraints.video.deviceId = { exact: deviceId };
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }

      setActiveMediaStream(stream);
      setCameraActive(true);
      setCameraSource(sourceType);
      if (onCameraStateChange) {
        onCameraStateChange(true, sourceType, videoRef);
      }

      await refreshDevices();
      startFramePipeline();
    } catch (err) {
      setActiveMediaStream(null);
      setCameraActive(false);
      if (onCameraStateChange) onCameraStateChange(false, sourceType, videoRef);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission denied. Please allow camera access in your browser settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera found on this device.');
      } else {
        setCameraError(`Unable to start camera: ${err.message || 'Check camera connection'}`);
      }
    }
  };

  const stopCamera = () => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setActiveMediaStream(null);
    setCameraActive(false);
    if (onCameraStateChange) onCameraStateChange(false, cameraSource, videoRef);
  };

  // High-performance throttled frame capture loop (10-15 FPS for real-time inference)
  const startFramePipeline = () => {
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);

    frameIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState < 2 || isProcessing) return;

      const now = Date.now();
      frameCountRef.current++;
      if (now - lastFrameTimeRef.current >= 1000) {
        setFpsMetrics((prev) => ({
          ...prev,
          cameraFps: frameCountRef.current,
        }));
        frameCountRef.current = 0;
        lastFrameTimeRef.current = now;
      }

      const canvas = canvasRef.current || document.createElement('canvas');
      const v = videoRef.current;
      const targetW = 640;
      const targetH = Math.round((v.videoHeight / (v.videoWidth || 1)) * targetW) || 360;

      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(v, 0, 0, targetW, targetH);
      const frameBase64 = canvas.toDataURL('image/jpeg', 0.70);

      setIsProcessing(true);
      try {
        const socket = socketClient.getSocket();
        if (socket && socket.connected) {
          socket.emit('camera:frame', {
            image: frameBase64,
            camera_id: cameraSource,
            timestamp: new Date().toISOString(),
            isDemo: !isLiveAiMode,
          });
        } else {
          // REST fallback if WebSocket is reconnecting
          const res = await api.processAiFrame({
            image: frameBase64,
            camera_id: cameraSource,
            timestamp: new Date().toISOString(),
            isDemo: !isLiveAiMode,
          });
          if (res && res.objects) {
            setLiveDetections(res.objects);
          }
        }
      } catch (err) {
        // Silently handle frame skip
      } finally {
        setIsProcessing(false);
      }
    }, 100);
  };

  // Handle uploaded video file
  const handleVideoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    stopCamera();
    const videoUrl = URL.createObjectURL(file);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.src = videoUrl;
      videoRef.current.loop = true;
      videoRef.current.play().catch(() => {});
    }

    setCameraActive(true);
    setCameraSource('video_file');
    if (onCameraStateChange) onCameraStateChange(true, 'video_file', videoRef);
    startFramePipeline();
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3 font-sans">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Source Selection Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          <button
            id="btn-cam-rear"
            onClick={() => {
              setCameraSource('rear_mobile');
              startCamera('rear_mobile');
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              (cameraSource === 'rear_mobile' || cameraSource === 'mobile') && cameraActive
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Phone Rear Camera (Primary)</span>
          </button>

          <button
            id="btn-cam-front"
            onClick={() => {
              setCameraSource('front_mobile');
              startCamera('front_mobile');
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              cameraSource === 'front_mobile' && cameraActive
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Phone Front Cam</span>
          </button>

          <button
            id="btn-cam-robot"
            onClick={() => {
              setCameraSource('esp32');
              stopCamera();
              setCameraActive(true);
              if (onCameraStateChange) onCameraStateChange(true, 'esp32', videoRef);
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              (cameraSource === 'esp32' || cameraSource === 'robot') && cameraActive
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>ESP32-CAM (Option)</span>
          </button>

          <button
            id="btn-cam-webcam"
            onClick={() => {
              setCameraSource('webcam');
              startCamera('webcam');
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              cameraSource === 'webcam' && cameraActive
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Webcam / PC</span>
          </button>

          <label className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition flex items-center gap-1.5 cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Video</span>
            <input type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />
          </label>
        </div>

        {/* Start / Stop and Switch Controls */}
        <div className="flex items-center gap-2">
          {cameraActive ? (
            <button
              id="btn-stop-camera"
              onClick={stopCamera}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition"
            >
              <Square className="w-3.5 h-3.5" />
              <span>Stop Camera</span>
            </button>
          ) : (
            <button
              id="btn-start-camera"
              onClick={() => startCamera()}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Start Camera</span>
            </button>
          )}

          {deviceList.length > 1 && (
            <button
              id="btn-switch-camera"
              onClick={() => {
                const currentIndex = deviceList.findIndex((d) => d.deviceId === selectedDeviceId);
                const nextDevice = deviceList[(currentIndex + 1) % deviceList.length];
                if (nextDevice) {
                  setSelectedDeviceId(nextDevice.deviceId);
                  startCamera(cameraSource, nextDevice.deviceId);
                }
              }}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer"
              title="Switch Camera Device"
            >
              <SwitchCamera className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {cameraError && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{cameraError}</span>
        </div>
      )}

      {/* Hidden processing canvas & video stream anchor */}
      <video ref={videoRef} playsInline muted className="hidden" />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};
