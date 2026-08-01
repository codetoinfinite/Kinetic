import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'pooled-image-trail',
  title: 'Pooled Cursor Image Trail',
  category: 'cursor',
  tags: ['gsap', 'pointer', 'object-pool', 'trail', 'canvas', 'throttle'],
  blurb: 'Tiles drop behind the cursor from a fixed ring of 22 reused nodes, one every 130px of travel.',
  cost: 'dom',
  motif: 'trail',

  files: [
    {
      path: 'registry/ui/pooled-image-trail.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['gsap@^3.15.0'],
  registryDependencies: ['prng'],

  summary:
    'Sweeping the pointer across the panel drops a trail of tiles behind it, each fading up over 220ms, holding, and fading out — total life 520ms. The tiles come from a fixed ring of 22 nodes created once at mount and reused by index, and a new one is only released when the pointer has travelled more than 130px since the last. Those two rules are the component; the tween values are decoration.',

  mechanism: [
    'A ring of `poolSize` absolutely-positioned canvases is rendered once, all with `will-change: transform` so layer promotion has already happened before the first spawn. Nothing is ever created or removed after mount.',
    '`plateCount` gradient plates are painted into offscreen canvases at mount — the registry ships no image assets, so the "photographs" are drawn. A spawn is then a single `drawImage` blit, which keeps the gradient and text work off the frame where a tween starts.',
    'On `pointermove` the handler measures `Math.hypot(x - anchor.x, y - anchor.y)` against the last spawn point and returns early below `threshold`. The very first move only seeds the anchor and spawns nothing, so entering from an edge does not drop a tile before any real movement has happened.',
    'A spawn takes slot `spawned % poolSize`, picks a plate with a seeded RNG plus a one-line no-repeat guard (`if (i === last) i = (i + 1) % n`), blits it, then `gsap.killTweensOf(node)` before `gsap.set` reinitialises x, y, rotation, scale 0.92, opacity 0 and `zIndex: spawned`.',
    '`zIndex` is the monotonically increasing spawn counter, so the newest tile always paints over older ones with no stacking logic at all. At ten spawns a second it would take roughly 285,000 years to reach `Number.MAX_SAFE_INTEGER`.',
    'The life is one timeline: in over 220ms with `power2.out`, hold 100ms, out over 200ms with `power2.in`. The pool is sized so a slot\'s 520ms life always expires before the ring wraps back around to it.',
  ],

  constants: [
    {
      name: 'threshold',
      value: '130',
      why: 'Pixels of travel per tile, and the single most load-bearing number here. A deliberate sweep across a hero yields 8-10 readable tiles; small jitters yield none. Drop it toward 20 and a flick produces a solid smear of overlapping tiles; raise it past ~250 and normal mouse movement never triggers the effect at all.',
    },
    {
      name: 'poolSize',
      value: '22',
      why: 'The ring must not wrap while a tile is still visible. At 520ms of life you would have to move 22 x 130 = 2860px in 520ms to catch your own tail — a flick nobody performs by accident.',
    },
    {
      name: 'plateCount',
      value: '17',
      why: 'Deliberately coprime with the 22 slots, so the plate-to-slot pairing never settles into a short repeating pattern as the ring advances. Also fewer plates than slots, so the memory cost is bounded independently of pool size.',
    },
    {
      name: 'IN_DURATION / HOLD / OUT_DURATION',
      value: '0.22 / 0.1 / 0.2',
      why: '520ms total. Fast in with `power2.out` (arrives), a beat of stillness so the tile is actually readable, then a `power2.in` exit (leaves). Collapse the hold and the trail reads as a blur instead of as a sequence of pictures.',
    },
    {
      name: 'START_SCALE',
      value: '0.92',
      why: 'An 8% growth on entry. Enough to read as arriving, small enough not to pop — at 0.7 it looks like a modal opening.',
    },
    {
      name: 'TILT',
      value: '7',
      why: 'Degrees of seeded rotation either way. Perfectly square tiles read as UI panels; a few degrees reads as prints dropped on a table. Past ~12 the corners of successive tiles collide and the trail looks untidy.',
    },
    {
      name: 'PLATE_SCALE',
      value: '2',
      why: 'Backing-store multiplier for the plate canvases. Fixed rather than `devicePixelRatio` so the drawn output is byte-identical on every machine and a visual regression is actually visible.',
    },
  ],

  pitfalls: [
    'Creating an element per spawn. A fast sweep across a wide hero allocates a hundred nodes, each forcing a style recalc, a layer promotion and a paint at the exact moment the main thread is busiest — the trail stutters precisely when it is being used hardest.',
    'Spawning on every `pointermove` instead of on distance travelled. Events fire on sub-pixel movement, so a flick produces a solid smear and a slow drift produces a dense clump; "moved" and "moved enough" are different predicates.',
    'Measuring the first move against a zeroed anchor. The distance from (0, 0) to wherever the pointer entered is usually well over the threshold, so a tile fires the instant the pointer crosses the boundary, before any movement has happened.',
    'Reusing a slot without `gsap.killTweensOf(node)` first. If the ring wraps onto a tile that is still fading out, two tweens fight over `opacity` and it flickers rather than restarting cleanly.',
    'Recomputing z-order from tile ages. A monotonic counter is correct, free, and cannot get out of sync; sorting is a whole class of bug bought for nothing.',
    'Painting the gradient plate at spawn time. The gradient fill, the radial sheen and the text layout all land on the same frame as the tween start, which is the one frame in the effect that must not drop. Paint once at mount and blit.',
    'Omitting `will-change: transform` from the pool. The browser promotes the tile to its own layer partway through its 220ms entry, so the first frames of every spawn are visibly cheaper-looking than the rest.',
  ],

  notes: [
    'Gated on `(pointer: fine)`. On touch a `pointermove` only exists during a drag, so the trail would appear only under a finger that is already covering it and would then be stranded mid-life on lift. The touch path renders the same static fan as reduced motion.',
    'The tiles sit behind the content layer (`z-0` under a `z-10` child wrapper) so headline copy stays readable while the trail passes under it.',
    'Plate choice runs on `createRng(seed)`, never `Math.random()`, so the sequence is identical on every load and across a server render.',
  ],

  apiSignature:
    'function PooledImageTrail(props: { children?: ReactNode; threshold?: number; poolSize?: number; plateCount?: number; tileWidth?: number; tileHeight?: number; seed?: string; className?: string }): JSX.Element',

  props: [
    { name: 'children', type: 'ReactNode', description: 'Content rendered above the trail layer.' },
    { name: 'threshold', type: 'number', default: '130', description: 'Pixels of pointer travel required before another tile is released.' },
    { name: 'poolSize', type: 'number', default: '22', description: 'Number of reusable nodes in the ring.' },
    { name: 'plateCount', type: 'number', default: '17', description: 'Distinct plates painted at mount. Keep coprime with poolSize.' },
    { name: 'tileWidth', type: 'number', default: '236', description: 'Tile width in CSS px.' },
    { name: 'tileHeight', type: 'number', default: '160', description: 'Tile height in CSS px.' },
    { name: 'seed', type: 'string', default: "'pooled-image-trail'", description: 'Seeds plate choice and tilt so the sequence is deterministic.' },
    { name: 'className', type: 'string', description: 'Merged onto the root container via `cn`.' },
  ],

  reducedMotion:
    'No listener attaches and nothing animates. Three plates are drawn once into the first three pool slots, fanned across the centre with a few degrees of rotation each, so the panel is a composed still of what the effect produces rather than an empty rectangle.',

  cleanup:
    'Removes the single `pointermove` listener, calls `gsap.killTweensOf` on every pool node — which also kills the per-spawn timelines, since they only target those nodes — then `gsap.set(nodes, { clearProps: "all" })`. The offscreen plate canvases are plain locals and are collected with the closure; nothing was allocated that needs revoking.',

  acceptance:
    'Sweep the pointer slowly across the panel and tiles drop behind it roughly every 130px, each readable for about half a second before fading. Jiggle the pointer in place and nothing spawns. Flick as fast as you can and you get a spaced trail, not a smear, and no tile ever restarts mid-fade with a flicker. Enter the panel from an edge and no tile appears until you have actually moved. On touch or with reduced motion you see three static fanned plates.',

  criticalRegion: 'critical',
};

export default meta;
