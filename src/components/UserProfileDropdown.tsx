import React, { useState, useRef, useEffect } from 'react';
import { User, LogOut, Settings, Sun, Moon, Shield, Sparkles, ChevronUp } from 'lucide-react';
import type { UserProfile } from '../api';

interface UserProfileDropdownProps {
  user: UserProfile;
  onSignOut: () => void;
  isDarkTheme: boolean;
  onToggleTheme: () => void;
}

export const UserProfileDropdown: React.FC<UserProfileDropdownProps> = ({
  user,
  onSignOut,
  isDarkTheme,
  onToggleTheme
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const userInitial = user.name ? user.name.charAt(0).toUpperCase() : 'U';

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-800/60 transition-all cursor-pointer group text-left border border-transparent hover:border-slate-800"
        aria-label="User profile menu"
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-rose-600 via-rose-700 to-rose-900 flex items-center justify-center font-bold text-white text-xs shadow-md shadow-rose-950/40 shrink-0">
          {userInitial}
        </div>
        <div className="hidden sm:block text-left pr-1">
          <p className="text-xs font-semibold text-slate-200 group-hover:text-rose-300 transition-colors leading-tight truncate max-w-[120px]">
            {user.name}
          </p>
          <span className="text-[10px] text-slate-400 font-mono block">Pro Plan</span>
        </div>
        <ChevronUp className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 bottom-full mb-2 sm:bottom-auto sm:top-full sm:mt-2 w-64 rounded-2xl glass-panel bg-[#0e0b1d]/95 backdrop-blur-xl border border-rose-500/20 shadow-2xl z-50 p-2 text-xs divide-y divide-slate-800/80 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* User Details Header */}
          <div className="p-3 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-rose-900 flex items-center justify-center font-bold text-white text-sm shadow-md">
                {userInitial}
              </div>
              <div className="overflow-hidden">
                <p className="font-bold text-slate-100 text-sm truncate">{user.name}</p>
                <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-semibold text-emerald-400">JWT Authenticated</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Menu Options */}
          <div className="py-2 space-y-0.5">
            <button
              onClick={() => {
                setIsOpen(false);
                alert(`Mathiyon AI Account Profile for ${user.email}`);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-rose-500/15 transition-colors cursor-pointer text-left"
            >
              <User className="w-4 h-4 text-rose-400" />
              <span>Account Profile</span>
            </button>

            <button
              onClick={onToggleTheme}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-rose-500/15 transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-2.5">
                {isDarkTheme ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
                <span>{isDarkTheme ? 'Light Mode' : 'Dark Mode'}</span>
              </div>
              <span className="text-[10px] uppercase font-bold text-slate-400 px-1.5 py-0.5 rounded bg-slate-800">
                {isDarkTheme ? 'Dark' : 'Light'}
              </span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                alert('Mathiyon AI Settings: Express API v1.0 • PyTorch Neural Engine Active');
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-rose-500/15 transition-colors cursor-pointer text-left"
            >
              <Settings className="w-4 h-4 text-rose-400" />
              <span>Preferences & Model Config</span>
            </button>
          </div>

          {/* System info */}
          <div className="py-2 space-y-0.5">
            <div className="px-3 py-1.5 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-emerald-400" /> MongoDB Status
              </span>
              <span className="text-emerald-400 font-semibold">Active</span>
            </div>
            <div className="px-3 py-1.5 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-rose-400" /> PyTorch Engine
              </span>
              <span className="text-rose-300 font-semibold">v4.0 Neural</span>
            </div>
          </div>

          {/* Sign out */}
          <div className="pt-2">
            <button
              onClick={() => {
                setIsOpen(false);
                onSignOut();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 font-semibold transition-colors cursor-pointer text-left"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
