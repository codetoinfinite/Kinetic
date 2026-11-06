# Build: Composer Loader

A wrapper that lights up a chat composer while a reply is on its way. It paints the pill surface itself, then runs a band of light around the rim above it: a crisp line, a tight glow and a wide bloom, all dash segments on one SVG rounded-rect stroke. The outer half of each stroke is clipped by the pill, so the glow only bleeds inward. Flipping `active` fades the whole effect in or out over 450ms.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Wraps a chat composer while the agent works: an iridescent band orbits the pill rim with a soft bloom, fading in and out.

- Category: display
- Runtime cost: css
- Dependencies: none beyond React

## How it works

1. A `ResizeObserver` on the clipping layer keeps `box` (default 640×52) in sync with the rendered size, and the SVG uses that as its `viewBox` with `preserveAspectRatio="none"`, so stroke widths and blur radii stay in real pixels.
2. Each layer is a `<rect>` with `rx = radius ?? h / 2` and `pathLength={100}`, so the dash is measured in percent of the perimeter and travels at constant speed around the end caps. `strokeDasharray` is `len (100 − len)` with `band = arc / 360 × 100`, and the theme's `bui-composer-loader-dash` keyframes move `stroke-dashoffset` from 0 to −100 once per `speed` seconds.
3. Three layers share one horizontal `linearGradient` (c0, c1, the RGB average of c1 and c2, c2, c3): a wide bloom (`bloom × 2` wide, 14px blur, 0.9 × band long), a tight glow (`line × 3.2`, 6px blur, 0.95 × band) and the crisp line (`line`, 0.5px blur, full band).
4. The softer layers are shorter, and their heads are pulled back behind the tip. The perimeter (`2(w + h) − 8r + 2πr`) converts pixels to path units, and each layer's phase becomes its `animation-delay` (at typical sizes a negative one, a head start) to line the heads up: the glow 10px behind the line, the bloom `bloom + 16`px behind.
5. Blurs are SVG `feGaussianBlur` filters (regions widened to 200%) rather than CSS `filter`, because WebKit ignores CSS filters on individual SVG elements.
6. With `taper > 0`, each layer is drawn as 14 centred copies, each shorter by `taper / 14` and at 1/14 of the opacity, so the two ends ramp up in steps that the blur (raised to `max(0.5, line × 0.8)` on the crisp line) melts together.
7. `active` toggles the clipping layer's opacity between 1 and 0 with a 450ms ease transition. Children render in a `relative` layer above the light.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `DEFAULT_COLORS = #5eead4, #46baec, #e633a4, #00faa7`
  Teal, sky, magenta and mint spread left to right; the middle stop averages sky and magenta, so the band never washes out to white.
- `speed / arc = 4.5s per lap / 120°`
  A third of the rim lit at once, moving slowly enough to read as ambient rather than as a progress bar.
- `line / bloom / bloomStrength / intensity = 2.5px / 16px / 0.3 / 0.7`
  A thin bright edge with a soft inward wash, held under full opacity so it sits on the surface instead of glaring.
- `blur radii = 14, 6, 0.5 (stdDeviation)`
  One per layer: the wide bloom, the tight glow and a hint of softness on the crisp line.
- `head pull-back = glow 10px, bloom `bloom + 16`px`
  The sharp line leads and the soft light trails it, like a highlight sliding along glass.
- `TAPER_STEPS = 14`
  Enough copies that the stepped ramp at each end blurs into a gradient.
- `fade = opacity 450ms ease`
  Toggling on send and reply reads as the composer lighting up rather than snapping.

## API

```ts
function ComposerLoader(props: { children: ReactNode; active?: boolean; colors?: [string, string, string, string]; speed?: number; intensity?: number; bloom?: number; bloomStrength?: number; arc?: number; reverse?: boolean; radius?: number; line?: number; bloomOnly?: boolean; surface?: boolean; taper?: number; blend?: CSSProperties["mixBlendMode"]; offset?: number; className?: string }): JSX.Element
```

- `children: ReactNode`
  The composer. Rendered above the light, so keep it transparent while active.
- `active: boolean` — default `true`
  Show the light; fades in and out over 450ms.
- `colors: [string, string, string, string]` — default `teal, sky, magenta, mint`
  Four `#rrggbb` colours spread across the pill from left to right.
- `speed: number` — default `4.5`
  Seconds per full lap.
- `arc: number` — default `120`
  Length of the band, in degrees of 360.
- `intensity: number` — default `0.7`
  Overall opacity of the light.
- `line: number` — default `2.5`
  Width of the crisp line in px; the tight glow is 3.2 times this.
- `bloom / bloomStrength: number` — default `16 / 0.3`
  How far the bloom bleeds inward in px, and its opacity.
- `bloomOnly: boolean` — default `false`
  Draw only the wide bloom, as a soft wash.
- `taper: number` — default `0`
  Fraction of the band that ramps at each end, 0 to 1.
- `reverse: boolean` — default `false`
  Travel counter-clockwise.
- `radius: number`
  Corner radius in px; omit for a full pill.
- `surface: boolean` — default `true`
  Paint the pill surface (primary background, xs shadow) behind the light.
- `blend: CSSProperties["mixBlendMode"]`
  How the light composites over what is beneath it.
- `offset: number` — default `0`
  Moves the band forward by a fraction of the perimeter.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
const band = (arc / 360) * 100;
const rx = radius ?? box.h / 2;
const cornerRadius = radius ?? 9999;
const direction = reverse ? "reverse" : "normal";

// Path units per px, for pulling each soft layer's head behind the tip.
// Rounded-rect perimeter: straight runs plus the four corner arcs (for the
// default pill, rx = h/2 and this reduces to 2(w−h) + πh).
const cornerR = Math.min(rx, box.w / 2, box.h / 2);
const perimeter = Math.max(1, 2 * (box.w + box.h) - 8 * cornerR + 2 * Math.PI * cornerR);
const pxUnits = (px: number) => (px * 100) / perimeter;
// A layer's delay is its phase: the larger the phase, the further BACK
// along the lap the band sits (a negative delay is a head start). So
// moving a band forward, `offset` included, means subtracting.
const dashPhase = (len: number, backPx: number) =>
  (reverse ? pxUnits(backPx) : len - band + pxUnits(backPx)) - offset * 100;

// Tapering stacks each layer as shorter, centred copies: the ramp at each
// end is a staircase with one step per copy, so it takes many copies and
// a little blur on the crisp line for the steps to melt into a gradient.
const TAPER_STEPS = 14;
const CRISP_BLUR = taper > 0 ? Math.max(0.5, line * 0.8) : 0.5;
const stroke = (width: number, blur: number, opacity: number, dashLen: number, backPx: number) => {
  const copies = taper > 0 ? TAPER_STEPS : 1;
  return Array.from({ length: copies }, (_, index) => {
    // Copy 0 is the full band; each next one is shorter and moved forward
    // by half the difference, so all of them share one midpoint and the
    // ends thin out step by step.
    const len = dashLen * (1 - (taper * index) / copies);
    const phase = dashPhase(dashLen, backPx) - (dashLen - len) / 2;
    return (
      <rect
        key={index}
        x={0}
        y={0}
        width={box.w}
        height={box.h}
        rx={rx}
        pathLength={100}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={width}
        strokeLinecap="round"
        strokeDasharray={`${len} ${100 - len}`}
        className="bui-composer-loader-rect"
        // SVG-native blur, not CSS filter: WebKit (iOS Safari and every iPhone
        // browser) ignores CSS filters on individual SVG elements, which
        // rendered the whole light razor-sharp on phones.
        filter={blur > 0 ? `url(#${gradientId}-b${String(blur).replace(".", "_")})` : undefined}
        style={{
          opacity: opacity / copies,
          animation: `bui-composer-loader-dash ${speed}s linear ${(phase * speed) / 100}s infinite ${direction}`,
        }}
      />
    );
  });
};
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The `ResizeObserver` is disconnected on unmount. The band is a CSS animation and stops with the element. Nothing else is scheduled.

**Reduced motion.** The theme sets `animation: none !important` on every `.bui-composer-loader-rect` under `prefers-reduced-motion: reduce`, which overrides the inline animation. The band then rests as a static glow at the start of the rect path, the top edge, near the top-left corner. The 450ms opacity fade on `active` still runs, since it is a state change rather than a loop.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- The wrapped composer must not paint its own background while `active`. Its children render above the light, so an opaque form covers the band completely. Switch it to `bg-transparent` while busy and let `surface` paint the pill.
- `colors` must be four `#rrggbb` strings. The middle gradient stop is computed by parsing hex pairs, so CSS variables, `rgb()` or short hex give an invalid stop colour.
- Pass `radius` when the composer is not a full pill. Without it the stroke uses `h / 2` and the clipping layer uses 9999px, which only match a pill shape.
- Each layer is wrapped in an SVG blur and animates constantly, so the light costs a repaint every frame while it is visible. Set `active={false}` when nothing is pending, rather than leaving it on at low intensity.
- The first paint uses a 640×52 box until the `ResizeObserver` reports, so a very different size may show a slightly mis-scaled band for one frame.

## Notes

- `offset` moves the band forward by a fraction of the lap, so two loaders on one pill can line up: a short beam with `offset` equal to the difference of the two arcs leads a wider glow tip to tip.
- `blend` sets `mix-blend-mode` on the light layer, for example `screen` to read as light on a dark surface.
- BoardUI's free `agent-composer` uses this exactly: `active={busy}` around a 52px form that turns transparent while the agent is busy.

## Definition of done

With `active` on, a band covering about a third of the rim circles the composer pill once every 4.5s, turning smoothly around both rounded ends. The sharp gradient line leads, with a softer glow and a wide wash trailing slightly behind it, and the glow appears only inside the pill. Setting `active` to false fades it out over about 450ms; setting it back fades it in. Resizing the composer keeps the line at the same thickness and the same lap time. Under reduced motion the band holds still.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
