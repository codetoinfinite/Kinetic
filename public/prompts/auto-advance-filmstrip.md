# Build: Auto-Advance Filmstrip

Panels are a fixed number of container-width units wide and the whole track is one `translateX`. The active panel sits centred, its neighbours are dimmed and scaled down, and the strip steps every few seconds until you touch it. All motion is a CSS transition on a value React already recomputes when the index changes — there is no tween and no animation loop.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A centred strip that steps one panel every few seconds, neighbours dimmed and shrunk, on one CSS transition.

- Category: layout
- Runtime cost: css
- Dependencies: none beyond React

## How it works

1. Every panel is `W` container-width units wide (`width: 46cqw`) and the track is translated to `(100 - W) / 2 - W * index` of the same unit. The first term centres one panel — `(100 - 46) / 2 = 27` — and the second steps exactly one panel per index. It is one expression with no measurement and no resize handler, because both terms are already relative to the container.
2. `cqw` rather than `vw`: the strip is sized against its own container, so it stays centred inside a card, a modal or a split layout instead of only when it happens to be full-bleed. The root sets `container-type: inline-size` to establish that container.
3. The transition is `transform 500ms cubic-bezier(0.22, 1, 0.36, 1)` on the track. For a component where React already re-renders on index change, a CSS transition is fewer moving parts than a tween and it interpolates on the compositor.
4. Inactive panels get `opacity: 0.35` **and** `scale(0.8)`, transitioning on the same curve and duration as the track so the three properties land together.
5. Auto-advance is `setTimeout` re-armed on every index change, not `setInterval`. Manual navigation therefore restarts the dwell rather than inheriting whatever was left of the current tick.
6. The timer is gated on four conditions — `autoPlay`, not reduced-motion, `document.visibilityState === "visible"`, and not currently hovered or focused within — so it never advances behind the user's back or in a background tab.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `panelWidth = 46`
  Panel width in `cqw`. Under 50 means two neighbours are partly visible, which is what makes it a filmstrip rather than a slideshow. At 46 the centred panel leaves 27 units of peek on each side — enough to read the neighbour as a real panel, not a sliver.
- `interval = 3000`
  Milliseconds per panel. Below ~2500 a caption cannot be read before it leaves; above ~5000 the strip looks broken rather than paced on a page where nothing else is moving.
- `duration = 500`
  Slide transition. Roughly a sixth of the dwell, which keeps the strip reading as a series of held frames with a transition between them rather than as continuous motion.
- `EASE = cubic-bezier(0.22, 1, 0.36, 1)`
  Expo-out. It covers about 80% of the distance in the first 30% of the duration, so the strip appears to arrive early and settle — the same reason it is the default curve for interface movement that should feel decided rather than mechanical.
- `inactiveOpacity / inactiveScale = 0.35 / 0.8`
  Both, together. 0.35 alone reads as a loading state; 0.8 alone reads as a layout bug. Applied together they read as depth, which is the only interpretation a viewer will land on.

## API

```ts
function AutoAdvanceFilmstrip(props: { children: ReactNode; panelWidth?: number; interval?: number; duration?: number; autoPlay?: boolean; inactiveOpacity?: number; inactiveScale?: number; className?: string; panelClassName?: string; 'aria-label'?: string }): JSX.Element
```

- `children: ReactNode`
  One panel per child.
- `panelWidth: number` — default `46`
  Panel width in container-width units (`cqw`).
- `interval: number` — default `3000`
  Milliseconds a panel is held before the strip advances.
- `duration: number` — default `500`
  Slide transition duration in milliseconds.
- `autoPlay: boolean` — default `true`
  Whether the strip advances on its own.
- `inactiveOpacity: number` — default `0.35`
  Opacity applied to every panel that is not active.
- `inactiveScale: number` — default `0.8`
  Scale applied to every panel that is not active.
- `className: string`
  Merged onto the root, which is also the query container.
- `panelClassName: string`
  Merged onto each panel cell.
- `aria-label: string` — default `'Filmstrip'`
  Label for the carousel group.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
// (100 - W) / 2 centres a panel of width W; W * index steps one panel per
// index. Both terms are in the same unit as the panel width, so the strip
// stays centred at every container size with no measurement at all.
const offset = (100 - panelWidth) / 2 - panelWidth * index;

const running = autoPlay && !reduced && visible && !held && count > 1;

useEffect(() => {
  if (!running) return;
  // setTimeout keyed on `index`, not setInterval: any manual navigation
  // re-arms a full dwell. With an interval, tapping "next" one tick before
  // it fires advances twice in a row.
  const id = window.setTimeout(() => {
    setIndex((current) => wrapIndex(current + 1, count));
  }, interval);
  return () => window.clearTimeout(id);
}, [running, index, interval, count]);
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The pending `setTimeout` is cleared by the effect's own teardown, which also runs on every index change and whenever the strip pauses. `useVisibility` and `useReducedMotion` unsubscribe their listeners. There is nothing else to release: all motion is CSS on nodes React owns.

**Reduced motion.** Auto-advance never starts, so nothing moves unless the user presses a control. When they do, `transition` is set to `none` on both the track and the panels, so the strip cuts to the new panel in one frame instead of sliding. The dot pager and arrows behave identically; only the interpolation is gone.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Using a percentage in the track's `translateX`. Percentages on `transform` resolve against the *element's own* width, and the track is as wide as all its panels — so `translateX(-46%)` moves it by 46% of the whole strip, not of one panel. The arithmetic only works in a unit that refers to the container: `cqw` here, `vw` if the strip is genuinely full-bleed.
- Using `setInterval` for the auto-advance. Tap "next" a hundred milliseconds before the tick fires and the strip advances twice; the second jump has no cause the user can see. A `setTimeout` keyed on the index gives every panel a full dwell.
- Leaving the timer running while the tab is hidden. The user comes back to a strip that has silently walked eleven panels forward, and every intervening transition ran on a throttled timer.
- Not pausing on hover or focus. A pointer resting on a panel and a keyboard user tabbing into a control both mean "I am reading this"; advancing underneath either one is the single most common complaint about auto-advancing carousels.
- Only setting `containerType` on an ancestor that has no definite inline size. `cqw` then resolves against the viewport-sized fallback and the arithmetic silently reverts to the `vw` behaviour it was meant to replace.
- Fading inactive panels to `opacity: 0`. They are still in the layout and still hit-testable, so a click intended for the active panel can land on an invisible neighbour that happens to be under the cursor.

## Notes

- Cheapest of the three carousels here and the right default when the set is short and each panel needs a moment on screen. Unlike `wrapping-drum-carousel` it does not wrap continuously — it jumps from the last index back to the first, and that jump is a full-width slide, which is visible. Keep the set small enough that the loop point is rare.
- Every panel stays mounted and in the layout at all times. For twenty panels that is twenty subtrees painting; virtualise or switch technique past roughly a dozen.

## Definition of done

The strip steps one panel roughly every three seconds with the neighbours visible, dimmed and smaller on both sides. Hovering anywhere over it stops the advance and moving away resumes it with a full dwell. Switch tabs for ten seconds and come back: it is on the panel it was on, not ten further along. Resize the container from 320 px to full width and the active panel stays exactly centred.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
