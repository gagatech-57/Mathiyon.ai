import React from 'react';
import { Menu, Bell, Layers } from 'lucide-react';
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
  onOpenMobileSidebar,
  onToggleRightPanel,
  isRightPanelOpen,
}) => {
  return (
    <header className="h-14 px-4 sm:px-6 glass-panel border-b border-rose-950/40 flex items-center justify-between z-20 sticky top-0 backdrop-blur-xl">
      {/* Left section */}
      <div className="flex items-center gap-3">
        {/* Mobile menu drawer button */}
        <button
          onClick={onOpenMobileSidebar}
          className="md:hidden p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
          aria-label="Open sidebar menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Mobile Brand Title — clean */}
        <div className="md:hidden flex items-center gap-2">
          <img
            src="/mathiyon.png"
            alt="Mathiyon AI"
            className="w-6 h-6 object-contain rounded-md"
          />
          <span className="font-extrabold text-base tracking-tight text-white font-['Outfit']">
            MATHIYON AI
          </span>
        </div>

        {/* Desktop breadcrumb — clean, no model version */}
        <div className="hidden md:flex items-center gap-2.5">
          <span className="text-xs font-semibold text-slate-400">Mathiyon AI</span>
          <span className="text-slate-600 text-xs">/</span>
          <span className="font-bold text-sm text-slate-100 font-['Outfit']">Chat</span>
        </div>
      </div>

      {/* Right section: Notifications + Tools Panel Toggle */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Notifications */}
        <button
          onClick={() => alert('Mathiyon AI: All systems operational.')}
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
      </div>
    </header>
  );
};
