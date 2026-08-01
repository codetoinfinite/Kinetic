# Build: Radial Mask Spotlight

A stacked layer is masked by a radial gradient whose centre follows the pointer, so content is lit rather than uncovered. The mask string is rewritten once per animation frame from a damped pointer position, and both the prefixed and unprefixed `mask-image` properties are set.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A layer masked to a soft disc follows the pointer, with a flat core that makes it read as a beam.

- Category: cursor
- Runtime cost: dom
- Dependencies: none beyond React

## How it works

1. The gradient stops are the design: solid black to 30% of the radius, then a ramp to transparent at 72%. That flat core gives the beam a lit region with an actual size. A gradient that begins falling off at 0% has no lit area at all — just a bright point that fades, which the eye reads as blur rather than as light.
2. A px radius is used rather than a percentage. A percentage radius in a radial gradient resolves against the element box, so the same declaration produces a beam of a different physical size in every panel it is dropped into, and the effect stops being reusable.
3. Position comes from `useSmoothPointer` with a very low smoothing factor, so the beam has a small amount of drag. `damp` is frame-rate independent — the smoothing constant is the fraction of the gap left after one full second — so the same value produces the same feel at 60Hz and 144Hz rather than the beam arriving twice as fast on a fast display.
4. The mask is written in a `useRaf` callback, not in the pointer handler. Setting `mask-image` invalidates paint for the layer, and a fast pointer delivers two or three events per frame, so a per-event write does the same expensive work several times to produce one visible result.
5. The layer is seeded with a mask parked two radii off-panel, so the first painted frame — before rAF has run once — cannot show the layer unmasked. Nothing is written until `pointer.active` is true, which is what stops the beam flashing at the hook's centre-parked seed position on mount.
6. Both `maskImage` and `WebkitMaskImage` are set. This is not defensive habit: released Safari versions mishandle gradient masks without the prefix, and the failure mode is the layer being fully visible or fully invisible rather than slightly wrong.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `radius = 220`
  Beam radius in px, giving a 132px solid core and a 92px falloff. Below ~120 the core is too small to hold a line of text and the effect becomes a magnifier; above ~350 in a small panel the falloff never completes inside the box and the beam reads as an uneven wash.
- `CORE_STOP = 0.3`
  Where the solid region ends. This is the single number that separates "a light" from "a smudge". At 0 there is no lit area, only a peak; past ~0.5 the edge becomes hard enough that it reads as a cut-out hole instead of illumination.
- `EDGE_STOP = 0.72`
  Where the falloff reaches zero. Short of 100% so the gradient completes inside its own radius and the beam never shows a visible circular boundary at the edge of the declared circle.
- `smoothing = 0.0006`
  Fraction of the remaining distance still uncovered after one second — so the beam is effectively caught up within about 100ms. Enough drag to give the light some weight, not enough for the beam to visibly trail behind the thing you are pointing at, which would make it useless for reading.
- `FADE_MS = 260`
  Enter and leave fade on the whole layer. Long enough that the beam does not blink on and off as the pointer crosses the edge, short enough that leaving does not leave a light hanging in an unhovered panel.
- `rest mask offset = -radius * 2`
  Where the seeded mask sits before the first frame. Two radii guarantees no part of the falloff is inside the box at any panel size, so nothing is lit before the pointer has been seen.

## API

```ts
function RadialMaskSpotlight(props: { children: ReactNode; radius?: number; smoothing?: number; className?: string }): JSX.Element
```

- `children: ReactNode`
  Content of the lit layer. Should have a transparent background.
- `radius: number` — default `220`
  Beam radius in CSS px. Core is 30% of this, falloff completes at 72%.
- `smoothing: number` — default `0.0006`
  Fraction of the gap remaining after one second. Lower is tighter.
- `className: string`
  Merged onto the root container via `cn`.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/** Where the solid core ends, as a fraction of `radius`. */
const CORE_STOP = 0.3;
/** Where the falloff reaches full transparency, as a fraction of `radius`. */
const EDGE_STOP = 0.72;
const FADE_MS = 260;

export function RadialMaskSpotlight({
  children,
  radius = 220,
  smoothing = 0.0006,
  className,
}: RadialMaskSpotlightProps) {
  const root = useRef<HTMLDivElement>(null);
  const lit = useRef<HTMLDivElement>(null);
  const enabled = useRef(false);
  const visible = useRef(false);

  const pointer = useSmoothPointer({
    target: root,
    smoothing,
    // Touch is explicitly off: this component is fine-pointer only, and
    // letting touch drags drive the mask would move the beam under the finger.
    touch: false,
  });

  useEffect(() => {
    const el = root.current;
    const layer = lit.current;
    if (!el || !layer) return;

    const fine = window.matchMedia('(pointer: fine)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!fine) {
      /* No pointer to track. Rather than leaving a masked layer invisible, the
         mask is removed entirely so the lit layer simply shows in full — the
         content stays readable and nothing is hidden behind an effect that
         cannot be operated. */
      layer.style.maskImage = '';
      layer.style.webkitMaskImage = '';
      layer.style.opacity = '1';
      return;
    }

    enabled.current = !reduced;

    if (reduced) {
      /* Reduced motion keeps the spotlight — it is a hover affordance, not
         gratuitous movement — but pins it. A beam that chases the pointer with
         inertia is the part that was objected to, so the mask is written once,
         parked, and never updated again. */
      const rect = el.getBoundingClientRect();
      writeMask(layer, rect.width * 0.5, rect.height * 0.45, radius);
      layer.style.opacity = '1';
      return;
    }

    const onEnter = () => {
      visible.current = true;
      layer.style.opacity = '1';
    };
    const onLeave = () => {
      visible.current = false;
      layer.style.opacity = '0';
    };

    el.addEventListener('pointerenter', onEnter);
    el.addEventListener('pointerleave', onLeave);

    return () => {
      el.removeEventListener('pointerenter', onEnter);
      el.removeEventListener('pointerleave', onLeave);
      enabled.current = false;
      layer.style.maskImage = '';
      layer.style.webkitMaskImage = '';
      layer.style.opacity = '';
    };
  }, [radius]);

  useRaf(() => {
    const layer = lit.current;
    if (!layer || !enabled.current) return;
    const p = pointer.current;
    // `active` is false until a real pointer has been seen. Writing before
    // that would place the beam at the hook's centre-parked seed value, which
    // flashes a spotlight the user never asked for.
    if (!p.active) return;
    writeMask(layer, p.x, p.y, radius);
  });

  return (
    <div ref={root} className={cn('relative isolate overflow-hidden', className)}>
      <div
        ref={lit}
        className="absolute inset-0"
        style={{
          opacity: 0,
          transition: `opacity ${FADE_MS}ms ease-out`,
          // Seeded off-panel so the very first painted frame cannot show an
          // unmasked layer before rAF runs.
          maskImage: restMask(radius),
          WebkitMaskImage: restMask(radius),
        }}
      >
        {children}
      </div>
    </div>
  );
}

function maskFor(x: number, y: number, radius: number): string {
  /* `circle <radius>px at <x>px <y>px` — an explicit px radius rather than a
     percentage, because a percentage radius in a radial gradient resolves
     against the box and would make the beam a different physical size on
     every panel it is dropped into. */
  return `radial-gradient(circle ${radius}px at ${x}px ${y}px, #000 0%, #000 ${
    CORE_STOP * 100
  }%, transparent ${EDGE_STOP * 100}%)`;
}

function restMask(radius: number): string {
  return maskFor(-radius * 2, -radius * 2, radius);
}

function writeMask(layer: HTMLElement, x: number, y: number, radius: number) {
  const value = maskFor(x, y, radius);
  /* Both spellings. Safari has shipped unprefixed `mask-image` for years but
     still mishandles gradient masks without `-webkit-` in enough released
     versions that dropping the prefix means the layer is either fully visible
     or fully gone on those browsers — a total failure, not a degraded one. */
  layer.style.maskImage = value;
  layer.style.webkitMaskImage = value;
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Removes the enter and leave listeners, flips the enabled flag so any in-flight frame is a no-op, and clears the inline `maskImage`, `WebkitMaskImage` and `opacity`. `useRaf` and `useSmoothPointer` unsubscribe themselves. Nothing was allocated beyond the two strings written per frame.

**Reduced motion.** The spotlight is still drawn — it is a hover affordance and removing it would hide content — but it never moves. The mask is written once at 50% across and 45% down, the rAF loop is left disabled, and no pointer listeners attach.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- A linear falloff from 0%. Without a flat core there is no lit region, just a bright centre that fades continuously, and the result reads as a blurred blob rather than a light. This is the most common way this effect is built and the most common reason it looks cheap.
- Setting only `maskImage`. Released Safari versions mishandle gradient masks without `-webkit-mask-image`, and the failure is total — the layer is either always visible or never visible — so it does not look like a mask bug when reported.
- Writing the mask in the `pointermove` handler. Every write invalidates paint for the layer, and a fast pointer produces several events per frame, so the same paint is thrown away two or three times before anything reaches the screen.
- A percentage radius. `circle 30% at ...` resolves against the element box, so the beam is a different size in every container and the constant that looked right in the design mock is wrong everywhere else.
- Writing the mask before the pointer has actually been seen. `useSmoothPointer` parks at the element centre so the first movement eases out sensibly, but that seed is not a real position — treating it as one flashes a spotlight in the middle of the panel on mount.
- Masking a layer containing interactive elements. `mask-image` does not clip hit testing, so links in the dark region are still clickable while being invisible. Either keep the masked layer non-interactive or accept that the mask is purely decorative.
- Putting the effect on a layer with its own background. The mask reveals the layer, and a masked opaque background is a visible disc of colour, not a light. The lit layer needs a transparent background so the beam shows content, not a shape.

## Notes

- Gated on `(pointer: fine)`. On touch the mask is removed entirely and the lit layer shows in full rather than staying hidden — an effect that cannot be operated must not be allowed to hide content. `useSmoothPointer` is also configured with `touch: false` so a scroll drag can never move the beam.
- Reduced motion keeps the spotlight but pins it: the mask is written once, centred slightly above middle, and never updated. The affordance survives; the chasing does not.
- Scoped to its own container and measured against its rect, so several instances can appear on one page without interfering.
- The masked layer is decorative by construction. If it holds links, remember that a mask hides paint but not hit testing.

## Definition of done

Move across the panel and a soft round beam follows the pointer with a slight drag, lighting the content under it. The centre of the beam is evenly lit rather than brightest at one point — cover the middle third with a finger and the light should look flat, not peaked. Enter and leave and the whole layer fades over about a quarter of a second rather than blinking. On first load, before you move, nothing is lit. Check in Safari that the beam appears at all. On touch the layer is fully visible with no mask.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
