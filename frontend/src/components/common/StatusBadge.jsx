"use client";

import React from 'react';

export const StatusBadge = ({ label, variant = 'slate', pulse = false }) => {
  const styles = {
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-xs',
    blue: 'bg-sky-50 text-sky-700 border-sky-200 shadow-xs',
    amber: 'bg-amber-50 text-amber-800 border-amber-200 shadow-xs',
    red: 'bg-rose-50 text-rose-700 border-rose-200 shadow-xs',
    purple: 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-xs',
    slate: 'bg-slate-100 text-slate-700 border-slate-200 shadow-xs',
  };

  const dots = {
    green: 'bg-emerald-600',
    blue: 'bg-sky-600',
    amber: 'bg-amber-600',
    red: 'bg-rose-600',
    purple: 'bg-indigo-600',
    slate: 'bg-slate-500',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase border whitespace-nowrap ${
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
