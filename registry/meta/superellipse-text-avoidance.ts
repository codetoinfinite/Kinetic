import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'superellipse-text-avoidance',
  title: 'Superellipse Text Avoidance',
  category: 'webgl',
  tags: ['ogl', 'webgl', 'instancing', 'superellipse', 'squircle', 'text', 'particles', 'pointer'],
  blurb:
    'A particle field that flows around the headline, held off by a 6-norm superellipse fitted to the measured text box.',
  cost: 'webgl',
  motif: 'rings',

  files: [
    {
      path: 'registry/ui/superellipse-text-avoidance.tsx',
      type: 'registry:ui',
      role: 'component',
    },
    {
      path: 'registry/shaders/superellipse-text-avoidance.ts',
      type: 'registry:lib',
      role: 'p-norm avoidance field and instanced quad vertex/fragment shaders',
    },
  ],
  dependencies: ['ogl@^1.0.11'],

  summary:
    'The headline is real DOM on top of an instanced particle field, and the field is pushed out of a 6-norm superellipse fitted to the headline\'s measured rect. Interior particles are remapped into a band hugging the shape rather than clamped onto it, so the hole has a bright rim instead of a pile-up. The same avoidance function runs a second time at exponent 2 for the damped pointer, because a disc is a superellipse with a lower exponent.',

  mechanism: [
    'The avoidance region is `pow(pow(|nx|, e) + pow(|ny|, e), 1/e) < 1` in the rect\'s own normalised space. At e = 2 that is an ellipse, at e = 6 a squircle, at e = 20 effectively a box. Six is the useful one: a circle around a wide headline clears a large empty halo past the ends of the line, and a box has four corner discontinuities that crease the field along straight lines.',
    'Interior radii are REMAPPED, not clamped. `mapped = 1 + whip * min(r, 1 + whip) / (1 + whip) + max(r - (1 + whip), 0)` compresses [0, 1 + whip] into [1, 1 + whip] and is the identity beyond it. Clamping instead maps a whole area onto a curve, so every interior particle lands on the outline and the shape is drawn as one infinitely dense line with an empty interior behind it.',
    'The displacement is `half * (n / max(r, 1e-3)) * (mapped - r)` — divided by a floor rather than normalized. A particle at the exact centre has no direction and `normalize()` returns NaN there, which propagates into `gl_Position` and drops the whole instance rather than one component. A lattice puts particles exactly on both axes on the first frame, so this case is reached immediately, not never.',
    '`pow()` is undefined for a negative base and for zero raised to a non-positive power, and a symmetric field hits both. The norm takes `abs()` first and adds 1e-5, which costs nothing and removes an entire class of driver-dependent black frames.',
    'The rect is measured, never passed in. `getBoundingClientRect()` on the text node and on the host produce four uv numbers; a ResizeObserver on the text node plus `document.fonts.ready` keeps them in step through a rewrap, a font swap and a container resize. A hand-tuned rect is wrong on the first webfont load and wrong again on the first narrow viewport.',
    'The text rect is deliberately NOT aspect-corrected, because it was measured in element space and has to stay there or it stops agreeing with the letters. The pointer disc IS aspect-corrected, because it is a shape in screen space and an uncorrected one is a visible ellipse on any non-square container. The two live in the same shader and want opposite treatment.',
    'Displaced particles brighten and grow slightly, tinted toward a third colour. Without it the field is just a hole and the exponent is invisible; with it the squircle is legible as a rim, which is the only on-screen evidence that the shape is not a box.',
    'The scatter is a jittered lattice, then shuffled. Uniform random has clumps and voids at this population, and once the avoidance opens a real hole the accidental voids read as more holes. The shuffle matters because the instanced count is a prefix of the buffers — in lattice order a smaller count would draw only the top rows.',
  ],

  constants: [
    {
      name: 'exponent',
      value: '6',
      why: 'The p-norm. Below ~4 the shape is round enough that the clear zone bulges past the ends of the line; above ~10 the corners are sharp enough to crease the field visibly, which is the axis-aligned-box failure the superellipse exists to avoid.',
    },
    {
      name: 'WHIP_DISC',
      value: '0.3',
      why: 'Width of the band the interior is compressed into, in normalised units — the whole feel of the effect. Small values whip particles out hard and stack them into a bright outline; past ~0.6 the field bends around from so far away that the text no longer reads as the cause.',
    },
    {
      name: 'margin',
      value: '0.06',
      why: 'Clear ring around the text, in units of container HEIGHT, divided by the aspect ratio for x so the gap is the same number of pixels on all four sides. Adding one uv figure to both halves pads a wide container far more at the ends of the line than above it.',
    },
    {
      name: 'pointerRadius / pointerWhip',
      value: '0.16 / 0.45',
      why: 'The second field, at exponent 2. Softer than the text rect on purpose: the pointer is a passing influence and a hard-edged hole following the cursor competes with the headline it is supposed to frame.',
    },
    {
      name: 'smoothing',
      value: '0.0008',
      why: 'Fraction of the pointer gap still remaining after one second — an ~90ms tail. The pointer hole has a visible edge, unlike a glow, so lag reads as broken rather than as smooth.',
    },
    {
      name: 'CELL_JITTER',
      value: '0.42',
      why: 'Displacement inside a lattice cell, as a fraction of the cell. Zero is a visible grid; past ~0.5 neighbouring cells overlap and the stratification that made the scatter even in the first place is gone.',
    },
    {
      name: 'density',
      value: '900',
      why: 'Particles per megapixel, so the same value reads right in a 320px card and a 2000px hero. Too sparse and the rim is a dotted line rather than a shape.',
    },
    {
      name: 'MAX_DPR',
      value: '1.5',
      why: 'Additive fill is the whole cost and it scales with the square of the ratio. These are soft round dots with no fine detail, so a third sample per axis resolves nothing and costs 78% more fragments.',
    },
  ],

  pitfalls: [
    'Using `normalize()` for the push direction. It is NaN at the origin, and NaN in `gl_Position` discards the entire primitive — so the bug looks like missing particles, not like a maths error.',
    '`pow()` with a negative base or a zero base. Both are undefined in GLSL, both are reached on the axes of a symmetric field, and the result is driver-dependent: fine on the machine it was written on, black on someone else\'s.',
    'Clamping interior particles onto the shell instead of remapping their radius. Every particle inside lands exactly on the outline, so the shape is one dense curve with a dead interior behind it — visibly a stencil rather than a field flowing around something.',
    'Hard-coding the text rect, or deriving it from a character count. It is wrong the moment a webfont swaps, the line rewraps, or the container narrows, and the hole drifts off the words while still looking deliberate.',
    'Relying on the ResizeObserver alone for the text box. A font swap does not necessarily change the element\'s border box on every engine, so the measurement has to be repeated after `document.fonts.ready` as well.',
    'Aspect-correcting the text rect. It was measured in element space; correcting it clears a region visibly narrower than the headline on a wide container, which is worse than not avoiding at all.',
    'Forgetting to aspect-correct the POINTER disc. Exactly the opposite case — a screen-space shape left uncorrected is an obvious ellipse on anything but a square container.',
    'Writing pointer events straight into `uPointer`. A high-rate trackpad delivers a staircase, and after a stalled frame it is a jump that drags the hole across the field in one step. The listener records a target; the loop damps toward it.',
    'Damping with a per-frame constant (`x += (t - x) * 0.1`) instead of `damp(..., dt)`. The follow is visibly tighter at 120Hz than at 60Hz, so the feel is tuned to whichever display it was authored on.',
    'Scattering with `rng()` twice. The clumps and voids of a uniform random field are indistinguishable from more avoidance holes once the real one exists. A jittered lattice, shuffled so the instanced-count prefix is still spatially even, costs the same.',
    'Leaving ogl\'s default BACK-face culling on. The quad winding is not guaranteed to face the way the driver expects, and a culled particle is not dim — it is absent, so the field renders empty on some machines and fine on others.',
    'Owning the canvas in React while calling `loseContext()` on cleanup. Under `reactStrictMode` the effect runs twice and the second `getContext` on that element returns the dead context: blank in development, fine in production.',
    'Letting the text layer swallow pointer events. It sits above the canvas, so without `pointer-events: none` the pointer hole disappears whenever the cursor crosses the headline — precisely where the effect is most visible.',
    'Re-measuring through React state. A measurement that triggers a render can trigger another measurement; the rect is written straight into the uniform instead.',
  ],

  notes: [
    '`children` is the headline and is rendered as real DOM above the field, so it is selectable, searchable and styled with ordinary classes. The component only reads its box.',
    'The text layer is `pointer-events: none` so the canvas underneath keeps receiving moves. Anything interactive belongs outside it.',
    'The same `avoid()` function serves both fields; the pointer is just exponent 2 with a wider whip. Adding a third avoided region is one more call, not one more code path.',
    'Blending is additive with an opaque clear colour, so a thousand overlapping instances need no depth sort and the whole field is one draw call. The fragment output is premultiplied because the destination is only ever added to.',
    'Population is derived from container area and selected with `setInstancedCount` out of buffers allocated once at `maxCount`, so a resize changes the count without touching GPU memory.',
    'The scatter runs on `createRng(seed)`, never `Math.random()`, so the field is identical on every load and a visual regression is a real regression.',
  ],

  apiSignature:
    'function SuperellipseTextAvoidance(props: { children?: ReactNode; density?: number; maxCount?: number; sizeRange?: readonly [number, number]; exponent?: number; margin?: number; whip?: number; pointerRadius?: number; pointerWhip?: number; smoothing?: number; opacity?: number; colorA?: string; colorB?: string; glowColor?: string; background?: string; seed?: number | string; className?: string; textClassName?: string }): JSX.Element',

  props: [
    { name: 'children', type: 'ReactNode', description: 'The headline. Rendered above the field and measured for the avoidance rect.' },
    { name: 'density', type: 'number', default: '900', description: 'Particles per megapixel of container area.' },
    { name: 'maxCount', type: 'number', default: '1600', description: 'Population ceiling, and the size the buffers are allocated at.' },
    { name: 'sizeRange', type: 'readonly [number, number]', default: '[1.4, 4.4]', description: 'Particle size in CSS pixels, biased toward the small end.' },
    { name: 'exponent', type: 'number', default: '6', description: 'Superellipse exponent. 2 is a circle, 6 a squircle, high values a box.' },
    { name: 'margin', type: 'number', default: '0.06', description: 'Clear ring around the text, in units of container height.' },
    { name: 'whip', type: 'number', default: '0.3', description: 'Width of the band the interior is compressed into.' },
    { name: 'pointerRadius', type: 'number', default: '0.16', description: 'Pointer avoidance radius in container-height units. 0 disables it.' },
    { name: 'pointerWhip', type: 'number', default: '0.45', description: 'Whip band for the pointer disc.' },
    { name: 'smoothing', type: 'number', default: '0.0008', description: 'Fraction of the pointer gap still remaining after one second.' },
    { name: 'opacity', type: 'number', default: '0.92', description: 'Overall alpha multiplier.' },
    { name: 'colorA', type: 'string', default: "'#9ec6ff'", description: 'First tint. Any value ogl\'s Color accepts.' },
    { name: 'colorB', type: 'string', default: "'#eef2fb'", description: 'Second tint; each particle mixes between the two.' },
    { name: 'glowColor', type: 'string', default: "'#ffd9a0'", description: 'Tint for displaced particles, which is what makes the shape legible.' },
    { name: 'background', type: 'string', default: "'#07080d'", description: 'Opaque clear colour the additive field is composited onto.' },
    { name: 'seed', type: 'number | string', default: "'superellipse-text-avoidance'", description: 'Seeds the lattice jitter, sizes, phases and tints.' },
    { name: 'className', type: 'string', description: 'Merged onto the root container via `cn`.' },
    { name: 'textClassName', type: 'string', description: 'Merged onto the measured text layer.' },
  ],

  reducedMotion:
    'The loop never starts. One frame is drawn with the text rect fully avoided and the pointer parked off to one side at full presence, so the still shows exactly the shape a moving version produces — the drift is the only thing lost. Re-measuring after a font swap redraws that single frame rather than starting a loop. The listeners stay attached but their target is never consumed.',

  cleanup:
    'Removes the three pointer listeners from the canvas, cancels the pending `document.fonts.ready` callback with a flag, nulls the stage ref so an in-flight frame cannot touch a dead renderer, then `geometry.remove()` (deletes the VAOs and every buffer), `program.remove()` (deletes the shaders and the program), `loseContext(gl)`, zeroes the canvas dimensions and removes it from the DOM. ogl has no `dispose()`, and dropping the context is the part that matters — the per-process budget is about sixteen, and exceeding it kills the oldest, which belongs to someone else.',

  acceptance:
    'The headline sits in a clear zone whose shape is a squircle, not a circle and not a rectangle: the gap above and below the line is the same as the gap at its ends, and the corners are rounded without being round. A brighter rim traces that shape. Resize the container until the headline rewraps to two lines — the clear zone re-fits within a frame, with no visible sweep from the old rect. Move the pointer in and a second, softer hole follows it with a short even lag that is identical on a 60Hz and a 120Hz display; the hole stays circular on a wide container and does not disappear when the pointer crosses the headline. No particle sits inside the clear zone and none pile into a single dense outline. Reload twice: the field is identical. With reduced motion the panel is one composed still with the same shape.',

  criticalRegion: 'critical',
};

export default meta;
