import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'multipass-offscreen-composite',
  title: 'Multipass Offscreen Composite',
  category: 'webgl',
  tags: ['three', 'render-target', 'multipass', 'bloom', 'composite', 'hero'],
  blurb: 'Four passes into two render targets — ramp, additive fills, half-size bloom — and one composite that writes the canvas once.',
  cost: 'webgl',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/multipass-offscreen-composite.tsx',
      type: 'registry:ui',
      role: 'component',
    },
    {
      path: 'registry/shaders/multipass-offscreen-composite.ts',
      type: 'registry:lib',
      role: 'four fragment programs and two vertex programs',
    },
  ],
  dependencies: ['three@^0.185.1'],
  registryDependencies: [
    'webgl',
    'damp',
    'use-raf',
    'use-in-view',
    'use-visibility',
    'use-resize-observer',
    'use-reduced-motion',
  ],

  summary:
    'A hero field built the way a compositor builds one: a background ramp and three additive gradient fills are accumulated into an offscreen target, a bright-pass and blur run into a second target at half size, and a final pass adds them together with a vignette and a dither. The canvas is written exactly once, by the last pass. It is a small piece of art in its own right and a complete, disposable template for any offscreen chain.',

  mechanism: [
    'Passes 1 and 2 share one target. `renderer.autoClear = false` is set at construction, the scene target is cleared explicitly once with `renderer.clear(true, false, false)`, and the ramp and the fills are then rendered back to back. The absence of a clear between those two renders is the entire composite.',
    'The ramp is a clip-space quad. Each fragment projects onto the ramp axis with `dot(uv - 0.5, dir) / (abs(dir.x) + abs(dir.y)) + 0.5`; the divisor is the largest that projection can reach inside the unit square, so the ramp reaches its end colour exactly at the far corner for any angle rather than saturating early.',
    'The fills are three `PlaneGeometry(1, 1)` meshes in one rotated group, each drawn with a Gaussian falloff `exp(-d * d * uSoftness)` and `AdditiveBlending`. They travel around ellipses of different radii at speeds of 0.05, -0.08 and 0.11 revolutions per second, so the arrangement takes about 200 seconds to return to its start.',
    'Both targets are `HalfFloatType`. Three additive fills overlap well past 1.0, and on an unsigned-byte target that overlap clips flat before the bright-pass runs — the bloom would then be told the image is uniformly hot wherever any two fills cross.',
    'Pass 3 renders into a target at `bloomScale` (0.5) of the scene target. The bright-pass is a soft knee, `smoothstep(uThreshold, uThreshold + 0.25, luma)`, and the blur is a 3x3 tent with weights 4 / 2 / 1 normalised by 16. Its offsets are measured in the half-size target\'s texels, so the blur reaches twice as far across the image for the same nine taps.',
    'Pass 4 reads both targets, adds `bloom * uBloomStrength`, multiplies by a vignette measured in a square space so it stays circular in a wide box, and adds triangular-PDF dither — the difference of two hashes, about 1/255 — to break the 8-bit banding a smooth ramp otherwise shows as hard contour lines.',
    'Resizing calls `setSize` on both targets and rewrites `uResolution` and the bloom `uTexel`. Nothing is reallocated, and because no pass reads its own previous contents there is no clear-and-settle: the next frame redraws all four passes from scratch.',
  ],

  constants: [
    {
      name: 'renderer.autoClear',
      value: 'false',
      why: 'The one line that makes multipass possible in three. Left at its default, every `render()` clears its target first, so pass 2 wipes pass 1 and the layering silently collapses into whatever was drawn last — with no error and no warning.',
    },
    {
      name: 'bloomScale',
      value: '0.5',
      why: 'Quarter the pixels for the blur pass, and the tent\'s texel-sized offsets cover twice the distance. Below about 0.35 the half-resolution grid becomes visible as a soft blockiness in the upsample; at 1.0 the pass costs four times as much for a tighter, less useful glow.',
    },
    {
      name: 'BLOOM_RADIUS',
      value: '1.4',
      why: 'Tap spacing in bloom-target texels, so 2.8 scene pixels. Above roughly 2 the nine taps no longer overlap and the tent starts sampling a sparse grid, which shows up as a faint cross-shaped ringing around bright cores.',
    },
    {
      name: 'bloomThreshold',
      value: '0.34',
      why: 'Luma where the bright-pass starts. The ramp peaks near 0.18, so this sits above the background and below the fills: the glow comes from the lights, not from the whole frame. Drop it under the ramp and the bloom becomes a flat wash that just raises exposure.',
    },
    {
      name: 'knee width',
      value: '0.25',
      why: 'The smoothstep span above the threshold. With a hard step, a pixel pops into the bright set the instant it crosses the cut, so the bloom boundary crawls as the fills drift — the most common giveaway of a hand-rolled bloom.',
    },
    {
      name: 'DISC_SOFTNESS',
      value: '3.1',
      why: 'The k in `exp(-d*d*k)`, which puts the fill at 4.5% of peak at the edge of its own quad. Much lower and the Gaussian is still bright where the geometry stops, giving a visible square edge; much higher and the fill shrinks to a hard dot inside an oversized quad.',
    },
    {
      name: 'DITHER',
      value: '0.004',
      why: 'One 8-bit code. The ramp crosses only a few hundred codes over a thousand pixels, and without a sub-LSB perturbation that gradient bands into visible contour lines on any display. Larger values are perceptible as noise rather than as smoothness.',
    },
    {
      name: 'REVEAL_START / REVEAL_SPAN',
      value: '0.7 / 0.2',
      why: 'The source ties the fills to scroll with exactly this ramp: nothing until 70% of the progress, full by 90%, held after. The dead zone is deliberate — the ramp establishes the space first, and the light arrives as a separate event.',
    },
    {
      name: 'DISC_SQUASH / PLANE_TILT',
      value: '0.62 / -0.19 rad',
      why: 'The fills are round in their own plane; squashing them and rotating their shared group is what makes three moving blobs read as one ellipse seen at an angle instead of three unrelated circles.',
    },
    {
      name: 'STATIC_ELAPSED',
      value: '6.2 s',
      why: 'The frame drawn when motion is suppressed. At t = 0 all three fills sit at their starting phases; six seconds in, the composition is spread out and reads as a designed still rather than as a default state.',
    },
    {
      name: 'maxDpr',
      value: '2',
      why: 'Four full-screen passes are already 2.5 screens of fragments per frame (1 + 1 + 0.25 + 1). At a 3x backing store that is over twenty million fragment invocations per frame on a phone, for no visible gain over 2x.',
    },
  ],

  pitfalls: [
    'Leaving `autoClear` at its default and wondering why only the last pass appears. Nothing errors; the ramp is simply gone, and the usual next move — reordering the renders — makes it worse.',
    'Setting `autoClear = false` and then forgetting to clear at all. The first target accumulates frame over frame, so the fills smear into permanent trails that look almost intentional for about two seconds.',
    'Recreating render targets in the resize handler. Allocating a pair of half-float framebuffers is a synchronous driver call; doing it on every ResizeObserver callback turns a window drag into a slideshow, and every previous pair leaks unless it is explicitly disposed.',
    'Disposing the renderer but not the targets. Render targets are not part of any scene graph, so nothing traverses them — each surviving one holds a full-resolution half-float texture plus a framebuffer object until the tab is closed.',
    'Using an 8-bit target for anything that feeds a bright-pass. Additive overlap clips at 1.0, so the bloom sees a plateau instead of a peak and the glow spreads uniformly across the crossing region.',
    'Premultiplying alpha in a shader that uses three\'s `AdditiveBlending`. That blend is already `(SrcAlpha, One)`, so multiplying in the shader squares the alpha and the fills all but vanish — then get "fixed" by tripling the intensity, which clips the cores.',
    'Reusing one `uTexel` or `uResolution` uniform across passes that render into differently sized targets. Everything looks right at one window size and the blur radius drifts as the window changes.',
    'Reading a colour buffer while it is still bound as the render target. It is undefined behaviour in WebGL and shows as tearing, black, or a correct image depending on the driver — which is why the bright-pass needs an offscreen target and cannot run on the canvas.',
    'Letting three convert colour space in the middle of the chain. Its output conversion is injected into built-in materials only, so a chain that mixes `ShaderMaterial` and `MeshBasicMaterial` converts at some passes and not others; this component uses `ShaderMaterial` everywhere and converts nowhere.',
  ],

  notes: [
    'The renderer is created with `alpha: false`. Pass 4 covers every pixel at full alpha, so an alpha channel would only cost bandwidth and force the compositor to blend the canvas over the page.',
    '`reveal` is deliberately a plain number rather than an internal scroll listener. Drive it from whatever already tracks progress — `useInView`\'s ratio, a scroll library, or a constant — and the component stays a renderer.',
    'The array props are compared through a joined string key, so passing an inline `[a, b, c]` literal does not tear down the GL stack on every render. Values that only feed a uniform (`reveal`, `bloomStrength`, `vignette`, `drift`) are read from a ref inside the draw loop and never appear in a dependency list.',
    'Geometries are disposed by hand rather than through `disposeObject` over each scene: the clip-space quad is shared by three scenes, and a traversal would dispose it three times.',
    'To extend the chain, add a target and a pass — the structure does not change. The costly mistakes are all in the two rules this file already follows: clear deliberately, and resize rather than reallocate.',
  ],

  apiSignature:
    'function MultipassOffscreenComposite(props: { reveal?: number; bloomStrength?: number; bloomThreshold?: number; bloomScale?: number; vignette?: number; drift?: number; rampAngle?: number; rampColors?: readonly [string, string, string]; fillColors?: readonly [string, string, string]; maxDpr?: number; className?: string }): JSX.Element',

  props: [
    { name: 'reveal', type: 'number', default: '1', description: 'Progress 0..1. The fills fade in between 0.7 and 0.9 and hold; the ramp is always drawn.' },
    { name: 'bloomStrength', type: 'number', default: '0.85', description: 'How much of the blurred bright-pass is added back in the composite.' },
    { name: 'bloomThreshold', type: 'number', default: '0.34', description: 'Luminance where the bright-pass begins to contribute, with a 0.25 knee above it.' },
    { name: 'bloomScale', type: 'number', default: '0.5', description: 'Bloom target size relative to the scene target. Changing it rebuilds both targets.' },
    { name: 'vignette', type: 'number', default: '0.38', description: 'Corner darkening in the composite, 0..1.' },
    { name: 'drift', type: 'number', default: '1', description: 'Multiplier on the fills\' orbital speeds. 0 freezes them without stopping the passes.' },
    { name: 'rampAngle', type: 'number', default: '141', description: 'Ramp direction in degrees, counter-clockwise from +x.' },
    { name: 'rampColors', type: 'readonly [string, string, string]', default: "['#0a0f1a', '#16283c', '#070a12']", description: 'Start, bend and end stops of the background ramp.' },
    { name: 'fillColors', type: 'readonly [string, string, string]', default: "['#3f7ae0', '#2fd0b4', '#a866f0']", description: 'Colours of the three additive fills, largest first.' },
    { name: 'maxDpr', type: 'number', default: '2', description: 'Backing-store cap. Both targets follow the drawing buffer.' },
    { name: 'className', type: 'string', description: 'Merged onto the host element via `cn`.' },
  ],

  reducedMotion:
    'The component reads `useReducedMotion` itself and never subscribes to rAF when it is set. All four passes still run, once, at a fixed elapsed of 6.2 seconds, and again after any resize — so the artwork is complete, correctly exposed and fully bloomed, it simply does not drift. A hero background is composition first and motion second; deleting it under reduced motion would leave a hole in the page, and freezing it at t = 0 would show an arrangement nobody designed.',

  cleanup:
    'Nulls the stage ref, disposes both `PlaneGeometry` instances, all six materials, and — separately, because nothing traverses them — both render targets. Then `disposeRenderer` performs `dispose` + `forceContextLoss` + a zeroed drawing buffer, and the canvas is removed from the DOM. The canvas is created inside the effect by three and appended per effect run, so a StrictMode remount builds a fresh context rather than reattaching the one that was just force-lost. `useRaf` releases its own subscription; the component adds no listeners of its own.',

  acceptance:
    'Three soft coloured lights drift across a dark angled ramp with a halo that is clearly wider and softer than the lights themselves, corners falling off, and no banding anywhere in the gradient — tilt a laptop screen and the ramp stays smooth. Resize the window continuously: the image tracks the box with no stutter, no flash of black, and the halo keeps the same apparent width. Set `reveal` to 0.5 and only the ramp is visible; sweep it to 1 and the lights come up over the last third. With reduced motion the full composition, bloom included, is present and still.',

  criticalRegion: 'critical',
};

export default meta;
