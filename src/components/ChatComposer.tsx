import React, { useRef, useEffect, useState } from 'react';
import { Send, Paperclip, Square, Sparkles, FileText, X, RefreshCw, Upload, Check, FolderOpen } from 'lucide-react';
import { apiUploadDocument, apiGetDocuments } from '../api';
import type { DocumentItem } from '../api';

interface ChatComposerProps {
  prompt: string;
  setPrompt: (value: string) => void;
  onSend: (text?: string, attachedDocId?: string, enableWebSearch?: boolean) => void;
  isGenerating: boolean;
  onStopGenerating?: () => void;
  activeModel: string;
  attachedDoc?: DocumentItem | null;
  onClearAttachedDoc?: () => void;
  onDocUploaded?: (doc: DocumentItem) => void;
}

export const ChatComposer: React.FC<ChatComposerProps> = ({
  prompt,
  setPrompt,
  onSend,
  isGenerating,
  onStopGenerating,
  activeModel,
  attachedDoc,
  onClearAttachedDoc,
  onDocUploaded,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [currentDoc, setCurrentDoc] = useState<DocumentItem | null>(attachedDoc || null);
  const [showDocPicker, setShowDocPicker] = useState(false);
  const [userDocs, setUserDocs] = useState<DocumentItem[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [enableWebSearch, setEnableWebSearch] = useState(false);

  useEffect(() => {
    if (attachedDoc !== undefined) {
      setCurrentDoc(attachedDoc);
    }
  }, [attachedDoc]);

  // Close doc picker dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDocPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto resize textarea height smoothly based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [prompt]);

  const handleToggleDocPicker = async () => {
    if (!showDocPicker) {
      setIsLoadingDocs(true);
      const res = await apiGetDocuments();
      setIsLoadingDocs(false);
      if (res.success && res.documents) {
        setUserDocs(res.documents);
      }
    }
    setShowDocPicker(!showDocPicker);
  };

  const handleSelectDocFromPicker = (doc: DocumentItem) => {
    setCurrentDoc(doc);
    setShowDocPicker(false);
    if (onDocUploaded) onDocUploaded(doc);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (prompt.trim() && !isGenerating) {
        onSend(prompt, currentDoc?.id, enableWebSearch);
      }
    }
  };


  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setShowDocPicker(false);
    setIsUploading(true);
    const res = await apiUploadDocument(file);
    setIsUploading(false);

    if (res.success && res.document) {
      setCurrentDoc(res.document);
      if (onDocUploaded) onDocUploaded(res.document);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } else {
      alert(res.message || 'File upload failed');
    }
  };

  const handleRemoveDoc = () => {
    setCurrentDoc(null);
    if (onClearAttachedDoc) onClearAttachedDoc();
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-4 pt-2 relative">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf,.txt,.docx,.csv,.json,.md,.js,.ts,.py,.html,.css"
        className="hidden"
      />

      {/* Document Picker Dropdown Modal */}
      {showDocPicker && (
        <div 
          ref={dropdownRef}
          className="absolute bottom-full mb-3 left-4 z-50 w-80 p-3 rounded-2xl glass-panel border border-rose-500/30 shadow-2xl backdrop-blur-2xl space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          <div className="flex items-center justify-between px-1 pb-2 border-b border-slate-800 text-xs font-semibold text-slate-300">
            <div className="flex items-center gap-1.5 text-rose-300">
              <FolderOpen className="w-4 h-4 text-rose-400" />
              <span>Attach Document to Chat</span>
            </div>
            <button 
              type="button" 
              onClick={() => setShowDocPicker(false)}
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Action button to trigger new upload */}
          <button
            type="button"
            onClick={() => { setShowDocPicker(false); fileInputRef.current?.click(); }}
            className="w-full p-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-200 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload New Document...</span>
          </button>

          {/* Document list */}
          <div className="max-h-56 overflow-y-auto space-y-1.5 pt-1">
            {isLoadingDocs ? (
              <div className="flex items-center justify-center py-4 text-xs text-rose-400 gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Loading My Documents...</span>
              </div>
            ) : userDocs.length === 0 ? (
              <div className="text-center py-4 text-xs text-slate-500">
                No documents indexed yet. Upload a PDF or TXT to perform RAG search.
              </div>
            ) : (
              userDocs.map((doc) => {
                const isSelected = currentDoc?.id === doc.id;
                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => handleSelectDocFromPicker(doc)}
                    disabled={doc.status !== 'ready'}
                    className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between text-xs transition cursor-pointer ${
                      isSelected
                        ? 'bg-rose-500/20 border-rose-500/50 text-white font-semibold'
                        : 'bg-slate-900/80 hover:bg-slate-800 border-slate-800 text-slate-300'
                    } ${doc.status !== 'ready' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className={`w-4 h-4 shrink-0 ${isSelected ? 'text-rose-400' : 'text-slate-400'}`} />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{doc.originalName}</p>
                        <p className="text-[10px] text-slate-400">{doc.pageCount || 1} Page{(doc.pageCount || 1) > 1 ? 's' : ''} • {doc.status}</p>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-rose-400 shrink-0 ml-1" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Outer Composer Wrapper */}
      <div className="relative rounded-2xl glass-input p-2 sm:p-2.5 border border-rose-500/25 shadow-2xl backdrop-blur-xl transition-all">
        {/* Model & Attached Document Header inside Composer */}
        <div className="flex flex-wrap items-center justify-between px-3 pb-2 text-[10px] text-slate-400 font-semibold border-b border-slate-800/60 mb-2 gap-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-rose-300">
              <Sparkles className="w-3 h-3 text-rose-400" />
              <span>Active Engine: <strong className="text-white">{activeModel}</strong></span>
            </div>

            {/* Web Search Toggle */}
            <button
              type="button"
              onClick={() => setEnableWebSearch(!enableWebSearch)}
              className={`px-2 py-0.5 rounded-full border text-[10px] font-medium transition cursor-pointer flex items-center gap-1 ${
                enableWebSearch
                  ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-semibold'
                  : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>🌐 Web Search</span>
              <span className={`w-1.5 h-1.5 rounded-full ${enableWebSearch ? 'bg-cyan-400 animate-pulse' : 'bg-slate-500'}`} />
            </button>
          </div>

          {currentDoc && (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs font-semibold shadow-sm">
              <FileText className="w-3.5 h-3.5 text-rose-400" />
              <span className="truncate max-w-[200px]">📄 {currentDoc.originalName}</span>
              <button
                type="button"
                onClick={handleRemoveDoc}
                className="text-slate-400 hover:text-white ml-1 cursor-pointer"
                title="Remove attached document"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {isUploading && (
            <div className="flex items-center gap-1.5 text-amber-300 text-xs animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
              <span>Indexing Document Vectors...</span>
            </div>
          )}
        </div>

        {/* Single Flex Container for Inputs & Controls */}
        <div className="flex items-center gap-2 sm:gap-3 w-full">
          {/* Action buttons left: Attachment & Add */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleToggleDocPicker}
              disabled={isUploading}
              className={`p-2 rounded-xl transition-colors cursor-pointer disabled:opacity-50 ${
                currentDoc || showDocPicker
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'text-slate-400 hover:text-rose-300 hover:bg-slate-800/80'
              }`}
              title="Attach Document for RAG Search"
            >
              <Paperclip className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </button>
          </div>

          {/* Flexible Text Area */}
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={currentDoc ? `Ask about "${currentDoc.originalName}"...` : "Ask Mathiyon AI anything..."}
            rows={1}
            className="flex-1 bg-transparent text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none resize-none py-1.5 px-1 max-h-40 leading-relaxed"
          />

          {/* Action buttons right: Voice & Send Button */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Send or Stop Generating Button */}
            {isGenerating ? (
              <button
                type="button"
                onClick={onStopGenerating}
                className="flex items-center justify-center shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-rose-900/80 hover:bg-rose-800 text-white shadow-md cursor-pointer transition-all border border-rose-500/40"
                title="Stop Generating"
              >
                <Square className="w-3.5 h-3.5 fill-current text-white animate-pulse" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onSend(prompt, currentDoc?.id, enableWebSearch)}
                disabled={!prompt.trim()}
                className="flex items-center justify-center shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-xl mathiyon-btn-primary text-white disabled:opacity-40 disabled:hover:shadow-none disabled:hover:transform-none shadow-md shadow-rose-950/50 cursor-pointer transition-all"
                title="Send Message (Enter)"
              >
                <Send className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
