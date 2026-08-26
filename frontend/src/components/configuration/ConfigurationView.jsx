"use client";

import React, { useState } from 'react';
import { useRobot } from '../../context/RobotContext';
import { StatusBadge } from '../common/StatusBadge';
import {
  Wrench,
  Save,
  RotateCcw,
  Sliders,
  Shield,
  Zap,
  Battery,
  Layers,
  CheckCircle2,
} from 'lucide-react';

export const ConfigurationView = () => {
  const { settings, updateSettings, resetSettings } = useRobot();
  const [form, setForm] = useState(settings);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync state if external settings update
  React.useEffect(() => {
    setForm(settings);
  }, [settings]);

  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    await updateSettings(form);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleReset = async () => {
    if (window.confirm('Reset all parameters to PRAHARI factory defaults?')) {
      await resetSettings();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  return (
    <div id="configuration-view" className="space-y-6 max-w-5xl mx-auto font-mono">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sky-600/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
            <Wrench className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">ROBOT PARAMETERS & HARDWARE SPECS</div>
            <p className="text-[11px] text-slate-400">
              Calibrate motor thresholds, obstacle detection safety limits, and battery interlocks.
            </p>
          </div>
        </div>

        {saveSuccess && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-lg text-xs font-bold">
            <CheckCircle2 className="w-4 h-4" />
            <span>Saved to EEPROM/Backend</span>
          </div>
        )}
      </div>

      {/* Hardware Bill of Materials & Architecture Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 font-bold text-white text-sm">
            <Layers className="w-4 h-4 text-sky-400" />
            <span>PRAHARI HARDWARE ARCHITECTURE (SIH NETRA ROBOTICS)</span>
          </div>
          <StatusBadge label="VERIFIED SPECIFICATION" variant="blue" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <div className="text-slate-500 text-[10px]">CHASSIS & DRIVE:</div>
            <div className="text-white font-bold">4-Wheel Differential</div>
            <div className="text-slate-400 text-[11px]">Skid-steer dual motor control</div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <div className="text-slate-500 text-[10px]">MOTORS:</div>
            <div className="text-white font-bold">2× MY1016 350W</div>
            <div className="text-slate-400 text-[11px]">36V DC Brushed High-Torque</div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <div className="text-slate-500 text-[10px]">MOTOR DRIVERS:</div>
            <div className="text-white font-bold">2× BTS7960 43A</div>
            <div className="text-slate-400 text-[11px]">Dual High-Power H-Bridges</div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <div className="text-slate-500 text-[10px]">ENERGY PACK:</div>
            <div className="text-white font-bold">2× 36V 13Ah Li-ion</div>
            <div className="text-slate-400 text-[11px]">936Wh combined capacity</div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <div className="text-slate-500 text-[10px]">STEP-DOWN CONVERTER:</div>
            <div className="text-white font-bold">LM2596 Buck Regulator</div>
            <div className="text-slate-400 text-[11px]">36V → 5.0V Regulated Bus</div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <div className="text-slate-500 text-[10px]">VISION SYSTEM:</div>
            <div className="text-white font-bold">1080p Full HD Optical</div>
            <div className="text-slate-400 text-[11px]">USB Host UVC / 120° FOV</div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <div className="text-slate-500 text-[10px]">COLLISION RADAR:</div>
            <div className="text-white font-bold">HC-SR04 Ultrasonic</div>
            <div className="text-slate-400 text-[11px]">4.0m Front Detection Range</div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <div className="text-slate-500 text-[10px]">MICROCONTROLLER:</div>
            <div className="text-white font-bold">ESP32 Dual-Core</div>
            <div className="text-slate-400 text-[11px]">240MHz / WiFi & ESP-NOW</div>
          </div>
        </div>
      </div>

      {/* Calibration Form */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Speed & Drive Limits */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 font-bold text-white text-sm border-b border-slate-800 pb-2">
              <Sliders className="w-4 h-4 text-sky-400" />
              <span>DRIVE & THROTTLE LIMITS</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-slate-300">Default Patrol Speed (%)</label>
                  <span className="text-sky-400 font-bold">{form.defaultSpeed}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={form.defaultSpeed}
                  onChange={(e) => handleChange('defaultSpeed', parseInt(e.target.value, 10))}
                  className="w-full h-2 bg-slate-800 rounded accent-sky-500"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-slate-300">Maximum Governed Speed Cap (%)</label>
                  <span className="text-sky-400 font-bold">{form.maxSpeed}%</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="100"
                  step="5"
                  value={form.maxSpeed}
                  onChange={(e) => handleChange('maxSpeed', parseInt(e.target.value, 10))}
                  className="w-full h-2 bg-slate-800 rounded accent-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Telemetry Broadcast Interval (ms)</label>
                <input
                  type="number"
                  min="100"
                  max="2000"
                  step="50"
                  value={form.telemetryIntervalMs}
                  onChange={(e) => handleChange('telemetryIntervalMs', parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white font-bold"
                />
              </div>
            </div>
          </div>

          {/* Safety & Thresholds */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 font-bold text-white text-sm border-b border-slate-800 pb-2">
              <Shield className="w-4 h-4 text-rose-400" />
              <span>SAFETY INTERLOCK THRESHOLDS</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">
                  Emergency Stop Obstacle Distance (meters)
                </label>
                <input
                  type="number"
                  min="0.10"
                  max="1.50"
                  step="0.05"
                  value={form.emergencyStopDistance}
                  onChange={(e) => handleChange('emergencyStopDistance', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white font-bold"
                />
                <span className="text-[10px] text-slate-500">
                  Motors instantly lock if obstacle is within this distance.
                </span>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">
                  Obstacle Warning Distance (meters)
                </label>
                <input
                  type="number"
                  min="0.30"
                  max="3.00"
                  step="0.10"
                  value={form.obstacleWarningDistance}
                  onChange={(e) => handleChange('obstacleWarningDistance', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">
                  Motor Overcurrent Cutoff Limit (Amperes)
                </label>
                <input
                  type="number"
                  min="10"
                  max="35"
                  step="1"
                  value={form.maxMotorCurrent}
                  onChange={(e) => handleChange('maxMotorCurrent', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">
                  Critical Battery Voltage Cutoff (Volts)
                </label>
                <input
                  type="number"
                  min="28"
                  max="35"
                  step="0.5"
                  value={form.criticalBatteryVoltage}
                  onChange={(e) => handleChange('criticalBatteryVoltage', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white font-bold"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            id="btn-config-reset"
            onClick={handleReset}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Factory Defaults</span>
          </button>

          <button
            type="submit"
            id="btn-config-save"
            className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white border border-sky-400 text-xs font-bold flex items-center gap-1.5 transition shadow-lg cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
};
