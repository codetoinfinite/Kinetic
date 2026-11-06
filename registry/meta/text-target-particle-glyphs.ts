import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'text-target-particle-glyphs',
  title: 'Text-Target Particle Glyphs',
  category: 'webgl',
  tags: ['three', 'points', 'text', 'canvas-raster', 'morph', 'vertex-shader'],
  blurb:
    'A particle cloud gathers into a word rasterised from a font already on the page, written left to right, then lets it go.',
  cost: 'webgl',
  motif: 'split',

  files: [
    {
      path: 'registry/ui/text-target-particle-glyphs.tsx',
      type: 'registry:ui',
      role: 'component',
    },
    {
      path: 'registry/shaders/text-target-particle-glyphs.ts',
      type: 'registry:lib',
      role: 'vertex and fragment source',
    },
  ],
  dependencies: ['three@^0.185.1'],

  summary:
    'Draws a word once into an offscreen 2D canvas with a font the page has already loaded, collects the inked pixels of that raster, and hands them out as destinations to a drifting particle cloud. The stagger is keyed to each destination\'s own horizontal position, so the word assembles left to right — it is written rather than faded in — and then dissolves right to left. Destinations are stored in glyph-box units and scaled by one uniform, so a container resize costs two uniform writes rather than a re-raster. Nothing ships but code: no glyph atlas, no texture, no font file.',

  mechanism: [
    'The word is measured once at a 100px probe size and then drawn at `1024 * 0.92 * 100 / probeWidth`, capped at 66% of the raster height. `measureText` is linear in font size, so a single measurement gives the exact fit that a binary search would converge to, for any string and any family.',
    'One pass over the `getImageData` buffer collects the index of every pixel whose alpha exceeds 120 into an `Int32Array`, and tracks the min and max x and y as it goes. That array is the coverage list; the min/max are the ink box. Rejection sampling — guess a pixel, keep it if it is inked — is the usual approach and is much worse: text covers roughly 5% of its box, so the average particle needs twenty guesses and the worst case is unbounded.',
    'A particle picks `pixels[floor(rng() * pixels.length)]`, unpacks it as `x = i % width, y = (i - x) / width`, adds a sub-pixel jitter, and normalises against the INK box rather than the canvas: `u = (x + rng() - minX) / boxW`. The destination is stored as `vec2(u - 0.5, (0.5 - v) * boxH / boxW)` — glyph-box units, with the aspect ratio folded into y.',
    'Because the destination carries its own aspect, one `uWordWidth` uniform scales both axes in the vertex shader and the letterforms cannot be stretched. Layout is derived from the camera: `viewH = 2 * 6 * tan(fov/2)`, `viewW = viewH * aspect`, and `wordWidth = min(viewW * 0.86, viewH * 0.72 / glyphAspect)` — the width bound for the usual case, the height bound for a short wide frame.',
    'The morph is `form = smoothstep(order * 0.45, order * 0.45 + 0.55, uMorph)` with `order = clamp(aTarget.x + 0.5, 0, 1)`. Order comes from the DESTINATION, not the buffer index: index order dissolves the word into place everywhere at once, destination order writes it left to right, and only the second one reads as language. `pos = mix(home, glyph, form)`.',
    'The resting cloud is a seeded uniform scatter in 0..1 per axis, mapped through `uViewSize` to the visible frustum, so it fills whatever the container is. Drift amplitude is `mix(uHomeDrift * viewH, uGlyphDrift * wordWidth, form)`: a loose cloud at rest and a barely-breathing letterform once written, from one interpolated amplitude rather than two motion states that would need cross-fading.',
    'Travel bows outward via `sin(form * PI)`, which is zero at both ends and peaks at the halfway point, displacing each particle along its own fixed angle. Without it fourteen thousand points run down fourteen thousand straight lines and the eye reads a lerp; with it the transit reads as a swarm.',
    'Point size is perspective-corrected: `uSize * jitter * uSizeScale / max(0.1, -mv.z)` with `uSizeScale = pixelRatio * 6`, the camera\'s distance to the word plane, which makes `uSize` a literal CSS-pixel diameter for a landed particle. `uSize` is then scaled by `clamp(containerWidth / 880, 0.55, 1.15)`, because the word always spans the same fraction of the frame and its strokes are therefore thinner in CSS pixels on a small card.',
    'Left unattended the component runs a cycle: damp toward 1, snap at 0.9995, hold, damp toward 0, hold, repeat. Supplying `progress` overrides the whole state machine and makes the word a scrubbable function of scroll — damped rather than assigned, so a scroll value that jumps between frames does not teleport the letters.',
  ],

  constants: [
    {
      name: 'raster size',
      value: '1024 x 320',
      why: 'The mask is the only description of the letterforms there is. A stroke narrower than about three pixels samples into a dotted line, and at 1024 across even a ten-character word keeps five or six pixels in its stems. Doubling it quadruples the single `getImageData` pass for detail that fourteen thousand particles cannot resolve.',
    },
    {
      name: 'RASTER_FILL / RASTER_CAP',
      value: '0.92 / 0.66',
      why: 'The text is fitted to 92% of the raster width, or to 66% of its height if that binds first. The width margin absorbs italic overhang and side bearings that `measureText` under-reports; the height cap is what stops a two-letter word from being fitted so large that its ascenders are clipped off the top of the canvas.',
    },
    {
      name: 'ALPHA_THRESHOLD',
      value: '120',
      why: 'Alpha above which a pixel counts as inked. Anti-aliasing puts a one-pixel skirt of low alpha around every stroke; including it thickens the word by two pixels everywhere and rounds off the corners, which is precisely the crispness the raster was for. Much above 160 and hairline serifs stop registering at all.',
    },
    {
      name: 'MIN_COVERAGE_PIXELS',
      value: '1200',
      why: 'Below this the raster is a failure rather than a short word — an unloaded font, an empty string, a canvas with no 2D context. Rendering it anyway crushes every particle onto a handful of pixels, which looks like a bug rather than like text, so the target is rejected and the cloud simply keeps drifting.',
    },
    {
      name: 'STAGGER / WINDOW',
      value: '0.45 / 0.55',
      why: 'They sum to exactly 1.0, so the last letter starts as late as possible and still finishes exactly as `uMorph` reaches 1 — no dead time at either end of the write. Below about 0.25 the word arrives all at once and the left-to-right reading is lost; above 0.6 the first letters sit finished for most of the animation.',
    },
    {
      name: 'WRITE_SMOOTHING / DISSOLVE_SMOOTHING',
      value: '0.05 / 0.012',
      why: 'Fraction of the gap remaining after one second, so roughly a two-second write and a faster dissolve. Asymmetric on purpose: the word has already been read by the time it leaves, and an exit as slow as the entrance makes the cycle feel stalled. Both are `damp` smoothings, not per-frame lerps — the per-frame form of the same curve runs twice as fast at 120 Hz.',
    },
    {
      name: 'MORPH_EPSILON',
      value: '0.9995',
      why: '`damp` is asymptotic and never arrives, but the rightmost stagger window needs `uMorph` to reach exactly 1.0 or the last letter stays a hair short of its target forever. Past this threshold it snaps, and the same threshold mirrored at 0.0005 ends the dissolve.',
    },
    {
      name: 'fill / FILL_HEIGHT',
      value: '0.86 / 0.72',
      why: 'The word takes 86% of the visible width, or 72% of the visible height if the frame is short and wide. Both bounds are needed: width alone clips a tall word in a letterbox container, height alone leaves a short word floating in a tall one.',
    },
    {
      name: 'CAMERA_DISTANCE',
      value: '6 world units',
      why: 'Fixed, with the word scaled to fit rather than the camera moved. Distance is half of the perspective size term, so moving it would change every particle\'s pixel size on every reflow; holding it fixed means only `uWordWidth` and `uViewSize` change on resize.',
    },
    {
      name: 'REFERENCE_WIDTH clamp',
      value: '880px, 0.55x to 1.15x',
      why: 'The container width the default `size` was authored at. Since the word always spans the same fraction of the frame, its stroke thickness in CSS pixels is proportional to container width; particles that do not shrink with it fill the counters of the letters solid on a small card. The clamp stops the ramp from vanishing on a thumbnail or bloating on a 4K hero.',
    },
    {
      name: 'count',
      value: '14000',
      why: 'Enough that the strokes of a seven-character word read as continuous marks rather than as a dotted outline. Text needs more than a silhouette does, because the eye is checking letterforms it already knows against a template; the cost is fill, not vertex count.',
    },
    {
      name: 'size / maxSize',
      value: '2.2 / 18 CSS px',
      why: 'Landed diameter before the 0.6x-1.8x jitter, and the ceiling after 1/z growth. The clamp is not cosmetic: a particle drifting near the near plane would otherwise ask for a point size in the thousands, which drivers answer by capping silently or by dropping the draw call.',
    },
    {
      name: 'swarm',
      value: '0.05 of the word width',
      why: 'Peak mid-flight bow. Around 5% the transit looks like particles finding their place; past roughly 15% the cloud detours so far that the word appears to explode before it forms, and below 2% the straight-line lerp shows through.',
    },
    {
      name: 'homeDrift / glyphDrift',
      value: '0.05 of view height / 0.0016 of word width',
      why: 'A thirty-fold difference in amplitude, which is what separates "a cloud" from "a word that is alive". Give the written state more than about 0.005 and the letterforms visibly wobble, which reads as an unstable render rather than as breathing.',
    },
    {
      name: 'THICKNESS',
      value: '0.02 of the word width',
      why: 'Depth spread of the written word. Non-zero so perspective sizing has something to act on and the letters are made of particles at different depths rather than of a flat decal; small enough that the word still reads as typeset on a plane.',
    },
  ],

  pitfalls: [
    'Rejection-sampling the raster. Guessing a pixel and keeping it if it is inked is the first idea and it scales badly: glyph coverage is around 5% of the box, so the expected cost is twenty draws per particle and the worst case has no bound — a long word in a light weight can spin for a noticeable fraction of a second. One pass into a coverage list is O(pixels) once and O(1) per particle.',
    'Rasterising before the webfont has loaded. `measureText` and `fillText` silently fall back to another family, so the particles land on the wrong letterforms and stay there for the life of the page — and it only reproduces on a cold cache, which is why it ships. Check `document.fonts.check` and redo the raster on `document.fonts.ready`.',
    'Normalising destinations against the canvas box instead of the measured ink box. Ascenders, descenders and side bearings differ per string, so the word ends up floating off-centre by whatever margin that particular string happens to have, and the offset changes when the copy changes.',
    'Storing destinations in world units. They then depend on the camera, so every container resize means re-rasterising the text, re-sampling every particle and re-uploading the buffer — during a drag-resize, once per frame. Normalised units plus one scale uniform make the same resize two uniform writes.',
    'Scaling x and y by separate uniforms. It is the natural way to write it and it stretches the letterforms at one container width and squashes them at another. Folding the ink box aspect into the stored y and scaling both axes by a single width makes the distortion impossible to introduce.',
    'Ordering the stagger by buffer index. The word then resolves out of noise everywhere at once, which is a cross-fade with extra steps. Ordering by the destination\'s own x costs one `clamp` in the shader and turns the same animation into writing.',
    'Landing every particle on an integer pixel centre. Without sub-pixel jitter the raster lattice is visible as soon as the container is wide enough for one mask pixel to cover more than one particle, and the word acquires a faint corduroy texture.',
    'Rendering whatever the raster produced. An empty string, a font that never loaded, a zero-size canvas: all of them return a nearly empty mask, and mapping fourteen thousand particles onto forty pixels looks like a crash. Reject the target below a coverage floor and leave the cloud drifting instead.',
    'Leaving `frustumCulled` on. Every position in this component is computed in the vertex shader, so the bounding sphere three derives from the attribute — a unit cube of 0..1 values — has nothing to do with where the particles are, and the whole cloud vanishes at some container aspect ratios.',
    'Making `gl_PointSize` constant. Point size does not fall off with distance on its own, so the cloud has no depth cue at all and the word looks like a flat stencil. Dividing by view-space depth is the whole effect, and `max(0.1, -mv.z)` is a required guard, not a nicety.',
    'Depth-testing a translucent point cloud. With `depthWrite` on, fourteen thousand sprites occlude each other in buffer order and the strokes tear into hard layers; sorting per frame on the CPU is unaffordable. Because the coverage list is drawn from at random, buffer order is uncorrelated with depth and an unsorted blend averages into even density.',
    'Passing a scroll-driven `progress` as an effect dependency. The value changes every frame, so the text would be re-rasterised and every buffer rebuilt sixty times a second. It is held in a ref and read inside the frame callback.',
    'Calling `getImageData` on a GPU-backed canvas. There is exactly one read here, but without `willReadFrequently` that single read stalls the pipeline for several milliseconds during mount, on the same frame as the WebGL context creation.',
  ],

  notes: [
    'The word is rasterised from a font that is already on the page: `fontFamily` defaults to the host element\'s computed family, so the particles adopt whatever the surrounding type is. No glyph atlas, texture or font file is shipped with the component, and nothing under `registry/` is a binary.',
    'One line only. A newline is not laid out — multi-line text needs one `fillText` per line, with the coverage pass and the ink box spanning all of them.',
    'The raster runs once per rebuild, plus once more if the font was still loading. It is a `fillText`, one `getImageData` over 327,680 pixels and one sampling loop — low single-digit milliseconds — and the canvas has its width and height zeroed straight afterwards to release the backing store.',
    'The font-load reraster reuses the same seed, so the cloud does not reshuffle when the real family arrives: only the destinations change, and any particle already in flight simply continues to a slightly different address.',
    'Supply `progress` to drive the word from scroll, a timeline or an audio envelope; leave it out and the component writes, holds, dissolves and rewrites on its own. `loop: false` writes once and keeps the word.',
    'One draw call and one buffer set for the whole effect. The cost is fill: fourteen thousand blended sprites, heaviest at the moment the word is written and its particles overlap inside the strokes.',
    'three constructs its own canvas, which is appended and removed per effect run. Reusing a React-owned `<canvas ref>` is unsafe here: cleanup calls `forceContextLoss()`, and under React 19 StrictMode the remount would hand the effect back the dead context, leaving the component permanently black.',
    'The rAF subscription is gated on `useInView` and `useVisibility`, so a scrolled-away or backgrounded instance stops paying for fill and resumes its cycle from wherever it froze.',
  ],

  apiSignature:
    'function TextTargetParticleGlyphs(props: { text?: string; fontFamily?: string; fontWeight?: string | number; count?: number; size?: number; maxSize?: number; fill?: number; progress?: number; loop?: boolean; holdWritten?: number; holdScattered?: number; homeSpread?: number; homeDrift?: number; glyphDrift?: number; swarm?: number; opacity?: number; colorCloud?: string; colorGlyph?: string; fov?: number; seed?: number | string; className?: string }): JSX.Element',

  props: [
    { name: 'text', type: 'string', default: "'KINETIC'", description: 'The word to write. One line — a newline is not laid out.' },
    { name: 'fontFamily', type: 'string', description: "CSS font family list for the raster. Defaults to the host element's computed family, so the word uses a font the page has already loaded." },
    { name: 'fontWeight', type: 'string | number', default: '700', description: 'CSS font weight for the raster. Heavier strokes hold more particles and read better at small sizes.' },
    { name: 'count', type: 'number', default: '14000', description: 'Particle count. One buffer, one draw call; cost is linear in fill.' },
    { name: 'size', type: 'number', default: '2.2', description: 'Particle diameter in CSS pixels for a landed particle, before the per-particle jitter and the container-width ramp.' },
    { name: 'maxSize', type: 'number', default: '18', description: 'Ceiling in CSS pixels on the perspective-grown size.' },
    { name: 'fill', type: 'number', default: '0.86', description: 'Fraction of the visible width the written word spans, unless the height bound binds first.' },
    { name: 'progress', type: 'number', description: 'Authoritative morph from 0 (scattered) to 1 (written). Supply it to drive the word from scroll or a timeline; it is held in a ref, so a per-frame value does not rebuild anything.' },
    { name: 'loop', type: 'boolean', default: 'true', description: 'Write, hold, dissolve, repeat. Ignored while `progress` is supplied; `false` writes once and keeps the word.' },
    { name: 'holdWritten', type: 'number', default: '2.4', description: 'Seconds the finished word is held before it dissolves.' },
    { name: 'holdScattered', type: 'number', default: '1.1', description: 'Seconds the cloud drifts before the next write.' },
    { name: 'homeSpread', type: 'number', default: '1.15', description: 'Resting cloud size as a multiple of the visible frame. Above 1 so there is no empty margin at the edges.' },
    { name: 'homeDrift', type: 'number', default: '0.05', description: 'Resting drift amplitude, as a fraction of the visible height.' },
    { name: 'glyphDrift', type: 'number', default: '0.0016', description: 'Residual drift once written, as a fraction of the word width. Keeps the letterforms alive without wobbling them.' },
    { name: 'swarm', type: 'number', default: '0.05', description: 'Peak mid-flight bow, as a fraction of the word width. Zero at both ends of the morph.' },
    { name: 'opacity', type: 'number', default: '0.95', description: 'Overall alpha multiplier applied in the vertex shader.' },
    { name: 'colorCloud', type: 'string', default: "'#5d6875'", description: 'Tint of the scattered cloud; particles cross to `colorGlyph` as they land.' },
    { name: 'colorGlyph', type: 'string', default: "'#ffffff'", description: 'Tint of the written word.' },
    { name: 'fov', type: 'number', default: '34', description: 'Vertical field of view in degrees. The visible extent, and therefore the word width, is derived from it.' },
    { name: 'seed', type: 'number | string', default: "'text-target-particle-glyphs'", description: 'Seeds the home scatter, the per-particle randoms and the destination draw, so the same cloud is produced on the server and on every reload.' },
    { name: 'className', type: 'string', description: 'Merged onto the host element via `cn`.' },
  ],

  reducedMotion:
    'No rAF subscription is opened and one still frame is drawn with `uMorph` forced to 1 and `uElapsed` at 0 — the word fully written and completely still, not the scattered cloud. The typography, the particle grain, the depth cue from perspective point sizing and the colour of the written state are all present; the writing, the drift and the dissolve cycle are what stop. A resize redraws the same still. If the raster was rejected there is nothing to write, so the still shows the motionless cloud instead.',

  cleanup:
    'The offscreen 2D canvas has its width and height zeroed as soon as the coverage pass is done, releasing the backing store before the WebGL context is even created. A `live` flag is cleared on unmount so a `document.fonts.ready` promise that resolves after teardown cannot write into a disposed attribute. The stage ref is nulled so an in-flight frame cannot draw into a dying context, `disposeObject(scene)` disposes the point geometry and its attributes, the material is disposed explicitly as well, then `disposeRenderer` performs `dispose()` + `forceContextLoss()` + a zeroed drawing buffer — `dispose()` alone leaves the context alive — and the canvas node is removed. `useRaf`, `useInView`, `useVisibility` and `useResizeObserver` release their own subscriptions.',

  acceptance:
    'On entering view the cloud gathers into the word from left to right over about two seconds — watch the first letter finish while the last is still travelling — holds it, then dissolves right to left and repeats. The letterforms are legible and match the page\'s own font, with no gaps in the stems and no visible pixel lattice inside a stroke. Particles nearer the camera are larger, and none of them pop out of existence at any container aspect ratio. Resize from wide to narrow: the word stays fully inside the frame, keeps its proportions rather than stretching, and the particles get smaller with it instead of filling the counters solid. Hard-reload with the cache disabled on a page using a webfont: the word must end up in the real face, not the fallback. Set `text=""` and the cloud keeps drifting rather than collapsing into a blob. With reduced motion the finished word renders immediately and holds still.',

  criticalRegion: 'critical',
};

export default meta;
