import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'depth-pulse-travelling-wave',
  title: 'Depth Fade And Travelling Pulse',
  category: 'webgl',
  tags: ['three', 'points', 'depth-cue', 'wave', 'no-depth-buffer'],
  blurb:
    'A dot lattice on an arc: z drives alpha and point size together, and a per-column phase sweeps the pulse across the field.',
  cost: 'webgl',
  motif: 'wave',

  files: [
    {
      path: 'registry/ui/depth-pulse-travelling-wave.tsx',
      target: 'components/motion/depth-pulse-travelling-wave.tsx',
      type: 'registry:ui',
      role: 'component',
    },
    {
      path: 'registry/shaders/depth-pulse-travelling-wave.ts',
      target: 'components/motion/shaders/depth-pulse-travelling-wave.ts',
      type: 'registry:lib',
      role: 'vertex and fragment source',
    },
  ],
  dependencies: ['three@^0.185.1'],
  registryDependencies: ['webgl', 'prng', 'use-raf', 'use-resize-observer', 'use-reduced-motion'],

  summary:
    'A lattice of dots bent around a shallow arc and lit by a pulse that travels across it. Depth is faked entirely from model-space z, which drives alpha and point size at the same time, so the arc reads as curved with no depth buffer and no perspective camera. The pulse is a cosine whose phase varies per column, and its crest also pushes dots toward the viewer, so the two techniques compound: the wave arrives as a moving band of brighter, larger dots.',

  mechanism: [
    'Columns are placed by angle across `arcSpan`, then z is renormalised so the centre column lands at exactly `+arcDepth` and both edges at `-arcDepth`, independent of the span. Without that renormalisation the usable z range shrinks with the span and the depth cue silently weakens whenever the arc is flattened.',
    'The depth cue is `depthT = clamp((z + 0.55) / 1.1, 0, 1)`, which drives alpha from 0.25 to 1.0 *and* point size from 0.65 to 1.0. Both together are the point: alpha alone reads as a grey copy of the near dots, size alone reads as a resolution change, and only the pair reads as distance.',
    'The pulse is `raw = 0.65 + 0.35 * cos(2π * (uElapsed / pulseCycle - phase))`, with `phase = columnT * waveTurns + rowT * 0.12` baked into an attribute. Subtracting the phase inside the cosine is what makes the crest move *along* the lattice rather than the whole field breathing in unison.',
    'The crest, renormalised to 0..1, is added to z as `p.z += crest * uWaveDepth`, so the wave feeds the depth cue. A dot at the crest is pushed nearer, and the depth fade then brightens and enlarges it — one displacement drives three visible changes.',
    'The pulse ramps in over the first second (`clamp(uElapsed / 1.0, 0, 1)`), so the first frame does not land on an arbitrary point of the cosine and flash. Yaw is `sin(elapsed * yawSpeed * 2π) * yawAmplitude` degrees, applied in the shader after the wave so the lattice rocks through its own depth range.',
    '`gl_PointSize` is clamped to a 2px floor and alpha is compensated by `unclamped² / clamped²`, so the field keeps the same apparent density at DPR 1 and DPR 2 instead of getting heavier on retina.',
  ],

  constants: [
    {
      name: 'PULSE_BASE / PULSE_SWING',
      value: '0.65 / 0.35',
      why: 'The pulse rides between 0.30 and 1.00 of nominal size and alpha. A trough at 0 would make dots vanish entirely and the lattice would look like it is dropping frames rather than breathing.',
    },
    {
      name: 'DEFAULT_CYCLE / pulseCycle',
      value: '3.0 seconds',
      why: 'Under ~2s the crest outruns the eye following it across the lattice; over ~5s it stops reading as a wave and becomes an idle shimmer.',
    },
    {
      name: 'INTRO_SECONDS',
      value: '1.0',
      why: 'Ramps the pulse amplitude from 0. Without it the first rendered frame samples the cosine at an arbitrary phase and the whole field flashes on mount.',
    },
    {
      name: 'DEPTH_HALF_RANGE',
      value: '0.55',
      why: 'The arc spans ±0.34 and the wave adds up to +0.18, so normalising over ±0.55 leaves headroom at both ends — no dot sits at exactly 0 or 1 and the falloff never visibly clips.',
    },
    {
      name: 'DEPTH_MIN_SIZE / DEPTH_MAX_SIZE',
      value: '0.65 / 1.0',
      why: 'Far dots at 65% of near ones. Paired with the 0.25→1.0 alpha ramp; either cue on its own is ambiguous, and this ratio is the smallest that still reads as depth at preview-card sizes.',
    },
    {
      name: 'waveTurns',
      value: '1.4',
      why: 'Wavelengths visible across the lattice at any instant. At 1 the crest and trough sit at opposite edges and it reads as a tilt; past ~2.5 the bands are too narrow to track and the field just shimmers.',
    },
    {
      name: 'ROW_PHASE_LEAN',
      value: '0.12',
      why: 'Small row contribution to the phase, so the crest leans instead of arriving as a perfectly vertical bar. Bigger than ~0.3 and the wave starts reading as diagonal stripes.',
    },
    {
      name: 'yawAmplitude / yawSpeed',
      value: '16 degrees / 0.25 Hz',
      why: 'The lattice rocks rather than spins. A full rotation would carry columns through the arc\'s entire depth range and destroy the near/far reading the crest depends on.',
    },
    {
      name: 'crest tint threshold',
      value: 'smoothstep(0.65, 1.0, crest)',
      why: 'Only the top third of the crest picks up `crestColor`. Tinting the whole cosine spreads the accent across the field and the wave stops having a location.',
    },
  ],

  pitfalls: [
    'Giving every dot the same phase. The field then pulses in unison, which reads as a loading state rather than as something moving through the lattice — the per-column phase offset *is* the effect.',
    'Fading alpha with depth but leaving point size constant. The far edge of the arc becomes a grey copy of the near edge instead of receding, because size is the cue the eye actually uses for distance at these scales.',
    'Leaving `depthTest` on. Every dot is projected at z = 0, so whichever dot rasterises first wins the pixel and the lattice develops holes wherever it folds back on itself.',
    'Starting the pulse at full amplitude. The first frame samples the cosine at whatever phase `elapsed` happens to be, and the field flashes on mount — hence the one-second amplitude ramp.',
    'Placing columns by angle without renormalising z. The depth range then scales with `cos(arcSpan/2)`, so flattening the arc quietly kills the depth fade and the component looks broken at shallow spans while working at wide ones.',
    'A perfectly regular lattice. It moirés against the pixel grid and shows banding as the field yaws; the seeded sub-cell jitter costs nothing and removes it.',
    'Rebuilding the buffer on resize. Model space is size-independent — only `uViewScale` and `uPixelRatio` change, so a container reflow costs two uniform writes rather than a dropped GL context.',
  ],

  notes: [
    'Dot count is `columns * rows`, 4840 at the defaults, in one draw call with one attribute beyond position.',
    'The wave is purely a function of `uElapsed` and a baked per-dot phase, so there is no simulation state and no drift — pausing and resuming lands exactly where the clock says it should.',
  ],

  apiSignature:
    'function DepthPulseTravellingWave(props: { columns?: number; rows?: number; arcSpan?: number; arcDepth?: number; fieldHeight?: number; pulseCycle?: number; waveTurns?: number; waveDepth?: number; yawAmplitude?: number; yawSpeed?: number; dotScale?: number; viewScale?: number; opacity?: number; color?: string; crestColor?: string; seed?: number | string; className?: string }): JSX.Element',

  props: [
    { name: 'columns', type: 'number', default: '110', description: 'Columns across the arc.' },
    { name: 'rows', type: 'number', default: '44', description: 'Rows down each column.' },
    { name: 'arcSpan', type: 'number', default: '110', description: 'Arc the lattice is bent around, in degrees.' },
    { name: 'arcDepth', type: 'number', default: '0.34', description: 'Half-depth of the arc in model units — how far the edges recede.' },
    { name: 'fieldHeight', type: 'number', default: '1.1', description: 'Lattice height in model units.' },
    { name: 'pulseCycle', type: 'number', default: '3', description: 'Seconds per pulse.' },
    { name: 'waveTurns', type: 'number', default: '1.4', description: 'Wavelengths visible across the lattice at any instant.' },
    { name: 'waveDepth', type: 'number', default: '0.18', description: 'How far a crest pushes a dot toward the viewer, in model units.' },
    { name: 'yawAmplitude', type: 'number', default: '16', description: 'Peak yaw of the whole lattice, in degrees.' },
    { name: 'yawSpeed', type: 'number', default: '0.25', description: 'Yaw oscillations per second.' },
    { name: 'dotScale', type: 'number', default: '1', description: 'Dot radius multiplier in CSS pixels.' },
    { name: 'viewScale', type: 'number', default: '0.46', description: 'Model-to-pixel scale as a fraction of the container short side.' },
    { name: 'opacity', type: 'number', default: '1', description: 'Multiplier applied to every dot.' },
    { name: 'color', type: 'string', default: "'#6f757e'", description: 'Base dot colour.' },
    { name: 'crestColor', type: 'string', default: "'#ffffff'", description: 'Colour mixed in at the top of the crest.' },
    { name: 'seed', type: 'number | string', default: "'depth-pulse-travelling-wave'", description: 'Seeds the sub-cell jitter for a stable, hydration-safe lattice.' },
    { name: 'className', type: 'string', description: 'Merged onto the host element via `cn`.' },
  ],

  reducedMotion:
    'No frame loop is opened. A single frame is drawn at `uElapsed = 1.9` — past the one-second amplitude ramp, and a third of the way through the default cycle, so the crest sits inside the lattice rather than off its edge. Both the depth falloff and the wave band are visible in that still; neither advances.',

  cleanup:
    'Nulls the stage ref so a queued frame cannot touch a dead renderer, disposes the geometry through `disposeObject(scene)`, disposes the material, calls `disposeRenderer` for `dispose` + `forceContextLoss` + a zeroed backing store, and removes the canvas. `useRaf` unsubscribes on unmount, so a StrictMode double-invoke leaves no orphaned context.',

  acceptance:
    'A curved lattice of dots is visibly dimmer and smaller toward its left and right edges than at its centre. A band of brighter, larger dots sweeps repeatedly across the field, roughly once every three seconds, rather than the whole field brightening at once. The lattice rocks gently side to side. Nothing flashes on mount. Resize the container and the field rescales without a flicker or a dropped context. With reduced motion it holds a single frame showing both the depth falloff and the crest.',

  criticalRegion: 'critical',
};

export default meta;
