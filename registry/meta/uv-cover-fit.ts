import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'uv-cover-fit',
  title: 'Cover-Fit UV Maths',
  category: 'webgl',
  tags: ['three', 'glsl', 'uv', 'aspect-ratio', 'fragment-shader'],
  blurb:
    'object-fit: cover for a textured quad, solved in UV space so the crop follows a frame that reshapes every frame.',
  cost: 'webgl',
  motif: 'grid',

  files: [
    { path: 'registry/ui/uv-cover-fit.tsx', type: 'registry:ui', role: 'component' },
    { path: 'registry/shaders/uv-cover-fit.ts', type: 'registry:lib', role: 'shader' },
  ],
  dependencies: ['three@^0.185.1'],
  registryDependencies: [],

  summary:
    'A shader has no box to crop, so `object-fit: cover` has to happen on the texture coordinates before the sample. The fit is a pure function of two numbers — the texture aspect and the quad aspect — which means the quad can be reshaped on every frame and the crop simply follows, with no re-upload and no CPU work. The frame here cycles from tall to wide continuously, because a cover fit only ever tested at one aspect ratio has not been tested.',

  mechanism: [
    'The sampled window starts at the full texture, `scale = vec2(1.0)`, and is only ever narrowed. If `textureAspect > planeAspect` the texture has surplus width, so `scale.x = planeAspect / textureAspect`; otherwise it has surplus height and `scale.y = textureAspect / planeAspect`. Exactly one axis shrinks and the other reaches both edges of the image.',
    'The leftover slack is `1 - scale`, and multiplying it by the focal point places that slack: `offset = (1.0 - scale) * uFocal`. At a focal of 0.5 the sampled window is `[(1-s)/2, (1+s)/2]` — centred — while 0 pins the crop to the left or top edge and 1 to the right or bottom.',
    'The final coordinate is `vUv * scale + offset`, which is guaranteed to stay inside [0,1] because scale is never greater than 1 and offset is exactly the remaining room. Nothing has to be clamped and no branch depends on the fragment.',
    'Overscan divides the scale further, shrinking the window past a strict fit. That reserve is what a vertex displacement elsewhere in a pipeline eats into: with no reserve, a wave or a bulge pushes a coordinate past the sampled region and the texture\'s clamped border smears along the edge.',
    'The frame is driven by an eased triangle wave with a hold at each end, and its scale is fitted to the viewport by the contain rule — `frameAspect > maxW / maxH ? width-limited : height-limited` — so the tall end of the cycle stays fully on screen rather than running off the top and bottom.',
  ],

  constants: [
    {
      name: 'minAspect / maxAspect',
      value: '0.62 / 2.3',
      why: 'The range the frame sweeps. Both ends have to sit clearly on opposite sides of the source\'s own 16:9 so the shader is seen switching which axis it crops; a range that stays on one side of the texture aspect never exercises the other branch at all.',
    },
    {
      name: 'period / hold',
      value: '8 s / 0.12',
      why: 'Twelve percent of the cycle parked at each extreme. Without a hold the frame is only ever momentarily at its widest and the eye never gets to check the crop; past ~0.25 the component spends more time still than moving.',
    },
    {
      name: 'fill',
      value: '0.84',
      why: 'Fraction of the container the frame occupies at its largest. At 1.0 the frame is flush with the edges and its reshaping is invisible because there is no background to reshape against.',
    },
    {
      name: 'overscan',
      value: '1',
      why: 'Exactly 1 is a strict fit and the right default when nothing displaces the geometry. Raise it — 1.12 is the value `cylinder-gallery` uses — only when vertices move after the UV is computed; every increment past 1 is crop permanently thrown away.',
    },
    {
      name: 'focal',
      value: '[0.5, 0.5]',
      why: 'Centres the slack on both axes. 0 or 1 pins the crop to an edge, which is what a subject-aware crop wants; anything outside [0,1] pushes the window off the texture and samples the clamped border.',
    },
    {
      name: 'texture size',
      value: '1200 x 675',
      why: 'A deliberately 16:9 source, so both branches of the fit are exercised as the frame sweeps past that ratio. The absolute size only sets sampling quality.',
    },
    {
      name: 'grid cell',
      value: 'width / 16',
      why: 'Square cells measured in source pixels. They are the test instrument: under a correct cover fit they stay square at every frame aspect, and the moment the maths degrades into a stretch they visibly become rectangles.',
    },
  ],

  pitfalls: [
    'Scaling the short axis up rather than the long axis down. `scale.y = planeAspect / textureAspect` when that ratio exceeds 1 pushes the sampled window past the edge of the texture, and with the default `RepeatWrapping` the far side of the image wraps into view as a bright seam across the frame.',
    'Passing the container\'s aspect ratio as `uPlaneAspect`. The uniform has to be the aspect of the QUAD being drawn; hand it the canvas aspect instead and the crop stops tracking the frame entirely and only responds to browser-window resizes.',
    'Leaving the orthographic camera at the default -1..1 bounds. A world unit is then a different number of pixels horizontally and vertically, so the quad is stretched by the viewport — faking the exact distortion this component exists to prevent. The bounds track the container aspect.',
    'Applying the offset before the scale. `(vUv + offset) * scale` shrinks the offset along with the coordinate, so the crop drifts toward the origin as the aspect mismatch grows instead of staying centred.',
    'Leaving `wrapS` / `wrapT` at `RepeatWrapping`. A rounding error of one ulp past 1.0 then wraps to the opposite edge of the image and shows as a one-pixel bright line; `ClampToEdgeWrapping` smears the border pixel instead, which is invisible.',
    'Testing with a smooth gradient. Every fit looks correct on a gradient. A square grid and a true circle are what make a stretch obvious — the cells go rectangular and the circle goes elliptical.',
    'Fitting the frame on width alone. The tall end of the aspect cycle then runs off the top and bottom of the container, hiding half of what is being demonstrated. The frame is contained on whichever axis is tighter.',
    'Omitting `#include <colorspace_fragment>` from the `ShaderMaterial`. three only injects output conversion into its own materials, so raw linear values ship into an sRGB framebuffer and the quad renders visibly washed out.',
    'Calling `renderer.dispose()` alone on unmount. It frees GPU objects but leaves the WebGL context alive, and Chromium silently kills the oldest context once a renderer process holds about 16 of them. `disposeRenderer` calls `forceContextLoss`.',
  ],

  notes: [
    'The fit is per-fragment ratio arithmetic, so the quad is a single unsubdivided `PlaneGeometry(1, 1)`. `cylinder-gallery` runs the same maths per vertex instead, because there it feeds a bend that needs the result before rasterisation.',
    'The camera is orthographic so that world units map straight onto the frame: the mesh\'s scale IS its aspect ratio, with no frustum arithmetic sitting between the two.',
  ],

  apiSignature:
    'function UvCoverFit(props: { minAspect?: number; maxAspect?: number; period?: number; hold?: number; fill?: number; overscan?: number; focal?: [number, number]; paint?: (ctx: CanvasRenderingContext2D, size: { width: number; height: number }) => void; textureSize?: { width: number; height: number }; className?: string }): JSX.Element',

  props: [
    { name: 'minAspect', type: 'number', default: '0.62', description: 'Narrowest frame aspect in the cycle (w / h).' },
    { name: 'maxAspect', type: 'number', default: '2.3', description: 'Widest frame aspect in the cycle (w / h).' },
    { name: 'period', type: 'number', default: '8', description: 'Seconds for a full narrow-wide-narrow cycle, holds included.' },
    { name: 'hold', type: 'number', default: '0.12', description: 'Fraction of the cycle spent parked at each extreme.' },
    { name: 'fill', type: 'number', default: '0.84', description: 'Fraction of the container the frame fills at its largest.' },
    { name: 'overscan', type: 'number', default: '1', description: 'Extra zoom on the crop. 1 fits exactly; above 1 keeps margin in reserve.' },
    { name: 'focal', type: '[number, number]', default: '[0.5, 0.5]', description: 'Where the crop slack goes, per axis. 0.5 centres it.' },
    { name: 'paint', type: '(ctx, size) => void', description: 'Override the source image. Receives a 2D context for the source canvas.' },
    { name: 'textureSize', type: '{ width: number; height: number }', default: '{ width: 1200, height: 675 }', description: 'Source canvas size. Its ratio is the texture aspect the shader fits.' },
    { name: 'className', type: 'string', description: 'Merged onto the wrapper via `cn`.' },
  ],

  reducedMotion:
    'The aspect cycle does not advance: elapsed time stops accumulating and the phase is pinned to 0.5, so the frame holds at the midpoint between `minAspect` and `maxAspect` and never reshapes. The cover fit itself still runs every frame and still responds correctly to container resizes — what is removed is the autonomous animation, not the behaviour.',

  cleanup:
    'Removes the quad from the scene, disposes the `CanvasTexture` explicitly because it sits inside `material.uniforms` where `disposeObject` cannot reach it, runs `disposeObject` over the scene, disposes the geometry and material, then calls `disposeRenderer` — `setAnimationLoop(null)`, `dispose()`, `forceContextLoss()` — and removes the canvas from the DOM. The stage ref is nulled before any of it, so a frame already queued by the shared RAF loop returns immediately instead of rendering into a dead context.',

  acceptance:
    'The frame reshapes continuously from tall to wide and back, pausing briefly at each extreme. Throughout, the grid cells stay square and the circle stays circular — nothing ever stretches. As the frame passes the source\'s own 16:9 ratio you can see the crop switch from trimming the top and bottom to trimming the sides, with the centre of the image staying put. Resize the container and the frame stays fully inside it at both ends of its cycle. With `prefers-reduced-motion: reduce` the frame holds at one aspect and does not animate, and the image inside it is still correctly cropped.',

  criticalRegion: 'critical',
};

export default meta;
