# Build: Knockout Zoom Pin

A sticky section holds a single word while a manufactured scroll range plays a zoom out: the word starts several screens wide, showing a gradient through its letters, and settles into a normal headline position. No library — the progress is read from the sticky section's own rect, smoothed exponentially in wall-clock time, and written as one composited transform per changed frame.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A word the size of the screen shrinks into a headline as you scroll, with the scene showing through its letters.

- Category: scroll
- Runtime cost: dom
- Dependencies: none beyond React

## How it works

1. The scroll range is manufactured from the scroller's own height: the section is sized `hostHeight * (1 + viewports)` in pixels and the sticky child is sized `hostHeight`, so the leftover is exactly the pin duration. Pixels, not `vh`, because inside a scrollable box viewport units describe the wrong element.
2. Progress is `(hostTop - sectionTop) / (total - hostHeight)`, clamped. It comes from `getBoundingClientRect()` on the frame it is used, so it stays correct through resizes, font swaps and layout shifts with nothing to invalidate.
3. The raw progress is smoothed with `damp(smoothed, target, smoothing, dt)` — `x + (t - x) * (1 - s^dt)` — so the settle takes the same wall-clock time at 60 and 144 Hz. The per-frame form (`x += (t - x) * 0.1`) converges more than twice as fast on a high-refresh display.
4. Scale and position use different curves on purpose. Scale is `cover - (cover - 1) * easeOutCubic(L)`, front-loading the shrink; the recentre is `easeInCubic(L)`, which keeps the word centred until it is small enough for its position to mean anything.
5. The transform is built as a string, rounded to 4 decimals of scale and 0.1 px of translate, and compared with the previous frame's string. Unchanged frames skip the DOM write entirely, which at both ends of the range is most of them.
6. The letters are a window rather than a fill: `background-clip: text` with a transparent colour, so the gradient behind them scales with the word and the section reads as cut out of the page.
7. The word is sized in `cqw` against a `container-type: inline-size` pin box, so the component is identical in a 320 px preview card and a full-bleed page without a single breakpoint.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `cover = 7`
  Scale at progress 0 — enough that only the counters of one or two letters are on screen, so the opening frame reads as texture and the reveal of the word is the payoff. Below ~4 the word is legible immediately and there is nothing to reveal.
- `viewports = 1.6`
  Scroll travel as a multiple of the scroller height. Under ~1 the zoom is over before it registers; past ~2.5 the pin outstays its welcome and users start scrolling hard to escape it.
- `smoothing = 0.0067`
  Fraction of the gap remaining after one second — `e^-5`, i.e. the familiar `1 - exp(-5 * dt)` filter. It removes trackpad and wheel-step judder without the word feeling detached from the hand. At 0.05 the lag is visible as rubberiness.
- `rest = -0.3`
  Final vertical position as a fraction of the pinned box: three tenths above centre, which is where a display headline sits when body copy follows it.
- `veil window = progress 0.45 → 0.95`
  When the content behind fades up. Earlier and it competes with a word still too large to read past; later and it arrives after the motion has stopped, which reads as a second, unrelated event.
- `write quantisation = 4 dp scale, 0.1 px translate`
  Below a tenth of a device pixel nothing changes on screen, so the comparison lets idle frames cost one string build and one comparison instead of a style write and a composite.

## API

```ts
function KnockoutZoomPin(props: { children: ReactNode; behind?: ReactNode; cover?: number; viewports?: number; smoothing?: number; rest?: number; scroller?: RefObject<HTMLElement | null>; className?: string }): JSX.Element
```

- `children: ReactNode`
  The word. Kept on one line — it is a display element.
- `behind: ReactNode`
  Content faded up behind the word as it settles.
- `cover: number` — default `7`
  Scale at progress 0.
- `viewports: number` — default `1.6`
  Scroll travel as a multiple of the scroller height.
- `smoothing: number` — default `0.0067`
  Fraction of the gap left after one second.
- `rest: number` — default `-0.3`
  Final vertical position as a fraction of the pinned box height.
- `scroller: RefObject<HTMLElement | null>`
  Scroll container. Omit to auto-detect the nearest scrollable ancestor.
- `className: string`
  Merged onto the outer section.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function KnockoutZoomPin({
  children,
  behind,
  cover = 7,
  viewports = 1.6,
  smoothing = 0.0067,
  rest = -0.3,
  scroller,
  className,
}: KnockoutZoomPinProps) {
  const section = useRef<HTMLElement>(null);
  const pin = useRef<HTMLDivElement>(null);
  const word = useRef<HTMLDivElement>(null);
  const veil = useRef<HTMLDivElement>(null);

  const smoothed = useRef(0);
  const lastTransform = useRef('');
  const lastVeil = useRef('');
  const lastHeights = useRef(0);
  const reduced = useReducedMotion();

  useRaf((dt) => {
    const sectionEl = section.current;
    const pinEl = pin.current;
    const wordEl = word.current;
    if (!sectionEl || !pinEl || !wordEl) return;

    const host = scroller?.current ?? nearestScroller(sectionEl);
    const hostIsRoot = host === document.documentElement;
    const hostTop = hostIsRoot ? 0 : host.getBoundingClientRect().top;
    const hostHeight = hostIsRoot ? window.innerHeight : host.clientHeight;
    if (hostHeight === 0) return;

    // The pin range is manufactured from the scroller's own height, not from
    // `vh`: inside a box, viewport units describe the wrong thing entirely.
    const total = Math.round(hostHeight * (reduced ? 1 : 1 + viewports));
    if (total !== lastHeights.current) {
      lastHeights.current = total;
      sectionEl.style.height = `${total}px`;
      pinEl.style.height = `${hostHeight}px`;
    }

    const rect = sectionEl.getBoundingClientRect();
    const travel = total - hostHeight;
    const target = travel > 0 ? clamp((hostTop - rect.top) / travel, 0, 1) : 1;

    // `damp(x, t, s, dt)` is `x + (t - x) * (1 - s^dt)`; with s = e^-5 that is
    // exactly the `1 - exp(-5 * dt)` constant the technique is named for.
    smoothed.current = reduced ? target : damp(smoothed.current, target, smoothing, dt);
    const L = smoothed.current;

    // Ease-out on the scale: most of the shrink happens early, so the last
    // third of the scroll is a slow settle rather than a continued rush.
    const scale = cover - (cover - 1) * easeOutCubic(L);
    // Ease-IN on the recentre: while the word is huge its position is
    // meaningless, so it must not start travelling until it is nearly small.
    const y = lerp(0, rest * hostHeight, easeInCubic(L));

    const transform = `translate3d(0, ${y.toFixed(1)}px, 0) scale(${scale.toFixed(4)})`;
    if (transform !== lastTransform.current) {
      lastTransform.current = transform;
      wordEl.style.transform = transform;
    }

    const veilEl = veil.current;
    if (veilEl) {
      const opacity = easeInCubic(clamp((L - 0.45) / 0.5, 0, 1)).toFixed(3);
      if (opacity !== lastVeil.current) {
        lastVeil.current = opacity;
        veilEl.style.opacity = opacity;
      }
    }
  });
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** `useRaf` unsubscribes from the shared loop on unmount; the only state is refs. The inline `height` values written to the section and the pin die with the elements, and no observers, listeners or timers are registered.

**Reduced motion.** The manufactured range collapses to one screen and the smoothing is bypassed, so progress tracks scroll exactly. The word passes through at its resting scale with the caption already present — the section becomes an ordinary headline block instead of leaving a screen and a half of empty scrolling behind.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Sizing the range in `vh` inside a scrollable container. The section is then sized against the window while progress is measured against the box, so the zoom finishes early, late, or never — and it looks correct only when the container happens to be full-height.
- Smoothing with a per-frame constant. The zoom lags noticeably further behind the scroll on a 60 Hz display than on a 120 Hz one, and every attempt to tune it makes the other refresh rate worse.
- Using the same easing for scale and for position. Move the word early and it slides around the screen while still too large to locate, which reads as a bug rather than as choreography.
- Animating `font-size` or `width` instead of `transform: scale`. Every frame relayouts and re-rasterises glyphs at a new size — the single most reliable way to turn this effect into a slideshow on a laptop.
- Writing the transform unconditionally each frame. At the top and bottom of the range the value is identical for dozens of frames, and each write still costs a style invalidation and a composite.
- Caching the section rect. A font swap or an image landing above the section moves it, and a cached top makes the zoom finish at the wrong scroll position for the rest of the session.
- Leaving the manufactured range in place under reduced motion. The user gets a screen and a half of scrolling where nothing happens at all; the height must collapse along with the animation.

## Notes

- The scroll container is auto-detected by walking ancestors for a scrollable `overflow-y`, so the component works unchanged on a normal page. Pass `scroller` when the container is ambiguous or created later.
- The knockout is `background-clip: text`, not an SVG mask: no extra element, no viewBox to keep in sync, and the text stays selectable and readable to assistive technology.
- A single word works best. Two lines re-wrap as the scale changes and the knockout stops reading as one shape.

## Definition of done

The word is unreadably large at the top of the section and lands as a normal headline exactly as the section releases. Scrolling backwards reverses it at the same rate. Stopping mid-zoom settles within about a quarter second with no drift. Resizing the window mid-zoom keeps the word at the same progress. With reduced motion on, the section is one screen tall and nothing scales.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
