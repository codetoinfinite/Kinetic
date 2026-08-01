# Build: matchMedia Layout Teardown

A fanned card layout on desktop and a plain column on mobile, with the entire desktop branch registered inside `gsap.matchMedia()`. GSAP records every `set`, tween and returned cleanup made inside the callback and reverts them the moment the query stops matching, so crossing the breakpoint leaves no inline transforms, no live listeners and no half-applied layout behind.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Two layouts behind one gsap.matchMedia block. Cross the breakpoint and the desktop branch reverts itself.

- Category: layout
- Runtime cost: dom
- Dependencies: gsap@^3.15.0

## How it works

1. `gsap.matchMedia().add({ isDesktop, isMobile, reduced }, self => …)` uses the object form: several queries are evaluated at once and arrive as booleans on `self.conditions`, so one callback branches on width and on motion preference together instead of needing an `add` per combination. GSAP re-runs the callback when any of the queries flips, which means toggling the OS "reduce motion" setting reconfigures the layout live, without a reload.
2. The desktop branch positions the cards entirely through `gsap.set` — `position: absolute`, `left`, `top`, `rotation`, `zIndex` — rather than through breakpoint utility classes. That is deliberate: the breakpoint then exists in exactly one place, the query string, and the base markup can stay a plain flex column that doubles as the mobile layout.
3. Positions are percentages of the container (`left: 50 + offset * spread`%, `top: 50 + |offset| * arc`%) with `xPercent: -50, yPercent: -50` for centring. Because percentages resolve against the container box, the fan rescales on resize with no measuring pass, no `ResizeObserver` and no resize listener inside the branch.
4. Layout and interaction are kept on separate transform channels. `left`/`top` carry the fan, the entrance tween owns `y` and `autoAlpha`, and the pointer parallax writes only `x` via `gsap.quickTo`. Two animations sharing one property means one of them silently loses, usually the one that started first.
5. The callback returns a cleanup function that removes the pointer listeners. GSAP invokes it when the branch stops matching, not only on unmount, so a desktop-only listener cannot survive into the mobile layout.
6. On teardown the effect calls `mm.revert()`, which restores the inline styles GSAP wrote — including the `position: absolute` — so the authored column comes back unmodified. `mm.kill()` would stop the tweens but leave the fan frozen exactly where it was.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `breakpoint = 768`
  Where the fan takes over. The mobile query is deliberately `max-width: breakpoint - 1` rather than `max-width: breakpoint`: overlapping queries both match at exactly 768px and the two branches register at once, which is how a card ends up absolutely positioned inside a column.
- `spread = 15`
  Percent of container width per card step. At this value a five-card fan spans about 60% of the box with visible overlap. Past ~22% the outer cards leave the container; under ~8% they stack almost exactly and the fan reads as a printing error.
- `arc = 4`
  Percent of container height each step drops. A small positive arc puts the centre card highest, which is what makes the row read as a hand of cards rather than a straight strip. Zero is flat; past ~10% the outer cards fall out of the box bottom.
- `tilt = 5`
  Degrees per step, applied about a `50% 90%` origin so the cards rotate around their lower edge like a fan pivot. Rotating about the centre swings the tops and bottoms in opposite directions and the arc stops reading.
- `parallax = 26`
  Maximum pixels the outermost card travels with the pointer, scaled by its distance from centre. Enough to give the fan depth; past ~50px the cards visibly separate from their own shadows and the layout looks unstable.
- `ENTER_DURATION / ENTER_STAGGER = 0.7 / 0.06`
  A five-card fan finishes in 0.7 + 4 x 0.06 = 0.94 s. Longer staggers make the last card arrive after the user has already started reading; shorter ones collapse the sequence into a single flash.

## API

```ts
function MatchMediaLayoutTeardown(props: { children: ReactNode; breakpoint?: number; spread?: number; arc?: number; tilt?: number; parallax?: number; className?: string; itemClassName?: string }): JSX.Element
```

- `children: ReactNode`
  One card per child. Each is wrapped in the element GSAP positions.
- `breakpoint: number` — default `768`
  Pixel width at which the fan layout takes over.
- `spread: number` — default `15`
  Horizontal step per card, as a percentage of container width.
- `arc: number` — default `4`
  Vertical drop per step from centre, as a percentage of container height.
- `tilt: number` — default `5`
  Degrees of rotation per step from centre.
- `parallax: number` — default `26`
  Maximum pointer parallax in pixels for the outermost card.
- `className: string`
  Merged onto the container.
- `itemClassName: string`
  Merged onto every card wrapper. Give the cards a width here — the fan does not measure them.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
useEffect(() => {
  const root = rootRef.current;
  if (!root || count === 0) return;

  const mm = gsap.matchMedia();

  mm.add(
    {
      // Object form: every query is evaluated, and the results arrive as
      // booleans on `self.conditions`. One callback can therefore branch on
      // several axes (width AND motion preference) instead of needing a
      // separate `add` per combination, and GSAP re-runs it whenever ANY of
      // them flips — including the motion query, so a user toggling
      // "reduce motion" at runtime gets the static layout without a reload.
      isDesktop: `(min-width: ${breakpoint}px)`,
      isMobile: `(max-width: ${breakpoint - 1}px)`,
      reduced: '(prefers-reduced-motion: reduce)',
    },
    (self) => {
      // `noUncheckedIndexedAccess` makes every lookup `boolean | undefined`,
      // and `conditions` itself is optional. Default rather than assert.
      const conditions = self.conditions ?? {};
      const isDesktop = conditions.isDesktop ?? false;
      const reduced = conditions.reduced ?? false;

      // Mobile registers nothing at all. The base markup already IS the
      // mobile layout, so there is no work to do and, more importantly,
      // nothing for the revert to have to undo when we come back.
      if (!isDesktop) return;

      const cards = Array.from(root.querySelectorAll<HTMLElement>('[data-mm-card]'));
      const mid = (cards.length - 1) / 2;

      cards.forEach((card, i) => {
        const offset = i - mid;
        const away = Math.abs(offset);
        gsap.set(card, {
          position: 'absolute',
          // Percentages of the CONTAINER, so the fan rescales with the box
          // and no resize listener is needed inside this branch.
          left: `${50 + offset * spread}%`,
          top: `${50 + away * arc}%`,
          xPercent: -50,
          yPercent: -50,
          rotation: offset * tilt,
          zIndex: 100 - Math.round(away * 10),
          transformOrigin: '50% 90%',
        });
      });

      if (reduced) return;

      gsap.from(cards, {
        y: ENTER_Y,
        autoAlpha: 0,
        duration: ENTER_DURATION,
        ease: 'power3.out',
        stagger: ENTER_STAGGER,
      });

      // Parallax lives on `x`; the entrance owns `y` and `autoAlpha`. Two
      // animations on one property means one of them silently loses.
      const setters = cards.map((card) =>
        gsap.quickTo(card, 'x', { duration: PARALLAX_DURATION, ease: 'power3' }),
      );

      const onMove = (e: PointerEvent) => {
        const rect = root.getBoundingClientRect();
        const norm = (e.clientX - rect.left) / rect.width - 0.5;
        setters.forEach((setter, i) => {
          const depth = mid === 0 ? 0 : (i - mid) / mid;
          setter(norm * parallax * depth);
        });
      };
      const onLeave = () => setters.forEach((setter) => setter(0));

      root.addEventListener('pointermove', onMove);
      root.addEventListener('pointerleave', onLeave);

      // A cleanup returned from the callback runs when this branch stops
      // matching, not only on unmount. Without it, the desktop listener
      // survives into the mobile layout and keeps writing transforms to
      // elements that are back in the column.
      return () => {
        root.removeEventListener('pointermove', onMove);
        root.removeEventListener('pointerleave', onLeave);
      };
    },
  );

  // `revert()` restores the inline styles GSAP wrote — including the
  // `position: absolute` — so the base column comes back exactly as
  // authored. `kill()` would stop the tweens but leave the fan frozen in
  // place.
  return () => {
    mm.revert();
  };
}, [count, breakpoint, spread, arc, tilt, parallax]);
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** `mm.revert()` on unmount reverts every recorded `set` and tween back to the pre-branch inline styles and runs each branch's returned cleanup, which removes the pointermove and pointerleave listeners. Nothing else is registered, so there is nothing else to release.

**Reduced motion.** `(prefers-reduced-motion: reduce)` is one of the queries in the same `add` block. When it matches, the desktop branch still composes the full fan with `gsap.set` and then returns early — no entrance tween, no pointer listener. The layout is identical; only the movement is gone. Because it is a matchMedia condition rather than a mount-time read, changing the OS setting reconfigures a mounted component immediately.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Registering animations once at mount and relying on CSS to hide them below the breakpoint. Resize past a breakpoint and a desktop-only ScrollTrigger keeps pinning on mobile, leaving a section stuck: the pin spacer is still in the document, the section will not scroll past, and nothing in the mobile stylesheet can undo it because the offending styles are inline. `matchMedia` reverts them instead.
- Using `mm.kill()` instead of `mm.revert()`. Kill stops the tweens but leaves every inline style GSAP wrote, so the fan freezes in place and the column never comes back.
- Overlapping queries: `(min-width: 768px)` paired with `(max-width: 768px)`. Both match at exactly 768px, both branches register, and the mobile teardown fights the desktop setup for one very confusing breakpoint width.
- Adding an event listener inside the callback without returning a cleanup. The listener outlives the branch, so a desktop pointer handler keeps writing transforms to cards that are back in the mobile column.
- Putting the responsive layout in Tailwind breakpoint classes AND the animation in matchMedia. The breakpoint now exists in two places and they drift; the classic symptom is a layout that switches at 768px while its animation switches at 1024px.
- Measuring the container inside the branch and hard-coding pixel offsets. The branch does not re-run on resize — only on a query change — so the fan is correct at the width it was registered at and wrong at every other width until you cross the breakpoint twice.
- Treating `self.conditions` as always defined. It is optional, and with `noUncheckedIndexedAccess` each lookup is `boolean | undefined`; a non-null assertion here compiles and then reads `undefined` as truthy-adjacent in the one edge case that matters.

## Notes

- No ScrollTrigger is used here, but the failure mode described in the first pitfall is the reason this pattern exists — a pinned desktop section that survives into a mobile layout is the single most common GSAP responsiveness bug, and `matchMedia` is the sanctioned fix.
- The same block also handles reduced motion: the `reduced` condition composes the final fan with `gsap.set` and returns before registering the entrance tween or the parallax listener, so the layout is identical and only the motion is absent.
- `gsap.context()` (via the `use-gsap` hook) is the right tool when you need scoped selectors and cleanup but no breakpoints. `matchMedia` is `context` plus queries — reach for it the moment a layout differs across breakpoints, not just its timing.

## Definition of done

Above 768px the cards fan out from the centre with a stagger, tilt outward, and drift with the pointer. Drag the window narrower past 768px and they return to a plain vertical column with no leftover transforms and no inline `position: absolute` on any card. Widen again and the fan re-registers and re-plays its entrance. Resize within the desktop range and the fan rescales with the box. Enable reduce-motion while it is open and the fan stays but stops moving.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
