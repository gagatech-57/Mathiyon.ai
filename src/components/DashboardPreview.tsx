import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { WelcomeScreen } from './WelcomeScreen';
import { MessageBubble } from './MessageBubble';
import { ChatComposer } from './ChatComposer';
import { RightPanel } from './RightPanel';
import { DocumentLibrary } from './DocumentLibrary';
import { RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  apiSendChatMessage, 
  apiGetConversations, 
  apiGetConversationMessages, 
  apiCreateConversation 
} from '../api';
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
  const [activeModel, setActiveModel] = useState('Mathiyon Neural v4.0');
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
        particleCount: 60,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#e11d48', '#be123c', '#fb7185', '#ffffff']
      });
    } catch {
      // fallback
    }
  }, []);

  // Fetch real user-specific conversations from MongoDB via Chat API
  useEffect(() => {
    const fetchUserChatHistory = async () => {
      setIsLoadingHistory(true);
      const res = await apiGetConversations();
      setIsLoadingHistory(false);

      if (res.success && res.conversations && res.conversations.length > 0) {
        setConversations(res.conversations);
        // Load messages for the most recent conversation
        const initialConvId = res.conversations[0].id;
        setActiveConversationId(initialConvId);
        loadConversationMessages(initialConvId);
      } else {
        setConversations([]);
        setActiveConversationId('');
        setMessages([]);
      }
    };

    fetchUserChatHistory();
  }, [user.id]);

  // Load past message history for a selected conversation
  const loadConversationMessages = async (convId: string) => {
    setIsGenerating(true);
    const res = await apiGetConversationMessages(convId);
    setIsGenerating(false);

    if (res.success && res.messages) {
      setMessages(res.messages);
    } else {
      setMessages([]);
    }
  };

  // Select conversation from sidebar
  const handleSelectConversation = (convId: string) => {
    setActiveConversationId(convId);
    loadConversationMessages(convId);
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

  // Start New Chat session in MongoDB
  const handleNewChat = async () => {
    setIsGenerating(true);
    const res = await apiCreateConversation('New Mathiyon Chat', activeModel);
    setIsGenerating(false);

    if (res.success && res.conversation) {
      const newConv: ConversationItem = res.conversation;
      setConversations((prev) => [newConv, ...prev]);
      setActiveConversationId(newConv.id);
      setMessages([]);
      setPrompt('');
    } else {
      // Fallback local conversation creation if network issue
      const localId = `conv_${Date.now()}`;
      const localConv: ConversationItem = {
        id: localId,
        title: 'New Mathiyon Chat',
        timestamp: 'Just now'
      };
      setConversations((prev) => [localConv, ...prev]);
      setActiveConversationId(localId);
      setMessages([]);
      setPrompt('');
    }
  };

  // Send Prompt to Express Chat API Endpoint (Protected by JWT)
  const handleSendPrompt = async (textToSend?: string, docIdToSend?: string) => {
    const input = textToSend || prompt;
    if (!input.trim() || isGenerating) return;

    const targetDocId = docIdToSend || attachedDoc?.id;

    const userMessage: ChatMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      text: targetDocId && attachedDoc ? `[Document Attached: ${attachedDoc.originalName}]\n${input}` : input,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setPrompt('');
    setIsGenerating(true);

    // Call POST /api/chat protected endpoint with documentId
    const res = await apiSendChatMessage(input, activeModel, activeConversationId, targetDocId);
    setIsGenerating(false);

    if (res.success && res.response) {
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

      const assistantMessage: ChatMessage = {
        id: `ai_${Date.now()}`,
        role: 'assistant',
        text: res.response,
        timestamp: res.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        model: res.model || activeModel,
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
            ) : isLoadingHistory ? (
              <div className="flex-1 flex flex-col items-center justify-center text-rose-400 gap-3">
                <RefreshCw className="w-6 h-6 animate-spin text-rose-500" />
                <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                  Loading MongoDB Chat History...
                </span>
              </div>
            ) : messages.length === 0 ? (
              /* Welcome Screen when no messages exist in current conversation */
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

                {/* AI Generating Spinner */}
                {isGenerating && (
                  <div className="flex items-center gap-3 p-3.5 rounded-2xl glass-panel border border-rose-500/20 max-w-xs text-xs text-rose-300 font-medium animate-pulse my-4">
                    <RefreshCw className="w-4 h-4 animate-spin text-rose-400" />
                    <span>Mathiyon PyTorch AI is thinking...</span>
                  </div>
                )}

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
