"use client";

import React, { useRef, useEffect, useCallback } from 'react';
import { socketClient } from '../../lib/socket';

/**
 * High-Performance VirtualJoystick
 * - 60 FPS hardware-accelerated visual movement via requestAnimationFrame & direct DOM transform
 * - Zero React re-render overhead during high-speed drag
 * - Decoupled 25Hz WebSocket control dispatch loop
 * - Immediate zero-delay STOP on touch/pointer release
 * - Browser Gamepad API support
 */
export const VirtualJoystick = ({ onDrive, onStop, disabled = false, speed = 70 }) => {
  const containerRef = useRef(null);
  const knobRef = useRef(null);
  const hudThrottleRef = useRef(null);
  const hudSteeringRef = useRef(null);

  const isDraggingRef = useRef(false);
  const activeVectorRef = useRef({ throttle: 0, steering: 0 });
  const targetPosRef = useRef({ x: 0, y: 0 });
  const currentPosRef = useRef({ x: 0, y: 0 });
  const animFrameIdRef = useRef(null);
  const heartbeatTimerRef = useRef(null);
  const lastDispatchedVectorRef = useRef({ throttle: 0, steering: 0 });

  const maxRadius = 65; // Displacement radius (px)
  const deadzone = 6;

  // 60 FPS Visual Render Loop via requestAnimationFrame
  const renderVisual = useCallback(() => {
    if (knobRef.current) {
      // Smooth lerp or direct translate
      const { x, y } = targetPosRef.current;
      knobRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }

    // Direct DOM text update for HUD without React re-render
    const { throttle, steering } = activeVectorRef.current;
    if (hudThrottleRef.current) {
      hudThrottleRef.current.textContent = throttle > 0 ? `+${throttle.toFixed(2)}` : throttle.toFixed(2);
    }
    if (hudSteeringRef.current) {
      hudSteeringRef.current.textContent = steering > 0 ? `+${steering.toFixed(2)}` : steering.toFixed(2);
    }

    // Continue loop while dragging or if knob is returning to center
    if (isDraggingRef.current || Math.abs(targetPosRef.current.x) > 0.1 || Math.abs(targetPosRef.current.y) > 0.1) {
      animFrameIdRef.current = requestAnimationFrame(renderVisual);
    }
  }, []);

  // Calculate coordinates & update refs
  const processCoords = useCallback(
    (clientX, clientY) => {
      if (!containerRef.current || disabled) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      let dx = clientX - centerX;
      let dy = clientY - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > maxRadius) {
        dx = (dx / distance) * maxRadius;
        dy = (dy / distance) * maxRadius;
      }

      targetPosRef.current = { x: dx, y: dy };

      if (distance < deadzone) {
        activeVectorRef.current = { throttle: 0, steering: 0 };
      } else {
        // Y axis: Up is forward (+1.0), Down is reverse (-1.0)
        // X axis: Right is right (+1.0), Left is left (-1.0)
        const normX = Math.max(-1, Math.min(1, dx / maxRadius));
        const normY = Math.max(-1, Math.min(1, -dy / maxRadius));
        activeVectorRef.current = { throttle: normY, steering: normX };
      }

      // Trigger animation frame if not already running
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = requestAnimationFrame(renderVisual);
    },
    [disabled, renderVisual]
  );

  // 25Hz Decoupled Control Dispatcher (WebSocket)
  const dispatchControlPacket = useCallback(() => {
    const { throttle, steering } = activeVectorRef.current;
    lastDispatchedVectorRef.current = { throttle, steering };

    if (throttle === 0 && steering === 0) {
      socketClient.sendStop();
      if (onStop) onStop();
    } else {
      socketClient.sendDriveVector(throttle, steering, speed);
      if (onDrive) onDrive({ throttle, steering });
    }
  }, [speed, onDrive, onStop]);

  // Pointer Handlers
  const handlePointerDown = (e) => {
    if (disabled) return;
    isDraggingRef.current = true;
    if (knobRef.current) {
      knobRef.current.classList.add('scale-110', 'ring-4', 'ring-emerald-400/50');
    }

    processCoords(e.clientX, e.clientY);
    dispatchControlPacket(); // Instant first packet

    if (!heartbeatTimerRef.current) {
      heartbeatTimerRef.current = setInterval(dispatchControlPacket, 40); // 25 Hz
    }
  };

  const handlePointerMove = useCallback(
    (e) => {
      if (!isDraggingRef.current || disabled) return;
      processCoords(e.clientX, e.clientY);
    },
    [disabled, processCoords]
  );

  // Immediate STOP on release
  const handleRelease = useCallback(() => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      targetPosRef.current = { x: 0, y: 0 };
      activeVectorRef.current = { throttle: 0, steering: 0 };

      if (knobRef.current) {
        knobRef.current.classList.remove('scale-110', 'ring-4', 'ring-emerald-400/50');
        knobRef.current.style.transform = 'translate3d(0px, 0px, 0)';
      }

      if (hudThrottleRef.current) hudThrottleRef.current.textContent = '0.00';
      if (hudSteeringRef.current) hudSteeringRef.current.textContent = '0.00';

      // Clear timer & immediately send hardware STOP
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }

      socketClient.sendStop();
      if (onStop) onStop();
    }
  }, [onStop]);

  // Global listeners for pointer movement and release
  useEffect(() => {
    const onMove = (e) => {
      if (isDraggingRef.current) handlePointerMove(e);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup', handleRelease);
    window.addEventListener('pointercancel', handleRelease);
    window.addEventListener('touchend', handleRelease);
    window.addEventListener('touchcancel', handleRelease);

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', handleRelease);
      window.removeEventListener('pointercancel', handleRelease);
      window.removeEventListener('touchend', handleRelease);
      window.removeEventListener('touchcancel', handleRelease);
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
      cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [handlePointerMove, handleRelease]);

  // Browser Gamepad API support loop
  useEffect(() => {
    let gpAnimId;
    const pollGamepad = () => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      const gp = gamepads[0];
      if (gp && !disabled && !isDraggingRef.current) {
        const rawX = gp.axes[0] || 0;
        const rawY = -gp.axes[1] || 0;
        const len = Math.sqrt(rawX * rawX + rawY * rawY);

        if (len > 0.1) {
          targetPosRef.current = { x: rawX * maxRadius, y: -rawY * maxRadius };
          activeVectorRef.current = { throttle: rawY, steering: rawX };
          renderVisual();
          socketClient.sendDriveVector(rawY, rawX, speed);
        } else if (targetPosRef.current.x !== 0 || targetPosRef.current.y !== 0) {
          targetPosRef.current = { x: 0, y: 0 };
          activeVectorRef.current = { throttle: 0, steering: 0 };
          renderVisual();
          socketClient.sendStop();
        }
      }
      gpAnimId = requestAnimationFrame(pollGamepad);
    };

    gpAnimId = requestAnimationFrame(pollGamepad);
    return () => cancelAnimationFrame(gpAnimId);
  }, [disabled, speed, renderVisual]);

  return (
    <div className="flex flex-col items-center justify-center p-2 select-none touch-none touch-none-selection">
      <div
        ref={containerRef}
        id="virtual-joystick-base"
        onPointerDown={handlePointerDown}
        className={`relative w-48 h-48 sm:w-56 sm:h-56 rounded-full bg-slate-950/95 border-2 border-emerald-500/50 shadow-2xl flex items-center justify-center cursor-grab active:cursor-grabbing ${
          disabled ? 'opacity-40 cursor-not-allowed' : ''
        }`}
      >
        {/* Directional Labels */}
        <span className="absolute top-2.5 text-[10px] font-black text-emerald-400 font-mono tracking-wider">▲ FORWARD</span>
        <span className="absolute bottom-2.5 text-[10px] font-black text-emerald-400 font-mono tracking-wider">▼ REVERSE</span>
        <span className="absolute left-3 text-[10px] font-black text-emerald-400 font-mono tracking-wider">◀ LEFT</span>
        <span className="absolute right-3 text-[10px] font-black text-emerald-400 font-mono tracking-wider">RIGHT ▶</span>

        {/* Reticle grid */}
        <div className="absolute w-40 h-40 rounded-full border border-dashed border-emerald-500/20 pointer-events-none" />
        <div className="absolute w-24 h-24 rounded-full border border-emerald-500/20 pointer-events-none" />
        <div className="absolute w-full h-px bg-emerald-500/20 pointer-events-none" />
        <div className="absolute h-full w-px bg-emerald-500/20 pointer-events-none" />

        {/* Hardware-Accelerated Analog Thumbstick Knob */}
        <div
          ref={knobRef}
          id="virtual-joystick-knob"
          className="absolute w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 border-2 border-white shadow-2xl shadow-emerald-950 flex flex-col items-center justify-center will-change-transform pointer-events-none"
        >
          <div className="w-7 h-7 rounded-full bg-slate-950/70 border border-white/50 flex items-center justify-center shadow-inner">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          </div>
        </div>
      </div>

      {/* Real-time Vector HUD */}
      <div className="flex items-center gap-4 text-[10px] text-slate-500 mt-2 font-mono font-bold">
        <span>
          THROTTLE: <strong ref={hudThrottleRef} className="text-emerald-700">0.00</strong>
        </span>
        <span>
          STEERING: <strong ref={hudSteeringRef} className="text-emerald-700">0.00</strong>
        </span>
      </div>
    </div>
  );
};
