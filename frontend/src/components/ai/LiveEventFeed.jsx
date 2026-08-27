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
} from 'lucide-react';

export const LiveEventFeed = () => {
  const { liveEvents, clearAiEvents } = useRobot();
  const [filterType, setFilterType] = useState('ALL');
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);

  const filterOptions = ['ALL', 'ANPR', 'EMERGENCY', 'VEHICLES', 'PEDESTRIANS', 'SAFETY'];

  const filteredEvents = liveEvents.filter((evt) => {
    if (filterType === 'ALL') return true;
    if (filterType === 'ANPR') return evt.type?.includes('PLATE');
    if (filterType === 'EMERGENCY') return evt.type?.includes('AMBULANCE') || evt.type?.includes('EMERGENCY') || evt.type?.includes('SIREN');
    if (filterType === 'VEHICLES') return evt.type?.includes('VEHICLE');
    if (filterType === 'PEDESTRIANS') return evt.type?.includes('PEDESTRIAN') || evt.type?.includes('WARDEN');
    if (filterType === 'SAFETY') return evt.type?.includes('RISK') || evt.type?.includes('CROSSWALK');
    return true;
  });

  const getEventIcon = (type = '') => {
    if (type.includes('AMBULANCE') || type.includes('SIREN')) {
      return <Siren className="w-4 h-4 text-rose-600" />;
    }
    if (type.includes('PLATE')) {
      return <FileText className="w-4 h-4 text-emerald-600" />;
    }
    if (type.includes('PEDESTRIAN') || type.includes('WARDEN')) {
      return <UserCheck className="w-4 h-4 text-purple-600" />;
    }
    if (type.includes('RISK')) {
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
          title="Clear Event Feed"
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
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[480px]">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            No live events recorded yet. Waiting for AI detections...
          </div>
        ) : (
          filteredEvents.map((evt) => {
            const timeStr = evt.timestamp
              ? new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
              : 'Just now';
            const isEmergency = evt.type?.includes('AMBULANCE');
            const isPlate = evt.type?.includes('PLATE');

            return (
              <div
                key={evt.eventId || Math.random()}
                className={`p-3 rounded-xl border text-xs transition flex items-start justify-between gap-2.5 ${
                  isEmergency
                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                    : isPlate
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="mt-0.5 shrink-0">{getEventIcon(evt.type)}</div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="font-bold text-slate-900 truncate text-[11px]">
                      {evt.metadata?.plateNumber ? `Plate: ${evt.metadata.plateNumber}` : evt.type?.replace(/_/g, ' ')}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {evt.metadata?.state || evt.metadata?.message || evt.objectClass || 'Perception Event'}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 space-y-0.5 font-mono">
                  <div className="text-[10px] text-slate-400">{timeStr}</div>
                  <div className="text-[10px] font-bold text-emerald-700">
                    {Math.round((evt.confidence || 0.9) * 100)}%
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Snapshot Preview Modal */}
      {selectedSnapshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 max-w-md w-full space-y-3 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">Event Snapshot</span>
              <button onClick={() => setSelectedSnapshot(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <img src={selectedSnapshot} alt="Snapshot" className="w-full rounded-xl border border-slate-200 object-cover" />
          </div>
        </div>
      )}
    </div>
  );
};
