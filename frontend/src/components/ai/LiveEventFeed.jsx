"use client";

import React, { useState } from 'react';
import { useRobot } from '../../context/RobotContext';
import {
  Activity,
  FileText,
  Siren,
  Car,
  UserCheck,
  AlertTriangle,
  Trash2,
  X,
  Image as ImageIcon,
} from 'lucide-react';

export const LiveEventFeed = () => {
  const { liveEvents, clearAiEvents } = useRobot();
  const [filterType, setFilterType] = useState('ALL');
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);

  const filterOptions = ['ALL', 'ANPR', 'AMBULANCE', 'VEHICLES', 'SAFETY'];

  const filteredEvents = liveEvents.filter((evt) => {
    const t = String(evt.type || '').toUpperCase();
    if (filterType === 'ALL') return true;
    if (filterType === 'ANPR') return t.includes('ANPR') || t.includes('PLATE');
    if (filterType === 'AMBULANCE') return t.includes('AMBULANCE') || t.includes('EMERGENCY');
    if (filterType === 'VEHICLES') return t.includes('VEHICLE') || t.includes('CAR');
    if (filterType === 'SAFETY') return t.includes('RISK') || t.includes('CROSSWALK');
    return true;
  });

  const getEventIcon = (type = '') => {
    const t = String(type).toUpperCase();
    if (t.includes('AMBULANCE') || t.includes('EMERGENCY')) {
      return <Siren className="w-4 h-4 text-rose-600" />;
    }
    if (t.includes('PLATE') || t.includes('ANPR')) {
      return <FileText className="w-4 h-4 text-emerald-600" />;
    }
    if (t.includes('FACE') || t.includes('PERSON')) {
      return <UserCheck className="w-4 h-4 text-purple-600" />;
    }
    if (t.includes('RISK')) {
      return <AlertTriangle className="w-4 h-4 text-amber-600" />;
    }
    return <Car className="w-4 h-4 text-slate-600" />;
  };

  return (
    <div
      id="live-event-feed"
      className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col h-full font-sans space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            LIVE DETECTION FEED
          </span>
        </div>

        <button
          id="btn-clear-feed"
          onClick={() => clearAiEvents()}
          className="p-1.5 rounded-lg bg-slate-50 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          title="Clear Event Feed & S3 Snapshots"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
        {filterOptions.map((opt) => (
          <button
            key={opt}
            onClick={() => setFilterType(opt)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold uppercase transition whitespace-nowrap cursor-pointer ${
              filterType === opt
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>

      {/* Event Stream List */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[520px]">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            No live events recorded yet. Waiting for AI detections...
          </div>
        ) : (
          filteredEvents.map((evt, idx) => {
            const timeStr = evt.timestamp
              ? new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
              : 'Just now';
            const type = String(evt.type || 'VEHICLE').toUpperCase();
            const isEmergency = type.includes('AMBULANCE');
            const isPlate = type.includes('ANPR') || type.includes('PLATE');
            const info = evt.detectionInfo || evt.plate || evt.result || type;
            const imgUrl = evt.imageUrl || (evt.id ? `/api/detections/${evt.id}/image` : null);

            return (
              <div
                key={evt.id || evt.eventId || `evt-${idx}`}
                className={`p-3 rounded-xl border text-xs transition flex items-center justify-between gap-2.5 hover:shadow-xs ${
                  isEmergency
                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                    : isPlate
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Thumbnail */}
                  {imgUrl ? (
                    <div
                      onClick={() => setSelectedSnapshot(imgUrl)}
                      className="w-10 h-8 rounded-lg overflow-hidden bg-slate-900 border border-slate-300 shrink-0 cursor-pointer flex items-center justify-center group relative"
                      title="View S3 Snapshot"
                    >
                      <img
                        src={imgUrl}
                        alt="Detection preview"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition">
                        <ImageIcon className="w-3 h-3" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center shrink-0">
                      {getEventIcon(type)}
                    </div>
                  )}

                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 truncate text-[11px]">
                      <span className="uppercase font-black text-slate-700 tracking-wider text-[10px]">{type}:</span>
                      <span>{info}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">
                      Source: <strong className="text-slate-700">{evt.source || 'CAMERA-01'}</strong>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 space-y-0.5 font-mono">
                  <div className="text-[10px] text-slate-400">{timeStr}</div>
                  <div className="text-[10px] font-bold text-emerald-700">
                    {evt.confidence != null ? `${Math.round(evt.confidence * 100)}%` : '94%'}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Snapshot Preview Modal */}
      {selectedSnapshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 max-w-md w-full space-y-3 shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold text-slate-900">Live Detection Snapshot (AWS S3)</span>
              <button onClick={() => setSelectedSnapshot(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="relative aspect-video w-full rounded-xl bg-slate-950 overflow-hidden flex items-center justify-center">
              <img src={selectedSnapshot} alt="Snapshot preview" className="w-full h-full object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
