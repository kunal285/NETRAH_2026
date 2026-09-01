"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useRobot } from '../../context/RobotContext';
import {
  Sparkles,
  Send,
  ShieldAlert,
  AlertCircle,
  Clock,
  Zap,
  Activity,
  Car,
  Siren,
  FileSearch,
  CheckCircle2,
  RefreshCw,
  Cpu,
  Bot,
  MessageSquareText,
} from 'lucide-react';

export const AiAssistantPanel = () => {
  const {
    aiStatus,
    latestAiIncident,
    aiAssistantMessages,
    isAiResponding,
    sendAiChatMessage,
    requestAiIncidentSummary,
    counters,
    activeAmbulance,
  } = useRobot();

  const [inputMessage, setInputMessage] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const chatBottomRef = useRef(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiAssistantMessages, isAiResponding]);

  const handleSend = (e) => {
    e?.preventDefault();
    if (!inputMessage.trim() || isAiResponding) return;
    const msg = inputMessage;
    setInputMessage('');
    sendAiChatMessage(msg);
  };

  const handleQuickPrompt = (promptText) => {
    if (isAiResponding) return;
    sendAiChatMessage(promptText);
  };

  const handleSummarizeNow = async () => {
    setIsSummarizing(true);
    try {
      await requestAiIncidentSummary(5);
    } finally {
      setIsSummarizing(false);
    }
  };

  const quickPrompts = [
    { label: '🚑 Ambulance Alert?', text: 'Was an ambulance detected recently in the corridor?' },
    { label: '🚗 Traffic Summary', text: 'Summarize the current traffic density and vehicle flow.' },
    { label: '🔋 Hardware Health', text: 'Analyze current robot battery voltage and motor conditions.' },
    { label: '⚠️ Safety Concerns?', text: 'Are there any urgent safety hazards or obstacle concerns?' },
    { label: '🔠 Explain ANPR', text: 'Explain the latest number plate observation and state code.' },
  ];

  const severityStyles = {
    critical: 'bg-rose-50 text-rose-800 border-rose-200 ring-rose-500/20',
    high: 'bg-amber-50 text-amber-900 border-amber-200 ring-amber-500/20',
    medium: 'bg-sky-50 text-sky-800 border-sky-200 ring-sky-500/20',
    low: 'bg-emerald-50 text-emerald-800 border-emerald-200 ring-emerald-500/20',
  };

  const severityBadge = {
    critical: 'bg-rose-600 text-white',
    high: 'bg-amber-600 text-white',
    medium: 'bg-sky-600 text-white',
    low: 'bg-emerald-600 text-white',
  };

  const severity = (latestAiIncident?.severity || 'low').toLowerCase();

  return (
    <div id="ai-assistant-panel" className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden font-sans">
      {/* 1. Header with Model & Status Badge */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-4 sm:p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 flex items-center justify-center shadow-xs">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black tracking-tight">PRAHARI AI INTELLIGENCE</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 border border-emerald-400/40 text-emerald-300">
                GOOGLE GEMINI
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Live Reasoning • Structured Incident Intelligence • Multi-Event Analysis
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/10 text-[11px] font-mono text-emerald-300 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>{aiStatus?.geminiModel || 'gemini-2.5-flash'}</span>
            <span className="text-white/40">•</span>
            <span>{aiStatus?.latencyMs ? `${aiStatus.latencyMs}ms` : '<20ms'}</span>
          </div>

          <button
            onClick={handleSummarizeNow}
            disabled={isSummarizing}
            title="Summarize Last 5 Minutes"
            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSummarizing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">5m Summary</span>
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {/* 2. Structured Real-Time Incident Card */}
        {latestAiIncident && (
          <div className={`p-4 rounded-xl border ${severityStyles[severity] || severityStyles.low} transition-all`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-black/5">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${severityBadge[severity] || severityBadge.low}`}>
                  {severity} SEVERITY
                </span>
                <span className="text-xs font-bold text-slate-800 uppercase tracking-tight">
                  {latestAiIncident.event_type?.replace(/_/g, ' ') || 'SYSTEM OBSERVATION'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {latestAiIncident.timestamp
                    ? new Date(latestAiIncident.timestamp).toLocaleTimeString()
                    : 'Just now'}
                </span>
                <span>•</span>
                <span className="font-mono">
                  Confidence: {Math.round((latestAiIncident.confidence || 0.9) * 100)}%
                </span>
              </div>
            </div>

            <div className="pt-2.5 space-y-2">
              <div className="text-sm font-semibold text-slate-900 leading-snug">
                {latestAiIncident.summary}
              </div>

              {latestAiIncident.recommended_action && (
                <div className="flex items-start gap-2 text-xs bg-white/80 p-2.5 rounded-lg border border-black/5 text-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold text-slate-900">Recommended Action:</strong>{' '}
                    {latestAiIncident.recommended_action}
                  </div>
                </div>
              )}

              {latestAiIncident.reasoning_summary && (
                <div className="text-[11px] text-slate-600 italic">
                  <strong>Reasoning:</strong> {latestAiIncident.reasoning_summary}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. Interactive Operator Chat Assistant */}
        <div className="border border-slate-200 rounded-xl bg-slate-50/70 overflow-hidden flex flex-col h-[280px]">
          <div className="px-3.5 py-2 bg-slate-100/90 border-b border-slate-200 text-[11px] font-bold text-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5 text-emerald-600" />
              <span>COMMAND CONSOLE ASSISTANT</span>
            </div>
            <span className="text-[10px] text-slate-500">Grounded in live telemetry</span>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2.5 text-xs">
            {aiAssistantMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role !== 'user' && (
                  <div className="w-6 h-6 rounded-md bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-black shadow-2xs">
                    AI
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-xl px-3.5 py-2 shadow-2xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-slate-900 text-white font-medium'
                      : 'bg-white border border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  <div className="text-[9px] mt-1 opacity-60 text-right">{msg.timestamp}</div>
                </div>
              </div>
            ))}

            {isAiResponding && (
              <div className="flex gap-2.5 items-center text-slate-500 text-xs italic">
                <div className="w-6 h-6 rounded-md bg-emerald-600 text-white flex items-center justify-center shrink-0 text-[10px] font-black">
                  AI
                </div>
                <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
                  <span>PRAHARI AI is analyzing live telemetry...</span>
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Prompt Chips */}
          <div className="px-2.5 py-1.5 bg-white border-t border-slate-200 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {quickPrompts.map((qp, idx) => (
              <button
                key={idx}
                onClick={() => handleQuickPrompt(qp.text)}
                disabled={isAiResponding}
                className="whitespace-nowrap text-[10px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200 border border-slate-200 text-slate-700 transition cursor-pointer disabled:opacity-50"
              >
                {qp.label}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <form onSubmit={handleSend} className="p-2 bg-white border-t border-slate-200 flex items-center gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask PRAHARI AI (e.g. 'Was an ambulance detected?')..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 transition"
              disabled={isAiResponding}
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isAiResponding}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ask</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
