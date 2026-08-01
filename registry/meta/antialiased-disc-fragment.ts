import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'antialiased-disc-fragment',
  title: 'Anti-Aliased Point Discs',
  category: 'webgl',
  tags: ['three', 'points', 'fragment-shader', 'antialiasing', 'device-pixel-ratio'],
  blurb: 'A phyllotaxis field of dots that stay the same weight at every pixel ratio, with no MSAA and no texture.',
  cost: 'webgl',
  motif: 'rings',

  files: [
    {
      path: 'registry/ui/antialiased-disc-fragment.tsx',
      target: 'components/motion/antialiased-disc-fragment.tsx',
      type: 'registry:ui',
      role: 'component',
    },
    {
      path: 'registry/shaders/antialiased-disc-fragment.ts',
      target: 'components/motion/shaders/antialiased-disc-fragment.ts',
      type: 'registry:lib',
      role: 'vertex and fragment source',
    },
  ],
  dependencies: ['three@^0.185.1'],
  registryDependencies: ['webgl', 'prng', 'use-raf', 'use-resize-observer', 'use-reduced-motion'],

  summary:
    'A point sprite is a square; this is the pair of shader tricks that makes it a dot. The fragment shader carves a disc with one smoothstep across the outer few percent of the sprite and discards everything below a visibility threshold, and the vertex shader clamps the point size to the hardware floor and then divides the alpha by the area that clamp invented. The field is laid out as a phyllotaxis spiral with a size ramp so both ends of the problem — sub-pixel dots and twenty-pixel dots — are on screen at once.',

  mechanism: [
    'Dots are placed by golden-angle phyllotaxis: `t = sqrt((i + 0.5) / count)` for the normalised radius and `i * 137.507°` for the angle, so spacing is even rather than crowded at the centre. A seeded jitter of ±0.06 rad is added to break the moiré a pure spiral shows at small radii.',
    'The vertex shader rotates differentially — `angle + uElapsed * uSpin * (0.6 + t)` — so the rim turns 1.6x faster than the core and the arms shear instead of the field spinning rigidly.',
    'Point size ramps as `mix(uMinRadius, uMaxRadius, t * t)`, quadratic so most of the field stays small and the large discs are confined to the rim where the anti-aliasing is easiest to inspect.',
    'The size is then clamped: `clamped = max(2.0, radius * 2.0 * uPixelRatio)` against `unclamped = max(1.0, …)`, and `vAlphaScale = unclamped² / clamped²` is passed to the fragment shader. A dot the driver forced to be twice as wide comes out four times fainter, so total emitted light is unchanged.',
    'The fragment shader computes `d = length(gl_PointCoord - 0.5)` and `disc = 1.0 - smoothstep(uEdgeInner, 0.5, d)` where `uEdgeInner = 0.5 - softness`, so the falloff always ends exactly at the sprite edge and the disc stays inscribed in its square.',
    'Anything whose final alpha lands below 0.003 is discarded rather than blended, which removes a framebuffer read-modify-write per pixel across the sparse outer field.',
  ],

  constants: [
    {
      name: 'GOLDEN_ANGLE',
      value: 'Math.PI * (3 - Math.sqrt(5)) ≈ 2.39996 rad',
      why: 'The only angle whose successive multiples never repeat a rational fraction of a turn. Any nearby value produces visible spokes within a few hundred points.',
    },
    {
      name: 'softness',
      value: '0.07',
      why: 'Anti-aliased band as a fraction of the sprite radius, giving `smoothstep(0.43, 0.5, d)`. Below ~0.05 a 2px dot aliases back into a square; above ~0.15 every dot reads as blurred rather than small.',
    },
    {
      name: 'MIN_POINT_SIZE',
      value: '2.0',
      why: 'Hardware floor in device pixels. Below roughly 1px most GPUs rasterise nothing, so the smallest dots would be absent on some machines and present on others.',
    },
    {
      name: 'ALPHA_EPSILON',
      value: '0.003',
      why: 'Discard threshold, just under 1/255. Anything fainter cannot be shown by an 8-bit framebuffer, so blending it is pure fill cost.',
    },
    {
      name: 'radius ramp exponent',
      value: 't * t',
      why: 'Quadratic rather than linear. Linear puts mid-size discs everywhere and the field turns into a solid disc; quadratic keeps the interesting large sprites at the rim.',
    },
    {
      name: 'count',
      value: '4000',
      why: 'One buffer, one draw call, and about 4000 sprites of up to 20px — roughly the point where fill rate rather than vertex count starts to dominate on integrated graphics.',
    },
    {
      name: 'differential spin factor',
      value: '(0.6 + 1.0 * t)',
      why: 'Rim-to-core angular speed ratio of 1.6. At 1.0 the field spins rigidly and reads as a rotating image; past ~2.5 the arms wind into a solid ring within a minute.',
    },
  ],

  pitfalls: [
    'Softening the disc outward from 0.5 instead of inward to it. The sprite has no pixels past 0.5, so the outer half of the falloff is clipped by the sprite boundary and the dot shows four square corners.',
    'Clamping `gl_PointSize` and leaving the alpha alone. The clamp does nothing at DPR 3 and doubles the covered area at DPR 1, so the identical component looks twice as heavy on a non-retina monitor — a bug that is invisible on the machine most people develop on.',
    'Caching the pixel ratio at construction. Dragging the window from a retina to a non-retina display changes `devicePixelRatio` without changing the canvas size, so the compensation silently goes stale; it is re-read on every resize.',
    'Reaching for `antialias: true` when the dots look jagged. MSAA allocates a multisample buffer the size of the canvas and does not help a point sprite whose edge is defined by alpha — the smoothstep is the fix.',
    'Blending fully transparent fragments instead of discarding them. At 4000 sprites with a 20px radius the outer field is mostly empty pixels, and each one still costs a read-modify-write of the framebuffer.',
    'Linear radial spacing instead of `sqrt`. It crowds the centre, which is precisely where the sub-pixel dots live, and the core turns into an undifferentiated smear.',
  ],

  notes: [
    'The camera is orthographic and 1:1 with CSS pixels, so `uMinRadius` and `uMaxRadius` are literal pixel radii rather than scene units.',
    'The same two tricks apply to any `THREE.Points` material. The spiral is only a way to show the whole size range at once.',
  ],

  apiSignature:
    'function AntialiasedDiscFragment(props: { count?: number; minRadius?: number; maxRadius?: number; fieldRadius?: number; spin?: number; softness?: number; opacity?: number; colorInner?: string; colorOuter?: string; seed?: number | string; className?: string }): JSX.Element',

  props: [
    { name: 'count', type: 'number', default: '4000', description: 'Number of discs. One draw call regardless.' },
    { name: 'minRadius', type: 'number', default: '0.5', description: 'Disc radius in CSS pixels at the centre — deliberately sub-pixel at DPR 1.' },
    { name: 'maxRadius', type: 'number', default: '10', description: 'Disc radius in CSS pixels at the rim.' },
    { name: 'fieldRadius', type: 'number', default: '0.92', description: 'Field diameter as a fraction of the container short side.' },
    { name: 'spin', type: 'number', default: '0.08', description: 'Base angular speed in radians per second; the rim runs 1.6x faster.' },
    { name: 'softness', type: 'number', default: '0.07', description: 'Anti-aliased band width as a fraction of the sprite radius.' },
    { name: 'opacity', type: 'number', default: '1', description: 'Multiplier applied before the area compensation.' },
    { name: 'colorInner', type: 'string', default: "'#ffffff'", description: 'Tint at the centre of the field.' },
    { name: 'colorOuter', type: 'string', default: "'#6f7680'", description: 'Tint at the rim.' },
    { name: 'seed', type: 'number | string', default: "'antialiased-disc-fragment'", description: 'Seeds the angular jitter so the layout is stable across reloads and matches on the server.' },
    { name: 'className', type: 'string', description: 'Merged onto the host element via `cn`.' },
  ],

  reducedMotion:
    'No rAF subscription is opened. A single frame is drawn at `uElapsed = 6`, which is far enough into the rotation that the arms are already sheared, so the composition is the interesting one rather than the unrotated starting pose. The field is fully visible; only the spin stops.',

  cleanup:
    'Nulls the stage ref, disposes the geometry and material via `disposeObject` plus an explicit `material.dispose()`, calls `disposeRenderer` for `dispose` + `forceContextLoss` + a zeroed drawing buffer, then removes the canvas. `useRaf` releases the frame subscription itself.',

  acceptance:
    'A spiral of dots that grows from barely-visible at the centre to clearly round discs at the rim, with soft edges and no square corners at any size. Zoom the browser between 100% and 200% and the field keeps the same apparent weight instead of getting denser or lighter. Nothing shimmers along the arms as they turn. With reduced motion the spiral renders in full and holds still.',

  criticalRegion: 'critical',
};

export default meta;
