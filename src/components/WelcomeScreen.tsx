import React from 'react';
import { MathiyonQuickTap } from './MathiyonQuickTap';

interface WelcomeScreenProps {
  userName: string;
  onSelectPrompt?: (promptText: string) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ userName }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-6 px-4 max-w-3xl mx-auto w-full text-center my-auto">
      {/* Central Logo & Brand Header */}
      <div className="mb-5 flex flex-col items-center">
        <div className="rounded-3xl shadow-2xl mb-4 backdrop-blur-xl animate-in zoom-in-95 duration-300 overflow-hidden">
          <img
            src="/mathiyon.png"
            alt="Mathiyon AI"
            className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-3xl shadow-lg"
          />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-['Outfit']">
          MATHIYON AI
        </h1>
        <p className="mt-1 text-xs sm:text-sm font-semibold tracking-widest text-rose-300 uppercase font-['Outfit']">
          மதியோன் AI • Intelligence Platform
        </p>
      </div>

      {/* Greeting */}
      <div className="mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-100">
          Welcome back, <span className="mathiyon-gradient-text">{userName}</span>!
        </h2>
        <p className="mt-1.5 text-xs sm:text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
          How can Mathiyon assist you today?
        </p>
      </div>

      {/* Mathiyon Quick Tap Mini Game */}
      <div className="w-full mb-2">
        <MathiyonQuickTap />
      </div>
    </div>
  );
};
