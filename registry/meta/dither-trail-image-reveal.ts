import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'dither-trail-image-reveal',
  title: 'Dither Trail Image Reveal',
  category: 'cursor',
  tags: ['three', 'webgl', 'dither', 'bayer', 'pointer', 'trail', 'image', 'damping'],
  blurb:
    'A dimmed image restored through a trail of Bayer-thresholded blocks that smear in the direction the pointer moved.',
  cost: 'webgl',
  motif: 'trail',

  files: [
    {
      path: 'registry/ui/dither-trail-image-reveal.tsx',
      type: 'registry:ui',
      role: 'component',
    },
    {
      path: 'registry/shaders/dither-trail-image-reveal.ts',
      type: 'registry:lib',
      role: 'recursive 8x8 Bayer, trail mask and velocity-displaced image sampling',
    },
  ],
  dependencies: ['three@^0.185.1'],

  summary:
    'The image rests dimmed and near-monochrome; dragging across it restores it through a trail of 5px blocks, each block either lit or not according to an 8x8 Bayer threshold. Twenty-four pointer samples live about a second and ride in two flat uniform arrays, so the whole trail is one fullscreen quad with no geometry and no render targets. Samples are spawned on distance travelled by a damped follower rather than per event, and each carries the velocity it was born with, so the reveal smears the way the hand moved.',

  mechanism: [
    'The trail is state, not geometry. Twenty-four samples sit in a ring buffer as `vec4(u, v, life, speed)` plus a parallel `vec2` of velocity, uploaded as two flat uniform arrays every frame. The fragment shader loops all twenty-four and takes `max()` of their contributions, so a full trail costs one quad and twenty-four `length()` calls per fragment — no instanced sprites, no ping-pong feedback buffer, nothing to resize.',
    'A sample is released when the FOLLOWER has travelled `spawnDistance`, or after `spawnInterval` with no movement. Spawning per pointer event instead clumps on a slow drag — events fire on sub-pixel movement — and leaves gaps on a flick, because the ring is short and a fast sweep can consume all of it between two frames. The time floor is what keeps a stationary hover from decaying to nothing under the cursor.',
    'The Bayer threshold is sampled at the CENTRE of the 5px block the fragment sits in, not at the fragment itself. Per-fragment sampling lets the disc edge cut through a block, which puts a soft antialiased boundary on an effect whose entire argument is that it has none. Per-block, a block is wholly lit or wholly absent and the reveal has a dither vocabulary.',
    'The 8x8 matrix is built recursively — `bayer4(a) = bayer2(a * 0.5) * 0.25 + bayer2(a)`, and again for 8 — because GLSL ES 1.00 has no integer bitwise operators and the usual derivation is bit-twiddled. Three multiplies and a `fract` produce the same 64-value ordering with no lookup texture and no GLSL3 upgrade.',
    'Each sample contributes its stored velocity to a flow vector, weighted by how much it contributed to the mask, and the sum is clamped. The image is then sampled at `uv - flow`, with the flow SNAPPED to the same 5px grid as the dither: a smooth sub-pixel offset is a directional blur laid on top of the picture, while a snapped one moves whole blocks and belongs to the same rendering as the dots.',
    'Colour is quantised twice at two different frequencies — the reveal mask against a per-block threshold, the tone against a per-pixel one — so the shape of the trail and the banding of the image do not moire against each other.',
    '`object-fit: cover` is reproduced in uv space from the intrinsic aspect of the decoded texture, so the shader crops exactly the way the equivalent CSS would and a resize is two uniform writes rather than a re-layout.',
    'The pointer state updates every frame while the DRAW is throttled to 30fps. The trail geometry is smooth because the samples are, and 30fps is invisible through 5px blocks; halving the draw rate halves the fill, which is the only real cost here.',
  ],

  constants: [
    {
      name: 'TRAIL_POINTS',
      value: '24',
      why: 'Ring length, and a compile-time `#define` because GLSL ES 1.00 needs a constant loop bound. At the default spacing this is roughly a second of trail. Past ~48 the shader is doing more work than the image is worth, and the far end of the trail is below the first dither level anyway.',
    },
    {
      name: 'MAX_BUFFER_WIDTH',
      value: '1100',
      why: 'Absolute cap on drawing-buffer width in device pixels, applied on top of the dpr cap. The output is 5px blocks quantised to four levels, so a wider buffer resolves nothing: a 2560px hero at dpr 2 would shade 26 million fragments per draw for a picture with no detail above the block size.',
    },
    {
      name: 'fps',
      value: '30',
      why: 'Draw ceiling. This is an overlay, not the subject, and the block size hides the difference between 30 and 120. The accumulator subtracts the budget rather than zeroing, so the long-run rate is exact instead of quietly losing the remainder each frame.',
    },
    {
      name: 'smoothing',
      value: '0.0002',
      why: 'Fraction of the pointer gap still remaining after one second — an ~80ms half-life. Tighter than a glow needs, because the trail has a visible head: lag past ~150ms and the reveal is drawing where the pointer was, which reads as dropped frames.',
    },
    {
      name: 'spawnDistance / spawnInterval',
      value: '0.012 / 0.042',
      why: 'Roughly 1.2% of the container per sample, or one every 42ms if the pointer is still. Below ~0.006 a slow drag exhausts the ring in a few centimetres; above ~0.03 a fast sweep is visibly a string of beads.',
    },
    {
      name: 'trail radius',
      value: '0.055 -> 0.115',
      why: 'A sample GROWS as it ages, so the trail widens and softens behind the head instead of fading as a constant-width stripe. Equal radii read as a paint stroke; the taper is what makes it a wake.',
    },
    {
      name: 'FLOW_MAX / FLOW_CLAMP',
      value: '0.04 / 0.055',
      why: 'Per-sample and total displacement ceilings in uv units. Uncapped, a flick tears the image into unrecognisable stripes; the total clamp also stops overlapping samples from summing into a displacement several times either individual one.',
    },
    {
      name: 'levels',
      value: '4',
      why: 'Quantisation steps per channel inside the reveal. Two is a duotone stencil that loses the photograph; past ~8 the dither is too fine to read as one and the effect looks like a slightly noisy image.',
    },
    {
      name: 'Bayer epsilon',
      value: '0.001',
      why: 'The matrix contains a zero cell, so `step(threshold, soft)` lights that cell in every block on the canvas — a permanent sparse grid of stray pixels everywhere the trail has never been. Biasing the threshold is what keeps the untouched area untouched.',
    },
  ],

  pitfalls: [
    'Pushing pointer events straight into the trail. Event positions are not a path: they arrive at whatever rate the device chooses, cluster on slow movement and stop dead when the hand pauses. The handler records a target only; the loop damps a follower toward it and samples the follower.',
    'Damping with a per-frame constant (`x += (t - x) * 0.1`) instead of `damp(..., dt)`. The trail is visibly tighter at 120Hz than at 60Hz, so the feel is tuned to whichever machine it was authored on.',
    'Measuring velocity as a per-frame delta rather than dividing by `dt`. The same hand movement then reads as half the speed at 120Hz, and the smear strength — and with it the whole character of the effect — depends on the display.',
    'Sampling the Bayer threshold per fragment instead of per block. The reveal edge becomes smooth, which is precisely the thing a dither is supposed to replace, and the block grid stops being legible.',
    'Comparing against the Bayer matrix without an epsilon. Its zero cell passes `step()` everywhere, so one pixel in every 5x5 block is lit across the entire canvas, including areas the pointer has never visited.',
    'Dividing the 8x8 matrix by 63 instead of 64. A threshold of exactly 1.0 means the brightest level can never be selected, and the whitest part of the image clips one step down.',
    'Assuming `src` is decoded. A `TextureLoader` result arrives asynchronously and may never arrive at all. Leaving the sampler unbound until then is undefined behaviour — black on some drivers, a console warning per draw on others. A 1x1 placeholder is bound from the first frame and a `uHasImage` float selects a procedural stand-in.',
    'Letting a 404 throw or blank the panel. A component that cannot survive a missing image cannot be dropped into a CMS-backed page. The error callback leaves `uHasImage` at 0 and the trail keeps working over the stand-in field.',
    'Not cancelling an in-flight decode. If `src` changes or the component unmounts mid-load, the callback fires against a dead renderer and the texture is uploaded and then leaked. A `cancelled` flag disposes it instead.',
    'Rendering at full device pixel ratio. Fill is the entire cost of a fullscreen quad and it scales with the square of the ratio, for an image whose smallest feature is deliberately five pixels wide.',
    'Owning the canvas in React while calling `forceContextLoss()` on cleanup. Under `reactStrictMode` the effect runs twice and the second `getContext` on that same element returns the DEAD context: blank in development, fine in production, which is the worst way for a bug to behave.',
    'Shipping the demo image as a committed asset. The image is a prop; the demo paints its own canvas and passes a data URL, so the registry carries no binary.',
  ],

  notes: [
    '`src` is required and is never bundled. Anything a browser can fetch works: an http(s) URL, a `blob:` from an upload, or a `data:` URL.',
    'Coarse pointers get the composed still rather than the live effect. `pointermove` only fires mid-drag on touch, so the reveal would appear under the finger covering it and then be stranded on lift.',
    'Without WebGL the component renders the image plainly with `object-fit: cover`. The picture is the content; the dither is decoration on top of it.',
    'The decoded texture is held across renderer rebuilds, so a resize or a dpr change re-uploads it rather than refetching. It is disposed in its own unmount effect, separate from the loader effect that reruns on every `src` change.',
    'Leaving the panel does not clear the trail. Samples keep ageing out on their own, so the reveal finishes its life instead of vanishing on `pointerleave`.',
    'The root carries `role="img"` and the `alt` text; an empty `alt` marks the whole panel decorative with `aria-hidden` instead.',
  ],

  apiSignature:
    'function DitherTrailImageReveal(props: { src: string; alt?: string; levels?: number; blockSize?: number; trailLife?: number; spawnDistance?: number; spawnInterval?: number; flowGain?: number; smoothing?: number; restBrightness?: number; restSaturation?: number; fps?: number; maxDpr?: number; className?: string }): JSX.Element',

  props: [
    { name: 'src', type: 'string', description: 'Required. Image URL — http(s), blob: or data:. Never a bundled asset.' },
    { name: 'alt', type: 'string', default: "''", description: 'Accessible name for the panel. Empty marks it decorative.' },
    { name: 'levels', type: 'number', default: '4', description: 'Quantisation steps per channel inside the reveal.' },
    { name: 'blockSize', type: 'number', default: '5', description: 'Dither block size in CSS pixels.' },
    { name: 'trailLife', type: 'number', default: '1.05', description: 'Life of one trail sample in seconds.' },
    { name: 'spawnDistance', type: 'number', default: '0.012', description: 'Follower travel in uv units that releases the next sample.' },
    { name: 'spawnInterval', type: 'number', default: '0.042', description: 'Seconds after which a sample is released even with no movement.' },
    { name: 'flowGain', type: 'number', default: '0.03', description: 'uv offset stored per uv/second of pointer velocity.' },
    { name: 'smoothing', type: 'number', default: '0.0002', description: 'Fraction of the pointer gap still remaining after one second.' },
    { name: 'restBrightness', type: 'number', default: '0.5', description: 'Brightness of the untouched image, 0 to 1.' },
    { name: 'restSaturation', type: 'number', default: '0.16', description: 'Saturation of the untouched image, 0 to 1.' },
    { name: 'fps', type: 'number', default: '30', description: 'Draw rate ceiling. Pointer state still updates every frame.' },
    { name: 'maxDpr', type: 'number', default: '1.5', description: 'Device pixel ratio cap, before the 1100px absolute buffer cap.' },
    { name: 'className', type: 'string', description: 'Merged onto the root container via `cn`.' },
  ],

  reducedMotion:
    'The loop never starts. A short frozen swipe — nine samples with descending life and a plausible velocity — is baked into the ring and one frame is drawn, so the panel shows what the effect produces rather than a flat dimmed image. Coarse pointers get the same still, for the same reason. The listeners stay attached but their target is never consumed, so moving the pointer changes nothing.',

  cleanup:
    'Removes the three pointer listeners from the canvas, nulls the stage ref so an in-flight frame cannot touch a dead renderer, then `disposeRenderer(renderer)` — which force-loses the context, not just `dispose()`, since Chromium keeps roughly sixteen per process and drops the oldest — followed by the geometry, the material and the 1x1 placeholder texture, and finally removes the canvas from the DOM. The decoded image texture is disposed in a separate unmount effect, and an in-flight decode is cancelled by a flag so its callback disposes the result instead of binding it.',

  acceptance:
    'At rest the image is visible but dimmed and nearly grey. Drag across it and full colour appears in a trail of hard-edged square blocks that widens and fades behind the pointer, with the blocks smeared along the direction of travel — more on a flick, less on a slow drag. The untouched area contains no stray lit pixels anywhere. Stop moving and the reveal stays alive under the cursor instead of dying. Leave the panel and the trail finishes ageing out where it stands. The follow lag is identical on a 60Hz and a 120Hz display. Point at a `src` that 404s: the panel shows a banded stand-in field, the trail still works, and the console carries no exception. Resize wide and the image stays cover-cropped with no stretching, and the trail discs stay round.',

  criticalRegion: 'critical',
};

export default meta;
