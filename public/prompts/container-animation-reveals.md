# Build: One Reveal Engine, Two Axes

Lines rise out of a clipping box and fade up as their group enters. The interesting part is that the same builder serves a vertical page section and a panel riding a pinned horizontal strip — handed the strip's tween as `containerAnimation`, ScrollTrigger measures against that timeline's progress instead of scroll position. One set of numbers, two directions, nothing to keep in sync by hand.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

The same staggered line reveal fires for vertical sections and for panels on a horizontal track.

- Category: scroll
- Runtime cost: dom
- Dependencies: gsap@^3.15.0

## How it works

1. The subtree is scanned for `[data-reveal-group]` elements; each becomes one ScrollTrigger. A subtree with no groups reveals as a single group rooted on the component itself.
2. Inside a group, every `[data-reveal]` element is a target of one `gsap.fromTo` running `{ yPercent: 110, opacity: 0.15 }` to `{ yPercent: 0, opacity: 1 }` on `power3.out` with a 0.12 s stagger — so the group is one tween, not one tween per line, and the stagger is real rather than simulated with delays.
3. When a `containerAnimation` is supplied it is spread into the trigger vars and the position keywords flip from `top 88% / top 45%` to `left 85% / left 45%`, because a trigger attached to a container animation measures along that container's axis.
4. The `containerAnimation` prop is tri-state: `undefined` means vertical flow, an animation means horizontal, and `null` means "a sibling owns the timeline and has not built it yet" — in which case nothing is built at all this commit.
5. `scrub: 0.4` ties the reveal to scroll position with a short catch-up, so reversing direction reverses the reveal instead of replaying it.
6. Everything is created inside a `gsap.context` scoped to the root, so `ctx.revert()` kills the triggers and restores the inline `transform` and `opacity` the tween wrote.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `lift = 110`
  Start offset as a percentage of the element's own height. 100 puts the line exactly at the bottom edge of its clipping box; 110 adds a sliver of overshoot so descenders are hidden through the whole travel rather than peeking under the mask on the first frame.
- `START_OPACITY = 0.15`
  Not 0. A line that fades from fully transparent reads as two separate events — a fade and a move. Starting at 0.15 makes the movement the thing you notice and the fade a supporting detail.
- `stagger = 0.12`
  Seconds between lines within a group. Below ~0.06 the lines read as one block; above ~0.2 the last line arrives after the eye has already moved on, which reads as lag rather than rhythm.
- `scrub = 0.4`
  Short catch-up so the reveal follows the scrollbar but survives a wheel step. At 0 the tween inherits every input spike; above ~1 the lines are still arriving after the section has left.
- `start / end (horizontal) = 'left 85%' / 'left 45%'`
  With `containerAnimation` the trigger is measured along the container's axis. Vertical keywords resolve to a position the element never occupies on that axis, so the tween simply never runs.

## API

```ts
function AxisReveals(props: { children: ReactNode; scroller?: RefObject<HTMLElement | null>; containerAnimation?: gsap.core.Animation | null; scrub?: number; lift?: number; stagger?: number; className?: string }): JSX.Element
```

- `children: ReactNode`
  Markup containing `[data-reveal-group]` scopes and `[data-reveal]` targets.
- `scroller: RefObject<HTMLElement | null>`
  Scroll container the triggers read. Omit for the document.
- `containerAnimation: gsap.core.Animation | null`
  Omit for vertical flow, pass a horizontal tween to measure against it, pass `null` to hold off until that tween exists.
- `scrub: number` — default `0.4`
  Seconds of catch-up on the reveal.
- `lift: number` — default `110`
  Start offset as a percentage of the element height.
- `stagger: number` — default `0.12`
  Seconds between elements inside a group.
- `className: string`
  Merged onto the wrapper. Use `contents` when the wrapper must not affect layout.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function AxisReveals({
  children,
  scroller,
  containerAnimation,
  scrub = 0.4,
  lift = 110,
  stagger = 0.12,
  className,
}: AxisRevealsProps) {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const rootEl = root.current;
    if (!rootEl || reduced) return;
    // Explicit "not ready": a sibling owns the timeline and has not built it.
    if (containerAnimation === null) return;

    const scrollerEl = scroller?.current ?? undefined;
    const horizontal = containerAnimation !== undefined;

    const ctx = gsap.context(() => {
      const groups = Array.from(rootEl.querySelectorAll<HTMLElement>('[data-reveal-group]'));
      // A subtree with no explicit groups reveals as one group.
      const scopes = groups.length > 0 ? groups : [rootEl];

      for (const group of scopes) {
        const targets = Array.from(group.querySelectorAll<HTMLElement>('[data-reveal]'));
        if (targets.length === 0) continue;

        gsap.fromTo(
          targets,
          { yPercent: lift, opacity: START_OPACITY },
          {
            yPercent: 0,
            opacity: 1,
            ease: 'power3.out',
            duration: 1,
            stagger,
            scrollTrigger: {
              trigger: group,
              scroller: scrollerEl,
              // The line everyone gets wrong. With `containerAnimation` the
              // trigger measures along the container's axis, so the position
              // keywords must be horizontal. "top 85%" against a horizontal
              // container resolves to a position the element never occupies,
              // and the reveal silently never fires.
              start: horizontal ? 'left 85%' : 'top 88%',
              end: horizontal ? 'left 45%' : 'top 45%',
              scrub,
              // Spreading rather than passing `undefined`: ScrollTrigger
              // branches on the key's presence, not on its value.
              ...(containerAnimation ? { containerAnimation } : {}),
            },
          },
        );
      }
    }, rootEl);

    return () => ctx.revert();
  }, [scroller, containerAnimation, scrub, lift, stagger, reduced]);
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** `ctx.revert()` on unmount and on every dependency change: it kills each group's tween and ScrollTrigger and restores the inline `transform` and `opacity` GSAP wrote, so a re-mount measures clean markup rather than the last run's end state.

**Reduced motion.** No triggers are created and no `fromTo` runs, so every line renders at its final position and full opacity on first paint. The clipping boxes stay in the markup and do nothing, so the layout is byte-for-byte the finished state.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Keeping vertical keywords when passing `containerAnimation`. `start: "top 85%"` produces no error, no warning and no animation — the panels simply arrive already revealed, and the bug survives review because nothing is broken, only absent.
- Passing `containerAnimation: undefined` explicitly. ScrollTrigger branches on whether the key exists, so an `undefined` value is not the same as an absent key; the code spreads the object conditionally for exactly this reason.
- Treating a not-yet-built timeline as the vertical case. The strip's tween is created in a sibling effect and arrives one render later, so a naive `containerAnimation ?? undefined` builds a full set of vertical triggers on horizontal content and tears them down on the next commit — visible as a flash of pre-revealed panels.
- Writing a second reveal system for the horizontal section. Two systems mean two staggers, two easings and two sets of position keywords, and they diverge the first time someone tunes one of them.
- Building one tween per line instead of one tween per group. Stagger stops being a property of the group and becomes a pile of hand-computed delays, which no longer reverse correctly when the user scrolls back up.

## Notes

- Combine with `pinned-horizontal-track`: pass its `onTrack` payload's `animation` straight into `containerAnimation`.
- ScrollTrigger forbids `pin` on a trigger that has a `containerAnimation`. Pin the strip's section, never the panels riding it.

## Definition of done

Scroll the vertical section: the three lines rise out of their masks in sequence and reverse cleanly when you scroll back up. Keep scrolling into the pinned strip: each panel's lines rise with the same rhythm as it crosses the container, not as it crosses the viewport. With reduced motion on, every line is already in place.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
