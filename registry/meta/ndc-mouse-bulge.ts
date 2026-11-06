import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'ndc-mouse-bulge',
  title: 'In-Shader Mouse Bulge',
  category: 'webgl',
  tags: ['three', 'pointer', 'vertex-shader', 'ndc', 'glsl'],
  blurb:
    'A soft lens that follows the cursor, measured by projecting every vertex to screen space instead of raycasting.',
  cost: 'webgl',
  motif: 'noise',

  files: [
    { path: 'registry/ui/ndc-mouse-bulge.tsx', type: 'registry:ui', role: 'component' },
    { path: 'registry/shaders/ndc-mouse-bulge.ts', type: 'registry:lib', role: 'shader' },
  ],
  dependencies: ['three@^0.185.1'],

  summary:
    'The pointer is a screen-space quantity and the mesh is a world-space one, so something has to convert between them. Instead of unprojecting the pointer on the CPU with a raycaster, every vertex projects ITSELF once, compares its own normalised device position against the pointer, and displaces by the result. Each vertex gets an exact distance, the cost is one extra matrix multiply per vertex, and nothing about it depends on the CPU knowing the mesh\'s real shape.',

  mechanism: [
    'The vertex shader runs `projectionMatrix * modelViewMatrix * vec4(pos, 1.0)` twice. The first is a probe: dividing its xy by w gives this vertex\'s own NDC position, which is the only common space the pointer and the geometry both live in.',
    'NDC spans -1..1 on both axes whatever the viewport is, so a raw distance is stretched by the aspect ratio. The x component of the delta is multiplied by `uAspect` before the length is taken, which is what keeps the lens circular on a 16:9 canvas instead of an ellipse 1.78 times too wide.',
    'The weight is `exp(-dot(delta, delta) * falloff)`. A Gaussian never actually reaches zero, so there is no radius at which the deformation visibly stops, and its derivative is continuous, so the sheen has no hard edge either — a smoothstep would give both a visible boundary ring.',
    'The vertex is lifted by `bulge * uLift` and the weight is passed to the fragment shader, which pushes the centred UV outward by `centered * vBulge * uMagnify`. Lift alone is a bump; lift plus UV magnification is a lens, and that is the difference between a dent in the surface and glass sitting on top of it.',
    'The second projection is the one that ships the vertex, evaluated after the displacement the first one made possible. The extra matrix multiply per vertex is the entire cost of the technique.',
    'The strength uniform is damped toward the pointer\'s active state rather than switched, so the lens fades in on enter and out on leave instead of appearing at, and vanishing from, the last known position.',
  ],

  constants: [
    {
      name: 'falloff',
      value: '5',
      why: 'Tightness of the Gaussian in aspect-corrected NDC units, where the full viewport is 2 wide. At 5 the lens is roughly a third of the height across. Below ~2 it swells to cover the whole plane and reads as a global warp; above ~15 it collapses to a pinpoint that the vertex grid cannot resolve smoothly.',
    },
    {
      name: 'lift',
      value: '0.5',
      why: 'World units the crown rises, against a plane about 2.5 units tall at a camera distance of 3. Above ~1.2 the crown passes the camera\'s near plane and the lens punches a hole through itself when the cursor is centred.',
    },
    {
      name: 'magnify',
      value: '0.12',
      why: 'UV displacement at the crown. This is what makes it a lens rather than a bump. Above ~0.3 the magnification outruns the geometry, the texture visibly slides across the surface, and the illusion of glass breaks into a smear.',
    },
    {
      name: 'sheen',
      value: '0.18',
      why: 'Extra brightness at the crown. Small on purpose: the eye reads a slight highlight as curvature, and anything past ~0.4 reads as a blown-out light source instead.',
    },
    {
      name: 'segments',
      value: '128',
      why: 'The bulge is per-vertex, so the mesh density is the resolution of the lens. At 16 the Gaussian resolves into a faceted pyramid chasing the cursor; past ~192 the extra vertices land inside a single pixel of the highlight.',
    },
    {
      name: 'STRENGTH_SMOOTHING',
      value: '0.0008',
      why: 'Fraction of the gap left after one second, so the lens fades in over roughly a fifth of a second. Instant switching leaves the lens visible at the last known position for one frame after the cursor leaves, which flickers.',
    },
    {
      name: 'pointer smoothing',
      value: '0.0008',
      why: 'Matches the strength smoothing so the lens grows and moves at the same rate. A pointer smoothed much harder than the strength arrives late and the lens appears to be dragged; much softer and it inherits every jitter in the raw pointer stream.',
    },
    {
      name: 'CAMERA_FOV / CAMERA_Z',
      value: '45 / 3',
      why: 'Sets how much perspective the lift reads against. At a narrow FOV the raised crown barely changes size and the bulge looks flat; at a wide one the plane\'s own edges keystone enough to compete with the effect.',
    },
  ],

  pitfalls: [
    'Comparing raw NDC distances. NDC is -1..1 on both axes regardless of the viewport, so on a 16:9 canvas the falloff is 1.78 times wider than it is tall and the lens is a visible ellipse. The x component of the delta is weighted by the aspect before the length is taken.',
    'Raycasting the pointer against the plane instead. It costs a matrix inversion per frame, returns exactly one hit point, and — decisively — it intersects the CPU-side geometry, which this shader has already moved. Once anything displaces vertices, the raycast answers a question about a surface that is not on screen.',
    'Projecting once and reusing `gl_Position`. The probe has to happen before the displacement and the final projection has to happen after it, so the two cannot be shared. Displacing after computing `gl_Position` simply has no effect at all.',
    'Using a linear or smoothstep falloff. Both reach exactly zero at a finite radius, which draws a visible ring on the surface where the deformation stops. The Gaussian is asymptotic and leaves no boundary.',
    'Lifting the vertex without magnifying the UV. The result is a bump, not a lens — the surface moves but the image printed on it does not, so it reads as a dent in a rigid sheet rather than glass laid over it.',
    'Leaving `frustumCulled` on. The lift happens after the bounding sphere was computed, so three can decide a plane that is filling the viewport is off screen and blank it.',
    'Sizing the plane from the container\'s pixel dimensions. The plane has to cover the frustum at z = 0, which is `2 * tan(fov/2) * distance` tall; a pixel width has no fixed relationship to that and the plane ends up short of the edges or overscaled.',
    'Forgetting to update `uAspect` on resize. The lens silently turns elliptical the moment the container reshapes, and because it still follows the cursor correctly the bug looks like a design decision.',
    'Calling `renderer.dispose()` alone on unmount. GPU objects are freed but the WebGL context survives, and Chromium drops the oldest once a renderer process holds about 16. `disposeRenderer` calls `forceContextLoss`.',
  ],

  notes: [
    '`useSmoothPointer` already exposes `ndcX` / `ndcY`, so the pointer reaches the uniform without a single conversion and without a cached bounding rect that could go stale on scroll.',
    'This is the same two-projections-per-vertex trick `cylinder-gallery` uses; there it has to be in-shader, because the CPU geometry is a flat plane and the visible drum exists only on the GPU.',
  ],

  apiSignature:
    'function NdcMouseBulge(props: { strength?: number; falloff?: number; lift?: number; magnify?: number; sheen?: number; segments?: number; paint?: (ctx: CanvasRenderingContext2D, size: { width: number; height: number }) => void; className?: string }): JSX.Element',

  props: [
    { name: 'strength', type: 'number', default: '1', description: 'Peak displacement weight. 0 disables the effect.' },
    { name: 'falloff', type: 'number', default: '5', description: 'Gaussian tightness. Higher is a smaller, sharper lens.' },
    { name: 'lift', type: 'number', default: '0.5', description: 'World units the crown of the bulge rises toward the camera.' },
    { name: 'magnify', type: 'number', default: '0.12', description: 'How far the lens magnifies at the crown, in UV units.' },
    { name: 'sheen', type: 'number', default: '0.18', description: 'Extra brightness at the crown.' },
    { name: 'segments', type: 'number', default: '128', description: 'Plane subdivisions per axis. The resolution of the lens.' },
    { name: 'paint', type: '(ctx, size) => void', description: 'Override the surface. Receives a 2D context for a 1024x1024 canvas.' },
    { name: 'className', type: 'string', description: 'Merged onto the wrapper via `cn`.' },
  ],

  reducedMotion:
    'The strength target is held at 0, so no vertex is ever displaced, the UV is never magnified and no sheen appears — the surface is a completely static image that ignores the pointer. The value is still damped to zero rather than assigned, so a lens that is on screen when the preference changes retracts smoothly instead of popping flat.',

  cleanup:
    'Removes the mesh from the scene, disposes the `CanvasTexture` explicitly because it sits inside `material.uniforms` beyond `disposeObject`\'s reach, runs `disposeObject` over the scene, disposes the geometry and material, then `disposeRenderer` — `setAnimationLoop(null)`, `dispose()`, `forceContextLoss()` — and removes the canvas from the DOM. The stage ref is nulled first so a frame already queued on the shared RAF loop exits before touching anything. `useSmoothPointer` removes its own listeners on unmount.',

  acceptance:
    'Move the cursor over the surface and a round highlight follows it, swelling the lattice cells underneath rather than merely brightening them. The highlight is circular at any container aspect — resize from square to wide and it stays round. It has no visible outer edge or ring where the effect stops. Leave the surface and the lens retracts over about a fifth of a second rather than vanishing. Nothing changes when the cursor moves outside the component. With `prefers-reduced-motion: reduce` the surface is completely inert and the cursor has no effect at all.',

  criticalRegion: 'critical',
};

export default meta;
