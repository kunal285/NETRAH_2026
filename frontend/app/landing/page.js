"use client";

import Link from 'next/link';
import { ArrowRight, Bot, ShieldCheck, Zap, Activity } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-emerald-600 selection:text-white">
      {/* Top Navigation */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-30">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 font-extrabold text-white text-lg shadow-xs">
              P
            </div>
            <div>
              <div className="text-lg font-extrabold text-slate-900 tracking-tight">PRAHARI</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                AI Robotics Command Center
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Sign In
            </Link>
            <Link
              href="/"
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 active:bg-emerald-800 transition shadow-xs"
            >
              Open Console
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-6 py-20 lg:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-semibold text-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-600 animate-ping" />
              <span>Autonomous Robotics & Edge AI</span>
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl leading-[1.15]">
              Real-time traffic safety & robotic command.
            </h1>

            <p className="text-base text-slate-600 leading-relaxed max-w-xl sm:text-lg">
              Monitor multi-lane vehicle tracking, Indian HSRP license plate segmentation, 36V powertrain telemetry, and acoustic emergency green corridor preemption.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-700 active:bg-emerald-800 transition shadow-xs"
              >
                <span>Launch Command Center</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Operator Login
              </Link>
            </div>
          </div>

          {/* Right Product Card */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">PRAHARI-MK1 PLATFORM</div>
                  <div className="text-[11px] text-slate-400">Autonomous Edge Node</div>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                SYSTEM ONLINE
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 font-mono">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Battery (36V)</div>
                <div className="text-lg font-black text-emerald-700">37.8 V (92%)</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Radar Status</div>
                <div className="text-lg font-black text-slate-900">2.85 m (SAFE)</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="text-[10px] text-slate-400 font-bold uppercase">AI Inference</div>
                <div className="text-lg font-black text-slate-900">YOLOv8 + OCR</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Corridor Mode</div>
                <div className="text-lg font-black text-emerald-700">ARMED / READY</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
