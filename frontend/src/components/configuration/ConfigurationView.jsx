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
  Cpu,
} from 'lucide-react';

export const ConfigurationView = () => {
  const { settings, updateSettings, resetSettings } = useRobot();
  const [form, setForm] = useState(settings);
  const [saveSuccess, setSaveSuccess] = useState(false);

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
    <div id="configuration-view" className="space-y-6 max-w-5xl mx-auto font-sans">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 uppercase">ROBOT PARAMETERS & HARDWARE SPECS</div>
            <p className="text-xs text-slate-500">
              Calibrate motor thresholds, obstacle detection safety limits, and battery interlocks.
            </p>
          </div>
        </div>

        {saveSuccess && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Saved to EEPROM/Backend</span>
          </div>
        )}
      </div>

      {/* Hardware Architecture Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
            <Layers className="w-4 h-4 text-emerald-600" />
            <span>PRAHARI HARDWARE ARCHITECTURE (ARDUINO NANO RP2040 COMPUTE CORE)</span>
          </div>
          <StatusBadge label="ARDUINO NANO RP2040 CONNECT • RP2040" variant="green" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="text-slate-400 text-[10px] uppercase font-bold">COMPUTE BRAIN</div>
            <div className="text-slate-900 font-bold">Arduino Nano RP2040 Connect</div>
            <div className="text-slate-500 text-[11px]">RP2040 Processor • 16MB Flash</div>
          </div>  

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="text-slate-400 text-[10px] uppercase font-bold">MOTORS & DRIVE</div>
            <div className="text-slate-900 font-bold">2× High-Torque DC Motors</div>
            <div className="text-slate-500 text-[11px]">Geared Drive • 360° Front Casters</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="text-slate-400 text-[10px] uppercase font-bold">MOTOR DRIVERS</div>
            <div className="text-slate-900 font-bold">2× BTS7960 43A</div>
            <div className="text-slate-500 text-[11px]">RP2040 Hardware PWM (D5/D6/D9/D10)</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="text-slate-400 text-[10px] uppercase font-bold">BATTERY POWER</div>
            <div className="text-slate-900 font-bold">LI-ION BATTERY 11.5 V 4500MAH</div>
            <div className="text-slate-500 text-[11px]">4.5Ah 3S Pack • 40A Inline Fuse</div>
          </div>
        </div>
      </div>
        
      {/* Parameters Form */}
      <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
            <Sliders className="w-4 h-4 text-emerald-600" />
            <span>CALIBRATION PARAMETERS</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* Obstacle Distance Cutoff */}
          <div className="space-y-2">
            <label className="block font-bold text-slate-800">
              Front Obstacle E-Stop Distance: <strong className="text-emerald-700 font-mono">{form.emergencyStopDistance || 0.35} m</strong>
            </label>
            <input
              type="range"
              min="0.10"
              max="1.50"
              step="0.05"
              value={form.emergencyStopDistance || 0.35}
              onChange={(e) => handleChange('emergencyStopDistance', parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />
            <span className="text-[11px] text-slate-400">Triggers immediate PWM cut if obstacle distance falls below cutoff</span>
          </div>

          {/* Motor Current Limit */}
          <div className="space-y-2">
            <label className="block font-bold text-slate-800">
              Max Motor Current Limit: <strong className="text-emerald-700 font-mono">{form.maxMotorCurrent || 22} A</strong>
            </label>
            <input
              type="range"
              min="5"
              max="35"
              step="1"
              value={form.maxMotorCurrent || 22}
              onChange={(e) => handleChange('maxMotorCurrent', parseInt(e.target.value, 10))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />
            <span className="text-[11px] text-slate-400">Protects BTS7960 H-Bridges from continuous stall overcurrent</span>
          </div>

          {/* Speed Limit */}
          <div className="space-y-2">
            <label className="block font-bold text-slate-800">
              Max Drive Speed Cap: <strong className="text-emerald-700 font-mono">{form.maxSpeed || 90}% PWM</strong>
            </label>
            <input
              type="range"
              min="20"
              max="100"
              step="5"
              value={form.maxSpeed || 90}
              onChange={(e) => handleChange('maxSpeed', parseInt(e.target.value, 10))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />
            <span className="text-[11px] text-slate-400">Governs maximum throttle permitted during manual or web teleoperation</span>
          </div>

          {/* Low Battery Voltage */}
          <div className="space-y-2">
            <label className="block font-bold text-slate-800">
              Low Battery Warning Cutoff: <strong className="text-emerald-700 font-mono">{form.criticalBatteryVoltage || form.lowBatteryVoltage || 10.5} V</strong>
            </label>
            <input
              type="range"
              min="9.0"
              max="12.0"
              step="0.1"
              value={form.criticalBatteryVoltage || form.lowBatteryVoltage || 10.5}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                handleChange('criticalBatteryVoltage', val);
                handleChange('lowBatteryVoltage', val);
              }}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />
            <span className="text-[11px] text-slate-400">Warns operator to return robot to charging bay before BMS cutoff</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
          <button
            type="submit"
            id="btn-save-config"
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
};
