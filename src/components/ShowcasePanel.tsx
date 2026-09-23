import React, { useState, useEffect } from 'react';
import { TridentLogo } from './TridentLogo';
import { Sparkles, ShieldCheck, Zap, Code2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const FEATURES = [
  {
    icon: Sparkles,
    title: "Neural Reasoner v4.0",
    description: "Multi-modal AI models engineered for complex problem solving, deep code synthesis, and language translation."
  },
  {
    icon: Code2,
    title: "Autonomous Code Studio",
    description: "Build, refactor, and audit production-ready fullstack web applications with high precision."
  },
  {
    icon: Zap,
    title: "Real-time AI Workflows",
    description: "Streamlined agentic pipelines delivering sub-50ms token output with zero latency overhead."
  },
  {
    icon: ShieldCheck,
    title: "Enterprise Grade Security",
    description: "End-to-end encrypted AI memory, isolated sandboxes, and SOC2-certified data privacy."
  }
];

export const ShowcasePanel: React.FC = () => {
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % FEATURES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const ActiveIcon = FEATURES[activeFeature].icon;

  return (
    <div className="relative hidden lg:flex flex-col justify-between p-10 overflow-hidden bg-gradient-to-br from-[#1c0812] via-[#120a1c] to-[#0a0714] border-r border-rose-900/20">
      {/* Background grid and ambient glows */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:2rem_2rem] pointer-events-none" />
      <div className="absolute -top-20 -left-20 w-80 h-80 bg-rose-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-rose-900/30 rounded-full blur-3xl pointer-events-none" />

      {/* Header Branding */}
      <div className="relative z-10">
        <TridentLogo size={52} />
        <p className="mt-4 text-xs font-semibold tracking-wider text-rose-300/60 uppercase">
          Empowering Next-Gen AI Engineers & Creators
        </p>
      </div>

      {/* Center Dynamic Feature Showcase */}
      <div className="relative z-10 my-auto py-8">
        <div className="p-6 rounded-2xl glass-panel border border-rose-500/20 shadow-2xl relative">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
              Live Feature Showcase
            </span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeFeature}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35 }}
              className="space-y-3"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-rose-700 flex items-center justify-center text-white shadow-lg shadow-rose-900/40">
                <ActiveIcon className="w-6 h-6" />
              </div>
              
              <h3 className="text-xl font-bold text-white font-['Outfit']">
                {FEATURES[activeFeature].title}
              </h3>
              
              <p className="text-sm text-slate-300 leading-relaxed">
                {FEATURES[activeFeature].description}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Slider indicators */}
          <div className="flex items-center gap-2 mt-6 pt-4 border-t border-rose-900/30">
            {FEATURES.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveFeature(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  activeFeature === idx ? 'w-8 bg-rose-500 shadow-glow-sm' : 'w-2 bg-slate-700 hover:bg-slate-600'
                }`}
                aria-label={`Show feature ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Feature bullet checklist */}
        <div className="mt-6 grid grid-cols-2 gap-3 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>50+ Prebuilt AI Agents</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>Python & TS SDKs</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>Instant Model Switching</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>99.99% Uptime SLA</span>
          </div>
        </div>
      </div>
    </div>
  );
};
