# Build: Magnetic Pointer Button

The element translates toward the pointer by a fraction of its offset from centre, and the label translates further still, so the text appears to lead the box it sits in. Release is an elastic overshoot rather than a linear return, which is the difference between "springy" and "sliding back".

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A button that leans toward the cursor and springs back, with the label leading the box.

- Category: cursor
- Runtime cost: dom
- Dependencies: gsap@^3.15.0

## How it works

1. A window-level pointermove handler measures the pointer against the button's live bounding rect, not a cached one — the element is being translated by this same effect, so a rect captured on mount goes stale immediately.
2. Inside a hit area padded past the border, the offset from centre is scaled by `strength` and pushed into four `gsap.quickTo` setters: x and y for the button, x and y for the label at `labelStrength - 1` so it moves relative to its already-moving parent.
3. Outside that area, a single `gsap.to` with `elastic.out(1, 0.4)` and `overwrite: "auto"` returns both nodes to zero, cancelling any in-flight follow tween.
4. Cleanup kills tweens before clearing transforms, so nothing writes to the node after React releases it.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `strength = 0.35`
  Fraction of pointer offset the button travels. Below ~0.2 the effect is invisible; above ~0.6 the button outruns the cursor and reads as a rendering fault rather than an affordance.
- `labelStrength = 1.6`
  The label moves 0.6x the button offset *on top of* the button's own movement. That parallax between text and border is what makes the surface feel elastic instead of rigid.
- `padding = 24`
  Pixels of grace beyond the border. Without it the effect engages exactly at the edge, and the button visibly jumps as it snaps into the field.
- `FOLLOW_DURATION = 0.35`
  quickTo duration. Short enough to feel attached to the cursor, long enough to smooth the 8-16 ms gaps between pointer events.
- `RETURN_DURATION = 0.6`
  Elastic return. Shorter than this and the overshoot has no room to read as a spring.

## API

```ts
function MagneticButton(props: { children: ReactNode; strength?: number; labelStrength?: number; padding?: number; className?: string; onClick?: () => void; disabled?: boolean }): JSX.Element
```

- `children: ReactNode`
  Button label. Wrapped in the span that receives the parallax offset.
- `strength: number` — default `0.35`
  Fraction of the pointer offset the button travels.
- `labelStrength: number` — default `1.6`
  Label travel relative to the button. 1 disables parallax.
- `padding: number` — default `24`
  Pixels beyond the border that still count as near.
- `className: string`
  Merged onto the button element via `cn`.
- `onClick: () => void`
  Standard click handler.
- `disabled: boolean` — default `false`
  Disables the button and skips the effect entirely.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
const RETURN_DURATION = 0.6;
const FOLLOW_DURATION = 0.35;

export function MagneticButton({
  children,
  strength = 0.35,
  labelStrength = 1.6,
  padding = 24,
  className,
  onClick,
  disabled = false,
}: MagneticButtonProps) {
  const root = useRef<HTMLButtonElement>(null);
  const label = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = root.current;
    const text = label.current;
    if (!el || !text || disabled) return;

    // A coarse pointer has no hover state: the effect would only ever fire on
    // touch-down, which reads as a glitch rather than an affordance.
    const fine = window.matchMedia('(pointer: fine)');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!fine.matches || reduced.matches) return;

    // quickTo builds one reusable tween per property. The naive version calls
    // gsap.to() on every pointermove, which allocates a tween per event (~120
    // a second) and makes each one fight the last for the same property.
    const xTo = gsap.quickTo(el, 'x', { duration: FOLLOW_DURATION, ease: 'power3.out' });
    const yTo = gsap.quickTo(el, 'y', { duration: FOLLOW_DURATION, ease: 'power3.out' });
    const labelXTo = gsap.quickTo(text, 'x', { duration: FOLLOW_DURATION, ease: 'power3.out' });
    const labelYTo = gsap.quickTo(text, 'y', { duration: FOLLOW_DURATION, ease: 'power3.out' });

    const onMove = (e: PointerEvent) => {
      // Read the rect per move, not once on mount: the element is being
      // translated by this very effect, and any scroll or reflow invalidates
      // a cached rect. Stale centres make the button drift away permanently.
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      const withinX = Math.abs(e.clientX - cx) < rect.width / 2 + padding;
      const withinY = Math.abs(e.clientY - cy) < rect.height / 2 + padding;

      if (withinX && withinY) {
        const dx = (e.clientX - cx) * strength;
        const dy = (e.clientY - cy) * strength;
        xTo(dx);
        yTo(dy);
        labelXTo(dx * (labelStrength - 1));
        labelYTo(dy * (labelStrength - 1));
        return;
      }

      // Release. Overshoot on the way home is what sells the elastic.
      gsap.to([el, text], {
        x: 0,
        y: 0,
        duration: RETURN_DURATION,
        ease: 'elastic.out(1, 0.4)',
        overwrite: 'auto',
      });
    };

    // Listen on the window, not the element. On the element, `pointerleave`
    // fires the moment the button moves out from under the cursor — it
    // chases itself away and stutters at the edge of the hit area.
    window.addEventListener('pointermove', onMove, { passive: true });

    return () => {
      window.removeEventListener('pointermove', onMove);
      // Kill before clearing: an in-flight tween would otherwise write a
      // transform back onto a node React has already handed to something else.
      gsap.killTweensOf([el, text]);
      gsap.set([el, text], { clearProps: 'transform' });
    };
  }, [strength, labelStrength, padding, disabled]);
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Removes the window listener, calls `gsap.killTweensOf` on both nodes, then clears the transform with `gsap.set(..., { clearProps: "transform" })`. Kill precedes clear so no in-flight tween can restore it.

**Reduced motion.** The effect never attaches when `prefers-reduced-motion: reduce` matches. The button keeps its colour transition on hover, so it still responds — it just does not move.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Listening on the element instead of the window. `pointerleave` fires the instant the button translates out from under the cursor, so it chases itself away and stutters along the edge of its own hit area.
- Calling `gsap.to()` per pointermove. That allocates a fresh tween ~120 times a second and each one fights the previous for the same property. `quickTo` reuses one tween per property.
- Caching the bounding rect on mount. The element moves and the page scrolls; a stale centre makes the button drift further away with every pass.
- Skipping `overwrite: "auto"` on the return tween — the follow tween keeps running underneath and the button never actually reaches zero.
- Leaving the transform behind on unmount. Clear it, but kill tweens first, or an in-flight tween writes it straight back.

## Notes

- Gated behind `(pointer: fine)`. On touch there is no hover, so the effect would only fire on press, which reads as a glitch.

## Definition of done

Approach from any side and the button leans toward the cursor with the label leading it. Leave the padded area and it springs back past zero once before settling. Unmount mid-approach and no transform remains on the node. On a touch device it does not move at all.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
