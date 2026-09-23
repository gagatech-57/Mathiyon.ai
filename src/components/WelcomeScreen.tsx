import React from 'react';
import { TridentLogo } from './TridentLogo';
import { Code, Cpu, ShieldCheck, FileText, ArrowUpRight } from 'lucide-react';

interface WelcomeScreenProps {
  userName: string;
  onSelectPrompt: (promptText: string) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ userName, onSelectPrompt }) => {
  const starterPrompts = [
    {
      title: "Build React Component",
      subtitle: "Create a glassmorphism React card component with Tailwind",
      icon: Code,
      prompt: "Create a glassmorphism React card component with Tailwind CSS and subtle glow animation.",
      category: "Frontend Dev"
    },
    {
      title: "Express JWT Middleware",
      subtitle: "Generate Node.js Express authentication controller & JWT protect middleware",
      icon: ShieldCheck,
      prompt: "Write a complete Express.js route handler and JWT middleware for secure user auth.",
      category: "Backend API"
    },
    {
      title: "PyTorch Neural Model",
      subtitle: "Explain PyTorch multi-head attention layer & forward pass",
      icon: Cpu,
      prompt: "Explain PyTorch transformer architecture and write a sample module code.",
      category: "AI / ML"
    },
    {
      title: "Analyze & Summarize",
      subtitle: "Structure research notes, code docs, and project architecture",
      icon: FileText,
      prompt: "Summarize project architecture and outline key implementation steps.",
      category: "Productivity"
    }
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-8 px-4 max-w-3xl mx-auto w-full text-center my-auto">
      {/* Central Logo & Brand Header */}
      <div className="mb-6 flex flex-col items-center">
        <div className="p-4 rounded-3xl bg-gradient-to-tr from-rose-900/40 via-rose-600/20 to-transparent border border-rose-500/30 shadow-2xl mb-4 backdrop-blur-xl animate-in zoom-in-95 duration-300">
          <TridentLogo size={64} showText={false} />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-['Outfit']">
          MATHIYON AI
        </h1>
        <p className="mt-1 text-sm font-semibold tracking-widest text-rose-300 uppercase font-['Outfit']">
          மதியோன் AI • Intelligence Platform
        </p>
      </div>

      {/* Greeting */}
      <div className="mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-100">
          Welcome back, <span className="mathiyon-gradient-text">{userName}</span>!
        </h2>
        <p className="mt-1.5 text-xs sm:text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
          How can Mathiyon assist your development and neural reasoning today? Select a prompt below or start typing.
        </p>
      </div>

      {/* Interactive Starter Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full text-left">
        {starterPrompts.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              onClick={() => onSelectPrompt(item.prompt)}
              className="group p-4 rounded-2xl glass-panel hover:bg-rose-500/10 hover:border-rose-500/40 transition-all duration-200 cursor-pointer flex flex-col justify-between border border-rose-500/15 text-left shadow-lg hover:shadow-rose-950/30 hover:-translate-y-0.5"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/25 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 uppercase tracking-wider">
                    {item.category}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-200 group-hover:text-rose-300 transition-colors">
                  {item.title}
                </h3>
                <p className="mt-1 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {item.subtitle}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-semibold text-rose-400 opacity-80 group-hover:opacity-100">
                <span>Start conversation</span>
                <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
