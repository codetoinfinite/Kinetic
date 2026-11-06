import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'bayer-plasma-hero',
  title: 'Bayer-Quantised Plasma',
  category: 'webgl',
  tags: ['webgl2', 'shader', 'plasma', 'dither', 'bayer', 'hero'],
  blurb:
    'An iterated domain-warped plasma crushed to eleven grey levels, so the hero reads as a dot-matrix proof.',
  cost: 'webgl',
  motif: 'noise',

  files: [
    {
      path: 'registry/ui/bayer-plasma-hero.tsx',
      target: 'components/motion/bayer-plasma-hero.tsx',
      type: 'registry:ui',
      role: 'component',
    },
    {
      path: 'registry/shaders/bayer-plasma-hero.ts',
      target: 'components/motion/shaders/bayer-plasma-hero.ts',
      type: 'registry:lib',
      role: 'iterated plasma + bayer8 quantisation fragment shader',
    },
  ],
  dependencies: [],

  summary:
    'A full-screen plasma built from sixteen passes of iterated domain warping, then reduced to eleven grey levels through an 8x8 ordered dither matrix. The quantisation is the whole point: a smooth plasma is a screensaver, and the same plasma printed in eleven tones is a texture that type can sit on. The pointer displaces the plasma\'s own coordinate space so the field leans into the cursor rather than growing a highlight under it.',

  mechanism: [
    'Each of the `iterations` passes rotates the sample point by `rotate` radians, then folds it: `p += warp * sin(p.yx * 1.31 + t + i*0.7) / (1 + i*0.35)`. The `p.yx` swap is what couples the two axes into marbling — with `p.xy` the same code produces stripes.',
    'Each pass also accumulates `amp * sin(p.x + p.y + t*0.6)` with `amp` decaying by 0.86, and the sum is divided by the amplitude actually accumulated rather than by a constant, so lowering `iterations` for a weak GPU changes the detail without changing the exposure.',
    'The result is remapped to 0..1, pushed through `clamp((lum - 0.5) * contrast + 0.5, 0, 1)`, then multiplied by an elliptical vignette centred at `(0.5, 0.4)` — the optical centre, not the geometric one; at 0.5 a hero reads bottom-heavy.',
    'Quantisation happens on a gamma-spaced ramp: `encode = pow(lum, 1/gamma)`, add the dither offset, `round` to one of `levels-1` steps, `decode = pow(q, gamma)`. The reference implementation carried an eleven-entry grey table and found the nearest entry with a branchless ladder of ten mix/step pairs; a monotone ramp collapses that search into encode, round, decode.',
    'The dither offset `(bayer8(fragCoord / cell) - 0.5) / (levels - 1)` is added in the ENCODED space. Applied after decoding it would be the wrong physical size in the shadows, where the ramp is compressed, and the dark half of the frame would band anyway.',
    '`iterations` is a uniform read against a constant `MAX_ITERATIONS = 48` loop bound with a `break`, so quality can be lowered at runtime without relinking a program or triggering a driver recompile.',
  ],

  constants: [
    {
      name: 'MAX_ITERATIONS',
      value: '48',
      why: 'Compile-time loop ceiling. A fully dynamic bound is legal in ES 3.00 but stops the compiler bounding register pressure, and some mobile drivers recompile the shader when the uniform changes — a visible hitch at exactly the moment you were trying to avoid one.',
    },
    {
      name: 'iterations',
      value: '16',
      why: 'Runtime pass count. Below about 6 the field is a plain ripple with no interference; past about 24 each extra pass adds detail finer than one dither cell, so it is thrown away by the quantiser and costs a full sin/rot per fragment for nothing.',
    },
    {
      name: 'warp',
      value: '1.5',
      why: 'How far each pass folds the coordinate. Under ~0.5 the passes barely disturb each other and the plasma is concentric; over ~2.5 the folding self-intersects and produces hard creases that survive quantisation as jagged black shapes.',
    },
    {
      name: 'amplitude decay',
      value: '0.86',
      why: 'Per-pass amplitude falloff. At 1.0 the late passes carry as much weight as the first and the field turns to grey mush; below ~0.6 only the first three passes contribute and the iteration count stops mattering.',
    },
    {
      name: 'phase offset',
      value: 'float(i) * 0.7',
      why: 'Decorrelates the passes. Without it every pass warps in lockstep and sixteen iterations look identical to one.',
    },
    {
      name: 'levels',
      value: '11',
      why: 'Grey steps. Eleven is the count that still reads as print: enough to hold the shape of the plasma, few enough that every transition is visibly dots rather than a ramp. Past ~20 the dither becomes invisible and you have paid for it anyway.',
    },
    {
      name: 'gamma',
      value: '1.49',
      why: 'Exponent the levels are spaced on. At 1.0 the steps are uniform in code and non-uniform to the eye, so the shadows show obvious banding while the highlights look smooth.',
    },
    {
      name: 'vignette centre',
      value: '(0.5, 0.4)',
      why: 'The optical centre. Vignetting around the geometric centre makes a hero read as bottom-heavy, because the eye already places the middle of a frame slightly above halfway.',
    },
    {
      name: 'cellSize',
      value: '2',
      why: 'CSS pixels per dither cell, so the 8x8 tile is 16 CSS px. Indexing the matrix by device pixels instead makes the texture twice as coarse on a 1x monitor as on a 2x one.',
    },
  ],

  pitfalls: [
    'Dividing the plasma sum by a hard-coded normaliser. Drop from 16 iterations to 8 on a weak GPU and the whole image gets darker, so the low-quality path looks like a different component rather than the same one with less detail.',
    'Applying the dither offset after decoding the gamma ramp. In the shadows the ramp is compressed, so a fixed offset spans much less than one output step there and the dark half of the frame bands exactly as if there were no dither at all.',
    'Writing `sin(p.xy * ...)` instead of `sin(p.yx * ...)`. The axes stop being coupled, every pass warps x by a function of x, and the marbling degenerates into diagonal stripes.',
    'Making the iteration count a `const int`. Every quality level then needs its own compiled program, and switching between them stalls the pipeline; a uniform plus a constant loop bound with `break` costs one comparison per pass.',
    'Centring the vignette at (0.5, 0.5). It is subtle and it is real — the frame reads as sagging, and the usual reaction is to reduce the vignette strength instead of moving it.',
    'Rendering at native DPR. This shader is 16 iterations of transcendentals per fragment; at DPR 3 that is 2.25x the fragments of DPR 2 for no perceptible gain, and it is the difference between 60fps and 25 on a phone.',
    'Leaving the context alive on unmount. Raw GL has no `dispose()` — the VAO, buffer and program are deleted explicitly and `loseContext(gl)` returns the context, or the page starts blanking its oldest canvases after roughly sixteen mounts.',
  ],

  notes: [
    'The 8x8 matrix is derived from `gl_FragCoord` with six integer operations rather than sampled from a texture. The derivation is documented in full in `bayer8-ordered-dither`; the function is duplicated here so this component installs standalone.',
    'The entire look is data: `iterations`, `warp`, `frequency`, `contrast`, `gamma` and `levels` are the only things separating newsprint from oil-slick.',
  ],

  apiSignature:
    'function BayerPlasmaHero(props: { iterations?: number; warp?: number; frequency?: number; rotate?: number; contrast?: number; gamma?: number; levels?: number; cellSize?: number; vignette?: number; ink?: readonly [number, number, number]; paper?: readonly [number, number, number]; speed?: number; maxDpr?: number; className?: string }): JSX.Element',

  props: [
    { name: 'iterations', type: 'number', default: '16', description: 'Plasma warp passes. Clamped to 1..48, the shader\'s compiled ceiling.' },
    { name: 'warp', type: 'number', default: '1.5', description: 'How far each pass folds the coordinate through its own sine.' },
    { name: 'frequency', type: 'number', default: '2.2', description: 'Base spatial frequency of the plasma.' },
    { name: 'rotate', type: 'number', default: '-0.1', description: 'Radians of rotation applied to the coordinate each pass.' },
    { name: 'contrast', type: 'number', default: '1.35', description: 'Contrast pivoted on mid grey, applied before quantisation.' },
    { name: 'gamma', type: 'number', default: '1.49', description: 'Exponent the output levels are spaced on.' },
    { name: 'levels', type: 'number', default: '11', description: 'Output grey levels, both ends included.' },
    { name: 'cellSize', type: 'number', default: '2', description: 'CSS pixels per dither cell. Multiplied by DPR internally.' },
    { name: 'vignette', type: 'number', default: '0.55', description: 'Strength of the elliptical vignette at the optical centre.' },
    { name: 'ink', type: 'readonly [number, number, number]', default: '[0.03, 0.032, 0.038]', description: 'Darkest output colour, linear 0..1 RGB.' },
    { name: 'paper', type: 'readonly [number, number, number]', default: '[0.88, 0.92, 0.9]', description: 'Lightest output colour, linear 0..1 RGB.' },
    { name: 'speed', type: 'number', default: '1', description: 'Multiplier on plasma evolution.' },
    { name: 'maxDpr', type: 'number', default: '2', description: 'Upper bound on device pixel ratio.' },
    { name: 'className', type: 'string', description: 'Merged onto the host element.' },
  ],

  reducedMotion:
    'No rAF subscription. A single frame is drawn at a fixed `u_time` of 7.5 seconds and redrawn on resize — not at t=0, where every sine in the warp chain is still in phase and the plasma is a nearly flat field. The dithered texture, the vignette and the level structure are all fully present; only the evolution stops.',

  cleanup:
    'Deletes the VAO, vertex buffer and program, then `loseContext(gl)` to hand the context back. The rAF subscription and the pointer listener unsubscribe with their hooks.',

  acceptance:
    'Every tonal transition is made of visible ordered dots — put your eye close and there is no smooth ramp anywhere in the frame. Set `iterations={6}` and the field simplifies without getting darker. Move the cursor and the plasma shears toward it rather than a bright spot appearing under it. The frame is darkest at the corners and brightest slightly above the middle.',

  criticalRegion: 'critical',
};

export default meta;
