"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useRobot } from '../../context/RobotContext';
import { StatusBadge } from '../common/StatusBadge';
import {
  Camera,
  Maximize2,
  Play,
  RotateCcw,
  Download,
  SwitchCamera,
  CameraOff,
} from 'lucide-react';
import { api } from '../../lib/api.js';

export const VisionView = () => {
  const { latestDetection, triggerAIDetection, telemetry } = useRobot();
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);
  const [showHUD, setShowHUD] = useState(true);
  const [cameraSource, setCameraSource] = useState('demo');
  const [deviceStatus, setDeviceStatus] = useState('Permission Required');
  const [deviceIds, setDeviceIds] = useState([]);
  const [deviceIndex, setDeviceIndex] = useState(0);
  const [capturedImage, setCapturedImage] = useState(null);
  const [savedImage, setSavedImage] = useState(null);
  const [cameraError, setCameraError] = useState('');
  const [robotStreamUrl, setRobotStreamUrl] = useState(null);
  const videoRef = useRef(null);
  const viewportRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    api.getCameraSources().then((data) => setRobotStreamUrl(data.sources?.robot?.streamUrl || null)).catch(() => {});
    return () => streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const refreshDevices = async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return [];
    const devices = (await navigator.mediaDevices.enumerateDevices()).filter((device) => device.kind === 'videoinput');
    setDeviceIds(devices);
    return devices;
  };

  const startDeviceCamera = async (requestedDeviceId) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera access is not supported by this browser.');
      setDeviceStatus('Error');
      return;
    }

    setCameraError('');
    setDeviceStatus('Connecting');
    streamRef.current?.getTracks().forEach((track) => track.stop());
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: requestedDeviceId ? { deviceId: { exact: requestedDeviceId } } : { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraSource('device');
      setDeviceStatus('DEVICE CAMERA ACTIVE');
      await refreshDevices();
    } catch (error) {
      setDeviceStatus(error.name === 'NotAllowedError' ? 'Permission Denied' : 'Error');
      setCameraError(
        error.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in your browser and try again.'
          : 'Unable to start camera. Check that a camera is connected and available.'
      );
    }
  };

  const stopDeviceCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setDeviceStatus('Permission Required');
  };

  const captureImage = () => {
    if (cameraSource !== 'device' || !videoRef.current?.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    setCapturedImage(canvas.toDataURL('image/jpeg', 0.92));
  };

  const saveImage = async () => {
    if (!capturedImage) return;
    try {
      const blob = await (await fetch(capturedImage)).blob();
      const image = await api.uploadCapturedImage(blob, {
        cameraSource: 'device',
        width: videoRef.current?.videoWidth || '',
        height: videoRef.current?.videoHeight || '',
      });
      setSavedImage(image.imageUrl);
    } catch (error) {
      setCameraError(error.message);
    }
  };

  const switchCamera = async () => {
    const devices = deviceIds.length ? deviceIds : await refreshDevices();
    if (devices.length < 2) return;
    const nextIndex = (deviceIndex + 1) % devices.length;
    setDeviceIndex(nextIndex);
    await startDeviceCamera(devices[nextIndex].deviceId);
  };

  const selectSource = (source) => {
    if (source === 'device') startDeviceCamera();
    else {
      stopDeviceCamera();
      setCameraSource(source);
      setCameraError('');
      setDeviceStatus('Permission Required');
    }
  };

  return (
    <div id="vision-stream-view" className="space-y-6 max-w-6xl mx-auto font-sans">
      {/* Stream Control & Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 uppercase">PRAHARI OPTICAL UVC STREAM & PERCEPTION</div>
            <p className="text-xs text-slate-500">
              1080p Full HD Optical Camera with Real-Time YOLOv8/ANPR Overlay
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-toggle-hud"
            onClick={() => setShowHUD(!showHUD)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
              showHUD
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-slate-50 text-slate-600 border-slate-200'
            }`}
          >
            HUD: {showHUD ? 'ON' : 'OFF'}
          </button>

          <button
            id="btn-toggle-boxes"
            onClick={() => setShowBoundingBoxes(!showBoundingBoxes)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
              showBoundingBoxes
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-slate-50 text-slate-600 border-slate-200'
            }`}
          >
            Boxes: {showBoundingBoxes ? 'ON' : 'OFF'}
          </button>

          <StatusBadge label="1080p @ 30FPS" variant="green" pulse={true} />
        </div>
      </div>

      {/* Primary Video Feed Viewport */}
      <div className="relative aspect-video w-full rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-xl">
        <div ref={viewportRef} className="absolute inset-0 z-20 pointer-events-none">
          {cameraSource === 'device' && !capturedImage && <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />}
          {cameraSource === 'robot' && robotStreamUrl && <img src={robotStreamUrl} alt="PRAHARI robot camera stream" className="absolute inset-0 w-full h-full object-contain bg-slate-950" />}
        </div>
        {cameraSource !== 'robot' && (
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 flex flex-col justify-between p-6">
            {/* Top HUD Bar */}
            {showHUD && (
              <div className="flex justify-between items-start text-xs text-slate-300 z-10 select-none font-mono">
                <div className="bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 space-y-0.5">
                  <div className="text-emerald-400 font-bold">PRAHARI OPTICAL HOST 01</div>
                  <div className="text-[10px] text-slate-400">LATENCY: 42ms • BITRATE: 4.8 Mbps</div>
                </div>

                <div className="bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 text-right space-y-0.5">
                  <div className="text-emerald-400 font-bold">ANPR & OBJECT DETECTOR ONLINE</div>
                  <div className="text-[10px] text-slate-400">FPS: 30.0 • EXPOSURE: AUTO</div>
                </div>
              </div>
            )}

            {/* Center Reticle & Bounding Boxes */}
            <div className="relative w-full flex-1 flex items-center justify-center pointer-events-none">
              {showHUD && (
                <div className="w-28 h-28 border border-emerald-500/30 rounded-full flex items-center justify-center relative">
                  <div className="absolute w-full h-px bg-emerald-500/30" />
                  <div className="absolute h-full w-px bg-emerald-500/30" />
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                </div>
              )}

              {showBoundingBoxes && (
                <>
                  <div className="absolute left-[15%] top-[30%] w-48 h-28 border-2 border-emerald-400 bg-emerald-500/10 rounded-lg p-2 flex flex-col justify-between font-mono">
                    <div className="bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded w-max">
                      ANPR: MH12AB1234 (94%)
                    </div>
                    <div className="text-[9px] text-emerald-300 font-bold">STATE: MAHARASHTRA</div>
                  </div>

                  <div className="absolute right-[20%] bottom-[25%] w-56 h-36 border-2 border-emerald-400 bg-emerald-500/10 rounded-lg p-2 flex flex-col justify-between font-mono">
                    <div className="bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded w-max">
                      VEHICLE: SEDAN (88%)
                    </div>
                    <div className="text-[9px] text-emerald-300 font-bold">LANE 1 • CLEARANCE: OK</div>
                  </div>
                </>
              )}
            </div>

            {/* Bottom HUD Bar */}
            {showHUD && (
              <div className="flex justify-between items-end text-xs text-slate-300 z-10 select-none font-mono">
                <div className="bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800">
                  <span>RADAR DIST: </span>
                  <span className="text-emerald-400 font-bold">{telemetry.obstacleDistance || '2.85'}m</span>
                </div>

                <div className="bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800">
                  <span>BATTERY: </span>
                  <span className="text-emerald-400 font-bold">{telemetry.batteryVoltage || '37.8'}V</span>
                </div>
              </div>
            )}
            {capturedImage && cameraSource === 'device' && (
              <img src={capturedImage} alt="Captured camera preview" className="absolute inset-0 z-30 w-full h-full object-contain bg-slate-950" />
            )}
          </div>
        )}
      </div>

      {/* Camera Controls Panel */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
            <Camera className="w-4 h-4 text-emerald-600" /> CAMERA SOURCE: {cameraSource === 'device' ? 'DEVICE CAMERA' : cameraSource === 'robot' ? 'ROBOT CAMERA' : 'DEMO CAMERA'}
          </div>
          <StatusBadge
            label={cameraSource === 'device' ? deviceStatus : cameraSource === 'robot' ? (robotStreamUrl ? 'ROBOT CAMERA ONLINE' : 'Camera Offline') : 'DEMO CAMERA'}
            variant={cameraSource === 'device' && deviceStatus === 'Permission Denied' ? 'red' : 'green'}
            pulse={cameraSource === 'device' && deviceStatus === 'DEVICE CAMERA ACTIVE'}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => selectSource('device')} className="px-3.5 py-1.5 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-300 text-xs font-semibold transition cursor-pointer">DEVICE CAMERA</button>
          <button onClick={() => selectSource('robot')} className="px-3.5 py-1.5 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-300 text-xs font-semibold transition cursor-pointer">ROBOT CAMERA</button>
          <button onClick={() => selectSource('demo')} className="px-3.5 py-1.5 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-300 text-xs font-semibold transition cursor-pointer">DEMO CAMERA</button>
          {cameraSource === 'device' && !capturedImage && <button onClick={() => startDeviceCamera(deviceIds[deviceIndex]?.deviceId)} className="p-2 rounded-xl bg-emerald-600 text-white" title="Start camera"><Play className="w-4 h-4" /></button>}
          {cameraSource === 'device' && <button onClick={stopDeviceCamera} className="p-2 rounded-xl bg-slate-100 text-slate-700 border border-slate-300" title="Stop camera"><CameraOff className="w-4 h-4" /></button>}
          {cameraSource === 'device' && <button onClick={switchCamera} disabled={deviceIds.length < 2} className="p-2 rounded-xl bg-slate-100 text-slate-700 border border-slate-300 disabled:opacity-40" title="Switch camera"><SwitchCamera className="w-4 h-4" /></button>}
          {cameraSource === 'device' && !capturedImage && <button onClick={captureImage} className="p-2 rounded-xl bg-emerald-600 text-white" title="Capture image"><Camera className="w-4 h-4" /></button>}
          {capturedImage && <button onClick={() => { setCapturedImage(null); setSavedImage(null); }} className="p-2 rounded-xl bg-slate-100 text-slate-700 border border-slate-300" title="Retake"><RotateCcw className="w-4 h-4" /></button>}
          {capturedImage && <button onClick={saveImage} className="p-2 rounded-xl bg-emerald-600 text-white" title="Save captured image"><Download className="w-4 h-4" /></button>}
          <button onClick={() => viewportRef.current?.requestFullscreen?.()} className="p-2 rounded-xl bg-slate-100 text-slate-700 border border-slate-300" title="Fullscreen"><Maximize2 className="w-4 h-4" /></button>
        </div>

        {cameraError && <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 p-2.5 rounded-xl flex items-center justify-between gap-2"><span>{cameraError}</span>{cameraError.includes('denied') && <button onClick={() => startDeviceCamera()} className="underline font-bold">Retry</button>}</div>}
        {savedImage && <div className="text-xs text-emerald-700">Captured image saved: {savedImage}</div>}
      </div>
    </div>
  );
};
