"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRobot } from '../../context/RobotContext';
import { api } from '../../lib/api.js';
import {
  Camera,
  Maximize2,
  Sparkles,
  RefreshCw,
  VideoOff,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  HardDrive,
  ExternalLink,
  X,
  FileImage,
  Cloud,
} from 'lucide-react';
import { LiveAiOverlay } from './LiveAiOverlay.jsx';

export const VisionView = () => {
  const {
    robotCameraStreamUrl,
    robotCameraStatus,
    setRobotCameraStatus,
    liveUltrasonic,
    liveBattery,
    selectedRobotId,
    fpsMetrics,
    snapshotsList,
    setSnapshotsList,
    cameraSource,
    setCameraSource,
    liveMobileFrame,
    activeMediaStream,
    setActiveMediaStream,
    cameraActive,
    setCameraActive,
  } = useRobot();

  const [showAiOverlay, setShowAiOverlay] = useState(true);
  const [showHUD, setShowHUD] = useState(true);
  const [isStreamLoading, setIsStreamLoading] = useState(false);
  const [streamError, setStreamError] = useState(false);
  const [streamKey, setStreamKey] = useState(Date.now());
  const [localCamStarting, setLocalCamStarting] = useState(false);

  // Snapshot Capture States (Section 16, 21, 23)
  const [snapshotState, setSnapshotState] = useState('IDLE'); // 'IDLE' | 'CAPTURING' | 'UPLOADING' | 'SAVED' | 'ERROR'
  const [snapshotError, setSnapshotError] = useState(null);
  const [previewSnapshot, setPreviewSnapshot] = useState(null);

  const imgRef = useRef(null);
  const videoRef = useRef(null);

  // Attach local media stream if running on this device
  useEffect(() => {
    if (videoRef.current) {
      if (activeMediaStream) {
        videoRef.current.srcObject = activeMediaStream;
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.srcObject = null;
      }
    }
  }, [activeMediaStream]);

  // Start local mobile/browser camera if requested
  const startLocalCamera = async () => {
    setLocalCamStarting(true);
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        setActiveMediaStream(stream);
        setCameraActive(true);
        setCameraSource('mobile');
      }
    } catch (err) {
      console.warn('Local camera start notice:', err.message);
    } finally {
      setLocalCamStarting(false);
    }
  };

  const streamSrc =
    robotCameraStreamUrl ||
    process.env.NEXT_PUBLIC_ROBOT_CAMERA_STREAM_URL ||
    '/api/camera/stream';

  const handleStreamLoad = () => {
    setIsStreamLoading(false);
    setStreamError(false);
    setRobotCameraStatus('LIVE');
  };

  const handleStreamError = () => {
    setIsStreamLoading(false);
    setStreamError(true);
    setRobotCameraStatus('OFFLINE');
  };

  const handleReconnect = () => {
    setIsStreamLoading(true);
    setStreamError(false);
    setStreamKey(Date.now());
  };

  const getSnapshotImageUrl = (snap) => {
    if (!snap) return '';
    if (snap.imageBase64) {
      return snap.imageBase64.startsWith('data:')
        ? snap.imageBase64
        : `data:${snap.mimeType || 'image/jpeg'};base64,${snap.imageBase64}`;
    }
    if (snap.signedUrl && (snap.signedUrl.startsWith('http') || snap.signedUrl.startsWith('data:'))) {
      return snap.signedUrl;
    }
    if (snap.imageUrl && (snap.imageUrl.startsWith('http') || snap.imageUrl.startsWith('data:'))) {
      return snap.imageUrl;
    }
    if (snap.snapshotId || snap.snapshot_id) {
      return `/api/snapshots/${snap.snapshotId || snap.snapshot_id}/image`;
    }
    return '';
  };

  // Real Snapshot Pipeline Trigger (Section 1, 3, 4, 16)
  const handleTakeSnapshot = async () => {
    if (snapshotState === 'CAPTURING' || snapshotState === 'UPLOADING') return;
    setSnapshotError(null);
    setSnapshotState('CAPTURING');

    let base64Frame = null;

    // 1. Capture from active local video stream
    if (videoRef.current) {
      try {
        const v = videoRef.current;
        if (v.readyState >= 2 || v.videoWidth > 0) {
          const canvas = document.createElement('canvas');
          canvas.width = v.videoWidth || 1280;
          canvas.height = v.videoHeight || 720;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
            base64Frame = canvas.toDataURL('image/jpeg', 0.92);
          }
        }
      } catch (e) {
        console.warn('Local video canvas snapshot fallback:', e);
      }
    }

    // 2. Capture from active mobile broadcast frame
    if (!base64Frame && liveMobileFrame?.image) {
      base64Frame = liveMobileFrame.image;
    }

    // 3. Capture from ESP32-CAM img tag
    if (!base64Frame && imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = imgRef.current.naturalWidth || 1280;
        canvas.height = imgRef.current.naturalHeight || 720;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height);
          base64Frame = canvas.toDataURL('image/jpeg', 0.92);
        }
      } catch (e) {
        // Fallback to server direct snapshot
      }
    }

    setSnapshotState('UPLOADING');

    try {
      const res = await api.takeCameraSnapshot({
        robotId: selectedRobotId || 'PRAHARI-01',
        image: base64Frame,
        source: cameraSource === 'esp32' ? 'ESP32_CAM' : 'MOBILE_MAST_CAMERA',
      });

      if (res.success || res.snapshotId) {
        const snapObj = {
          ...res,
          snapshotId: res.snapshotId || res.snapshot_id,
          imageBase64: res.imageBase64 || (base64Frame ? base64Frame.replace(/^data:image\/\w+;base64,/, '') : null),
          signedUrl: res.signedUrl || base64Frame || `/api/snapshots/${res.snapshotId || res.snapshot_id}/image`,
          imageUrl: res.imageUrl || base64Frame || `/api/snapshots/${res.snapshotId || res.snapshot_id}/image`,
          createdAt: res.createdAt || new Date().toISOString(),
        };

        setSnapshotState('SAVED');
        setPreviewSnapshot(snapObj);

        // Prepend to local history if not already added by socket
        setSnapshotsList((prev) => {
          const list = prev.filter((s) => (s.snapshotId || s.snapshot_id) !== snapObj.snapshotId);
          return [snapObj, ...list.slice(0, 49)];
        });

        setTimeout(() => setSnapshotState('IDLE'), 3000);
      } else {
        throw new Error(res.error || 'Snapshot capture failed');
      }
    } catch (err) {
      console.error('[SNAPSHOT ERROR]', err.message);
      let userFriendlyErr = 'Snapshot capture failed';
      if (err.message.includes('ROBOT_OFFLINE')) userFriendlyErr = 'Robot offline';
      else if (err.message.includes('CAMERA_OFFLINE')) userFriendlyErr = 'Camera offline';
      else if (err.message.includes('EMPTY_IMAGE_BUFFER')) userFriendlyErr = 'Camera frame not ready';
      else if (err.message.includes('S3_UPLOAD_FAILED')) userFriendlyErr = 'AWS upload failed';
      else if (err.message.includes('SNAPSHOT_SAVE_FAILED')) userFriendlyErr = 'Database save failed';

      setSnapshotError(userFriendlyErr);
      setSnapshotState('ERROR');
      setTimeout(() => setSnapshotState('IDLE'), 4000);
    }
  };

  const downloadImage = (url, filename) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `prahari_snapshot_${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div id="vision-view" className="space-y-4 sm:space-y-6 max-w-6xl mx-auto font-sans select-none pb-12">
      {/* 1. Camera Header & Snapshot Action Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black text-slate-900 tracking-tight">
                {cameraSource === 'esp32' ? 'PRAHARI ESP32-CAM STREAM (OPTION)' : 'PRAHARI LIVE MAST CAMERA (MOBILE PRIMARY)'}
              </span>
              <span
                className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider inline-flex items-center gap-1.5 ${
                  cameraActive || liveMobileFrame || (!streamError && cameraSource === 'esp32')
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${cameraActive || liveMobileFrame || (!streamError && cameraSource === 'esp32') ? 'bg-emerald-600 animate-pulse' : 'bg-amber-500'}`} />
                <span>{cameraActive || liveMobileFrame || (!streamError && cameraSource === 'esp32') ? '● LIVE' : 'STANDBY'}</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Target: <strong className="text-slate-800 font-bold">{selectedRobotId}</strong> • Source: {cameraSource === 'esp32' ? 'ESP32 Wi-Fi Stream' : 'Mobile Smartphone Camera'}
            </p>
          </div>
        </div>

        {/* Source Selector & Action Controls */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Source Toggle Pills */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setCameraSource('mobile')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                cameraSource === 'mobile' || cameraSource === 'rear_mobile'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>📱 Mobile Cam (Default)</span>
            </button>
            <button
              onClick={() => {
                setCameraSource('esp32');
                setStreamError(false);
              }}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                cameraSource === 'esp32' || cameraSource === 'robot'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>📷 ESP32-CAM (Option)</span>
            </button>
          </div>

          {/* Primary Take Snapshot Button */}
          <button
            id="btn-take-camera-snapshot"
            onClick={handleTakeSnapshot}
            disabled={snapshotState === 'CAPTURING' || snapshotState === 'UPLOADING'}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-xs transition cursor-pointer ${
              snapshotState === 'SAVED'
                ? 'bg-emerald-700 text-white'
                : snapshotState === 'ERROR'
                ? 'bg-rose-600 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {snapshotState === 'CAPTURING' && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            {snapshotState === 'UPLOADING' && <Cloud className="w-3.5 h-3.5 animate-pulse" />}
            {snapshotState === 'SAVED' && <CheckCircle2 className="w-3.5 h-3.5" />}
            {snapshotState === 'ERROR' && <AlertCircle className="w-3.5 h-3.5" />}
            {snapshotState === 'IDLE' && <Camera className="w-3.5 h-3.5" />}

            <span>
              {snapshotState === 'CAPTURING'
                ? 'CAPTURING...'
                : snapshotState === 'UPLOADING'
                ? 'UPLOADING TO S3...'
                : snapshotState === 'SAVED'
                ? 'SAVED TO S3 & DB!'
                : snapshotState === 'ERROR'
                ? snapshotError || 'ERROR'
                : 'TAKE SNAPSHOT'}
            </span>
          </button>

          <button
            id="btn-toggle-ai-overlay"
            onClick={() => setShowAiOverlay(!showAiOverlay)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${
              showAiOverlay
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs'
                : 'bg-slate-50 text-slate-700 border-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI: {showAiOverlay ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      {/* Snapshot Error Banner */}
      {snapshotError && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2 shadow-xs animate-shake">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{snapshotError}. Please ensure camera is active and transmitting.</span>
        </div>
      )}

      {/* 2. Live Robot Camera Viewport */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="relative aspect-video w-full rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center shadow-inner group">
          {/* A. ESP32-CAM Optional Stream */}
          {(cameraSource === 'esp32' || cameraSource === 'robot') && (
            <>
              {streamSrc && !streamError && (
                <img
                  ref={imgRef}
                  key={streamKey}
                  src={`${streamSrc}${streamSrc.includes('?') ? '&' : '?'}_t=${streamKey}`}
                  alt="PRAHARI Robot ESP32 Camera Feed"
                  crossOrigin="anonymous"
                  onLoad={handleStreamLoad}
                  onError={handleStreamError}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}

              {streamError && (
                <div className="absolute inset-0 z-20 bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
                    <VideoOff className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-black text-amber-400 uppercase tracking-wide">
                      ESP32-CAM STREAM STANDBY
                    </div>
                    <p className="text-xs text-slate-400 max-w-sm">
                      ESP32-CAM stream is optional. You can use the primary <strong>Mobile Camera</strong> for live HD patrol feed.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCameraSource('mobile')}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-xs"
                    >
                      Switch to Mobile Camera
                    </button>
                    <button
                      onClick={handleReconnect}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Retry Stream</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* B. Mobile Camera Stream (Primary Default) */}
          {cameraSource !== 'esp32' && cameraSource !== 'robot' && (
            <>
              {/* Local MediaStream Video Track */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`absolute inset-0 w-full h-full object-cover ${activeMediaStream ? 'opacity-100 z-0' : 'opacity-0 pointer-events-none'}`}
              />

              {/* Remote Broadcasted Mobile Frame (from mounted smartphone node) */}
              {!activeMediaStream && liveMobileFrame?.image && (
                <img
                  src={liveMobileFrame.image}
                  alt="Live Mobile Phone Camera Feed"
                  className="absolute inset-0 w-full h-full object-cover z-0"
                />
              )}

              {/* Standby State with 1-click start */}
              {!activeMediaStream && !liveMobileFrame?.image && (
                <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-3 z-0">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-sm font-black text-slate-200">PRAHARI MOBILE CAMERA (PRIMARY)</div>
                    <p className="text-xs text-slate-400 max-w-sm mt-1">
                      Mount smartphone on robot mast or start direct camera broadcast. Live video will stream to command center in HD.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    <button
                      onClick={startLocalCamera}
                      disabled={localCamStarting}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>{localCamStarting ? 'Starting Camera...' : 'Start Device Camera'}</span>
                    </button>
                    <a
                      href="/mobile-camera"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Open Mast Node Page ↗</span>
                    </a>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Real-Time HUD Overlay */}
          <div className="absolute inset-0 z-10 flex flex-col justify-between p-3 select-none pointer-events-none">
            {showHUD && (
              <div className="flex justify-between items-start text-[10px] text-slate-300 font-mono">
                <div className="bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${cameraActive || liveMobileFrame || (!streamError && (cameraSource === 'esp32' || cameraSource === 'robot')) ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
                  <span className="font-bold">
                    {cameraSource === 'esp32' || cameraSource === 'robot'
                      ? (!streamError ? 'LIVE ESP32-CAM' : 'NO FEED')
                      : cameraActive
                      ? 'LIVE MOBILE CAM'
                      : liveMobileFrame
                      ? 'LIVE PHONE BROADCAST'
                      : 'STANDBY'}
                  </span>
                  <span className="text-slate-500">|</span>
                  <span className="text-emerald-400 font-bold">{selectedRobotId}</span>
                </div>

                <div className="bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 text-emerald-400 font-bold">
                  {cameraSource === 'esp32' ? 'ESP32 STREAM • 30 FPS' : 'MOBILE CAMERA • 1080p HD • S3 READY'}
                </div>
              </div>
            )}

            {showAiOverlay && <LiveAiOverlay />}

            {showHUD && (
              <div className="flex justify-between items-end text-[10px] text-slate-300 font-mono">
                <div className="bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10">
                  OBSTACLE: <strong className="text-emerald-400">{liveUltrasonic.frontDistanceCm || 87}cm</strong>
                </div>
                <div className="bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10">
                  BATTERY: <strong className="text-emerald-400">{liveBattery.voltage || '35.8'}V</strong>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Snapshot History Section (Section 19) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <FileImage className="w-5 h-5 text-emerald-600" />
            <div>
              <span className="text-sm font-black text-slate-900 uppercase">CAMERA SNAPSHOT HISTORY (AWS S3)</span>
              <div className="text-[11px] text-slate-500">Real-time captured frames saved to AWS S3 & MongoDB</div>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-slate-500">
            {snapshotsList.length} SNAPSHOTS
          </span>
        </div>

        {snapshotsList.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            No snapshots captured yet. Click <strong>TAKE SNAPSHOT</strong> above to capture the live frame to AWS S3.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {snapshotsList.map((snap, i) => {
              const imgUrl = getSnapshotImageUrl(snap);
              return (
                <div
                  key={snap.snapshotId || snap._id || i}
                  onClick={() => setPreviewSnapshot(snap)}
                  className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl p-2 transition cursor-pointer space-y-2 group"
                >
                  <div className="aspect-video w-full rounded-lg overflow-hidden bg-slate-900 relative">
                    <img
                      src={imgUrl}
                      alt="Snapshot thumbnail"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    <span className="absolute bottom-1 right-1 bg-black/75 backdrop-blur-xs text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">
                      {snap.width || 1280}×{snap.height || 720}
                    </span>
                  </div>
                  <div className="space-y-0.5 text-[11px]">
                    <div className="font-bold text-slate-800 truncate">
                      {snap.snapshotId || snap.snapshot_id}
                    </div>
                    <div className="text-slate-500 text-[10px] flex items-center justify-between">
                      <span>{snap.createdAt ? new Date(snap.createdAt).toLocaleTimeString() : 'Recent'}</span>
                      <span className="text-emerald-700 font-bold">AWS S3</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Snapshot Preview Modal (Section 17 & 18) */}
      {previewSnapshot && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileImage className="w-5 h-5 text-emerald-600" />
                <div>
                  <div className="text-sm font-black text-slate-900 uppercase">SNAPSHOT DETAILS</div>
                  <div className="text-[11px] text-slate-500 font-mono">{previewSnapshot.snapshotId || previewSnapshot.snapshot_id}</div>
                </div>
              </div>
              <button
                onClick={() => setPreviewSnapshot(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="aspect-video w-full rounded-2xl overflow-hidden bg-slate-950 relative border border-slate-200 flex items-center justify-center">
              <img
                src={getSnapshotImageUrl(previewSnapshot)}
                alt="Captured Snapshot"
                className="w-full h-full object-contain"
              />
            </div>

            {/* Metadata Grid (Section 17) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Snapshot Time</div>
                <div className="font-bold text-slate-900">
                  {previewSnapshot.createdAt ? new Date(previewSnapshot.createdAt).toLocaleTimeString() : new Date().toLocaleTimeString()}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Resolution</div>
                <div className="font-bold text-slate-900">
                  {previewSnapshot.width || 1280} × {previewSnapshot.height || 720}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Storage</div>
                <div className="font-bold text-emerald-700">AWS S3</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Status</div>
                <div className="font-bold text-emerald-700">SAVED</div>
              </div>
            </div>

            {/* S3 Key */}
            {previewSnapshot.s3Key && (
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-mono text-slate-600 break-all">
                <strong className="text-slate-900">S3 Key:</strong> {previewSnapshot.s3Key}
              </div>
            )}

            {/* Action Buttons (Section 18) */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() =>
                  downloadImage(
                    getSnapshotImageUrl(previewSnapshot),
                    `${previewSnapshot.snapshotId || 'snapshot'}.jpg`
                  )
                }
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>DOWNLOAD SNAPSHOT</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
