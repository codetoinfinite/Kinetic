import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'surface-sampled-particles',
  title: 'Area-Weighted Surface Particles',
  category: 'webgl',
  tags: ['three', 'points', 'sampling', 'area-weighting', 'assembly', 'vertex-shader'],
  blurb:
    'Any mesh becomes a particle shell of even density, assembling bottom-up, with orbit rings measured off the sampled silhouette.',
  cost: 'webgl',
  motif: 'orbit',

  files: [
    {
      path: 'registry/ui/surface-sampled-particles.tsx',
      type: 'registry:ui',
      role: 'component',
    },
    {
      path: 'registry/shaders/surface-sampled-particles.ts',
      type: 'registry:lib',
      role: 'vertex and fragment source',
    },
  ],
  dependencies: ['three@^0.185.1'],

  summary:
    'Turns any object — one primitive or a whole loaded model — into a particle shell whose density is uniform over the surface rather than over the mesh list. One cumulative distribution is built over the world-space area of every triangle in the object and sampled by binary search, so a face a thousand times larger than its neighbour is picked a thousand times more often. The shell then assembles bottom-up on a per-particle window, breathes along its own sampled normals, and is ringed by orbit lines whose radii are measured from the cloud instead of hard-coded.',

  mechanism: [
    'Every mesh under the source object is traversed and each triangle is read in WORLD space via `matrixWorld`. `n = (b - a) × (c - a)` gives area as `|n| / 2` and the face normal as `n / |n|` in one operation; the running area total is written into a `Float64Array` cumulative table, one entry per triangle.',
    'To place a particle, `rng() * totalArea` is looked up in that table by binary search. This is inverse-transform sampling over area, which is where per-mesh weighting comes from for free — the alternative, `count / meshCount` points per mesh, gives a dense speckle on the small parts and a sparse haze on the large ones, and no tuning fixes it because the error is structural.',
    'The point inside the chosen triangle uses barycentric coordinates by reflection: draw `u, v` in the unit square and if `u + v > 1` replace them with `1 - u, 1 - v`, folding the far half back across the diagonal. `p = a + (b - a) * u + (c - a) * v` is then exactly uniform over the triangle.',
    'The cloud is centred on its bounding-box centre and divided by its farthest sample, so the shell always has bounding-sphere radius 1. Camera distance follows from the frustum rather than from taste: `d = 1 / sin(min(vFovHalf, atan(tan(vFovHalf) * aspect))) * 1.14` fits the sphere in whichever axis is tighter.',
    'Assembly order is the particle\'s own normalised target height, so `form = smoothstep(order * 0.45, order * 0.45 + 0.55, uForm)` builds the shell bottom-up — the object is constructed rather than faded in. `uForm` is damped toward 1 with `damp(form, 1, 0.05, dt)`, so the build takes about the same two seconds at 60 and at 120 Hz.',
    '`eff = uScatter * (1 - form)` collapses the pre-assembly cloud into the arrival: each particle is pushed out along `normalize(aRand.xyz - 0.5 + 0.0001)` by `(0.6 + aRand.x * 2.2)` radii plus a slow per-axis sinusoid, and both fade to nothing exactly as that particle\'s own window closes.',
    'Point size is perspective-corrected in the vertex shader: `uSize * jitter * uSizeScale / max(0.1, -mv.z)`, where `uSizeScale` is `pixelRatio * cameraDistance`. That makes `uSize` a literal CSS-pixel diameter for a particle at the centre of the shell, rather than the tuned constant this term usually is.',
    'Orbit rings are measured, not authored: the cloud is cut into `ringCount` horizontal bands, the radii `sqrt(x² + z²)` within each band are sorted, and the 92nd percentile times 1.06 is the ring radius. Bands with fewer than 12 samples are skipped. All rings go into one buffer as `LineSegments`, so the set is one draw call.',
  ],

  constants: [
    {
      name: 'count',
      value: '9000',
      why: 'Particles, one buffer, one draw call. Enough that the silhouette of a torus knot reads as a solid surface at preview size; the cost is fill rather than vertex count, and doubling it doubles the blended pixel area rather than the detail.',
    },
    {
      name: 'size / maxSize',
      value: '2.4 / 22 CSS px',
      why: 'Diameter at the centre of the shell, and the ceiling after 1/z growth. The clamp is not cosmetic: a particle that drifts close to the near plane would otherwise ask for a point size in the thousands, which drivers answer by silently capping — or by dropping the draw call.',
    },
    {
      name: 'size jitter',
      value: '0.55 + aRand.w * 1.35',
      why: 'A 3.4x spread. With every particle the same size the cloud reads as a halftone screen; much wider and the largest sprites stop looking like members of the same population.',
    },
    {
      name: 'STAGGER / WINDOW',
      value: '0.45 / 0.55',
      why: 'They sum to exactly 1.0, so the last particle to start is also the one that finishes as `uForm` reaches 1 — no dead time at either end of the build. Raising STAGGER past ~0.6 leaves the base fully assembled while the top has not begun, which reads as two separate animations.',
    },
    {
      name: 'FORM_SMOOTHING',
      value: '0.05',
      why: 'Fraction of the assembly gap remaining after one second, which with the stagger gives a build of roughly two seconds. This is a `damp` smoothing value, not a per-frame lerp — the per-frame form of the same curve converges twice as fast at 120 Hz.',
    },
    {
      name: 'FORM_EPSILON',
      value: '0.9995',
      why: '`damp` is asymptotic and never arrives, but the last stagger window needs `uForm` to reach exactly 1.0 or the topmost particles stay a hair short of their target forever. Past this threshold it snaps.',
    },
    {
      name: 'puff',
      value: '0.02 of the shell radius',
      why: 'Breathing amplitude along the sampled normal. At 2% the surface undulates while staying a surface; past roughly 6% the shell loses its silhouette and reads as a cloud that happens to be shaped like the object.',
    },
    {
      name: 'scatter',
      value: '0.9',
      why: 'Pre-assembly spread in shell radii, giving a cloud extending to about 2.6 radii. Small enough that the unformed state is still recognisably centred on the object; much larger and the particles start their travel off-screen, so the build begins with an empty frame.',
    },
    {
      name: 'RING_PERCENTILE',
      value: '0.92',
      why: 'Which measured radius in a band becomes the ring. The maximum is dragged outward by a single stray sample on a spike; the mean sinks inside the silhouette and the ring cuts through the shell.',
    },
    {
      name: 'MIN_BAND_SAMPLES / MIN_RING_RADIUS',
      value: '12 / 0.08',
      why: 'A band with almost nothing in it is a gap in the model, and a ring there would hang in empty air; a measured radius near zero is a dot rather than a ring. Both are skipped, which is why the ring count is a maximum and not a promise.',
    },
    {
      name: 'FIT_PADDING',
      value: '1.14',
      why: 'Slack between the unit sphere and the frustum. It has to cover the breathing, the ring margin and the fact that a sprite is drawn centred on its vertex, so a particle exactly on the silhouette still needs half its own width of room.',
    },
    {
      name: 'TILT',
      value: '0.2 rad',
      why: 'Static tilt applied on a parent group. Without it the measured rings project to straight lines and read as scan lines rather than orbits; much past 0.4 the top band occludes the shell.',
    },
    {
      name: 'RING_SEGMENTS',
      value: '128',
      why: 'Vertices per ring. Roughly where a hairline circle stops showing flats at 600px wide, and cheap enough that four rings are still 1024 line vertices in a single buffer.',
    },
  ],

  pitfalls: [
    'Sampling a fixed number of points per mesh. It is the obvious loop and it is wrong: density then tracks the mesh list rather than the surface, so a model whose parts differ in size gets a dense speckle on the small ones and a haze on the large ones. One cumulative table over all triangles of all meshes is the fix, and it is no more code.',
    'Building the area table in local space. A mesh scaled 10x has 100x the surface area; weighting by untransformed triangles gives that part a hundredth of the density it should have, and the bug only shows on models that use node transforms.',
    'Accumulating the running area total in a `Float32Array`. At tens of thousands of triangles the smallest ones land inside the rounding error of the sum, their cumulative entries stop increasing, and they become unreachable by any sample — whole thin features silently receive no particles.',
    'Keeping degenerate triangles. Exported and generated geometry is full of zero-area faces; they contribute zero-width steps to the distribution and, worse, normalising a zero-length cross product yields NaN. One NaN vertex position takes visible neighbours with it on some drivers.',
    'Using `u` and `v` raw as barycentric weights. Points then pile into one corner of every triangle, and at high triangle counts the cloud acquires a visible directional grain along the tessellation. Reflecting the far half of the unit square across the diagonal costs one comparison and is exactly uniform.',
    'Leaving `frustumCulled` on. Every displacement happens in the vertex shader, so the bounding sphere three computes from the rest positions is right for the assembled shell and far too small for the scattered one — the whole cloud blinks out during the part of the animation where it is largest.',
    'Making `gl_PointSize` constant. Point size does not fall off with distance on its own, so a 3D cloud with a fixed size has no depth at all — it looks like a flat stencil of the object. Dividing by view-space depth is the entire perspective cue, and `max(0.1, -mv.z)` is a required guard, not a nicety: a particle crossing the near plane otherwise asks for an infinite size and some drivers drop the draw.',
    'Caching the perspective size term at construction. Camera distance is derived from the container aspect ratio, so it changes on every reflow; a stale `uSizeScale` leaves particles at the pixel size of the previous layout.',
    'Depth-testing a translucent point cloud. With `depthWrite` on, nine thousand sprites occlude each other in buffer order and the cloud tears into hard layers; sorting them per frame on the CPU is unaffordable. Because the samples are already in random order, no depth and an unsorted blend average out into even density.',
    'Hard-coding ring radii for the model you happen to be sampling. They stop matching the moment the source changes, and nothing in the code says why the numbers were what they were. Measuring a percentile of the cloud\'s own radius per band is the same three lines and survives a new source.',
    'Adding the source object to the scene so it can be sampled. It never needs to be rendered — it is a CPU-side measuring stick. Leaving it in the graph uploads every one of its triangles to the GPU and draws a solid mesh through the middle of the particles.',
    'Making the `source` callback an effect dependency. An inline arrow changes identity on every parent render, so the entire surface is re-sampled — tens of thousands of triangles and a full buffer upload — on any unrelated state change upstream. It is held in a ref instead.',
  ],

  notes: [
    'The technique is the same one used to scatter particles over a loaded GLB; the built-in specimen exists so the component ships with no asset. It is four primitives with deliberately mismatched areas — a torus knot, a small icosahedral finial, an open cylinder stem and a lathed base — which is precisely the case area weighting exists to handle.',
    'Pass `source` to sample something else: return the `scene` of a loaded model, or any procedural `Object3D`. It is measured, normalised to a unit bounding sphere and then disposed, so a source authored in metres and one authored in unit space both frame identically.',
    'Sampling costs one pass over every triangle plus a binary search per particle — a few milliseconds for 9000 particles over 10k triangles — and it happens once per rebuild, never per frame.',
    'Two draw calls: the whole point cloud, and every measured ring in one `LineSegments` buffer. The rings do not depth-test, so their far halves cross in front of the shell; at hairline width and 0.3 opacity that reads as an orbit diagram rather than as an error.',
    'The rAF subscription is gated on `useInView` and `useVisibility`, so a scrolled-away or backgrounded instance stops paying for fill. The assembly resumes from wherever it froze rather than restarting.',
    'three constructs its own canvas, which is appended and removed per effect run. Reusing a React-owned `<canvas ref>` is unsafe here: cleanup calls `forceContextLoss()`, and under React 19 StrictMode the remount would hand the effect back the dead context, leaving the component permanently black.',
  ],

  apiSignature:
    'function SurfaceSampledParticles(props: { source?: () => THREE.Object3D | null; count?: number; size?: number; maxSize?: number; spin?: number; puff?: number; scatter?: number; ringCount?: number; ringOpacity?: number; opacity?: number; colorBase?: string; colorTip?: string; ringColor?: string; fov?: number; seed?: number | string; className?: string }): JSX.Element',

  props: [
    { name: 'source', type: '() => THREE.Object3D | null', description: 'Builds the object to sample. Measured on the CPU, never added to the scene, disposed once sampling finishes. Held in a ref, so changing it does not itself trigger a rebuild.' },
    { name: 'count', type: 'number', default: '9000', description: 'Particle count. One buffer, one draw call; cost is linear in fill.' },
    { name: 'size', type: 'number', default: '2.4', description: 'Particle diameter in CSS pixels for a particle at the centre of the shell.' },
    { name: 'maxSize', type: 'number', default: '22', description: 'Ceiling in CSS pixels on the perspective-grown size.' },
    { name: 'spin', type: 'number', default: '0.16', description: 'Turntable speed in radians per second.' },
    { name: 'puff', type: 'number', default: '0.02', description: 'Breathing amplitude along the sampled normal, as a fraction of the shell radius.' },
    { name: 'scatter', type: 'number', default: '0.9', description: 'How far the pre-assembly cloud spreads, in shell radii.' },
    { name: 'ringCount', type: 'number', default: '4', description: 'Horizontal bands to measure orbit rings from. Bands that are too empty are skipped, so this is a maximum. 0 disables the rings.' },
    { name: 'ringOpacity', type: 'number', default: '0.3', description: 'Ring opacity once the shell has assembled; it ramps with the build.' },
    { name: 'opacity', type: 'number', default: '0.9', description: 'Overall alpha multiplier applied in the vertex shader.' },
    { name: 'colorBase', type: 'string', default: "'#6b7783'", description: 'Tint at the base of the shell.' },
    { name: 'colorTip', type: 'string', default: "'#ffffff'", description: 'Tint at the top of the shell.' },
    { name: 'ringColor', type: 'string', default: "'#8d9aa6'", description: 'Ring colour.' },
    { name: 'fov', type: 'number', default: '32', description: 'Vertical field of view in degrees. Camera distance and the perspective size term are both derived from it.' },
    { name: 'seed', type: 'number | string', default: "'surface-sampled-particles'", description: 'Seeds the sampling and the per-particle randoms, so the same shell is produced on the server and on every reload.' },
    { name: 'className', type: 'string', description: 'Merged onto the host element via `cn`.' },
  ],

  reducedMotion:
    'No rAF subscription is opened and one still frame is drawn with `uForm` forced to 1 and the turntable at 0.6 rad — a three-quarter view of the fully assembled shell with its rings at full opacity, not the unformed cloud. The shell, the density, the depth cue from perspective point sizing and the measured rings are all present; the assembly, the breathing and the rotation are what stop. A resize redraws the same still.',

  cleanup:
    'The source object is disposed immediately after sampling, before the renderer even exists. On unmount the stage ref is nulled so an in-flight frame cannot draw into a dying context, `disposeObject(scene)` disposes the point geometry, the ring geometry and their materials, the point material and the ring material are disposed explicitly as well, then `disposeRenderer` performs `dispose()` + `forceContextLoss()` + a zeroed drawing buffer — `dispose()` alone leaves the context alive — and the canvas node is removed. `useRaf`, `useInView`, `useVisibility` and `useResizeObserver` release their own subscriptions.',

  acceptance:
    'On entering view the shell builds from the base upward over about two seconds and holds, then turns slowly. Density is even everywhere: the small finial and the large knot carry the same particles-per-square-millimetre, with no dense speckle on the small parts. Particles nearer the camera are visibly larger than those on the far side, and none of them pop out of existence as the cloud turns. The rings hug the silhouette — they widen where the form widens — and do not cut through the middle of it. Resize the container from wide to narrow: the shell stays fully in frame and particles keep the same apparent size rather than growing or shrinking. With reduced motion a fully assembled three-quarter view renders immediately and holds still.',

  criticalRegion: 'critical',
};

export default meta;
