import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { WelcomeScreen } from './WelcomeScreen';
import { MessageBubble } from './MessageBubble';
import { ChatComposer } from './ChatComposer';
import { RightPanel } from './RightPanel';
import { DocumentLibrary } from './DocumentLibrary';
import { MemoryManager } from './MemoryManager';
import { ThinkingIndicator } from './ThinkingIndicator';
import { RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  apiSendChatMessage,
  apiGetConversations,
  apiGetConversationMessages,
  apiRenameConversation,
  apiTogglePinConversation,
  apiDeleteConversation,
  getToken
} from '../api';
import { formatAssistantAnswer } from '../utils/responseFormatter';
import type { UserProfile, DocumentItem } from '../api';
import type { ChatMessage } from './MessageBubble';
import type { ConversationItem } from './Sidebar';

interface DashboardPreviewProps {
  user: UserProfile;
  onSignOut: () => void;
}

export const DashboardPreview: React.FC<DashboardPreviewProps> = ({ user, onSignOut }) => {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [activeModel, setActiveModel] = useState('Mathiyon SLM v1.2');
  const [activeNav, setActiveNav] = useState('explore');

  // Sidebar & Panel state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(true);

  // Attached Document RAG state
  const [attachedDoc, setAttachedDoc] = useState<DocumentItem | null>(null);

  // Conversations history from MongoDB
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>('');
  
  // Guard against race conditions when creating first conversation
  const isCreatingConversationRef = useRef(false);

  // Auto scroll reference for chat stream
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating]);

  // Initial welcome confetti burst
  useEffect(() => {
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#e11d48', '#be123c', '#fb7185', '#ffffff']
      });
    } catch {
      // fallback
    }
  }, []);

  // Load past message history for a selected conversation
  const loadConversationMessages = async (convId: string) => {
    if (!convId) {
      setMessages([]);
      return;
    }
    setIsGenerating(true);
    const res = await apiGetConversationMessages(convId);
    setIsGenerating(false);

    if (res.success && res.messages) {
      setMessages(res.messages);
    } else {
      setMessages([]);
    }
  };

  // Fetch real user-specific conversations from MongoDB via Chat API
  useEffect(() => {
    const fetchUserChatHistory = async () => {
      setIsLoadingHistory(true);
      const res = await apiGetConversations();
      setIsLoadingHistory(false);

      if (res.success && res.conversations && res.conversations.length > 0) {
        setConversations(res.conversations);
        // Start in New Chat empty state rather than automatically locking into an old chat
        // (unless user specifically selects one from Recent Chats)
        setActiveConversationId('');
        setMessages([]);
      } else {
        setConversations([]);
        setActiveConversationId('');
        setMessages([]);
      }
    };

    fetchUserChatHistory();
  }, [user.id]);

  // Select conversation from sidebar
  const handleSelectConversation = (convId: string) => {
    setActiveConversationId(convId);
    loadConversationMessages(convId);
    setActiveNav('explore');
  };

  const userInitial = user.name ? user.name.charAt(0).toUpperCase() : 'U';

  // Toggle Theme
  const handleToggleTheme = () => {
    setIsDarkTheme(!isDarkTheme);
    if (isDarkTheme) {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
  };

  // Start New Chat — ONLY sets temporary empty client-side state
  // Does NOT call createConversation API or create any MongoDB record
  const handleNewChat = () => {
    setActiveConversationId('');
    setMessages([]);
    setPrompt('');
    setAttachedDoc(null);
    setActiveNav('explore');
  };

  // Rename a conversation title
  const handleRenameConversation = async (id: string, newTitle: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c))
    );
    await apiRenameConversation(id, newTitle);
  };

  // Toggle pin status of a conversation
  const handleTogglePinConversation = async (id: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isPinned: !c.isPinned } : c))
    );
    await apiTogglePinConversation(id);
  };

  // Delete a conversation and reset chat if active
  const handleDeleteConversation = async (id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConversationId === id) {
      handleNewChat();
    }
    await apiDeleteConversation(id);
  };

  // Send Prompt to Express Chat API Endpoint (Protected by JWT)
  const handleSendPrompt = async (textToSend?: string, docIdToSend?: string, enableWebSearch?: boolean) => {
    const input = textToSend || prompt;
    if (!input.trim() || isGenerating || isCreatingConversationRef.current) return;

    const targetDocId = docIdToSend || attachedDoc?.id;
    const isNewChatSession = !activeConversationId;

    const userMessage: ChatMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      text: targetDocId && attachedDoc ? `[Document Attached: ${attachedDoc.originalName}]\n${input}` : input,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setPrompt('');
    setIsGenerating(true);
    if (isNewChatSession) {
      isCreatingConversationRef.current = true;
    }

    try {
      // Call POST /api/chat protected endpoint with documentId & enableWebSearch
      const res = await apiSendChatMessage(input, activeModel, activeConversationId || undefined, targetDocId, enableWebSearch);

      if (res.success && (res.response || res.answer)) {
        // Set active conversation ID if newly created by backend
        if (res.conversationId) {
          setActiveConversationId(res.conversationId);
        }

        // Update conversations list in sidebar with new title
        if (res.conversationId && res.conversationTitle) {
          setConversations((prev) => {
            const exists = prev.some((c) => c.id === res.conversationId);
            if (exists) {
              return prev.map((c) =>
                c.id === res.conversationId ? { ...c, title: res.conversationTitle! } : c
              );
            } else {
              return [
                {
                  id: res.conversationId!,
                  title: res.conversationTitle!,
                  timestamp: res.timestamp || 'Just now',
                },
                ...prev,
              ];
            }
          });
        }

        // Format and sanitize the assistant response
        const rawAnswer = res.answer || res.response || '';
        const cleanAnswer = formatAssistantAnswer(rawAnswer, res.intent, res.toolsUsed);

        const assistantMessage: ChatMessage = {
          id: `ai_${Date.now()}`,
          role: 'assistant',
          text: cleanAnswer,
          timestamp: res.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          model: res.model || activeModel,
          toolsUsed: res.toolsUsed,
          sources: res.sources,
          citations: res.citations,
          verified: res.verified,
          isNew: true,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        const isUnavailable = res.offline || res.message === 'Mathiyon AI is temporarily unavailable.';
        const errorMessage: ChatMessage = {
          id: `err_${Date.now()}`,
          role: 'assistant',
          text: isUnavailable
            ? 'Mathiyon AI is temporarily unavailable.'
            : `⚠️ Express Chat API Error: ${res.messageText || res.message || 'Could not process prompt. Check server logs.'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          model: activeModel,
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } finally {
      setIsGenerating(false);
      isCreatingConversationRef.current = false;
    }
  };

  return (
    <div className={`min-h-screen bg-[#080711] text-white flex flex-col font-['Inter'] ${!isDarkTheme ? 'light-theme' : ''}`}>
      {/* Main App Layout Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          user={user}
          onSignOut={onSignOut}
          onNewChat={handleNewChat}
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelectConversation={handleSelectConversation}
          onRenameConversation={handleRenameConversation}
          onTogglePinConversation={handleTogglePinConversation}
          onDeleteConversation={handleDeleteConversation}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          activeNav={activeNav}
          onSelectNav={(nav) => setActiveNav(nav)}
          isDarkTheme={isDarkTheme}
          onToggleTheme={handleToggleTheme}
        />

        {/* Center Workspace Area */}
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          {/* Top Navbar */}
          <Navbar
            user={user}
            onSignOut={onSignOut}
            onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
            activeModel={activeModel}
            onChangeModel={(model) => setActiveModel(model)}
            isDarkTheme={isDarkTheme}
            onToggleTheme={handleToggleTheme}
            onToggleRightPanel={() => setIsRightPanelOpen(!isRightPanelOpen)}
            isRightPanelOpen={isRightPanelOpen}
          />

          {/* Main Chat Conversation Container */}
          <main className="flex-1 flex flex-col justify-between overflow-hidden relative">
            {/* Ambient Background Orbs */}
            <div className="ambient-glow-1 top-10 left-1/3" />
            <div className="ambient-glow-2 bottom-20 right-1/4" />

            {activeNav === 'library' ? (
              <DocumentLibrary
                onAskAboutDocument={(doc) => {
                  setAttachedDoc(doc);
                  setActiveNav('explore');
                }}
              />
            ) : activeNav === 'memory' || activeNav === 'settings' ? (
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 z-10">
                <MemoryManager token={getToken()} />
              </div>
            ) : isLoadingHistory ? (
              <div className="flex-1 flex flex-col items-center justify-center text-rose-400 gap-3">
                <RefreshCw className="w-6 h-6 animate-spin text-rose-500" />
                <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                  Loading MongoDB Chat History...
                </span>
              </div>
            ) : messages.length === 0 ? (
              /* Clean New Chat Welcome Screen with Quick Tap mini-game */
              <WelcomeScreen
                userName={user.name}
                onSelectPrompt={(text) => handleSendPrompt(text)}
              />
            ) : (
              /* Scrollable Conversation Stream */
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 max-w-4xl w-full mx-auto space-y-2 z-10 scroll-smooth">
                {messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    userInitial={userInitial}
                    onRegenerate={() => {
                      const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
                      if (lastUserMsg) handleSendPrompt(lastUserMsg.text);
                    }}
                  />
                ))}

                {/* Thinking indicator — shown while backend is processing */}
                {isGenerating && <ThinkingIndicator />}

                <div ref={messagesEndRef} />
              </div>
            )}

            {/* Chat Input Composer */}
            <div className="sticky bottom-0 z-20 w-full bg-gradient-to-t from-[#080711] via-[#080711]/90 to-transparent pt-4">
              <ChatComposer
                prompt={prompt}
                setPrompt={setPrompt}
                onSend={(text, docId) => handleSendPrompt(text, docId)}
                isGenerating={isGenerating}
                onStopGenerating={() => setIsGenerating(false)}
                activeModel={activeModel}
                attachedDoc={attachedDoc}
                onClearAttachedDoc={() => setAttachedDoc(null)}
                onDocUploaded={(doc) => setAttachedDoc(doc)}
              />
            </div>
          </main>
        </div>

        {/* Optional Right Panel (Insights & Dev Tools) */}
        <RightPanel
          isOpen={isRightPanelOpen}
          onClose={() => setIsRightPanelOpen(false)}
          activeModel={activeModel}
          onSelectPrompt={(text) => handleSendPrompt(text)}
        />
      </div>
    </div>
  );
};
