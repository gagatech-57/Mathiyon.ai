import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';

/**
 * MathiyonQuickTap — Calm, minimal reaction/puzzle mini-game for New Chat empty state.
 *
 * Requirements:
 * - Compact glass card (~280px x 150px)
 * - 4-6 small nodes/buttons inside
 * - One node active/highlighted at a time
 * - Clicking correct active node advances round
 * - After 5 successful taps -> "Neural link complete ✦" (Score 5 / 5)
 * - Resets after ~1.8s delay
 * - No orbiting, racing, running, continuous movement, or heavy animations
 * - Does not capture chat keyboard focus or block composer
 * - Cleaned up on unmount
 */

interface QuickTapProps {
  onComplete?: () => void;
}

const TOTAL_ROUNDS = 5;
const NODE_COUNT = 6;

export const MathiyonQuickTap: React.FC<QuickTapProps> = ({ onComplete }) => {
  const [activeNode, setActiveNode] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pick a new active node index (different from current)
  const pickNextNode = useCallback((current: number) => {
    let next: number;
    do {
      next = Math.floor(Math.random() * NODE_COUNT);
    } while (next === current);
    return next;
  }, []);

  // Initialize first active node
  useEffect(() => {
    setActiveNode(Math.floor(Math.random() * NODE_COUNT));
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  const handleNodeClick = (index: number) => {
    if (isComplete) return;

    if (index === activeNode) {
      const nextScore = score + 1;
      if (nextScore >= TOTAL_ROUNDS) {
        setScore(TOTAL_ROUNDS);
        setIsComplete(true);
        if (onComplete) onComplete();

        // Auto-reset after 1.8 seconds
        resetTimerRef.current = setTimeout(() => {
          setScore(0);
          setIsComplete(false);
          setActiveNode(pickNextNode(-1));
        }, 1800);
      } else {
        setScore(nextScore);
        setActiveNode(pickNextNode(activeNode));
      }
    }
  };

  return (
    <div
      className="mx-auto w-full max-w-[280px] rounded-2xl p-3.5 bg-slate-900/60 border border-rose-500/25 backdrop-blur-xl shadow-lg shadow-rose-950/30 select-none text-center transition-all duration-300"
      tabIndex={-1}
      aria-label="Mathiyon Quick Tap Mini Game"
    >
      {/* Header with Title and Score */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
          <Sparkles className="w-3.5 h-3.5 text-rose-400" />
          <span className="font-['Outfit'] tracking-wide">QUICK TAP</span>
        </div>
        <div className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 font-bold">
          {score} / {TOTAL_ROUNDS}
        </div>
      </div>

      {/* Complete Banner or Grid of Nodes */}
      {isComplete ? (
        <div className="h-16 flex flex-col items-center justify-center gap-1 animate-in zoom-in-95 duration-200">
          <div className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-rose-400 animate-spin" />
            <span>Neural link complete ✦</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Syncing neural state...</span>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2.5 h-16 items-center justify-items-center">
          {Array.from({ length: NODE_COUNT }).map((_, idx) => {
            const isActive = idx === activeNode;
            return (
              <button
                key={idx}
                type="button"
                tabIndex={-1}
                onClick={() => handleNodeClick(idx)}
                aria-label={`Node ${idx + 1}${isActive ? ' (active)' : ''}`}
                className={`w-10 h-10 rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center ${
                  isActive
                    ? 'bg-gradient-to-tr from-rose-500 via-rose-600 to-rose-400 text-white shadow-lg shadow-rose-500/50 scale-105 border border-rose-300/80 animate-pulse'
                    : 'bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 text-slate-500 hover:text-slate-300 hover:border-slate-600'
                }`}
              >
                <div
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    isActive ? 'bg-white shadow-[0_0_8px_#ffffff]' : 'bg-slate-600'
                  }`}
                />
              </button>
            );
          })}
        </div>
      )}

      {/* Footer Subtext */}
      <div className="mt-2.5 text-[10px] text-slate-400 font-medium">
        {isComplete ? (
          <span className="text-rose-400 font-semibold flex items-center justify-center gap-1">
            <RefreshCw className="w-3 h-3 animate-spin" /> Resetting...
          </span>
        ) : (
          <span>Tap the glowing active node to calibrate</span>
        )}
      </div>
    </div>
  );
};
