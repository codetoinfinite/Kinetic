# Build: Text-Target Particle Glyphs

Draws a word once into an offscreen 2D canvas with a font the page has already loaded, collects the inked pixels of that raster, and hands them out as destinations to a drifting particle cloud. The stagger is keyed to each destination's own horizontal position, so the word assembles left to right — it is written rather than faded in — and then dissolves right to left. Destinations are stored in glyph-box units and scaled by one uniform, so a container resize costs two uniform writes rather than a re-raster. Nothing ships but code: no glyph atlas, no texture, no font file.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A particle cloud gathers into a word rasterised from a font already on the page, written left to right, then lets it go.

- Category: webgl
- Runtime cost: webgl
- Dependencies: three@^0.185.1

## How it works

1. The word is measured once at a 100px probe size and then drawn at `1024 * 0.92 * 100 / probeWidth`, capped at 66% of the raster height. `measureText` is linear in font size, so a single measurement gives the exact fit that a binary search would converge to, for any string and any family.
2. One pass over the `getImageData` buffer collects the index of every pixel whose alpha exceeds 120 into an `Int32Array`, and tracks the min and max x and y as it goes. That array is the coverage list; the min/max are the ink box. Rejection sampling — guess a pixel, keep it if it is inked — is the usual approach and is much worse: text covers roughly 5% of its box, so the average particle needs twenty guesses and the worst case is unbounded.
3. A particle picks `pixels[floor(rng() * pixels.length)]`, unpacks it as `x = i % width, y = (i - x) / width`, adds a sub-pixel jitter, and normalises against the INK box rather than the canvas: `u = (x + rng() - minX) / boxW`. The destination is stored as `vec2(u - 0.5, (0.5 - v) * boxH / boxW)` — glyph-box units, with the aspect ratio folded into y.
4. Because the destination carries its own aspect, one `uWordWidth` uniform scales both axes in the vertex shader and the letterforms cannot be stretched. Layout is derived from the camera: `viewH = 2 * 6 * tan(fov/2)`, `viewW = viewH * aspect`, and `wordWidth = min(viewW * 0.86, viewH * 0.72 / glyphAspect)` — the width bound for the usual case, the height bound for a short wide frame.
5. The morph is `form = smoothstep(order * 0.45, order * 0.45 + 0.55, uMorph)` with `order = clamp(aTarget.x + 0.5, 0, 1)`. Order comes from the DESTINATION, not the buffer index: index order dissolves the word into place everywhere at once, destination order writes it left to right, and only the second one reads as language. `pos = mix(home, glyph, form)`.
6. The resting cloud is a seeded uniform scatter in 0..1 per axis, mapped through `uViewSize` to the visible frustum, so it fills whatever the container is. Drift amplitude is `mix(uHomeDrift * viewH, uGlyphDrift * wordWidth, form)`: a loose cloud at rest and a barely-breathing letterform once written, from one interpolated amplitude rather than two motion states that would need cross-fading.
7. Travel bows outward via `sin(form * PI)`, which is zero at both ends and peaks at the halfway point, displacing each particle along its own fixed angle. Without it fourteen thousand points run down fourteen thousand straight lines and the eye reads a lerp; with it the transit reads as a swarm.
8. Point size is perspective-corrected: `uSize * jitter * uSizeScale / max(0.1, -mv.z)` with `uSizeScale = pixelRatio * 6`, the camera's distance to the word plane, which makes `uSize` a literal CSS-pixel diameter for a landed particle. `uSize` is then scaled by `clamp(containerWidth / 880, 0.55, 1.15)`, because the word always spans the same fraction of the frame and its strokes are therefore thinner in CSS pixels on a small card.
9. Left unattended the component runs a cycle: damp toward 1, snap at 0.9995, hold, damp toward 0, hold, repeat. Supplying `progress` overrides the whole state machine and makes the word a scrubbable function of scroll — damped rather than assigned, so a scroll value that jumps between frames does not teleport the letters.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `raster size = 1024 x 320`
  The mask is the only description of the letterforms there is. A stroke narrower than about three pixels samples into a dotted line, and at 1024 across even a ten-character word keeps five or six pixels in its stems. Doubling it quadruples the single `getImageData` pass for detail that fourteen thousand particles cannot resolve.
- `RASTER_FILL / RASTER_CAP = 0.92 / 0.66`
  The text is fitted to 92% of the raster width, or to 66% of its height if that binds first. The width margin absorbs italic overhang and side bearings that `measureText` under-reports; the height cap is what stops a two-letter word from being fitted so large that its ascenders are clipped off the top of the canvas.
- `ALPHA_THRESHOLD = 120`
  Alpha above which a pixel counts as inked. Anti-aliasing puts a one-pixel skirt of low alpha around every stroke; including it thickens the word by two pixels everywhere and rounds off the corners, which is precisely the crispness the raster was for. Much above 160 and hairline serifs stop registering at all.
- `MIN_COVERAGE_PIXELS = 1200`
  Below this the raster is a failure rather than a short word — an unloaded font, an empty string, a canvas with no 2D context. Rendering it anyway crushes every particle onto a handful of pixels, which looks like a bug rather than like text, so the target is rejected and the cloud simply keeps drifting.
- `STAGGER / WINDOW = 0.45 / 0.55`
  They sum to exactly 1.0, so the last letter starts as late as possible and still finishes exactly as `uMorph` reaches 1 — no dead time at either end of the write. Below about 0.25 the word arrives all at once and the left-to-right reading is lost; above 0.6 the first letters sit finished for most of the animation.
- `WRITE_SMOOTHING / DISSOLVE_SMOOTHING = 0.05 / 0.012`
  Fraction of the gap remaining after one second, so roughly a two-second write and a faster dissolve. Asymmetric on purpose: the word has already been read by the time it leaves, and an exit as slow as the entrance makes the cycle feel stalled. Both are `damp` smoothings, not per-frame lerps — the per-frame form of the same curve runs twice as fast at 120 Hz.
- `MORPH_EPSILON = 0.9995`
  `damp` is asymptotic and never arrives, but the rightmost stagger window needs `uMorph` to reach exactly 1.0 or the last letter stays a hair short of its target forever. Past this threshold it snaps, and the same threshold mirrored at 0.0005 ends the dissolve.
- `fill / FILL_HEIGHT = 0.86 / 0.72`
  The word takes 86% of the visible width, or 72% of the visible height if the frame is short and wide. Both bounds are needed: width alone clips a tall word in a letterbox container, height alone leaves a short word floating in a tall one.
- `CAMERA_DISTANCE = 6 world units`
  Fixed, with the word scaled to fit rather than the camera moved. Distance is half of the perspective size term, so moving it would change every particle's pixel size on every reflow; holding it fixed means only `uWordWidth` and `uViewSize` change on resize.
- `REFERENCE_WIDTH clamp = 880px, 0.55x to 1.15x`
  The container width the default `size` was authored at. Since the word always spans the same fraction of the frame, its stroke thickness in CSS pixels is proportional to container width; particles that do not shrink with it fill the counters of the letters solid on a small card. The clamp stops the ramp from vanishing on a thumbnail or bloating on a 4K hero.
- `count = 14000`
  Enough that the strokes of a seven-character word read as continuous marks rather than as a dotted outline. Text needs more than a silhouette does, because the eye is checking letterforms it already knows against a template; the cost is fill, not vertex count.
- `size / maxSize = 2.2 / 18 CSS px`
  Landed diameter before the 0.6x-1.8x jitter, and the ceiling after 1/z growth. The clamp is not cosmetic: a particle drifting near the near plane would otherwise ask for a point size in the thousands, which drivers answer by capping silently or by dropping the draw call.
- `swarm = 0.05 of the word width`
  Peak mid-flight bow. Around 5% the transit looks like particles finding their place; past roughly 15% the cloud detours so far that the word appears to explode before it forms, and below 2% the straight-line lerp shows through.
- `homeDrift / glyphDrift = 0.05 of view height / 0.0016 of word width`
  A thirty-fold difference in amplitude, which is what separates "a cloud" from "a word that is alive". Give the written state more than about 0.005 and the letterforms visibly wobble, which reads as an unstable render rather than as breathing.
- `THICKNESS = 0.02 of the word width`
  Depth spread of the written word. Non-zero so perspective sizing has something to act on and the letters are made of particles at different depths rather than of a flat decal; small enough that the word still reads as typeset on a plane.

## API

```ts
function TextTargetParticleGlyphs(props: { text?: string; fontFamily?: string; fontWeight?: string | number; count?: number; size?: number; maxSize?: number; fill?: number; progress?: number; loop?: boolean; holdWritten?: number; holdScattered?: number; homeSpread?: number; homeDrift?: number; glyphDrift?: number; swarm?: number; opacity?: number; colorCloud?: string; colorGlyph?: string; fov?: number; seed?: number | string; className?: string }): JSX.Element
```

- `text: string` — default `'KINETIC'`
  The word to write. One line — a newline is not laid out.
- `fontFamily: string`
  CSS font family list for the raster. Defaults to the host element's computed family, so the word uses a font the page has already loaded.
- `fontWeight: string | number` — default `700`
  CSS font weight for the raster. Heavier strokes hold more particles and read better at small sizes.
- `count: number` — default `14000`
  Particle count. One buffer, one draw call; cost is linear in fill.
- `size: number` — default `2.2`
  Particle diameter in CSS pixels for a landed particle, before the per-particle jitter and the container-width ramp.
- `maxSize: number` — default `18`
  Ceiling in CSS pixels on the perspective-grown size.
- `fill: number` — default `0.86`
  Fraction of the visible width the written word spans, unless the height bound binds first.
- `progress: number`
  Authoritative morph from 0 (scattered) to 1 (written). Supply it to drive the word from scroll or a timeline; it is held in a ref, so a per-frame value does not rebuild anything.
- `loop: boolean` — default `true`
  Write, hold, dissolve, repeat. Ignored while `progress` is supplied; `false` writes once and keeps the word.
- `holdWritten: number` — default `2.4`
  Seconds the finished word is held before it dissolves.
- `holdScattered: number` — default `1.1`
  Seconds the cloud drifts before the next write.
- `homeSpread: number` — default `1.15`
  Resting cloud size as a multiple of the visible frame. Above 1 so there is no empty margin at the edges.
- `homeDrift: number` — default `0.05`
  Resting drift amplitude, as a fraction of the visible height.
- `glyphDrift: number` — default `0.0016`
  Residual drift once written, as a fraction of the word width. Keeps the letterforms alive without wobbling them.
- `swarm: number` — default `0.05`
  Peak mid-flight bow, as a fraction of the word width. Zero at both ends of the morph.
- `opacity: number` — default `0.95`
  Overall alpha multiplier applied in the vertex shader.
- `colorCloud: string` — default `'#5d6875'`
  Tint of the scattered cloud; particles cross to `colorGlyph` as they land.
- `colorGlyph: string` — default `'#ffffff'`
  Tint of the written word.
- `fov: number` — default `34`
  Vertical field of view in degrees. The visible extent, and therefore the word width, is derived from it.
- `seed: number | string` — default `'text-target-particle-glyphs'`
  Seeds the home scatter, the per-particle randoms and the destination draw, so the same cloud is produced on the server and on every reload.
- `className: string`
  Merged onto the host element via `cn`.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/**
 * Draw `text` into an offscreen canvas with a font already on the page and
 * collect every inked pixel. Returns `null` when the raster is unusable rather
 * than handing back a target that would render as a half-word.
 */
function rasteriseGlyphs(text: string, weight: string | number, family: string): GlyphMask | null {
  const line = text.trim();
  if (!line) return null;

  const canvas = document.createElement('canvas');
  canvas.width = RASTER_WIDTH;
  canvas.height = RASTER_HEIGHT;
  // `willReadFrequently` moves the canvas to a CPU backing store. There is
  // exactly one `getImageData` here, but on a GPU-backed canvas that single
  // read is a pipeline stall of several milliseconds.
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  const release = () => {
    canvas.width = 0;
    canvas.height = 0;
  };

  // Measure at a probe size and scale: `measureText` is linear in font size, so
  // one measurement gives the exact fit that a search would converge to.
  ctx.font = `${weight} ${PROBE_SIZE}px ${family}`;
  const probe = ctx.measureText(line).width;
  if (!(probe > 0)) {
    release();
    return null;
  }

  const fontSize = Math.min(
    (RASTER_WIDTH * RASTER_FILL * PROBE_SIZE) / probe,
    RASTER_HEIGHT * RASTER_CAP,
  );
  ctx.font = `${weight} ${fontSize}px ${family}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(line, RASTER_WIDTH / 2, RASTER_HEIGHT / 2);

  const data = ctx.getImageData(0, 0, RASTER_WIDTH, RASTER_HEIGHT).data;

  // Allocate for the worst case and slice down. Growing a plain array to tens
  // of thousands of entries reallocates repeatedly inside the hot pass.
  const scratch = new Int32Array(RASTER_WIDTH * RASTER_HEIGHT);
  let covered = 0;
  let minX = RASTER_WIDTH;
  let minY = RASTER_HEIGHT;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < RASTER_HEIGHT; y += 1) {
    for (let x = 0; x < RASTER_WIDTH; x += 1) {
      const p = y * RASTER_WIDTH + x;
      if ((data[p * 4 + 3] ?? 0) <= ALPHA_THRESHOLD) continue;
      scratch[covered] = p;
      covered += 1;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  release();
  if (covered < MIN_COVERAGE_PIXELS || maxX <= minX || maxY <= minY) return null;

  // The measured ink box, not the canvas box. Ascenders, descenders and side
  // bearings differ per string; fitting to the canvas would leave the word
  // floating off-centre by whatever margin this particular string happens to
  // have.
  return { pixels: scratch.slice(0, covered), width: RASTER_WIDTH, minX, minY, maxX, maxY };
}

/**
 * Draw `count` destinations uniformly from the coverage list, in glyph-box
 * units: x spans -0.5..0.5 and y carries the box's aspect ratio so a single
 * width uniform scales both axes.
 */
function sampleGlyphTargets(mask: GlyphMask, count: number, rng: Rng): Float32Array {
  const targets = new Float32Array(count * 2);
  const boxW = mask.maxX - mask.minX;
  const boxH = mask.maxY - mask.minY;
  const aspect = boxH / boxW;

  for (let i = 0; i < count; i += 1) {
    const at = Math.min(mask.pixels.length - 1, Math.floor(rng() * mask.pixels.length));
    const packed = mask.pixels[at] ?? 0;
    const px = packed % mask.width;
    const py = (packed - px) / mask.width;

    // Sub-pixel jitter. Without it every particle sits on an integer pixel
    // centre and the word shows the raster lattice as soon as the container is
    // wide enough for a pixel to cover more than a particle.
    const u = (px + rng() - mask.minX) / boxW;
    const v = (py + rng() - mask.minY) / boxH;

    targets[i * 2] = u - 0.5;
    targets[i * 2 + 1] = (0.5 - v) * aspect;
  }
  return targets;
}

/** True when the family is not resolvable yet, so the raster must be redone later. */
function fontPending(spec: string): boolean {
  if (typeof document === 'undefined' || !document.fonts) return false;
  try {
    return !document.fonts.check(spec);
  } catch {
    return false;
  }
}

export function TextTargetParticleGlyphs({
  text = 'KINETIC',
  fontFamily,
  fontWeight = 700,
  count = 14000,
  size = 2.2,
  maxSize = 18,
  fill = 0.86,
  progress,
  loop = true,
  holdWritten = 2.4,
  holdScattered = 1.1,
  homeSpread = 1.15,
  homeDrift = 0.05,
  glyphDrift = 0.0016,
  swarm = 0.05,
  opacity = 0.95,
  colorCloud = '#5d6875',
  colorGlyph = '#ffffff',
  fov = 34,
  seed = 'text-target-particle-glyphs',
  className,
}: TextTargetParticleGlyphsProps) {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage | null>(null);
  const [unsupported, setUnsupported] = useState(false);

  const progressRef = useRef(progress);
  progressRef.current = progress;

  const { width, height } = useResizeObserver(host);
  const box = useRef({ width, height });
  box.current = { width, height };

  const reduced = useReducedMotion();
  // Mirrored into a ref for the same reason `progress` is: the build effect
  // below has to know whether to hand back a still frame or a live one, but
  // making `reduced` a dependency of it would destroy the WebGL context and
  // re-raster the word every time the OS setting is toggled. The ref is read,
  // never depended on.
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;

  const visible = useVisibility();
  const { inView } = useInView(host, { rootMargin: '10%' });
  const ready = width > 0 && height > 0;

  useEffect(() => {
    const el = host.current;
    if (!el || !ready) return;

    if (!hasWebGL()) {
      setUnsupported(true);
      return;
    }

    const total = Math.max(1, Math.round(count));
    // A font already on the page, not one this component ships. The computed
    // family is whatever the host inherits, so the word matches its context.
    const family = fontFamily || window.getComputedStyle(el).fontFamily || 'sans-serif';
    const probeSpec = `${fontWeight} ${PROBE_SIZE}px ${family}`;

    // The renderer owns its canvas and it is appended here, per effect run.
    // Under StrictMode a React-owned `<canvas ref>` survives the double invoke
    // while the context does not, and the second mount is handed a context that
    // cleanup already killed.
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    } catch {
      // A context can still be refused between the probe and the construction —
      // the tab may have hit the browser's live-context ceiling in between. three
      // throws rather than returning null, and an uncaught throw here takes the
      // page with it.
      setUnsupported(true);
      return;
    }
    renderer.setPixelRatio(pixelRatio());
    renderer.setClearAlpha(0);
    const dpr = renderer.getPixelRatio();

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, CAMERA_DISTANCE * 4);
    camera.position.z = CAMERA_DISTANCE;

    const rng = createRng(seed);
    const home = new Float32Array(total * 3);
    const rands = new Float32Array(total * 4);
    for (let i = 0; i < total; i += 1) {
      home[i * 3] = rng();
      home[i * 3 + 1] = rng();
      home[i * 3 + 2] = rng();
      rands[i * 4] = rng();
      rands[i * 4 + 1] = rng();
      rands[i * 4 + 2] = rng();
      rands[i * 4 + 3] = rng();
    }

    const mask = rasteriseGlyphs(text, fontWeight, family);
    let glyphAspect = mask ? (mask.maxY - mask.minY) / (mask.maxX - mask.minX) : 1;
    let hasTarget = mask !== null;

    // One destination buffer for the life of the effect. The font-load reraster
    // writes through it in place rather than allocating a second one.
    const targetData = new Float32Array(total * 2);
    if (mask) targetData.set(sampleGlyphTargets(mask, total, createRng(seed)));
    const targetAttr = new THREE.BufferAttribute(targetData, 2);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(home, 3));
    geometry.setAttribute('aTarget', targetAttr);
    geometry.setAttribute('aRand', new THREE.BufferAttribute(rands, 4));

    const uniforms: Uniforms = {
      uElapsed: { value: 0 },
      uMorph: { value: 0 },
      uViewSize: { value: new THREE.Vector2(1, 1) },
      uHomeDepth: { value: 1 },
      uWordWidth: { value: 1 },
      uThickness: { value: THICKNESS },
      uHomeDrift: { value: homeDrift },
      uGlyphDrift: { value: glyphDrift },
      uSwarm: { value: swarm },
      uSize: { value: size },
      uMaxSize: { value: maxSize * dpr },
      uSizeScale: { value: dpr * CAMERA_DISTANCE },
      uOpacity: { value: opacity },
      uColorCloud: { value: new THREE.Color(colorCloud) },
      uColorGlyph: { value: new THREE.Color(colorGlyph) },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: TEXT_TARGET_PARTICLE_GLYPHS_VERT,
      fragmentShader: TEXT_TARGET_PARTICLE_GLYPHS_FRAG,
      uniforms,
      transparent: true,
      // No depth at all. Sorting fourteen thousand points per frame on the CPU
      // is not affordable, and it is not needed: the coverage list is drawn
      // from at random, so buffer order is uncorrelated with depth and the
      // unsorted blend averages into even density rather than into layers.
      depthTest: false,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    const points = new THREE.Points(geometry, material);
    // Every position in this component is computed in the vertex shader, where
    // the frustum culler cannot see it. The bounding sphere three derives from
    // the raw attribute — a unit cube of 0..1 values — has nothing to do with
    // where the particles end up, and the whole cloud vanishes at some angles.
    points.frustumCulled = false;
    scene.add(points);

    el.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';

    let morph = 0;
    let goal = 1;
    let hold = 0;

    const fit = (w: number) => {
      // Visible extent of the frame at the word's depth. Everything the shader
      // scales by comes from here, so the layout is derived from the camera
      // rather than guessed in world units and re-guessed per breakpoint.
      const vHalf = (camera.fov * Math.PI) / 360;
      const viewH = 2 * CAMERA_DISTANCE * Math.tan(vHalf);
      const viewW = viewH * camera.aspect;

      // Bound the word on both axes: width for the usual case, height for a
      // short wide frame where a tall word would otherwise run off the top.
      const wordWidth = Math.min(viewW * fill, (viewH * FILL_HEIGHT) / Math.max(0.05, glyphAspect));

      uniforms.uViewSize.value.set(viewW * homeSpread, viewH * homeSpread);
      uniforms.uHomeDepth.value = viewH * HOME_DEPTH;
      uniforms.uWordWidth.value = wordWidth;
      uniforms.uThickness.value = wordWidth * THICKNESS;

      const ratio = renderer.getPixelRatio();
      uniforms.uSizeScale.value = ratio * CAMERA_DISTANCE;
      uniforms.uMaxSize.value = maxSize * ratio;
      uniforms.uSize.value = size * clamp(w / REFERENCE_WIDTH, MIN_SIZE_SCALE, MAX_SIZE_SCALE);
    };

    const resize = (w: number, h: number) => {
      if (w <= 0 || h <= 0) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      fit(w);
    };

    const render = () => {
      uniforms.uMorph.value = morph;
      renderer.render(scene, camera);
    };

    const step = (dt: number, elapsed: number) => {
      const scrub = progressRef.current;
      if (!hasTarget) {
        // No usable raster: the cloud drifts and nothing is ever written. Half a
        // word is worse than no word.
        morph = 0;
      } else if (scrub !== undefined) {
        // Damped rather than assigned, so a scroll value that jumps a hundred
        // pixels between frames does not teleport the letters.
        morph = damp(morph, clamp(scrub, 0, 1), SCRUB_SMOOTHING, dt);
      } else if (hold > 0) {
        hold -= dt;
      } else {
        morph = damp(morph, goal, goal === 1 ? WRITE_SMOOTHING : DISSOLVE_SMOOTHING, dt);
        if (goal === 1 && morph >= MORPH_EPSILON) {
          morph = 1;
          if (loop) {
            hold = holdWritten;
            goal = 0;
          }
        } else if (goal === 0 && morph <= 1 - MORPH_EPSILON) {
          morph = 0;
          hold = holdScattered;
          goal = 1;
        }
      }
      uniforms.uElapsed.value = elapsed;
      render();
    };

    const still = () => {
      morph = hasTarget ? STATIC_MORPH : 0;
      uniforms.uElapsed.value = STATIC_ELAPSED;
      render();
    };

    resize(box.current.width, box.current.height);
    stage.current = { resize, step, still };
    // The first frame a reduced-motion visitor gets has to be the still one.
    // `render()` draws whatever `morph` happens to be, and `morph` starts at 0
    // — the scattered cloud, no word in it — while `useRaf` below is disabled
    // under reduced motion, so that first frame would also be the last one they
    // ever see. The resize effect further down does call `still()`, but only
    // when the observed size or `reduced` itself changes; every rebuild driven
    // by this effect's own dependencies (a new `text`, a different colour, a new
    // `count`) happens at a size that has not moved, so nothing reaches it and
    // the word silently stops being drawn.
    if (reducedRef.current) still();
    else render();

    // A webfont that is still loading measures and rasters as the fallback
    // family, so the particles would land on the wrong letterforms and stay
    // there. Redo the raster once the page's fonts settle, reusing the seed so
    // the cloud does not reshuffle — only the destinations change.
    let live = true;
    if (fontPending(probeSpec)) {
      document.fonts.ready
        .then(() => {
          if (!live) return;
          const next = rasteriseGlyphs(text, fontWeight, family);
          if (!next) return;
          hasTarget = true;
          glyphAspect = (next.maxY - next.minY) / (next.maxX - next.minX);
          targetData.set(sampleGlyphTargets(next, total, createRng(seed)));
          targetAttr.needsUpdate = true;
          fit(box.current.width);
          // Redraw the still rather than the current frame. When the first
          // raster failed because the webfont had not resolved yet, `still()`
          // has already run with `hasTarget` false and pinned `morph` to 0;
          // `render()` alone would faithfully redraw that 0 and leave a
          // reduced-motion visitor staring at a scattered cloud forever, since
          // the RAF loop that would otherwise write the word is switched off.
          if (reducedRef.current) still();
          else render();
        })
        .catch(() => undefined);
    }

    return () => {
      live = false;
      stage.current = null;
      disposeObject(scene);
      material.dispose();
      disposeRenderer(renderer);
      renderer.domElement.remove();
    };
  }, [
    ready,
    text,
    fontFamily,
    fontWeight,
    count,
    size,
    maxSize,
    fill,
    loop,
    holdWritten,
    holdScattered,
    homeSpread,
    homeDrift,
    glyphDrift,
    swarm,
    opacity,
    colorCloud,
    colorGlyph,
    fov,
    seed,
  ]);

  // Resize is its own effect: a container reflow costs a `setSize` and a refit,
  // never a re-raster of the text or a re-upload of the destinations.
  //
  // `reduced` is a dependency, not an accident. It covers the two cases the
  // build effect cannot: the OS setting being switched to `reduce` mid-session
  // — `useReducedMotion` subscribes to the media query, so this really does
  // change after mount — and a resize while it is on, where the refit above
  // changes the projection but nothing would otherwise draw a frame through it.
  // `still()` only assigns fixed values and renders once, so running it again
  // when it is already the current frame costs a draw and changes nothing.
  useEffect(() => {
    stage.current?.resize(width, height);
    if (reduced) stage.current?.still();
  }, [width, height, reduced]);

  useRaf(
    (dt, elapsed) => stage.current?.step(dt, elapsed),
    ready && inView && visible && !reduced && !unsupported,
  );
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The offscreen 2D canvas has its width and height zeroed as soon as the coverage pass is done, releasing the backing store before the WebGL context is even created. A `live` flag is cleared on unmount so a `document.fonts.ready` promise that resolves after teardown cannot write into a disposed attribute. The stage ref is nulled so an in-flight frame cannot draw into a dying context, `disposeObject(scene)` disposes the point geometry and its attributes, the material is disposed explicitly as well, then `disposeRenderer` performs `dispose()` + `forceContextLoss()` + a zeroed drawing buffer — `dispose()` alone leaves the context alive — and the canvas node is removed. `useRaf`, `useInView`, `useVisibility` and `useResizeObserver` release their own subscriptions.

**Reduced motion.** No rAF subscription is opened and one still frame is drawn with `uMorph` forced to 1 and `uElapsed` at 0 — the word fully written and completely still, not the scattered cloud. The typography, the particle grain, the depth cue from perspective point sizing and the colour of the written state are all present; the writing, the drift and the dissolve cycle are what stop. A resize redraws the same still. If the raster was rejected there is nothing to write, so the still shows the motionless cloud instead.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Rejection-sampling the raster. Guessing a pixel and keeping it if it is inked is the first idea and it scales badly: glyph coverage is around 5% of the box, so the expected cost is twenty draws per particle and the worst case has no bound — a long word in a light weight can spin for a noticeable fraction of a second. One pass into a coverage list is O(pixels) once and O(1) per particle.
- Rasterising before the webfont has loaded. `measureText` and `fillText` silently fall back to another family, so the particles land on the wrong letterforms and stay there for the life of the page — and it only reproduces on a cold cache, which is why it ships. Check `document.fonts.check` and redo the raster on `document.fonts.ready`.
- Normalising destinations against the canvas box instead of the measured ink box. Ascenders, descenders and side bearings differ per string, so the word ends up floating off-centre by whatever margin that particular string happens to have, and the offset changes when the copy changes.
- Storing destinations in world units. They then depend on the camera, so every container resize means re-rasterising the text, re-sampling every particle and re-uploading the buffer — during a drag-resize, once per frame. Normalised units plus one scale uniform make the same resize two uniform writes.
- Scaling x and y by separate uniforms. It is the natural way to write it and it stretches the letterforms at one container width and squashes them at another. Folding the ink box aspect into the stored y and scaling both axes by a single width makes the distortion impossible to introduce.
- Ordering the stagger by buffer index. The word then resolves out of noise everywhere at once, which is a cross-fade with extra steps. Ordering by the destination's own x costs one `clamp` in the shader and turns the same animation into writing.
- Landing every particle on an integer pixel centre. Without sub-pixel jitter the raster lattice is visible as soon as the container is wide enough for one mask pixel to cover more than one particle, and the word acquires a faint corduroy texture.
- Rendering whatever the raster produced. An empty string, a font that never loaded, a zero-size canvas: all of them return a nearly empty mask, and mapping fourteen thousand particles onto forty pixels looks like a crash. Reject the target below a coverage floor and leave the cloud drifting instead.
- Leaving `frustumCulled` on. Every position in this component is computed in the vertex shader, so the bounding sphere three derives from the attribute — a unit cube of 0..1 values — has nothing to do with where the particles are, and the whole cloud vanishes at some container aspect ratios.
- Making `gl_PointSize` constant. Point size does not fall off with distance on its own, so the cloud has no depth cue at all and the word looks like a flat stencil. Dividing by view-space depth is the whole effect, and `max(0.1, -mv.z)` is a required guard, not a nicety.
- Depth-testing a translucent point cloud. With `depthWrite` on, fourteen thousand sprites occlude each other in buffer order and the strokes tear into hard layers; sorting per frame on the CPU is unaffordable. Because the coverage list is drawn from at random, buffer order is uncorrelated with depth and an unsorted blend averages into even density.
- Passing a scroll-driven `progress` as an effect dependency. The value changes every frame, so the text would be re-rasterised and every buffer rebuilt sixty times a second. It is held in a ref and read inside the frame callback.
- Calling `getImageData` on a GPU-backed canvas. There is exactly one read here, but without `willReadFrequently` that single read stalls the pipeline for several milliseconds during mount, on the same frame as the WebGL context creation.

## Notes

- The word is rasterised from a font that is already on the page: `fontFamily` defaults to the host element's computed family, so the particles adopt whatever the surrounding type is. No glyph atlas, texture or font file is shipped with the component, and nothing under `registry/` is a binary.
- One line only. A newline is not laid out — multi-line text needs one `fillText` per line, with the coverage pass and the ink box spanning all of them.
- The raster runs once per rebuild, plus once more if the font was still loading. It is a `fillText`, one `getImageData` over 327,680 pixels and one sampling loop — low single-digit milliseconds — and the canvas has its width and height zeroed straight afterwards to release the backing store.
- The font-load reraster reuses the same seed, so the cloud does not reshuffle when the real family arrives: only the destinations change, and any particle already in flight simply continues to a slightly different address.
- Supply `progress` to drive the word from scroll, a timeline or an audio envelope; leave it out and the component writes, holds, dissolves and rewrites on its own. `loop: false` writes once and keeps the word.
- One draw call and one buffer set for the whole effect. The cost is fill: fourteen thousand blended sprites, heaviest at the moment the word is written and its particles overlap inside the strokes.
- three constructs its own canvas, which is appended and removed per effect run. Reusing a React-owned `<canvas ref>` is unsafe here: cleanup calls `forceContextLoss()`, and under React 19 StrictMode the remount would hand the effect back the dead context, leaving the component permanently black.
- The rAF subscription is gated on `useInView` and `useVisibility`, so a scrolled-away or backgrounded instance stops paying for fill and resumes its cycle from wherever it froze.

## Definition of done

On entering view the cloud gathers into the word from left to right over about two seconds — watch the first letter finish while the last is still travelling — holds it, then dissolves right to left and repeats. The letterforms are legible and match the page's own font, with no gaps in the stems and no visible pixel lattice inside a stroke. Particles nearer the camera are larger, and none of them pop out of existence at any container aspect ratio. Resize from wide to narrow: the word stays fully inside the frame, keeps its proportions rather than stretching, and the particles get smaller with it instead of filling the counters solid. Hard-reload with the cache disabled on a page using a webfont: the word must end up in the real face, not the fallback. Set `text=""` and the cloud keeps drifting rather than collapsing into a blob. With reduced motion the finished word renders immediately and holds still.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
