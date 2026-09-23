import React from 'react';
import { Check, X } from 'lucide-react';

interface PasswordStrengthProps {
  password: string;
}

export const PasswordStrength: React.FC<PasswordStrengthProps> = ({ password }) => {
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const passedCount = [hasMinLength, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;

  const getStrengthInfo = () => {
    if (!password) return { label: 'Empty', color: 'bg-slate-700', text: 'text-slate-400', percentage: 0 };
    if (passedCount === 1) return { label: 'Weak', color: 'bg-rose-500', text: 'text-rose-400', percentage: 25 };
    if (passedCount === 2) return { label: 'Fair', color: 'bg-amber-500', text: 'text-amber-400', percentage: 50 };
    if (passedCount === 3) return { label: 'Good', color: 'bg-emerald-500', text: 'text-emerald-400', percentage: 75 };
    return { label: 'Strong', color: 'bg-rose-400', text: 'text-rose-300', percentage: 100 };
  };

  const strength = getStrengthInfo();

  if (!password) return null;

  return (
    <div className="mt-2 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2 text-xs">
      <div className="flex items-center justify-between">
        <span className="text-slate-400 font-medium">Password Strength:</span>
        <span className={`font-bold uppercase tracking-wider ${strength.text}`}>
          {strength.label}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-300 ${strength.color}`} 
          style={{ width: `${strength.percentage}%` }}
        />
      </div>

      {/* Requirement List */}
      <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
        <div className={`flex items-center gap-1 ${hasMinLength ? 'text-emerald-400' : 'text-slate-500'}`}>
          {hasMinLength ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
          <span>8+ Characters</span>
        </div>

        <div className={`flex items-center gap-1 ${hasUpper ? 'text-emerald-400' : 'text-slate-500'}`}>
          {hasUpper ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
          <span>Uppercase Letter</span>
        </div>

        <div className={`flex items-center gap-1 ${hasNumber ? 'text-emerald-400' : 'text-slate-500'}`}>
          {hasNumber ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
          <span>Number</span>
        </div>

        <div className={`flex items-center gap-1 ${hasSpecial ? 'text-emerald-400' : 'text-slate-500'}`}>
          {hasSpecial ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
          <span>Special Symbol</span>
        </div>
      </div>
    </div>
  );
};
