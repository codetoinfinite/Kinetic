# Build: Lenis On The GSAP Ticker

Lenis and ScrollTrigger each work alone and tear together, because each runs its own clock: Lenis advances the scroll position on its rAF, ScrollTrigger samples it on GSAP's, and a pinned section ends up a frame behind the page it is pinned to. Mounted once near the root, this hands Lenis to `gsap.ticker`, updates ScrollTrigger on Lenis's scroll event rather than per frame, and disables lag smoothing so the two agree about how much time passed.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Smooth scroll and ScrollTrigger on one clock, with the lag-smoothing line everyone omits.

- Category: scroll
- Runtime cost: dom
- Dependencies: gsap@^3.15.0, lenis@^1.3.11

## How it works

1. Lenis is driven by `gsap.ticker.add((t) => lenis.raf(t * 1000))` — seconds to milliseconds — and its own `autoRaf` is switched off. One clock advances the scroll position and the tweens, in that order, every frame.
2. `gsap.ticker.lagSmoothing(0)` is the line that makes it correct rather than merely working. GSAP normally clamps a large `deltaTime` after a stall so tweens do not jump; but that clamped value is now what Lenis integrates, so an under-reported frame leaves Lenis's scroll position permanently offset from ScrollTrigger's idea of it. Nothing resyncs them afterwards.
3. ScrollTrigger is updated from `lenis.on("scroll")`, not from the ticker. It then samples on the same tick the position actually changed, instead of one frame after — the difference is visible as a shimmering seam at the top edge of a pin.
4. `paused` calls `lenis.stop()` and `lenis.start()` rather than tearing the instance down. This is the preloader gate: construct on mount so everything is measured and ready, but refuse wheel input until the intro clears — which is why you cannot scroll during a well-built intro sequence.
5. Coming out of `paused`, and again on `load` and on `document.fonts.ready`, `ScrollTrigger.refresh()` re-measures. Images and fonts change document height after hydration, and every trigger below the fold was computed against the old one.
6. The instance itself is refcounted at module scope in `use-lenis`, so mounting the provider twice — a layout and a page, say — reuses one Lenis instead of creating two that both `preventDefault` on wheel and scroll the page at double speed.
7. Under `prefers-reduced-motion` no instance is constructed at all. The page scrolls natively and ScrollTrigger reads the native position, which is the path it is already correct on.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `duration = 1.05`
  Seconds for a wheel step to settle. Roughly the feel of Lenis's `lerp: 0.09`, which is the value most award-site builds land on: slow enough to read as smooth, fast enough that a trackpad flick does not feel like it is dragging the page through syrup. Past ~1.4 the page feels detached from the hand.
- `easing = 1.001 - 2^(-10t)`
  Lenis's own default — an exponential decay that is ~99.9 percent settled at t=1, so the tail never visibly crawls. The `1.001` guarantees it reaches exactly 1 rather than approaching it forever.
- `lagSmoothing = 0`
  Disabled, not tuned. Any non-zero threshold means GSAP will eventually report a deltaTime that did not happen, and Lenis will integrate it into a scroll position that does not match the document.
- `ScrollTrigger.update trigger = lenis scroll event`
  One update per position change, on the tick it changed. Calling it from the ticker instead costs an update on frames where nothing moved and delivers a stale position on frames where it did.

## API

```ts
function LenisGsapTicker(props: { children?: ReactNode; duration?: number; easing?: (t: number) => number; paused?: boolean; enabled?: boolean }): JSX.Element
```

- `children: ReactNode`
  Rendered as-is; the provider adds no DOM of its own.
- `duration: number` — default `1.05`
  Seconds for a wheel step to settle.
- `easing: (t: number) => number`
  Decay curve. Must be a stable reference — define it at module scope.
- `paused: boolean` — default `false`
  Holds input via `lenis.stop()` without destroying the instance. Releasing it also refreshes ScrollTrigger.
- `enabled: boolean` — default `true`
  False restores native scrolling and constructs nothing.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function LenisGsapTicker({
  children,
  duration = 1.05,
  easing = DEFAULT_EASING,
  paused = false,
  enabled = true,
}: LenisGsapTickerProps) {
  const reduced = useReducedMotion();
  // Smooth scrolling is the motion. Under `prefers-reduced-motion` the
  // instance is never built at all, so the page scrolls natively and
  // ScrollTrigger reads the native position — which it already does correctly.
  const active = enabled && !reduced;

  const lenis = useLenis({
    duration,
    easing,
    smoothWheel: true,
    enabled: active,
    // One clock. `useLenis` turns off Lenis's `autoRaf` when a ticker is
    // present and calls `lagSmoothing(0)` on it.
    ticker: gsap.ticker,
    // Sampled on scroll rather than every frame: ScrollTrigger then updates on
    // the same tick the position changed, instead of one frame later.
    onScroll: () => ScrollTrigger.update(),
  });

  useEffect(() => {
    const instance = lenis.current;
    if (!instance) return;
    if (paused) {
      instance.stop();
      return;
    }
    instance.start();
    // Whatever was covering the page while paused was almost certainly holding
    // layout at a different height.
    ScrollTrigger.refresh();
  }, [lenis, paused]);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const refresh = () => {
      if (!cancelled) ScrollTrigger.refresh();
    };

    // Images and fonts change document height after hydration. Without a
    // refresh here, every trigger below the fold is measured against a height
    // that no longer exists, and they all fire early by the difference.
    if (document.readyState === 'complete') refresh();
    else window.addEventListener('load', refresh, { once: true });
    void document.fonts?.ready.then(refresh);

    return () => {
      cancelled = true;
      window.removeEventListener('load', refresh);
    };
  }, [active]);
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** `use-lenis` removes its scroll listener, removes the update function from `gsap.ticker`, and destroys the instance only when the last consumer unmounts. The provider removes its own `load` listener and guards the `document.fonts.ready` continuation with a cancelled flag, so a refresh cannot land after unmount.

**Reduced motion.** No Lenis instance is constructed when `prefers-reduced-motion: reduce` matches, so scrolling is entirely native and the ticker is left alone. ScrollTrigger keeps working against the native position. The query is live: toggling the OS setting takes effect on the next render without a reload.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Leaving lag smoothing at its default. Everything looks right until the first stall — a heavy image decode, a devtools pause — after which pinned sections sit permanently a few pixels off and no interaction resyncs them.
- Letting Lenis keep `autoRaf` while also adding it to the ticker. It then advances twice per frame: scrolling runs at double speed and the smoothing constant no longer means anything.
- Mounting the provider in two places. Two instances both listen on `wheel`, both call `preventDefault`, and the page moves twice as far as the gesture — the refcount in `use-lenis` exists specifically to make the second mount a no-op.
- Calling `ScrollTrigger.update` from the ticker instead of from the scroll event. Triggers lag the smoothed position by exactly one frame, which is most visible as a seam that shivers at the top of a pinned section.
- Skipping `ScrollTrigger.refresh()` after `load` and after fonts settle. Every trigger below the fold is measured against a document height that no longer exists, so they all fire early by the difference.
- Passing an inline arrow as `easing`. It is a new identity every render, so the effect that owns the instance tears Lenis down and rebuilds it on each one — visible as scroll position snapping to the top mid-gesture.
- Smooth-scrolling a subtree by mounting a second window-level Lenis. Lenis attaches to the window unless given an explicit wrapper; a nested instance fights the outer one for the same wheel events.

## Notes

- The preview does not mount an enabled instance. `useLenis` attaches to the window, and a window-level smooth scroll inside a documentation page would take over the page hosting the preview rather than the preview. The demo therefore shows the provider mounted with `enabled={false}` beside a local reproduction: the right-hand column is offset by the same exponential filter Lenis applies, the left is the raw native position, and the bar at the bottom is the instantaneous gap between them. The ticker wiring itself is exactly as shipped.
- The demo derives its filter constant with `perFrameToSmoothing(0.09)` from `lib/damp`, which converts Lenis's per-frame `lerp` into the per-second constant `damp` wants. That conversion is the same one that makes any ported per-frame easing frame-rate independent.
- Mount above everything that registers a ScrollTrigger. Triggers created before the ticker wiring exists still work, but they are measured against a document that has not yet been refreshed.
- Smooth scroll is a preference, not an improvement. Ship the `enabled` escape hatch and honour reduced motion — a real fraction of users find hijacked scrolling nauseating.

## Definition of done

Scrolling is smoothed and a pinned section stays welded to the page with no shivering seam at its top edge. Pause during a stall — hold a devtools breakpoint for a second — and on release the pin is still aligned. Mounting the provider twice does not double scroll speed. With reduced motion on, scrolling is native and ScrollTrigger still fires at the right positions.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
