# Build: Pointer Palette Sampling

A surface you paint into a 2D canvas, plus a pointer that reads the pixel underneath it and snaps that read to the nearest entry in a named palette. The colour comes out as a CSS custom property on the root and as a throttled callback, so a chip can follow the cursor with no JavaScript per frame. It turns a palette from a legend you read into something you find by pointing.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Point at the artwork and it names the colour — a clamped pixel read snapped to the nearest palette entry.

- Category: cursor
- Runtime cost: canvas2d
- Dependencies: none beyond React

## How it works

1. The canvas is created with `document.createElement` inside the effect and appended to the root, not rendered with a React `ref`. `willReadFrequently` is only honoured on the first `getContext` for a given canvas, so the element and the context have to share one lifecycle — under StrictMode a rendered canvas survives the mount/unmount/remount cycle while the context does not.
2. On resize the backing store is set to `round(cssSize * min(devicePixelRatio, 2))` and the transform re-applied with `setTransform(dpr, 0, 0, dpr, 0, 0)`, in that order, because assigning `canvas.width` resets both the bitmap and the transform. The consumer's `paint` then draws in CSS pixels.
3. A `pointermove` converts client coordinates to bitmap coordinates with the canvas's own backing ratio — `canvas.width / rect.width` — rather than `devicePixelRatio`, so browser zoom and any CSS scale on an ancestor stay correct.
4. A 3x3 box centred on that pixel is clamped to `[0, canvas.width - 1]` and `[0, canvas.height - 1]`, then read in one `getImageData` call. The nine samples are averaged with alpha as the weight, so a dithered or grainy surface produces a stable colour instead of oscillating between two palette entries.
5. The average and every palette hex are converted sRGB → linear → OKLab, and the match is the smallest squared OKLab distance. Nearest-colour in raw RGB is dominated by the green channel and routinely calls a mid blue "black".
6. The match is written to `--kx-sample-color` on the root immediately, along with `--kx-sample-x` / `--kx-sample-y` in CSS pixels, and emitted through `onSample` on a throttle — position is a cursor and must not lag, colour is information and must not spam.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `willReadFrequently = true`
  A default 2D context lives in GPU memory, and each `getImageData` forces a synchronous readback that stalls the pipeline — on a pointermove that is a visible drag on the cursor. The flag moves the surface to a software backing: paint is marginally slower, reads are roughly an order of magnitude faster.
- `SAMPLE_BOX = 3`
  Odd, so the box centres on the pointer's own pixel. One pixel flickers between neighbouring palette entries over any gradient dither; 3x3 is enough to settle it, and 5x5 starts averaging across a real colour boundary so edges read as a colour that is not on screen.
- `MAX_DPR = 2`
  Sampling cost is per read and does not care, but paint cost is per pixel. A 3x display would quadruple the fill work relative to 1.5x for no perceptible gain on a flat-colour artwork.
- `throttleMs = 50`
  Matches the source. Fast enough that dragging across the artwork feels continuous, slow enough that a React consumer re-rendering a swatch on every emission stays under one render per three frames.
- `alpha weight = data[i + 3] / 255`
  Transparent pixels carry no colour but their RGB is usually zero, so an unweighted mean over a partly-transparent box returns something darker than anything visible. Weighting by alpha, and bailing when the total is zero, keeps the answer to what was actually painted.

## API

```ts
function PointerPaletteSampling(props: { palette: readonly PaletteEntry[]; paint: (ctx: CanvasRenderingContext2D, size: { width: number; height: number; dpr: number }) => void; paintKey?: string | number; onSample?: (entry: PaletteEntry | null) => void; throttleMs?: number; children?: ReactNode; className?: string }): JSX.Element
```

- `palette: readonly PaletteEntry[]`
  Named colours the read snaps to. `{ name, hex }`, `#rgb` or `#rrggbb`.
- `paint: (ctx, size) => void`
  Draws the surface. Context is pre-scaled and cleared, so draw in CSS pixels. Must not draw a cross-origin image.
- `paintKey: string | number`
  Bump to force a repaint when the painter's inputs change. The painter itself is read through a ref, so an inline arrow is safe.
- `onSample: (entry: PaletteEntry | null) => void`
  Throttled match. `null` when the pointer leaves.
- `throttleMs: number` — default `50`
  Minimum gap between emissions.
- `children: ReactNode`
  Overlay content, rendered in a positioned layer above the canvas.
- `className: string`
  Merged onto the root. Give it a size.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
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
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The canvas element is removed from the DOM in the same effect that created it, which drops the bitmap and the context with it. The four pointer listeners are removed, any pending throttle timer is cleared so no emission lands after unmount, and `data-sampling` is reset. The shared ResizeObserver unsubscribes through the hook.

**Reduced motion.** Sampling is not motion, so it keeps working: the colour still updates and `onSample` still fires. What stops is the chase — `--kx-sample-x` and `--kx-sample-y` are left parked at their initial 50% so a readout pinned to those properties stays still and simply recolours, instead of flying around the frame after the cursor.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Calling `getContext("2d")` first and adding `{ willReadFrequently: true }` later. The attributes of a canvas context are fixed at creation; the second call returns the first context and silently ignores the options, so the optimisation appears to be applied and is not.
- Reading the box unclamped. A pointer on the right or bottom edge produces a rect that overhangs the bitmap — no exception, the overhang is filled with transparent black — so the average darkens and the match snaps to the palette's darkest entry along every border.
- Letting the clamp collapse the rect. `getImageData` with a zero width or height throws `IndexSizeError`, which is what happens on a 1px-wide canvas if the box is clamped naively to a range instead of to an inclusive index pair.
- Converting with `devicePixelRatio` instead of the backing ratio. Correct at 100% zoom on a static layout, then off by the zoom factor the moment the user hits Cmd-plus, and off by the scale factor inside any transformed ancestor.
- Drawing a cross-origin image into the canvas. The canvas is tainted from that draw onward and every `getImageData` throws `SecurityError` — including for the parts of the surface you painted yourself. Paint procedurally, or serve the image same-origin with CORS.
- Matching in RGB. Euclidean distance in sRGB is not perceptual: green outweighs red and blue roughly six to one, so mid-tones snap to the wrong hue and the palette looks mislabelled rather than the maths looking wrong.
- Rendering the canvas as JSX with a `ref` and disposing the context in cleanup. Under StrictMode the element is reused across the double-invoke while the effect runs twice, so the surviving mount holds a context the first teardown already reset.
- Throttling the pointer position along with the colour. The readout then trails the cursor by the throttle window and the whole interaction reads as laggy, even though the sampling itself is instant.

## Notes

- Everything downstream is CSS. `--kx-sample-color` and `--kx-sample-x` / `--kx-sample-y` mean a chip can follow the pointer and recolour itself with no rAF and no React render.
- `data-sampling` on the root is `true` while the pointer is over the artwork, which is the hook for fading the readout in and out.
- Palette entries with an unparseable hex are dropped at match time rather than throwing, so one bad token in a design-token export does not take the interaction down.

## Definition of done

Move the pointer across the artwork: the readout recolours continuously and names a palette entry, with no stutter under a fast drag. Park the cursor exactly on the right or bottom edge — the name must not jump to the darkest colour in the palette. Zoom the browser to 150% and point at the same region; the answer is unchanged. With reduced motion on, the readout stops following the pointer but still renames itself.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
