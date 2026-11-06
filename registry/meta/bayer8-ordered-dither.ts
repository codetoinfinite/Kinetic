import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'bayer8-ordered-dither',
  title: 'Bit-Math Bayer8 Dither',
  category: 'webgl',
  tags: ['webgl2', 'shader', 'dither', 'bayer', 'quantisation', 'bit-math'],
  blurb:
    'A smooth gradient crushed to five levels through an 8x8 ordered matrix derived from six integer ops.',
  cost: 'webgl',
  motif: 'noise',

  files: [
    {
      path: 'registry/ui/bayer8-ordered-dither.tsx',
      target: 'components/motion/bayer8-ordered-dither.tsx',
      type: 'registry:ui',
      role: 'component',
    },
    {
      path: 'registry/shaders/bayer8-ordered-dither.ts',
      target: 'components/motion/shaders/bayer8-ordered-dither.ts',
      type: 'registry:lib',
      role: 'bayer8 derivation + quantisation fragment shader',
    },
  ],
  dependencies: [],

  summary:
    'Ordered dithering with the threshold matrix computed from the fragment coordinate instead of sampled from a texture. Six integer operations reproduce the classic 8x8 Bayer matrix exactly, which turns a banding-prone gradient into a stable newsprint texture that holds at any zoom and costs less than the texture fetch it replaces.',

  mechanism: [
    'The Bayer matrix is defined recursively as `M2 = [[0,2],[3,1]]` and `M2n(x,y) = 4*Mn(x mod n, y mod n) + M2(x div n, y div n)`. Writing M2 in binary (0=00, 2=10, 3=11, 1=01) collapses it to the closed form `M2(a,b) = 2*(a^b) + b`.',
    'Unrolling that recursion three times gives `M8(x,y) = 16*M2(x0,y0) + 4*M2(x1,y1) + M2(x2,y2)` where xN is bit N of x, and substituting the closed form yields the whole matrix as one expression: `32*(x0^y0) + 16*y0 + 8*(x1^y1) + 4*y1 + 2*(x2^y2) + y2`.',
    'Read as bits that is the low three bits of `x ^ y` and of `y`, interleaved and reversed — the LEAST significant coordinate bit drives the MOST significant threshold bit, which is precisely what makes the pattern maximally dispersed instead of clustered. In GLSL it is `int x = c.x & 7; int y = c.y & 7;` followed by those six terms, divided by 64.',
    '`gl_FragCoord.xy` is divided by `cellSize * dpr` before the matrix lookup, so the dither cell is a fixed physical size and the texture does not get four times finer on a retina display.',
    'Quantisation is `floor(clamp(c + (threshold - 0.5) / steps, 0, 1) * steps + 0.5) / steps` with `steps = levels - 1`. Centring the threshold on zero and scaling it to exactly one output step is what makes the perturbation cancel out on average.',
    'A `pow(g, 1.35)` gamma is applied before quantisation, because the output levels are evenly spaced in the encoded value while the eye is not — quantising the linear value alone dumps all the visible banding into the shadows.',
  ],

  constants: [
    {
      name: 'divisor',
      value: '64.0',
      why: 'The matrix holds 0..63, so dividing by 64 keeps the thresholds in [0, 1). Dividing by 63 puts the top cell at exactly 1.0, which pushes one cell in every 8x8 tile a full step brighter and stamps a visible dot grid across flat areas.',
    },
    {
      name: 'levels',
      value: '5',
      why: 'Output steps per channel. At 2 it is a pure 1-bit print and the gradient becomes texture only. Above about 12 the eye can no longer see the individual steps and the dither is doing nothing but adding noise — use it to fix banding, not as a look.',
    },
    {
      name: 'cellSize',
      value: '2',
      why: 'CSS pixels per dither cell, so the 8x8 tile is 16 CSS px. At 1 the pattern is at the Nyquist limit of most displays and shimmers when the page scrolls; above about 6 it stops reading as print texture and starts reading as a deliberate checkerboard.',
    },
    {
      name: 'threshold scale',
      value: '(t - 0.5) / (levels - 1)',
      why: 'The perturbation must span exactly one output step. Larger and the dither adds contrast of its own — flat areas visibly sparkle. Smaller and it cannot push a value across a level boundary, so the bands survive untouched.',
    },
    {
      name: 'gamma',
      value: '1.35',
      why: 'Applied before quantisation. Without it the evenly spaced levels bunch perceptually in the highlights and spread in the shadows, so the dark half of the frame shows obvious steps while the bright half looks smooth.',
    },
  ],

  pitfalls: [
    'Uploading the matrix as an 8x8 texture. It needs a texture unit, a sampler uniform, GL_NEAREST filtering and CLAMP wrapping set correctly on a non-power-of-two-safe path, and a resource to dispose — all to replace six integer instructions that are cheaper than the fetch.',
    'Dividing the matrix by 63 instead of 64. The top cell lands on exactly 1.0, that one cell per tile is pushed a full level brighter than its neighbours, and flat regions grow a faint regular dot grid that only shows up on a real screen.',
    'Comparing against the raw matrix value with `step(0.0, x)`. The matrix contains a genuine zero cell, so the comparison passes there even when it should not, and every 8x8 tile gets one stuck pixel. Bias the comparison by about 0.001 if you use a threshold form rather than the quantise form here.',
    'Indexing the matrix with `gl_FragCoord` directly. The cell then measures one device pixel, so the same component looks twice as coarse on a 1x monitor as on a 2x one. Divide by `cellSize * dpr` and the texture is stable.',
    'Quantising the linear value with no gamma. The steps are uniform in code and non-uniform to the eye, so the shadows band visibly while the highlights look fine and the fix gets misdiagnosed as "not enough levels".',
    'Leaving the raw GL objects behind on unmount. There is no `dispose()` here — the VAO, buffer and program are deleted by hand and `loseContext(gl)` returns the context, without which a page that mounts this repeatedly starts blanking its oldest canvases.',
  ],

  notes: [
    'The alternative implementation, a nested `mix`/`step` ladder, is branchless and works on WebGL1. This one needs WebGL2 for integer bit operators but is roughly half the instruction count.',
    'The same six lines dither any signal — swap the gradient in `main` for a scene texture and this becomes a post-process.',
  ],

  apiSignature:
    'function Bayer8OrderedDither(props: { levels?: number; cellSize?: number; speed?: number; dark?: readonly [number, number, number]; light?: readonly [number, number, number]; maxDpr?: number; className?: string }): JSX.Element',

  props: [
    { name: 'levels', type: 'number', default: '5', description: 'Output steps per channel, both ends included. 2 is pure 1-bit.' },
    { name: 'cellSize', type: 'number', default: '2', description: 'CSS pixels per dither cell. Multiplied by DPR internally.' },
    { name: 'speed', type: 'number', default: '1', description: 'Multiplier on the sweep that animates the underlying gradient.' },
    { name: 'dark', type: 'readonly [number, number, number]', default: '[0.035, 0.038, 0.045]', description: 'Darkest output colour, linear 0..1 RGB.' },
    { name: 'light', type: 'readonly [number, number, number]', default: '[0.9, 0.94, 0.92]', description: 'Lightest output colour, linear 0..1 RGB.' },
    { name: 'maxDpr', type: 'number', default: '2', description: 'Upper bound on device pixel ratio.' },
    { name: 'className', type: 'string', description: 'Merged onto the host element.' },
  ],

  reducedMotion:
    'The rAF loop never subscribes; the sweep is frozen at t=0 and the pointer light sits at its seeded centre. One frame is drawn on mount and on every resize, so the dithered gradient is fully rendered — the texture is the point, and it is static.',

  cleanup:
    'Deletes the VAO, vertex buffer and program, then `loseContext(gl)`. The rAF subscription and pointer listener are removed by their hooks.',

  acceptance:
    'The gradient shows no smooth ramp anywhere — every transition is a field of ordered dots resolving between five flat levels. Zoom the browser to 200% and the dot pitch doubles with the page instead of staying at one device pixel. Screenshot two consecutive frames with the pointer still: the dot pattern is byte-identical, because the matrix depends only on position.',

  criticalRegion: 'critical',
};

export default meta;
