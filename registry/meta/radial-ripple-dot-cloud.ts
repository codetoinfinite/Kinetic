import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'radial-ripple-dot-cloud',
  title: 'Radial Ripple Dot Cloud',
  category: 'webgl',
  tags: ['three', 'points', 'vertex-shader', 'travelling-wave', 'b-spline', 'density'],
  blurb: 'A dot field with a travelling wave running out of one off-centre point, its density drawn by hand as a B-spline.',
  cost: 'webgl',
  motif: 'wave',

  files: [
    {
      path: 'registry/ui/radial-ripple-dot-cloud.tsx',
      type: 'registry:ui',
      role: 'component',
    },
    {
      path: 'registry/shaders/radial-ripple-dot-cloud.ts',
      type: 'registry:lib',
      role: 'vertex and fragment source',
    },
  ],
  dependencies: ['three@^0.185.1'],
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
    'Several thousand dots in one draw call, with a wave travelling outward from a point left of centre. The displacement is a sine in radius minus a phase in time, attenuated exponentially, so the field is violent near the source and nearly still at the rim — which is what gives the motion an origin rather than making it a screensaver. Dot density along the radius is a hand-placed cubic B-spline, so the rings and gaps in the layout are drawn rather than derived from a formula.',

  mechanism: [
    'Rest positions are baked once, in field units, into an `aOrigin` attribute: the field spans ±16/9 horizontally and ±1 vertically. The draw-time uniform `uCover = max(1, aspect / (16/9))` scales that field to cover the camera, so a resize writes one float instead of rebuilding a buffer.',
    'Density along the radius comes from a uniform cubic B-spline over eight hand-placed control points — five spans — evaluated in JS at bake time. `bsplineWeights(t)` returns the four basis values `[(1-t)³, 4-6t²+3t³, 1+3t+3t²-3t³, t³] / 6` and `sampleRamp` blends control points `i..i+3`. The curve is C2 and does not pass through its control points, which is what lets a hand-placed sequence stay smooth.',
    'Positions are chosen by rejection sampling: a seeded candidate uniform over the field rectangle is kept with probability `ramp(dist / maxRadius)`, where `maxRadius` is the distance from the ripple source to the farthest field corner. That is the only way to realise an arbitrary drawn radial density from a uniform PRNG without inverting the curve analytically.',
    'The same ramp value is baked into `aScale` (0.55 + 0.75d) and `aAlpha` (0.3 + 0.7d), so a sparse band is also a dim band. Two independent curves would let them disagree and the field would read as noise with holes in it.',
    'The vertex shader computes `dist = length(origin - uCenter)`, `wave = sin(dist * uFrequency - uElapsed * uSpeed)` — a travelling wave, because the time term is subtracted from the radius term — and `attenuated = wave * exp(-dist * uDecay)`, then displaces each dot along its own outward direction by `attenuated * uAmplitude`.',
    'The direction is guarded: `dir = dist > 1e-5 ? delta / dist : vec2(0.0)`, because normalising a zero vector at the exact source yields NaN and one NaN vertex takes the whole point with it.',
    '`gl_PointSize` is floored at 2 device pixels and the alpha is divided by the area that flooring invented, so the cloud has the same density on a 1x monitor as on a 3x phone. The fragment shader cuts a disc with `1 - smoothstep(0.42, 0.5, d)` and tints toward `uCrestColor` by the signed wave, so only the outgoing crest lights up.',
  ],

  constants: [
    {
      name: 'FIELD_HALF_W',
      value: '16 / 9',
      why: 'Half-width of the baked field, with the field 2 units tall. Baking at one fixed aspect is what makes a resize a single uniform write; 16:9 is the aspect most containers are near, so `uCover` is usually 1 and nothing is scaled at all.',
    },
    {
      name: 'DENSITY_RAMP',
      value: '[1, 1, 0.34, 0.28, 0.92, 0.5, 0, -0.15]',
      why: 'Eight control points, so five spans. Sampled it reads 0.89 / 0.44 / 0.40 / 0.74 / 0.49 / 0.06 — dense core, gap, secondary band at ~60% radius, empty rim. The last point is negative deliberately: a control point is not a value, and pulling it below zero is what makes the tail actually reach zero instead of settling around 0.15.',
    },
    {
      name: 'centerX',
      value: '0.4',
      why: 'Ripple source at 40% of the width rather than 50%. A centred radial wave is bilaterally symmetric and the eye reads symmetry as a screensaver; a source off the axis reads as an impact somewhere in the scene.',
    },
    {
      name: 'frequency',
      value: '6.5 rad per field unit',
      why: 'Wavelength 2π/6.5 ≈ 0.97 units, about half the field height, so roughly two and a half crests fit between the source and the far corner. Past ~12 the rings alias against the dot spacing and the field boils; below ~3 there is only one crest and no ripple to read.',
    },
    {
      name: 'speed',
      value: '2.4 rad per second',
      why: 'Crest speed is speed / frequency = 0.37 field units per second, so a crest crosses the field in about six seconds. Fast enough to be motion, slow enough that the eye can follow a single ring outward.',
    },
    {
      name: 'decay',
      value: '0.85 per field unit',
      why: 'Amplitude is 43% at one unit from the source and 13% at the far corner, which gives the wave a source without a visible boundary. A linear falloff reaches exactly zero at a fixed radius and draws a hard circle there.',
    },
    {
      name: 'amplitude',
      value: '0.045 field units',
      why: '2.25% of the field height — around 25px on a 1100px-tall field, in the same range as the 18px the technique was observed at. Past ~0.12 dots cross each other and the cloud shears instead of rippling.',
    },
    {
      name: 'size',
      value: '2.6 CSS pixels',
      why: 'Base diameter, scaled 0.55..1.3 per dot. Under ~2 the hardware point-size floor kicks in for most dots and the alpha compensation is doing all the work; over ~5 the dense core fills solid and the ripple stops being legible.',
    },
    {
      name: 'count',
      value: '6000',
      why: 'One interleaved-free buffer, one draw call. At this size the field is vertex-bound rather than fill-bound, and 6000 is roughly where the core reads as continuous without the gaps needing more dots to hide them.',
    },
    {
      name: 'MAX_ATTEMPTS_PER_DOT',
      value: '24',
      why: 'Rejection-sampling budget. The mean of the ramp is about 0.45, so ~2.2 attempts per kept dot; a 24x budget absorbs a much sparser custom curve and still terminates rather than spinning forever if someone authors a ramp that is zero everywhere.',
    },
    {
      name: 'STATIC_ELAPSED',
      value: '3.4 s',
      why: 'The frame drawn under reduced motion. Far enough in that two crests have left the source, so the still frame shows the ripple structure rather than the undisturbed lattice.',
    },
  ],

  pitfalls: [
    'Writing `sin(dist * frequency) * sin(elapsed * speed)`. That is a standing wave: the rings pulse in place and never travel. Subtracting the phase from the radius inside one sine is what makes crests move outward — and adding it instead sends them inward, which reads as a drain rather than an impact.',
    'Normalising the offset vector without guarding the source. At `dist == 0` the division produces NaN, the vertex is discarded by the rasteriser, and on some drivers the whole primitive goes with it — an intermittently missing dot that is very hard to attribute.',
    'Attenuating the radius instead of the wave, or using a linear falloff. Linear reaches zero at a fixed radius and draws a visible circle across the field; the exponential never quite reaches zero and has no edge.',
    'Rebuilding the position buffer on resize. It reallocates hundreds of kilobytes during a window drag and, if the layout is re-sampled, re-randomises every dot mid-motion. Baking in field units and scaling by one `uCover` uniform avoids both.',
    'Leaving `frustumCulled` at its default. Every vertex is displaced in the shader, so three\'s bounding sphere — computed from the undisplaced attribute — is wrong, and the whole cloud can vanish when the camera or the container changes.',
    'Using `Math.random()` for the layout. The server and the client disagree, so React logs a hydration mismatch, and the composition a designer approved is not the one the next visitor sees.',
    'Treating the B-spline control points as points on the curve. The curve does not pass through them — the value at the start of the first span is `(P0 + 4P1 + P2) / 6`. Authoring the ramp as if it were interpolating produces a flatter, wrong curve and hours of confusion.',
    'Driving dot brightness from a second curve independent of the density curve. Where they disagree the field reads as random noise with holes in it rather than as drawn bands.',
    'Forgetting that a resize clears the drawing buffer. Under reduced motion nothing redraws afterwards, so the component is blank after any reflow unless the frozen frame is re-rendered.',
  ],

  notes: [
    'The camera is orthographic, ±aspect by ±1, so field units are directly comparable to the container height: 1 unit is half the visible height.',
    '`uCover` implements cover, not contain. Past 16:9 the baked field would otherwise stop short of the container edge and leave a visible vertical seam where the dots end.',
    'The ripple runs on absolute elapsed time from the shared rAF clock, so several instances on one page stay in phase with each other.',
  ],

  apiSignature:
    'function RadialRippleDotCloud(props: { count?: number; size?: number; frequency?: number; speed?: number; decay?: number; amplitude?: number; centerX?: number; centerY?: number; color?: string; crestColor?: string; opacity?: number; seed?: number | string; className?: string }): JSX.Element',

  props: [
    { name: 'count', type: 'number', default: '6000', description: 'Dots kept after density rejection. One draw call regardless.' },
    { name: 'size', type: 'number', default: '2.6', description: 'Base dot diameter in CSS pixels, before the per-dot density scale.' },
    { name: 'frequency', type: 'number', default: '6.5', description: 'Radians of wave per field unit; wavelength is 2π / frequency.' },
    { name: 'speed', type: 'number', default: '2.4', description: 'Radians of phase per second. Crest speed is speed / frequency.' },
    { name: 'decay', type: 'number', default: '0.85', description: 'Exponential attenuation per field unit of radius.' },
    { name: 'amplitude', type: 'number', default: '0.045', description: 'Peak displacement in field units, where the field is 2 units tall.' },
    { name: 'centerX', type: 'number', default: '0.4', description: 'Ripple source across the field, 0..1. Deliberately not centred.' },
    { name: 'centerY', type: 'number', default: '0.5', description: 'Ripple source down the field, 0..1.' },
    { name: 'color', type: 'string', default: "'#5d6b7a'", description: 'Dot colour in the troughs.' },
    { name: 'crestColor', type: 'string', default: "'#eaf2ff'", description: 'Dot colour on an outgoing crest.' },
    { name: 'opacity', type: 'number', default: '1', description: 'Multiplier applied after the per-dot area compensation.' },
    { name: 'seed', type: 'number | string', default: "'radial-ripple-dot-cloud'", description: 'Seeds rejection sampling, so the layout is stable across reloads and matches the server.' },
    { name: 'className', type: 'string', description: 'Merged onto the host element via `cn`.' },
  ],

  reducedMotion:
    'The component reads `useReducedMotion` itself and opens no rAF subscription. One frame is drawn at `uElapsed = 3.4`, by which point two crests have left the source — so the still image shows the ripple structure and the drawn density bands, not the undisturbed lattice. The layout, the colours and the crest tinting are all present; only the travel stops. The frame is re-drawn on resize because a canvas resize clears the buffer.',

  cleanup:
    'Nulls the stage ref, walks the scene with `disposeObject` to release the geometry and its four attribute buffers, disposes the ShaderMaterial explicitly, then calls `disposeRenderer` — `dispose` plus `forceContextLoss` plus a zeroed drawing buffer — and removes the canvas. The canvas is created inside the effect and appended imperatively rather than being owned by a React ref, so a StrictMode double-mount builds a fresh context instead of handing back the one that was just killed.',

  acceptance:
    'Rings of dots visibly travel outward from a point left of centre, roughly two crests visible at a time, brightening as each crest passes and dimming behind it. The rim of the field barely moves. The layout has obvious drawn structure — a dense core, a gap, a second band — and is identical after a reload and after resizing the window. With reduced motion the field renders in full and holds a frozen mid-ripple frame.',

  criticalRegion: 'critical',
};

export default meta;
