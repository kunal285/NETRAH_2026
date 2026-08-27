"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Bot, ShieldCheck } from 'lucide-react';

const AUTH_KEY = 'prahari-auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@prahari.local');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    if (email.includes('@') && password.length >= 4) {
      localStorage.setItem(AUTH_KEY, 'true');
      router.push('/');
      router.refresh();
      return;
    }

    setError('Invalid credentials.');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center px-4 font-sans selection:bg-emerald-600 selection:text-white">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 font-extrabold text-white text-xl shadow-xs">
            P
          </div>
          <div className="text-2xl font-extrabold tracking-tight text-slate-900">PRAHARI</div>
          <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
            AI Robotics Command Center
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700">Operator Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              placeholder="admin@prahari.local"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700">Access Key / Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              placeholder="••••••••"
            />
          </div>

          {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>}

          <button
            type="submit"
            className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 px-4 py-3 text-sm font-bold text-white transition shadow-xs cursor-pointer"
          >
            Authenticate & Access Console
          </button>
        </form>

        <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
          Demo access: <strong className="text-slate-800">admin@prahari.local</strong> / <strong className="text-slate-800">admin123</strong>
        </div>
      </div>
    </div>
  );
}
