"use client";

import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-16">
        <div className="mb-10 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-500/40 bg-sky-500/10 text-2xl font-black text-sky-400">
            P
          </div>
          <div>
            <div className="text-xl font-black tracking-wider text-white">PRAHARI</div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-slate-400">Traffic Police Robot Command Center</div>
          </div>
        </div>

        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <div className="mb-4 inline-flex rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-sky-300">
              Autonomous Mission Control
            </div>
            <h1 className="max-w-xl text-4xl font-black leading-tight text-white md:text-6xl">
              Real-time road safety for your robot operations.
            </h1>
            <p className="mt-5 max-w-xl text-base text-slate-400 md:text-lg">
              Monitor robot telemetry, camera feeds, AI detections, alerts, battery health, and traffic events from one secure command dashboard.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login" className="rounded-xl bg-sky-600 px-6 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-sky-500">
                Login
              </Link>
              <Link href="/login" className="rounded-xl border border-slate-700 bg-slate-900 px-6 py-3 text-sm font-black uppercase tracking-wide text-slate-200 transition hover:border-slate-500">
                Access Console
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-sky-950/30">
            <div className="mb-5 flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Live System</div>
              <div className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold uppercase text-emerald-300">
                Online
              </div>
            </div>

            <div className="space-y-4">
              {[
                ['Robot Status', 'ONLINE'],
                ['Battery', '92%'],
                ['Camera Feed', 'ACTIVE'],
                ['AI Detection', 'LIVE'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5">
                  <span className="text-xs uppercase tracking-wide text-slate-400">{label}</span>
                  <span className="text-sm font-black text-white">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
