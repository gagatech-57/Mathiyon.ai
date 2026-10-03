/**
 * Mathiyon AI — ThinkingIndicator
 *
 * Shows a subtle animated "Thinking..." state while the backend is processing.
 * Used as a placeholder assistant bubble before the real response arrives.
 * NEVER shows internal engine details, tool names, or model names.
 */
import React from 'react';
import { Bot } from 'lucide-react';

export const ThinkingIndicator: React.FC = () => {
  return (
    <div className="group flex gap-3 sm:gap-4 my-4 flex-row justify-start">
      {/* Avatar */}
      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-600 to-rose-950 flex items-center justify-center text-white shadow-md shadow-rose-950/40 border border-rose-500/30 shrink-0">
        <Bot className="w-4 h-4 text-rose-200" />
      </div>

      {/* Bubble */}
      <div className="flex flex-col max-w-[85%] sm:max-w-[75%] items-start">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1 px-1 text-[11px] text-slate-400 font-medium">
          <span className="font-semibold text-slate-300">Mathiyon AI</span>
        </div>

        {/* Thinking bubble */}
        <div className="px-4 py-3 rounded-2xl rounded-tl-xs glass-panel border border-rose-500/20 text-slate-400 text-xs sm:text-sm shadow-md flex items-center gap-2.5">
          <span className="font-medium text-slate-300">Thinking</span>
          {/* Three-dot pulse animation */}
          <span className="flex items-center gap-1" aria-label="Thinking">
            <span
              className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-bounce"
              style={{ animationDelay: '0ms', animationDuration: '900ms' }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-bounce"
              style={{ animationDelay: '180ms', animationDuration: '900ms' }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-bounce"
              style={{ animationDelay: '360ms', animationDuration: '900ms' }}
            />
          </span>
        </div>
      </div>
    </div>
  );
};
