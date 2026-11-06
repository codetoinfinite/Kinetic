import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'spring-lattice-field',
  title: 'Spring Lattice Field',
  category: 'webgl',
  tags: ['webgl2', 'shader', 'grid', 'physics', 'spring', 'pointer'],
  blurb:
    'A CPU damped-spring lattice uploaded as a texture each frame, displacing a procedural grid the cursor can push around.',
  cost: 'webgl',
  motif: 'grid',

  files: [
    {
      path: 'registry/ui/spring-lattice-field.tsx',
      target: 'components/motion/spring-lattice-field.tsx',
      type: 'registry:ui',
      role: 'component',
    },
    {
      path: 'registry/shaders/spring-lattice-field.ts',
      target: 'components/motion/shaders/spring-lattice-field.ts',
      type: 'registry:lib',
      role: 'displacement-sampling grid fragment shader',
    },
  ],
  dependencies: [],

  summary:
    'A grid that behaves like a stretched sheet. A coarse lattice of damped springs runs on the CPU, is packed into an RGBA8 texture once per frame, and the fragment shader reads that texture with LINEAR filtering to displace its own sample coordinate. The pointer pushes cells outward and drags them along with its velocity; diffusion between neighbours turns each push into a wave that spreads and settles.',

  mechanism: [
    'The lattice is `round(width / cellSize)` by `round(height / cellSize)` cells, sized in CSS pixels rather than device pixels so the simulation is identical on a retina display instead of running four times as many cells.',
    'Each step, cells within `radius` of the pointer receive two impulses: a radial one along `(cell - pointer) / |cell - pointer|` scaled by `radialStrength`, and a flow one along the pointer\'s own velocity scaled by `flowStrength`. Both are weighted by `t*t*(3-2t)` where `t = 1 - dist/radius` — a smoothstep falloff, C1 at both ends, so the disturbance has no visible rim.',
    'Then `vel = (vel - disp * returnStiffness) * velocityDamping` and `nextDisp = disp + vel + (neighbourAverage - disp) * diffusion`. The diffusion term is what makes it a sheet rather than a field of independent springs: a local push propagates outward as a wave instead of staying put.',
    'The integration writes into a scratch buffer, not in place. In place, the +x and +y neighbours would already hold the new value when a cell reads them, and the wave would visibly drift toward the lattice origin.',
    'Displacement is packed into the texture as `d / DISP_MAX * 0.5 + 0.5` in RG, with cell speed in B. Speed, not displacement, drives the glow — so the field lights up while it is moving and goes dark once it settles, which is what reads as elastic rather than as a permanent dent.',
    'The shader adds `disp / gridDimensions` to its uv before drawing an `fwidth`-normalised grid, so lines stay one pixel wide even where the field is stretching them, and `u_density` is set to the lattice row count so the drawn lines land on cell boundaries.',
  ],

  constants: [
    {
      name: 'STEP',
      value: '1 / 60',
      why: 'Fixed simulation timestep. Every other physics constant is expressed per step — `velocityDamping = 0.93` only means "keep 93% per 1/60 s" if the step is always 1/60 s. Integrating per frame instead makes the field stiffer on a 60 Hz laptop than on a 120 Hz phone.',
    },
    {
      name: 'MAX_SUBSTEPS',
      value: '4',
      why: 'Catch-up ceiling. Returning to a backgrounded tab otherwise tries to simulate the whole elapsed time in one frame and the page locks up for seconds. The leftover accumulator is discarded when the ceiling is hit, or the debt compounds and the simulation runs saturated forever.',
    },
    {
      name: 'returnStiffness',
      value: '0.018',
      why: 'Spring constant per step. Above ~0.05 the lattice snaps back before the wave can spread and it reads as rubber sheeting; below ~0.006 disturbances take several seconds to clear and the grid looks permanently dented.',
    },
    {
      name: 'velocityDamping',
      value: '0.93',
      why: 'Velocity retained per step. At 1.0 the lattice never loses energy and rings forever; below ~0.85 the push is absorbed within a few cells and nothing propagates.',
    },
    {
      name: 'diffusion',
      value: '0.22',
      why: 'Fraction of the way each cell moves toward its neighbours\' average per step. This is the wave speed. Past 0.25 the explicit scheme goes unstable and the lattice fills with checkerboard noise; near 0 the cells decouple and the grid dimples pointwise.',
    },
    {
      name: 'radius',
      value: '5.5',
      why: 'Pointer influence, in cells. Expressed in cells rather than pixels so the physics is unchanged at any `cellSize`. Under ~3 the cursor pokes a hole; past ~10 it lifts the whole panel and the motion loses its centre.',
    },
    {
      name: 'radialStrength',
      value: '0.02',
      why: 'Sustained outward push per step. Equilibrium displacement is roughly `radialStrength / returnStiffness` ≈ 1.1 cells — enough for the grid to visibly part around a resting cursor without approaching the encode range.',
    },
    {
      name: 'flowStrength',
      value: '0.08',
      why: 'Drag along the pointer velocity. A transient impulse peaks at about `impulse / (1 - velocityDamping)` ≈ 14x, so this is roughly ten times smaller than the radial constant for a comparable displacement. Raise it and fast swipes clip the encode range.',
    },
    {
      name: 'MAX_POINTER_SPEED',
      value: '45',
      why: 'Cells per second. A pointer that teleports across the element — tab switch, window drag, the first event after a long pause — otherwise injects one enormous impulse and the whole lattice snaps in a single step.',
    },
    {
      name: 'DISP_MAX',
      value: '2.5',
      why: 'Encode range in cells. Displacement is clamped to it before packing into 8 bits; an unclamped value wraps the byte and the cell flips to the opposite sign, which reads as a hard pop exactly where the motion is strongest.',
    },
    {
      name: 'cellSize',
      value: '18',
      why: 'CSS pixels per cell. Cost is quadratic: at 6 a 1440x900 panel is 36,000 cells and the step stops fitting in a frame. Above ~30 the lattice is coarse enough that LINEAR interpolation between cells becomes visible as flat facets.',
    },
  ],

  pitfalls: [
    'Integrating per frame instead of on a fixed accumulator. The constants above are tuned per 1/60 s; run them per frame and the same component is noticeably stiffer at 60 fps than at 120, and unstable under a frame spike. This is the one place the tuned constants and the frame-rate independence rule collide, and the accumulator is the resolution.',
    'Carrying the accumulator forward after hitting `MAX_SUBSTEPS`. The debt can never be repaid, so the simulation runs four substeps every frame from then on and quietly costs four times what it should.',
    'Diffusing in place. Cells read their +x and +y neighbours after those neighbours have already been updated, so the wave propagates faster in one diagonal than the other and visibly drifts toward the lattice origin.',
    'Setting the field texture to NEAREST. The lattice itself becomes visible as hard blocky steps — at `cellSize` 18 that is a grid of 18 px squares sliding under the drawn grid.',
    'Calling `texImage2D` every frame instead of `texSubImage2D`. Re-specifying the texture makes the driver re-validate and frequently reallocate it; the symptom is a GPU memory graph that climbs for as long as the page is open.',
    'Failing to clamp before encoding. Displacement past `DISP_MAX` wraps the unsigned byte, so a cell being pushed hard right suddenly reads as pushed hard left, and the field pops.',
    'Sizing the lattice in device pixels. A retina display quietly runs four times the cells for identical visual output, and the component drops frames only on the machines its author is least likely to be testing on.',
    'Heavy pointer smoothing. The flow push is built from the derivative of the pointer position, and over-smoothing flattens that derivative — the lattice stops responding to flicks while still responding to slow drags, which reads as lag rather than as smoothing.',
    'Leaving the context alive on unmount. Raw GL has no `dispose()`; the VAO, buffer, texture and program are deleted explicitly and `loseContext(gl)` hands the context back, or the page starts blanking its oldest canvases after roughly sixteen mounts.',
  ],

  notes: [
    'The simulation could run on the GPU with ping-pong framebuffers, and at this lattice size it would be slower overall: two extra render targets, a readback whenever anything else needs the field state, and float-texture support to feature detect. A few thousand cells on the CPU cost under 0.2 ms and stay inspectable in a debugger.',
    'Resizing rebuilds the lattice from rest. Interpolating the old state into the new dimensions is possible but the disturbance is gone within a second of a resize anyway.',
  ],

  apiSignature:
    'function SpringLatticeField(props: { cellSize?: number; radius?: number; radialStrength?: number; flowStrength?: number; ink?: readonly [number, number, number]; line?: readonly [number, number, number]; glow?: readonly [number, number, number]; maxDpr?: number; className?: string }): JSX.Element',

  props: [
    { name: 'cellSize', type: 'number', default: '18', description: 'CSS pixels per lattice cell. Cost is quadratic in this.' },
    { name: 'radius', type: 'number', default: '5.5', description: 'Pointer influence radius, in lattice cells.' },
    { name: 'radialStrength', type: 'number', default: '0.02', description: 'Outward push per fixed step, in cells/step².' },
    { name: 'flowStrength', type: 'number', default: '0.08', description: 'How strongly pointer velocity drags cells along with it.' },
    { name: 'ink', type: 'readonly [number, number, number]', default: '[0.035, 0.038, 0.048]', description: 'Base field colour, linear 0..1 RGB.' },
    { name: 'line', type: 'readonly [number, number, number]', default: '[0.16, 0.17, 0.2]', description: 'Grid line colour, added on top of ink.' },
    { name: 'glow', type: 'readonly [number, number, number]', default: '[0.35, 0.62, 0.95]', description: 'Colour added in proportion to cell speed.' },
    { name: 'maxDpr', type: 'number', default: '2', description: 'Upper bound on device pixel ratio.' },
    { name: 'className', type: 'string', description: 'Merged onto the host element.' },
  ],

  reducedMotion:
    'No rAF subscription, so the lattice never steps and the pointer never disturbs it. One frame is drawn on mount and on resize showing the field at rest: the full grid, the vignette, no displacement and no glow. The component is a static grid, not a blank panel.',

  cleanup:
    'Deletes the VAO, vertex buffer, field texture and program, then `loseContext(gl)`. The typed arrays are dropped with the lattice ref. The rAF subscription, resize observer and pointer listener unsubscribe with their hooks.',

  acceptance:
    'Rest the cursor on the field and the grid parts around it by roughly one cell and holds there. Move it and a wave spreads outward through the lines and settles within about a second. Swipe fast and the lines are dragged along the swipe direction, glowing while they move and going dark once they stop. Grid lines stay one pixel wide even where they are most stretched. Throttle the CPU to 6x and the wave still travels at the same speed, just at fewer frames.',

  criticalRegion: 'critical',
};

export default meta;
