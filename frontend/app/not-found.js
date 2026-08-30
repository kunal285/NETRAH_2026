"use client";

import Link from 'next/link';
import { AlertTriangle, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
        <AlertTriangle className="w-8 h-8" />
      </div>
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-white uppercase tracking-wider">404 - Module Not Found</h1>
        <p className="text-xs text-slate-400 max-w-md">
          The requested PRAHARI navigation module or endpoint does not exist.
        </p>
      </div>
      <Link
        href="/"
        className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-2 transition"
      >
        <Home className="w-4 h-4" />
        Return to Command Console
      </Link>
    </div>
  );
}
