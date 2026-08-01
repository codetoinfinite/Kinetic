# Build: Blend-Difference Cursor

A white circle replaces the pointer and inverts everything under it via `mix-blend-mode: difference`, so it is legible over any background without a single contrast rule. It has three sizes — 16px idle, 44px over a link, 150px over a `data-cursor="view"` target, the last carrying a text label — and the size change is CSS while the position is GSAP, deliberately kept on different properties.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A white dot in difference blend mode inverts whatever it crosses, growing 16 to 44 to 150px on hover.

- Category: cursor
- Runtime cost: dom
- Dependencies: gsap@^3.15.0

## How it works

1. Difference blending subtracts the backdrop from the source per channel. A pure white source therefore outputs `1 - backdrop`: black over white, white over black, the complement over any colour. That is the entire contrast strategy — no theme awareness, no luminance sampling, no per-section overrides.
2. Position is two `gsap.quickTo` setters created once, each backed by a single tween whose end value is mutated per event. At 0.32s with `power3` the dot trails the pointer by a few frames — enough to read as a physical object, short enough that clicking still feels direct.
3. `xPercent: -50, yPercent: -50` centres the dot on its own box once at mount, so the handler can pass raw pointer coordinates and, critically, the centring survives the width and height changing from 16px to 150px. A pixel offset would have to be recomputed for every size.
4. Size transitions list `width`, `height` and `background-color` explicitly. `transform` is excluded because GSAP writes it every frame; a CSS transition on the same property would interpolate toward a value GSAP has already replaced, and the result is a cursor that lags by a constant distance no tween duration accounts for.
5. Hover state is resolved by hit-testing `e.target.closest(...)` on each move rather than binding listeners to interactive children. React can add, remove and reorder those children freely and the cursor keeps working, with no subscription bookkeeping.
6. The dot is `display: none` in markup and only switched to `flex` after the `(pointer: fine)` check passes, so nothing renders before JS confirms there is a cursor to replace — no stray blob flashes during hydration on a phone.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `SIZE_IDLE / SIZE_HOVER / SIZE_VIEW = 16 / 44 / 150`
  16px reads as a cursor rather than a dot of dust. 44px is roughly the tap-target minimum and clearly signals "this is interactive" without hiding the word underneath. 150px is enormous on purpose: it has to hold a 15px label with breathing room, and at that size the inverted region becomes a design element rather than a pointer.
- `FOLLOW_DURATION = 0.32`
  Seconds of catch-up. Below ~0.15 the dot is welded to the pointer and the blend looks like a rendering artefact; above ~0.5 clicking feels disconnected because the visual lands after the press.
- `ease: 'power3' = power3 (in-out)`
  In-out rather than `.out`. quickTo remutates the end value continuously, so the tween is always restarting mid-flight; the symmetric curve absorbs direction changes instead of snapping into a fresh outward ramp on every event.
- `size transition timing = 0.4s cubic-bezier(0.22, 1, 0.36, 1)`
  A strong ease-out. The dot reaches most of its new size in the first ~120ms so the hover feels instant, then settles. Linear at this scale looks mechanical; a longer duration means the dot is still growing when the pointer has left the target.
- `label scale = 0.5 -> 1`
  The label grows with the dot rather than fading in at full size, so at the halfway point of the transition the text is proportionate to the circle around it instead of overflowing it.

## API

```ts
function BlendDifferenceCursor(props: { children?: ReactNode; label?: string; className?: string }): JSX.Element
```

- `children: ReactNode`
  Content the cursor inverts. Mark targets with `data-cursor="view"` or use plain `a`/`button`.
- `label: string` — default `'View'`
  Text shown inside the 150px state. Must fit at 15px inside the circle.
- `className: string`
  Merged onto the root container via `cn`.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/** The three states. Diameters in px, not scales — see the note above. */
const SIZE_IDLE = 16;
const SIZE_HOVER = 44;
const SIZE_VIEW = 150;

const FOLLOW_DURATION = 0.32;

export function BlendDifferenceCursor({
  children,
  label = 'View',
  className,
}: BlendDifferenceCursorProps) {
  const root = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = root.current;
    const node = dot.current;
    const caption = text.current;
    if (!el || !node || !caption) return;

    // Never on touch: there is no hover state to grow into, and `pointermove`
    // only fires mid-drag, so the dot would appear under the finger already
    // covering it and then be stranded on lift.
    if (!window.matchMedia('(pointer: fine)').matches) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* The dot is `display: none` until JS confirms a fine pointer, so nothing
       renders before this line — no stray blob flashes during hydration. */
    node.style.display = 'flex';
    /* Hiding the native cursor from JS, not CSS, for the same reason: a
       stylesheet rule would blank the cursor on touch devices too, where this
       component draws nothing to replace it. */
    const previousCursor = el.style.cursor;
    el.style.cursor = 'none';

    gsap.set(node, { xPercent: -50, yPercent: -50, autoAlpha: 0 });

    const duration = reduced ? 0 : FOLLOW_DURATION;
    // Two tweens for the lifetime of the component, end values mutated in
    // place. `gsap.to` per event would allocate ~120 tweens a second, each one
    // overwriting a tween that had not finished.
    const xTo = gsap.quickTo(node, 'x', { duration, ease: 'power3' });
    const yTo = gsap.quickTo(node, 'y', { duration, ease: 'power3' });

    let entered = false;
    let state: 'idle' | 'hover' | 'view' = 'idle';

    const apply = (next: typeof state) => {
      if (next === state) return;
      state = next;
      const size = next === 'view' ? SIZE_VIEW : next === 'hover' ? SIZE_HOVER : SIZE_IDLE;
      // Width and height only. `transform` is GSAP's.
      node.style.width = `${size}px`;
      node.style.height = `${size}px`;
      caption.style.opacity = next === 'view' ? '1' : '0';
      caption.style.transform = next === 'view' ? 'scale(1)' : 'scale(0.5)';
    };

    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (!entered) {
        entered = true;
        // Second argument is quickTo's START value: this teleports instead of
        // easing, so the dot does not sail across the panel on every entry.
        xTo(x, x);
        yTo(y, y);
        gsap.to(node, { autoAlpha: 1, duration: reduced ? 0 : 0.2, overwrite: 'auto' });
      } else {
        xTo(x);
        yTo(y);
      }

      // Hit-testing the event target beats a listener per interactive child:
      // it survives children being added, removed or re-rendered by React.
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest('[data-cursor="view"]')) apply('view');
      else if (target?.closest('a, button, [data-cursor="hover"]')) apply('hover');
      else apply('idle');
    };

    const onLeave = () => {
      entered = false;
      apply('idle');
      gsap.to(node, { autoAlpha: 0, duration: reduced ? 0 : 0.2, overwrite: 'auto' });
    };

    /* Listening on the container, not the dot. A listener on the dot would see
       its own `pointerleave` as it slides out from under the pointer and chase
       itself. `pointer-events: none` on the dot is the other half of that. */
    el.addEventListener('pointermove', onMove, { passive: true });
    el.addEventListener('pointerleave', onLeave);

    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      el.style.cursor = previousCursor;
      node.style.display = '';
      gsap.killTweensOf(node);
      gsap.set(node, { clearProps: 'all' });
    };
  }, []);
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Removes both container listeners, restores the container's original inline `cursor` value, resets the dot to `display: none`, then `gsap.killTweensOf` and `clearProps: "all"` to drop the two quickTo tweens and the centring transform. Nothing is left on the element for a remount to inherit.

**Reduced motion.** The cursor still appears, still inverts and still changes size — those are affordances, not motion. Both quickTo durations drop to 0 so the dot is welded to the pointer, and the fade in and out is instant. The CSS size transition is left in place; it is a 400ms state change, not continuous movement.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- An ancestor that creates a stacking context. A `transform`, `filter`, `opacity` below 1, `will-change`, `isolation: isolate`, `contain: paint`, a `position: fixed` parent or a `backdrop-filter` anywhere between the intended blend root and the dot silently confines the blend to that subtree — the dot inverts its immediate parent and nothing else. This is the single most common reason this effect "does not work", and it produces no error, no warning and no console output.
- Transitioning `all` on the dot. It catches `transform`, which GSAP is writing at 60-120fps, and CSS interpolates toward values that are already stale. The cursor then trails the pointer by a fixed distance that changing the tween duration does not fix, because the tween is not the thing lagging.
- Scaling instead of resizing. `scale()` is a transform, so it collides with the follow tween AND it scales the label's stroke weight and letter-spacing along with the circle. Animating `width`/`height` keeps typography at its designed size.
- Listening for `pointermove` on the dot itself. It sits under the pointer, so it receives its own `pointerleave` as it slides, and the cursor chases itself out of the panel. Listen on the container and keep `pointer-events: none` on the dot.
- Hiding the native cursor from CSS. A `cursor: none` rule applies on touch devices too, where this component renders nothing to replace it, so links become untappable-looking with no visible affordance. Set it from JS after the `(pointer: fine)` check and restore it on cleanup.
- Centring with a negative margin instead of `xPercent`/`yPercent`. The margin is a fixed pixel value and the dot changes size by a factor of nine, so it visibly slides off the pointer as it grows.
- Leaving the effect on over navigation. A 150px inverted blob over link text is genuinely worse than an arrow; a real deployment needs an escape hatch that restores the native cursor over the nav.
- Using a theme token for the dot colour. Difference blending only produces a clean inversion from pure white; a near-white token yields a muddy tint over mid-greys.

## Notes

- Gated on `(pointer: fine)`. On touch nothing mounts, the native cursor is never hidden, and the markup stays `display: none` — there is no hover to grow into and `pointermove` only exists mid-drag, which would put the dot under the finger already covering it.
- Scoped to its own container with `position: absolute` inside a `relative isolate` root rather than `position: fixed`. A production site-level cursor is `fixed` at the document root; the isolate here is what makes the blend stop at the component edge instead of inverting the whole page.
- Reduced motion keeps the cursor but sets every duration to 0, so the affordance and the inversion survive while the drift does not.
- The label is `#000` and the dot `#fff` as raw literals, not tokens. Difference blending is defined on the actual channel values; a token would break the inversion the moment the theme shifted.

## Definition of done

Move across the panel and a white dot follows a few frames behind, inverting the text and background under it — dark text goes light where the dot crosses it. Hover a link and it grows to 44px; hover a `data-cursor="view"` target and it grows to 150px with a label that scales up inside it. During the growth the dot stays centred on the pointer and never lags further behind than it did at rest. Leave the panel and it fades out. On touch there is no dot at all and the native cursor is untouched.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
