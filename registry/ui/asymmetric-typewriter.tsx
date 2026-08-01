'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';
import { StepEndCaret } from '@/registry/ui/step-end-caret';

/* ==========================================================================
   Asymmetric Typewriter
   --------------------------------------------------------------------------
   Deleting runs at exactly half the interval of typing. That asymmetry is the
   entire effect. Backspacing is a key held down — a mechanical auto-repeat, so
   it is fast and even. Typing is composition, so it is slower. Give the two
   phases the same interval and the result reads as a ticker tape rather than
   as somebody at a keyboard.

   The second load-bearing beat is the pause at empty. Without it the string
   bottoms out at zero characters and immediately rebounds, which looks like a
   dropped frame. A quarter of a second of nothing reads as a decision.

   Timing is a chain of `setTimeout`s, not `setInterval`: every phase has its
   own interval and the boundaries between them are pauses, which a fixed
   interval cannot express without a counter and a modulo.
   ========================================================================== */

export interface AsymmetricTypewriterProps {
  /** Cycled in order, forever. Index 0 is also the server-rendered string. */
  phrases: string[];
  /** ms between characters while typing. */
  typeMs?: number;
  /** ms between characters while deleting. Half of `typeMs` by convention. */
  deleteMs?: number;
  /** ms to hold a completed phrase. */
  holdMs?: number;
  /** ms to hold the empty string between phrases. */
  emptyMs?: number;
  /** ms before the very first deletion. Longer, so the page can settle. */
  startDelayMs?: number;
  /** Render the blinking caret. */
  caret?: boolean;
  className?: string;
}

// #region critical
const TYPE_MS = 70;
const DELETE_MS = 35;
const HOLD_MS = 1500;
const EMPTY_MS = 250;
const START_DELAY_MS = 1500;

export function AsymmetricTypewriter({
  phrases,
  typeMs = TYPE_MS,
  deleteMs = DELETE_MS,
  holdMs = HOLD_MS,
  emptyMs = EMPTY_MS,
  startDelayMs = START_DELAY_MS,
  caret = true,
  className,
}: AsymmetricTypewriterProps) {
  const reduced = useReducedMotion();

  // An array prop is a fresh reference on every parent render. Keying on the
  // joined string is what stops the effect tearing down and restarting each
  // time — which would pin the typewriter to its first character forever.
  // NUL is the delimiter because real phrases contain spaces and commas, and
  // a separator that occurs in the data silently splits one phrase into two.
  const key = phrases.join('\u0000');
  const list = useMemo(() => key.split('\u0000'), [key]);

  const [shown, setShown] = useState(() => list[0] ?? '');
  const [busy, setBusy] = useState(false);
  const timer = useRef(0);

  useEffect(() => {
    const first = list[0] ?? '';
    if (reduced || list.length < 2) {
      setShown(first);
      setBusy(false);
      return;
    }

    let index = 0;
    let text = first;
    setShown(text);

    const at = (fn: () => void, ms: number) => {
      timer.current = window.setTimeout(fn, ms);
    };

    const erase = () => {
      if (text.length === 0) {
        // The beat. Caret goes back to blinking because nothing is happening.
        setBusy(false);
        at(advance, emptyMs);
        return;
      }
      text = text.slice(0, -1);
      setShown(text);
      at(erase, deleteMs);
    };

    const advance = () => {
      index = (index + 1) % list.length;
      setBusy(true);
      at(type, typeMs);
    };

    const type = () => {
      const target = list[index] ?? '';
      if (text.length >= target.length) {
        setBusy(false);
        at(beginErase, holdMs);
        return;
      }
      // Slice the target rather than concatenating a looked-up character:
      // `target[i]` is `string | undefined` and the slice cannot desync from
      // the source string if the phrase list changes underneath.
      text = target.slice(0, text.length + 1);
      setShown(text);
      at(type, typeMs);
    };

    const beginErase = () => {
      setBusy(true);
      erase();
    };

    at(beginErase, startDelayMs);

    return () => {
      window.clearTimeout(timer.current);
    };
  }, [list, reduced, typeMs, deleteMs, holdMs, emptyMs, startDelayMs]);
  // #endregion critical

  // Longest phrase, drawn transparent, reserves the box. Without it every
  // element after the typewriter slides left and right forever.
  const longest = list.reduce((a, b) => (b.length > a.length ? b : a), '');

  return (
    <span className={cn('inline-grid', className)}>
      <span
        aria-hidden
        className="col-start-1 row-start-1 select-none whitespace-pre text-transparent"
      >
        {longest}
      </span>
      {/* `whitespace-pre` so a phrase erased back to "Product " keeps its
          trailing space and the caret does not jump a character left. */}
      <span className="col-start-1 row-start-1 justify-self-start whitespace-pre">
        {shown}
        {caret ? <StepEndCaret paused={busy} className="ml-[0.1em]" /> : null}
      </span>
    </span>
  );
}
