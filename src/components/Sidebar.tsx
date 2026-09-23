import React from 'react';
import { TridentLogo } from './TridentLogo';
import { UserProfileDropdown } from './UserProfileDropdown';
import { 
  Plus, 
  MessageSquare, 
  Compass, 
  FolderKanban, 
  Wrench, 
  Settings, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { UserProfile } from '../api';

export interface ConversationItem {
  id: string;
  title: string;
  timestamp: string;
}

interface SidebarProps {
  user: UserProfile;
  onSignOut: () => void;
  onNewChat: () => void;
  conversations: ConversationItem[];
  activeConversationId: string;
  onSelectConversation: (id: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  activeNav: string;
  onSelectNav: (nav: string) => void;
  isDarkTheme: boolean;
  onToggleTheme: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  onSignOut,
  onNewChat,
  conversations,
  activeConversationId,
  onSelectConversation,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  activeNav,
  onSelectNav,
  isDarkTheme,
  onToggleTheme,
}) => {
  // Home link removed as requested
  const mainNavItems = [
    { id: 'explore', label: 'Explore', icon: Compass },
    { id: 'library', label: 'Library', icon: FolderKanban },
    { id: 'tools', label: 'AI Tools', icon: Wrench },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const sidebarContent = (
    <div className={`h-full flex flex-col justify-between bg-[#090715]/95 border-r border-rose-950/40 backdrop-blur-xl transition-colors duration-300 ${
      isCollapsed ? 'p-2 sm:p-2.5' : 'p-3'
    }`}>
      {/* Top Header: Logo + Collapse Toggle */}
      <div>
        <div className={`flex items-center pb-3 border-b border-slate-800/80 mb-3 ${
          isCollapsed ? 'flex-col gap-2 justify-center' : 'justify-between gap-2'
        }`}>
          <div className="flex items-center justify-center shrink-0 min-w-0 overflow-hidden">
            <TridentLogo size={isCollapsed ? 30 : 34} showText={!isCollapsed} />
          </div>

          {/* Desktop collapse button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onToggleCollapse}
            className="hidden md:flex p-1.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-rose-500/30 text-slate-400 hover:text-white transition-all cursor-pointer shrink-0"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </motion.button>

          {/* Mobile close button */}
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* New Chat Primary Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            onNewChat();
            if (isMobileOpen) onCloseMobile();
          }}
          className={`w-full py-2.5 px-3 rounded-xl mathiyon-btn-primary text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-950/50 cursor-pointer transition-all ${
            isCollapsed ? 'px-0' : ''
          }`}
          title="New Chat"
        >
          <Plus className="w-4 h-4 shrink-0" />
          {!isCollapsed && (
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              New Chat
            </motion.span>
          )}
        </motion.button>

        {/* Primary Navigation Links */}
        <nav className="mt-4 space-y-1">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <motion.button
                key={item.id}
                whileHover={{ x: isCollapsed ? 0 : 2 }}
                onClick={() => {
                  onSelectNav(item.id);
                  if (isMobileOpen) onCloseMobile();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                } ${isCollapsed ? 'justify-center px-0' : ''}`}
                title={item.label}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-rose-400' : 'text-slate-400'}`} />
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    {item.label}
                  </motion.span>
                )}
              </motion.button>
            );
          })}
        </nav>

        {/* Recent Conversations List */}
        {!isCollapsed && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="mt-6 pt-4 border-t border-slate-800/80"
          >
            <div className="flex items-center justify-between px-2 mb-2 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              <span>Recent Chats</span>
              <Sparkles className="w-3 h-3 text-rose-400" />
            </div>

            <div className="space-y-1 max-h-[35vh] overflow-y-auto pr-1">
              {conversations.length === 0 ? (
                <p className="px-2 text-xs text-slate-400 italic">No recent chats yet.</p>
              ) : (
                conversations.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => {
                      onSelectConversation(chat.id);
                      if (isMobileOpen) onCloseMobile();
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-left transition-all cursor-pointer ${
                      activeConversationId === chat.id
                        ? 'bg-rose-600/20 text-white font-semibold border border-rose-500/40'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span className="truncate flex-1">{chat.title}</span>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* Bottom User Profile Section */}
      <div className="pt-3 border-t border-slate-800/80">
        {!isCollapsed ? (
          <UserProfileDropdown
            user={user}
            onSignOut={onSignOut}
            isDarkTheme={isDarkTheme}
            onToggleTheme={onToggleTheme}
          />
        ) : (
          <button
            onClick={onToggleCollapse}
            className="w-full flex items-center justify-center p-2 rounded-xl hover:bg-slate-800/60 text-slate-300"
            title={user.name}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-rose-600 to-rose-900 flex items-center justify-center font-bold text-white text-xs shrink-0">
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Animated Sticky Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? 76 : 256 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="hidden md:block sticky top-0 h-screen z-30 shrink-0 overflow-hidden"
      >
        {sidebarContent}
      </motion.aside>

      {/* Mobile Sliding Drawer with Framer Motion AnimatePresence */}
      <AnimatePresence>
        {isMobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            {/* Backdrop Fade */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
              onClick={onCloseMobile}
            />
            {/* Drawer Slide */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 35 }}
              className="relative w-72 max-w-[80vw] h-full shadow-2xl z-10"
            >
              {sidebarContent}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
