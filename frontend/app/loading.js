import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 space-y-3">
      <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
      <div className="text-xs font-bold text-slate-300 tracking-wider">
        INITIALIZING PRAHARI TELEMETRY STREAM...
      </div>
    </div>
  );
}
