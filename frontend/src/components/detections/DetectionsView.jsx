"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRobot } from '../../context/RobotContext';
import { api } from '../../lib/api.js';
import { StatusBadge } from '../common/StatusBadge';
import {
  FileSearch,
  Search,
  Trash2,
  RefreshCw,
  FileText,
  Siren,
  Car,
  UserCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export const DetectionsView = () => {
  const { latestDetection } = useRobot();
  const [detections, setDetections] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    ambulance: 0,
    anpr: 0,
    vehicle: 0,
    face: 0,
  });
  const [loading, setLoading] = useState(false);
  const [dbError, setDbError] = useState('');

  const fetchDetections = useCallback(async () => {
    setLoading(true);
    setDbError('');
    try {
      const res = await api.getDetectionsLog({
        type: typeFilter,
        search: searchQuery,
        page,
        limit: 10,
      });
      if (res.error === 'DATABASE_UNAVAILABLE') {
        setDbError('MongoDB Database is currently unreachable. Connect to MongoDB to view historical records.');
      } else {
        setDetections(res.data || []);
        setTotal(res.total || 0);
        setTotalPages(res.totalPages || 1);
        if (res.stats) setStats(res.stats);
      }
    } catch (e) {
      setDbError('Database Connection Error: Failed to reach database.');
    } finally {
      setLoading(false);
    }
  }, [typeFilter, searchQuery, page]);

  useEffect(() => {
    fetchDetections();
  }, [fetchDetections, latestDetection]);

  const handleClear = async () => {
    if (window.confirm('Clear all AI perception detection logs?')) {
      await api.clearDetectionsLog();
      fetchDetections();
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'ambulance':
        return <Siren className="w-4 h-4 text-rose-600" />;
      case 'anpr':
        return <FileText className="w-4 h-4 text-emerald-600" />;
      case 'vehicle':
        return <Car className="w-4 h-4 text-amber-600" />;
      case 'face':
        return <UserCheck className="w-4 h-4 text-purple-600" />;
      default:
        return <FileSearch className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div id="detections-view" className="space-y-6 max-w-6xl mx-auto font-sans">
      {/* Header Info & Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-1">
          <div className="text-xs text-slate-500 font-semibold uppercase">Total Detections</div>
          <div className="text-xl font-black text-slate-900 font-mono">{stats.total}</div>
          <div className="text-[11px] text-slate-400">Indexed Records</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-1">
          <div className="text-xs text-slate-500 font-semibold uppercase">ANPR Plates</div>
          <div className="text-xl font-black text-emerald-700 font-mono">{stats.anpr}</div>
          <div className="text-[11px] text-slate-400">HSRP Segmented</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-1">
          <div className="text-xs text-slate-500 font-semibold uppercase">Ambulance Triggers</div>
          <div className="text-xl font-black text-rose-600 font-mono">{stats.ambulance}</div>
          <div className="text-[11px] text-slate-400">Emergency Corridors</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-1">
          <div className="text-xs text-slate-500 font-semibold uppercase">Vehicles Classified</div>
          <div className="text-xl font-black text-slate-900 font-mono">{stats.vehicle}</div>
          <div className="text-[11px] text-slate-400">IoU Tracked</div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <FileSearch className="w-4 h-4" />
            </div>
            <div className="text-sm font-bold text-slate-900">PERCEPTION DETECTION DATABASE</div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              id="btn-refresh-detections"
              onClick={fetchDetections}
              className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              id="btn-clear-detections"
              onClick={handleClear}
              className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Log</span>
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search detected object, plate..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 scrollbar-none">
            {['all', 'anpr', 'ambulance', 'vehicle', 'face'].map((t) => (
              <button
                key={t}
                onClick={() => { setTypeFilter(t); setPage(1); }}
                className={`px-3 py-1 rounded-lg text-[11px] font-semibold uppercase transition cursor-pointer ${
                  typeFilter === t
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Database Error Banner */}
        {dbError && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center justify-between">
            <span>{dbError}</span>
            <button
              onClick={fetchDetections}
              className="px-2.5 py-1 bg-white hover:bg-amber-100 border border-amber-300 rounded-lg font-semibold text-[11px] cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Detection Info</th>
                <th className="py-2.5 px-3">Confidence</th>
                <th className="py-2.5 px-3">Source</th>
                <th className="py-2.5 px-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {detections.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400 text-xs">
                    No detections match current filter.
                  </td>
                </tr>
              ) : (
                detections.map((d, i) => (
                  <tr key={d._id || i} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        {getIcon(d.type)}
                        <span className="font-bold text-slate-900 uppercase text-[11px]">{d.type}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800">
                      {d.metadata?.plateNumber || d.label || d.type}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-emerald-700">
                      {d.confidence != null ? `${Math.round(d.confidence * 100)}%` : 'N/A'}
                    </td>
                    <td className="py-3 px-3 text-slate-500 text-[11px]">
                      {d.cameraSource || 'Optical 1080p'}
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                      {d.timestamp ? new Date(d.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
          <span>Page {page} of {totalPages} ({total} total)</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 disabled:opacity-40"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 disabled:opacity-40"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
