import React, { useState, useEffect } from 'react';
import { Brain, Plus, Trash2, Cpu, RefreshCw } from 'lucide-react';

interface MemoryItem {
  _id: string;
  type: string;
  content: string;
  createdAt: string;
}

interface MemoryManagerProps {
  token: string | null;
}

export const MemoryManager: React.FC<MemoryManagerProps> = ({ token }) => {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchMemories = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/memory', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.memories)) {
        setMemories(data.memories);
      }
    } catch (err: any) {
      console.warn('Error fetching memories:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemories();
  }, [token]);

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim() || !token) return;

    setSaving(true);
    try {
      const res = await fetch('/api/memory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content: newContent.trim(), type: 'preference' })
      });
      const data = await res.json();
      if (data.success) {
        setNewContent('');
        fetchMemories();
      } else {
        alert(data.message || 'Failed to save memory');
      }
    } catch (err: any) {
      alert(`Error saving memory: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMemory = async (id: string) => {
    if (!token || !confirm('Are you sure you want to delete this long-term memory fact?')) return;

    try {
      const res = await fetch(`/api/memory/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setMemories(prev => prev.filter(m => m._id !== id));
      } else {
        alert(data.message || 'Failed to delete memory');
      }
    } catch (err: any) {
      alert(`Error deleting memory: ${err.message}`);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-rose-950/60 via-purple-950/40 to-slate-900 border border-rose-500/20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Mathiyon Long-Term Memory System
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-normal">
                Encrypted User Isolation
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Manage facts, preferences, and project settings that Mathiyon AI retains across chat sessions.
            </p>
          </div>
        </div>

        <button
          onClick={fetchMemories}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors border border-slate-700 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-rose-400' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Add Memory Form */}
      <form onSubmit={handleAddMemory} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
        <label className="block text-xs font-semibold text-rose-300">
          Store New Custom Fact / Preference
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder='e.g., "Remember that my frontend uses React 19 with Vite"'
            className="flex-1 px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-rose-500 transition-colors"
          />
          <button
            type="submit"
            disabled={saving || !newContent.trim()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-semibold text-xs transition-all shadow-md disabled:opacity-50 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {saving ? 'Saving...' : 'Add Memory'}
          </button>
        </div>
      </form>

      {/* Memory List */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
          Active Stored Memories ({memories.length})
        </h3>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-slate-900/40 rounded-xl border border-slate-800">
            Loading stored memories...
          </div>
        ) : memories.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-2">
            <Brain className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-400">No long-term memories explicitly stored yet.</p>
            <p className="text-[11px] text-slate-500">
              You can ask Mathiyon AI in chat: <em>"Remember that I use Python for AI"</em> to store memories automatically.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {memories.map((mem) => (
              <div
                key={mem._id}
                className="flex items-center justify-between p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-rose-500/30 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-200 font-medium">{mem.content}</p>
                    <span className="text-[10px] text-slate-500">
                      Saved {new Date(mem.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteMemory(mem._id)}
                  className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors opacity-70 group-hover:opacity-100 cursor-pointer"
                  title="Delete memory"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
