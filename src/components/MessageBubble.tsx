/**
 * Mathiyon AI — MessageBubble
 *
 * Renders a single chat message.
 *
 * USER messages: plain text, no animation.
 * ASSISTANT messages:
 *   - New messages animate in via TypingResponse (character reveal).
 *   - Already-loaded history messages render immediately (no animation).
 *   - Math badge ("Verified Math Engine") is NEVER shown to the user.
 *   - Internal tool/engine/model metadata is NEVER rendered.
 *   - Markdown + code blocks are fully supported.
 *   - Source citations render as cards below the bubble.
 */
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import { Bot, Copy, Check, ThumbsUp, ThumbsDown, RefreshCw, Share2 } from 'lucide-react';
import { TypingResponse } from './TypingResponse';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp?: string;
  model?: string;
  toolsUsed?: string[];
  sources?: any[];
  citations?: any[];
  agentTrace?: any[];
  verified?: boolean;
  intent?: string;
  /** When true, the typing animation will play for this message */
  isNew?: boolean;
}

interface MessageBubbleProps {
  message: ChatMessage;
  userInitial?: string;
  onRegenerate?: () => void;
}

// ---------------------------------------------------------------------------
// Code block with copy button
// ---------------------------------------------------------------------------
function CodeBlock({
  language,
  codeText,
  children,
}: {
  language: string;
  codeText: string;
  children: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(codeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="my-3 rounded-xl overflow-hidden border border-rose-500/20 bg-slate-950/90 shadow-lg">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900/90 border-b border-slate-800 text-[11px] font-mono text-slate-400">
        <span className="font-semibold text-rose-400">{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-xs font-mono text-slate-200 leading-relaxed">
        {children}
      </pre>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Markdown component overrides
// ---------------------------------------------------------------------------
const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="text-lg font-bold text-rose-300 mt-3 mb-2 leading-snug">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-base font-bold text-rose-300 mt-3 mb-1.5 leading-snug">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-bold text-rose-200 mt-2.5 mb-1 leading-snug">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-sm font-semibold text-slate-200 mt-2 mb-1">{children}</h4>
  ),
  h5: ({ children }) => (
    <h5 className="text-xs font-semibold text-slate-300 mt-2 mb-0.5">{children}</h5>
  ),
  h6: ({ children }) => (
    <h6 className="text-xs font-semibold text-slate-400 mt-1.5 mb-0.5">{children}</h6>
  ),
  p: ({ children }) => (
    <p className="leading-relaxed my-1">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="font-bold text-white">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-slate-200">{children}</em>
  ),
  del: ({ children }) => (
    <del className="line-through text-slate-400">{children}</del>
  ),
  ul: ({ children }) => (
    <ul className="list-disc list-inside my-1.5 space-y-0.5 pl-2 text-slate-200">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-inside my-1.5 space-y-0.5 pl-2 text-slate-200">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="leading-relaxed">{children}</li>
  ),
  blockquote: ({ children }) => (
    <div className="my-2 pl-4 border-l-4 border-rose-500 bg-gradient-to-r from-rose-950/40 to-slate-900/60 rounded-r-xl py-2 pr-3 text-rose-200 font-medium">
      {children}
    </div>
  ),
  hr: () => (
    <hr className="my-3 border-slate-700/60" />
  ),
  code: ({ children, className }) => {
    const isBlock = className?.startsWith('language-');
    if (isBlock) {
      return <code className={`${className} text-xs font-mono text-slate-200`}>{children}</code>;
    }
    return (
      <code className="px-1.5 py-0.5 mx-0.5 rounded bg-slate-800/80 border border-slate-700/60 text-rose-300 font-mono text-[11px]">
        {children}
      </code>
    );
  },
  pre: ({ children }) => {
    let language = '';
    let codeText = '';
    if (React.isValidElement(children)) {
      const childProps = children.props as { className?: string; children?: string };
      const cls: string = childProps?.className ?? '';
      language = cls.replace('language-', '').trim();
      codeText = String(childProps?.children ?? '').replace(/\n$/, '');
    }
    return (
      <CodeBlock language={language} codeText={codeText}>
        {children}
      </CodeBlock>
    );
  },
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-cyan-400 underline underline-offset-2 hover:text-cyan-300 transition-colors"
    >
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto rounded-xl border border-rose-500/20 shadow">
      <table className="w-full text-xs text-slate-200 border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-slate-900/90 text-rose-300 font-semibold">{children}</thead>
  ),
  tbody: ({ children }) => (
    <tbody className="divide-y divide-slate-800/60">{children}</tbody>
  ),
  tr: ({ children }) => (
    <tr className="hover:bg-slate-800/30 transition-colors">{children}</tr>
  ),
  th: ({ children }) => (
    <th className="px-3 py-2 text-left font-semibold tracking-wide">{children}</th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-1.5">{children}</td>
  ),
};

// ---------------------------------------------------------------------------
// AssistantContent — renders with typing animation for new messages,
//                   or immediately for loaded history
// ---------------------------------------------------------------------------
const AssistantContent: React.FC<{ text: string; isNew: boolean }> = ({ text, isNew }) => {
  const [animDone, setAnimDone] = useState(!isNew);

  if (!animDone) {
    return (
      <span className="whitespace-pre-wrap leading-relaxed text-slate-200">
        <TypingResponse text={text} speed={6} onComplete={() => setAnimDone(true)} />
      </span>
    );
  }

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
      {text}
    </ReactMarkdown>
  );
};

// ---------------------------------------------------------------------------
// Main MessageBubble component
// ---------------------------------------------------------------------------
export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  userInitial = 'U',
  onRegenerate,
}) => {
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState<boolean | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isUser = message.role === 'user';

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
        {/* Role & Timestamp Header — ONLY safe public info */}
        <div className="flex flex-wrap items-center gap-2 mb-1 px-1 text-[11px] text-slate-400 font-medium">
          <span className="font-semibold text-slate-300">{isUser ? 'You' : 'Mathiyon AI'}</span>
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
          {/* User messages: plain text. AI messages: animated reveal then Markdown */}
          {isUser ? (
            <span className="whitespace-pre-wrap leading-relaxed">{message.text}</span>
          ) : (
            <AssistantContent text={message.text} isNew={message.isNew ?? false} />
          )}
        </div>

        {/* Source Citation Cards (Document & Web) */}
        {!isUser && message.citations && message.citations.length > 0 && (
          <div className="mt-2.5 w-full flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold text-cyan-400 flex items-center gap-1">
              📍 Verified Knowledge Sources ({message.citations.length})
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {message.citations.map((cit, cIdx) => {
                const isDoc = cit.type === 'document' || cit.page;
                const cardBorder = isDoc ? 'border-blue-500/30 hover:border-blue-400/60' : 'border-cyan-500/20 hover:border-cyan-400/50';
                const badgeText = isDoc ? `📄 DOCUMENT ${cit.page ? `— Page ${cit.page}` : ''}` : `🌐 WEB — ${cit.domain || 'Online'}`;
                const badgeColor = isDoc ? 'text-blue-400' : 'text-cyan-400';

                return (
                  <a
                    key={cIdx}
                    href={cit.url && cit.url !== '#' ? cit.url : undefined}
                    target={cit.url && cit.url !== '#' ? '_blank' : undefined}
                    rel={cit.url && cit.url !== '#' ? 'noopener noreferrer' : undefined}
                    className={`p-2.5 rounded-xl bg-slate-900/90 border ${cardBorder} transition-all flex flex-col text-left group/card shadow-sm`}
                  >
                    <span className={`text-[10px] font-mono font-bold ${badgeColor} uppercase tracking-wider mb-0.5`}>
                      {badgeText}
                    </span>
                    <span className="text-xs font-semibold text-slate-200 group-hover/card:text-white truncate">
                      [{cIdx + 1}] {cit.title}
                    </span>
                  </a>
                );
              })}
            </div>
          </div>
        )}

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
