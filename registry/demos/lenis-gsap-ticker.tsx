'use client';

import { useRef } from 'react';
import { LenisGsapTicker } from '@/registry/ui/lenis-gsap-ticker';
import { useRaf } from '@/registry/hooks/use-raf';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';
import { clamp, damp, perFrameToSmoothing } from '@/registry/lib/damp';

const ROWS = Array.from({ length: 16 }, (_, i) => i);

/** Lenis's `lerp: 0.09` per frame at 60 Hz, expressed as a per-second constant. */
const SMOOTHING = perFrameToSmoothing(0.09);

/**
 * The preview cannot mount a real Lenis: `useLenis` attaches to the window, and
 * a window-level smooth scroll inside a documentation page would take over the
 * page hosting it. So the right-hand column is driven by the same exponential
 * filter Lenis applies to the scroll position — the left column is the raw
 * native position for comparison. Everything the component does with GSAP's
 * ticker is real and is described in the meta; only the input is local.
 */
export default function Demo() {
  const scroller = useRef<HTMLDivElement>(null);
  const smoothCol = useRef<HTMLDivElement>(null);
  const gauge = useRef<HTMLDivElement>(null);
  const smoothed = useRef(0);
  const reduced = useReducedMotion();

  useRaf((dt) => {
    const el = scroller.current;
    const col = smoothCol.current;
    if (!el || !col) return;

    const top = el.scrollTop;
    smoothed.current = reduced ? top : damp(smoothed.current, top, SMOOTHING, dt);
    const lag = top - smoothed.current;

    col.style.transform = `translate3d(0, ${lag.toFixed(1)}px, 0)`;
    gauge.current?.style.setProperty('--lag', clamp(Math.abs(lag) / 48, 0, 1).toFixed(3));
  });

  return (
    // Mounted disabled: this is the composition the component is for, but an
    // enabled instance would smooth the documentation page, not the preview.
    <LenisGsapTicker enabled={false}>
      <div className="relative h-full w-full bg-bg">
        <div ref={scroller} className="scrollbar-none h-full w-full overflow-y-auto">
          <div className="grid grid-cols-2 gap-px bg-line pt-12">
            <div className="bg-bg">
              {ROWS.map((i) => (
                <Row key={i} i={i} />
              ))}
            </div>
            <div className="overflow-hidden bg-bg">
              <div ref={smoothCol} className="will-change-transform">
                {ROWS.map((i) => (
                  <Row key={i} i={i} accent />
                ))}
              </div>
            </div>
          </div>
        </div>

        <header className="pointer-events-none absolute inset-x-0 top-0 grid grid-cols-2 gap-px border-b border-line bg-bg/85 backdrop-blur-sm">
          <p className="meta px-4 py-3">Native</p>
          <p className="meta px-4 py-3 text-accent">Lenis</p>
        </header>

        <div
          ref={gauge}
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-line"
        >
          <div
            className="h-full origin-left bg-accent"
            style={{ transform: 'scaleX(var(--lag, 0))' }}
          />
        </div>
      </div>
    </LenisGsapTicker>
  );
}

function Row({ i, accent }: { i: number; accent?: boolean }) {
  return (
    <div className="flex items-center gap-3 border-b border-line px-4 py-5">
      <span className="meta tabular-nums">{String(i + 1).padStart(2, '0')}</span>
      <span
        className={accent ? 'h-px flex-1 bg-accent/50' : 'h-px flex-1 bg-line-strong'}
        style={{ maxWidth: `${30 + ((i * 37) % 60)}%` }}
      />
    </div>
  );
}
