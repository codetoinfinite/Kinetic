'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { cn } from '@/lib/cn';
import { useInView } from '@/registry/hooks/use-in-view';
import { useRaf } from '@/registry/hooks/use-raf';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';
import { useResizeObserver } from '@/registry/hooks/use-resize-observer';
import { useVisibility } from '@/registry/hooks/use-visibility';
import { clamp, damp } from '@/registry/lib/damp';
import { createRng, type Rng } from '@/registry/lib/prng';
import { disposeObject, disposeRenderer, hasWebGL, pixelRatio } from '@/registry/lib/webgl';
import {
  TEXT_TARGET_PARTICLE_GLYPHS_FRAG,
  TEXT_TARGET_PARTICLE_GLYPHS_VERT,
} from '@/registry/shaders/text-target-particle-glyphs';

/* ==========================================================================
   Text-Target Particle Glyphs
   --------------------------------------------------------------------------
   A particle cloud that gathers into a word and lets it go again. The word is
   not an image and not a mesh: it is drawn once with `fillText` into an
   offscreen 2D canvas using a font that is already on the page, and the
   opaque pixels of that raster become the particle destinations.

   Three decisions carry the technique:

     1. Sampling. Every covered pixel is collected in one pass into a coverage
        list, and particles draw from that list. Rejection sampling — guess a
        pixel, keep it if it is inked — is the obvious approach and the wrong
        one: text covers something like 5% of its box, so the average particle
        needs twenty guesses and the worst case has no bound at all.

     2. Normalised targets. The destination is stored in glyph-box units, not
        world units, and scaled by a uniform in the vertex shader. A container
        resize is then two uniform writes instead of a re-raster and a
        re-upload of every buffer.

     3. Order. The per-particle stagger is keyed to the destination's own x, so
        the word assembles left to right. It is written, not faded in — and
        that reads as language rather than as a transition.

   Nothing is shipped but code: no glyph atlas, no texture, no font file.
   ========================================================================== */

export interface TextTargetParticleGlyphsProps {
  /** The word to write. One line — a newline is not laid out. */
  text?: string;
  /**
   * CSS font family list. Defaults to the host element's computed family, so
   * the raster uses a font the page has already loaded rather than one this
   * component ships.
   */
  fontFamily?: string;
  /** CSS font weight for the raster. Heavier strokes hold more particles. */
  fontWeight?: string | number;
  /** Particle count. One buffer, one draw call, cost is linear. */
  count?: number;
  /** Particle diameter in CSS pixels for a landed particle, before jitter. */
  size?: number;
  /** Ceiling on the perspective-grown size, in CSS pixels. */
  maxSize?: number;
  /** Fraction of the visible width the written word spans. */
  fill?: number;
  /**
   * Authoritative morph, 0 (scattered) to 1 (written). Supply it to drive the
   * word from scroll or from a timeline; leave it out and the component runs
   * its own write / hold / dissolve cycle.
   *
   * Held in a ref and deliberately NOT an effect dependency: a scroll-driven
   * value changes every frame, and rebuilding on each one would re-rasterise
   * the text sixty times a second.
   */
  progress?: number;
  /** Write, hold, dissolve, repeat. Ignored while `progress` is supplied. */
  loop?: boolean;
  /** Seconds the finished word is held before it dissolves. */
  holdWritten?: number;
  /** Seconds the cloud drifts before the next write. */
  holdScattered?: number;
  /** Resting cloud size as a multiple of the visible frame. */
  homeSpread?: number;
  /** Resting drift amplitude, as a fraction of the visible height. */
  homeDrift?: number;
  /** Residual drift once written, as a fraction of the word width. */
  glyphDrift?: number;
  /** Mid-flight bow, as a fraction of the word width. */
  swarm?: number;
  /** Overall alpha multiplier applied in the vertex shader. */
  opacity?: number;
  /** Tint of the scattered cloud. */
  colorCloud?: string;
  /** Tint of the written word. */
  colorGlyph?: string;
  /** Vertical field of view in degrees. */
  fov?: number;
  seed?: number | string;
  className?: string;
}

interface Uniforms {
  /** three types `uniforms` as an open record; without this the object is not assignable. */
  [name: string]: THREE.IUniform;
  uElapsed: { value: number };
  uMorph: { value: number };
  /** Visible world size of the frame at the word's depth. */
  uViewSize: { value: THREE.Vector2 };
  uHomeDepth: { value: number };
  uWordWidth: { value: number };
  uThickness: { value: number };
  uHomeDrift: { value: number };
  uGlyphDrift: { value: number };
  uSwarm: { value: number };
  uSize: { value: number };
  /** Device pixels, because `gl_PointSize` is. */
  uMaxSize: { value: number };
  /** `pixelRatio * cameraDistance` — see the vertex shader. */
  uSizeScale: { value: number };
  uOpacity: { value: number };
  uColorCloud: { value: THREE.Color };
  uColorGlyph: { value: THREE.Color };
}

interface Stage {
  resize: (width: number, height: number) => void;
  step: (dt: number, elapsed: number) => void;
  still: () => void;
}

/** Covered pixels of the raster, plus the box they actually occupy. */
interface GlyphMask {
  /** Packed pixel indices: `x = i % width`, `y = (i - x) / width`. */
  pixels: Int32Array;
  width: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Raster size. Wide enough that a long word still gets several pixels across a
 * stroke — the mask is the only description of the letterforms there is, and a
 * stroke narrower than about three pixels samples into a dotted line.
 */
const RASTER_WIDTH = 1024;
const RASTER_HEIGHT = 320;
/** Text is fitted to this fraction of the raster, leaving room for overshoot. */
const RASTER_FILL = 0.92;
/** Cap on the fitted size so a two-letter word does not overflow vertically. */
const RASTER_CAP = 0.66;
/** Font size the text is measured at. Fitting is a ratio, so the value is free. */
const PROBE_SIZE = 100;
/**
 * Alpha above which a pixel counts as inked. Anti-aliasing puts a one-pixel
 * skirt of low alpha around every stroke; including it thickens the word and
 * softens its corners, which is exactly the crispness the raster was for.
 */
const ALPHA_THRESHOLD = 120;
/**
 * Below this the raster is a failure, not a short word — an unloaded font, an
 * empty string, a zero-size canvas. Rendering it anyway crushes every particle
 * onto a handful of pixels, so the target is rejected and the cloud keeps
 * drifting instead.
 */
const MIN_COVERAGE_PIXELS = 1200;

/** Camera distance to the word plane. Fixed; the fit moves the word, not the camera. */
const CAMERA_DISTANCE = 6;
/** Vertical bound on the fit, so a wide word in a short frame is not clipped. */
const FILL_HEIGHT = 0.72;
/** Home cloud depth as a fraction of the visible height. */
const HOME_DEPTH = 0.6;
/** Word thickness in z, as a fraction of its width. Enough for perspective to read. */
const THICKNESS = 0.02;
/**
 * Container width the default `size` was authored at. The word always spans the
 * same fraction of the frame, so its strokes are thinner in CSS pixels on a
 * small card; particles have to shrink with them or the letters fill in.
 */
const REFERENCE_WIDTH = 880;
const MIN_SIZE_SCALE = 0.55;
const MAX_SIZE_SCALE = 1.15;

/** Fraction of the gap left after one second while writing. ~2s to write. */
const WRITE_SMOOTHING = 0.05;
/** Dissolving is quicker than writing: the word has already been read. */
const DISSOLVE_SMOOTHING = 0.012;
/** Following an external `progress` — tight enough to track a scrub. */
const SCRUB_SMOOTHING = 0.02;
/** `damp` is asymptotic; the last stagger window needs a true 1.0 to close. */
const MORPH_EPSILON = 0.9995;

/** Fully written, no drift — the reduced-motion still. */
const STATIC_MORPH = 1;
const STATIC_ELAPSED = 0;

// #region critical
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
  // #endregion critical

  return (
    <div ref={host} className={cn('relative h-full w-full overflow-hidden', className)}>
      {unsupported ? (
        <div className="absolute inset-0 grid place-items-center px-6">
          <span
            className="select-none text-center text-4xl font-bold tracking-[0.14em] text-fg/80 sm:text-6xl"
            style={{
              backgroundImage:
                'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.16) 1px, transparent 1.4px)',
              backgroundSize: '4px 4px',
              WebkitBackgroundClip: 'text',
            }}
          >
            {text}
          </span>
        </div>
      ) : null}
    </div>
  );
}
