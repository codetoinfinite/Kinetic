import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'cursor-reactive-shader-glow',
  title: 'Cursor-Reactive Shader Glow',
  category: 'webgl',
  tags: ['three', 'shader', 'pointer', 'noise', 'domain-warp', 'background', 'damping'],
  blurb:
    'A warped-noise atmosphere with a light that trails the cursor, held under a hard luminance ceiling so copy stays readable.',
  cost: 'webgl',
  motif: 'noise',

  files: [
    {
      path: 'registry/ui/cursor-reactive-shader-glow.tsx',
      type: 'registry:ui',
      role: 'component',
    },
    {
      path: 'registry/shaders/cursor-reactive-shader-glow.ts',
      type: 'registry:lib',
      role: 'gradient-noise glow fragment shader with a luminance budget',
    },
  ],
  dependencies: ['three@^0.185.1'],
  registryDependencies: [],

  summary:
    'A hero backdrop: a slowly drifting domain-warped noise field with a soft light that follows the pointer through it. The pointer never reaches a uniform directly — the listener records a target and the render loop damps toward it, so the light trails the hand at the same rate on a 60Hz and a 120Hz display. The composed colour is then scaled down until its Rec.709 luminance fits under `ceiling`, which is what makes the glow safe to put white headline copy on top of.',

  mechanism: [
    'A `PlaneGeometry(2, 2)` under an `OrthographicCamera(-1, 1, 1, -1, 0, 1)` is a full-screen quad with no projection maths, so the camera never needs touching on resize and `vUv` is exactly 0..1 across the canvas.',
    'The `pointermove` handler converts the event into 0..1 UV space against the canvas rect (flipping y, since UV is up and client y is down) and stores it as a target. The loop then runs `damp(current, target, smoothing, dt)` per axis, where `smoothing` is the fraction of the gap still remaining after one second. The naive `x += (t - x) * 0.1` converges twice as fast at 120Hz as at 60Hz, so the same hand movement would produce a visibly tighter follow on better hardware.',
    'The noise is a domain warp: two decorrelated 2-octave fbm samples become a `vec2` offset fed into a third sample. The second channel is shifted by `vec2(2.3, 1.1)` — without that shift both channels return the same number and the warp degenerates into a plain diagonal translation of the field.',
    'The pointer is added to all three fbm samples, weighted 0.20, -0.20 and 0.12. The sign flip between the two warp channels makes them shear against each other around the cursor. Three weak influences read as an atmosphere that responds; one strong influence reads as a field glued to the cursor, which is a different and much worse effect.',
    'The light itself is two falling `smoothstep(radius, 0.0, d)` ramps — a tight core and a wide halo — mixed 0.65/0.35. The halo is squared, which pushes the last few percent of its falloff below the 8-bit quantisation floor and removes the termination ring the eye otherwise finds at the edge of a single smoothstep on a dark background.',
    'Finally `dot(col, vec3(0.2126, 0.7152, 0.0722))` measures the output luminance and the whole vector is multiplied by `min(1.0, ceiling / lum)`. Scaling rather than clamping per channel is deliberate: clamping crushes the brightest channel first and the glow core visibly shifts hue as it brightens.',
    '`energy` is measured from the follower\'s own displacement divided by `dt`, giving UV units per second. Measuring the follower rather than the raw pointer means the signal is already smooth, needs no second filter, and cannot be spiked by one stray event.',
  ],

  constants: [
    {
      name: 'smoothing',
      value: '0.0016',
      why: 'Fraction of the pointer gap still remaining after one second, so the light closes ~99.8% of the distance per second — roughly a 120ms tail. Raise it to 0.05 and the light lags far enough behind the cursor to feel broken rather than smooth; drop it to 1e-8 and it is welded to the pointer, at which point the damping is doing nothing and a raw uniform write would look identical.',
    },
    {
      name: 'ceiling',
      value: '0.175',
      why: 'Maximum Rec.709 luminance of the output. Against white text this leaves roughly 12:1 contrast, comfortably past the 4.5:1 floor. Past ~0.35 white headline copy over the glow core drops under 4.5:1 and the backdrop starts eating the content it exists to sit behind.',
    },
    {
      name: 'coreRadius / haloRadius',
      value: '0.22 / 0.85',
      why: 'Aspect-corrected UV units. Nearly 4x apart, which is what makes the pair read as one light with a soft surround rather than as two concentric discs. Bring them within ~2x and the halo\'s edge becomes visible as a ring at the core\'s boundary.',
    },
    {
      name: 'scale',
      value: '0.7',
      why: 'Noise frequency. Below 1.0 the features are LARGER than the canvas, which is what makes the field read as atmosphere. At 4.0 the same shader is visible turbulence and fights the copy for attention.',
    },
    {
      name: 'warp',
      value: '0.9',
      why: 'How far the two warp channels push the third sample, in noise-space units — just under one full cell. Near 0 the domain warp vanishes and the result is plain fbm with no flow. Past ~2 the warp folds the field back over itself and produces hard creases where the offset reverses.',
    },
    {
      name: 'ENERGY_FULL_SCALE',
      value: '1.8',
      why: 'UV units per second at which `uEnergy` saturates. A deliberate sweep across a hero is roughly 0.6/s, so normal movement lands mid-range and the brightening is legible. Set it to 0.3 and the reading pins at 1 on any movement at all, which makes the parameter meaningless.',
    },
    {
      name: 'ENERGY_SMOOTHING / PRESENCE_SMOOTHING',
      value: '0.002 / 0.02',
      why: 'Energy must track the hand or the brightening arrives after the gesture has finished; presence is a fade in and out and 400ms of it reads as a light coming up. Give presence the fast value and the glow flicks on and off at the canvas boundary.',
    },
    {
      name: 'STILL_TIME',
      value: '8.2',
      why: 'Time slice for the single reduced-motion frame. Not 0, because at t=0 the drift offset is zero on both axes and the field renders its least interesting slice.',
    },
  ],

  pitfalls: [
    'Writing the pointer straight into the uniform from the event handler. The shader then gets one raw sample per event: a 120Hz trackpad delivers a staircase, and a dropped frame delivers a jump. The visible symptom is a light that judders during fast movement and snaps after a stall.',
    'Damping with a per-frame constant (`x += (t - x) * 0.1`). It is not frame-rate independent — the light trails noticeably further behind on a 60Hz laptop than on a 120Hz one, from identical code.',
    'Aspect-correcting the noise sample space but not the pointer. The glow becomes an ellipse 1.78x too wide on a 16:9 canvas, and the error scales with the container so it looks correct in a square preview and wrong in the hero it was written for.',
    'Deriving `energy` from raw pointer events. Event deltas depend on the sample rate, so the same hand movement measures differently per device, and one outlier event flashes the whole field.',
    'Letting the pointer target slide back to the centre on leave. That drags a visible streak of light across the canvas to the middle. Only `presence` is faded, so the light dims where it stands.',
    'Putting the pointer listener on `window` instead of the canvas. A document-level handler outlives the renderer it was written for, and the rect it measures is not the rect being drawn into — so after a scroll the glow sits at an offset from the cursor.',
    'Clamping the output per channel instead of scaling the vector. The brightest channel saturates first, so the glow core shifts hue as it gets brighter — a warm light turns pink at its centre.',
    'Rebuilding the renderer when a colour or gain prop changes. Chromium kills the oldest WebGL context past roughly 16 per renderer process, so a page with several of these blanks an unrelated canvas. Numbers go through a ref the loop reads; only size and support rebuild.',
    'Owning the `<canvas>` in React while calling `forceContextLoss()` on cleanup. Under `reactStrictMode` the effect runs twice, and the second `getContext` on that same element hands back the dead context — the preview is permanently blank in development and fine in production, which is the worst possible failure mode. The canvas is created inside the effect and removed with it.',
    'Making the content layer pointer-opaque. It covers the canvas, so `pointermove` stops firing exactly over the headline — the one place the glow is wanted. The overlay is `pointer-events-none`.',
  ],

  notes: [
    'The two warp channels sample the same fbm function, so the shader is three fbm evaluations of two octaves each: twelve gradient-noise samples per fragment. Two octaves is enough because the result is immediately crushed by `smoothstep(0.25, 0.85)` and the finer detail is discarded.',
    'The hash is sin-free. `fract(sin(dot(p, k)) * 43758.5453)` quantises once the angle passes a few thousand radians and grows visible repeating bands — and it fails on mobile GPUs long before it fails on the desktop it was written on.',
    'Gradient noise rather than value noise: the lattice value is a dot product with a random gradient and is therefore zero at every lattice point, which is what stops the cell corners reading as a faint dot grid in the flat areas.',
    'Resize lives in its own effect and re-renders one frame, so a reflow while the loop is paused does not leave the previous framebuffer stretched across the new size.',
    '`touch-action` is deliberately left alone. Swallowing a touch scroll to drive a glow hidden under the user\'s own finger is a straight downgrade.',
  ],

  apiSignature:
    'function CursorReactiveShaderGlow(props: { children?: ReactNode; ceiling?: number; coreRadius?: number; haloRadius?: number; scale?: number; warp?: number; fieldGain?: number; glowGain?: number; smoothing?: number; base?: readonly [number, number, number]; tint?: readonly [number, number, number]; glowTint?: readonly [number, number, number]; maxDpr?: number; className?: string }): JSX.Element',

  props: [
    { name: 'children', type: 'ReactNode', description: 'Overlay content. Pointer-transparent so the canvas keeps receiving moves.' },
    { name: 'ceiling', type: 'number', default: '0.175', description: 'Rec.709 luminance the output may never exceed.' },
    { name: 'coreRadius', type: 'number', default: '0.22', description: 'Radius of the tight glow core, in aspect-corrected UV units.' },
    { name: 'haloRadius', type: 'number', default: '0.85', description: 'Radius of the wide halo. Squared in the shader, so it has no visible edge.' },
    { name: 'scale', type: 'number', default: '0.7', description: 'Noise frequency. Below 1 the features are larger than the canvas.' },
    { name: 'warp', type: 'number', default: '0.9', description: 'How far the two warp channels displace the third noise sample.' },
    { name: 'fieldGain', type: 'number', default: '0.08', description: 'Peak brightness the noise field adds over `base`.' },
    { name: 'glowGain', type: 'number', default: '0.1', description: 'Peak brightness the cursor light adds over `base`.' },
    { name: 'smoothing', type: 'number', default: '0.0016', description: 'Fraction of the pointer gap still remaining after one second.' },
    { name: 'base', type: 'readonly [number, number, number]', default: '[0.03, 0.031, 0.038]', description: 'Deepest colour, linear 0..1 RGB.' },
    { name: 'tint', type: 'readonly [number, number, number]', default: '[0.62, 0.7, 0.95]', description: 'Colour the noise field lifts toward.' },
    { name: 'glowTint', type: 'readonly [number, number, number]', default: '[1, 0.94, 0.86]', description: 'Colour of the cursor light.' },
    { name: 'maxDpr', type: 'number', default: '2', description: 'Device pixel ratio cap. The field is low-frequency, so 2 is already generous.' },
    { name: 'className', type: 'string', description: 'Merged onto the root container via `cn`.' },
  ],

  reducedMotion:
    'The render loop never starts. One frame is drawn at a fixed time slice with the light parked at (0.34, 0.6), presence at 1 and energy at 0.35, so the panel is a composed still of the effect at rest rather than a flat rectangle. The pointer listener stays attached but its target is never read, so moving the cursor changes nothing.',

  cleanup:
    'Removes the `pointermove` and `pointerleave` listeners from the canvas, nulls the stage ref so an in-flight frame cannot touch a disposed renderer, then calls `disposeRenderer` (which stops the animation loop, disposes the renderer and calls `forceContextLoss()` — `dispose()` alone leaves the context alive until GC decides otherwise, which may be never), disposes the geometry and the `ShaderMaterial`, and removes the canvas from the DOM. Because the canvas is created inside the effect, the StrictMode second run starts from a fresh element and a fresh context.',

  acceptance:
    'Move the pointer across the panel and a soft light follows it with a short, even tail; the same tail length on a 60Hz and a 120Hz display. Move fast and the light brightens; stop and it settles to a dimmer ember without going out. Leave the panel and the light fades where it stands instead of sliding to the centre. The noise field keeps drifting slowly whether or not the pointer moves. White text over the glow core stays readable at any `glowGain`. Resize the container and the glow stays circular, not elliptical. In development, with StrictMode double-mounting, the canvas renders — it is not blank. With reduced motion the panel is a single composed still.',

  criticalRegion: 'critical',
};

export default meta;
