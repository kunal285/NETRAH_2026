"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRobot } from '../../context/RobotContext';
import {
  Volume2,
  VolumeX,
  Radio,
  Sparkles,
  Play,
  Square,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../../lib/api.js';

export const AudioSirenDetector = () => {
  const { audioSirenState, setAudioSirenState } = useRobot();
  const [isListening, setIsListening] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSimulated, setIsSimulated] = useState(false);
  const [peakFreq, setPeakFreq] = useState(0);
  const [sirenConfidence, setSirenConfidence] = useState(0);

  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const animFrameRef = useRef(null);
  const streamRef = useRef(null);

  const startAcousticListener = async () => {
    setErrorMessage('');
    setIsSimulated(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceRef.current = source;

      setIsListening(true);
      if (setAudioSirenState) {
        setAudioSirenState({ active: true, sirenDetected: false, confidence: 0, peakFrequency: 0 });
      }

      startWaveformRender();
    } catch (err) {
      setErrorMessage('Microphone unavailable or permission denied. Connect an audio input to detect live siren harmonics.');
      setIsListening(false);
      if (setAudioSirenState) {
        setAudioSirenState({ active: false, sirenDetected: false, confidence: 0, peakFrequency: 0 });
      }
    }
  };

  const stopAcousticListener = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setIsListening(false);
    setIsSimulated(false);
    if (setAudioSirenState) {
      setAudioSirenState({ active: false, sirenDetected: false, confidence: 0, peakFrequency: 0 });
    }
  };

  const startWaveformRender = () => {
    const canvas = canvasRef.current;
    if (!canvas || !analyserRef.current) return;

    const ctx = canvas.getContext('2d');
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const sampleRate = audioContextRef.current?.sampleRate || 44100;

    let tick = 0;

    const renderFrame = () => {
      animFrameRef.current = requestAnimationFrame(renderFrame);
      analyser.getByteFrequencyData(dataArray);

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Background subtle grid
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      // Find peak frequency
      let maxVal = 0;
      let maxIndex = 0;
      for (let i = 0; i < bufferLength; i++) {
        if (dataArray[i] > maxVal) {
          maxVal = dataArray[i];
          maxIndex = i;
        }
      }

      const dominantHz = Math.round((maxIndex * (sampleRate / 2)) / bufferLength);
      setPeakFreq(dominantHz);

      // Check siren band (650Hz to 1600Hz)
      const isSirenHarmonic = dominantHz >= 650 && dominantHz <= 1600 && maxVal > 120;
      const conf = isSirenHarmonic ? Math.min(0.98, 0.70 + (maxVal / 255) * 0.28) : 0;
      setSirenConfidence(conf);

      // Draw Bars
      const barWidth = (width / bufferLength) * 3;
      let x = 0;

      for (let i = 0; i < bufferLength / 3; i++) {
        const barHeight = (dataArray[i] / 255) * height;
        const currentFreq = Math.round((i * (sampleRate / 2)) / bufferLength);

        if (currentFreq >= 650 && currentFreq <= 1600 && isSirenHarmonic) {
          ctx.fillStyle = '#ef4444';
        } else {
          ctx.fillStyle = '#10b981';
        }

        ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);
        x += barWidth;
      }

      tick++;
      if (tick % 30 === 0 && setAudioSirenState) {
        setAudioSirenState({
          active: true,
          sirenDetected: isSirenHarmonic,
          confidence: conf,
          peakFrequency: dominantHz,
        });
      }
    };

    renderFrame();
  };

  useEffect(() => {
    return () => stopAcousticListener();
  }, []);

  return (
    <div
      id="audio-siren-detector"
      className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4 font-sans"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <Volume2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              REAL-TIME ACOUSTIC SIREN SPECTRUM DETECTOR
            </div>
            <p className="text-[11px] text-slate-500">
              WebAudio FFT Analyzer • 650Hz–1,600Hz Indian Emergency Vehicle Siren Signature
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isListening ? (
            <button
              id="btn-stop-audio-listener"
              onClick={stopAcousticListener}
              className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
            >
              <Square className="w-3.5 h-3.5" />
              <span>Mute Mic</span>
            </button>
          ) : (
            <button
              id="btn-start-audio-listener"
              onClick={startAcousticListener}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Enable Microphone</span>
            </button>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}


      {/* FFT Spectrum Waveform Visualizer */}
      <div className="relative w-full h-24 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center">
        <canvas ref={canvasRef} width={600} height={96} className="w-full h-full object-cover" />
        {!isListening && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400 bg-slate-50/90 font-medium">
            Microphone Standby • Click &ldquo;Enable Microphone&rdquo; to analyze live acoustics
          </div>
        )}
      </div>

      {/* Frequency & Harmonic Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="text-[10px] text-slate-500 font-semibold">PEAK FREQUENCY</div>
          <div className="text-base font-black text-slate-900 font-mono">{peakFreq} Hz</div>
        </div>
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="text-[10px] text-slate-500 font-semibold">SIREN HARMONIC</div>
          <div className={`text-base font-black ${sirenConfidence > 0.5 ? 'text-rose-700' : 'text-emerald-700'}`}>
            {sirenConfidence > 0.5 ? 'LOCK DETECTED' : 'CLEAR'}
          </div>
        </div>
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="text-[10px] text-slate-500 font-semibold">CONFIDENCE SCORE</div>
          <div className="text-base font-black text-slate-900 font-mono">
            {Math.round(sirenConfidence * 100)}%
          </div>
        </div>
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="text-[10px] text-slate-500 font-semibold">TARGET FREQUENCY BAND</div>
          <div className="text-xs font-bold text-slate-700 mt-1">650 – 1600 Hz</div>
        </div>
      </div>
    </div>
  );
};
