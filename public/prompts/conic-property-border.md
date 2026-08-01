# Build: Conic @property Border

A rounded box wearing an animated conic-gradient border. Two bright stops travel around the ring in opposite quadrants, so the ring reads as rotating rather than blinking. The whole thing is one element and one keyframe — the only moving part is a registered custom property holding an angle, which the browser interpolates for you.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A gradient ring that rotates around a rounded box. Two highlights chase each other; no JavaScript runs.

- Category: primitive
- Runtime cost: css
- Dependencies: none beyond React

## How it works

1. `@property --kx-conic-angle { syntax: "<angle>"; inherits: false; initial-value: 0deg }` registers the custom property so the browser knows its value is an angle. An unregistered custom property is an untyped token stream: a keyframe from `0deg` to `360deg` has no interpolation rule and the value flips at the 50% mark instead of sweeping.
2. A single keyframe block, `@keyframes kx-conic-spin { to { --kx-conic-angle: 360deg } }`, drives that property from its `initial-value` to a full turn over `--kx-conic-duration` with `linear` timing. Linear is required: any ease makes the highlights visibly hesitate once per revolution.
3. The element carries two backgrounds. `linear-gradient(fill, fill) padding-box` paints the interior flat; `conic-gradient(from var(--kx-conic-angle), …) border-box` paints under the border. With `border: 1.5px solid transparent`, the conic layer survives the clip only in the ring, which is how the gradient follows `border-radius` — `border-image` cannot round corners.
4. The gradient has six stops with the glow colour at 55deg and 305deg and the rest colour everywhere else. Two highlights roughly opposite each other read as rotation; a single highlight reads as a light blinking on and off once per cycle.
5. `inherits: false` on the registration stops descendants from picking up the animating value. With inheritance on, every element in the subtree re-resolves its computed style on every frame of the animation, which turns a one-element repaint into a whole-subtree style recalculation.
6. Every colour is read through `var(--name, fallback)`, so the component renders correctly with no props and can be re-themed by setting `--conic-glow` or `--conic-fill` on any ancestor.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `glow stop positions = 55deg and 305deg`
  Two highlights, not one, and not diametrically opposite. 250 degrees apart means one is entering the top edge as the other leaves the bottom, so there is always motion somewhere on the ring. At 180 degrees apart the pair reads as a symmetric pulse; with one stop it reads as a blinking dot.
- `durationMs = 4000`
  One revolution. Below ~2500 ms the ring reads as a loading spinner and demands attention; above ~7000 ms the highlight barely appears to move and the border looks like a static gradient someone got wrong.
- `thickness = 1.5px`
  Sub-pixel on a 1x display, which is what keeps it a hairline rather than a stripe. At 1px the highlight is too thin to read colour; at 3px or more the conic banding between stops becomes visible as facets.
- `rest colour alpha = currentColor at 10%`
  The dim majority of the ring. At 0% the border disappears between highlights and the box appears to lose its outline; above ~20% the contrast against the glow collapses and the rotation stops reading.
- `reduced-motion parked angle = 132deg`
  Puts one highlight past the top-left shoulder rather than exactly on an edge or a corner. At the `initial-value` of 0deg the highlight sits dead centre on the right edge, which looks like a rendering artefact rather than a decision.

## API

```ts
function ConicBorder(props: { children: ReactNode; durationMs?: number; thickness?: string; radius?: string; glow?: string; rest?: string; fill?: string; paused?: boolean; className?: string }): JSX.Element
```

- `children: ReactNode`
  Content rendered inside the ring. The element is `inline-flex`, centred.
- `durationMs: number` — default `4000`
  Milliseconds for one full revolution.
- `thickness: string` — default `'1.5px'`
  Ring thickness. Becomes the transparent border width.
- `radius: string` — default `'9999px'`
  Corner radius. The gradient follows it, unlike `border-image`.
- `glow: string`
  Colour of the two travelling highlights. Defaults to `currentColor`.
- `rest: string`
  Colour of the dim ring between highlights. Defaults to `currentColor` at 10%.
- `fill: string`
  Interior fill. Must be opaque or the gradient shows through the middle.
- `paused: boolean` — default `false`
  Sets `animation-play-state: paused`, freezing the ring at its current angle.
- `className: string`
  Merged onto the ring element via `cn`. Use it for padding and typography.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/* Injected once per document. React 19 hoists `<style href precedence>` into
   <head> and de-duplicates by `href`, so a hundred rings ship one rule set —
   and `@property` registration is global anyway, so re-declaring it per
   instance would be pure waste. */
const CONIC_BORDER_CSS = `
@property --kx-conic-angle {
  syntax: "<angle>";
  inherits: false;
  initial-value: 0deg;
}

@keyframes kx-conic-spin {
  to { --kx-conic-angle: 360deg; }
}

.kx-conic {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  isolation: isolate;

  border: var(--kx-conic-width, 1.5px) solid transparent;
  border-radius: var(--kx-conic-radius, 9999px);

  /* padding-box layer paints the interior, border-box layer paints under the
     ring. Order matters: the first background listed is the topmost. */
  background:
    linear-gradient(var(--kx-conic-fill), var(--kx-conic-fill)) padding-box,
    conic-gradient(
      from var(--kx-conic-angle),
      var(--kx-conic-rest)   0deg,
      var(--kx-conic-glow)  55deg,
      var(--kx-conic-rest) 130deg,
      var(--kx-conic-rest) 230deg,
      var(--kx-conic-glow) 305deg,
      var(--kx-conic-rest) 360deg
    ) border-box;

  animation: kx-conic-spin var(--kx-conic-duration, 4s) linear infinite;
}

.kx-conic[data-paused='true'] {
  animation-play-state: paused;
}

/* No motion: keep the ring, stop the revolution, and park a highlight
   off-axis so the border still reads as decorated rather than broken. */
@media (prefers-reduced-motion: reduce) {
  .kx-conic {
    animation: none;
    --kx-conic-angle: 132deg;
  }
}
`;

export function ConicBorder({
  children,
  durationMs = 4000,
  thickness = '1.5px',
  radius = '9999px',
  glow,
  rest,
  fill,
  paused = false,
  className,
}: ConicBorderProps) {
  /* Every colour resolves through a `var(..., fallback)` chain, so the
     component works with zero configuration and is themeable by setting one
     property on any ancestor. `Canvas` is the system background keyword — a
     last resort that is at least the right polarity in both colour schemes. */
  const style: StyleWithVars = {
    '--kx-conic-duration': `${durationMs}ms`,
    '--kx-conic-width': thickness,
    '--kx-conic-radius': radius,
    '--kx-conic-glow': glow ?? 'var(--conic-glow, currentColor)',
    '--kx-conic-rest':
      rest ?? 'var(--conic-rest, color-mix(in oklab, currentColor 10%, transparent))',
    '--kx-conic-fill': fill ?? 'var(--conic-fill, var(--color-bg, Canvas))',
  };

  return (
    <>
      <style href="kinetic-conic-property-border" precedence="medium">
        {CONIC_BORDER_CSS}
      </style>
      <div
        className={cn('kx-conic', className)}
        style={style}
        data-paused={paused ? 'true' : undefined}
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

**Cleanup.** Nothing to clean up. There is no listener, no timer and no animation frame; unmounting the element removes the only thing that was running. The hoisted `<style>` is reference-counted by React and removed when the last instance unmounts.

**Reduced motion.** A `@media (prefers-reduced-motion: reduce)` block sets `animation: none` and pins `--kx-conic-angle` to 132deg. The gradient border stays — same colours, same thickness — it simply does not revolve. Nothing is removed from the layout and no size changes.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Animating the custom property without registering it with `@property`. The animation runs — `getComputedStyle` even reports it — but the gradient snaps from its start angle to its end angle at the halfway point, because an unregistered custom property interpolates as a discrete token stream. This is the single most common way this effect is reported "broken".
- Writing `border: 1.5px solid` with no colour, or omitting the border entirely. With no border there is no border-box area outside the padding box, the conic layer is fully covered by the fill layer, and the ring is invisible. The border must exist and must be transparent.
- Putting the fill layer second in the `background` list. Backgrounds paint first-listed on top; with the order reversed the flat fill is painted underneath and the conic gradient covers the entire box, not just the ring.
- Leaving `inherits` at its default of `true`. Descendants then inherit an animating value, so the browser recomputes styles for the whole subtree every frame. On a card with 40 children this shows up as a steady 3-5 ms of style recalculation per frame in a performance profile.
- Assuming the animation is compositor-driven and reaching for `will-change: transform`. It is not: animating a registered property repaints the element background on the main thread every frame. That is cheap on a button and expensive on a full-width hero — scale the element, not the hint.
- Using a semi-transparent interior fill. The conic layer extends under the whole border box, so anything less than opaque lets the gradient bleed through the middle of the card.

## Notes

- `@property` needs Safari 16.4+, Chrome 85+, Firefox 128+. Where it is unsupported the `@property` rule is dropped, the keyframe cannot animate the custom property, and `from var(--kx-conic-angle)` falls back to the guaranteed-invalid initial value — the conic gradient still paints from 0deg. The degradation is a static two-highlight ring, which is an acceptable border on its own.
- The CSS ships inside the component as a `<style href precedence>` element. React 19 hoists it into `<head>` and de-duplicates by `href`, so any number of instances contribute one rule set and one `@property` registration.
- The class name is prefixed `kx-` rather than scoped per instance on purpose: `@property` registration is document-global, so per-instance scoping would buy nothing and cost a style element per mount.

## Definition of done

Two bright arcs travel continuously around the border and pass the corners without pausing or jumping — in particular, nothing snaps at the halfway point of the cycle. The interior stays fully opaque. Set `paused` and the arcs freeze where they are. Enable reduced motion at the OS level and the ring is still coloured but completely still.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
