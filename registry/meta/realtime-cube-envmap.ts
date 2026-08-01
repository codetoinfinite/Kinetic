import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'realtime-cube-envmap',
  title: 'Realtime Cube EnvMap',
  category: 'webgl',
  tags: ['three', 'cube-camera', 'reflection', 'envmap', 'render-target'],
  blurb: 'A metal knot reflecting panels that are actually orbiting it, captured six faces at a time every other frame.',
  cost: 'webgl',
  motif: 'orbit',

  files: [
    {
      path: 'registry/ui/realtime-cube-envmap.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['three@^0.185.1'],
  registryDependencies: [
    'webgl',
    'use-raf',
    'use-in-view',
    'use-visibility',
    'use-resize-observer',
    'use-reduced-motion',
  ],

  summary:
    'A `CubeCamera` sits inside the reflector and renders the six directions around it every other frame; that cube texture is assigned straight onto the material as its `envMap`. Because the panels supplying the reflection are orbiting, the highlights crawl across the surface instead of being painted on. No HDRI, no loader, no asset — the environment is scene geometry.',

  mechanism: [
    'A `WebGLCubeRenderTarget(resolution, { generateMipmaps: true, minFilter: LinearMipmapLinearFilter })` backs a `CubeCamera(0.1, 60, target)` positioned at the reflector, and `cubeTarget.texture` is assigned to `material.envMap` once at build time — the texture object never changes identity, only its contents.',
    'The environment is built from geometry: an inside-out `SphereGeometry(16)` with `side: BackSide` carrying a vertical gradient `CanvasTexture`, plus `panelCount` `PlaneGeometry` emitters on a ring of radius `panelRadius`, each `lookAt(0,0,0)` and lifted by `sin(i * 2.39996) * 0.9` so the reflection has vertical structure to move through.',
    'Panels alternate bright and near-black via `color.setHSL(hue + i*26, i%2 ? 0.4 : 0.66, i%2 ? 0.08 : 0.62)`. The dark ones are load-bearing: a uniformly bright environment gives a mirror nothing to contrast against and the metal reads as matte plastic.',
    'Each frame the ring and the reflector are rotated from `elapsed`, then — only on frames where `frames % refreshEvery === 0` — the reflector is set `visible = false`, `cubeCamera.update(renderer, scene)` runs, and it is set visible again before the single visible `renderer.render`.',
    'Resize lives in its own effect: it sets renderer size, sets `camera.aspect`, moves the camera to `BASE_DISTANCE / Math.min(1, aspect)` so a portrait container does not clip the panel ring off both sides, and forces one capture plus one redraw so a reflow never leaves a stale or black frame on screen.',
    'Teardown disposes the shell texture, both geometries, every panel material, the reflector material, then `cubeTarget.dispose()` — the cube target is not in the scene graph, so `disposeObject` never reaches it — and finally `disposeRenderer`, which is what calls `forceContextLoss()`.',
  ],

  constants: [
    {
      name: 'refreshEvery',
      value: '2',
      why: 'Cube captures per rendered frame. Six faces is six scene renders against the visible pass\'s one, so this is 6/7 of the component\'s cost. An env map is sampled by direction, not position, so at these rotation speeds a one-frame-old capture is not observable; at 4 or more the highlights visibly step.',
    },
    {
      name: 'resolution',
      value: '256',
      why: 'Cube face size. Cost is 6 x resolution² fragments plus a mip chain — about 2 MB of GPU memory. At 128 the panel edges alias into the reflection as jagged bands; above 512 nothing improves because roughness immediately blurs the detail away.',
    },
    {
      name: 'roughness',
      value: '0.08',
      why: 'Not 0. A perfect mirror shows the panels as hard-edged rectangles and every seam in the cube map becomes visible; a slight roughness selects a lower mip and softens exactly those seams. Above ~0.3 the reflection stops being readable as a scene at all.',
    },
    {
      name: 'envMapIntensity',
      value: '1.4',
      why: 'Reflected light multiplier. At 1 a dark environment leaves the object nearly invisible against the shell; above ~2 the bright panels clip to flat white and the curvature information in the highlight is lost.',
    },
    {
      name: 'panelRadius',
      value: '4.2',
      why: 'Ring radius against a ~1.4-unit reflector. Closer and the panels enter the camera frustum and read as walls rather than as light sources; further and they subtend too small an angle to produce a highlight worth reflecting.',
    },
    {
      name: 'BASE_DISTANCE',
      value: '7.2',
      why: 'Camera distance at aspect >= 1, chosen against a 34 degree field of view so the reflector fills about two thirds of the frame height. Divided by `min(1, aspect)` on narrower containers.',
    },
    {
      name: 'STATIC_POSE',
      value: '0.9',
      why: 'The `elapsed` value used for the reduced-motion still and for post-resize redraws. Not 0: at zero the knot is axis-aligned and the panels sit on the cardinal directions, which reads as a technical diagram instead of a lit object.',
    },
    {
      name: 'lift stagger',
      value: 'sin(i * 2.39996) * 0.9',
      why: '2.39996 rad is the golden angle, so successive panels never repeat a height for any panel count. A constant height puts every panel in one band and the reflection has nothing to travel through vertically.',
    },
  ],

  pitfalls: [
    'Capturing with the reflector visible. It photographs its own previous frame, the next capture includes that photograph, and within about a second the surface is a recursive tunnel of dark shells. Hide it, capture, show it — inside the same frame, so it is never absent from the visible render.',
    'Creating the cube target without mipmaps. `roughness` picks a mip level of the env map; with only level 0 available the surface stays a hard mirror at every roughness value and the prop appears to do nothing.',
    'Refreshing the cube map every frame because it looks like the honest thing to do. That is seven scene renders per displayed frame, and it is the difference between a preview grid that holds 60fps and one that does not.',
    'Rendering the first frame without forcing a capture. An unwritten cube map is black, a metal surface reflecting black is black, and on a throttled refresh that black sits on screen for `refreshEvery` frames as a visible flash.',
    'Building the environment out of bright panels only. Metal is read entirely from the contrast between light and dark in its surroundings; with no dark panels the highlights have no edges and the material looks like painted plastic.',
    'Letting `disposeObject(scene)` stand in for cube-target cleanup. The target is not a child of anything, so nothing traverses it, and six faces plus mips leak per mount — which under StrictMode double-invocation is two leaks per page load.',
    'Leaving the camera distance fixed. Framing on height alone means a portrait container crops the panel ring away entirely, and the object loses the thing it is reflecting.',
  ],

  notes: [
    'No lights in the scene. `metalness: 1` with `roughness` near 0 is lit purely by its environment, so a light would contribute almost nothing while adding a uniform to every shader compile.',
    '`transmission` is deliberately not exposed. Three renders a separate full-scene pass per transmissive object, which on top of six cube faces triples the frame cost for an effect the cube map already implies.',
    'The panel arrangement is a pure function of the index, so there is no RNG and nothing to seed — server and client markup cannot disagree.',
  ],

  apiSignature:
    "function RealtimeCubeEnvmap(props: { shape?: 'knot' | 'icosahedron'; panelCount?: number; panelRadius?: number; spinSpeed?: number; objectSpin?: number; resolution?: number; refreshEvery?: number; roughness?: number; metalness?: number; envMapIntensity?: number; hue?: number; className?: string }): JSX.Element",

  props: [
    { name: 'shape', type: "'knot' | 'icosahedron'", default: "'knot'", description: 'Reflector silhouette. The knot has more curvature and so more reflection per pixel.' },
    { name: 'panelCount', type: 'number', default: '7', description: 'Emitting panels on the ring. Odd counts keep bright and dark panels from pairing off across the object.' },
    { name: 'panelRadius', type: 'number', default: '4.2', description: 'Ring radius in world units.' },
    { name: 'spinSpeed', type: 'number', default: '0.18', description: 'Panel ring rotation, radians per second. This is what makes the reflection move.' },
    { name: 'objectSpin', type: 'number', default: '0.32', description: 'Reflector rotation about Y, radians per second. X spins at 0.55 of this.' },
    { name: 'resolution', type: 'number', default: '256', description: 'Cube face size in pixels. Cost is six faces plus mips.' },
    { name: 'refreshEvery', type: 'number', default: '2', description: 'Capture the cube map every Nth rendered frame. 1 captures every frame.' },
    { name: 'roughness', type: 'number', default: '0.08', description: 'Surface roughness, which selects the env map mip level.' },
    { name: 'metalness', type: 'number', default: '1', description: '1 is a mirror; 0 is diffuse and lit only by the env map.' },
    { name: 'envMapIntensity', type: 'number', default: '1.4', description: 'Multiplier on reflected light.' },
    { name: 'hue', type: 'number', default: '208', description: 'Base hue in degrees for the panels and the shell gradient.' },
    { name: 'className', type: 'string', description: 'Merged onto the host element via `cn`.' },
  ],

  reducedMotion:
    'The rAF subscription is never made, and the scene is drawn once at `STATIC_POSE` with a forced cube capture — a fully reflective still with the panels off the cardinal axes. Reflections, gradient shell and material are all exactly as they are in motion; only the rotation is absent. Resizing redraws the same pose rather than resuming.',

  cleanup:
    '`disposeObject(scene)` walks the graph, then the shell canvas texture, shell and panel geometries, every panel material and the reflector material are disposed explicitly, then `cubeTarget.dispose()` releases the six faces and their mip chain, then `disposeRenderer(renderer)` calls `dispose()` and `forceContextLoss()` and zeroes the backing store, and the canvas node is removed. The `CubeCamera` is removed from the scene first so nothing holds a reference to a disposed target.',

  acceptance:
    'The bright bands on the object crawl across its surface continuously while it turns, and the same colours are visible on the panels orbiting behind it. There is no dark recursive tunnel anywhere on the surface at any moment. Raising `roughness` toward 0.3 progressively blurs the reflection instead of leaving it a hard mirror. Resize the container and the object stays fully in frame in both landscape and portrait. Mount and unmount a dozen instances and none of the earlier ones go black.',

  criticalRegion: 'critical',
};

export default meta;
