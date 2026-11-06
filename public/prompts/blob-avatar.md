# Build: Blob Avatar

A friendly avatar for agents and bots: a soft coloured body with a darker edge and a pair of eyes. Seven body shapes (blob, squircle, star, flower, diamond, shield, cloud), six faces and eight colours. Give it only a name and the name picks all three, always the same way; set any of them to override. While motion is allowed the outline slowly breathes between three wobbled versions of itself and the eyes blink, each avatar on its own timing so a list never moves in step.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Seeded SVG blob with eyes: a name picks its shape, colour and face, the body gently morphs and blinks, six sizes.

- Category: display
- Runtime cost: css
- Dependencies: none beyond React

## How it works

1. blobLook(seed) hashes the string once (FNV-1a via hashSeed) and reads colour, shape and face from different bits of the hash, so changing one letter of a name gives a new avatar but the same name is stable across renders, servers and reloads.
2. Each shape is a unit outline of 40 points: polar radius functions for squircle (superellipse, p = 4), star (raised cosine of 5θ), flower (|cos 3θ|^0.6), cloud (five bumps with a flat base) and blob (three seeded cosine lumps), and arc-length samples along a polygon for diamond and shield.
3. A seeded tilt of up to ±8° rotates the outline, then toPath turns the points into a closed Catmull-Rom spline written as cubic Béziers (control points at ±1/6 of the neighbour chord), which rounds polygon corners and keeps curves smooth.
4. blobPaths builds the rest path and two wobbled frames by scaling every point along its radius by 1 + 5.5% × (0.6 sin(2θ + φ) + 0.4 sin(3θ − 2φ)), with φ advanced a third of a turn per frame. All frames share the same command list, so SMIL <animate attributeName="d"> can interpolate rest → A → B → rest with eased keySplines.
5. The same animate element drives the edge path (offset 2.5, 3.5), the body and the clip path of a soft top-left highlight, so light and edge follow the morph. Eyes are drawn around their own origin and blink with an animateTransform scale to 12% height for 4% of a 3.5 to 6.5 s cycle.
6. Morph length (5.5 to 8 s), blink length and a negative begin offset are drawn from a second seeded generator, so every avatar starts mid-cycle and neighbours drift apart.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `samples = 40 per outline`
  Divides by 5 and 8, so star tips land exactly on a sample; fewer points made the diamond and shield corners mushy.
- `wobble = 5.5% of the radius`
  Reads as breathing at 32px without changing the silhouette enough to look like a different shape.
- `edge offset = 2.5, 3.5 in a 100 viewBox`
  A thin darker rim on the lower right gives the flat blob a bit of thickness, like a cut-out sticker.
- `sizes = xs 24 · sm 32 · md 40 · lg 56 · xl 80 · 2xl 128 px`
  Matches list rows (32), headers (40) and the large editor preview (128); any number also works.
- `blink = scaleY 0.12 for 4% of the cycle`
  About 200 ms closed, quick enough to read as a blink rather than a squint.

## API

```ts
function BlobAvatar(props: { name: string; seed?: string; shape?: BlobShape; color?: BlobColor; face?: BlobFace; size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | number; animated?: boolean; decorative?: boolean; children?: ReactNode; className?: string }): JSX.Element
```

- `name: string`
  Accessible name and default seed.
- `seed: string`
  Seed for look and wobble when it should not follow the name (for example a stable id).
- `shape: "blob" | "squircle" | "star" | "flower" | "diamond" | "shield" | "cloud"`
  Overrides the seeded shape.
- `color: "lime" | "mint" | "sky" | "violet" | "peach" | "butter" | "pink" | "coral"`
  Overrides the seeded colour.
- `face: "dots" | "happy" | "sleepy" | "wink" | "surprised" | "none"`
  Overrides the seeded face.
- `size: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | number` — default `"md"`
  Preset or pixel size.
- `animated: boolean` — default `true`
  Morph and blink; forced off under reduced motion.
- `decorative: boolean` — default `false`
  aria-hidden instead of role="img" with the name.
- `children: ReactNode`
  Overlay such as a status dot.
- `className: string`
  Classes for the avatar box.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/** Shape, colour and face picked from a string, so the same name always gets the same blob. */
export function blobLook(seed: string): { shape: BlobShape; color: BlobColor; face: BlobFace } {
  const h = hashSeed(seed);
  return {
    color: COLOR_KEYS[h % COLOR_KEYS.length] ?? "lime",
    shape: BLOB_SHAPES[(h >>> 4) % BLOB_SHAPES.length] ?? "blob",
    face: BLOB_FACES[(h >>> 8) % 4] ?? "dots",
  };
}

function polar(radius: (angle: number) => number): Pt[] {
  return Array.from({ length: SAMPLES }, (_, i) => {
    const a = -Math.PI / 2 + (i / SAMPLES) * Math.PI * 2;
    const r = radius(a + Math.PI / 2); // 0 points straight up
    return [Math.cos(a) * r, Math.sin(a) * r] as const;
  });
}

/** Even arc-length samples along a closed polygon; the spline later rounds its corners. */
function polygon(verts: Pt[]): Pt[] {
  const lens = verts.map((v, i) => {
    const w = verts[(i + 1) % verts.length] ?? v;
    return Math.hypot(w[0] - v[0], w[1] - v[1]);
  });
  const total = lens.reduce((sum, l) => sum + l, 0);
  const out: Pt[] = [];
  let seg = 0;
  let start = 0;
  for (let i = 0; i < SAMPLES; i++) {
    const d = (i / SAMPLES) * total;
    while (seg < verts.length - 1 && start + (lens[seg] ?? 0) < d) start += lens[seg++] ?? 0;
    const v = verts[seg] ?? ([0, 0] as const);
    const w = verts[(seg + 1) % verts.length] ?? v;
    const t = (d - start) / (lens[seg] || 1);
    out.push([v[0] + (w[0] - v[0]) * t, v[1] + (w[1] - v[1]) * t]);
  }
  return out;
}

/** Unit outline (radius about 1, y down) for a shape; `rand` adds the per-seed lumps. */
function outline(shape: BlobShape, rand: () => number): Pt[] {
  switch (shape) {
    case "squircle":
      return polar((a) => 0.84 * (Math.abs(Math.cos(a)) ** 4 + Math.abs(Math.sin(a)) ** 4) ** -0.25);
    case "star":
      return polar((a) => 0.58 + 0.42 * ((1 + Math.cos(5 * a)) / 2) ** 1.4);
    case "flower":
      return polar((a) => 0.74 + 0.26 * Math.abs(Math.cos(3 * a)) ** 0.6);
    case "diamond":
      return polygon([[0, -1], [0.9, 0], [0, 1], [-0.9, 0]]);
    case "shield":
      return polygon([[-0.84, -0.8], [0, -0.94], [0.84, -0.8], [0.8, 0.18], [0, 0.98], [-0.8, 0.18]]);
    case "cloud":
      return polar((a) => 0.8 + 0.2 * Math.abs(Math.cos(2.5 * a)) ** 0.5).map(([x, y]) => [x * 1.06, Math.min(y, 0.66)] as const);
    case "blob": {
      const lumps = [2, 3, 4].map((k) => ({ k, amp: randRange(rand, 0.025, 0.075), phase: randRange(rand, 0, Math.PI * 2) }));
      return polar((a) => 0.92 + lumps.reduce((sum, l) => sum + l.amp * Math.cos(l.k * a + l.phase), 0));
    }
  }
}

const round = (v: number) => Math.round(v * 10) / 10;

/** Closed Catmull-Rom spline through the points, as cubic Béziers in viewBox units. */
function toPath(points: Pt[]): string {
  const p = points.map(([x, y]) => [CX + x * RADIUS, CY + y * RADIUS] as const);
  const n = p.length;
  const at = (i: number): Pt => p[((i % n) + n) % n] ?? [CX, CY];
  let d = `M${round(at(0)[0])} ${round(at(0)[1])}`;
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    d += `C${round(p1[0] + (p2[0] - p0[0]) / 6)} ${round(p1[1] + (p2[1] - p0[1]) / 6)} ${round(p2[0] - (p3[0] - p1[0]) / 6)} ${round(p2[1] - (p3[1] - p1[1]) / 6)} ${round(p2[0])} ${round(p2[1])}`;
  }
  return `${d}Z`;
}

/**
 * The resting path of a shape plus two wobbled frames. A seeded tilt keeps two
 * blobs of the same shape from looking stamped; the frames push each sample
 * in and out along its own radius with two out-of-phase waves.
 */
export function blobPaths(shape: BlobShape, seed: string): { rest: string; frames: [string, string, string, string] } {
  const rand = createRng(`${shape}:${seed}`);
  const tilt = randRange(rand, -0.14, 0.14);
  const base = outline(shape, rand).map(([x, y]) => [x * Math.cos(tilt) - y * Math.sin(tilt), x * Math.sin(tilt) + y * Math.cos(tilt)] as const);
  const phase = randRange(rand, 0, Math.PI * 2);
  const wobble = (k: number) =>
    toPath(
      base.map(([x, y], i) => {
        const theta = (i / SAMPLES) * Math.PI * 2;
        const ph = phase + (k * Math.PI * 2) / 3;
        const f = 1 + WOBBLE * (0.6 * Math.sin(2 * theta + ph) + 0.4 * Math.sin(3 * theta - 2 * ph));
        return [x * f, y * f] as const;
      }),
    );
  const rest = toPath(base);
  return { rest, frames: [rest, wobble(1), wobble(2), rest] };
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** No timers, listeners or rAF: the morph and blink are SMIL animations owned by the SVG and stop when the element unmounts.

**Reduced motion.** Under prefers-reduced-motion the SVG animate and animateTransform elements are not rendered at all, so the avatar shows its resting outline with open eyes; shape, colour and face are unchanged.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Morph frames must have the same number of points and commands; mixing shapes inside one animate snaps instead of morphing.
- Round path numbers before rendering (here to 0.1): long floats bloat the markup and can differ between the server and the browser, which breaks hydration.
- SMIL ignores prefers-reduced-motion, so the animate elements are only rendered when motion is allowed; do not rely on a CSS media query to stop them.
- Pass decorative when the name already sits next to the avatar, otherwise screen readers hear every agent name twice.

## Notes

- Children are overlaid on the avatar box, so a status dot can sit on its corner.
- BLOB_COLORS holds plain artwork colours (fill and edge) that stay the same in light and dark themes; they are only used inside the SVG.
- blobLook and blobPaths are exported for pickers and for drawing the same blob in a canvas or an OG image.

## Definition of done

The same name renders the same shape, colour and face on every load; shape, color and face props override them; data-shape, data-color and data-face reflect the result; with reduced motion no animate element is in the DOM; sizes render at 24, 32, 40, 56, 80 and 128 px.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
