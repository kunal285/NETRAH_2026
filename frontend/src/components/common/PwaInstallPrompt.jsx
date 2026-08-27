"use client";

import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X } from 'lucide-react';

export const PwaInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
  };

  if (!showPrompt) return null;

  return (
    <div
      id="pwa-install-prompt"
      className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:bottom-6 z-40 max-w-sm bg-white border border-slate-200 rounded-2xl p-4 shadow-xl font-sans text-slate-900 flex items-center justify-between gap-3 animate-fade-in"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
          <Smartphone className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xs font-bold text-slate-900">Install PRAHARI App</div>
          <p className="text-[11px] text-slate-500">Add to home screen for field touch controls</p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          id="btn-install-pwa"
          onClick={handleInstall}
          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition shadow-xs"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install</span>
        </button>
        <button
          id="btn-close-pwa-prompt"
          onClick={() => setShowPrompt(false)}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
