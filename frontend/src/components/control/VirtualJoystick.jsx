"use client";

import React, { useRef, useState, useEffect, useCallback } from 'react';

export const VirtualJoystick = ({ onMove, onStop, disabled = false }) => {
  const containerRef = useRef(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const lastCommandRef = useRef('STOP');

  const maxRadius = 55; // Maximum radius the knob can move in pixels

  const handlePointerStart = (e) => {
    if (disabled) return;
    setIsDragging(true);
    updateJoystick(e.clientX, e.clientY);
  };

  const updateJoystick = useCallback(
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

      setKnobPos({ x: dx, y: dy });

      // Determine movement quadrant / command
      const deadzone = 12;
      if (distance < deadzone) {
        if (lastCommandRef.current !== 'STOP') {
          lastCommandRef.current = 'STOP';
          onStop();
        }
        return;
      }

      let command = 'STOP';
      // Prioritize Forward/Reverse vs Left/Right based on dominant axis
      if (Math.abs(dy) > Math.abs(dx)) {
        if (dy < 0) command = 'FORWARD';
        else command = 'REVERSE';
      } else {
        if (dx < 0) command = 'LEFT';
        else command = 'RIGHT';
      }

      if (lastCommandRef.current !== command) {
        lastCommandRef.current = command;
        onMove(command);
      }
    },
    [disabled, onMove, onStop]
  );

  useEffect(() => {
    const handlePointerMove = (e) => {
      if (isDragging) {
        updateJoystick(e.clientX, e.clientY);
      }
    };

    const handlePointerEnd = () => {
      if (isDragging) {
        setIsDragging(false);
        setKnobPos({ x: 0, y: 0 });
        if (lastCommandRef.current !== 'STOP') {
          lastCommandRef.current = 'STOP';
          onStop();
        }
      }
    };

    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerEnd);
      window.addEventListener('pointercancel', handlePointerEnd);
    }

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerEnd);
      window.removeEventListener('pointercancel', handlePointerEnd);
    };
  }, [isDragging, updateJoystick, onStop]);

  return (
    <div className="flex flex-col items-center justify-center p-2 select-none touch-none">
      <div
        ref={containerRef}
        id="virtual-joystick-base"
        onPointerDown={handlePointerStart}
        className={`relative w-44 h-44 rounded-full bg-slate-950/90 border-2 border-sky-500/40 shadow-inner flex items-center justify-center cursor-grab active:cursor-grabbing ${
          disabled ? 'opacity-40 cursor-not-allowed' : ''
        }`}
      >
        {/* Cardinal Direction Indicators */}
        <span className="absolute top-2 text-[10px] font-bold text-sky-400 font-mono">FWD</span>
        <span className="absolute bottom-2 text-[10px] font-bold text-sky-400 font-mono">REV</span>
        <span className="absolute left-2 text-[10px] font-bold text-sky-400 font-mono">L</span>
        <span className="absolute right-2 text-[10px] font-bold text-sky-400 font-mono">R</span>

        {/* Outer Ring Guideline */}
        <div className="w-28 h-28 rounded-full border border-dashed border-slate-700/80 pointer-events-none" />

        {/* Joystick Thumb Stick */}
        <div
          id="virtual-joystick-knob"
          style={{
            transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
          }}
          className={`absolute w-16 h-16 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 border-2 border-white/80 shadow-lg shadow-sky-950 flex items-center justify-center transition-transform duration-75 ${
            isDragging ? 'scale-105 shadow-sky-500/50' : ''
          }`}
        >
          <div className="w-5 h-5 rounded-full bg-slate-900/60 border border-white/30" />
        </div>
      </div>
      <div className="text-[10px] text-slate-400 mt-2 font-mono">
        Touch & Drag Virtual Joystick
      </div>
    </div>
  );
};
