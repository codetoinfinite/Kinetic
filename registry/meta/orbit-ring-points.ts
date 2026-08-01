import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'orbit-ring-points',
  title: 'Single-Draw Orbit Rings',
  category: 'webgl',
  tags: ['three', 'points', 'attributes', 'orthographic', 'draw-call'],
  blurb: 'Concentric rings of dots, one bright marker travelling each ring, all of it in a single draw call.',
  cost: 'webgl',
  motif: 'rings',

  files: [
    {
      path: 'registry/ui/orbit-ring-points.tsx',
      target: 'components/motion/orbit-ring-points.tsx',
      type: 'registry:ui',
      role: 'component',
    },
    {
      path: 'registry/shaders/orbit-ring-points.ts',
      target: 'components/motion/shaders/orbit-ring-points.ts',
      type: 'registry:lib',
      role: 'vertex and fragment source',
    },
  ],
  dependencies: ['three@^0.185.1'],
  registryDependencies: ['webgl', 'prng', 'use-raf', 'use-resize-observer', 'use-reduced-motion'],

  summary:
    'Five concentric orbits of static path dots, each carrying one brighter dot that travels it. Every dot in the system is a vertex of one `THREE.Points` object, so ring count and dot count cost buffer memory but never a second draw call. The outer rings are dimmer than the inner ones, which reads as depth even though the camera is orthographic and nothing is actually further away.',

  mechanism: [
    'Each dot packs its whole identity into one attribute, `aPointData = vec4(kind, ringIndex, angle, dotRadius)`, where `kind` is 0 for a path dot and 1 for the orbiting marker. `position` is zeroed for every vertex and carries no information at all.',
    'The vertex shader derives the ring radius as `uBaseRadius * scale * uExtent * 0.5` with `scale = 1.0 - (uRingCount - 1.0 - ringIndex) * 0.1`, so rings step 10% apart with the outermost at full radius, and `uExtent = min(width, height)` keeps the structure inside a preview of any aspect.',
    'Path dots sit at `vec2(cos(angle), sin(angle)) * ringRadius`; markers use `angle - PI * 0.5 + uElapsed * uSpeed` instead, so the phase offset baked into the attribute becomes a starting position and the clock does the travelling.',
    'Depth is faked with a focal length that no camera uses: `alpha = 0.15 + 0.65 * FOCAL_LENGTH / (FOCAL_LENGTH + ringRadius)` dims a ring in proportion to its size, so wider rings recede.',
    '`gl_PointSize` is clamped to a 2px floor and the fragment alpha is then divided by the area that clamping invented — `vAlphaScale = unclamped² / clamped²` — so a dot forced twice as wide comes out four times fainter and the field looks identical at 1x and 3x device pixel ratio.',
    'The fragment shader turns each square point sprite into a disc with `1.0 - smoothstep(0.43, 0.5, length(gl_PointCoord - 0.5))` and discards anything fully transparent, so the renderer is created with `antialias: false`.',
  ],

  constants: [
    {
      name: 'RING_STEP',
      value: '0.1',
      why: '10% radius difference between adjacent rings. Below ~0.06 the rings visually merge into a band at preview size; above ~0.15 the innermost ring collapses to a dot when ringCount is 5.',
    },
    {
      name: 'FOCAL_LENGTH',
      value: '800.0',
      why: 'Not a camera property — the denominator of the alpha falloff. At 800 the outermost ring lands about 30% dimmer than the innermost at typical preview sizes: enough to read as depth, not enough to read as a fade-out. At 200 the outer rings vanish.',
    },
    {
      name: 'MIN_POINT_SIZE',
      value: '2.0',
      why: 'Hardware floor. Below roughly 1px most GPUs rasterise nothing at all, so a 1px dot at DPR 1 would simply be missing on some machines rather than faint.',
    },
    {
      name: 'UNCLAMPED_MIN_POINT_SIZE',
      value: '1.0',
      why: 'The size the dot *would* have had. It is the numerator of the area correction — without a separate constant there is nothing to compare the clamped size against and the compensation cannot be computed.',
    },
    {
      name: 'disc edge',
      value: 'smoothstep(0.43, 0.5, d)',
      why: 'A soft band 7% of the point radius wide. Narrower and a 2px dot aliases into a square; wider and every dot looks blurred rather than small.',
    },
    {
      name: 'baseRadius',
      value: '0.75',
      why: 'Outermost ring diameter as a fraction of the container short side. At 1.0 the ring touches the edge and the marker clips as it passes; 0.75 leaves a margin the marker can travel through.',
    },
    {
      name: 'dotsPerRing',
      value: '170',
      why: 'Dense enough that the path reads as a continuous line at 320px wide, sparse enough that the innermost ring is not a solid filled circle.',
    },
    {
      name: 'speed',
      value: '0.3',
      why: 'Radians per second — one lap every ~21s. Linear, no easing: a constant angular rate is what makes it read as a mechanism rather than an animation.',
    },
  ],

  pitfalls: [
    'Leaving `frustumCulled` at its default. Every vertex sits at the origin, so three computes a bounding sphere of radius zero; the displacement is invisible to the culler and the entire object disappears the moment the camera is not pointed exactly at (0,0,0).',
    'Not sorting the angles within a ring before writing them into the buffer. Points are blended in buffer order with depth testing off, so an unsorted ring stipples — the path visibly breaks into a dotted texture instead of reading as one line.',
    'Clamping `gl_PointSize` without correcting the alpha. The clamp is invisible at DPR 3 and doubles the covered area at DPR 1, so the same component looks twice as bright on a cheap monitor as on a retina laptop.',
    'Turning on `antialias: true` to smooth the dots. The fragment shader already anti-aliases each disc; MSAA then allocates a multisample buffer the size of the canvas to solve nothing.',
    'Rebuilding the renderer on every resize. The buffer is size-independent — only the camera frustum and `uExtent` change — so a container reflow should cost a `setSize` call, not a teardown that drops and re-acquires a GL context.',
    'Calling `renderer.dispose()` and stopping there. It frees GPU objects but leaves the context alive; `disposeRenderer` also calls `forceContextLoss`, without which a grid of previews silently blacks out the oldest one at around sixteen contexts.',
  ],

  notes: [
    'The camera is orthographic and spans the canvas 1:1 in CSS pixels, so `gl_PointSize` is a real pixel count and ring radii are real pixel radii. That is what makes the pixel-ratio compensation expressible at all.',
    'Ring count and dots per ring are both free at draw time. A hundred rings is one draw call and one buffer upload.',
  ],

  apiSignature:
    'function OrbitRingPoints(props: { ringCount?: number; dotsPerRing?: number; speed?: number; baseRadius?: number; dotRadius?: number; markerRadius?: number; opacity?: number; color?: string; markerColor?: string; seed?: number | string; className?: string }): JSX.Element',

  props: [
    { name: 'ringCount', type: 'number', default: '5', description: 'Concentric rings. Each gets exactly one travelling marker.' },
    { name: 'dotsPerRing', type: 'number', default: '170', description: 'Static path dots per ring.' },
    { name: 'speed', type: 'number', default: '0.3', description: 'Marker angular speed in radians per second.' },
    { name: 'baseRadius', type: 'number', default: '0.75', description: 'Outermost ring diameter as a fraction of the container short side.' },
    { name: 'dotRadius', type: 'number', default: '1', description: 'Path dot radius in CSS pixels, before pixel-ratio scaling.' },
    { name: 'markerRadius', type: 'number', default: '3', description: 'Marker radius in CSS pixels.' },
    { name: 'opacity', type: 'number', default: '1', description: 'Multiplier applied to every dot in the vertex shader.' },
    { name: 'color', type: 'string', default: "'#8a8f98'", description: 'Path dot colour, any value `THREE.Color` accepts.' },
    { name: 'markerColor', type: 'string', default: "'#ffffff'", description: 'Travelling marker colour.' },
    { name: 'seed', type: 'number | string', default: "'orbit-ring-points'", description: 'Seeds the angular scatter, so the ring is identical on server and client.' },
    { name: 'className', type: 'string', description: 'Merged onto the host element via `cn`.' },
  ],

  reducedMotion:
    'The rAF subscription is never opened. One frame is drawn at `uElapsed = 0`, which parks every marker at twelve o\'clock on its ring, so the full structure is visible and only the orbiting stops. Resizing still redraws that frame.',

  cleanup:
    'Clears the stage ref first so no queued frame can touch a dead renderer, then `disposeObject(scene)` for the geometry, `material.dispose()`, `disposeRenderer(renderer)` for `dispose` + `forceContextLoss` + zeroing the drawing buffer, and finally removes the canvas from the DOM. The rAF subscription is released by `useRaf` on unmount.',

  acceptance:
    'Five rings of dots with one brighter dot travelling each, all at the same angular rate, the outer rings visibly dimmer than the inner ones. Resize the container and the rings rescale without flicker or a dropped context. Zoom the browser to 200% and the dots stay the same apparent brightness rather than getting denser. With reduced motion on, the rings render fully and the markers sit still at the top.',

  criticalRegion: 'critical',
};

export default meta;
