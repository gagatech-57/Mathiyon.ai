import React, { useState } from 'react';
import { Bot, Copy, Check, ThumbsUp, ThumbsDown, RefreshCw, Share2 } from 'lucide-react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp?: string;
  model?: string;
}

interface MessageBubbleProps {
  message: ChatMessage;
  userInitial?: string;
  onRegenerate?: () => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, userInitial = 'U', onRegenerate }) => {
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState<boolean | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isUser = message.role === 'user';

  // Format code blocks & Math Engine markdown if message contains special math output
  const renderMessageContent = (text: string) => {
    const isVerifiedMath = text.includes('[Verified Math Engine]');

    if (text.includes('```')) {
      const parts = text.split(/(```[\s\S]*?```)/g);
      return (
        <div>
          {isVerifiedMath && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 mb-3 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold shadow-sm">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Verified Math Engine</span>
            </div>
          )}
          {parts.map((part, index) => {
            if (part.startsWith('```')) {
              const firstLineEnd = part.indexOf('\n');
              const language = firstLineEnd !== -1 ? part.substring(3, firstLineEnd).trim() : '';
              const codeContent = firstLineEnd !== -1 ? part.substring(firstLineEnd + 1, part.length - 3) : part.replace(/```/g, '');

              return (
                <div key={index} className="my-3 rounded-xl overflow-hidden border border-rose-500/20 bg-slate-950/90 shadow-lg">
                  <div className="flex items-center justify-between px-4 py-2 bg-slate-900/90 border-b border-slate-800 text-[11px] font-mono text-slate-400">
                    <span className="font-semibold text-rose-400">{language || 'formula / result'}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(codeContent);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className="p-4 overflow-x-auto text-xs font-mono text-slate-200 leading-relaxed">
                    <code>{codeContent}</code>
                  </pre>
                </div>
              );
            }

            return (
              <div key={index} className="whitespace-pre-wrap leading-relaxed my-1">
                {part.split('\n').map((line, lIdx) => {
                  if (line.startsWith('### ')) {
                    return <h3 key={lIdx} className="text-base font-bold text-rose-300 my-2">{line.replace('### ', '')}</h3>;
                  }
                  if (line.startsWith('#### ')) {
                    return <h4 key={lIdx} className="text-sm font-semibold text-slate-200 mt-3 mb-1">{line.replace('#### ', '')}</h4>;
                  }
                  if (line.startsWith('> ')) {
                    return (
                      <div key={lIdx} className="p-3 my-2 rounded-xl bg-gradient-to-r from-rose-950/40 via-purple-950/30 to-slate-900 border-l-4 border-rose-500 text-rose-200 font-medium">
                        {line.replace('> ', '')}
                      </div>
                    );
                  }
                  return <p key={lIdx} className="my-0.5">{line}</p>;
                })}
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <div className="whitespace-pre-wrap leading-relaxed">
        {isVerifiedMath && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 mb-3 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold shadow-sm">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>Verified Math Engine</span>
          </div>
        )}
        {text}
      </div>
    );
  };

  return (
    <div className={`group flex gap-3 sm:gap-4 my-4 ${isUser ? 'flex-row-reverse justify-start' : 'flex-row justify-start'}`}>
      {/* Avatar Icon */}
      {isUser ? (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-600 via-rose-700 to-rose-900 flex items-center justify-center font-bold text-white text-xs shadow-md shrink-0">
          {userInitial}
        </div>
      ) : (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-600 to-rose-950 flex items-center justify-center text-white shadow-md shadow-rose-950/40 border border-rose-500/30 shrink-0">
          <Bot className="w-4 h-4 text-rose-200" />
        </div>
      )}

      {/* Content Container */}
      <div className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Role & Model Header */}
        <div className="flex items-center gap-2 mb-1 px-1 text-[11px] text-slate-400 font-medium">
          <span>{isUser ? 'You' : 'Mathiyon AI'}</span>
          {!isUser && message.model && (
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20">
              {message.model}
            </span>
          )}
          {message.timestamp && <span className="text-[10px] text-slate-500">{message.timestamp}</span>}
        </div>

        {/* Message Bubble Box */}
        <div
          className={`p-4 rounded-2xl text-xs sm:text-sm shadow-md transition-all ${
            isUser
              ? 'bg-gradient-to-r from-rose-600 via-rose-700 to-rose-800 text-white rounded-tr-xs shadow-rose-950/40'
              : 'glass-panel border border-rose-500/20 text-slate-200 rounded-tl-xs backdrop-blur-md'
          }`}
        >
          {renderMessageContent(message.text)}
        </div>

        {/* Action Toolbar for AI responses */}
        {!isUser && (
          <div className="flex items-center gap-1 mt-1.5 opacity-80 group-hover:opacity-100 transition-opacity text-slate-400 text-xs">
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
              title="Copy message"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={() => setLiked(liked === true ? null : true)}
              className={`p-1.5 rounded-lg hover:bg-slate-800/60 transition-colors cursor-pointer ${
                liked === true ? 'text-rose-400 bg-rose-500/10' : 'hover:text-white'
              }`}
              title="Good response"
            >
              <ThumbsUp className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setLiked(liked === false ? null : false)}
              className={`p-1.5 rounded-lg hover:bg-slate-800/60 transition-colors cursor-pointer ${
                liked === false ? 'text-rose-400 bg-rose-500/10' : 'hover:text-white'
              }`}
              title="Bad response"
            >
              <ThumbsDown className="w-3.5 h-3.5" />
            </button>

            {onRegenerate && (
              <button
                onClick={onRegenerate}
                className="p-1.5 rounded-lg hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
                title="Regenerate response"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={() => alert('Mathiyon Share Link created!')}
              className="p-1.5 rounded-lg hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
              title="Share response"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
