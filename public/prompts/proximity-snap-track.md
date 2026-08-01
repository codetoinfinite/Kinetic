# Build: Proximity Snap Track

A scrollable rail whose items may be any width. `scroll-snap-type: x proximity` snaps to an item only when the scroll comes to rest near one, so free scanning stays free. `scroll-snap-stop: always` caps a single fling at one item, so a hard swipe cannot launch the user past six cards. No JavaScript runs during the scroll.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A horizontal rail of variable-width cards that snaps only when you stop near one, and never skips past two at once.

- Category: layout
- Runtime cost: css
- Dependencies: none beyond React

## How it works

1. The container is `overflow-x: auto` with `scroll-snap-type: x proximity`. `proximity` means the browser only adjusts the resting position when the natural end of the scroll already falls close to a snap point; anywhere else, it leaves the position exactly where the user left it.
2. Each item declares `scroll-snap-align: start` (or `center`) — this is what makes it a snap point at all — and `scroll-snap-stop: always`, which forbids the browser from passing more than one snap point per gesture no matter how much momentum the fling carried.
3. `scroll-padding-inline` is set alongside `padding-inline` to the same gutter. They are different properties: `padding` insets the content, `scroll-padding` insets the *snapport* — the rectangle a snap position is measured against. With padding alone, a `start`-aligned item comes to rest flush against the container border and the inset the design asked for vanishes at every rest position.
4. `overscroll-behavior-x: contain` stops a horizontal fling that reaches the end of the rail from chaining to an ancestor scroller or triggering the browser's back-navigation gesture.
5. `scroll-behavior` is `smooth` normally and `auto` under reduced motion, which affects programmatic and keyboard-initiated scrolls. The snap adjustment itself is the browser's own and already respects the OS setting.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `snapType = 'proximity'`
  The whole argument of this component. With `mandatory`, the browser must always come to rest on a snap point, so on a rail of variable-width items it is physically impossible to stop between two of them — every attempt to park somewhere gets yanked. Worse, on a long rail `mandatory` plus a short flick can leave the user unable to reach a position at all. `proximity` snaps when it helps and gets out of the way when it does not.
- `snapStop = 'always'`
  Without it, a hard fling on a trackpad passes every snap point and lands on whichever item the momentum ran out over — which on a rail of 20 cards means the user has no way to advance by exactly one. `always` turns each item into a gate.
- `snapAlign = 'start'`
  Correct default for variable-width items: their left edges line up at rest, which reads as a column of starts. `center` is right only when items are uniform, because with mixed widths a centred rest position puts every item's left edge somewhere different.
- `gutter = 16`
  Set on both `padding-inline` and `scroll-padding-inline`. The two must match or the resting inset and the visual inset disagree by exactly this many pixels, which looks like a rounding bug.
- `gap = 12`
  Large enough that two adjacent cards read as separate snap targets, small enough that the next card is clearly a continuation of the row rather than a separate section.

## API

```ts
function ProximitySnapTrack(props: { children: ReactNode; snapType?: 'proximity' | 'mandatory'; snapAlign?: 'start' | 'center'; snapStop?: 'normal' | 'always'; gutter?: number; gap?: number; className?: string; itemClassName?: string; 'aria-label'?: string }): JSX.Element
```

- `children: ReactNode`
  One item per child. Widths may differ.
- `snapType: 'proximity' | 'mandatory'` — default `'proximity'`
  Snap strictness. `mandatory` is exposed so the difference can be felt, not because it is usually right here.
- `snapAlign: 'start' | 'center'` — default `'start'`
  Which edge of an item lines up with the snapport.
- `snapStop: 'normal' | 'always'` — default `'always'`
  `always` caps one gesture at one item.
- `gutter: number` — default `16`
  Inset in px, applied to both `padding-inline` and `scroll-padding-inline`.
- `gap: number` — default `12`
  Gap between items in px.
- `className: string`
  Merged onto the scroll container.
- `itemClassName: string`
  Merged onto each item cell.
- `aria-label: string` — default `'Track'`
  Label for the focusable scroll region.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
const trackStyle: CSSProperties = {
  scrollSnapType: `x ${snapType}`,
  // `scroll-padding` is what a snap position is measured against, and it is
  // a separate property from `padding`. With padding alone, a `start`-aligned
  // item snaps flush to the container's border and the inset the design asked
  // for silently disappears at every rest position.
  scrollPaddingInline: `${gutter}px`,
  paddingInline: `${gutter}px`,
  gap: `${gap}px`,
  // Programmatic scrolls (anchor jumps, `scrollIntoView`, arrow keys in some
  // engines) animate unless told not to. Snapping itself is not affected —
  // it is the browser's own transition and honours the OS setting already.
  scrollBehavior: reduced ? 'auto' : 'smooth',
};

const itemStyle: CSSProperties = {
  scrollSnapAlign: snapAlign,
  scrollSnapStop: snapStop,
};
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing to release. All behaviour is declarative CSS on nodes React owns; the only subscription is `useReducedMotion`, which removes its own `matchMedia` listener on unmount. No listeners, no timers, no rAF.

**Reduced motion.** The rail behaves identically — it is a scroll container, and scrolling is the user moving, not the interface animating. The one change is `scroll-behavior: auto` instead of `smooth`, so keyboard and programmatic scrolls jump rather than glide. The snap adjustment is the browser's own transition and already follows the OS setting without any help.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- `scroll-snap-type: x mandatory` on a track with variable-width items. It makes it impossible to rest between items: every release is pulled to a snap point, so the user cannot park where they want, and on a long rail with wide items they end up fighting the browser for the whole length of the track. `proximity` is the correct choice whenever the items are not uniform or the track is long.
- Setting `padding-inline` without `scroll-padding-inline`. Every rest position then puts the item flush against the container edge, so the gutter appears while scrolling and disappears the instant you let go.
- Omitting `scroll-snap-stop: always`. A single hard swipe lands eight cards along, which makes stepping by one impossible and makes the rail feel slippery rather than mechanical.
- Hiding the scrollbar without making the container focusable. The rail becomes invisible to keyboard users and to anyone who was relying on the scrollbar as the affordance. `tabIndex={0}` and a `role`/`aria-label` restore arrow-key scrolling, and Chrome stops warning about a non-focusable scroll container.
- Leaving `overscroll-behavior-x` at `auto`. Flinging past the end chains into the page or, in Safari and Chrome, triggers the swipe-to-go-back gesture and the user loses the page.
- Reaching for a JS carousel because "the design has arrows". A snap track already has momentum, rubber-banding, keyboard support and accessible scroll semantics; arrows are one `scrollBy` call on top, not a reason to replace the mechanism.

## Notes

- Snap is a layout-level contract, not an animation. Everything here runs on the compositor and continues to work when the main thread is blocked, which is the reason to prefer it over a JS track whenever the interaction is genuinely "a scrollable row".
- Items are `shrink-0`. Without it, flex would compress them to fit the container and the track would never overflow, so there would be nothing to snap.
- `scroll-snap-stop` is ignored during programmatic scrolls in every engine — it only constrains user gestures. Arrows implemented with `scrollTo` can therefore still jump several items at once by design.

## Definition of done

Scroll the rail slowly and stop between two cards — it stays where you left it. Stop just past a card's edge and it eases onto that card. Fling as hard as you can and it advances exactly one card. Tab to the rail and press the arrow keys: it scrolls and snaps the same way. At every rest position the leading card sits inset from the container edge by the gutter, not flush against it.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
