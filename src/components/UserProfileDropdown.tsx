import React, { useState, useRef, useEffect } from 'react';
import { User, LogOut, Settings, Sun, Moon, Shield, Sparkles, ChevronUp } from 'lucide-react';
import type { UserProfile } from '../api';

interface UserProfileDropdownProps {
  user: UserProfile;
  onSignOut: () => void;
  isDarkTheme: boolean;
  onToggleTheme: () => void;
  isCollapsed?: boolean;
}

export const UserProfileDropdown: React.FC<UserProfileDropdownProps> = ({
  user,
  onSignOut,
  isDarkTheme,
  onToggleTheme,
  isCollapsed = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const userInitial = user.name ? user.name.charAt(0).toUpperCase() : 'U';

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Trigger Button - Bottom-left profile area */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="User profile menu"
        className={`w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-800/60 transition-all cursor-pointer group text-left border border-transparent hover:border-slate-800 ${
          isCollapsed ? 'justify-center p-1.5' : ''
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-rose-600 via-rose-700 to-rose-900 flex items-center justify-center font-bold text-white text-xs shadow-md shadow-rose-950/40 shrink-0">
            {userInitial}
          </div>
          {!isCollapsed && (
            <div className="text-left pr-1 min-w-0">
              <p className="text-xs font-semibold text-slate-200 group-hover:text-rose-300 transition-colors leading-tight truncate max-w-[130px]">
                {user.name}
              </p>
              <span className="text-[10px] text-slate-400 font-mono block">Pro Plan</span>
            </div>
          )}
        </div>

        {!isCollapsed && (
          <ChevronUp
            className={`w-4 h-4 text-slate-400 group-hover:text-slate-200 transition-transform duration-200 shrink-0 ${
              isOpen ? 'rotate-180 text-rose-400' : ''
            }`}
          />
        )}
      </button>

      {/* Single Unified Dropdown Menu anchored above profile */}
      {isOpen && (
        <div
          role="menu"
          className="absolute left-0 bottom-full mb-2 w-64 rounded-2xl glass-panel bg-[#0e0b1d]/98 backdrop-blur-2xl border border-rose-500/25 shadow-2xl z-50 p-2 text-xs divide-y divide-slate-800/80 animate-in fade-in slide-in-from-bottom-2 duration-150"
        >
          {/* User Details Header */}
          <div className="p-2.5 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-rose-900 flex items-center justify-center font-bold text-white text-xs shadow-md shrink-0">
                {userInitial}
              </div>
              <div className="overflow-hidden min-w-0">
                <p className="font-bold text-slate-100 text-xs truncate">{user.name}</p>
                <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[9px] font-semibold text-emerald-400">Authenticated</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Menu Options */}
          <div className="py-2 space-y-0.5">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                alert(`Mathiyon AI Account Profile: ${user.name} (${user.email})`);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-rose-500/15 transition-colors cursor-pointer text-left"
            >
              <User className="w-4 h-4 text-rose-400" />
              <span>Account Profile</span>
            </button>

            <button
              type="button"
              onClick={onToggleTheme}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-rose-500/15 transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-2.5">
                {isDarkTheme ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
                <span>{isDarkTheme ? 'Light Mode' : 'Dark Mode'}</span>
              </div>
              <span className="text-[9px] uppercase font-bold text-slate-400 px-1.5 py-0.5 rounded bg-slate-800">
                {isDarkTheme ? 'Dark' : 'Light'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                alert('Mathiyon AI: All services operational.');
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-rose-500/15 transition-colors cursor-pointer text-left"
            >
              <Settings className="w-4 h-4 text-rose-400" />
              <span>Preferences</span>
            </button>
          </div>

          {/* System info */}
          <div className="py-2 space-y-0.5">
            <div className="px-3 py-1 flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <Shield className="w-3 h-3 text-emerald-400" /> Platform Status
              </span>
              <span className="text-emerald-400 font-semibold">Active</span>
            </div>
            <div className="px-3 py-1 flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-rose-400" /> Intelligence
              </span>
              <span className="text-rose-300 font-semibold">Hybrid SLM + Tools</span>
            </div>
          </div>

          {/* Sign out */}
          <div className="pt-2">
            <button
              type="button"
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
