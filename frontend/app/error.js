"use client";

import { useEffect } from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error('App Router Boundary Caught Error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 animate-pulse">
        <AlertOctagon className="w-8 h-8" />
      </div>
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-rose-300 uppercase tracking-wider">System Runtime Error</h1>
        <p className="text-xs text-slate-400 max-w-md">
          {error?.message || 'An unexpected runtime fault occurred in the command console.'}
        </p>
      </div>
      <button
        onClick={() => reset()}
        className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer"
      >
        <RotateCcw className="w-4 h-4" />
        Attempt Component Recovery
      </button>
    </div>
  );
}
