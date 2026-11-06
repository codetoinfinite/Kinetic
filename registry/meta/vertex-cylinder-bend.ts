import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'vertex-cylinder-bend',
  title: 'Vertex Shader Cylinder Bend',
  category: 'webgl',
  tags: ['three', 'vertex-shader', 'glsl', 'geometry', 'curvature'],
  blurb:
    'A flat plane wrapped around a cylinder on the GPU, with the curvature living in a uniform you can animate.',
  cost: 'webgl',
  motif: 'rings',

  files: [
    {
      path: 'registry/ui/vertex-cylinder-bend.tsx',
      type: 'registry:ui',
      role: 'component',
    },
    {
      path: 'registry/shaders/vertex-cylinder-bend.ts',
      type: 'registry:lib',
      role: 'shader',
    },
  ],
  dependencies: ['three@^0.185.1'],

  summary:
    'The bend on its own, with no gallery attached. A flat `PlaneGeometry` is fed to a vertex shader that reads each vertex\'s x coordinate as an arc parameter and re-emits it on the surface of a cylinder. Because curvature is a uniform rather than a mesh, the same buffer is flat, bowed or nearly closed between two frames — no `CylinderGeometry`, no rebuild, no re-upload.',

  mechanism: [
    'Curl is defined as radians of bend per world unit of plane width, so the radius is its reciprocal: `radius = 1.0 / curl`. A 3-unit plane at curl 0.62 wraps 1.86 rad of a circle of radius 1.61, and the arc length is still exactly 3 units — the banner bends without appearing to shrink.',
    '`angle = uSpin + position.x * curl`, then `pos.x = radius * sin(angle)` and `pos.z = radius * cos(angle) - radius`. The trailing `- radius` pins the arc\'s midpoint at z = 0 so tightening the curl bends the ends away instead of lunging the whole banner at the camera.',
    'The vertical bow is `pos.y = sin(position.y * k) / k`, which tends to `position.y` as k tends to 0 and becomes a full sine bow at k = 1. Normalising by k is what keeps the plane the same height at every bow depth.',
    'The surface normal is available in closed form: differentiating the position gives tangents `(cos a, 0, -sin a)` and `(0, 1, 0)`, whose cross product is `(sin a, 0, cos a)`. Its z component — `cos(angle)` — is how squarely the patch faces the camera, so the shading term costs one cosine and no `normalMatrix`.',
    'On resize the camera is moved rather than the plane resized: `distance = max(width / fit / (2 tan(fov/2) aspect), height / fit / (2 tan(fov/2)))`. The plane\'s world width is the yardstick `curl` is measured in, so it must never change with the viewport.',
  ],

  constants: [
    {
      name: 'PLANE_WIDTH / PLANE_HEIGHT',
      value: '3 / 1.4',
      why: 'Fixed world units on purpose. Curl is radians per world unit, so a plane that resized with the viewport would bend through a different total angle on every device — the same `curl` prop would mean something different on a phone.',
    },
    {
      name: 'curl',
      value: '0.62',
      why: 'Times the 3-unit width, this is 1.86 rad — about 106 degrees of arc. Under ~0.25 the bend is indistinguishable from a perspective skew; over ~1.6 the far edges pass 90 degrees from the camera, present zero pixels of width, and the banner appears to have been cut off.',
    },
    {
      name: 'curlSwing',
      value: '0.22',
      why: 'Amplitude of the idle breathing. Large enough that the curvature is visibly a live value rather than a baked mesh; large enough to pass 1.6 total and the ends would clip away at the peak of every cycle.',
    },
    {
      name: 'barrel',
      value: '0.3',
      why: 'k in `sin(k*y)/k`. At 0 the top and bottom edges are dead straight and the surface reads as a rolled poster; past ~1.2 the bow overtakes the curl and the plane looks like a saddle rather than a cylinder.',
    },
    {
      name: 'segments',
      value: '96',
      why: 'Subdivisions across the bend — the resolution of the curve, since it is evaluated per vertex. Below ~24 the arc becomes a visible polyline and the shading term steps in bands; above ~192 the extra vertices land inside a single pixel.',
    },
    {
      name: 'PlaneGeometry y-segments',
      value: '16',
      why: 'The cylinder bend is a function of x alone, so rows would be pure waste — except the barrel bow, which needs enough rows to curve rather than kink at the midline.',
    },
    {
      name: 'FIT',
      value: '0.86',
      why: 'Fraction of the frustum the banner fills. At 1.0 the receding edges touch the viewport border and the curl has nowhere to read against; below ~0.7 the component is mostly empty space.',
    },
    {
      name: 'shade',
      value: '0.55',
      why: 'How far the facing term is allowed to darken the edges. At 0 the bend reads as a flat trapezoid — a perspective mistake rather than a curve. At 1 the edges go fully black and the banner appears to end early.',
    },
  ],

  pitfalls: [
    'Dividing by `curl` without a guard. The flat case is curl 0, which is an infinite radius: `1.0 / 0.0` in GLSL yields infinity, every vertex becomes NaN, and the mesh vanishes with no error anywhere. The shader clamps to 0.0001 and approaches flat instead.',
    'Omitting the `- radius` term from `pos.z`. The arc is then centred on the cylinder\'s axis rather than on the origin, so raising the curl walks the entire banner toward the camera and it appears to lunge every time the curvature changes.',
    'Bowing with a bare `sin(position.y)`. That silently rescales the plane — a 1.4-tall plane becomes 1.29 tall — so animating the bow makes the banner pulse in size. Normalising by k (`sin(k*y)/k`) keeps the height fixed at every depth.',
    'Leaving `frustumCulled` on. The bounding sphere describes the flat plane the shader has already moved, so at a hard curl three decides the banner is off screen and blanks it while it is plainly in view.',
    'Keeping the default `FrontSide`. The bend turns the far edges past 90 degrees from the camera, and single-sided faces punch clean holes through the ends of the banner at high curl.',
    'Resizing the plane geometry to fit the container. `curl` is radians per world unit, so a viewport-sized plane bends through a different total angle on every device and the prop stops meaning anything. Move the camera instead — and fit on the larger of the two required distances, or the banner is cropped on whichever axis is tighter.',
    'Texturing it with a smooth gradient. The bend is then almost invisible, because there is no structure for the foreshortening to compress. Evenly spaced vertical rules bunch toward the receding edges and make the curvature legible.',
    'Calling `renderer.dispose()` and stopping there. That frees GPU objects but keeps the WebGL context; Chromium caps a renderer process at roughly 16 and silently kills the oldest. `disposeRenderer` calls `forceContextLoss`.',
  ],

  notes: [
    'This is the primitive that `cylinder-gallery` instantiates nineteen times. Isolated here so the arc maths can be read without the layout, focus and picking code around it.',
    'The normal is derived analytically rather than by recomputing vertex normals on the CPU, so `geometry.computeVertexNormals()` is never called and the buffer stays untouched after upload.',
  ],

  apiSignature:
    'function VertexCylinderBend(props: { curl?: number; curlSwing?: number; parallax?: number; barrel?: number; shade?: number; segments?: number; period?: number; paint?: (ctx: CanvasRenderingContext2D, size: { width: number; height: number }) => void; className?: string }): JSX.Element',

  props: [
    { name: 'curl', type: 'number', default: '0.62', description: 'Radians of bend per world unit of plane width. 0 is flat.' },
    { name: 'curlSwing', type: 'number', default: '0.22', description: 'Peak extra curl added by the idle breathing cycle.' },
    { name: 'parallax', type: 'number', default: '0.34', description: 'Radians the banner rocks around the drum axis at full pointer travel.' },
    { name: 'barrel', type: 'number', default: '0.3', description: 'Vertical bow. 0 leaves the edges straight, ~1 is a full sine.' },
    { name: 'shade', type: 'number', default: '0.55', description: 'How far the facing term darkens the receding edges.' },
    { name: 'segments', type: 'number', default: '96', description: 'Subdivisions across the bend. This is the resolution of the curve.' },
    { name: 'period', type: 'number', default: '9', description: 'Seconds per breathing cycle.' },
    { name: 'paint', type: '(ctx, size) => void', description: 'Override the banner face. Receives a 2D context for a 1024x512 canvas.' },
    { name: 'className', type: 'string', description: 'Merged onto the wrapper via `cn`.' },
  ],

  reducedMotion:
    'The breathing cycle is dropped: `uCurl` holds at the `curl` prop and never oscillates, so nothing moves on its own. The pointer rock is kept, because it is a direct one-to-one response to the user\'s own input rather than autonomous motion, and removing it would leave a component that ignores the cursor entirely.',

  cleanup:
    'Removes the mesh from the scene, disposes the `CanvasTexture` explicitly (it lives inside `material.uniforms`, out of `disposeObject`\'s reach), runs `disposeObject` over the scene, disposes the geometry and material, then `disposeRenderer` for `setAnimationLoop(null)` / `dispose()` / `forceContextLoss()`, and removes the canvas from the DOM. The stage ref is nulled first, so any frame already queued returns immediately instead of touching a lost context.',

  acceptance:
    'The banner is visibly a section of a cylinder, not a skewed rectangle: the vertical rules bunch together toward both ends and the ends are darker than the middle. Over about nine seconds the curvature tightens and relaxes and the banner never changes size while it does. Move the cursor left and right and the whole arc rocks around its axis, following with a slight lag. Resize the container from wide to narrow and the banner stays fully in frame with the same amount of bend. With `prefers-reduced-motion: reduce` the curvature is frozen but the cursor rock still works.',

  criticalRegion: 'critical',
};

export default meta;
