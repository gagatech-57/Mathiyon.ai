import React, { useState, useRef, useEffect } from 'react';
import { TridentLogo } from './TridentLogo';
import { UserProfileDropdown } from './UserProfileDropdown';
import { 
  Plus, 
  MessageSquare, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Sparkles,
  MoreVertical,
  Pin,
  Pencil,
  Trash2,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { UserProfile } from '../api';

export interface ConversationItem {
  id: string;
  title: string;
  timestamp: string;
  isPinned?: boolean;
}

interface SidebarProps {
  user: UserProfile;
  onSignOut: () => void;
  onNewChat: () => void;
  conversations: ConversationItem[];
  activeConversationId: string;
  onSelectConversation: (id: string) => void;
  onRenameConversation?: (id: string, newTitle: string) => Promise<void> | void;
  onTogglePinConversation?: (id: string) => Promise<void> | void;
  onDeleteConversation?: (id: string) => Promise<void> | void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  activeNav?: string;
  onSelectNav?: (nav: string) => void;
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
  onRenameConversation,
  onTogglePinConversation,
  onDeleteConversation,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  isDarkTheme,
  onToggleTheme,
}) => {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sort conversations so that pinned chats always appear at the very top
  const sortedConversations = [...conversations].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return 0;
  });

  const handleSaveRename = (id: string) => {
    if (editTitle.trim()) {
      onRenameConversation?.(id, editTitle.trim());
    }
    setEditingId(null);
  };

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

            <div className="space-y-1 max-h-[45vh] overflow-y-auto pr-1">
              {sortedConversations.length === 0 ? (
                <p className="px-2 text-xs text-slate-400 italic">No recent chats yet.</p>
              ) : (
                sortedConversations.map((chat, index) => {
                  const isMenuOpen = openMenuId === chat.id;
                  const isEditing = editingId === chat.id;
                  const isLastFew = index >= sortedConversations.length - 2 && sortedConversations.length > 2;

                  return (
                    <div
                      key={chat.id}
                      className={`relative group w-full flex items-center justify-between gap-1 px-2.5 py-1.5 rounded-xl text-xs transition-all ${
                        activeConversationId === chat.id
                          ? 'bg-rose-600/20 text-white font-semibold border border-rose-500/40'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                      }`}
                    >
                      {isEditing ? (
                        <div className="flex-1 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveRename(chat.id);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            autoFocus
                            className="w-full px-2 py-1 text-xs bg-slate-900 border border-rose-500/50 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                          />
                          <button
                            onClick={() => handleSaveRename(chat.id)}
                            className="p-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Save name"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          {/* Main Clickable Area to Select Chat */}
                          <div
                            onClick={() => {
                              onSelectConversation(chat.id);
                              if (isMobileOpen) onCloseMobile();
                            }}
                            className="flex-1 min-w-0 flex items-center gap-2 cursor-pointer py-0.5"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            <span className="truncate flex-1">{chat.title}</span>
                            {chat.isPinned && (
                              <span title="Pinned chat" className="inline-flex shrink-0">
                                <Pin className="w-3 h-3 text-rose-400 fill-rose-400/40 rotate-45" />
                              </span>
                            )}
                          </div>

                          {/* 3-Dot Meatballs Menu Trigger: Visible on hover or when menu is open */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(isMenuOpen ? null : chat.id);
                            }}
                            className={`p-1 rounded-lg transition-all shrink-0 cursor-pointer ${
                              isMenuOpen
                                ? 'opacity-100 bg-slate-800 text-white'
                                : 'opacity-0 group-hover:opacity-100 text-slate-400 hover:text-white hover:bg-slate-800/80'
                            }`}
                            title="Chat options"
                            aria-label="Chat options"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>

                          {/* Dropdown Menu (Pin, Rename, Delete) */}
                          <AnimatePresence>
                            {isMenuOpen && (
                              <motion.div
                                ref={menuRef}
                                initial={{ opacity: 0, scale: 0.95, y: isLastFew ? 6 : -6 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: isLastFew ? 6 : -6 }}
                                transition={{ duration: 0.15 }}
                                className={`absolute right-1 z-50 min-w-[135px] py-1 px-1 bg-[#120e24] border border-rose-500/30 rounded-xl shadow-2xl shadow-black/90 backdrop-blur-xl ${
                                  isLastFew ? 'bottom-full mb-1' : 'top-full mt-1'
                                }`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {/* 1. Pin / Unpin */}
                                <button
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    onTogglePinConversation?.(chat.id);
                                  }}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Pin className={`w-3.5 h-3.5 ${chat.isPinned ? 'text-rose-400 fill-rose-400' : 'text-slate-400'}`} />
                                  <span>{chat.isPinned ? 'Unpin chat' : 'Pin chat'}</span>
                                </button>

                                {/* 2. Rename */}
                                <button
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    setEditingId(chat.id);
                                    setEditTitle(chat.title);
                                  }}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Pencil className="w-3.5 h-3.5 text-slate-400" />
                                  <span>Rename</span>
                                </button>

                                {/* 3. Delete */}
                                <button
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    onDeleteConversation?.(chat.id);
                                  }}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                                  <span>Delete</span>
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* Bottom User Profile Section with Single Integrated Dropdown */}
      <div className="pt-3 border-t border-slate-800/80">
        <UserProfileDropdown
          user={user}
          onSignOut={onSignOut}
          isDarkTheme={isDarkTheme}
          onToggleTheme={onToggleTheme}
          isCollapsed={isCollapsed}
        />
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
        className="hidden md:block sticky top-0 h-screen z-30 shrink-0 overflow-visible"
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
