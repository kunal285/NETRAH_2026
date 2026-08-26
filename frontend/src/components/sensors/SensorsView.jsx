"use client";

import React, { useState } from 'react';
import { useRobot } from '../../context/RobotContext';
import { StatusBadge } from '../common/StatusBadge';
import {
  Cpu,
  Activity,
  AlertTriangle,
  Zap,
  BatteryCharging,
  Sliders,
  CheckCircle2,
  Camera,
  Layers,
} from 'lucide-react';

export const SensorsView = () => {
  const { robotState, telemetry, triggerScenario } = useRobot();
  const [testDist, setTestDist] = useState(robotState.ultrasonic.distance);

  const sensors = [
    {
      id: 'hc-sr04',
      name: 'HC-SR04 Ultrasonic Rangefinder',
      channel: 'GPIO 5 (TRIG) / GPIO 18 (ECHO)',
      status: robotState.ultrasonic.status === 'CLEAR' ? 'NORMAL' : 'WARNING',
      value: `${robotState.ultrasonic.distance} meters`,
      desc: 'Front obstacle detection radar (range 0.02m - 4.0m)',
      type: 'Distance Sensor',
    },
    {
      id: 'acs712-l',
      name: 'ACS712-30A Current Sensor (Left)',
      channel: 'ADC1_CH0 (GPIO 36)',
      status: robotState.leftMotor.current > 20 ? 'WARNING' : 'NORMAL',
      value: `${robotState.leftMotor.current} A`,
      desc: 'Measures Left MY1016 motor draw via BTS7960 low-side shunt',
      type: 'Hall Current',
    },
    {
      id: 'acs712-r',
      name: 'ACS712-30A Current Sensor (Right)',
      channel: 'ADC1_CH3 (GPIO 39)',
      status: robotState.rightMotor.current > 20 ? 'WARNING' : 'NORMAL',
      value: `${robotState.rightMotor.current} A`,
      desc: 'Measures Right MY1016 motor draw via BTS7960 low-side shunt',
      type: 'Hall Current',
    },
    {
      id: 'voltage-divider',
      name: 'Precision Resistor Voltage Divider',
      channel: 'ADC1_CH6 (GPIO 34)',
      status: robotState.battery.status === 'CRITICAL' ? 'CRITICAL' : 'NORMAL',
      value: `${robotState.battery.voltage} V (${robotState.battery.percentage}%)`,
      desc: 'Scales 36V-42V Li-ion pack voltage down to 0-3.3V ESP32 ADC range',
      type: 'Analog Voltage',
    },
    {
      id: 'lm2596-buck',
      name: 'LM2596 DC-DC Step-Down Regulator',
      channel: 'Chassis 5V Power Distribution Bus',
      status: 'NORMAL',
      value: `${telemetry.internal5VRail} V`,
      desc: 'Steps 36V battery down to stabilized 5.0V for logic MCU, sensors, and UVC cam',
      type: 'Power Rail',
    },
    {
      id: 'camera-uvc',
      name: '1080p Full HD Optical Camera',
      channel: 'USB Host / V4L2 Interface',
      status: 'NORMAL',
      value: '1920×1080 @ 30fps',
      desc: 'High dynamic range wide-angle optical sensor for AI vehicle & ANPR analysis',
      type: 'Vision Sensor',
    },
  ];

  return (
    <div id="sensors-view" className="space-y-6 max-w-6xl mx-auto font-mono">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sky-600/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">HARDWARE SENSOR ARRAY & BUS STATUS</div>
            <p className="text-[11px] text-slate-400">
              Live ADC sampling and bus health monitoring across all PRAHARI sub-modules.
            </p>
          </div>
        </div>
        <StatusBadge label="6 HARDWARE CHANNELS ONLINE" variant="green" />
      </div>

      {/* Sensor Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sensors.map((s) => (
          <div
            key={s.id}
            className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-3 flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider">
                    {s.type}
                  </span>
                  <div className="text-sm font-bold text-white">{s.name}</div>
                </div>
                <StatusBadge
                  label={s.status}
                  variant={s.status === 'NORMAL' ? 'green' : s.status === 'WARNING' ? 'amber' : 'red'}
                />
              </div>
              <div className="text-lg font-black text-slate-100 font-mono bg-slate-950 p-2 rounded-lg border border-slate-800">
                {s.value}
              </div>
              <p className="text-[11px] text-slate-400">{s.desc}</p>
            </div>

            <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-500 flex justify-between">
              <span>Pin / Bus:</span>
              <span className="text-slate-300 font-semibold">{s.channel}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Interactive Obstacle Injection & Diagnostic Suite */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 font-bold text-white text-sm">
            <Activity className="w-4 h-4 text-sky-400" />
            <span>SENSOR INJECTION & SAFETY FAULT INJECTOR</span>
          </div>
          <span className="text-xs text-slate-400">Live Simulator Testing</span>
        </div>

        <p className="text-xs text-slate-400">
          Simulate obstacle proximity changes or abnormal electrical conditions to verify PRAHARI autonomous safety interlocks.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <button
            id="btn-inject-clear"
            onClick={() => triggerScenario('clear')}
            className="p-3 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-200 border border-emerald-800 font-bold text-left transition cursor-pointer"
          >
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Clear Path (2.5m)</span>
            </div>
            <div className="text-[10px] text-slate-400 font-normal">Normal road clearance</div>
          </button>

          <button
            id="btn-inject-obstacle"
            onClick={() => triggerScenario('obstacle_close')}
            className="p-3 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 text-rose-200 border border-rose-800 font-bold text-left transition cursor-pointer"
          >
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Obstacle (0.25m)</span>
            </div>
            <div className="text-[10px] text-slate-400 font-normal">Triggers safety interlock</div>
          </button>

          <button
            id="btn-inject-lowbatt"
            onClick={() => triggerScenario('low_battery')}
            className="p-3 rounded-xl bg-amber-950/60 hover:bg-amber-900/60 text-amber-200 border border-amber-800 font-bold text-left transition cursor-pointer"
          >
            <div className="flex items-center gap-2 mb-1">
              <BatteryCharging className="w-4 h-4 text-amber-400" />
              <span>Low Battery (31.5V)</span>
            </div>
            <div className="text-[10px] text-slate-400 font-normal">Tests 15% charge alert</div>
          </button>

          <button
            id="btn-inject-overcurrent"
            onClick={() => triggerScenario('overcurrent')}
            className="p-3 rounded-xl bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-200 border border-indigo-800 font-bold text-left transition cursor-pointer"
          >
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-indigo-400" />
              <span>Overcurrent (26A)</span>
            </div>
            <div className="text-[10px] text-slate-400 font-normal">Motor stall protection</div>
          </button>
        </div>
      </div>
    </div>
  );
};
