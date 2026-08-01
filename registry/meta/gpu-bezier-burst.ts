import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'gpu-bezier-burst',
  title: 'GPU Cubic-Bezier Burst',
  category: 'webgl',
  tags: ['three', 'points', 'easing', 'newton', 'reduced-motion'],
  blurb:
    'Rings of dots that burst on click, every particle solving its own cubic-bezier easing in the vertex shader.',
  cost: 'webgl',
  motif: 'rings',

  files: [
    { path: 'registry/ui/gpu-bezier-burst.tsx', type: 'registry:ui', role: 'component' },
    {
      path: 'registry/shaders/gpu-bezier-burst.ts',
      type: 'registry:lib',
      role: 'vertex and fragment source',
    },
  ],
  dependencies: ['three@^0.185.1'],
  registryDependencies: ['webgl', 'prng', 'use-raf', 'use-resize-observer', 'use-reduced-motion'],

  summary:
    'Concentric rings of dots turning slowly. Fire a sector — by clicking it, or by waiting for the automatic cycle — and its particles burst outward and fade, each one following its own cubic-bezier curve. The curve is the same four numbers CSS takes, but solved per vertex per frame by Newton\'s method, which is what lets two hundred particles carry two hundred different easings while the CPU only advances a clock.',

  mechanism: [
    'A cubic bezier is parametric: for a parameter `t` it gives a point `(x(t), y(t))`. Easing needs `y` at a given *x*, and a cubic has no closed-form inverse, so the shader runs Newton\'s method — 8 iterations of `t -= (x(t) - target) / x\'(t)`, seeded with `t = x` because the curve is monotonic in x — then evaluates `y(t)`.',
    'The four control numbers ride in an `aBezier` attribute rather than a uniform. That is the whole reason to solve on the GPU: a uniform would give every particle in the burst one shared easing, and per-particle easing computed on the CPU would mean a buffer upload every frame.',
    'Firing writes the current burst-clock time into a contiguous slice of the `aStart` attribute — one sector, one range, one `needsUpdate`. Each particle then computes `age = uBurstTime - aStart - delay` and animates only while `0 <= age <= uBurstDuration`; a start time of 0 means never fired, which is why the clock starts at 1.',
    'Resting dots and burst particles live in the same buffer and the same draw call, distinguished by an `isBurst` flag. Burst particles sit invisible on the outer ring until fired, rather than the resting dots being displaced — displacing them would tear a hole in the ring and then pop it shut when the burst ended.',
    'There are two clocks. `uRotation` accumulates from delta time only when motion is allowed; `uBurstTime` always accumulates. Under reduced motion the ring freezes at 0.35 rad and the automatic cycle stops, but a click still fires a full burst, and the frame loop is subscribed only for as long as one is in flight.',
    'Flight direction is `angle + uRotation`, evaluated live rather than baked, so a burst stays radial to the ring while the ring keeps turning underneath it. Alpha fades linearly against the eased flight, and point size shrinks to 45%, so the particle dissipates instead of blinking out at full size.',
  ],

  constants: [
    {
      name: 'NEWTON_ITERATIONS',
      value: '8',
      why: 'Newton converges quadratically here, so 4 iterations already land inside a pixel. 8 is cheap insurance for control points near 0 or 1, where the derivative shrinks and convergence slows.',
    },
    {
      name: 'MIN_DERIVATIVE',
      value: '0.000001',
      why: 'Newton divides by the derivative. A curve with a flat segment divides by ~0, `t` becomes NaN, and the NaN propagates into `gl_Position` — the vertex silently disappears rather than erroring.',
    },
    {
      name: 'base curve',
      value: '(0, 0.9, 0.5, 1)',
      why: 'A hard ease-out: almost all the distance is covered in the first third. Each particle jitters around it, with x-coordinates clamped to 0..1 because the solver needs monotonicity in x — the same constraint CSS puts on `cubic-bezier()`.',
    },
    {
      name: 'MAX_LAUNCH_DELAY',
      value: '0.09s',
      why: 'Particles all leaving on one frame read as a single expanding ring. Staggering launches over ~90ms reads as a spray, and staying well under `burstDuration` keeps the last launch ahead of the first landing.',
    },
    {
      name: 'burstDuration',
      value: '0.45s',
      why: 'Longer than the 0.25s a click ping wants, because at preview-card size the eye needs the extra frames to actually see the easing differ between particles. Shorten it toward 0.25 when the burst is real button feedback.',
    },
    {
      name: 'BURST_END_SIZE',
      value: '0.45',
      why: 'Particles shrink to 45% over the flight. Constant-size particles read as confetti; shrinking ones read as one thing dissipating.',
    },
    {
      name: 'STATIC_ROTATION',
      value: '0.35 rad',
      why: 'Angle the ring is frozen at under reduced motion. Off-axis, so the field does not look like it snapped to a grid the moment motion was disabled.',
    },
    {
      name: 'RING_DOT_SCALE / BURST_DOT_SCALE',
      value: '0.7 / 1.15',
      why: 'Burst particles are visibly larger than the resting field, so the burst reads as the event rather than as the ring shedding pixels.',
    },
    {
      name: 'flight fan',
      value: '+/- 0.175 rad',
      why: 'Jitter added to each particle\'s radial direction. Pure radial launches leave on rails and the burst looks like a line drawing; more than ~0.3 rad and the sectors start to overlap.',
    },
  ],

  pitfalls: [
    'Freezing the burst along with the ambient rotation under reduced motion. The component then stops answering clicks, which is a broken interface, not an accessible one — feedback for a user action is not decoration, hence the two separate clocks.',
    'Leaving the frame loop running under reduced motion to keep the burst alive. It burns a GPU-backed rAF forever for a static image; subscribe only while a burst is in flight and stand down when it lands.',
    'Passing the control points as a uniform. It compiles, it animates, and every particle in the burst moves identically — the effect collapses into one expanding ring and the GPU solve buys nothing.',
    'Omitting the derivative guard in the Newton loop. Certain control points produce a near-zero derivative, `t` goes NaN, and the affected vertices vanish with no error anywhere — the symptom is a burst that is missing particles at some curves and not others.',
    'Displacing the resting ring dots instead of using dedicated burst particles. The ring develops a gap for the duration of the burst and snaps shut at the end.',
    'Baking the flight direction at fire time. The ring keeps rotating during the 0.45s flight, so the particles visibly drift off-radial and appear to curve away from their launch point.',
    'Sizing burst radius in model units. It then scales with the container, and the burst that felt right on a large canvas barely leaves the ring on a small preview card — pixels are the right unit for an effect this small.',
  ],

  notes: [
    'One draw call and one buffer for the resting field and every burst particle. The only runtime upload is the start-time attribute, written once per firing rather than once per frame.',
    'Clicking maps the pointer angle back through the current rotation, so the sector under the cursor is the one that fires.',
    'The automatic cycle exists so the component reads as alive in a preview grid; drop `chordInterval` handling if the burst is wired to real user actions.',
  ],

  apiSignature:
    'function GpuBezierBurst(props: { ringCount?: number; ringDots?: number; innerRadius?: number; groups?: number; burstDots?: number; spinSpeed?: number; chordInterval?: number; burstDuration?: number; burstRadius?: number; dotScale?: number; viewScale?: number; opacity?: number; color?: string; burstColor?: string; seed?: number | string; className?: string }): JSX.Element',

  props: [
    { name: 'ringCount', type: 'number', default: '4', description: 'Concentric rings in the resting field.' },
    { name: 'ringDots', type: 'number', default: '190', description: 'Dots on the outermost ring; inner rings scale down to keep density even.' },
    { name: 'innerRadius', type: 'number', default: '0.55', description: 'Radius of the innermost ring as a fraction of the outermost.' },
    { name: 'groups', type: 'number', default: '6', description: 'Sectors that can be fired independently.' },
    { name: 'burstDots', type: 'number', default: '34', description: 'Burst particles per sector.' },
    { name: 'spinSpeed', type: 'number', default: '0.18', description: 'Ambient ring rotation in radians per second.' },
    { name: 'chordInterval', type: 'number', default: '1.5', description: 'Seconds between automatic firings.' },
    { name: 'burstDuration', type: 'number', default: '0.45', description: "Seconds a single particle's flight lasts." },
    { name: 'burstRadius', type: 'number', default: '26', description: 'How far a particle travels, in CSS pixels.' },
    { name: 'dotScale', type: 'number', default: '1', description: 'Dot radius multiplier in CSS pixels.' },
    { name: 'viewScale', type: 'number', default: '0.4', description: 'Model-to-pixel scale as a fraction of the container short side.' },
    { name: 'opacity', type: 'number', default: '1', description: 'Multiplier applied to every dot.' },
    { name: 'color', type: 'string', default: "'#6f757e'", description: 'Resting dot colour.' },
    { name: 'burstColor', type: 'string', default: "'#ffffff'", description: 'Colour mixed in at the hot start of a flight.' },
    { name: 'seed', type: 'number | string', default: "'gpu-bezier-burst'", description: 'Seeds every curve, delay and fan angle for a stable, hydration-safe field.' },
    { name: 'className', type: 'string', description: 'Merged onto the host element via `cn`.' },
  ],

  reducedMotion:
    'The ambient rotation freezes at 0.35 rad and the automatic firing cycle stops, so nothing moves unprompted. A pointer press still fires a full burst, because that is feedback for something the user did rather than decoration. The frame loop is subscribed only while a burst is actually in flight and unsubscribes as soon as the last particle lands, so the idle cost is zero.',

  cleanup:
    'Removes the pointerdown listener, nulls the stage ref so a queued frame cannot touch a dead renderer, disposes the geometry via `disposeObject(scene)`, disposes the material, calls `disposeRenderer` for `dispose` + `forceContextLoss` + a zeroed backing store, and removes the canvas. `useRaf` unsubscribes on unmount, so a StrictMode double-invoke leaves no orphaned context.',

  acceptance:
    'Concentric rings of dots turn slowly. Roughly every 1.5 seconds one sector throws a spray of brighter particles outward that fade as they travel, and the particles visibly do not move in lockstep — some shoot ahead and settle, others trail. Clicking a sector fires it immediately. The ring never develops a gap where a burst came from. With reduced motion the ring is still and nothing fires on its own, but a click still produces a full burst.',

  criticalRegion: 'critical',
};

export default meta;
