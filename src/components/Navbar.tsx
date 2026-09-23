import React from 'react';
import { Menu, Bell, Layers, Sparkles } from 'lucide-react';
import { UserProfileDropdown } from './UserProfileDropdown';
import type { UserProfile } from '../api';

interface NavbarProps {
  user: UserProfile;
  onSignOut: () => void;
  onOpenMobileSidebar: () => void;
  activeModel?: string;
  onChangeModel?: (model: string) => void;
  isDarkTheme: boolean;
  onToggleTheme: () => void;
  onToggleRightPanel?: () => void;
  isRightPanelOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onSignOut,
  onOpenMobileSidebar,
  activeModel = 'Mathiyon Neural v4.0',
  isDarkTheme,
  onToggleTheme,
  onToggleRightPanel,
  isRightPanelOpen,
}) => {
  return (
    <header className="h-16 px-4 sm:px-6 glass-panel border-b border-rose-950/40 flex items-center justify-between z-20 sticky top-0 backdrop-blur-xl">
      {/* Left section: Mobile menu toggle on mobile, Workspace Session Title on desktop */}
      <div className="flex items-center gap-3">
        {/* Mobile menu drawer button */}
        <button
          onClick={onOpenMobileSidebar}
          className="md:hidden p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
          aria-label="Open sidebar menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Mobile Brand Title */}
        <div className="md:hidden flex items-center gap-2">
          <span className="font-extrabold text-base tracking-tight text-white font-['Outfit']">
            MATHIYON AI
          </span>
          <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-rose-500/15 text-rose-300 border border-rose-500/25 rounded-md">
            v4.0
          </span>
        </div>

        {/* Desktop Workspace Session Title (Eliminates sidebar duplication & border collision) */}
        <div className="hidden md:flex items-center gap-2.5">
          <span className="text-xs font-semibold text-slate-400">Workspace</span>
          <span className="text-slate-600 text-xs">/</span>
          <span className="font-bold text-sm text-slate-100 font-['Outfit']">Chat Session</span>
          <span className="px-2 py-0.5 text-[10px] font-semibold text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-rose-400" />
            <span>{activeModel}</span>
          </span>
        </div>
      </div>

      {/* Right section: Notifications + Tools Panel Toggle + User Profile */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Notifications */}
        <button
          onClick={() => alert('Mathiyon AI Notifications: All backend services operating at peak performance.')}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer relative"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
        </button>

        {/* Right Panel Toggle (Tools & Insights) */}
        {onToggleRightPanel && (
          <button
            onClick={onToggleRightPanel}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              isRightPanelOpen ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
            title="Toggle Tools & Insights Panel"
          >
            <Layers className="w-4 h-4" />
          </button>
        )}

        {/* User profile dropdown */}
        <div className="pl-2 border-l border-slate-800">
          <UserProfileDropdown
            user={user}
            onSignOut={onSignOut}
            isDarkTheme={isDarkTheme}
            onToggleTheme={onToggleTheme}
          />
        </div>
      </div>
    </header>
  );
};
