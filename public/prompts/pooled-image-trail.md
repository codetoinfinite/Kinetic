# Build: Pooled Cursor Image Trail

Sweeping the pointer across the panel drops a trail of tiles behind it, each fading up over 220ms, holding, and fading out — total life 520ms. The tiles come from a fixed ring of 22 nodes created once at mount and reused by index, and a new one is only released when the pointer has travelled more than 130px since the last. Those two rules are the component; the tween values are decoration.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Tiles drop behind the cursor from a fixed ring of 22 reused nodes, one every 130px of travel.

- Category: cursor
- Runtime cost: dom
- Dependencies: gsap@^3.15.0

## How it works

1. A ring of `poolSize` absolutely-positioned canvases is rendered once, all with `will-change: transform` so layer promotion has already happened before the first spawn. Nothing is ever created or removed after mount.
2. `plateCount` gradient plates are painted into offscreen canvases at mount — the registry ships no image assets, so the "photographs" are drawn. A spawn is then a single `drawImage` blit, which keeps the gradient and text work off the frame where a tween starts.
3. On `pointermove` the handler measures `Math.hypot(x - anchor.x, y - anchor.y)` against the last spawn point and returns early below `threshold`. The very first move only seeds the anchor and spawns nothing, so entering from an edge does not drop a tile before any real movement has happened.
4. A spawn takes slot `spawned % poolSize`, picks a plate with a seeded RNG plus a one-line no-repeat guard (`if (i === last) i = (i + 1) % n`), blits it, then `gsap.killTweensOf(node)` before `gsap.set` reinitialises x, y, rotation, scale 0.92, opacity 0 and `zIndex: spawned`.
5. `zIndex` is the monotonically increasing spawn counter, so the newest tile always paints over older ones with no stacking logic at all. At ten spawns a second it would take roughly 285,000 years to reach `Number.MAX_SAFE_INTEGER`.
6. The life is one timeline: in over 220ms with `power2.out`, hold 100ms, out over 200ms with `power2.in`. The pool is sized so a slot's 520ms life always expires before the ring wraps back around to it.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `threshold = 130`
  Pixels of travel per tile, and the single most load-bearing number here. A deliberate sweep across a hero yields 8-10 readable tiles; small jitters yield none. Drop it toward 20 and a flick produces a solid smear of overlapping tiles; raise it past ~250 and normal mouse movement never triggers the effect at all.
- `poolSize = 22`
  The ring must not wrap while a tile is still visible. At 520ms of life you would have to move 22 x 130 = 2860px in 520ms to catch your own tail — a flick nobody performs by accident.
- `plateCount = 17`
  Deliberately coprime with the 22 slots, so the plate-to-slot pairing never settles into a short repeating pattern as the ring advances. Also fewer plates than slots, so the memory cost is bounded independently of pool size.
- `IN_DURATION / HOLD / OUT_DURATION = 0.22 / 0.1 / 0.2`
  520ms total. Fast in with `power2.out` (arrives), a beat of stillness so the tile is actually readable, then a `power2.in` exit (leaves). Collapse the hold and the trail reads as a blur instead of as a sequence of pictures.
- `START_SCALE = 0.92`
  An 8% growth on entry. Enough to read as arriving, small enough not to pop — at 0.7 it looks like a modal opening.
- `TILT = 7`
  Degrees of seeded rotation either way. Perfectly square tiles read as UI panels; a few degrees reads as prints dropped on a table. Past ~12 the corners of successive tiles collide and the trail looks untidy.
- `PLATE_SCALE = 2`
  Backing-store multiplier for the plate canvases. Fixed rather than `devicePixelRatio` so the drawn output is byte-identical on every machine and a visual regression is actually visible.

## API

```ts
function PooledImageTrail(props: { children?: ReactNode; threshold?: number; poolSize?: number; plateCount?: number; tileWidth?: number; tileHeight?: number; seed?: string; className?: string }): JSX.Element
```

- `children: ReactNode`
  Content rendered above the trail layer.
- `threshold: number` — default `130`
  Pixels of pointer travel required before another tile is released.
- `poolSize: number` — default `22`
  Number of reusable nodes in the ring.
- `plateCount: number` — default `17`
  Distinct plates painted at mount. Keep coprime with poolSize.
- `tileWidth: number` — default `236`
  Tile width in CSS px.
- `tileHeight: number` — default `160`
  Tile height in CSS px.
- `seed: string` — default `'pooled-image-trail'`
  Seeds plate choice and tilt so the sequence is deterministic.
- `className: string`
  Merged onto the root container via `cn`.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
const IN_DURATION = 0.22;
const HOLD = 0.1;
const OUT_DURATION = 0.2;
const START_SCALE = 0.92;
const TILT = 7;

export function PooledImageTrail({
  children,
  threshold = 130,
  poolSize = 22,
  plateCount = 17,
  tileWidth = 236,
  tileHeight = 160,
  seed = 'pooled-image-trail',
  className,
}: PooledImageTrailProps) {
  const root = useRef<HTMLDivElement>(null);
  const slots = useRef<Array<HTMLCanvasElement | null>>([]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;

    const nodes: HTMLCanvasElement[] = [];
    for (let i = 0; i < poolSize; i++) {
      const node = slots.current[i];
      if (node) nodes.push(node);
    }
    if (nodes.length === 0) return;

    const bw = tileWidth * PLATE_SCALE;
    const bh = tileHeight * PLATE_SCALE;

    // Paint every plate once, offscreen. A spawn is then a single blit; if the
    // plate were drawn at spawn time the gradient + text work would land on
    // the same frame as the tween start, which is the one frame that must not
    // drop.
    const plates: HTMLCanvasElement[] = [];
    for (let i = 0; i < plateCount; i++) {
      const plate = document.createElement('canvas');
      plate.width = bw;
      plate.height = bh;
      const pctx = plate.getContext('2d');
      if (!pctx) break;
      pctx.scale(PLATE_SCALE, PLATE_SCALE);
      paintPlate(pctx, tileWidth, tileHeight, i);
      plates.push(plate);
    }
    if (plates.length === 0) return;

    const contexts = nodes.map((node) => {
      node.width = bw;
      node.height = bh;
      return node.getContext('2d');
    });

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fine = window.matchMedia('(pointer: fine)').matches;

    gsap.set(nodes, { xPercent: 0, yPercent: 0, opacity: 0, force3D: true });

    if (reduced || !fine) {
      // Poster fallback: three plates fanned in the middle, drawn once. The
      // panel is composed rather than empty, and nothing ever moves.
      const shown = Math.min(3, nodes.length, plates.length);
      for (let i = 0; i < shown; i++) {
        const ctx = contexts[i];
        const plate = plates[i % plates.length];
        const node = nodes[i];
        if (!ctx || !plate || !node) continue;
        ctx.drawImage(plate, 0, 0);
        gsap.set(node, {
          x: el.clientWidth / 2 - tileWidth / 2 + (i - 1) * tileWidth * 0.42,
          y: el.clientHeight / 2 - tileHeight / 2 + (i - 1) * 14,
          rotate: (i - 1) * 4,
          opacity: 1,
          zIndex: i,
        });
      }
      return () => {
        gsap.killTweensOf(nodes);
        gsap.set(nodes, { clearProps: 'all' });
      };
    }

    const rng = createRng(seed);
    /** Monotonic. Doubles as the ring index and as the z-index. */
    let spawned = 0;
    /** Where the last tile was dropped. `null` until the first move seeds it. */
    let anchor: { x: number; y: number } | null = null;
    let lastPlate = -1;

    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // First move seeds the anchor and spawns nothing. Otherwise the initial
      // distance is measured from (0, 0) and entering from the right-hand side
      // of a wide panel drops a tile immediately, before any real movement.
      if (anchor === null) {
        anchor = { x, y };
        return;
      }
      if (Math.hypot(x - anchor.x, y - anchor.y) < threshold) return;
      anchor = { x, y };

      const slot = spawned % nodes.length;
      const node = nodes[slot];
      const ctx = contexts[slot];
      if (!node || !ctx) return;
      spawned++;

      // One-line no-repeat guard. It does not attempt a uniform distribution,
      // because the only thing the eye actually notices is the same picture
      // twice in a row.
      let plateIndex = Math.floor(rng() * plates.length);
      if (plateIndex === lastPlate) plateIndex = (plateIndex + 1) % plates.length;
      lastPlate = plateIndex;
      const plate = plates[plateIndex];
      if (!plate) return;

      ctx.clearRect(0, 0, bw, bh);
      ctx.drawImage(plate, 0, 0);

      // Kill before reuse. A slot recycled while still fading out would carry
      // two competing tweens on `opacity` and visibly flicker.
      gsap.killTweensOf(node);
      gsap.set(node, {
        x: x - tileWidth / 2,
        y: y - tileHeight / 2,
        rotate: randRange(rng, -TILT, TILT),
        scale: START_SCALE,
        opacity: 0,
        // Monotonic z-index: the newest tile always paints over older ones and
        // there is no stacking logic to maintain.
        zIndex: spawned,
      });

      gsap
        .timeline()
        .to(node, { opacity: 1, scale: 1, duration: IN_DURATION, ease: 'power2.out' })
        .to(node, { opacity: 0, duration: OUT_DURATION, ease: 'power2.in' }, `+=${HOLD}`);
    };

    el.addEventListener('pointermove', onMove, { passive: true });

    return () => {
      el.removeEventListener('pointermove', onMove);
      gsap.killTweensOf(nodes);
      gsap.set(nodes, { clearProps: 'all' });
    };
  }, [threshold, poolSize, plateCount, tileWidth, tileHeight, seed]);
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Removes the single `pointermove` listener, calls `gsap.killTweensOf` on every pool node — which also kills the per-spawn timelines, since they only target those nodes — then `gsap.set(nodes, { clearProps: "all" })`. The offscreen plate canvases are plain locals and are collected with the closure; nothing was allocated that needs revoking.

**Reduced motion.** No listener attaches and nothing animates. Three plates are drawn once into the first three pool slots, fanned across the centre with a few degrees of rotation each, so the panel is a composed still of what the effect produces rather than an empty rectangle.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Creating an element per spawn. A fast sweep across a wide hero allocates a hundred nodes, each forcing a style recalc, a layer promotion and a paint at the exact moment the main thread is busiest — the trail stutters precisely when it is being used hardest.
- Spawning on every `pointermove` instead of on distance travelled. Events fire on sub-pixel movement, so a flick produces a solid smear and a slow drift produces a dense clump; "moved" and "moved enough" are different predicates.
- Measuring the first move against a zeroed anchor. The distance from (0, 0) to wherever the pointer entered is usually well over the threshold, so a tile fires the instant the pointer crosses the boundary, before any movement has happened.
- Reusing a slot without `gsap.killTweensOf(node)` first. If the ring wraps onto a tile that is still fading out, two tweens fight over `opacity` and it flickers rather than restarting cleanly.
- Recomputing z-order from tile ages. A monotonic counter is correct, free, and cannot get out of sync; sorting is a whole class of bug bought for nothing.
- Painting the gradient plate at spawn time. The gradient fill, the radial sheen and the text layout all land on the same frame as the tween start, which is the one frame in the effect that must not drop. Paint once at mount and blit.
- Omitting `will-change: transform` from the pool. The browser promotes the tile to its own layer partway through its 220ms entry, so the first frames of every spawn are visibly cheaper-looking than the rest.

## Notes

- Gated on `(pointer: fine)`. On touch a `pointermove` only exists during a drag, so the trail would appear only under a finger that is already covering it and would then be stranded mid-life on lift. The touch path renders the same static fan as reduced motion.
- The tiles sit behind the content layer (`z-0` under a `z-10` child wrapper) so headline copy stays readable while the trail passes under it.
- Plate choice runs on `createRng(seed)`, never `Math.random()`, so the sequence is identical on every load and across a server render.

## Definition of done

Sweep the pointer slowly across the panel and tiles drop behind it roughly every 130px, each readable for about half a second before fading. Jiggle the pointer in place and nothing spawns. Flick as fast as you can and you get a spaced trail, not a smear, and no tile ever restarts mid-fade with a flicker. Enter the panel from an edge and no tile appears until you have actually moved. On touch or with reduced motion you see three static fanned plates.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
