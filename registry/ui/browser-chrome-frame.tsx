'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/cn';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';

/* ==========================================================================
   Browser Chrome Frame
   --------------------------------------------------------------------------
   A macOS window drawn in CSS, wrapped around arbitrary content. It does two
   jobs that are easy to underestimate:

   1. It tells the reader "this is a live site, not a mockup". A screenshot
      floating on a page is ambiguous; a screenshot inside a title bar is not.
   2. It supplies a border. Content that bleeds into the surrounding page has
      no edge, so the eye cannot tell where the embed ends.

   The only moving parts are the two that carry information: the traffic-light
   glyphs, which appear on hover exactly as they do in a real title bar, and
   the copy confirmation, which is a checkmark that draws itself along its own
   path and holds for 1600 ms. Short confirmations get missed — that number is
   deliberately long.
   ========================================================================== */

export interface BrowserChromeFrameProps {
  /** Shown in the address pill and written to the clipboard on click. */
  url: string;
  /** The framed content. Sized by the frame, not by itself. */
  children: ReactNode;
  /**
   * Display text for the pill. Defaults to `url` with the scheme stripped,
   * which is what a browser actually shows.
   */
  label?: string;
  /** Fires after a successful clipboard write. */
  onCopy?: (url: string) => void;
  /** How long the confirmed state holds, in ms. */
  copiedDurationMs?: number;
  className?: string;
  /** Merged onto the content well, below the title bar. */
  bodyClassName?: string;
}

/* The real macOS window-button values. These are a reproduction of a specific
   piece of system chrome, not theme colours — mapping them onto the site's
   palette is what makes a frame read as "a diagram of a browser" instead of
   "a browser". They are the one place in this component where a literal hex
   is correct. */
const TRAFFIC_LIGHTS = [
  { name: 'close', fill: '#ff5f57', stroke: '#8b3029' },
  { name: 'minimise', fill: '#febc2e', stroke: '#8f6420' },
  { name: 'zoom', fill: '#28c840', stroke: '#1a6b25' },
] as const;

// #region critical
const COPIED_MS = 1600;
const DRAW_MS = 320;
const FADE_MS = 180;

type CopyState = 'idle' | 'copied' | 'failed';

export function BrowserChromeFrame({
  url,
  children,
  label,
  onCopy,
  copiedDurationMs = COPIED_MS,
  className,
  bodyClassName,
}: BrowserChromeFrameProps) {
  const [state, setState] = useState<CopyState>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduced = useReducedMotion();

  const notify = useRef(onCopy);
  notify.current = onCopy;

  const reset = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  // A pending timer outlives the component unless it is cleared. Left alone it
  // calls setState on an unmounted tree — React 19 no longer warns about that,
  // which makes it quieter, not less of a leak.
  useEffect(() => reset, [reset]);

  const copy = useCallback(() => {
    // `navigator.clipboard` is undefined outside a secure context and its
    // promise rejects when the document is not focused. Both are ordinary, so
    // the failure has a state of its own rather than a swallowed catch: a pill
    // that silently does nothing reads as a broken button.
    const write = navigator.clipboard?.writeText?.(url);
    if (!write) {
      reset();
      setState('failed');
      timer.current = setTimeout(() => setState('idle'), copiedDurationMs);
      return;
    }

    void write.then(
      () => {
        reset();
        setState('copied');
        notify.current?.(url);
        timer.current = setTimeout(() => setState('idle'), copiedDurationMs);
      },
      () => {
        reset();
        setState('failed');
        timer.current = setTimeout(() => setState('idle'), copiedDurationMs);
      },
    );
  }, [url, copiedDurationMs, reset]);

  const copied = state === 'copied';
  const failed = state === 'failed';

  // Reduced motion keeps the state change and drops only the tweening: the
  // check is already fully drawn on the frame it appears, and the two labels
  // hard-swap instead of crossfading. The confirmation is still legible for
  // the same 1600 ms — the information was never the animation.
  const drawMs = reduced ? 0 : DRAW_MS;
  const fadeMs = reduced ? 0 : FADE_MS;
  // #endregion critical

  const display = label ?? url.replace(/^https?:\/\//, '');
  const message = failed ? 'Press to copy' : 'Copied';

  return (
    <div
      className={cn(
        'flex h-full w-full flex-col overflow-hidden rounded-lg',
        'border border-line-strong bg-surface',
        'shadow-[0_18px_50px_-24px_rgb(0_0_0/0.55)]',
        className,
      )}
    >
      {/* Title bar. `group` so the whole cluster reveals its glyphs together,
          which is how the real one behaves — hovering one button lights all
          three. */}
      <div className="group flex shrink-0 items-center gap-3 border-b border-line bg-bg-subtle px-3 py-2">
        <div className="flex shrink-0 items-center gap-[6px]">
          {TRAFFIC_LIGHTS.map((light) => (
            <span
              key={light.name}
              aria-hidden
              className="grid h-[11px] w-[11px] place-items-center rounded-full"
              style={{ backgroundColor: light.fill }}
            >
              <svg
                viewBox="0 0 8 8"
                className="h-[7px] w-[7px] opacity-0 transition-opacity group-hover:opacity-100"
                style={{ transitionDuration: `${fadeMs}ms`, color: light.stroke }}
              >
                {light.name === 'close' ? (
                  <path
                    d="M2 2 L6 6 M6 2 L2 6"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    fill="none"
                  />
                ) : null}
                {light.name === 'minimise' ? (
                  <path
                    d="M1.6 4 H6.4"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    fill="none"
                  />
                ) : null}
                {light.name === 'zoom' ? (
                  <path
                    d="M2.4 5.6 V2.4 H5.6 Z"
                    fill="currentColor"
                    stroke="currentColor"
                    strokeWidth="0.6"
                  />
                ) : null}
              </svg>
            </span>
          ))}
        </div>

        <button
          type="button"
          onClick={copy}
          // The live region is the pill itself, and it is `polite`: a screen
          // reader hears "Copied" without the visual check being the only
          // signal. `aria-live` on a node that also holds the trigger is
          // fine here because the text swap is the entire announcement.
          aria-live="polite"
          className={cn(
            'group/pill relative flex min-w-0 flex-1 items-center gap-2 rounded-full',
            'border border-line bg-surface px-3 py-1',
            'text-left font-mono text-[0.6875rem] tracking-tight',
            'transition-colors hover:border-line-strong hover:bg-surface-hover',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
          )}
          style={{ transitionDuration: `${fadeMs}ms` }}
        >
          {/* Two icons stacked in one 12px box so the pill's width never
              changes between states. Swapping the element instead would
              reflow the URL text sideways on every copy. */}
          <span className="relative grid h-3 w-3 shrink-0 place-items-center">
            <svg
              viewBox="0 0 16 16"
              className="absolute h-3 w-3 transition-opacity"
              style={{
                opacity: copied ? 0 : 1,
                transitionDuration: `${fadeMs}ms`,
                color: 'currentColor',
              }}
              aria-hidden
            >
              <path
                d="M6.4 9.6a2.6 2.6 0 0 0 3.7 0l2.3-2.3a2.6 2.6 0 0 0-3.7-3.7l-.6.6M9.6 6.4a2.6 2.6 0 0 0-3.7 0L3.6 8.7a2.6 2.6 0 0 0 3.7 3.7l.6-.6"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
            <svg viewBox="0 0 16 16" className="absolute h-3 w-3" aria-hidden>
              {/* `pathLength="1"` renormalises the path to a unit length, so
                  one dash offset value works no matter how the coordinates
                  are later tweaked. Hard-coding the measured length is how
                  these animations break the first time the icon is redrawn. */}
              <path
                d="M3.2 8.6 L6.4 11.8 L12.8 4.8"
                pathLength="1"
                strokeDasharray="1"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                style={{
                  strokeDashoffset: copied ? 0 : 1,
                  transition: `stroke-dashoffset ${drawMs}ms cubic-bezier(0.22, 1, 0.36, 1)`,
                }}
              />
            </svg>
          </span>

          {/* Both labels occupy the same grid cell. The pill therefore cannot
              change size when the text changes, and the URL cannot jump. */}
          <span className="grid min-w-0 flex-1">
            <span
              className="col-start-1 row-start-1 truncate transition-opacity"
              style={{ opacity: copied || failed ? 0 : 1, transitionDuration: `${fadeMs}ms` }}
            >
              <span className="text-faint">{display.split('/')[0]}</span>
              <span className="text-muted">{display.slice((display.split('/')[0] ?? '').length)}</span>
            </span>
            <span
              className={cn(
                'col-start-1 row-start-1 truncate transition-opacity',
                failed ? 'text-muted' : 'text-accent',
              )}
              style={{
                opacity: copied || failed ? 1 : 0,
                transitionDuration: `${fadeMs}ms`,
              }}
            >
              {message}
            </span>
          </span>
        </button>
      </div>

      <div className={cn('relative min-h-0 flex-1 overflow-hidden bg-bg', bodyClassName)}>
        {children}
      </div>
    </div>
  );
}
