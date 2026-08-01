# Build: GSAP Cursor Follower

A container hides its native cursor and draws its own: a small disc that lags the pointer by a settling tween, and swells into a labelled puck whenever it passes over an element marked `data-cursor-target`. The lag comes from GSAP rather than from a damped rAF loop, which is why the disc comes to rest when the pointer stops instead of asymptoting toward it forever.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A puck that replaces the arrow inside a panel, trailing 0.4s behind and swelling to a label over targets.

- Category: cursor
- Runtime cost: dom
- Dependencies: gsap@^3.15.0

## How it works

1. On mount the puck is centred on its own coordinates with `gsap.set(circle, { xPercent: -50, yPercent: -50 })` and the positioning wrapper is parked at `x: -999, y: -999`. From then on the follow tween writes raw x/y and the centring composes into the same matrix, so there is no per-move offset arithmetic and exactly one composited transform per node.
2. Every `pointermove` issues `gsap.to(wrapper, { x: e.clientX - rect.left, y: e.clientY - rect.top, duration, ease: "power2.out", overwrite: "auto" })`. `overwrite: "auto"` retires the previous tween so the ~120 events a second do not accumulate into ~120 concurrent tweens writing the same transform.
3. This is deliberately GSAP smoothing rather than `useSmoothPointer`. A tween re-eases from its current velocity to a *rest* at the target, so the puck decelerates into stillness the instant the pointer stops; an exponential `damp` never actually arrives. Reach for the damped hook when you want a value that is permanently chasing, and for this when you want it to settle.
4. `pointerenter` teleports first (`duration: 0`) and only then fades in, so re-entering the panel does not drag a visible streak across it from wherever the puck was last parked.
5. The hover state is delegated: one handler runs `e.target.closest("[data-cursor-target]")` per move and compares the result with the previous state, tweening `scale` on the disc and `autoAlpha`/`scale` on the label only on the transition. Scale — not width/height — keeps the resize on the compositor with no layout pass.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `PARK = -999`
  Initial x/y. The element exists from first paint but must be *nowhere*; at 0,0 it flashes in the top-left corner for the frames between mount and the first pointer event.
- `duration = 0.4`
  Seconds of catch-up. Below ~0.2 the puck is welded to the pointer and the trailing read disappears; past ~0.7 it feels detached from the hand and users start chasing it.
- `size = 16`
  Resting diameter. Small enough to point precisely with, large enough to see against a busy panel. Applied as `scale: size / targetSize` so only the transform changes.
- `targetSize = 112`
  Diameter over a target. It has to hold a short label at 14px with real breathing room — under ~90 the text touches the circle edge and the puck reads as a broken badge.
- `RESIZE_DURATION = 0.45`
  The swell. With `expo.out` this is almost all its motion in the first 120ms, which is what makes the state change feel like a snap rather than an inflation.
- `FADE_DURATION = 0.3`
  Enter/leave opacity. Fast enough that the puck is present before the user has moved a meaningful distance into the panel.

## API

```ts
function CursorFollower(props: { children: ReactNode; label?: string; duration?: number; size?: number; targetSize?: number; className?: string }): JSX.Element
```

- `children: ReactNode`
  Panel content. Anything inside carrying `data-cursor-target` triggers the labelled state.
- `label: string` — default `'View'`
  Text revealed inside the puck over a target.
- `duration: number` — default `0.4`
  Seconds of catch-up on the follow tween.
- `size: number` — default `16`
  Resting diameter in px.
- `targetSize: number` — default `112`
  Diameter over a target, in px. Also the disc's laid-out size.
- `className: string`
  Merged onto the root container via `cn`.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/** Far outside any container, so the puck is nowhere until a pointer exists. */
const PARK = -999;
const FADE_DURATION = 0.3;
const RESIZE_DURATION = 0.45;

export function CursorFollower({
  children,
  label = 'View',
  duration = 0.4,
  size = 16,
  targetSize = 112,
  className,
}: CursorFollowerProps) {
  const root = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const disc = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = root.current;
    const point = wrap.current;
    const circle = disc.current;
    const caption = text.current;
    if (!el || !point || !circle || !caption) return;

    // A coarse pointer has no hover state, so the puck could only ever exist
    // between pointerdown and pointerup — and `cursor: none` on a touch device
    // hides nothing while still suppressing the text-selection caret.
    if (!window.matchMedia('(pointer: fine)').matches) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const follow = reduced ? 0 : duration;
    const fade = reduced ? 0 : FADE_DURATION;
    const resize = reduced ? 0 : RESIZE_DURATION;

    // Centre both layers on their own coordinates once. After this the follow
    // tween writes raw x/y and the centring composes into the same matrix —
    // no offset arithmetic per move, and one composited transform per node.
    gsap.set(point, { x: PARK, y: PARK, autoAlpha: 0 });
    gsap.set(circle, { xPercent: -50, yPercent: -50, scale: size / targetSize });
    gsap.set(caption, { xPercent: -50, yPercent: -50, autoAlpha: 0, scale: 0.5 });

    // The puck *replaces* the arrow rather than accompanying it. Set from JS,
    // not from the class list, so a touch device never loses its cursor.
    const previousCursor = el.style.cursor;
    el.style.cursor = 'none';

    let overTarget = false;

    const place = (e: PointerEvent, instant: boolean) => {
      // Live rect: the container can scroll, resize, or be inside a
      // transformed ancestor. A rect cached on mount puts the puck at a
      // constant offset from the real pointer as soon as anything moves.
      const rect = el.getBoundingClientRect();
      gsap.to(point, {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        duration: instant ? 0 : follow,
        ease: 'power2.out',
        // Each move REPLACES the last tween instead of queueing behind it.
        // Without it, ~120 events a second means ~120 live 0.4s tweens all
        // writing the same transform, and the puck visibly stutters.
        overwrite: 'auto',
      });
    };

    const onEnter = (e: PointerEvent) => {
      // Teleport on entry, then fade in. Tweening from wherever the puck was
      // parked draws a visible streak diagonally across the panel every time
      // the pointer re-enters.
      place(e, true);
      gsap.to(point, { autoAlpha: 1, duration: fade, ease: 'power2.out', overwrite: 'auto' });
    };

    const onMove = (e: PointerEvent) => {
      place(e, false);

      const hit =
        e.target instanceof Element ? e.target.closest('[data-cursor-target]') : null;
      const next = hit !== null;
      // Only tween on the transition. Re-firing the same resize tween on every
      // move restarts its ease and the puck never reaches the target size.
      if (next === overTarget) return;
      overTarget = next;

      gsap.to(circle, {
        scale: next ? 1 : size / targetSize,
        duration: resize,
        ease: 'expo.out',
        overwrite: 'auto',
      });
      gsap.to(caption, {
        autoAlpha: next ? 1 : 0,
        scale: next ? 1 : 0.5,
        duration: resize,
        ease: 'expo.out',
        overwrite: 'auto',
      });
    };

    const onLeave = () => {
      gsap.to(point, { autoAlpha: 0, duration: fade, ease: 'power2.out', overwrite: 'auto' });
    };

    el.addEventListener('pointerenter', onEnter);
    el.addEventListener('pointermove', onMove, { passive: true });
    el.addEventListener('pointerleave', onLeave);

    return () => {
      el.removeEventListener('pointerenter', onEnter);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      el.style.cursor = previousCursor;
      // Kill before clearing, or an in-flight tween writes the transform
      // straight back onto a node React has already recycled.
      gsap.killTweensOf([point, circle, caption]);
      gsap.set([point, circle, caption], { clearProps: 'all' });
    };
  }, [duration, size, targetSize]);
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Removes the three container listeners, restores the container's previous inline `cursor`, calls `gsap.killTweensOf` on the wrapper, disc and label, then `gsap.set(..., { clearProps: "all" })`. Kill precedes clear so no in-flight tween can write the transform back after React has recycled the node.

**Reduced motion.** The puck still appears and still swells over targets — the affordance is preserved — but every duration collapses to 0, so it is welded to the pointer with no trailing lag and the size change is a hard cut. The native cursor stays hidden, because a container with no cursor at all would be worse than one that moves.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Calling `gsap.to` per pointermove without `overwrite: "auto"`. Sixty to a hundred and twenty 0.4s tweens end up live at once, all writing the same transform, and the puck stutters instead of gliding — the single most common way this effect is got wrong.
- Fading in without teleporting first. On every re-entry the puck tweens from its parked coordinates, drawing a diagonal streak across the whole panel before it reaches the pointer.
- Re-issuing the resize tween on every move instead of only on the hover transition. Each call restarts the `expo.out` ease from the beginning, so the puck creeps toward the target size and never gets there while the pointer keeps moving.
- Transitioning `width` and `height` for the swell. That is a layout write per frame on an element the compositor could otherwise leave alone; `scale` on a fixed-size disc is the same picture for free.
- Caching the container rect on mount. The panel scrolls, resizes, and may sit inside a transformed ancestor — a stale rect offsets the puck from the real pointer by a constant amount that never corrects itself.
- Putting `cursor: none` in the class list. It then applies on touch devices too, where it hides nothing but does suppress the text-selection caret; setting it from the effect means it only ever exists where the puck does.

## Notes

- Gated on `(pointer: fine)`. On touch nothing attaches: no listeners, no `cursor: none`, and the puck stays at `autoAlpha: 0` parked off-container, so a tap does not flash a disc at the touch point.
- Mark any element inside with `data-cursor-target` to trigger the labelled state — including elements nested arbitrarily deep, since the check is a `closest()` walk.
- The root sets `isolate`, so the puck stacks above the panel content without needing a page-level z-index.

## Definition of done

Move into the panel: the arrow disappears and a small disc arrives at the pointer without sweeping in from an edge, then trails about 0.4s behind as you move. Pass over a marked target and it swells into a labelled puck; leave and it shrinks back. Stop moving and it comes fully to rest rather than creeping. On a touch device the native cursor and all default behaviour are untouched.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
