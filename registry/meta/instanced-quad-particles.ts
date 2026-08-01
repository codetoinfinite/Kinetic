import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'instanced-quad-particles',
  title: 'Instanced Quad Particles',
  category: 'webgl',
  tags: ['ogl', 'instancing', 'particles', 'additive', 'sdf'],
  blurb:
    'Up to 1800 drifting particles in one draw call — quads rather than point sprites, so each one has its own size, spin and shape.',
  cost: 'webgl',
  motif: 'grid',

  files: [
    {
      path: 'registry/ui/instanced-quad-particles.tsx',
      type: 'registry:ui',
      role: 'component',
    },
    {
      path: 'registry/shaders/instanced-quad-particles.ts',
      type: 'registry:lib',
      role: 'shader',
    },
  ],
  dependencies: ['ogl@^1.0.11'],
  registryDependencies: [
    'webgl',
    'prng',
    'damp',
    'use-raf',
    'use-in-view',
    'use-visibility',
    'use-resize-observer',
    'use-reduced-motion',
  ],

  summary:
    'Four vertices and six indices are shared by every particle; three instanced attributes carry position, size, spin, alpha, tint and shape. One `drawElementsInstanced` puts the whole field on screen. Quads instead of `gl_PointSize` because point sprites are capped at 255px on many drivers, cannot be rotated, and are culled whole the instant their centre leaves the viewport — a large sprite disappears while half of it is still visible.',

  mechanism: [
    'The geometry is one unit quad in `position` (-0.5..0.5) plus an index buffer, and three attributes marked `instanced: 1`: `aOrigin` (field-space rest position), `aParams` (size in CSS px, signed spin rate, base alpha, tint mix) and `aSeed` (two flow phases, spin phase, shape mix). Ten floats per particle, 72 KB at the 1800 ceiling.',
    'Buffers are allocated once at `maxCount` and never reallocated. The visible population comes from `geometry.setInstancedCount(count)` where `count` is derived from container area — `clamp(round(megapixels * density), 250, maxCount)` — so the same density reads correctly in a 320px card and a 2000px hero. Because the scatter is random, any prefix of the buffer is still a spatially even field.',
    'The vertex shader rotates the quad corner in PIXEL space and only then divides by the drawing-buffer resolution to reach clip space. Rotating in clip space would shear the quad by the container aspect ratio, and a square particle would become a lozenge that changes shape as it spins.',
    'Drift is a pure function of `elapsed` and the per-particle seed: the field marches upward with `fract(y + t * RISE)`, then two out-of-phase sinusoids sampled at the particle\'s own position add wander. No per-particle state is stored, so a resize, a tab switch or a reduced-motion still can all be drawn from one number.',
    '`fract` teleports a particle from the top edge to the bottom, which is a visible pop. `uFadeBand` smoothsteps alpha to zero within 12% of each end, so the population always arrives and leaves at zero opacity.',
    'One rounded-box SDF in the fragment shader covers both shapes. At `shape` 0 the half-extents and the corner radius are both 0.5, which reduces exactly to `length(uv) - 0.5` — a true circle. At 1 it is a narrow shard, and the shard is the only reason per-particle rotation is visible at all.',
    'Blending is additive (`ONE, ONE`) onto an opaque clear colour, which is order independent — a thousand overlapping instances need no depth sort, which is what makes one draw call possible. The canvas is opaque rather than transparent because additive blending onto transparency would have to brighten the page background, and the GPU cannot see it.',
  ],

  constants: [
    {
      name: 'density',
      value: '900',
      why: 'Particles per megapixel. Tuned so a typical card holds 250-400 and a full-width hero approaches the ceiling. Doubling it does not double the perceived density — it doubles the fill rate and flattens the depth cue that comes from having gaps.',
    },
    {
      name: 'maxCount',
      value: '1800',
      why: 'Ceiling and allocation size. Not a performance limit on the vertex side — 1800 quads is 7200 vertices, nothing — but the fill cost of 1800 soft additive quads averaging 12px is roughly one full screen of blended pixels per frame.',
    },
    {
      name: 'MAX_DPR',
      value: '1.5',
      why: 'Additive fill is the entire cost of this component and it scales with the square of the pixel ratio. Dust has no fine detail that a third sample per axis resolves, so 3x phones render at 1.5x and the frame budget drops by a factor of four against an uncapped ratio.',
    },
    {
      name: 'SIZE_BIAS',
      value: '2.2',
      why: 'Exponent on the uniform random used for size. At 1 a quarter of the population lands in the largest quarter of the range, and a hundred 28px blobs is fog rather than dust. At 2.2 the large sizes are rare enough to read as individuals.',
    },
    {
      name: 'RISE',
      value: '0.045',
      why: 'Field heights per second at `speed` 1 — about 22 seconds to cross. Slow enough that the eye reads drift rather than travel; above ~0.15 the field looks like falling snow played in reverse.',
    },
    {
      name: 'FADE_BAND',
      value: '0.12',
      why: 'Fraction of the field height the wrap fade occupies at each end. Below ~0.06 the pop at the seam becomes visible for the largest particles, whose radius alone is a couple of percent of the height. Above 0.2 a quarter of the field is permanently dim.',
    },
    {
      name: 'FLOW_SCALE',
      value: '1.4',
      why: 'Cycles of wander across the field. Under 1 the whole population slides sideways as a sheet; well above 2 adjacent particles move in opposite directions and the motion reads as noise rather than air.',
    },
    {
      name: 'X_MIN / X_MAX',
      value: '-0.08 / 1.08',
      why: 'Field-space x range. Seeding wider than the container means horizontal wander can never bare a strip at the left or right edge. The off-screen quads are clipped by the rasteriser and cost nothing — which is exactly what a point sprite could not do.',
    },
    {
      name: 'alpha per particle',
      value: '1 - 0.78 * sizeT',
      why: 'Large particles are dimmed so total emitted light is roughly independent of size. Without it the few big instances dominate every additive overlap and the field looks like it has hot spots.',
    },
  ],

  pitfalls: [
    'Reaching for `gl_PointSize`. It is capped — 255px on a great many drivers, and the cap is silent — it cannot be rotated, and the sprite is culled by its centre point, so anything large blinks out while half of it is still on screen.',
    'Leaving ogl\'s `cullFace` at its default. `Program` defaults it to `gl.BACK`; once the quad corners are rotated in the vertex shader the winding the driver sees is not the winding you authored, and culled particles are simply absent with no error anywhere.',
    'Rotating the corner offset after converting to clip space. The container aspect ratio shears it, so a particle is square only when the container is, and it visibly changes shape through a spin.',
    'Rebuilding the buffers on resize to change the particle count. `setInstancedCount` selects a prefix of what is already uploaded; reallocating 72 KB of GPU memory on every ResizeObserver notification is a stall for no visual difference.',
    'Wrapping with `fract` and no fade. The seam is a hard teleport, and at 1800 particles something is crossing it constantly, so the field flickers along one edge.',
    'Compositing an additive field onto a transparent canvas. Additive needs to know what it is adding to; with `alpha: true` the destination is zero, the result is the particle colour flat, and the field looks pasted on rather than glowing.',
    'Reusing one React-owned canvas across effect runs. Cleanup force-loses the context, and `getContext` on that same element afterwards returns the dead one — under StrictMode\'s mount / unmount / mount that means every instance is permanently black. ogl creates its own canvas, which is appended and removed per run.',
    'Assuming `renderer.setSize` leaves the CSS alone. ogl writes literal px into the canvas\'s inline `style`, which beats any class; the percentages have to be re-asserted after every call or the element stops being fluid.',
  ],

  notes: [
    'ogl rather than three: the whole component is one instanced mesh with no lights, no camera and no scene graph, and ogl\'s `Geometry` exposes instanced attributes directly with `instanced: 1` instead of through an `InstancedBufferGeometry` wrapper.',
    'No camera is passed to `renderer.render`, which is deliberate. Without one ogl skips frustum culling and the matrix uniforms entirely — the shader writes clip space itself, so a projection matrix would be an identity multiply per vertex.',
    '`depth: false` on the context. Nothing occludes anything under additive blending, so a depth buffer would be memory plus a clear per frame for no result.',
    'Sizes are authored in CSS pixels and multiplied by the pixel ratio in the shader, so the field looks identical across a dpr change and nothing needs rebuilding when one happens.',
    'GLSL ES 1.00 with no derivative functions: the edge anti-aliasing floor is `1.0 / sizePx`, which is exact for a quad of that pixel size, so the same source compiles under a WebGL1 fallback context where `fwidth` needs an extension.',
  ],

  apiSignature:
    'function InstancedQuadParticles(props: { density?: number; maxCount?: number; sizeRange?: readonly [number, number]; softness?: number; spin?: number; speed?: number; wander?: number; opacity?: number; colorA?: string; colorB?: string; background?: string; seed?: number | string; className?: string }): JSX.Element',

  props: [
    { name: 'density', type: 'number', default: '900', description: 'Particles per megapixel of container area. The count is derived from this, not fixed.' },
    { name: 'maxCount', type: 'number', default: '1800', description: 'Population ceiling, and the size the buffers are allocated at.' },
    { name: 'sizeRange', type: 'readonly [number, number]', default: '[5, 28]', description: 'Particle size in CSS pixels. The distribution is biased toward the small end.' },
    { name: 'softness', type: 'number', default: '0.62', description: 'Edge width, 0..1. 0 is a hard silhouette, 1 is a pure gradient. Floored at one device pixel.' },
    { name: 'spin', type: 'number', default: '0.5', description: 'Peak spin in radians per second; each particle takes a signed fraction of it.' },
    { name: 'speed', type: 'number', default: '1', description: 'Multiplier on the whole drift, including the upward march.' },
    { name: 'wander', type: 'number', default: '0.06', description: 'Sinusoidal wander amplitude in field units, where 1 is the container.' },
    { name: 'opacity', type: 'number', default: '0.55', description: 'Overall alpha multiplier applied in the fragment shader.' },
    { name: 'colorA', type: 'string', default: "'#9fb4cc'", description: 'First tint. Any value ogl\'s `Color` accepts.' },
    { name: 'colorB', type: 'string', default: "'#e8ddc9'", description: 'Second tint; each particle mixes between the two by a seeded amount.' },
    { name: 'background', type: 'string', default: "'#07090d'", description: 'Opaque clear colour the additive field is composited onto.' },
    { name: 'seed', type: 'number | string', default: "'instanced-quad-particles'", description: 'Seeds the scatter. Same seed, same field on every reload and on the server.' },
    { name: 'className', type: 'string', description: 'Merged onto the host element via `cn`.' },
  ],

  reducedMotion:
    'The rAF subscription is never made and the field is drawn once at `elapsed` 0. That is a complete, correct frame rather than a collapsed one: the scatter, sizes, tints, shapes and spin phases are all per-particle seeds that already vary at t=0, and the wrap fade applies exactly as it does in motion. Resizing redraws the same still.',

  cleanup:
    '`geometry.remove()` deletes every VAO and every buffer, `program.remove()` deletes the shaders and the program, then `loseContext(gl)` hands the context back through `WEBGL_lose_context` — ogl has no `dispose()` and nothing else releases a context. The canvas backing store is zeroed and the node removed, so the drawing buffer goes with it rather than waiting for GC.',

  acceptance:
    'The field drifts upward and sideways with no visible seam at the top or bottom edge, and no particle ever appears or vanishes abruptly. Individual particles spin, and the shards are visibly rotating rather than shimmering. Resize the container narrow and wide: particles stay square at every aspect ratio, and the population changes without a stutter. One draw call per frame in a frame capture, whatever the count. Mount and unmount a dozen instances and none of the earlier ones go black.',

  criticalRegion: 'critical',
};

export default meta;
