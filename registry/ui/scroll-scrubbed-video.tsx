'use client';

import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { useInView } from '@/registry/hooks/use-in-view';
import { useRaf } from '@/registry/hooks/use-raf';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';
import { useResizeObserver } from '@/registry/hooks/use-resize-observer';
import { clamp, damp, perFrameToSmoothing } from '@/registry/lib/damp';
import { cn } from '@/lib/cn';

/* ==========================================================================
   Scroll-Scrubbed Video
   --------------------------------------------------------------------------
   The hard part of a scroll-scrubbed hero is not playing the video. It is
   the mapping and the throttle:

     - scroll position -> a smoothed, snapping progress value
     - progress -> a frame, quantised, so the same frame is never requested
       twice in a row
     - a loop that parks itself once the two agree, instead of running
       forever at 60 Hz over a still image

   Get those three right and the video part is one line. Get them wrong and
   no amount of encoding work saves it: the playhead judders, the decoder is
   asked to seek to a position it is already at several times a second, and
   the tab burns a core while nothing on screen changes.

   So this component ships the mapping, and draws its frames procedurally
   onto a canvas rather than shipping a video file. `draw(ctx, frame)` is
   called only on the frames that actually change. In a real implementation
   that call is replaced by one assignment:

     video.currentTime = frame.progress * (video.duration - 0.05);

   guarded by the same "has the frame changed" test used here.
   ========================================================================== */

export interface ScrubPalette {
  bg: string;
  surface: string;
  fg: string;
  muted: string;
  line: string;
  accent: string;
}

export interface ScrubFrame {
  /** Smoothed scroll progress, 0-1. */
  progress: number;
  /** `progress` quantised to `frames` steps — the thing that gates a redraw. */
  index: number;
  frames: number;
  /** CSS pixels. The context is already scaled by device pixel ratio. */
  width: number;
  height: number;
  palette: ScrubPalette;
}

export type ScrubDraw = (ctx: CanvasRenderingContext2D, frame: ScrubFrame) => void;

export interface ScrollScrubbedVideoProps {
  /** How many discrete frames the scroll range quantises to. */
  frames?: number;
  /** Called only when the frame index changes, or after a resize. */
  draw?: ScrubDraw;
  /** Scroll travel as a multiple of the scroller height. */
  viewports?: number;
  /** Fraction of the progress gap left after one second. */
  smoothing?: number;
  /** Overlaid on the canvas — captions, a scrubber, a title. */
  children?: ReactNode;
  /** Scroll container. Omit to auto-detect the nearest scrollable ancestor. */
  scroller?: RefObject<HTMLElement | null>;
  className?: string;
}

/** Below this, the playhead is treated as having arrived. See `SNAP` in the meta. */
const SNAP = 0.0002;
/** Lenis-style `0.12` per frame at 60 Hz, converted to a per-second constant. */
const DEFAULT_SMOOTHING = perFrameToSmoothing(0.12);
const MAX_DPR = 2;
const TAU = Math.PI * 2;

const SCROLLABLE = /(auto|scroll|overlay)/;

function nearestScroller(el: HTMLElement): HTMLElement {
  let node = el.parentElement;
  while (node) {
    if (SCROLLABLE.test(getComputedStyle(node).overflowY)) return node;
    node = node.parentElement;
  }
  return document.documentElement;
}

function readPalette(el: HTMLElement): ScrubPalette {
  const style = getComputedStyle(el);
  const get = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return {
    bg: get('--k-bg', '#0a0a0a'),
    surface: get('--k-surface', '#1a1a1a'),
    fg: get('--k-fg', '#f2f2f2'),
    muted: get('--k-fg-muted', '#9a9a9a'),
    line: get('--k-line', 'rgba(255,255,255,0.08)'),
    accent: get('--k-accent', '#6aa6ff'),
  };
}

/**
 * Stand-in for the decoded frame: a camera push over three parallax ridges
 * with the light rising through the shot. Deterministic in `progress`, so
 * scrubbing backwards reproduces the frame exactly, which is the property a
 * real all-intra encode is chosen for.
 */
function defaultDraw(ctx: CanvasRenderingContext2D, frame: ScrubFrame): void {
  const { progress, width, height, palette, index, frames } = frame;

  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, width, height);

  const disc = Math.min(width, height) * 0.17;
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  ctx.arc(width * 0.5, height * (0.82 - progress * 0.5), disc, 0, TAU);
  ctx.fill();

  for (let layer = 0; layer < 3; layer += 1) {
    const depth = (layer + 1) / 3;
    const shift = progress * width * 0.75 * depth;
    const baseline = height * (0.56 + 0.13 * layer);
    const amp = height * 0.055 * (1 + layer * 0.5);

    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = 0; x <= width; x += 6) {
      const t = (x + shift) / (width * 0.55);
      const y =
        baseline + Math.sin(t * TAU + layer) * amp + Math.sin(t * TAU * 2.3 + layer * 2) * amp * 0.3;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.globalAlpha = 0.55 + layer * 0.15;
    ctx.fillStyle = layer === 2 ? palette.bg : palette.surface;
    ctx.fill();
  }

  // A visible frame counter: the point of the technique is that this number
  // changes in steps while the scroll moves continuously.
  ctx.globalAlpha = 1;
  ctx.fillStyle = palette.muted;
  ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillText(`${String(index + 1).padStart(3, '0')} / ${frames}`, 16, height - 16);
}

// #region critical
export function ScrollScrubbedVideo({
  frames = 96,
  draw = defaultDraw,
  viewports = 2,
  smoothing = DEFAULT_SMOOTHING,
  children,
  scroller,
  className,
}: ScrollScrubbedVideoProps) {
  const section = useRef<HTMLElement>(null);
  const pin = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  const current = useRef(0);
  const drawnIndex = useRef(-1);
  const lastProgress = useRef('');
  const lastHeight = useRef(0);
  const palette = useRef<ScrubPalette | null>(null);
  const drawRef = useRef(draw);
  drawRef.current = draw;

  const reduced = useReducedMotion();
  const size = useResizeObserver(pin);
  // Work starts 200 px before the section enters, so the first frame is
  // already painted when it arrives rather than after it.
  const { inView } = useInView(section, { rootMargin: '200px' });

  // A self-parking loop. Once the smoothed value has reached the target there
  // is nothing left to compute, so the subscription is dropped entirely; a
  // scroll on the container wakes it. Without this, a settled hero keeps a
  // core busy re-deriving the same frame index sixty times a second.
  const [awake, setAwake] = useState(true);

  const render = (index: number, progress: number) => {
    const el = canvas.current;
    const ctx = el?.getContext('2d');
    if (!el || !ctx || size.width === 0 || size.height === 0) return;
    if (!palette.current) palette.current = readPalette(el);

    drawnIndex.current = index;
    ctx.save();
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawRef.current(ctx, {
      progress,
      index,
      frames,
      width: size.width,
      height: size.height,
      palette: palette.current,
    });
    ctx.restore();
  };

  useEffect(() => {
    const el = canvas.current;
    if (!el || size.width === 0 || size.height === 0) return;
    // The backing store is sized in device pixels and the element in CSS
    // pixels; assigning width/height also clears it, so a redraw is forced.
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    el.width = Math.round(size.width * dpr);
    el.height = Math.round(size.height * dpr);
    palette.current = readPalette(el);
    drawnIndex.current = -1;
    setAwake(true);
  }, [size.width, size.height]);

  useEffect(() => {
    const sectionEl = section.current;
    if (!sectionEl) return;
    const host = scroller?.current ?? nearestScroller(sectionEl);
    const target = host === document.documentElement ? window : host;
    const wake = () => setAwake(true);
    target.addEventListener('scroll', wake, { passive: true });
    return () => target.removeEventListener('scroll', wake);
  }, [scroller]);

  // The manufactured range is layout, so it is written on mount and on resize
  // rather than only from the loop — a section still below the fold must
  // already occupy its full height, or entering it shifts everything below.
  useEffect(() => {
    const sync = () => {
      const sectionEl = section.current;
      const pinEl = pin.current;
      if (!sectionEl || !pinEl) return;
      const host = scroller?.current ?? nearestScroller(sectionEl);
      const hostHeight =
        host === document.documentElement ? window.innerHeight : host.clientHeight;
      if (hostHeight === 0) return;
      const total = Math.round(hostHeight * (reduced ? 1 : 1 + viewports));
      if (total === lastHeight.current) return;
      lastHeight.current = total;
      sectionEl.style.height = `${total}px`;
      pinEl.style.height = `${hostHeight}px`;
      setAwake(true);
    };
    sync();
    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }, [reduced, viewports, scroller]);

  useRaf((dt) => {
    const sectionEl = section.current;
    const pinEl = pin.current;
    if (!sectionEl || !pinEl) return;

    const host = scroller?.current ?? nearestScroller(sectionEl);
    const hostIsRoot = host === document.documentElement;
    const hostTop = hostIsRoot ? 0 : host.getBoundingClientRect().top;
    const hostHeight = hostIsRoot ? window.innerHeight : host.clientHeight;
    if (hostHeight === 0) return;

    const total = Math.round(hostHeight * (reduced ? 1 : 1 + viewports));
    if (total !== lastHeight.current) {
      lastHeight.current = total;
      sectionEl.style.height = `${total}px`;
      pinEl.style.height = `${hostHeight}px`;
    }

    const travel = total - hostHeight;
    const target = reduced
      ? 0.5
      : travel > 0
        ? clamp((hostTop - sectionEl.getBoundingClientRect().top) / travel, 0, 1)
        : 0;

    // Smooth, then snap. Without the snap the value approaches the target
    // asymptotically and the loop can never decide it has arrived.
    current.current = reduced ? target : damp(current.current, target, smoothing, dt);
    let settled = false;
    if (Math.abs(target - current.current) < SNAP) {
      current.current = target;
      settled = true;
    }

    const text = current.current.toFixed(4);
    if (text !== lastProgress.current) {
      lastProgress.current = text;
      sectionEl.style.setProperty('--scrub-progress', text);
    }

    // The seek throttle. A real player writes `video.currentTime` here, and
    // only when the frame actually changed — re-seeking to the frame already
    // displayed makes the decoder stall and the playhead judder.
    const index = clamp(Math.round(current.current * (frames - 1)), 0, frames - 1);
    if (index !== drawnIndex.current) render(index, current.current);

    if (settled) setAwake(false);
  }, awake && inView);
  // #endregion critical

  return (
    <section ref={section} className={cn('relative w-full', className)}>
      <div ref={pin} className="sticky top-0 w-full overflow-hidden">
        <canvas ref={canvas} className="block h-full w-full" aria-hidden />
        {children}
      </div>
    </section>
  );
}
