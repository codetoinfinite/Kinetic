import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'dual-canvas-z-split',
  title: 'Dual-Canvas Depth Split',
  category: 'webgl',
  tags: ['ogl', 'instancing', 'particles', 'depth', 'layering'],
  blurb:
    'One particle field rendered twice with the depth sign flipped, so the text sits inside the field rather than on top of it.',
  cost: 'webgl',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/dual-canvas-z-split.tsx',
      type: 'registry:ui',
      role: 'component',
    },
    {
      path: 'registry/shaders/dual-canvas-z-split.ts',
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
    'Two stacked canvases render the same instanced particle system with opposite `uZSign`, and the page content is a DOM sibling between them. Particles with negative depth pass behind the text and positive ones pass in front. Because size, parallax rate, brightness and softness are one continuous ramp across the depth axis, the plane where the split happens cannot be seen — the effect is that the copy is embedded in the field, and it stays live, selectable text throughout.',

  mechanism: [
    '`aDepth` is the camera axis, not a distance: -1 is far behind the content plane, +1 is close to the viewer, 0 is the content plane itself. The SIGN chooses which canvas draws a particle; the magnitude drives everything else, which is why the two layers look like one field.',
    'Both layers share the same typed arrays, so the two contexts hold identical particles rather than two independent fields. Only the attribute descriptor objects are per-layer, because ogl writes the buffer handle and element count into the object it is given.',
    'A particle on the wrong side of the plane is rejected in the VERTEX shader by writing `gl_Position = vec4(2.0, 2.0, 2.0, 1.0)` — outside the frustum on every axis, so all four vertices are clipped before rasterisation and it costs no fragments. The vertex cost doubles across the two layers; the fragment cost, which is the only cost that mattered, does not.',
    'Near particles are bigger (`mix(minSize, maxSize, depth01)`), drift further per second (`0.35 + 0.65 * depth01`), are brighter, and have a softer edge — a defocus that stops the front layer reading as dirt on the screen. Four cues from one number.',
    'The back canvas is opaque and blends additively (`ONE, ONE`), which is order independent so nothing needs sorting. The front canvas sits over live text and must be transparent, which rules additive out — there is nothing on the GPU to add to — so it blends premultiplied source-over (`ONE, ONE_MINUS_SRC_ALPHA`). One fragment shader emits premultiplied colour and serves both.',
    'The population is derived from container area — `clamp(round(megapixels * density), 250, maxCount)` — and applied with `setInstancedCount` on both layers. Buffers are allocated once at `maxCount`, so a resize never reallocates.',
    'Drift is a pure function of `elapsed` and the per-particle seed, with `fract` wrapping the field vertically and `uFadeBand` fading alpha to zero at both ends so the wrap seam is never visible. No per-particle state, so a still frame is drawable from one number.',
  ],

  constants: [
    {
      name: 'split',
      value: '0.38',
      why: 'Fraction of the population placed in front of the content. Under a half on purpose: dust in front of body copy is a legibility cost, and at 0.5 the text reads as fogged rather than embedded.',
    },
    {
      name: 'FRONT_OPACITY',
      value: '0.55',
      why: 'Extra alpha scale on the front layer only. Depth already brightens near particles, and the front layer is entirely near particles, so without this the layer that overlaps the text is the brightest thing on screen.',
    },
    {
      name: 'DEPTH_FLOOR',
      value: '0.05',
      why: 'Dead zone around the content plane. A particle at exactly 0 is rejected by both layers — `aDepth * uZSign <= 0.0` is false for neither sign — so it would silently never render.',
    },
    {
      name: 'sizeRange',
      value: '[3, 34]',
      why: 'Disc diameter at the far and near ends of the ramp. The span is what sells the depth; at 8-to-14 the field is flat, and above ~40 the near particles are large enough that their own softness becomes the dominant texture of the page.',
    },
    {
      name: 'parallax factor',
      value: '0.35 + 0.65 * depth01',
      why: 'Near particles travel about three times as far per second as far ones. A larger ratio makes the far layer look frozen; a smaller one and the field moves as a single sheet, which removes the only depth cue that survives in a static screenshot.',
    },
    {
      name: 'MAX_DPR',
      value: '1.5',
      why: 'Two layers of soft additive discs is a fill-rate problem and fill scales with the square of the pixel ratio. Dust has no detail a third sample per axis would resolve, so a 3x phone renders at 1.5x and pays a quarter of the fragments.',
    },
    {
      name: 'FADE_BAND',
      value: '0.14',
      why: 'Fraction of the field height the wrap fade occupies at each end. Larger than a single-layer field needs, because the near particles are up to 34px across and their radius alone is a few percent of a short container.',
    },
    {
      name: 'size jitter',
      value: '0.7 .. 1.3',
      why: 'Multiplier on top of the depth ramp. Without it the depth ordering is perfectly readable from size alone, which reads as a diagram of a depth field rather than a depth field.',
    },
  ],

  pitfalls: [
    'Trying to do this with one canvas. A canvas is a single stacking-context leaf, so DOM content cannot be interleaved with parts of it. Two contexts is not an inefficiency here, it is the requirement — and it is two of the roughly sixteen a Chromium renderer process allows, which is exactly why both are released on unmount.',
    'Making the front canvas additive. With `alpha: true` the destination is zero, so an additive particle over text is a flat colour patch: the layer stops looking like light and starts looking like a sticker.',
    'Forgetting `pointer-events: none` on the front layer. It covers the content by construction, so every link and button underneath it stops responding, and nothing about the failure looks graphical.',
    'Letting a particle sit at depth exactly 0. `aDepth * uZSign <= 0.0` rejects it in BOTH layers, so it is uploaded, transformed and never seen — a silent leak of the population.',
    'Rejecting with `discard` in the fragment shader instead of parking the vertex. `discard` still rasterises the quad and runs the shader per fragment; a clip-space position outside the frustum throws the primitive away after four vertex invocations.',
    'Writing `gl_Position = vec4(2.0)` for the rejection. w is then 2, the perspective divide brings it back to exactly 1.0 on every axis, and the vertex survives clipping at the frustum boundary — a row of specks in the corner.',
    'Giving both layers the same attribute descriptor objects. ogl mutates them with a buffer handle belonging to the first context, and the second layer then renders from a buffer its context has never heard of.',
    'Assuming `renderer.setSize` leaves the CSS alone. ogl writes literal px into the canvas inline style, which beats any class, so the percentages must be re-asserted after every call in both layers.',
  ],

  notes: [
    'The content is a DOM sibling, not a texture. It stays selectable, focusable and available to a screen reader while particles pass on both sides of it — which is the entire reason to accept two contexts instead of drawing the text into the field.',
    'ogl rather than three: two contexts, two instanced meshes, no lights, no cameras and no scene graph. `renderer.render` is called without a camera, so ogl skips frustum culling and the matrix uniforms — the shader writes clip space itself.',
    '`depth: false` on both contexts. The depth ORDER is expressed by which canvas a particle lands on, so a z-buffer would be memory plus a clear per frame for no result.',
    'Sizes are authored in CSS pixels and scaled by the pixel ratio in the shader, so the field is identical across a dpr change and nothing rebuilds when one happens.',
    'GLSL ES 1.00 with no derivative functions — the anti-aliasing floor is `1.0 / sizePx`, exact for a quad of that pixel size — so the same source compiles under a WebGL1 fallback context.',
  ],

  apiSignature:
    'function DualCanvasZSplit(props: { children?: ReactNode; density?: number; maxCount?: number; split?: number; sizeRange?: readonly [number, number]; speed?: number; wander?: number; opacity?: number; colorA?: string; colorB?: string; background?: string; seed?: number | string; className?: string }): JSX.Element',

  props: [
    { name: 'children', type: 'ReactNode', description: 'Content rendered between the two particle layers. Ordinary DOM, fully interactive.' },
    { name: 'density', type: 'number', default: '850', description: 'Particles per megapixel of container area. The count is derived from this, not fixed.' },
    { name: 'maxCount', type: 'number', default: '1600', description: 'Population ceiling, and the size the shared buffers are allocated at.' },
    { name: 'split', type: 'number', default: '0.38', description: 'Fraction of the population placed in front of the content.' },
    { name: 'sizeRange', type: 'readonly [number, number]', default: '[3, 34]', description: 'Disc diameter in CSS pixels at the far and near ends of the depth ramp.' },
    { name: 'speed', type: 'number', default: '1', description: 'Multiplier on the whole drift, including the upward march.' },
    { name: 'wander', type: 'number', default: '0.05', description: 'Sinusoidal wander amplitude in field units, where 1 is the container.' },
    { name: 'opacity', type: 'number', default: '0.6', description: 'Overall alpha multiplier. The front layer takes 0.55 of it.' },
    { name: 'colorA', type: 'string', default: "'#8ea6c4'", description: 'First tint. Any value ogl\'s `Color` accepts.' },
    { name: 'colorB', type: 'string', default: "'#e6d9c4'", description: 'Second tint; each particle mixes between the two by a seeded amount.' },
    { name: 'background', type: 'string', default: "'#06080c'", description: 'Opaque clear colour of the back canvas. The front canvas is transparent.' },
    { name: 'seed', type: 'number | string', default: "'dual-canvas-z-split'", description: 'Seeds the scatter. Same seed, same field on every reload and on the server.' },
    { name: 'className', type: 'string', description: 'Merged onto the host element via `cn`.' },
  ],

  reducedMotion:
    'The rAF subscription is never made and both layers are drawn once at `elapsed` 0. That is a complete frame, not a collapsed one: the scatter, depths, sizes, tints and wrap fade are all per-particle seeds that already vary at t=0, so the still shows the same depth split, in front of and behind the same text, with only the drift absent. Resizing redraws the same still in both layers.',

  cleanup:
    'Per layer: `geometry.remove()` deletes the VAOs and every buffer, `program.remove()` deletes the shaders and the program, `loseContext(gl)` hands the context back through `WEBGL_lose_context` — ogl has no `dispose()` and nothing else releases a context — then the canvas backing store is zeroed and the node removed. Both layers are torn down in the same cleanup, so the component never holds one context after the other has gone.',

  acceptance:
    'Particles visibly pass both behind and in front of the text, and the text is still selectable with the mouse while they do. There is no horizontal line anywhere in the container where the field changes character. Near particles are larger, softer and move further per second than far ones. Links inside the content still respond to hover and click. Resize narrow and wide: discs stay circular and the population changes without a stutter. Two contexts per instance, both released on unmount — mount and unmount six instances and none of the earlier ones go black.',

  criticalRegion: 'critical',
};

export default meta;
