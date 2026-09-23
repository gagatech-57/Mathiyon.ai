import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, UploadCloud, Trash2, MessageSquare, CheckCircle, 
  AlertCircle, RefreshCw, Layers, ShieldCheck, FileCode, FileSpreadsheet, Plus 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiGetDocuments, apiUploadDocument, apiDeleteDocument } from '../api';
import type { DocumentItem } from '../api';

interface DocumentLibraryProps {
  onAskAboutDocument: (doc: DocumentItem) => void;
}

export const DocumentLibrary: React.FC<DocumentLibraryProps> = ({ onAskAboutDocument }) => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = async () => {
    setIsLoading(true);
    const res = await apiGetDocuments();
    setIsLoading(false);
    if (res.success && res.documents) {
      setDocuments(res.documents);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError('');
    setUploadSuccess('');
    setIsUploading(true);

    const res = await apiUploadDocument(file);
    setIsUploading(false);

    if (res.success && res.document) {
      setUploadSuccess(`Successfully uploaded and indexed "${file.name}"!`);
      setDocuments((prev) => [res.document!, ...prev]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } else {
      setUploadError(res.message || 'Document processing failed.');
    }
  };

  const handleDelete = async (docId: string, filename: string) => {
    if (!confirm(`Are you sure you want to delete "${filename}" and its vector index?`)) return;

    const res = await apiDeleteDocument(docId);
    if (res.success) {
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } else {
      alert(res.message || 'Could not delete document.');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FileText className="w-5 h-5 text-rose-400" />;
    if (ext === 'csv' || ext === 'xlsx') return <FileSpreadsheet className="w-5 h-5 text-emerald-400" />;
    if (['js', 'ts', 'py', 'html', 'css', 'json'].includes(ext || '')) return <FileCode className="w-5 h-5 text-cyan-400" />;
    return <FileText className="w-5 h-5 text-purple-400" />;
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 max-w-6xl w-full mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl glass-panel border border-rose-500/20 relative overflow-hidden">
        <div className="ambient-glow-1 top-0 left-0" />
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2 text-rose-400 font-semibold text-xs tracking-wider uppercase">
            <Layers className="w-4 h-4" />
            <span>Document Intelligence & Vector RAG Engine</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">My Document Library</h2>
          <p className="text-sm text-slate-300">
            Upload PDFs, Markdown, TXT, or source code files for retrieval-augmented Q&A with full source citations.
          </p>
        </div>

        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileSelect} 
          accept=".pdf,.txt,.docx,.csv,.json,.md,.js,.ts,.py,.html,.css" 
          className="hidden" 
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="relative z-10 px-5 py-2.5 rounded-xl mathiyon-btn-primary font-bold text-sm text-white flex items-center justify-center gap-2 shadow-lg shadow-rose-900/30 hover:scale-[1.02] transition cursor-pointer disabled:opacity-50"
        >
          {isUploading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
              <span>Indexing Vector Chunks...</span>
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              <span>Upload Document</span>
            </>
          )}
        </button>
      </div>

      {/* Notifications */}
      <AnimatePresence>
        {uploadError && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-4 rounded-xl bg-rose-950/80 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{uploadError}</span>
          </motion.div>
        )}
        {uploadSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-3"
          >
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{uploadSuccess}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drag & Drop Upload Zone */}
      <div 
        onClick={() => fileInputRef.current?.click()}
        className="p-8 rounded-2xl border-2 border-dashed border-rose-500/20 hover:border-rose-500/40 bg-rose-950/10 hover:bg-rose-950/20 transition cursor-pointer flex flex-col items-center justify-center gap-3 text-center group"
      >
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center group-hover:scale-110 transition">
          <UploadCloud className="w-6 h-6 text-rose-400" />
        </div>
        <div>
          <span className="text-sm font-semibold text-white">Click or Drag & Drop documents to index</span>
          <p className="text-xs text-slate-400 mt-1">Supports PDF, TXT, DOCX, CSV, JSON, Markdown & Source Code (Max 25MB)</p>
        </div>
      </div>

      {/* Documents Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 text-rose-400 gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-rose-500" />
          <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">Loading Document Vectors...</span>
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-12 p-6 rounded-2xl glass-panel border border-slate-800 space-y-3">
          <FileText className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-semibold text-slate-300">No indexed documents yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Upload your first PDF or TXT file to start performing retrieval-augmented generation (RAG) with Mathiyon AI.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 rounded-2xl glass-panel border border-rose-500/20 hover:border-rose-500/40 transition flex flex-col justify-between gap-4 group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                      {getFileIcon(doc.originalName)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-white truncate group-hover:text-rose-300 transition">
                        {doc.originalName}
                      </h4>
                      <p className="text-[11px] text-slate-400">{formatFileSize(doc.size)}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase border ${
                    doc.status === 'ready' 
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' 
                      : doc.status === 'processing'
                      ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 animate-pulse'
                      : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                  }`}>
                    {doc.status}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
                  <span>{doc.pageCount || 1} Page{(doc.pageCount || 1) > 1 ? 's' : ''}</span>
                  <span>{doc.chunkCount || 0} Vector Chunks</span>
                  <span className="flex items-center gap-1 text-slate-500">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" /> Isolated
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => onAskAboutDocument(doc)}
                  disabled={doc.status !== 'ready'}
                  className="flex-1 py-2 px-3 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-40"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Ask Mathiyon</span>
                </button>
                <button
                  onClick={() => handleDelete(doc.id, doc.originalName)}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-500/40 transition cursor-pointer"
                  title="Delete Document"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
