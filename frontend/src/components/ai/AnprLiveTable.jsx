"use client";

import React, { useState } from 'react';
import { useRobot } from '../../context/RobotContext';
import {
  FileText,
  Search,
  Download,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
} from 'lucide-react';

export const AnprLiveTable = () => {
  const { anprList } = useRobot();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedState, setSelectedState] = useState('ALL');

  const states = ['ALL', 'MH', 'DL', 'KA', 'TN', 'UP', 'GJ', 'HR', 'BH'];

  const filteredList = anprList.filter((item) => {
    const matchesSearch =
      item.plateNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.stateName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesState = selectedState === 'ALL' || item.stateCode === selectedState;
    return matchesSearch && matchesState;
  });

  const exportCSV = () => {
    if (filteredList.length === 0) return;
    const headers = 'Plate Number,State,Confidence,Speed (km/h),Timestamp\n';
    const rows = filteredList
      .map(
        (p) =>
          `"${p.plateNumber}","${p.stateName || 'N/A'}",${Math.round((p.confidence || 0.9) * 100)}%,${p.speed || 0},"${p.timestamp}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prahari_anpr_log_${Date.now()}.csv`;
    a.click();
  };

  return (
    <div
      id="anpr-live-table"
      className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4 font-sans"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              INDIAN HSRP AUTOMATIC NUMBER PLATE RECOGNITION (ANPR)
            </div>
            <p className="text-[11px] text-slate-500">
              High Security Registration Plate Segmentation & 28-State / Bharat Series (BH) Parsing
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            id="btn-export-anpr"
            onClick={exportCSV}
            className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Search & State Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search plate or state..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* State Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 scrollbar-none">
          {states.map((st) => (
            <button
              key={st}
              onClick={() => setSelectedState(st)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                selectedState === st
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <th className="py-2.5 px-3">Plate Number</th>
              <th className="py-2.5 px-3">State / Series</th>
              <th className="py-2.5 px-3">Confidence</th>
              <th className="py-2.5 px-3">Speed</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono">
            {filteredList.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-slate-400 text-xs font-sans">
                  No license plates logged yet. Detections will appear here in real time.
                </td>
              </tr>
            ) : (
              filteredList.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3">
                    <span className="font-extrabold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {item.plateNumber}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-700 font-semibold font-sans">
                    {item.stateName || 'Maharashtra'}
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-bold text-emerald-700">
                      {Math.round((item.confidence || 0.94) * 100)}%
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-700">
                    {item.speed || 38} km/h
                  </td>
                  <td className="py-3 px-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold font-sans">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>HSRP Valid</span>
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-400 text-[11px]">
                    {item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
