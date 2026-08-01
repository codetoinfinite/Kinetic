import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'cylinder-gallery',
  title: 'Cylinder Gallery Drum',
  category: 'webgl',
  tags: ['three', 'gsap', 'lenis', 'vertex-shader', 'gallery', 'infinite'],
  blurb:
    'Nineteen planes wrapped around a drum in the vertex shader, spun by wheel or scroll, focus falling off from centre.',
  cost: 'webgl',
  motif: 'rings',

  files: [
    {
      path: 'registry/ui/cylinder-gallery.tsx',
      type: 'registry:ui',
      role: 'component',
    },
    {
      path: 'registry/shaders/cylinder-gallery.ts',
      type: 'registry:lib',
      role: 'shader',
    },
  ],
  dependencies: ['three@^0.185.1', 'gsap@^3.15.0', 'lenis@^1.3.11'],
  registryDependencies: [],

  summary:
    'A flat PlaneGeometry per item, all sharing one compiled program, each bent around a common cylinder by its own uniform. The camera never moves and the CPU never touches a vertex: scrolling changes one float, `position`, and every plane recomputes its angle, its height and its focus weight from that single scalar. Because the ring offset is the shortest signed distance on a circular index, the list is genuinely endless in both directions with no clones and no rebuilding.',

  mechanism: [
    'The vertex shader treats a vertex\'s own x as an arc offset: `angle = uSpiralAngle + position.x`, then `pos.x = uRadius * sin(angle)` and `pos.z = uRadius * cos(angle)`, so one world unit of plane width wraps exactly one radian of drum. `pos.y = sin(position.y)` pulls the top and bottom edges in, which turns a rolled sheet into a barrel.',
    'Per frame and per plane, `wrappedOffset(i, position, count)` returns the shortest signed distance from that plane to the focused index — the value that makes index 0 sit one step before index 18 rather than eighteen steps after it. That offset drives `uSpiralAngle = (offset / count) * 2π * turns`, the vertical stack `y = -offset * spacing`, and the focus term.',
    'Focus is `gaussian(offset)` = `exp(-offset²)`: 1.0 at the centre, 0.368 one step out, 0.018 two, 0.0001 three. The fragment shader mixes toward luminance and dims by that weight, so attention falls off continuously instead of one plane being flagged "selected".',
    'A single `uIntro` scalar lerps between two complete layouts inside the shader — `mix(rowPos, ringPos, uIntro)` — where `rowPos` is a flat facing row and `ringPos` is the drum. Every intermediate value is a valid frame, and the CPU lerps the mesh x/y positions with the same scalar so the two layouts stay consistent.',
    'Signed scroll velocity feeds `uDeform`, which adds `sin(position.y * 3.0 + 100.0) * uDeform * 0.07` to z and `sin(position.x * 3.0) * uDeform * 0.04` to y. It samples `position` — the original flat coordinates — not the already-bent `pos`, so the ripple is locked to the picture and reads as the image flexing rather than the drum wobbling.',
    'Pointer proximity is measured inside the vertex shader by projecting each vertex once as a probe (`ndc = probe.xy / probe.w`), taking `exp(-mouseDist² * 5.0)`, lifting z by half of it and passing it to the fragment shader, which pushes the centred UV outward by the same weight so the bump also magnifies — a lens, not a bump.',
  ],

  constants: [
    {
      name: 'PLANE_WIDTH / PLANE_HEIGHT',
      value: '1 / 1.95',
      why: 'Width 1 because the bend uses the vertex\'s raw x as radians — at width 1 each plane spans exactly 1 rad of the drum, which is the whole reason no trigonometry is needed on the CPU. Height must stay under 2π/3 or `sin(position.y)` leaves its monotonic range and the barrel folds its own edges back through the surface.',
    },
    {
      name: 'CAMERA_FOV / CAMERA_Z',
      value: '45 / 5',
      why: 'The camera never animates, so these only set how much drum is in shot. Below ~35° the ring flattens into a row and the depth cue vanishes; above ~60° the near plane balloons and the barrel curve reads as a keystone error.',
    },
    {
      name: 'OVERSCAN',
      value: '1.12',
      why: 'The cover-fit UV is divided by this, zooming the crop in 12%. At exactly 1.0 the wave and the bulge push vertices past the sampled region and the texture\'s own clamped border smears along the edge. Beyond ~1.25 the crop eats the subject.',
    },
    {
      name: 'segments',
      value: '64',
      why: 'The bend is evaluated per vertex, so subdivision *is* the curve. Below ~24 the drum visibly becomes a folded card and the mouse bulge turns into a triangular tent; past ~128 you are paying vertex cost for a curve the pixel grid cannot resolve.',
    },
    {
      name: 'POSITION_SMOOTHING',
      value: '0.0006',
      why: 'Fraction of remaining distance left after one second. Larger (slower) and the drum lags visibly behind the wheel; much smaller and the velocity spike that drives `uDeform` never has time to build, so the wave disappears.',
    },
    {
      name: 'SNAP_DELAY_MS',
      value: '170',
      why: 'Idle time before the drum eases to a whole index. Under ~120 ms it fires between the discrete events of a single trackpad flick and fights the gesture; over ~250 ms the gallery feels like it forgot to settle.',
    },
    {
      name: 'MAX_DEFORM / DEFORM_PER_INDEX',
      value: '1.5 / 0.42',
      why: 'Deform is clamped to ±1.5 because the shader multiplies it by 0.07 world units — past that the planes intersect each other and the far side of the drum pokes through the near side. 0.42 sets how many index-steps per second count as full deflection.',
    },
    {
      name: 'RADIUS_VELOCITY_GAIN',
      value: '0.5',
      why: 'The drum widens up to 50% at full speed, which is what sells inertia. Above ~0.8 the nearest plane crosses the camera\'s near plane during a fast flick and clips away.',
    },
    {
      name: 'gaussian falloff',
      value: '1 (exp(-offset²))',
      why: 'A falloff of 1 keeps the immediate neighbours legible at 0.37 while the third plane out is effectively gone. Raising it dims the neighbours to black and the ring loses its context; lowering it flattens every plane to the same weight.',
    },
    {
      name: 'renderOrder scale',
      value: '-worldZ * 1000',
      why: 'Reconstructed drum depth, scaled up so it survives rounding to an integer sort key. At a smaller scale adjacent planes collapse into the same bucket and flicker between frames.',
    },
  ],

  pitfalls: [
    'Scaling `uRadius` from 0 to animate the intro. At radius 0 every vertex of every plane lands on the origin, so the "flat" state is nineteen invisible slivers stacked in one spot. Lerp between two position vectors — `mix(rowPos, ringPos, uIntro)` — and the flat state is a real layout you can hold.',
    'Leaving `frustumCulled` at its default. The CPU-side geometry is still a flat plane sitting at `mesh.position`; the visible shape is somewhere else entirely. three culls against that stale bounding sphere and planes that are plainly on screen blink out at the edges.',
    'Trusting three\'s transparency sort. It orders transparent meshes by their object position, which for this drum is `(0, y, 0)` for every single plane, so the far side of the ring paints over the near side at random. Reconstruct the depth the shader will produce (`radius * cos(angle) * intro`) and set `renderOrder` from it each frame.',
    'Expecting `disposeObject` to free the plate textures. It scans a material\'s own properties for anything with `isTexture`; these textures live two levels down inside `material.uniforms`, so it never sees them and nineteen 512x1024 canvases stay resident on the GPU after unmount. They are disposed explicitly from a tracked list.',
    'Calling `renderer.dispose()` and stopping there. That releases GPU objects but keeps the WebGL context alive; Chromium caps a renderer process at roughly 16 and silently kills the oldest, so a docs page that mounts several of these blanks the ones above it. `disposeRenderer` calls `forceContextLoss`.',
    'Attaching the wheel listener passively. Without `preventDefault` the drum spins and the host page scrolls at the same time, which reads as two gestures fighting; the listener is registered with `{ passive: false }`.',
    'Sampling the deformation wave from the already-bent `pos` instead of the original `position`. The ripple then travels with the drum rotation rather than staying pinned to the image, and the effect looks like a rendering fault instead of the picture flexing.',
    'Sizing the flat-row layout from `window.innerWidth`. The row has to span the frustum\'s visible width at z = 0, which is `2 * tan(fov/2) * cameraZ * aspect` — the container width in pixels has no fixed relationship to that, so the row overshoots on wide viewports and clips on narrow ones.',
    'Omitting `#include <colorspace_fragment>` from a `ShaderMaterial`. three only injects output conversion into its own materials, so raw linear values ship into an sRGB framebuffer and the plates render visibly washed out next to the CSS around them.',
    'Rebuilding the scene when the `items` array identity changes. Any caller who writes the list inline hands over a new array every render, which would tear down nineteen textures and a GL context on every keystroke. The setup effect keys on a string built from id, title and hue.',
  ],

  notes: [
    'Textures are drawn at mount to a 512x1024 canvas per item — a hue ramp, hairline bands and a numeral. The bands are not decoration: a smooth gradient hides every deformation the shader applies, so the plate needs structure for the wave and the bulge to bend.',
    'All nineteen materials are separate `ShaderMaterial` instances because each needs its own uniforms, but three keys its program cache on the shader source, so they share a single compiled program.',
    '`drive: "page"` opts into a shared refcounted Lenis with `infinite: true`, which is the technique in its original form — the gallery *is* the page. The default `drive: "pointer"` keeps every gesture inside the component\'s own box.',
  ],

  apiSignature:
    'function CylinderGallery(props: { items: CylinderGalleryItem[]; drive?: "pointer" | "page"; radius?: number; turns?: number; spacing?: number; segments?: number; pixelsPerIndex?: number; opacity?: number; paint?: (ctx: CanvasRenderingContext2D, item: CylinderGalleryItem, index: number, size: { width: number; height: number }) => void; onSelect?: (item: CylinderGalleryItem, index: number) => void; onFocusChange?: (item: CylinderGalleryItem, index: number) => void; className?: string }): JSX.Element',

  props: [
    { name: 'items', type: 'CylinderGalleryItem[]', description: '`{ id, title, meta?, hue? }` per plane. One mesh and one generated texture each.' },
    { name: 'drive', type: '"pointer" | "page"', default: '"pointer"', description: 'Wheel and drag inside the component, or document scroll via a shared infinite Lenis.' },
    { name: 'radius', type: 'number', default: '2', description: 'Drum radius in world units, before the velocity widening.' },
    { name: 'turns', type: 'number', default: '3', description: 'Full revolutions the ring spans across the whole list.' },
    { name: 'spacing', type: 'number', default: '0.8', description: 'World units of vertical travel per index step.' },
    { name: 'segments', type: 'number', default: '64', description: 'Plane subdivisions per axis. This is the resolution of the bend.' },
    { name: 'pixelsPerIndex', type: 'number', default: '240', description: 'Document scroll pixels per index step, in `page` mode only.' },
    { name: 'opacity', type: 'number', default: '1', description: 'Global alpha multiplier applied before the focus falloff.' },
    { name: 'paint', type: '(ctx, item, index, size) => void', description: 'Override the generated plate. Receives a 2D context for a 512x1024 canvas.' },
    { name: 'onSelect', type: '(item, index) => void', description: 'Tap on the drum. A drag never counts as a tap.' },
    { name: 'onFocusChange', type: '(item, index) => void', description: 'Fires when a different index takes the centre.' },
    { name: 'className', type: 'string', description: 'Merged onto the wrapper via `cn`.' },
  ],

  reducedMotion:
    'The intro morph is skipped — `uIntro` is set to 1 on mount, so the drum is simply already assembled. The velocity wave is pinned to 0 and the pointer bulge never engages, so the surface stays flat. Navigation still works and still eases: wheel, drag and the snap-to-index tween are unchanged, because the user asked for less motion, not for a gallery that cannot move.',

  cleanup:
    'Removes the wheel and pointerenter/pointerleave listeners, kills the intro tween and any pending snap timeout plus its tween, removes every mesh from the scene, disposes each `CanvasTexture` by hand (they sit inside `material.uniforms`, where `disposeObject` cannot reach), runs `disposeObject` for the geometries and materials, disposes the shared geometry, then `disposeRenderer` — `setAnimationLoop(null)`, `dispose()`, `forceContextLoss()` — and removes the canvas from the DOM. The frame loop reads a stage ref that is nulled first, so a queued frame after teardown is a no-op rather than a null context throw.',

  acceptance:
    'On mount the planes start as a flat row facing you and curl into a drum over about 1.6 s. Wheel or drag spins it endlessly in both directions with no seam and no jump at the ends; stop moving and it eases to centre one plane. The centred plane is full colour and the neighbours fade toward grey within two steps. Flick hard and the images ripple, the drum widens, and the ripple runs opposite ways depending on direction. Move the pointer over a plane and a soft lens follows it, magnifying rather than just denting. Unmount from React DevTools and the canvas leaves the DOM with no context-lost warning; mount and unmount twenty times and no context is dropped. With `prefers-reduced-motion: reduce` the drum is already assembled on the first frame and neither the ripple nor the lens ever appears.',

  criticalRegion: 'critical',
};

export default meta;
