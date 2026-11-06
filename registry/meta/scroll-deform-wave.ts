import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'scroll-deform-wave',
  title: 'Scroll Deformation Wave',
  category: 'webgl',
  tags: ['three', 'scroll', 'vertex-shader', 'velocity', 'glsl'],
  blurb:
    'An image that ripples with scroll speed and bends the other way on the way back, from two sine terms.',
  cost: 'webgl',
  motif: 'wave',

  files: [
    { path: 'registry/ui/scroll-deform-wave.tsx', type: 'registry:ui', role: 'component' },
    { path: 'registry/shaders/scroll-deform-wave.ts', type: 'registry:lib', role: 'shader' },
  ],
  dependencies: ['three@^0.185.1'],

  summary:
    'Signed, smoothed scroll velocity drives a single scalar, and that scalar scales two sine displacements in the vertex shader. Because the velocity keeps its sign, scrolling up bends the surface the opposite way from scrolling down, which is the direction cue that makes the effect read as momentum rather than as noise. Everything else — the wave shape, the shading, the crop — is a pure function of that one number.',

  mechanism: [
    'The depth term is `pos.z += sin(position.y * frequency + phase) * deform * amplitude`, and the shear term is `pos.y += sin(position.x * frequency) * deform * shear`. Both are sampled from `position` — the original flat attribute — not from the running `pos`.',
    'That distinction is the whole technique. Sampling `position` fixes the wave to the picture, so a given pixel always sits at the same point on the sine and the image appears to flex. Sampling the already-displaced `pos` would make each term feed the next, so the wave travels through the surface and reads as a glitch.',
    'The phase constant breaks the symmetry. Without it, `sin(y * f)` is odd about the plane\'s centre line and the top and bottom halves mirror each other exactly, which looks like a crease rather than a wave.',
    'The slope, not the height, drives the shading: `vBend = cos(position.y * frequency + phase) * deform` is the analytic derivative of the depth term, so crests brighten and troughs darken with one cosine and no recomputed vertex normals.',
    '`useScrollVelocity` supplies a two-stage smoothed signal — a low-pass on the raw delta, then a damped approach — and the component damps once more on top of it with a 0.0025 smoothing factor, so the ripple eases out for a beat after the scroll stops instead of snapping flat.',
    'The fragment shader cover-fits the source into the quad and divides the sampled window by an overscan factor, which is what keeps the displaced vertices from sampling past the texture edge at the crest of every wave.',
  ],

  constants: [
    {
      name: 'amplitude',
      value: '0.07',
      why: 'World units of depth at full deflection, against a plane roughly 2.5 units tall. Below ~0.02 the ripple is lost in the perspective foreshortening; above ~0.2 the crests swing far enough toward the camera to cross the near plane and punch holes in the image.',
    },
    {
      name: 'shear',
      value: '0.04',
      why: 'Deliberately about half the amplitude. Its only job is to break the perfectly horizontal banding so the surface reads as cloth; raise it toward the amplitude and the two waves beat against each other into a visible moire.',
    },
    {
      name: 'frequency',
      value: '3',
      why: 'Radians per world unit, so roughly one and a half crests across the visible plane. Below ~1.5 there is less than a full wave on screen and the image just tilts; above ~8 the crests fall closer together than the vertex spacing and the wave aliases into flicker.',
    },
    {
      name: 'phase',
      value: '100',
      why: 'An arbitrary large offset whose only purpose is to be nowhere near a multiple of pi. At phase 0 the sine is odd about the plane\'s centre, the halves mirror, and the ripple looks like a fold down the middle.',
    },
    {
      name: 'maxDeform',
      value: '1.5',
      why: 'Ceiling on the signed scalar, so a trackpad flick cannot drive the displacement past the point where the surface self-intersects. Everything downstream multiplies by this, so it is the one number that bounds the entire effect.',
    },
    {
      name: 'reference',
      value: '900 px/s',
      why: 'Scroll speed that counts as full deflection. The hook defaults to 1500, which is tuned for whole-page parallax; a component-sized scroller rarely reaches it, so the wave would never appear.',
    },
    {
      name: 'DEFORM_SMOOTHING',
      value: '0.0025',
      why: 'Fraction of the gap remaining after one second. Slower and the wave lags visibly behind the scroll; much faster and it snaps flat the instant scrolling stops, losing the ease-out that makes it feel like momentum.',
    },
    {
      name: 'overscan',
      value: '1.12',
      why: 'Twelve percent crop held in reserve. At exactly 1.0 the displaced vertices sample past the edge of the texture at every crest and the clamped border pixel smears across the top and bottom of the image.',
    },
    {
      name: 'segments',
      value: '96',
      why: 'The wave is evaluated per vertex, so subdivision is its resolution. Below ~32 the sine renders as a polyline and the shading term steps in visible bands; above ~160 the vertices land inside a single pixel and only cost transform time.',
    },
    {
      name: 'shade',
      value: '0.22',
      why: 'How far the slope term swings brightness. At 0 the ripple is nearly invisible on a busy image; above ~0.5 the crests blow out to white and read as a lighting bug rather than as a surface.',
    },
  ],

  pitfalls: [
    'Sampling the wave from the running `pos` instead of the original `position`. Each term then feeds the next, the ripple travels through the surface as it deforms rather than staying pinned to the image, and the effect looks like a rendering fault instead of the photograph flexing.',
    'Taking the magnitude of the velocity. `abs(velocity)` makes scrolling up and scrolling down produce an identical wave, which throws away the direction cue that carries most of the effect. The scalar stays signed all the way into the uniform.',
    'Using a phase of 0. `sin(y * f)` is odd about the plane\'s centre, so the top and bottom halves mirror each other exactly and the ripple reads as a crease down the middle rather than a wave.',
    'Feeding raw scroll deltas into the uniform. A wheel emits discrete steps and a trackpad emits bursts; either drives the geometry into visible stutter. The signal is low-passed, damped, and damped again before it reaches the shader.',
    'Leaving `frustumCulled` on. The bounding sphere was computed for the flat plane, so when the component sits at the edge of the viewport three culls it against geometry the shader has already moved and the image blinks out mid-ripple.',
    'Fitting the plane with `window.innerWidth`. The plane has to cover the camera\'s frustum at z = 0, which is `2 * tan(fov/2) * distance` tall — a pixel width has no fixed relationship to that, so the image ends up letterboxed or overscaled depending on the viewport.',
    'Skipping the overscan. Displaced vertices sample outside [0,1] at the crest of every wave, and the texture\'s clamped border smears along the top and bottom edges exactly when the wave is at its most visible.',
    'Passing a ref to `scrollTarget`. The hook takes an `HTMLElement | null`, not a ref object, so a scroller inside the component has to be captured with a callback ref into state before it can be handed over — a plain ref would still be null on the render that matters.',
    'Calling `renderer.dispose()` alone. That frees GPU objects and leaves the context alive; a page with several WebGL components then hits Chromium\'s per-process cap and the oldest canvases go blank. `disposeRenderer` calls `forceContextLoss`.',
  ],

  notes: [
    '`scrollTarget` defaults to `null`, which reads `window.scrollY`. Pass the scrolling element when the component lives inside its own `overflow-y-auto` container, as the demo does.',
    'The plane is a unit quad rescaled on resize rather than rebuilt, so a container resize never reallocates a 96x96 vertex buffer.',
  ],

  apiSignature:
    'function ScrollDeformWave(props: { scrollTarget?: HTMLElement | null; amplitude?: number; shear?: number; frequency?: number; phase?: number; maxDeform?: number; reference?: number; shade?: number; overscan?: number; segments?: number; paint?: (ctx: CanvasRenderingContext2D, size: { width: number; height: number }) => void; className?: string }): JSX.Element',

  props: [
    { name: 'scrollTarget', type: 'HTMLElement | null', default: 'null', description: 'Element whose scrollTop drives the wave. null reads window.scrollY.' },
    { name: 'amplitude', type: 'number', default: '0.07', description: 'Depth of the ripple in world units at full deflection.' },
    { name: 'shear', type: 'number', default: '0.04', description: 'Vertical shear, which breaks up the horizontal banding.' },
    { name: 'frequency', type: 'number', default: '3', description: 'Spatial frequency of the sine, in radians per world unit.' },
    { name: 'phase', type: 'number', default: '100', description: 'Phase offset, so the wave is not symmetric about the plane centre.' },
    { name: 'maxDeform', type: 'number', default: '1.5', description: 'Clamp on the signed deform scalar.' },
    { name: 'reference', type: 'number', default: '900', description: 'Pixels per second of scroll that count as full deflection.' },
    { name: 'shade', type: 'number', default: '0.22', description: 'How far the slope term brightens crests and darkens troughs.' },
    { name: 'overscan', type: 'number', default: '1.12', description: 'Crop held in reserve so displaced vertices never sample past the edge.' },
    { name: 'segments', type: 'number', default: '96', description: 'Plane subdivisions per axis. The resolution of the wave.' },
    { name: 'paint', type: '(ctx, size) => void', description: 'Override the image. Receives a 2D context for a 1024x1024 canvas.' },
    { name: 'className', type: 'string', description: 'Merged onto the wrapper via `cn`.' },
  ],

  reducedMotion:
    'The deform scalar is forced to 0 regardless of scroll velocity, and it is still damped there, so a component that is mid-ripple when the preference changes eases flat rather than snapping. The image then stays perfectly still while scrolling — the cover fit and the resize handling continue to work, but no vertex is ever displaced and no shading swing occurs.',

  cleanup:
    'Removes the mesh from the scene, disposes the `CanvasTexture` by hand because it lives inside `material.uniforms` where `disposeObject` does not look, runs `disposeObject` over the scene, disposes the geometry and the material, then `disposeRenderer` for `setAnimationLoop(null)` / `dispose()` / `forceContextLoss()`, and removes the canvas element. The stage ref is nulled first so a queued frame is a no-op. `useScrollVelocity` unsubscribes with the shared RAF loop it was registered on.',

  acceptance:
    'Scroll the container and the image ripples in horizontal bands, with the crests catching a little more light than the troughs. Scroll the other way and the bands bow the opposite direction. Stop and the surface eases flat over about half a second rather than snapping. Flick hard and the ripple deepens but never folds through itself or shows a smeared edge. The image keeps its own proportions at any container aspect, and scrolling the page while the component is off screen costs nothing because the loop is gated on visibility. With `prefers-reduced-motion: reduce` the image is completely still at every scroll speed.',

  criticalRegion: 'critical',
};

export default meta;
