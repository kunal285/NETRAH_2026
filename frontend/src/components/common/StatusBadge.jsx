"use client";

import React from 'react';

export const StatusBadge = ({ label, variant = 'slate', pulse = false }) => {
  const styles = {
    green: 'bg-emerald-950/80 text-emerald-300 border-emerald-800 shadow-emerald-950/50',
    blue: 'bg-sky-950/80 text-sky-300 border-sky-800 shadow-sky-950/50',
    amber: 'bg-amber-950/80 text-amber-300 border-amber-800 shadow-amber-950/50',
    red: 'bg-rose-950/80 text-rose-300 border-rose-800 shadow-rose-950/50',
    purple: 'bg-indigo-950/80 text-indigo-300 border-indigo-800 shadow-indigo-950/50',
    slate: 'bg-slate-900 text-slate-300 border-slate-700 shadow-slate-950/50',
  };

  const dots = {
    green: 'bg-emerald-400',
    blue: 'bg-sky-400',
    amber: 'bg-amber-400',
    red: 'bg-rose-400',
    purple: 'bg-indigo-400',
    slate: 'bg-slate-400',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase border shadow-sm font-mono whitespace-nowrap ${
        styles[variant] || styles.slate
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${dots[variant] || dots.slate} ${
          pulse ? 'animate-ping' : ''
        }`}
      />
      {label}
    </span>
  );
};
