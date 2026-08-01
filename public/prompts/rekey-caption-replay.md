# Build: Re-Key Caption Replay

A wrapper that replays a staggered entrance every time its `entryKey` changes. It does it by being a different node: React unmounts the old caption and mounts a new one, and a freshly mounted element starts its CSS animation at frame zero. No forced reflow to restart the animation, no tween to kill, and a fast prev/next cannot leave the block half-entered because the half-entered node no longer exists.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A caption block whose staggered entrance replays on every index change, restarted by a changed React key.

- Category: transition
- Runtime cost: css
- Dependencies: none beyond React

## How it works

1. The children are wrapped in a single `<div key={entryKey}>`. Changing `entryKey` makes React discard that subtree and mount a fresh one; a new element runs its `animation` from frame zero, which is the entire replay mechanism. The key goes on the wrapper, not on each child — keyed individually, only the children whose own identity changed would replay, which for a caption is usually none of them.
2. One keyframe, `kinetic-rekey-in`, runs `opacity: 0` and `translateY(var(--kx-rekey-from))` to `opacity: 1` and `translateY(0)` over 0.5 s on `cubic-bezier(0.22, 1, 0.36, 1)`. Because the offset is a custom property rather than a literal, flipping its sign on the root turns a rise into a drop — both directions from one set of keyframes.
3. The stagger is a generated ladder of `:nth-child(n) { animation-delay: calc(var(--kx-rekey-stagger) * (n - 1)) }` rules, built once at module scope for the first eight children. A ninth-and-beyond rule pins the tail to the eighth delay, so an overlong block degrades to "the tail arrives together" rather than "the tail arrives first at delay zero".
4. `animation-fill-mode: both` is what makes the delay usable. Without it a delayed line is painted at its normal full-opacity style for the length of its own delay, then snaps to the from-frame to begin animating — every line flashes before it enters.
5. The stylesheet is emitted once through React 19's `<style href precedence>` hoisting, so duration, stagger and offset are read from CSS custom properties set on the wrapper. Ten captions on a page share one rule block and differ only in their variables.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `duration = 0.5`
  Seconds per line. With the 0.06 s stagger, a four-line block finishes in 0.68 s — under the ~0.7 s where a caption change starts to feel like waiting. Halve it and the ease has no room to decelerate, so the rise reads as a jump.
- `distance = 14`
  Pixels travelled. Roughly one line of leading at caption size: enough for the eye to register direction, small enough that the text is never far from where it lands. Past ~30 px the block reads as flying in from off-panel.
- `stagger = 0.06`
  Seconds between lines. At 0 the block is one object; past ~0.12 s the metadata is still arriving after the title has settled, which reads as a slow network rather than a sequence.
- `ease = cubic-bezier(0.22, 1, 0.36, 1)`
  An out-quart. It covers about 80% of the distance in the first third of the duration, so the line appears to arrive fast and then settle — which is what hides the fact that nothing is actually decelerating.
- `MAX_STAGGERED_LINES = 8`
  How many nth-child rules are generated. Eight covers eyebrow, title, two metadata rows and a counter with room spare. The number exists because CSS cannot do arithmetic on the child index, so the ladder has to be finite.

## API

```ts
function RekeyCaptionReplay(props: { entryKey: string | number; children: ReactNode; duration?: number; distance?: number; stagger?: number; direction?: "up" | "down"; className?: string }): JSX.Element
```

- `entryKey: string | number`
  Identity of the current caption. Any change replays the entrance.
- `children: ReactNode`
  Direct children each get their own delay, in source order.
- `duration: number` — default `0.5`
  Seconds one line's entrance lasts.
- `distance: number` — default `14`
  Pixels a line travels. Signed by `direction`.
- `stagger: number` — default `0.06`
  Seconds between successive lines. 0 makes the block arrive as one piece.
- `direction: "up" | "down"` — default `"up"`
  `up` enters from below; `down` enters from above, for a step backward.
- `className: string`
  Merged onto the keyed wrapper via `cn`.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/**
 * How many direct children get their own delay. Eight covers eyebrow, title,
 * two metadata rows and a counter with room to spare; children past the eighth
 * are pinned to the eighth's delay rather than falling back to zero, so an
 * overlong block degrades to "the tail arrives together" instead of "the tail
 * arrives first".
 */
const MAX_STAGGERED_LINES = 8;

const STAGGER_RULES = [
  ...Array.from(
    { length: MAX_STAGGERED_LINES },
    (_, i) =>
      `.kinetic-rekey > :nth-child(${i + 1}) { animation-delay: calc(var(--kx-rekey-stagger, 0.06s) * ${i}); }`,
  ),
  `.kinetic-rekey > :nth-child(n + ${MAX_STAGGERED_LINES + 1}) { animation-delay: calc(var(--kx-rekey-stagger, 0.06s) * ${MAX_STAGGERED_LINES - 1}); }`,
].join('\n');

const REKEY_CSS = `
@keyframes kinetic-rekey-in {
  from { opacity: 0; transform: translateY(var(--kx-rekey-from, 14px)); }
  to   { opacity: 1; transform: translateY(0); }
}
/* One keyframe covers both directions: the offset is a custom property, so
   flipping its sign on the root turns a rise into a drop without a second
   set of keyframes to keep in sync. */
.kinetic-rekey > * {
  animation: var(--kx-rekey-duration, 0.5s) cubic-bezier(0.22, 1, 0.36, 1)
    both kinetic-rekey-in;
}
${STAGGER_RULES}
@media (prefers-reduced-motion: reduce) {
  /* The still state IS the destination: full opacity, no offset. Dropping the
     animation re-exposes those as the base values, which is why there is
     nothing to declare here beyond 'none'. A zero-duration animation would
     instead hold whatever 'both' resolved and still fire animationend. */
  .kinetic-rekey > * { animation: none; }
}
`;

export interface RekeyCaptionReplayProps {
  /**
   * Identity of the current caption. Any change replays the entrance — in a
   * slideshow this is the slide index, in a filter it is the active facet.
   */
  entryKey: string | number;
  /** Direct children each get their own delay, in source order. */
  children: ReactNode;
  /** Seconds one line's entrance lasts. */
  duration?: number;
  /** Pixels a line travels. Signed by `direction`. */
  distance?: number;
  /** Seconds between successive lines. 0 makes the block arrive as one piece. */
  stagger?: number;
  /**
   * `up` enters from below — the default, and correct for advancing forward.
   * `down` enters from above, which is what makes a step backward read as a
   * step backward rather than as another step forward.
   */
  direction?: 'up' | 'down';
  className?: string;
}

export function RekeyCaptionReplay({
  entryKey,
  children,
  duration = 0.5,
  distance = 14,
  stagger = 0.06,
  direction = 'up',
  className,
}: RekeyCaptionReplayProps) {
  const from = direction === 'up' ? distance : -distance;

  return (
    <>
      <style href="kinetic-rekey-caption-replay" precedence="medium">
        {REKEY_CSS}
      </style>

      {/* The key is on this wrapper, so every child is a new node on every
          change and every child animation restarts. Putting the key on the
          children individually would replay only the ones whose own identity
          changed, which for a caption is usually none of them. */}
      <div
        key={entryKey}
        className={cn('kinetic-rekey', className)}
        style={
          {
            '--kx-rekey-duration': `${duration}s`,
            '--kx-rekey-stagger': `${stagger}s`,
            '--kx-rekey-from': `${from}px`,
          } as CSSProperties
        }
      >
        {children}
      </div>
    </>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing to clean up. There are no listeners, no timers, no rAF and no tweens — the animation is CSS and the nodes running it are removed by React itself on every key change.

**Reduced motion.** `animation: none` on the children, which re-exposes their base styles — full opacity, no offset. The caption is fully rendered on the first frame after the key change, in its final position. This is the one case where dropping the animation is the correct still state rather than a cop-out, because the from-frame is the only thing the animation adds.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Restarting the animation by toggling a class off and on. The browser coalesces both mutations into one style recalculation and the animation never restarts, which is why that approach always ends up with a `void el.offsetWidth` forced reflow wedged between the two lines.
- Tweening the caption with an animation library instead. A fast prev/next leaves two opposing tweens on the same node and the text jitters between them; a remount cannot have that problem because the contended node is gone.
- Omitting `animation-fill-mode: both`. Every delayed line paints at full opacity for the length of its delay, then snaps to invisible to start animating. The block flickers, and it flickers worse the larger the stagger.
- Putting the key on the individual lines. Their identities usually do not change between captions, so React reuses the nodes and nothing replays — the most common way this technique silently does nothing.
- Wrapping anything focusable or stateful. The remount destroys DOM state and moves focus to the body: an input inside this loses its caret and its value on every key change. This is for display content only.
- Animating both directions with a second keyframe block. The two drift apart the first time someone tunes the offset. One keyframe reading a signed custom property cannot.

## Notes

- Pairs with a counter badge and prev/next controls to make a slideshow caption, which is where the technique was observed. The same wrapper works for a filter result header, a hovered-row detail panel, or a step label in a multi-step form summary.
- Direction is a prop rather than something derived internally, because only the caller knows whether an index change was forward, backward, or a jump from a thumbnail strip.
- For the media beside the caption, a CSS `transition` on the background beats a tween: an index change is a discrete event with one start and one end state, which is exactly what a transition is for.

## Definition of done

Step forward and the eyebrow, title and metadata rise into place one after another, roughly 60 ms apart. Step backward and they drop in from above instead. Click next four times as fast as you can and every caption plays its full entrance from the start with no jitter or stuck line. With reduced motion the new caption is simply there, complete, on the first frame.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
