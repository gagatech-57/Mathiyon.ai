/**
 * Mathiyon AI — TypingResponse
 *
 * Reveals a completed assistant message with a smooth character-reveal animation.
 * The backend MUST compute the full final answer first.
 * This component then animates the pre-computed result — it does NOT stream partial values.
 *
 * Works for:
 *  - Math answers:  "Result: 5"
 *  - General text:  "CSS is a stylesheet language..."
 *  - Code blocks:   rendered via ReactMarkdown after reveal completes
 */
import React, { useState, useEffect, useRef } from 'react';

interface TypingResponseProps {
  /** The final, complete text to reveal */
  text: string;
  /** Characters per frame (higher = faster reveal). Default: 4 */
  speed?: number;
  /** Called when the animation finishes */
  onComplete?: () => void;
}

export const TypingResponse: React.FC<TypingResponseProps> = ({
  text,
  speed = 4,
  onComplete,
}) => {
  const [displayed, setDisplayed] = useState('');
  const indexRef  = useRef(0);
  const rafRef    = useRef<number | null>(null);
  const doneRef   = useRef(false);

  useEffect(() => {
    // Reset on new text
    indexRef.current = 0;
    doneRef.current  = false;
    setDisplayed('');

    const step = () => {
      if (doneRef.current) return;
      if (indexRef.current >= text.length) {
        setDisplayed(text);
        doneRef.current = true;
        onComplete?.();
        return;
      }
      indexRef.current = Math.min(indexRef.current + speed, text.length);
      setDisplayed(text.slice(0, indexRef.current));
      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      doneRef.current = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return <>{displayed}</>;
};
