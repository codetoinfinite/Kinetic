import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'domain-warped-fbm',
  title: 'Domain-Warped FBM Fog',
  category: 'webgl',
  tags: ['webgl2', 'shader', 'noise', 'fbm', 'domain-warp', 'background'],
  blurb:
    'Slow, low-contrast fog that flows rather than fades, with a faint light that trails the cursor.',
  cost: 'webgl',
  motif: 'noise',

  files: [
    {
      path: 'registry/ui/domain-warped-fbm.tsx',
      target: 'components/motion/domain-warped-fbm.tsx',
      type: 'registry:ui',
      role: 'component',
    },
    {
      path: 'registry/shaders/domain-warped-fbm.ts',
      target: 'components/motion/shaders/domain-warped-fbm.ts',
      type: 'registry:lib',
      role: 'value-noise fbm + domain warp fragment shader',
    },
  ],
  dependencies: [],
  registryDependencies: [],

  summary:
    'A full-screen fragment shader on a single triangle. Two octaves of value-noise fbm are sampled twice to build a 2D offset, and that offset is fed back into a third sample — the result flows instead of cross-fading. The pointer enters the warp three times with different weights and a sign flip, so the fog leans toward the cursor without following it.',

  mechanism: [
    '`fbm(p)` sums two octaves of 3D value noise with amplitudes 0.6 and 0.3 and lacunarity 1.93. The third dimension is time, so the field evolves continuously instead of scrolling.',
    'The domain warp is `q = vec2(fbm(sp + m*0.20, t), fbm(sp + vec2(2.3,1.1) - m*0.20, t))`, then `n = fbm(sp + q*0.4 + m*0.12, t*0.8) * 0.5 + 0.5`. The `vec2(2.3, 1.1)` offset decorrelates the second channel from the first; without it both return the same number and the warp collapses into a diagonal translation.',
    'Both the sample point and the pointer are multiplied by `aspect` on x before use, so the noise stays isotropic and the cursor glow stays circular on a wide screen.',
    '`shade = smoothstep(0.25, 0.85, n)` crushes the noise into a soft two-tone field, and the final colour is `base + tint * (gain * shade + lift)` where `lift = (pointerY - 0.5) * 0.03` tilts the whole frame slightly as the cursor moves up and down.',
    'The cursor light is `smoothstep(0.85, 0.0, d)` — arguments deliberately reversed to produce a falling ramp, 1 at the cursor and 0 at distance 0.85, without the extra `1.0 -`.',
    'A vignette `smoothstep(1.25, 0.5, distance(uv, 0.5))` multiplies the result rather than subtracting from it, so the cursor glow dims with the corners instead of punching through them.',
  ],

  constants: [
    {
      name: 'scale',
      value: '0.7',
      why: 'Multiplier on the sample coordinate. Below 1.0 the noise features are LARGER than the screen, so you get a handful of slow masses. At 3.0 the same shader is television static.',
    },
    {
      name: 'warp',
      value: '0.4',
      why: 'How far `q` displaces the final sample. Under ~0.15 the warp is invisible and you are looking at plain fbm; over ~0.9 the field folds back on itself and produces hard creases that read as compression artefacts.',
    },
    {
      name: 'octaves',
      value: '2',
      why: 'Textbook fbm uses 4-6. Two is enough because the output goes straight through `smoothstep(0.25, 0.85, n)`, which discards the fine detail anyway. fbm is essentially the whole cost of this shader, so halving the octaves halves the frame time.',
    },
    {
      name: 'lacunarity',
      value: '1.93',
      why: 'Frequency step between octaves. Exactly 2.0 makes the two lattices coincide on every other cell boundary and stamps a faint axis-aligned cross into the field; an off-integer step decorrelates them.',
    },
    {
      name: 'amplitude schedule',
      value: '0.6 then 0.3',
      why: 'Starting below 1.0 keeps the two-octave sum inside roughly -0.9..0.9, so `n * 0.5 + 0.5` lands in 0..1 without clipping and the smoothstep window sits where the data actually is.',
    },
    {
      name: 'time scale',
      value: '0.03',
      why: 'The field advances 0.0005 units per frame at 60 Hz. It has to read as weather, not animation — at 0.3 it becomes a lava lamp and starts competing with the content on top of it.',
    },
    {
      name: 'gain',
      value: '0.22',
      why: 'Peak brightness above the base. The reference site sits at 0.08, which keeps the entire image inside the bottom 17% of the value range so white type sits on it perfectly. 0.22 is the standalone default; drop it toward 0.08 the moment you put text on top.',
    },
    {
      name: 'pointer smoothing',
      value: '0.02',
      why: 'Fraction of the gap left after one second. The pointer displaces a noise domain, so raw values make the whole field jump between pointer events rather than drift.',
    },
  ],

  pitfalls: [
    'Aspect-correcting the sample space but not the pointer. The noise looks right and the cursor glow becomes an ellipse that stretches further the wider the window gets — the two must live in the same coordinate system.',
    'Using the same offset for both warp channels. `fbm(sp)` and `fbm(sp)` are the same number, so `q` becomes a scalar along the diagonal and the "warp" is a plain translation; you get sliding blobs with none of the folding.',
    'Feeding `sin()` a large argument inside the hash. `fract(sin(dot(p, ...)))` degrades badly once `p` is in the thousands: the noise develops repeating bands, and it fails on mobile GPUs at scales where the desktop still looks fine. Fold the input with `fract()` first.',
    'Running 5 octaves because that is what the tutorial did. The output is immediately crushed by a smoothstep, so octaves 3-5 cost real milliseconds and change nothing you can see.',
    'Letting the shader run in a hidden tab. `useVisibility` gates the loop; without it a backgrounded page keeps a GPU-bound fragment shader resident and the laptop fan tells the user about it.',
    'Relying on `dispose()`-style cleanup. Raw GL has none — the VAO, buffer and program are deleted explicitly and `loseContext(gl)` hands the context back, without which mounting this component twenty times kills the oldest contexts on the page.',
  ],

  notes: [
    'Value noise rather than simplex: after `smoothstep(0.25, 0.85, n)` the two are indistinguishable, and value noise is eight hash calls and seven mixes with no permutation polynomial.',
    'Total brightness at the defaults runs roughly 0.03 to 0.30. Set `gain={0.08}` for the original hero behaviour, where the whole field stays under 0.18 and white type needs no scrim.',
  ],

  apiSignature:
    'function DomainWarpedFbm(props: { scale?: number; warp?: number; gain?: number; speed?: number; base?: readonly [number, number, number]; tint?: readonly [number, number, number]; maxDpr?: number; className?: string }): JSX.Element',

  props: [
    { name: 'scale', type: 'number', default: '0.7', description: 'Noise frequency. Below 1.0 the features are larger than the screen.' },
    { name: 'warp', type: 'number', default: '0.4', description: 'How far the first two fbm samples displace the third.' },
    { name: 'gain', type: 'number', default: '0.22', description: 'Peak brightness added above the base colour.' },
    { name: 'speed', type: 'number', default: '1', description: 'Multiplier on the drift, which is already very slow.' },
    { name: 'base', type: 'readonly [number, number, number]', default: '[0.03, 0.032, 0.042]', description: 'Base colour, linear 0..1 RGB, straight into the shader.' },
    { name: 'tint', type: 'readonly [number, number, number]', default: '[0.86, 0.9, 1]', description: 'Colour of the lit fog and the cursor glow.' },
    { name: 'maxDpr', type: 'number', default: '2', description: 'Upper bound on device pixel ratio.' },
    { name: 'className', type: 'string', description: 'Merged onto the host element.' },
  ],

  reducedMotion:
    'The rAF loop never subscribes. One frame is drawn at a fixed `u_time` of 12 seconds — far enough into the sequence that the field is fully developed rather than at its symmetric t=0 state — and redrawn on resize. The cursor light does not track.',

  cleanup:
    'Deletes the VAO, the vertex buffer and the program, then `loseContext(gl)`. The rAF subscription and the pointer listener are removed by their hooks.',

  acceptance:
    'Watch for ten seconds: the masses should visibly fold and stretch, not just brighten and dim in place. Move the cursor and a faint circular light follows it a beat late while the fog around it shears. Resize from 320px to full width and the noise features stay the same shape rather than stretching horizontally.',

  criticalRegion: 'critical',
};

export default meta;
