import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'layout-lerp-scalar',
  title: 'Layout Lerp Scalar',
  category: 'layout',
  tags: ['three', 'layout', 'morph', 'parameters', 'gsap', 'wrap'],
  blurb:
    'Row, stack, drum and fan are one placement function of seven numbers. Switching layout is a tween over an object.',
  cost: 'webgl',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/layout-lerp-scalar.tsx',
      type: 'registry:ui',
      role: 'component',
    },
    {
      path: 'registry/shaders/layout-lerp-scalar.ts',
      type: 'registry:lib',
      role: 'shader',
    },
  ],
  dependencies: ['three@^0.185.1', 'gsap@^3.15.0'],
  registryDependencies: [
    'use-in-view',
    'use-raf',
    'use-reduced-motion',
    'use-resize-observer',
    'use-visibility',
    'damp',
    'wrap',
    'webgl',
  ],

  summary:
    'One function places every card from seven scalars — radius, spacing, rowSpread, turns, depth, focus, scale — and each named layout is only a set of values for them. Morphing is therefore `gsap.to(params, preset)`: a tween over an object literal, with no per-item choreography anywhere. Crucially it interpolates the *inputs*, `f(lerp(a, b, s))`, not the outputs, so every intermediate frame is a valid member of the same family instead of a set of cards sliding along straight lines through each other.',

  mechanism: [
    'Placement is `offset = wrappedOffset(i, position, n)`, then `angle = (offset / n) * 2PI * turns` and `p = (radius * sin(angle) + offset * rowSpread * step, -offset * spacing, radius * (cos(angle) - 1) - depth * |offset|)`, with `rotation.y = angle`. Setting `radius` and `turns` to 0 leaves a straight line; adding `spacing` makes it a column; adding `turns` and `radius` wraps that column into a drum. There is no branch anywhere in it.',
    'Because the parameters are what get tweened, the shape passes through the family rather than across it. `f` is nonlinear in `radius` and `turns`, so `f(lerp(a, b, s))` and `lerp(f(a), f(b), s)` are different animations: the first keeps the cards on a well-formed helix at every `s`, the second sends each card down a chord that cuts through the middle of the drum and through its neighbours.',
    '`cos(angle) - 1` rather than `cos(angle)` puts the focused card at z = 0 for any radius. Growing the drum then pushes the far side away instead of pulling the near card into the camera, which is what makes `radius` safe to tween through large values.',
    'The `depth` term gives the flat layouts a strictly monotonic z in `|offset|`. That is not a look — it is what lets three\'s painter sort order the transparent cards correctly. With every card at z = 0 the sort has nothing to rank and the overlap order in a stack is whatever the traversal happened to produce.',
    'The row step is derived from the camera: `visibleHeight = 2 * cameraZ * tan(fov / 2)`, `visibleWidth = visibleHeight * aspect`, and `step = visibleWidth * fill / (n - 1)`. Card size comes from the same `visibleHeight`, so the whole layout is defined in fractions of the frustum and holds its proportions at any viewport.',
    'Focus is `1 - focus * (1 - exp(-offset^2))` — 1.000 at the centre, 0.368 one step out, 0.018 two — driving both the card scale and a single `uFocus` uniform that desaturates and dims in the fragment shader. `focus` is itself one of the tweened parameters, so a layout can decide how much of a selection it is.',
    'The vertex shader is the default transform and nothing else. Everything that moves is a CPU write to `position`, `rotation` and `scale`, which means the bounding sphere three culls against and the view depth it sorts by both describe where the card actually is. A drum that bends its planes in the vertex shader has to disable culling and reconstruct `renderOrder` by hand; this one gets both for free.',
  ],

  constants: [
    {
      name: 'PRESETS.drum',
      value: '{ radius: 2.55, spacing: 0.74, turns: 2, focus: 1, scale: 1 }',
      why: 'Two turns across twelve cards puts adjacent cards 60° apart, so the ring reads as a ring rather than as a coil. Below about 1.5 turns the far side is barely behind the near side and the drum flattens into a wheel; above 3 the cards on the back face are edge-on for most of a lap and the set looks half empty.',
    },
    {
      name: 'PRESETS.row.scale',
      value: '0.42',
      why: 'Matched to the derived row step so twelve cards just touch at the reference aspect. Larger and the row overlaps into a fan; smaller and it becomes a sparse dotted line. It is a scalar for exactly this reason — the row layout gets to pick its own card size.',
    },
    {
      name: 'depth',
      value: '0.35 (column) / 0.1 (row) / 0 (drum, fan)',
      why: 'World units of recession per index step. The drum and fan get their z from the radius, so they need none. The flat layouts need a non-zero value or their transparent cards have identical view depth and the sort order is arbitrary — the symptom is a stack whose overlap flickers as the ring drifts.',
    },
    {
      name: 'CARD_HEIGHT_RATIO',
      value: '0.4',
      why: 'Card height as a fraction of the frustum height at z = 0. Above ~0.55 the drum\'s vertical spacing has to grow to match or the cards intersect; below ~0.25 the whole formation floats in the middle of the frame with nothing at the edges.',
    },
    {
      name: 'CAMERA_FOV / CAMERA_Z',
      value: '42 / 7.2',
      why: 'A matched pair: they set the visible height, and everything else is a fraction of it. A wider FOV exaggerates the perspective divide so the far side of the drum shrinks dramatically — dramatic, but it also makes the row visibly bow. Change one and the layout is unchanged only if the other keeps `z * tan(fov / 2)` the same.',
    },
    {
      name: 'ROW_FILL',
      value: '0.92',
      why: 'Fraction of the visible width the flat row spans. At 1.0 the outermost cards are cut exactly by the frustum edge and their antialiased rims flicker as they cross it; much below 0.85 the row no longer reads as spanning the frame.',
    },
    {
      name: 'SCALE_FLOOR',
      value: '0.72',
      why: 'The scale an entirely out-of-focus card keeps. At 1.0 the focus falloff is only a dimming and the arrangement loses its centre; below ~0.5 the outer cards shrink so fast the drum looks like it is receding into a tunnel.',
    },
    {
      name: 'duration / MORPH_EASE',
      value: '1.25 / power3.inOut',
      why: 'Long enough to read the shape changing rather than snapping, short enough not to feel like a loading state. `inOut` because the morph has no impulse behind it — an `out` ease implies the shape was thrown, and the sudden start looks like a dropped frame.',
    },
    {
      name: 'drift',
      value: '0.16',
      why: 'Index steps per second of idle travel. About six seconds per card: slow enough to read a caption, fast enough that the wrap is visible within a few seconds of arriving. At 0 the ticker still runs but nothing moves, which is the right default for a layout driven by scroll instead.',
    },
    {
      name: 'CARD_CORNER',
      value: '0.055',
      why: 'Corner radius in units of card height, evaluated as an SDF in the fragment shader. Because the mask is drawn rather than sampled it stays crisp at any scale, and one number gives the same physical radius on both axes since the SDF works in height units and multiplies x by the aspect.',
    },
  ],

  pitfalls: [
    'Cross-fading two layouts instead of blending their parameters. `lerp(f(a), f(b), s)` moves every card along the straight line between its two homes, so the drum passes through its own axis and the cards slide through one another. Interpolate the inputs and the shape is always a real member of the family.',
    'Reaching for `if (layout === "drum")` in the frame loop. Branching per layout means each new arrangement is new code and no pair of them can be shown halfway. Every parameter here is a number precisely so it can be tweened, and the presets are data.',
    'Multiplying a whole layout to zero and calling that a morph. Scaling `radius` to 0 does not produce a flat row — it produces every card stacked on the axis. A second term (`rowSpread * step`) has to take over as the first one leaves, which is why the row and the ring are separate parameters rather than one.',
    'Letting the transparent cards share a z. three ranks transparent meshes by view depth; with a flat layout at z = 0 the ranking is arbitrary and the overlap in a stack flips as the ring drifts. The `depth` parameter exists to keep the ordering strict.',
    'Copying the bend-in-the-vertex-shader approach and keeping frustum culling on. That combination blanks planes that are plainly on screen, because the bounding sphere describes the flat geometry at the CPU position. This component avoids the whole class of problem by keeping the layout on the CPU — but the two approaches cannot be mixed carelessly.',
    'Guessing the row step in world units. Hard-code it and the row overflows a narrow viewport and floats in the middle of a wide one. It has to come from the frustum: `2 * cameraZ * tan(fov / 2) * aspect`, divided across the set.',
    'Calling `renderer.dispose()` and stopping there. It frees GPU objects but leaves the WebGL context alive, and Chromium kills the oldest context once about sixteen exist — so an unrelated canvas elsewhere on the page goes black. `disposeRenderer` calls `forceContextLoss()`, which is the call that actually hands it back.',
    'Building the colours with `new THREE.Color(...)` from a hex string and expecting them to match the CSS beside them. Colours have to enter the linear working space (`setHSL(..., THREE.SRGBColorSpace)`) and the fragment shader has to end with `#include <colorspace_fragment>`, because three injects that chunk only into its own materials, never into a `ShaderMaterial`.',
    'Passing `params` as an inline object literal and putting it straight in the effect deps. It is a new reference every render, so the morph tween is killed and rebuilt on each one and the parameters never arrive. The override is compared by value through a serialised key.',
    'Rendering every frame regardless. The loop is gated on the element being in view and the tab being visible; a scrolled-past WebGL canvas that keeps drawing is one of the easier ways to halve a page\'s battery life for nothing.',
  ],

  notes: [
    'The four presets are ordinary data — add a fifth by adding seven numbers, with no new code and no new branch. Any two of them can also be blended by hand at a fixed `s` by passing `params`.',
    'Each card owns a cloned `ShaderMaterial` so it can hold its own colours, but three keys its program cache on the shader source, so all twelve still share one compiled program and the clone costs a uniform bag.',
    'Nothing is fetched and no image ships: the card face — rounded rectangle, gradient, hairlines, rim — is a signed distance field in the fragment shader, and the shading of a card turning edge-on is one dot product against the transformed normal.',
  ],

  apiSignature:
    "function LayoutLerpScalar(props: { count?: number; layout?: 'row' | 'column' | 'drum' | 'fan'; params?: Partial<LayoutParams>; duration?: number; drift?: number; hueStart?: number; hueStep?: number; opacity?: number; onFocusChange?: (index: number) => void; className?: string }): JSX.Element",

  props: [
    { name: 'count', type: 'number', default: '12', description: 'How many cards. They wrap, so this is also the ring\'s period.' },
    { name: 'layout', type: "'row' | 'column' | 'drum' | 'fan'", default: "'drum'", description: 'Which preset the parameter vector is tweened toward.' },
    { name: 'params', type: 'Partial<LayoutParams>', description: 'Overrides individual scalars on top of the preset — radius, spacing, rowSpread, turns, depth, focus, scale. Compared by value.' },
    { name: 'duration', type: 'number', default: '1.25', description: 'Seconds of the morph between presets.' },
    { name: 'drift', type: 'number', default: '0.16', description: 'Index steps per second of idle travel. 0 parks the ring.' },
    { name: 'hueStart', type: 'number', default: '232', description: "First card's hue, 0-360." },
    { name: 'hueStep', type: 'number', default: '17', description: 'Degrees of hue between adjacent cards.' },
    { name: 'opacity', type: 'number', default: '1', description: 'Alpha multiplier applied before the focus falloff.' },
    { name: 'onFocusChange', type: '(index: number) => void', description: 'Fires when a different card takes the focus position.' },
    { name: 'className', type: 'string', description: 'Merged onto the wrapper. The canvas fills it absolutely.' },
  ],

  reducedMotion:
    'The idle drift is set to zero, so the ring holds still and the same card stays in focus. Layout changes still happen — refusing them would leave the component unable to answer its own prop — but the parameters are assigned rather than tweened, so the new arrangement is simply there on the next frame with nothing travelling across the screen. The frame loop keeps running only because it is what draws; with no drift and no tween it writes the same transforms every frame.',

  cleanup:
    'Kills the parameter tween (and any tween of the same object) so GSAP cannot write into a vector nothing reads; removes every mesh from the scene, then `disposeObject` for the materials, `geometry.dispose()`, `prototype.dispose()`, and `disposeRenderer` — which stops the animation loop, disposes, calls `forceContextLoss()` and zeroes the backing store — before removing the canvas from the DOM. The shared rAF unsubscribes, and the shared resize, intersection and visibility observers all unregister. No textures are allocated, so there are none to leak.',

  acceptance:
    'The cards turn slowly and endlessly — watch one leave the bottom of the drum and come back at the top, at the same spacing. Switch layout: the whole formation unwinds into a row, or collapses into a stack, in one continuous motion, and at every instant it looks like a formation rather than cards travelling to new addresses. Nothing passes through the centre of the drum on the way. Switch layout twice quickly and the second morph starts from wherever the first had reached, with no jump. In the stack, the overlap order is stable while it drifts — nothing flickers in front of its neighbour. Resize the window from narrow to wide: the row still spans the frame and the cards keep their proportions. Scroll the canvas out of view and the GPU goes quiet.',

  criticalRegion: 'critical',
};

export default meta;
