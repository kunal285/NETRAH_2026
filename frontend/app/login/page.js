"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-sky-950/30">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/10 border border-sky-500/40 text-2xl font-black text-sky-400">
            P
          </div>
          <div className="text-2xl font-black tracking-wider text-white">PRAHARI</div>
          <div className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">Command Center</div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none ring-0 placeholder:text-slate-500 focus:border-sky-500"
              placeholder="admin@prahari.local"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-500"
              placeholder="••••••••"
            />
          </div>

          {error && <div className="rounded-lg border border-rose-700 bg-rose-950/40 px-3 py-2 text-xs text-rose-300">{error}</div>}

          <button
            type="submit"
            className="w-full rounded-xl bg-sky-600 px-4 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-sky-500"
          >
            Login
          </button>
        </form>

        <div className="mt-4 text-center text-[11px] text-slate-400">
          Demo access: <span className="font-bold text-slate-300">admin@prahari.local</span> / <span className="font-bold text-slate-300">admin123</span>
        </div>
      </div>
    </div>
  );
}
