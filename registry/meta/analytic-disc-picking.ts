import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'analytic-disc-picking',
  title: 'Analytic Disc Picking',
  category: 'primitive',
  tags: ['picking', 'hit-test', 'raycaster', 'billboard', 'three'],
  blurb:
    'Hit-test camera-facing discs by intersecting the pointer ray with their plane. Exact, allocation-free, and correct for shader billboards.',
  cost: 'webgl',
  motif: 'rings',

  files: [
    {
      path: 'registry/ui/analytic-disc-picking.tsx',
      type: 'registry:ui',
      role: 'component + the plane-intersection pick loop',
    },
    {
      path: 'registry/shaders/analytic-disc-picking.ts',
      type: 'registry:lib',
      role: 'view-space billboard vertex shader + disc fragment shader',
    },
  ],
  dependencies: ['three@^0.185.1'],

  summary:
    'A slow ring of camera-facing discs that answers "what is under the pointer" without a raycaster. Because every disc is parallel to the image plane, the pick reduces to intersecting the pointer ray with one plane per disc and comparing the hit against the radius — four arithmetic operations, no traversal, no allocation, and exact rather than approximate. It is also the only correct answer here: the billboard happens in the vertex shader, so `Raycaster` intersects a square that is not on screen.',

  mechanism: [
    'The vertex shader billboards in view space: `vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0); mv.xy += position.xy * uScale;` takes only the translation out of the model-view matrix and adds the quad offset afterwards. The mesh\'s rotation and scale never reach a vertex, so the disc is always exactly parallel to the image plane and its view-space radius is exactly `uRadius * uScale`.',
    'Because the disc is parallel to the image plane, its plane normal is the camera\'s view direction for every disc in the scene. `camera.getWorldDirection(viewDir)` is called once per frame and `plane.setFromNormalAndCoplanarPoint(viewDir, disc.position)` then differs only in its constant.',
    '`raycaster.setFromCamera(ndc, camera)` builds the pointer ray and nothing else is used from the Raycaster — `intersectObjects` is never called. Constructing the ray is the cheap half of raycasting; the traversal, the per-object matrix inverse, and the per-triangle intersection are the half being skipped.',
    '`ray.intersectPlane(plane, hit)` returns `Vector3 | null`, and the null case is a free depth rejection: `Ray.distanceToPlane` returns null for `t < 0`, so anything behind the camera drops out before any distance work.',
    'The winner is the nearest hit along the ray whose distance from the disc centre is within the radius, both compared squared. Depth is tested FIRST — `if (along >= bestAlong) continue;` — so a disc that cannot beat the incumbent never runs its own radius test.',
    'The pick radius is `uRadius * uScale`, the same two numbers the vertex shader multiplies. Hover eases `uScale` from 1 to 1.14, and the pick reads the eased value in the same frame, so a disc is never clickable over area it has not grown into and never stops being clickable over area it still occupies.',
    'Every scratch object — ray, plane, hit vector, view direction, NDC vector — is allocated once into the stage object and reused. A pick loop that allocates a `Vector3` per disc per frame produces 780 garbage vectors a second at 60 Hz on a ring of thirteen.',
    'Rendering is gated on a dirty flag. The flag is set by the spin, by pointer movement, by a hover easing that is still in flight, and by resize. Under `prefers-reduced-motion` the spin never sets it, so the renderer idles at zero draw calls until the pointer moves.',
  ],

  constants: [
    {
      name: 'FOV',
      value: '42',
      why: 'Camera vertical field of view in degrees. Wide enough that the near discs are visibly larger than the far ones — which is what makes an analytic test worth having — and narrow enough that the ring does not distort into an oval at preview aspect ratios.',
    },
    {
      name: 'CAM_Z / ringRadius',
      value: '5.6 / 2.15',
      why: 'A ratio of about 2.6. Closer and the front disc overruns the frame at preview width; further and the perspective flattens until a cheap screen-space approximation would have been good enough, which defeats the demonstration.',
    },
    {
      name: 'discRadius',
      value: '0.46',
      why: 'World units, and simultaneously the pick radius. A single source for both is the entire point: two constants that mean "how big is this disc" is how a hit region drifts away from the pixels it is supposed to cover.',
    },
    {
      name: 'WAVE',
      value: '0.34',
      why: 'Vertical amplitude of the sin(2a) offset. Enough that the ring reads as a ribbon rather than a flat carousel; past ~0.6 the discs at the crossings overlap and the nearest-along-the-ray tie-break starts doing visible work the user has no way to predict.',
    },
    {
      name: 'HOVER_SMOOTHING',
      value: '0.0006',
      why: 'Fraction of the hover gap remaining after one second, as `damp` defines it — about 12% of the gap per frame at 60 Hz, settling in roughly 0.2 s. A per-frame constant instead would converge twice as fast on a 120 Hz display and the growth would feel like a different component.',
    },
    {
      name: 'HOVER_GROWTH',
      value: '0.14',
      why: 'A hovered disc grows 14%. Large enough to read at the back of the ring where a disc is a third of its front size, small enough that the grown disc does not swallow its neighbours and make the pick ambiguous.',
    },
    {
      name: 'FEATHER',
      value: '0.035',
      why: 'Rim gradient width in units of the radius — roughly 1.5 px at preview scale. This is why the renderer is built with `antialias: false`: MSAA would pay for an entire extra sample buffer to solve a problem one smoothstep already solved.',
    },
  ],

  pitfalls: [
    'Reaching for `THREE.Raycaster` against a shader billboard. The vertex shader runs on the GPU; the `BufferGeometry` in main memory is an unrotated square lying in world XY. The raycast intersects that square and reports hits on a shape nobody can see — turn on `compare` and the two readouts disagree the moment the camera is not staring down the world Z axis.',
    'Using `Ray.distanceToPlane` and testing its result for null. It does return null at runtime for a plane behind the ray origin, but `@types/three` declares it as `number`, so the null check is a type error and removing the null check is a crash. `intersectPlane` has the honest `Vector3 | null` signature; use it.',
    'Approximating the disc as a screen-space circle whose NDC radius is `halfDiagonal / (tanHalfFov * camDist)`. That is only correct for a sphere. For a flat disc it over-reports near the edges of frame, where perspective stretches the footprint, so the hover boundary is visibly not the disc boundary. The plane intersection is exact for the same cost.',
    'Deriving the pick radius from a second constant. Hover growth then applies to the pixels but not the hit region, and the disc becomes clickable on a ring of its own body it has already grown past.',
    'Leaving `frustumCulled` on. The culler tests the geometry bounding sphere at the mesh transform, but the vertices are moved by the shader, so a disc vanishes the instant the untransformed square leaves the frustum.',
    'Allocating in the pick loop. `new THREE.Vector3()` per disc per frame is invisible in a profile and unmistakable in a GC trace; reuse a scratch object on the stage.',
    'Enabling depth test on the discs. They are square quads with the corners discarded, so the depth buffer records the quad, not the disc, and neighbouring rims punch holes in each other. Painter\'s-algorithm sorting is correct here because the billboard leaves the object position — the key three sorts on — untouched.',
    'Handing three\'s renderer a React-rendered `<canvas ref>`. StrictMode double-invokes the effect, the first cleanup calls `forceContextLoss()`, and the second run is given the same permanently dead element. Let the renderer make its own canvas inside the effect and remove it in cleanup.',
  ],

  notes: [
    'The same reduction works for any primitive with a closed-form ray test: a sphere is `ray.intersectSphere`, an axis-aligned card is `ray.intersectBox`, a ground plane is one `intersectPlane`. Raycasting against triangles is the fallback for arbitrary meshes, not the default for known shapes.',
    'A square quad plus `discard` beats a `CircleGeometry` fan on both counts — two triangles instead of thirty-two, and a rim anti-aliased by a smoothstep instead of a polygon approximated by segments.',
    'The `compare` prop exists to be switched on once. Leave it on in production and you pay for the traversal you set out to avoid, plus an `intersectObjects` call whose result you throw away.',
  ],

  apiSignature:
    'function AnalyticDiscPicking(props: { count?: number; period?: number; discRadius?: number; ringRadius?: number; color?: string; accent?: string; seed?: number | string; compare?: boolean; onPick?: (index: number) => void; className?: string }): JSX.Element',

  props: [
    { name: 'count', type: 'number', default: '13', description: 'Discs around the ring.' },
    { name: 'period', type: 'number', default: '30', description: 'Seconds for one revolution.' },
    { name: 'discRadius', type: 'number', default: '0.46', description: 'Disc radius in world units. Also the pick radius — the two cannot drift apart.' },
    { name: 'ringRadius', type: 'number', default: '2.15', description: 'Ring radius in world units.' },
    { name: 'color', type: 'string', default: "'#7d848e'", description: 'Base plate colour. Any value `THREE.Color` accepts.' },
    { name: 'accent', type: 'string', default: "'#e8e4dc'", description: 'Colour of the picked disc.' },
    { name: 'seed', type: 'number | string', default: "'analytic-disc-picking'", description: 'Seeds the per-disc plate pattern. Same seed, same ring every reload.' },
    { name: 'compare', type: 'boolean', default: 'false', description: 'Also run a real `Raycaster` each frame and report what it thinks was hit.' },
    { name: 'onPick', type: '(index: number) => void', description: 'Fired when a disc is clicked, with its index.' },
    { name: 'className', type: 'string', description: 'Merged onto the host element via `cn`.' },
  ],

  reducedMotion:
    'The ring holds still: the phase is integrated from delta time, so freezing it is a matter of adding nothing. The dirty flag is then only set by the pointer, which means the renderer draws zero frames until the pointer moves. Picking, hover growth and selection are unaffected — the technique is about where things are, not about them moving.',

  cleanup:
    'The effect removes every disc from the scene and disposes its `ShaderMaterial`, disposes the one shared `PlaneGeometry`, then calls `disposeRenderer` — which stops the animation loop, disposes the renderer, calls `forceContextLoss()`, and zeroes the drawing buffer — and finally removes the canvas it appended. The canvas is created by the renderer inside the effect and never handed to React, so a StrictMode double-invoke rebuilds a fresh context rather than reusing a killed one. The frame loop unsubscribes with `useRaf`; the shared rAF parks once nothing is subscribed. The `ResizeObserver` unobserves with its hook.',

  acceptance:
    'Hover a disc at the front of the ring and it brightens and grows, and the readout says `plane hit NN`. Follow one disc as it travels to the back: it stays pickable over exactly its drawn silhouette, smaller but never offset. Set `compare` and hover a disc anywhere off the centre of frame — the `raycast` readout says something different, usually nothing, because it is testing an unrotated square in world XY. Click and the disc under the pointer takes the accent colour. With reduced motion the ring is static and every one of those behaviours still works.',

  criticalRegion: 'critical',
};

export default meta;
