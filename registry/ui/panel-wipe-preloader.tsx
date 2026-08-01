'use client';

import gsap from 'gsap';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { useGsap } from '@/registry/hooks/use-gsap';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';

/* ==========================================================================
   Staggered Panel Wipe
   --------------------------------------------------------------------------
   A preloader whose count, word list and exit all live on ONE timeline, so
   they cannot drift apart:

     0.0 - 1.6   counter tweens 0 -> 100 on power2.inOut
     0.0 - 1.6   five words `set` at computed times, 320 ms apart
     1.6 - 2.1   content leaves: yPercent -120, opacity 0
     1.9 - 2.8   five panels collapse upward, 0.08 s apart, power4.inOut

   The counter is a tween on a plain object with `onUpdate` writing
   `textContent`. That is how you get an EASED number: it starts slowly,
   races through the middle and settles gently on 100. A linear counter reads
   as a progress bar in disguise; this reads as loading.
   ========================================================================== */

export interface PanelWipePreloaderProps {
  /** Words shown under the counter, spread evenly across the count. */
  words?: string[];
  /** Number of collapsing columns. */
  panels?: number;
  /** Seconds the counter takes to reach 100. */
  countDuration?: number;
  /** Called when the last panel has finished collapsing. */
  onDone?: () => void;
  position?: 'fixed' | 'absolute';
  className?: string;
}

const CONTENT_DURATION = 0.5;
const PANEL_DURATION = 0.9;
const PANEL_STAGGER = 0.08;
const PANEL_OVERLAP = 0.2;

// #region critical
export function PanelWipePreloader({
  words = ['Assets', 'Type', 'Shaders', 'Layout', 'Ready'],
  panels = 5,
  countDuration = 1.6,
  onDone,
  position = 'fixed',
  className,
}: PanelWipePreloaderProps) {
  const root = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const counter = useRef<HTMLSpanElement>(null);
  const word = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const [gone, setGone] = useState(false);

  const done = useRef(onDone);
  done.current = onDone;

  useGsap(
    gsap,
    () => {
      const el = root.current;
      const contentEl = content.current;
      const counterEl = counter.current;
      const wordEl = word.current;
      if (!el || !contentEl || !counterEl || !wordEl) return;

      const columns = Array.from(el.querySelectorAll<HTMLElement>('[data-wipe-panel]'));

      if (reduced) {
        counterEl.textContent = '100';
        wordEl.textContent = words[words.length - 1] ?? '';
        setGone(true);
        done.current?.();
        return;
      }

      const count = { v: 0 };
      const tl = gsap.timeline({
        onComplete: () => {
          setGone(true);
          done.current?.();
        },
      });

      tl.to(count, {
        v: 100,
        duration: countDuration,
        ease: 'power2.inOut',
        onUpdate: () => {
          counterEl.textContent = String(Math.round(count.v)).padStart(3, '0');
        },
      });

      // Positioned on the SAME timeline as the counter, at computed times, so
      // the words stay locked to the number no matter how the timeline is
      // retimed, paused or seeked.
      const step = countDuration / Math.max(words.length, 1);
      words.forEach((w, i) => {
        tl.set(wordEl, { textContent: w }, i * step);
      });

      tl.to(contentEl, {
        yPercent: -120,
        opacity: 0,
        duration: CONTENT_DURATION,
        ease: 'power3.inOut',
      });

      if (columns.length > 0) {
        // transformOrigin top + scaleY 0 retracts each column upward like a
        // blind. The -0.2 overlap fuses the wipe with the tail of the content
        // exit so the two read as one gesture.
        tl.to(
          columns,
          {
            scaleY: 0,
            transformOrigin: 'top',
            duration: PANEL_DURATION,
            ease: 'power4.inOut',
            stagger: PANEL_STAGGER,
          },
          `-=${PANEL_OVERLAP}`,
        );
      }
    },
    root,
    [reduced],
  );
  // #endregion critical

  // Removed only after the timeline reports completion, so nothing is ever
  // unmounted out from under a running tween.
  if (gone) return null;

  return (
    <div
      ref={root}
      aria-hidden
      className={cn(
        'z-50 overflow-hidden',
        position === 'fixed' ? 'fixed inset-0' : 'absolute inset-0',
        className,
      )}
    >
      <div className="absolute inset-0 flex">
        {Array.from({ length: panels }, (_, i) => (
          <div
            key={i}
            data-wipe-panel
            className="h-full flex-1 border-r border-line bg-surface last:border-r-0"
          />
        ))}
      </div>

      <div
        ref={content}
        className="absolute inset-0 flex flex-col items-center justify-center gap-2"
      >
        <span ref={counter} className="font-mono text-5xl leading-none tracking-tight text-fg">
          000
        </span>
        <span ref={word} className="meta text-accent">
          {words[0] ?? ''}
        </span>
      </div>
    </div>
  );
}
