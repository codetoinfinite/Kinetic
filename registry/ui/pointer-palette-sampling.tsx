'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { useResizeObserver } from '@/registry/hooks/use-resize-observer';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';
import { clamp } from '@/registry/lib/damp';
import { cn } from '@/lib/cn';

/* ==========================================================================
   Pointer Palette Sampling
   --------------------------------------------------------------------------
   Point at an artwork and the page tells you which palette colour that is.
   The surface is painted into a 2D canvas by the consumer, the pointer reads
   the pixel underneath it, and the read is snapped to the nearest entry in a
   named palette — so the interaction teaches the palette instead of
   documenting it.

   Three things make this harder than "call getImageData".

   The read is the expensive part. A 2D context defaults to GPU-backed
   storage, and every `getImageData` on such a context forces a readback that
   stalls the pipeline. `{ willReadFrequently: true }` opts into a software
   surface: the paint is a little slower, the read is roughly an order of
   magnitude faster, and the pointer stops feeling sticky. The flag is only
   honoured on the FIRST `getContext` call for a canvas — there is no way to
   add it later, which is one reason the canvas is created here rather than
   handed in.

   The coordinates are not the event's. `getImageData` addresses device
   pixels and ignores the context transform, while a pointer event reports CSS
   pixels relative to the viewport. The conversion uses the canvas's own
   backing ratio — `canvas.width / rect.width` — rather than
   `devicePixelRatio`, because that survives browser zoom and any CSS scale on
   an ancestor, both of which desynchronise the naive version.

   The rectangle must be clamped. A pointer sitting on the exact right or
   bottom edge produces a box that runs past the bitmap; the spec pads the
   overhang with transparent black rather than throwing, so the average silently
   drags toward black and the palette match flips to its darkest entry near
   every border. Clamping to the bitmap also guarantees a non-empty rect, which
   `getImageData` requires — a zero width or height throws IndexSizeError.
   ========================================================================== */

export interface PaletteEntry {
  name: string;
  /** `#rgb` or `#rrggbb`. */
  hex: string;
}

export interface PaintSize {
  /** CSS pixels. The context is pre-scaled, so paint in these. */
  width: number;
  height: number;
  /** Backing-store ratio already applied to the transform. */
  dpr: number;
}

export interface PointerPaletteSamplingProps {
  /** Named colours the read snaps to. Order is irrelevant; names must be unique. */
  palette: readonly PaletteEntry[];
  /**
   * Draws the sampled surface. Called with the context pre-scaled and cleared,
   * so it can work in CSS pixels. Must not draw a cross-origin image: a tainted
   * canvas makes every `getImageData` throw a SecurityError.
   */
  paint: (ctx: CanvasRenderingContext2D, size: PaintSize) => void;
  /** Bump to force a repaint when the painter's own inputs change. */
  paintKey?: string | number;
  /** Fires with the matched entry, throttled; `null` when the pointer leaves. */
  onSample?: (entry: PaletteEntry | null) => void;
  /** Milliseconds between emissions. */
  throttleMs?: number;
  /** Overlay content. Positioned above the canvas. */
  children?: ReactNode;
  className?: string;
}

/** Cap the backing store. Sampling cost is per-read, but paint cost is per-pixel. */
const MAX_DPR = 2;
/** Odd, so the box is centred on the pointer's pixel. */
const SAMPLE_BOX = 3;

type Oklab = readonly [number, number, number];

// #region critical
function parseHex(hex: string): readonly [number, number, number] | null {
  const raw = hex.trim().replace(/^#/, '');
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  const n = Number.parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function srgbToLinear(channel: number): number {
  const v = channel / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

/**
 * sRGB to OKLab. Nearest-colour in raw RGB is the usual shortcut and it is
 * wrong in a way users notice: RGB distance is dominated by green, so a mid
 * blue reads closer to black than to a lighter blue. OKLab is perceptually
 * uniform, so "nearest" means what the eye means.
 */
function rgbToOklab(r: number, g: number, b: number): Oklab {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);

  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

export function PointerPaletteSampling({
  palette,
  paint,
  paintKey,
  onSample,
  throttleMs = 50,
  children,
  className,
}: PointerPaletteSamplingProps) {
  const root = useRef<HTMLDivElement>(null);
  const { width, height } = useResizeObserver(root);
  const reduced = useReducedMotion();

  // The canvas is created imperatively rather than rendered with a `ref`.
  // Under StrictMode a rendered canvas is the same element across the
  // mount / unmount / remount cycle, so the second mount inherits a context
  // whose `willReadFrequently` was decided on the first `getContext` — and any
  // teardown that disposes the context leaves the survivor holding a dead one.
  // Owning the element per effect run makes the two lifecycles the same.
  const [surface, setSurface] = useState<{
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
  } | null>(null);

  // Read through refs so an inline painter or handler does not tear the canvas
  // down on every parent render.
  const paintRef = useRef(paint);
  const sampleRef = useRef(onSample);
  useEffect(() => {
    paintRef.current = paint;
    sampleRef.current = onSample;
  });

  /** Palette in OKLab, computed once. Entries with an unparseable hex drop out. */
  const swatches = useMemo(() => {
    const out: { entry: PaletteEntry; lab: Oklab }[] = [];
    for (const entry of palette) {
      const rgb = parseHex(entry.hex);
      if (!rgb) continue;
      out.push({ entry, lab: rgbToOklab(rgb[0], rgb[1], rgb[2]) });
    }
    return out;
  }, [palette]);

  /* Mount the canvas. */
  useEffect(() => {
    const rootEl = root.current;
    if (!rootEl) return;

    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText =
      'position:absolute;inset:0;display:block;width:100%;height:100%';

    // The one call where the flag counts.
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    rootEl.appendChild(canvas);
    setSurface({ canvas, ctx });

    return () => {
      canvas.remove();
      // Guard the swap: on a StrictMode remount the next effect has already
      // published its canvas by the time this cleanup runs in some orderings.
      setSurface((current) => (current?.canvas === canvas ? null : current));
    };
  }, []);

  /* Size and paint. */
  useEffect(() => {
    if (!surface || width <= 0 || height <= 0) return;
    const { canvas, ctx } = surface;

    const dpr = Math.min(
      typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1,
      MAX_DPR,
    );
    // Assigning width or height resets the bitmap AND the transform, so the
    // scale has to be re-applied after, never before.
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    paintRef.current(ctx, { width, height, dpr });
  }, [surface, width, height, paintKey]);

  /* Sample. */
  useEffect(() => {
    const rootEl = root.current;
    if (!rootEl || !surface || swatches.length === 0) return;
    const { canvas, ctx } = surface;

    let timer: ReturnType<typeof setTimeout> | null = null;
    let pendingIsClear = false;

    /**
     * The source's throttle, kept verbatim in behaviour: while an emission is
     * pending, a new colour is DROPPED rather than queued, so the consumer sees
     * one colour per window instead of a burst at the end of one. The single
     * exception is that a pending clear may be replaced — re-entering the
     * canvas within the window cancels the leave instead of flickering to
     * nothing and back.
     */
    const emit = (entry: PaletteEntry | null, isClear: boolean) => {
      if (timer !== null && !pendingIsClear) return;
      pendingIsClear = isClear;
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        pendingIsClear = false;
        sampleRef.current?.(entry);
      }, throttleMs);
    };

    const sampleAt = (clientX: number, clientY: number): PaletteEntry | null => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;

      // Backing ratio, not devicePixelRatio: this is still correct under
      // browser zoom and under a CSS transform on any ancestor.
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      const px = Math.round((clientX - rect.left) * scaleX);
      const py = Math.round((clientY - rect.top) * scaleY);
      const half = (SAMPLE_BOX - 1) / 2;

      // Clamp to the bitmap. An unclamped box at the right or bottom edge is
      // padded with transparent black, which pulls the average to black.
      const x0 = clamp(px - half, 0, canvas.width - 1);
      const y0 = clamp(py - half, 0, canvas.height - 1);
      const x1 = clamp(px + half, 0, canvas.width - 1);
      const y1 = clamp(py + half, 0, canvas.height - 1);
      const w = x1 - x0 + 1;
      const h = y1 - y0 + 1;
      if (w <= 0 || h <= 0) return null;

      const data = ctx.getImageData(x0, y0, w, h).data;

      // Alpha-weighted mean over the box. A single pixel flickers between two
      // palette entries on any dithered or noisy surface; nine pixels do not.
      let r = 0;
      let g = 0;
      let b = 0;
      let weight = 0;
      for (let i = 0; i + 3 < data.length; i += 4) {
        const a = (data[i + 3] ?? 0) / 255;
        if (a === 0) continue;
        r += (data[i] ?? 0) * a;
        g += (data[i + 1] ?? 0) * a;
        b += (data[i + 2] ?? 0) * a;
        weight += a;
      }
      // Fully transparent: there is no colour here, and dividing would be NaN.
      if (weight <= 0) return null;

      const lab = rgbToOklab(r / weight, g / weight, b / weight);
      let best: PaletteEntry | null = null;
      let bestDistance = Infinity;
      for (const swatch of swatches) {
        const dl = lab[0] - swatch.lab[0];
        const da = lab[1] - swatch.lab[1];
        const db = lab[2] - swatch.lab[2];
        const distance = dl * dl + da * da + db * db;
        if (distance < bestDistance) {
          bestDistance = distance;
          best = swatch.entry;
        }
      }
      return best;
    };

    const onMove = (event: PointerEvent) => {
      const entry = sampleAt(event.clientX, event.clientY);
      if (!entry) return;

      rootEl.dataset.sampling = 'true';
      rootEl.style.setProperty('--kx-sample-color', entry.hex);
      // The colour is throttled because it is information; the position is not,
      // because it is a cursor. Throttling the position makes the readout lag
      // the pointer by up to a frame budget and feel broken.
      if (!reduced) {
        const rect = canvas.getBoundingClientRect();
        rootEl.style.setProperty('--kx-sample-x', `${event.clientX - rect.left}px`);
        rootEl.style.setProperty('--kx-sample-y', `${event.clientY - rect.top}px`);
      }
      emit(entry, false);
    };

    const onLeave = () => {
      rootEl.dataset.sampling = 'false';
      emit(null, true);
    };

    // Pointer events already carry touch; `touch-action: none` on the root
    // stops a drag over the artwork from scrolling the page out from under it.
    rootEl.addEventListener('pointermove', onMove);
    rootEl.addEventListener('pointerdown', onMove);
    rootEl.addEventListener('pointerleave', onLeave);
    rootEl.addEventListener('pointercancel', onLeave);

    return () => {
      rootEl.removeEventListener('pointermove', onMove);
      rootEl.removeEventListener('pointerdown', onMove);
      rootEl.removeEventListener('pointerleave', onLeave);
      rootEl.removeEventListener('pointercancel', onLeave);
      if (timer !== null) clearTimeout(timer);
      timer = null;
      rootEl.dataset.sampling = 'false';
    };
  }, [surface, swatches, throttleMs, reduced]);
  // #endregion critical

  return (
    <div
      ref={root}
      data-sampling="false"
      className={cn('relative touch-none overflow-hidden', className)}
      style={
        {
          '--kx-sample-color': 'transparent',
          '--kx-sample-x': '50%',
          '--kx-sample-y': '50%',
        } as CSSProperties
      }
    >
      {/* The canvas is absolutely positioned, so it paints above static
          siblings no matter where it is inserted. Overlay content needs its own
          positioned layer to sit on top of the artwork. */}
      <div className="relative z-10 h-full w-full">{children}</div>
    </div>
  );
}
