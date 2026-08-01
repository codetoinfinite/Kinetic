import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'cursor-repulsion-burst',
  title: 'Cursor Repulsion Burst',
  category: 'cursor',
  tags: ['ogl', 'webgl', 'instancing', 'pointer', 'particles', 'orbit', 'damping'],
  blurb:
    'An orbiting particle field the pointer pushes out of the way, and a press detonates into a shock wave with a heat band.',
  cost: 'webgl',
  motif: 'orbit',

  files: [
    {
      path: 'registry/ui/cursor-repulsion-burst.tsx',
      type: 'registry:ui',
      role: 'component',
    },
    {
      path: 'registry/shaders/cursor-repulsion-burst.ts',
      type: 'registry:lib',
      role: 'instanced orbit + repulsion + shock-wave vertex and fragment shaders',
    },
  ],
  dependencies: ['ogl@^1.0.11'],
  registryDependencies: ['prng'],

  summary:
    'Up to 1400 particles in one instanced draw call, each circling its own home on its own phase. The pointer opens a hole in the field with a linear falloff inside its radius, and a press fires a shock wave whose front tints the particles it is passing through. The pointer is damped on the CPU before it reaches a uniform, and bursts run in a pool of three slots so overlapping presses produce overlapping waves rather than one wave restarting.',

  mechanism: [
    'Three displacements are stacked in field space in the vertex shader before anything becomes a position: an idle orbit, cursor repulsion, then up to three shock waves. Each stage reads the position the previous one produced, so a particle already pushed aside by the cursor is the particle the wave throws.',
    'All distances are measured in aspect-corrected space — x multiplied by `uResolution.x / uResolution.y` — and the resulting displacement is divided back out before it is added to the position. Without the correction the repulsion hole is an ellipse on any container that is not square, and the shock ring reaches the side edges before the top.',
    'Repulsion is `max(radius - distance, 0) * repel`: linear inside the radius and exactly zero outside it, so the field beyond the pointer is untouched and the whole idea costs one `length()` per particle. A `smoothstep` would be softer but would also mean every particle on screen is permanently displaced a little, which reads as the field sagging toward the cursor.',
    'The direction is `v / max(length(v), floor)` rather than `normalize(v)`. A true normalize is undefined at the origin and unstable just outside it, so the particle sitting under the cursor picks a new direction every frame from floating-point noise and buzzes. Dividing by a floor makes the vector shorter than unit length near the centre, so the push fades in and the direction stays put.',
    'A burst slot is `vec4(originX, originY, progress, active)`. The displacement is `(0.25 + seed * 0.75) * push * easeOutCubic(t) * settle(t) * reach(d)`, where `settle` walks the whole thing back to zero by t = 1 so the slot can be freed without the field snapping home, and `reach` limits the throw to the neighbourhood of the origin so the burst is not a camera jolt.',
    'The heat band is `exp(-b * b)` where `b = (distance - burstRadius * ease) / band`. The shock radius expands on the same cubic ease as the displacement, so only the particles the front is passing through right now take the tint. A flat tint over the whole burst just recolours the field; a Gaussian band travelling through it reads as heat.',
    'Only `active` and `progress` change per frame per slot, so a burst costs three vec4 uniforms and a three-iteration loop — no per-particle CPU state and no buffer upload.',
  ],

  constants: [
    {
      name: 'smoothing',
      value: '0.0008',
      why: 'Fraction of the pointer gap still remaining after one second: a tight ~90ms tail, because a repulsion hole that lags is read as broken rather than as smooth — the hole has a visible edge, unlike a glow. Raise it past ~0.01 and the field is still opening where the cursor was half a second ago.',
    },
    {
      name: 'cursorRadius',
      value: '0.22',
      why: 'Field units, where 1 is the container HEIGHT. Roughly a fifth of the panel, so the hole is obviously deliberate but the field still dominates. Past ~0.45 the pointer clears most of the visible particles and there is nothing left to displace.',
    },
    {
      name: 'repel',
      value: '0.85',
      why: 'Displacement at the centre of the field, as a fraction of the radius. Below ~0.4 the hole never actually opens — particles crowd instead of clearing. Above 1.0 the inner particles are pushed past the rim and pile into a bright ring, which is the same artefact as a hard-edged mask.',
    },
    {
      name: 'BURST_SLOTS',
      value: '3',
      why: 'Concurrent waves. One slot means a second press restarts the wave from zero, which visibly sucks the first one back into its origin. Three covers a fast double or triple click, and each slot is a vec4 and a loop iteration, so the ceiling is set by taste rather than by cost.',
    },
    {
      name: 'burstDuration',
      value: '1.1',
      why: 'Seconds of life. Under ~0.6 the wave is gone before the eye finds it; over ~2 the field spends most of its time recovering and a second press lands in a field that is still deformed.',
    },
    {
      name: 'burstRadius / BURST_BAND',
      value: '0.55 / 0.085',
      why: 'How far the front travels, and how thick it is. The band is roughly 15% of the travel, which is a front rather than a wash — take it past ~0.25 and the Gaussian covers the whole burst at once, which is indistinguishable from tinting every particle.',
    },
    {
      name: 'burstPush',
      value: '0.17',
      why: 'Peak displacement in field units, multiplied by a per-particle 0.25-1.0. The spread is what gives the wave a ragged front; a uniform magnitude produces a clean expanding circle, which reads as a UI ripple rather than as a detonation.',
    },
    {
      name: 'MAX_DPR',
      value: '1.5',
      why: 'Additive fill is the entire cost here and it scales with the square of the ratio. These are soft round dots with no fine detail, so a third sample per axis resolves nothing a viewer can see and costs 78% more fragments.',
    },
  ],

  pitfalls: [
    'Writing pointer events straight into `uCursor`. The hole lands exactly where the last event was: a high-rate trackpad delivers a staircase, and after a stalled frame it is a jump that shoves the whole field sideways in one step. The listener records a target and the loop damps toward it.',
    'Damping with a per-frame constant (`x += (t - x) * 0.1`) instead of `damp(..., dt)`. The same code produces a noticeably tighter follow at 120Hz than at 60Hz, so the effect is tuned for whatever machine it was written on.',
    'Using `normalize()` for the repulsion direction. It is undefined at the origin, so the particle under the cursor jitters between random directions every frame — a visible buzzing speck exactly where the eye is.',
    'Aspect-correcting the distances but not dividing the displacement back out. Particles are then pushed further horizontally than vertically, and the hole slowly shears the field sideways as the pointer moves.',
    'Restarting one burst slot on every press. The in-flight wave is yanked back to its origin before the new one starts, which looks like a rendering fault rather than a second click. Three round-robin slots let waves overlap.',
    'Advancing burst progress per frame instead of by `dt / duration`. The wave is then twice as fast on a 120Hz display and half speed on a throttled tab.',
    'Deactivating a slot while its displacement is still non-zero. Every particle in it snaps home on one frame. The magnitude is multiplied by a settle term that reaches zero exactly when the slot expires.',
    'Handing ogl a Float32Array for `uniform vec4 uBursts[3]`. ogl resolves the active uniform name `uBursts[0]`, checks `Array.isArray(value)` to decide it is an array uniform, and a Float32Array fails that test — the uniform is silently skipped with a console warning and every burst is invisible. It must be a plain array.',
    'Leaving ogl\'s default BACK-face culling on. The quad winding is not guaranteed to face the way the driver expects, and a culled particle is not dim, it is absent — so the field renders empty on some machines and fine on others.',
    'Owning the canvas in React while calling `loseContext()` on cleanup. Under `reactStrictMode` the effect runs twice and the second `getContext` on that element hands back the dead context: blank in development, fine in production.',
    'Rebuilding the renderer when a colour changes. Chromium drops the oldest WebGL context past roughly sixteen per process, so recolouring one field can blank a different canvas on the same page. Colours are written into live uniforms.',
  ],

  notes: [
    '`pointerdown` sets the pointer target as well as firing the wave. On touch there is no hover, so without it the burst would originate from wherever the pointer last happened to be — usually the previous tap.',
    'Blending is additive with an opaque clear colour, so a thousand overlapping instances need no depth sort and the whole field is one draw call. The fragment output is premultiplied because the destination is only ever added to.',
    'The population is derived from container area rather than fixed, and selected with `setInstancedCount` out of buffers allocated once at `maxCount`. Resizing changes the count without touching a byte of GPU memory.',
    'The scatter runs on `createRng(seed)`, never `Math.random()`, so the field is identical on every load and a visual regression is a real regression.',
    'Particles inside the repulsion radius also brighten, which stops the hole reading as a bald patch — the field gets denser and hotter at the rim instead.',
  ],

  apiSignature:
    'function CursorRepulsionBurst(props: { density?: number; maxCount?: number; sizeRange?: readonly [number, number]; cursorRadius?: number; repel?: number; burstPush?: number; burstRadius?: number; burstDuration?: number; smoothing?: number; breathe?: number; opacity?: number; colorA?: string; colorB?: string; heatColor?: string; background?: string; seed?: number | string; className?: string }): JSX.Element',

  props: [
    { name: 'density', type: 'number', default: '1100', description: 'Particles per megapixel of container area.' },
    { name: 'maxCount', type: 'number', default: '1400', description: 'Population ceiling, and the size the buffers are allocated at.' },
    { name: 'sizeRange', type: 'readonly [number, number]', default: '[1.6, 5.2]', description: 'Particle size in CSS pixels, biased toward the small end.' },
    { name: 'cursorRadius', type: 'number', default: '0.22', description: 'Repulsion radius in field units, where 1 is the container height.' },
    { name: 'repel', type: 'number', default: '0.85', description: 'Displacement at the centre of the repulsion field, as a fraction of its radius.' },
    { name: 'burstPush', type: 'number', default: '0.17', description: 'Peak burst displacement in field units, before the per-particle spread.' },
    { name: 'burstRadius', type: 'number', default: '0.55', description: 'How far a shock front travels before it dies.' },
    { name: 'burstDuration', type: 'number', default: '1.1', description: 'Life of one burst in seconds.' },
    { name: 'smoothing', type: 'number', default: '0.0008', description: 'Fraction of the pointer gap still remaining after one second.' },
    { name: 'breathe', type: 'number', default: '0.22', description: 'Depth of the orbit-radius breathing, 0 to 0.5.' },
    { name: 'opacity', type: 'number', default: '0.9', description: 'Overall alpha multiplier.' },
    { name: 'colorA', type: 'string', default: "'#8fb6ff'", description: 'First tint. Any value ogl\'s Color accepts.' },
    { name: 'colorB', type: 'string', default: "'#e6ecf7'", description: 'Second tint; each particle mixes between the two.' },
    { name: 'heatColor', type: 'string', default: "'#ff8a3c'", description: 'Colour of the shock front.' },
    { name: 'background', type: 'string', default: "'#06070b'", description: 'Opaque clear colour the additive field is composited onto.' },
    { name: 'seed', type: 'number | string', default: "'cursor-repulsion-burst'", description: 'Seeds the scatter, sizes, phases and burst magnitudes.' },
    { name: 'className', type: 'string', description: 'Merged onto the root container via `cn`.' },
  ],

  reducedMotion:
    'The render loop never starts. One frame is drawn with the pointer parked at (0.34, 0.56) at full presence and a single wave frozen 42% of the way out, so the panel is a composed still of the effect rather than a static dot field. The listeners stay attached but their target is never consumed, so moving or pressing changes nothing on screen.',

  cleanup:
    'Removes the four pointer listeners from the canvas, nulls the stage ref so an in-flight frame cannot touch a dead renderer, then `geometry.remove()` (deletes the VAOs and every buffer), `program.remove()` (deletes the shaders and the program), `loseContext(gl)`, zeroes the canvas dimensions and removes it from the DOM. ogl has no `dispose()`, and dropping the context is the part that matters — the per-process budget is about sixteen, and exceeding it kills the oldest context, which belongs to somebody else.',

  acceptance:
    'The field drifts on its own with no pointer on the page. Move the pointer in and a clear hole opens around it, tracking with a short even lag that is the same on a 60Hz and a 120Hz display, with the rim slightly brighter than the rest of the field. The particle directly under the cursor does not jitter. Press and a wave throws the nearby particles outward with a ragged front, a warm band travelling through them, and they drift back without snapping. Press three times quickly and you get three overlapping waves, not one wave restarting. Leave the panel and the hole closes where it stands. Resize to a wide container and the hole is still round. With reduced motion the panel is a single composed still.',

  criticalRegion: 'critical',
};

export default meta;
