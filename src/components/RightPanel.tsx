import React from 'react';
import { ShieldCheck, Cpu, Zap, Activity, X, Terminal, ChevronRight } from 'lucide-react';

interface RightPanelProps {
  isOpen: boolean;
  onClose: () => void;
  activeModel: string;
  onSelectPrompt: (promptText: string) => void;
}

export const RightPanel: React.FC<RightPanelProps> = ({
  isOpen,
  onClose,
  activeModel,
  onSelectPrompt,
}) => {
  if (!isOpen) return null;

  const quickTemplates = [
    { title: "Refactor to React Hooks", prompt: "Refactor this component code to use React 19 functional hooks." },
    { title: "JWT Auth Security Audit", prompt: "Check JWT authentication middleware for security vulnerabilities." },
    { title: "PyTorch Model Loss Optim", prompt: "Provide PyTorch model training loop with AdamW optimizer." },
  ];

  return (
    <aside className="w-80 h-full glass-panel bg-[#090715]/95 border-l border-rose-950/40 p-4 flex flex-col justify-between overflow-y-auto z-20 shrink-0 backdrop-blur-xl animate-in slide-in-from-right duration-250">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-rose-400" />
            <h3 className="font-bold text-sm text-white font-['Outfit']">Mathiyon AI Insights</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* System Health Status Card */}
        <div className="p-3.5 rounded-2xl glass-panel-subtle border border-rose-500/20 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200">System Status</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
              100% Operational
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-rose-400" /> Express API
              </span>
              <span className="font-mono text-emerald-400 text-[11px]">Port 5000</span>
            </div>

            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> MongoDB Database
              </span>
              <span className="font-mono text-emerald-400 text-[11px]">Connected</span>
            </div>

            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-rose-400" /> AI Neural Engine
              </span>
              <span className="font-mono text-rose-300 text-[11px] truncate max-w-[110px]">{activeModel}</span>
            </div>
          </div>
        </div>

        {/* Quick Action Templates */}
        <div>
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-rose-400" /> Quick Dev Templates
          </h4>
          <div className="space-y-2">
            {quickTemplates.map((item, idx) => (
              <button
                key={idx}
                onClick={() => onSelectPrompt(item.prompt)}
                className="w-full p-2.5 rounded-xl glass-panel-subtle hover:bg-rose-500/15 border border-slate-800 hover:border-rose-500/30 text-left transition-all cursor-pointer group flex items-center justify-between"
              >
                <span className="text-xs font-medium text-slate-300 group-hover:text-white truncate">
                  {item.title}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-rose-400 group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* Neural Reasoning Metrics */}
        <div className="p-3.5 rounded-2xl glass-panel-subtle border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300">Context Window</span>
            <span className="font-mono text-rose-400 text-[11px]">128k Tokens</span>
          </div>
          <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
            <div className="bg-gradient-to-r from-rose-600 to-rose-400 h-full w-[35%]" />
          </div>
          <p className="text-[10px] text-slate-400">High precision neural response graph enabled.</p>
        </div>
      </div>

      {/* Footer info */}
      <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
        <span>Mathiyon AI v4.0</span>
        <span className="font-mono">மதியோன் AI</span>
      </div>
    </aside>
  );
};
