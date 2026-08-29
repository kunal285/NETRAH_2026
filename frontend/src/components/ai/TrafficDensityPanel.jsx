"use client";

import React from 'react';
import { useRobot } from '../../context/RobotContext';
import {
  Car,
  TrendingUp,
  Activity,
  Layers,
  Bike,
  Truck,
  Bus,
} from 'lucide-react';

export const TrafficDensityPanel = () => {
  const { trafficMetrics } = useRobot();

  const total = trafficMetrics.total_vehicles || trafficMetrics.totalVehicles || 0;
  const densityPercent = Math.min(100, Math.round((total / 25) * 100));

  const getDensityBadge = (density = 'LOW') => {
    if (density === 'HIGH' || density === 'CONGESTED') {
      return <span className="px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">{density}</span>;
    }
    if (density === 'MODERATE') {
      return <span className="px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">{density}</span>;
    }
    return <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">{density}</span>;
  };

  return (
    <div
      id="traffic-density-panel"
      className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4 font-sans"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <Car className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              REAL-TIME TRAFFIC DENSITY & VEHICLE CLASSIFICATION
            </div>
            <p className="text-[11px] text-slate-500">
              IoU Multi-Object Tracking • 4-Lane Flow Estimation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {getDensityBadge(trafficMetrics.densityLevel || 'LOW')}
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Cars */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Cars</span>
            <Car className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {trafficMetrics.cars || 0}
          </div>
          <div className="text-[10px] text-slate-400">Sedan / Hatch / SUV</div>
        </div>

        {/* 2-Wheelers */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">2-Wheelers</span>
            <Bike className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {trafficMetrics.twoWheelers || 0}
          </div>
          <div className="text-[10px] text-slate-400">Bikes / Scooters</div>
        </div>

        {/* Buses */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Buses</span>
            <Bus className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {trafficMetrics.buses || 0}
          </div>
          <div className="text-[10px] text-slate-400">Transit & City Buses</div>
        </div>

        {/* Trucks / Heavy */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Trucks / HCV</span>
            <Truck className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {trafficMetrics.trucks || 0}
          </div>
          <div className="text-[10px] text-slate-400">Commercial Heavy</div>
        </div>
      </div>

      {/* 4-Lane Density Bar */}
      <div className="space-y-2 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
        <div className="flex justify-between text-xs">
          <span className="text-slate-600 font-medium">Roadway Utilization:</span>
          <span className="font-bold text-slate-900">{densityPercent}% Saturation</span>
        </div>
        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              densityPercent > 75 ? 'bg-rose-600' : densityPercent > 40 ? 'bg-amber-500' : 'bg-emerald-600'
            }`}
            style={{ width: `${densityPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-slate-400 pt-1">
          <span>Lane 1: {trafficMetrics.lanes?.lane1 || 0} veh</span>
          <span>Lane 2: {trafficMetrics.lanes?.lane2 || 0} veh</span>
          <span>Lane 3: {trafficMetrics.lanes?.lane3 || 0} veh</span>
          <span>Lane 4: {trafficMetrics.lanes?.lane4 || 0} veh</span>
        </div>
      </div>
    </div>
  );
};
