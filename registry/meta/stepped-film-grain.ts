import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'stepped-film-grain',
  title: 'Stepped Film Grain',
  category: 'webgl',
  tags: ['three', 'fragment-shader', 'grain', 'overlay', 'quantised-time'],
  blurb: 'A transparent grain overlay whose pattern jumps twelve times a second instead of every frame, so it reads as film.',
  cost: 'webgl',
  motif: 'noise',

  files: [
    {
      path: 'registry/ui/stepped-film-grain.tsx',
      type: 'registry:ui',
      role: 'component',
    },
    {
      path: 'registry/shaders/stepped-film-grain.ts',
      type: 'registry:lib',
      role: 'vertex and fragment source',
    },
  ],
  dependencies: ['three@^0.185.1'],

  summary:
    'A full-screen transparent grain layer for stacking over hero art, video, or flat colour. The pixels are an ordinary hash, and everything that makes it look like film rather than television snow is in the clock: the noise offset is quantised to twelve changes per second, and the frames in between are not drawn at all. Grain cells are sized in CSS pixels, so the overlay weighs the same on a laptop and on a 3x phone.',

  mechanism: [
    'A `PlaneGeometry(2, 2)` is written straight to clip space — `gl_Position = vec4(position.xy, 0.0, 1.0)` — so there are no matrices and no camera transform, only a fragment shader over the whole canvas.',
    'Each fragment picks a lattice cell with `cell = floor(gl_FragCoord.xy / uPixelRatio / uCellSize) + uOffset`, dividing by the pixel ratio so a cell is a fixed number of CSS pixels rather than of device pixels.',
    '`cell = mod(cell, uTile)` wraps the lattice at 170 cells, which keeps the hash argument small enough for float precision and turns the offset into a jump anywhere inside a finite, tiling field.',
    'The value is `fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453)`, shaped into signed grain by `g = (n - 0.5) * uContrast + uLift`. The lift is film base fog: it raises the mean so the layer opens crushed blacks instead of only speckling them.',
    'One normal-blended draw carries both directions: the colour is `vec3(step(0.0, g))` — white above the lift, black below — and the alpha is `abs(g) * uOpacity`, with anything under 0.0035 discarded.',
    'The rAF callback computes `index = floor(elapsed * stepsPerSecond) % steps` and returns immediately if the index is unchanged, so the GPU sees twelve draws a second regardless of display refresh rate. On a step it reads `uOffset` from a seeded table of integer jumps and renders once.',
  ],

  constants: [
    {
      name: 'stepsPerSecond',
      value: '12',
      why: 'The filmic/snow dial. Below about 8 the pattern visibly ticks and reads as a stutter; past about 18 the eye fuses the steps into continuous shimmer and it is television snow again. 12 is 24 fps film with each pattern held for two frames.',
    },
    {
      name: 'steps',
      value: '24',
      why: 'Table length. At 12 steps a second this is a 2-second cycle before the sequence repeats — long enough that nothing breathes on a one-second beat, and the whole table is 48 floats.',
    },
    {
      name: 'tile',
      value: '170',
      why: 'Cells before the lattice wraps. Large enough that the repeat is imperceptible in unstructured noise; small enough that `dot(cell, vec2(12.9898, 78.233))` stays around 15 000, where `fract(sin(x) * 43758)` still has usable precision.',
    },
    {
      name: 'contrast',
      value: '0.24',
      why: 'Peak-to-peak swing before opacity, giving a signed range of ±0.12. Past ~0.4 the grain competes with the image it sits on; below ~0.1 it disappears once the browser composites it at 8 bits.',
    },
    {
      name: 'lift',
      value: '0.095',
      why: 'Just under half the contrast, so roughly 80% of samples land above zero. That asymmetry is what makes it read as an emulsion over the image rather than as symmetric static in front of it.',
    },
    {
      name: 'opacity',
      value: '0.4',
      why: 'Peak alpha works out at 0.4 x 0.215 ≈ 0.086. Above ~0.6 the layer stops being texture and starts being a visible veil over type.',
    },
    {
      name: 'cellSize',
      value: '1 CSS pixel',
      why: 'One cell per CSS pixel is the finest grain that is still DPR-invariant. Larger values give coarser, pushed-film grain; smaller values ask for detail below a CSS pixel that the backing store cannot hold.',
    },
    {
      name: 'maxDpr',
      value: '1',
      why: 'A grain cell is a whole CSS pixel, so a 2x backing store draws four device pixels of identical value per cell — four times the fill rate for a bit-identical image. This is the one full-screen shader that should not be rendered at device resolution.',
    },
    {
      name: 'ALPHA_EPSILON',
      value: '0.0035',
      why: 'Just under 1/255. Below it an 8-bit compositor shows nothing, but blending still costs a framebuffer read-modify-write — and on a lifted, low-contrast field a large share of pixels land there.',
    },
  ],

  pitfalls: [
    'Advancing the noise every frame. It is the single thing that separates film grain from TV static, and it also makes the effect frame-rate dependent — the same overlay churns twice as fast on a 120 Hz display. Quantising the offset fixes both at once.',
    'Sliding the offset by a constant per step instead of jumping to table entries. A constant increment makes the whole field crawl in one direction, and the eye locks onto and tracks that direction; uncorrelated jumps have nowhere to track.',
    'Using a fractional offset. Non-integer values move the lattice off the pixel grid, so cell boundaries resample and the grain shimmers within each step — the artefact the stepping was supposed to remove.',
    'Declaring `precision mediump float` out of habit. The hash argument reaches ~15 000, which a 16-bit float holds to three digits, so adjacent cells return the same value and the grain becomes flat blocks tens of pixels wide. This shader needs highp.',
    'Sizing grain in device pixels. `gl_FragCoord` is a device-pixel coordinate, so grain authored without dividing by the pixel ratio is three times finer and effectively invisible on the phone, while looking correct on the machine it was tuned on.',
    'Rendering the overlay at the device pixel ratio. A cell is one CSS pixel of constant value; a 2x buffer costs four times the fragments and produces the identical image.',
    'Forgetting that resizing a canvas clears its drawing buffer. A component that only draws on a step change goes blank for up to 1/stepsPerSecond after every resize, which during a window drag is a visible flicker — the resize path redraws explicitly.',
    'Using additive blending so the grain can only lighten. The result is haze rather than grain; emitting black or white with the magnitude in alpha gets both directions out of one normal-blended draw.',
  ],

  notes: [
    'The host is `pointer-events-none` and `aria-hidden`. It is a decorative layer that must never intercept a click on the content underneath it.',
    'If WebGL is unavailable the component renders an empty box. A missing grain layer is a correct degradation — the content beneath is untouched.',
    'Stack it as the last child of a relatively-positioned container with `absolute inset-0`. It composites through the browser, so no blend mode is required, though `mix-blend-mode: overlay` is a reasonable variation over photography.',
  ],

  apiSignature:
    'function SteppedFilmGrain(props: { opacity?: number; contrast?: number; lift?: number; cellSize?: number; tile?: number; stepsPerSecond?: number; steps?: number; maxDpr?: number; seed?: number | string; className?: string }): JSX.Element',

  props: [
    { name: 'opacity', type: 'number', default: '0.4', description: 'Overall strength, multiplied onto the grain magnitude.' },
    { name: 'contrast', type: 'number', default: '0.24', description: 'Peak-to-peak swing of the noise before opacity.' },
    { name: 'lift', type: 'number', default: '0.095', description: 'Mean added to the noise — base fog, which biases the layer toward lightening.' },
    { name: 'cellSize', type: 'number', default: '1', description: 'Size of one grain cell in CSS pixels. Clamped to a 0.25 floor.' },
    { name: 'tile', type: 'number', default: '170', description: 'Cells before the lattice repeats. Clamped to a floor of 8.' },
    { name: 'stepsPerSecond', type: 'number', default: '12', description: 'How many times a second the pattern changes. Also the draw rate.' },
    { name: 'steps', type: 'number', default: '24', description: 'Entries in the seeded offset table; the cycle length is steps / stepsPerSecond seconds.' },
    { name: 'maxDpr', type: 'number', default: '1', description: 'Backing-store cap. 1 is deliberate; see the constant.' },
    { name: 'seed', type: 'number | string', default: "'stepped-film-grain'", description: 'Seeds the offset table so the sequence is stable across reloads and matches the server.' },
    { name: 'className', type: 'string', description: 'Merged onto the host element via `cn`.' },
  ],

  reducedMotion:
    'The component reads `useReducedMotion` itself. No rAF subscription is opened, and the grain is drawn once at table entry 0 — the texture is fully present and correct, it simply never advances. That is the right degradation for grain: it is a surface quality, not a motion, and removing it entirely would change how the artwork beneath it reads.',

  cleanup:
    'Nulls the stage ref, disposes the quad geometry and the ShaderMaterial, calls `disposeRenderer` for `dispose` + `forceContextLoss` + a zeroed drawing buffer, then removes the canvas from the DOM. `useRaf` releases its own frame subscription, and there are no listeners of the component\'s own — sizing comes from the shared ResizeObserver and visibility from the shared document listener.',

  acceptance:
    'A fine speckle over the content that visibly holds still for a beat and then changes, roughly twelve times a second — count it by eye and it should read as a flicker, not a fizz. Zoom the browser from 100% to 200% and the grain gets larger with the layout rather than staying pinned to device pixels. Resize the window and the overlay never blanks. With reduced motion the grain is still there and completely static.',

  criticalRegion: 'critical',
};

export default meta;
