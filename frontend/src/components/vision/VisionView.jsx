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
  } = useRobot();

  const [showAiOverlay, setShowAiOverlay] = useState(true);
  const [showHUD, setShowHUD] = useState(true);
  const [isStreamLoading, setIsStreamLoading] = useState(true);
  const [streamError, setStreamError] = useState(false);
  const [streamKey, setStreamKey] = useState(Date.now());

  // Snapshot Capture States (Section 16, 21, 23)
  const [snapshotState, setSnapshotState] = useState('IDLE'); // 'IDLE' | 'CAPTURING' | 'UPLOADING' | 'SAVED' | 'ERROR'
  const [snapshotError, setSnapshotError] = useState(null);
  const [previewSnapshot, setPreviewSnapshot] = useState(null);

  const imgRef = useRef(null);

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

  // Real Snapshot Pipeline Trigger (Section 1, 3, 4, 16)
  const handleTakeSnapshot = async () => {
    if (snapshotState === 'CAPTURING' || snapshotState === 'UPLOADING') return;
    setSnapshotError(null);
    setSnapshotState('CAPTURING');

    let base64Frame = null;

    // Optional client offscreen canvas capture if video is rendered
    try {
      if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
        const canvas = document.createElement('canvas');
        canvas.width = imgRef.current.naturalWidth || 1280;
        canvas.height = imgRef.current.naturalHeight || 720;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height);
          base64Frame = canvas.toDataURL('image/jpeg', 0.92);
        }
      }
    } catch {
      // Cross-origin canvas limitation fallback -> backend direct camera snapshot endpoint
    }

    setSnapshotState('UPLOADING');

    try {
      const res = await api.takeCameraSnapshot({
        robotId: selectedRobotId || 'PRAHARI-01',
        image: base64Frame,
        source: 'OPERATOR_CONSOLE_MAST_CAM',
      });

      if (res.success) {
        setSnapshotState('SAVED');
        setPreviewSnapshot(res);

        // Prepend to local history if not already added by socket
        setSnapshotsList((prev) => {
          if (prev.some((s) => s.snapshotId === res.snapshotId)) return prev;
          return [res, ...prev.slice(0, 49)];
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
                PRAHARI LIVE MAST CAMERA
              </span>
              <span
                className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider inline-flex items-center gap-1.5 ${
                  !streamError
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${!streamError ? 'bg-emerald-600 animate-pulse' : 'bg-rose-600'}`} />
                <span>{!streamError ? '● LIVE' : 'CAMERA OFFLINE'}</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Target: <strong className="text-slate-800 font-bold">{selectedRobotId}</strong> • Source: MJPEG Live Video Stream
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Primary Take Snapshot Button (Section 16) */}
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
                ? 'SAVED!'
                : snapshotState === 'ERROR'
                ? snapshotError || 'ERROR'
                : 'TAKE SNAPSHOT'}
            </span>
          </button>

          <button
            onClick={handleReconnect}
            className="px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            title="Reconnect Stream"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isStreamLoading ? 'animate-spin' : ''}`} />
            <span>Reconnect</span>
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

      {/* Snapshot Error Banner (Section 23) */}
      {snapshotError && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2 shadow-xs animate-shake">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{snapshotError}. Please ensure camera is online and stream is active.</span>
        </div>
      )}

      {/* 2. Live Robot Camera Viewport */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="relative aspect-video w-full rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center shadow-inner group">
          {/* Actual MJPEG Stream from Camera */}
          {streamSrc && !streamError && (
            <img
              ref={imgRef}
              key={streamKey}
              src={`${streamSrc}${streamSrc.includes('?') ? '&' : '?'}_t=${streamKey}`}
              alt="PRAHARI Robot Live Camera Feed"
              crossOrigin="anonymous"
              onLoad={handleStreamLoad}
              onError={handleStreamError}
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}

          {/* Loading Indicator */}
          {isStreamLoading && (
            <div className="absolute inset-0 z-20 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center text-slate-300 space-y-2">
              <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
              <div className="text-xs font-mono font-bold tracking-wider text-emerald-400">
                CONNECTING TO ROBOT CAMERA STREAM...
              </div>
            </div>
          )}

          {/* Error / Offline State */}
          {streamError && (
            <div className="absolute inset-0 z-20 bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500">
                <VideoOff className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-black text-rose-400 uppercase tracking-wide">
                  ROBOT CAMERA OFFLINE
                </div>
                <p className="text-xs text-slate-400 max-w-sm">
                  Cannot connect to live camera stream at <code className="text-slate-300 font-mono text-[11px]">{streamSrc}</code>. Ensure camera stream daemon is running.
                </p>
              </div>
              <button
                onClick={handleReconnect}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Connection</span>
              </button>
            </div>
          )}

          {/* Real-Time HUD Overlay */}
          <div className="absolute inset-0 z-10 flex flex-col justify-between p-3 select-none pointer-events-none">
            {showHUD && (
              <div className="flex justify-between items-start text-[10px] text-slate-300 font-mono">
                <div className="bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${!streamError ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                  <span className="font-bold">{!streamError ? 'LIVE MAST CAM' : 'NO FEED'}</span>
                  <span className="text-slate-500">|</span>
                  <span className="text-emerald-400 font-bold">{selectedRobotId}</span>
                </div>

                <div className="bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 text-emerald-400 font-bold">
                  {fpsMetrics.cameraFps} FPS • 1280x720 • S3 READY
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
              const imgUrl = snap.signedUrl || snap.imageUrl || `/api/snapshots/${snap.snapshotId}/image`;
              return (
                <div
                  key={snap.snapshotId || i}
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
                      {snap.snapshotId}
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
                  <div className="text-[11px] text-slate-500 font-mono">{previewSnapshot.snapshotId}</div>
                </div>
              </div>
              <button
                onClick={() => setPreviewSnapshot(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="aspect-video w-full rounded-2xl overflow-hidden bg-slate-950 relative border border-slate-200">
              <img
                src={previewSnapshot.signedUrl || previewSnapshot.imageUrl || `/api/snapshots/${previewSnapshot.snapshotId}/image`}
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
                    previewSnapshot.signedUrl || previewSnapshot.imageUrl || `/api/snapshots/${previewSnapshot.snapshotId}/image`,
                    `${previewSnapshot.snapshotId}.jpg`
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
