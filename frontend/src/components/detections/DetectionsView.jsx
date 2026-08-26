"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRobot } from '../../context/RobotContext';
import { api } from '../../lib/api.js';
import { StatusBadge } from '../common/StatusBadge';
import {
  FileSearch,
  Search,
  Filter,
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

  const fetchDetections = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getDetectionsLog({
        type: typeFilter,
        search: searchQuery,
        page,
        limit: 10,
      });
      setDetections(res.data || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
      if (res.stats) setStats(res.stats);
    } catch (e) {
      console.error('Failed to load detections', e);
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
        return <Siren className="w-4 h-4 text-rose-400" />;
      case 'anpr':
        return <FileText className="w-4 h-4 text-sky-400" />;
      case 'vehicle':
        return <Car className="w-4 h-4 text-amber-400" />;
      case 'face':
        return <UserCheck className="w-4 h-4 text-emerald-400" />;
      default:
        return <FileSearch className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div id="detections-view" className="space-y-6 max-w-6xl mx-auto font-mono">
      {/* Header Info & Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <div className="text-xs text-slate-400">Total Detections</div>
          <div className="text-xl font-black text-white">{stats.total}</div>
          <div className="text-[10px] text-slate-500">Indexed In Memory</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <div className="text-xs text-slate-400">ANPR License Plates</div>
          <div className="text-xl font-black text-sky-400">{stats.anpr}</div>
          <div className="text-[10px] text-slate-500">OCR OCR-94.2% avg</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <div className="text-xs text-slate-400">Ambulance Alerts</div>
          <div className="text-xl font-black text-rose-400">{stats.ambulance}</div>
          <div className="text-[10px] text-slate-500">Green Corridors</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <div className="text-xs text-slate-400">Vehicles & Walkers</div>
          <div className="text-xl font-black text-amber-400">{stats.vehicle + stats.face}</div>
          <div className="text-[10px] text-slate-500">Crosswalk / Lane Traffic</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-detections"
            type="text"
            placeholder="Search by license plate (e.g. MH12), vehicle type, state..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            {['all', 'anpr', 'ambulance', 'vehicle', 'face'].map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTypeFilter(t);
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded text-xs font-bold uppercase transition cursor-pointer ${
                  typeFilter === t
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <button
            id="btn-refresh-detections"
            onClick={fetchDetections}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            id="btn-clear-detections"
            onClick={handleClear}
            className="p-2 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-300 transition cursor-pointer"
            title="Clear all logs"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Detections List */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="divide-y divide-slate-800">
          {detections.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              No detection records found matching current query.
            </div>
          ) : (
            detections.map((det) => (
              <div
                key={det.id}
                className="p-4 hover:bg-slate-800/40 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 shrink-0 mt-0.5">
                    {getIcon(det.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{det.result}</span>
                      <StatusBadge
                        label={det.type}
                        variant={
                          det.type === 'ambulance'
                            ? 'red'
                            : det.type === 'anpr'
                            ? 'blue'
                            : det.type === 'vehicle'
                            ? 'amber'
                            : 'green'
                        }
                      />
                    </div>
                    <div className="text-slate-400 text-[11px] mt-1 flex flex-wrap items-center gap-3">
                      <span>Camera: {det.camera}</span>
                      <span>Confidence: {Math.round(det.confidence * 100)}%</span>
                      {det.details?.plateState && (
                        <span>State: {det.details.plateState}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 whitespace-nowrap self-end sm:self-center">
                  {new Date(det.timestamp).toLocaleTimeString()} • {new Date(det.timestamp).toLocaleDateString()}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing Page <span className="text-white font-bold">{page}</span> of {totalPages} ({total} entries)
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-prev-page"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-white cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              id="btn-next-page"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-white cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
