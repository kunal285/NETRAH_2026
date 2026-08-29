"use client";

import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertTriangle, Image as ImageIcon } from 'lucide-react';

export const SecureImage = ({ imageId, className, alt = "Evidence Image" }) => {
  const [url, setUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPresignedUrl = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/storage/image/${imageId}`);
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('Unauthorized access');
        }
        throw new Error('Image unavailable');
      }
      const data = await response.json();
      if (!data.url) {
        throw new Error('Image url not found');
      }
      setUrl(data.url);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (imageId) {
      fetchPresignedUrl();
    } else {
      setLoading(false);
      setError('No image ID provided');
    }
  }, [imageId]);

  if (loading) {
    return (
      <div className={`flex flex-col items-center justify-center bg-slate-100 border border-slate-200 rounded-xl p-6 text-slate-500 font-sans space-y-2 ${className}`}>
        <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
        <span className="text-xs font-semibold">Loading evidence...</span>
      </div>
    );
  }

  if (error) {
    const isExpired = error.toLowerCase().includes('expired') || error.toLowerCase().includes('session');
    return (
      <div className={`flex flex-col items-center justify-center bg-rose-50 border border-rose-100 rounded-xl p-6 text-rose-800 font-sans space-y-2 text-center ${className}`}>
        <AlertTriangle className="w-6 h-6 text-rose-600" />
        <span className="text-xs font-bold uppercase tracking-wider">
          {isExpired ? 'Session expired — refresh image' : 'Image unavailable'}
        </span>
        <button
          onClick={fetchPresignedUrl}
          className="px-3.5 py-1.5 rounded-lg bg-white border border-rose-300 hover:bg-rose-50 text-rose-700 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Refresh URL</span>
        </button>
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      className={className}
      onError={() => setError('Session expired — refresh image')}
    />
  );
};
