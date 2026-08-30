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
  Image as ImageIcon,
  X,
} from 'lucide-react';

export const DetectionsView = () => {
  const { latestDetection, counters, clearAiEvents } = useRobot();
  const [detections, setDetections] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

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
    } catch (e) {
      console.warn('Failed to query detections:', e);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, searchQuery, page]);

  useEffect(() => {
    fetchDetections();
  }, [fetchDetections, latestDetection]);

  const handleClear = async () => {
    if (window.confirm('Are you sure you want to delete all AI detection logs and AWS S3 snapshots?')) {
      await clearAiEvents();
      fetchDetections();
    }
  };

  const getIcon = (type = '') => {
    const t = String(type).toUpperCase();
    switch (t) {
      case 'AMBULANCE':
        return <Siren className="w-4 h-4 text-rose-600" />;
      case 'ANPR':
        return <FileText className="w-4 h-4 text-emerald-600" />;
      case 'VEHICLE':
        return <Car className="w-4 h-4 text-amber-600" />;
      case 'FACE':
        return <UserCheck className="w-4 h-4 text-purple-600" />;
      default:
        return <FileSearch className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div id="detections-view" className="space-y-6 max-w-6xl mx-auto font-sans pb-12">
      {/* Header Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-1">
          <div className="text-xs text-slate-500 font-semibold uppercase">Total Detections</div>
          <div className="text-xl font-black text-slate-900 font-mono">{counters.totalDetections}</div>
          <div className="text-[11px] text-slate-400">Indexed In Database</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-1">
          <div className="text-xs text-slate-500 font-semibold uppercase">ANPR Plates</div>
          <div className="text-xl font-black text-emerald-700 font-mono">{counters.anprPlates}</div>
          <div className="text-[11px] text-slate-400">HSRP Segmented</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-1">
          <div className="text-xs text-slate-500 font-semibold uppercase">Ambulance Triggers</div>
          <div className="text-xl font-black text-rose-600 font-mono">{counters.ambulanceTriggers}</div>
          <div className="text-[11px] text-slate-400">Emergency Corridors</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-1">
          <div className="text-xs text-slate-500 font-semibold uppercase">Vehicles Classified</div>
          <div className="text-xl font-black text-slate-900 font-mono">{counters.vehiclesClassified}</div>
          <div className="text-[11px] text-slate-400">YOLO Tracked</div>
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
              placeholder="Search detected object, plate, source..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 scrollbar-none">
            {['ALL', 'ANPR', 'AMBULANCE', 'VEHICLE', 'FACE'].map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTypeFilter(t);
                  setPage(1);
                }}
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

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Snapshot</th>
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
                  <td colSpan={6} className="text-center py-12 text-slate-400 text-xs">
                    No detections recorded yet.
                  </td>
                </tr>
              ) : (
                detections.map((d, i) => {
                  const imgUrl = d.imageUrl || (d.id ? `/api/detections/${d.id}/image` : null);
                  return (
                    <tr key={d.id || d._id || i} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2 px-3">
                        {imgUrl ? (
                          <div
                            onClick={() => setSelectedImage(imgUrl)}
                            className="w-10 h-8 rounded-lg overflow-hidden bg-slate-900 border border-slate-200 cursor-pointer flex items-center justify-center group relative"
                            title="Click to view full snapshot"
                          >
                            <img
                              src={imgUrl}
                              alt="Detection snapshot"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition">
                              <ImageIcon className="w-3.5 h-3.5" />
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400">N/A</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          {getIcon(d.type)}
                          <span className="font-bold text-slate-900 uppercase text-[11px]">{d.type}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-800">
                        {d.detectionInfo || d.plate || d.result || d.type}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-emerald-700">
                        {d.confidence != null ? `${Math.round(d.confidence * 100)}%` : '92%'}
                      </td>
                      <td className="py-3 px-3 text-slate-500 text-[11px]">
                        {d.source || 'CAMERA-01'}
                      </td>
                      <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                        {d.timestamp ? new Date(d.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString()}
                      </td>
                    </tr>
                  );
                })
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

      {/* Full Image Snapshot Preview Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 max-w-lg w-full space-y-3 shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold text-slate-900">AWS S3 Detection Snapshot</span>
              <button
                onClick={() => setSelectedImage(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="relative aspect-video w-full rounded-xl bg-slate-950 overflow-hidden flex items-center justify-center">
              <img src={selectedImage} alt="Full snapshot preview" className="w-full h-full object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
