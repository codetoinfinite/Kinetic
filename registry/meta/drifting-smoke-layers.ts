import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'drifting-smoke-layers',
  title: 'Drifting Smoke Layers',
  category: 'primitive',
  tags: ['css', 'gradient', 'blur', 'atmosphere', 'zero-js'],
  blurb: 'Slow volumetric fog built from blurred radial gradients on three coprime cycles. No texture, no canvas.',
  cost: 'css',
  motif: 'noise',

  files: [
    {
      path: 'registry/ui/drifting-smoke-layers.tsx',
      target: 'components/motion/drifting-smoke-layers.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: [],
  registryDependencies: [],

  summary:
    'An absolutely-positioned atmosphere layer for the back of a hero or a card. Three oversized elements, each painting two soft radial gradients, blurred and drifting on periods that never line up. It looks like a rendered volumetric pass and costs three composited transforms.',

  mechanism: [
    'Each layer is `position: absolute; inset: -25%`, making it 150% of the container in both axes with the excess hanging off every side. The layer can then translate by ±10% of its own box and scale to 1.55 without ever bringing an edge into the container — an exactly-fitting layer shows a hard corner the moment it moves.',
    'A layer paints two `radial-gradient(W% H% at X% Y%, tint, transparent E%)` ellipses at different centres and different alphas. Two overlapping ellipses per layer, six across the stack, produce density variation that a single gradient cannot: the visible boundary between clouds is where two soft fields disagree, not where a gradient stops.',
    '`filter: blur(40px | 55px | 70px)` erases the elliptical shape entirely and leaves only the density field. The three different radii are what separate the layers in apparent depth — identical blur reads as three copies of one cloud sliding over each other.',
    'One `@keyframes kx-smoke-drift` block serves all layers. Its two poses read `translate(var(--kx-smoke-x0), var(--kx-smoke-y0)) scale(var(--kx-smoke-s0)) rotate(0deg)` and the matching `…-x1/-y1/-s1/-r`; custom properties resolve per element, so each layer walks a different path through the same cycle without a keyframe block of its own.',
    'The periods are 16s, 22s and 29s. The combined pattern only repeats at lcm(16, 22, 29) = 5104 seconds, roughly 85 minutes, so no viewer will ever see it loop. Equal periods repeat every cycle and the fog reads as a looping video.',
    'Only `transform` and `opacity` are animated. The blurred result of each layer is rasterised once and composited thereafter, so a 70px blur is paid for at paint time, not sixty times a second.',
  ],

  constants: [
    {
      name: 'inset',
      value: '-25%',
      why: 'Makes each layer 150% of the container. Worst case is scale 1.55 plus a 10% self-relative translate plus an 11deg rotation; 25% of overflow on each side covers all three with room left. At -10% the corner of the largest layer swings into view during the rotation.',
    },
    {
      name: 'periods',
      value: '16s / 22s / 29s',
      why: 'Chosen so lcm(16, 22, 29) = 5104s. Any pair sharing a factor collapses the combined period — 16/24/32 repeats every 96 seconds and is clearly a loop. 29 is prime, which is what pushes the total past an hour.',
    },
    {
      name: 'blur radii',
      value: '40px / 55px / 70px',
      why: 'Different radii are the depth cue. Below ~25px the elliptical shape of the gradient survives the blur and the fog reads as coloured blobs; above ~90px the layer flattens into an even wash with no internal structure and the drift stops being visible.',
    },
    {
      name: 'layer opacities',
      value: '0.55 / 0.40 / 0.30',
      why: 'Descending with distance. The three layers composite multiplicatively against the background, so equal opacities stack to an opaque haze; the falloff keeps total coverage under about 0.75 and preserves whatever sits behind.',
    },
    {
      name: 'scale range',
      value: '1.25 to 1.55',
      why: 'The breathing. Under about 1.15 the scale change is imperceptible next to the translation; over about 1.8 the browser re-rasterises the blurred layer at the new scale, which shows as a visible sharpness pop mid-cycle.',
    },
    {
      name: 'gradient edge stops',
      value: '60% to 70%',
      why: 'Where each ellipse reaches full transparency, relative to its own size. Below ~50% the falloff is steep enough that the blur cannot hide the ellipse; at 100% the gradient never fully clears and the layer becomes a flat tint with a bright spot.',
    },
  ],

  pitfalls: [
    'Animating `filter: blur()` itself, or animating the gradient stops. Both force the layer to be re-blurred every frame — a 70px blur over a 150%-size layer is tens of milliseconds of GPU work per frame and the whole page drops to single-digit FPS. Animate the transform of an already-blurred layer instead.',
    'Giving the layers the same duration with different delays. A delay does not decorrelate anything: after the first cycle every layer is at the same phase offset forever, and the stack visibly repeats on the shared period. The periods themselves have to be coprime.',
    'Sizing the layers to the container. At `inset: 0` the blur samples transparent pixels beyond the element box, so the fog fades out at exactly the container edge and the effect reads as a rectangle of smoke rather than smoke seen through a window.',
    'Omitting `overflow: hidden` on the wrapper. The layers are 150% of the container by design and will paint over neighbouring content, including through a parent with its own background.',
    'Leaving off `pointer-events: none`. The layer covers the whole container, so every button underneath stops being clickable and the cause is invisible in the DOM inspector unless you notice the transparent sibling on top.',
    'Setting `will-change: transform` and leaving it set under reduced motion. `will-change` promotes the element to its own compositor layer permanently; with the animation switched off that is three large blurred textures held in GPU memory for nothing. The reduced-motion block resets it to `auto`.',
  ],

  notes: [
    'The component is `position: absolute; inset: 0`, so it expects a positioned ancestor and contributes nothing to layout. Put it as the first child of the section it should sit behind and give that section `position: relative`.',
    '`contain: paint` on the wrapper keeps the oversized blurred children out of the ancestor ink-overflow calculation, which otherwise runs on every frame of the drift.',
    'The tint reads `var(--smoke-tint, currentColor)` and is mixed with `color-mix(in oklab, …)`, so the fog inherits the text colour by default and can be re-themed by setting one property on any ancestor. `color-mix` needs Safari 16.2+, Chrome 111+, Firefox 113+.',
    'Fill-rate is the real cost: three full-container layers at 150% size, blurred. On a low-end phone drop to `layers={2}` — the depth reads almost as well and it removes the widest blur.',
  ],

  apiSignature:
    'function DriftingSmokeLayers(props: { layers?: 1 | 2 | 3; tint?: string; intensity?: number; speed?: number; className?: string }): JSX.Element',

  props: [
    { name: 'layers', type: '1 | 2 | 3', default: '3', description: 'How many layers to render. Fewer layers, less depth and less fill-rate.' },
    { name: 'tint', type: 'string', default: "'var(--smoke-tint, currentColor)'", description: 'Any CSS colour. Mixed down per blob with `color-mix`.' },
    { name: 'intensity', type: 'number', default: '1', description: 'Multiplies every layer opacity. Below 1 for fog behind text.' },
    { name: 'speed', type: 'number', default: '1', description: 'Multiplies every period. 2 is half speed; the periods stay coprime under any multiplier.' },
    { name: 'className', type: 'string', description: 'Merged onto the wrapper via `cn`. Use it to change the inset or add a mask.' },
  ],

  reducedMotion:
    'A `@media (prefers-reduced-motion: reduce)` block sets `animation: none` and applies each layer\'s 50% pose as a static transform, so the fog is still there, still layered, still at full density — it simply stops drifting. `will-change` is reset to `auto` in the same block so the three large blurred layers are not held in compositor memory for an animation that is not running.',

  cleanup:
    'Nothing to clean up. No listeners, no timers, no animation frames, no observers. Unmounting removes the elements and the CSS animations with them; React removes the hoisted `<style>` when the last instance unmounts.',

  acceptance:
    'Watch for a full minute: the density pattern never obviously repeats, and no layer edge or gradient ellipse becomes visible at any point in the cycle. Content behind the smoke stays clickable. In a performance profile the frames show composite work only — no repaints of the blurred layers. With reduced motion on, the fog is still present and completely still.',

  criticalRegion: 'critical',
};

export default meta;
