'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { cn } from '@/lib/cn';
import { useInView } from '@/registry/hooks/use-in-view';
import { useRaf } from '@/registry/hooks/use-raf';
import { useMediaQuery, useReducedMotion } from '@/registry/hooks/use-reduced-motion';
import { useResizeObserver } from '@/registry/hooks/use-resize-observer';
import { useVisibility } from '@/registry/hooks/use-visibility';
import { clamp, damp } from '@/registry/lib/damp';
import { disposeRenderer, hasWebGL, pixelRatio } from '@/registry/lib/webgl';
import {
  ditherTrailImageRevealFragmentShader,
  ditherTrailImageRevealVertexShader,
} from '@/registry/shaders/dither-trail-image-reveal';

/* ==========================================================================
   Dither Trail Image Reveal
   --------------------------------------------------------------------------
   The image sits dimmed and near-monochrome; dragging the pointer across it
   restores it through a trail of 5px, Bayer-thresholded, velocity-displaced
   blocks. Twenty-four pointer samples live 1.05s each and are uploaded as two
   flat uniform arrays, so the entire trail is one draw call with no geometry.

   Three decisions are doing the work.

   1. THE POINTER IS DAMPED IN THE LOOP AND SAMPLED FROM THE FOLLOWER. Event
      positions are not a path — they arrive at whatever rate the device feels
      like and stop dead when the hand pauses. The handler records a target; the
      loop damps toward it and drops a trail sample when the FOLLOWER has moved
      far enough. The trail is therefore evenly spaced in distance rather than
      in events, and the velocity fed to the shader is measured from a curve
      that is already smooth.

   2. THE IMAGE IS A PROP, AND IT IS ALLOWED TO BE MISSING. `src` may be
      undecoded for the first few hundred milliseconds, or may 404 forever. A
      1x1 placeholder texture is bound from the first frame so the sampler is
      never unbound, and `uHasImage` selects a procedural stand-in until a real
      decode lands. Nothing here throws on a bad URL.

   3. IT IS AN OVERLAY, NOT THE SUBJECT. The buffer is capped at ~1100px wide
      and the draw is throttled to 30fps, while the pointer state keeps updating
      at full rate. Both together cost roughly a quarter of the fill of a naive
      full-dpr 120Hz version, and the dither's own 5px blocks hide the
      difference completely.
   ========================================================================== */

export interface DitherTrailImageRevealProps {
  /** Image URL. Any string a browser can fetch: http(s), blob: or data:. */
  src: string;
  /** Accessible name for the panel. Empty marks it decorative. */
  alt?: string;
  /** Quantisation levels per channel inside the reveal. */
  levels?: number;
  /** Dither block size in CSS pixels. */
  blockSize?: number;
  /** Life of one trail sample in seconds. */
  trailLife?: number;
  /** Follower travel, in uv units, that releases the next sample. */
  spawnDistance?: number;
  /** Seconds after which a sample is released even if the pointer has not moved. */
  spawnInterval?: number;
  /** uv offset per uv/second of pointer velocity. */
  flowGain?: number;
  /** Fraction of the pointer gap still remaining after one second. */
  smoothing?: number;
  /** Brightness of the untouched image, 0..1. */
  restBrightness?: number;
  /** Saturation of the untouched image, 0..1. */
  restSaturation?: number;
  /** Draw rate ceiling. The pointer still updates every frame. */
  fps?: number;
  /** Device pixel ratio cap, before the absolute buffer-width cap. */
  maxDpr?: number;
  className?: string;
}

// #region critical
/** Samples in the ring. Must match TRAIL_POINTS in the fragment shader. */
const TRAIL_POINTS = 24;
/**
 * Hard cap on drawing-buffer width in device pixels. An overlay of 5px blocks
 * carries no detail a wider buffer could resolve, and fill is the whole cost:
 * a 2560px hero at dpr 2 would shade 26 million fragments per draw for a
 * picture that is quantised to four levels.
 */
const MAX_BUFFER_WIDTH = 1100;
/** uv units per second at which the speed term saturates. */
const SPEED_FULL_SCALE = 1.6;
/** Fraction of the velocity gap left after a second. Fast: speed must track. */
const VELOCITY_SMOOTHING = 0.001;
/** Ceiling on a single sample's stored flow, in uv units. */
const FLOW_MAX = 0.04;
/** Ceiling on the SUM of all samples' flow, applied in the shader. */
const FLOW_CLAMP = 0.055;

/** The reduced-motion still: a frozen swipe with a plausible velocity. */
const STILL_POINTS = 9;
const STILL_FLOW: readonly [number, number] = [0.02, 0.008];

interface RevealUniforms {
  /** three types `uniforms` as an open record; the index signature matches it. */
  [name: string]: THREE.IUniform;
  uResolution: THREE.IUniform<THREE.Vector2>;
  uImage: THREE.IUniform<THREE.Texture | null>;
  uHasImage: THREE.IUniform<number>;
  uUvScale: THREE.IUniform<THREE.Vector2>;
  uUvOffset: THREE.IUniform<THREE.Vector2>;
  /** Flat vec4 array: three's uniform setters take a typed array unchanged. */
  uTrail: THREE.IUniform<Float32Array>;
  uFlow: THREE.IUniform<Float32Array>;
  uBlock: THREE.IUniform<number>;
  uLevels: THREE.IUniform<number>;
  uFlowClamp: THREE.IUniform<number>;
  uRestBrightness: THREE.IUniform<number>;
  uRestSaturation: THREE.IUniform<number>;
}

interface Stage {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  geometry: THREE.PlaneGeometry;
  material: THREE.ShaderMaterial;
  uniforms: RevealUniforms;
  placeholder: THREE.DataTexture;
  render: () => void;
}

interface TrailSample {
  x: number;
  y: number;
  /** Elapsed seconds at spawn. Negative means the slot has never been used. */
  born: number;
  flowX: number;
  flowY: number;
  speed: number;
}

/**
 * A 1x1 opaque texture, bound before anything has loaded. Sampling an unbound
 * sampler2D is undefined behaviour: some drivers return black, some warn on
 * every draw, and one of them will be the reviewer's.
 */
function createPlaceholder(): THREE.DataTexture {
  const texture = new THREE.DataTexture(new Uint8Array([16, 17, 21, 255]), 1, 1);
  texture.needsUpdate = true;
  return texture;
}

export function DitherTrailImageReveal({
  src,
  alt = '',
  levels = 4,
  blockSize = 5,
  trailLife = 1.05,
  spawnDistance = 0.012,
  spawnInterval = 0.042,
  flowGain = 0.03,
  smoothing = 0.0002,
  restBrightness = 0.5,
  restSaturation = 0.16,
  fps = 30,
  maxDpr = 1.5,
  className,
}: DitherTrailImageRevealProps) {
  const host = useRef<HTMLDivElement>(null);
  const mount = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage | null>(null);

  const { width, height } = useResizeObserver(host);
  const { inView } = useInView(host, { rootMargin: '10%' });
  const visible = useVisibility();
  const reduced = useReducedMotion();
  /* A trail needs a pointer that exists while no button is held. On touch
     `pointermove` only fires mid-drag, so the reveal would appear under the
     finger that is covering it and then be stranded on lift. */
  const finePointer = useMediaQuery('(hover: hover) and (pointer: fine)');

  const [supported, setSupported] = useState(true);
  useEffect(() => setSupported(hasWebGL()), []);
  const [failed, setFailed] = useState(false);

  /** The decoded image, kept across renderer rebuilds so a resize never refetches. */
  const image = useRef<THREE.Texture | null>(null);
  /** Intrinsic aspect of that image; 0 until one has decoded. */
  const imageAspect = useRef(0);

  const target = useRef<{ x: number; y: number } | null>(null);
  const inside = useRef(false);
  const follow = useRef({ x: 0.5, y: 0.5 });
  const velocity = useRef({ x: 0, y: 0 });
  const lastSpawn = useRef({ x: 0.5, y: 0.5, at: -1 });
  const writeIndex = useRef(0);
  const budget = useRef(0);

  const trail = useRef<TrailSample[]>(
    Array.from({ length: TRAIL_POINTS }, () => ({
      x: 0,
      y: 0,
      born: -1,
      flowX: 0,
      flowY: 0,
      speed: 0,
    })),
  );

  const live = useRef({
    levels,
    blockSize,
    trailLife,
    spawnDistance,
    spawnInterval,
    flowGain,
    smoothing,
    restBrightness,
    restSaturation,
    fps,
  });
  live.current = {
    levels,
    blockSize,
    trailLife,
    spawnDistance,
    spawnInterval,
    flowGain,
    smoothing,
    restBrightness,
    restSaturation,
    fps,
  };

  const ready = supported && width > 1 && height > 1;

  /* The measured size, readable from an async callback. The image loader below
     runs on `[src, ready]`, so its success handler closes over whichever size
     was current when the fetch STARTED — and a decode routinely lands a few
     hundred milliseconds later, after the observer has reported the real box.
     Fitting against the stale numbers left the picture visibly mis-cropped
     until something else happened to resize the element. */
  const size = useRef({ width, height });
  size.current = { width, height };

  /** object-fit: cover, replicated in uv space so the shader matches the CSS. */
  const applyCover = (w: number, h: number) => {
    const s = stage.current;
    if (!s || w < 1 || h < 1) return;
    const ia = imageAspect.current;
    if (ia <= 0) {
      s.uniforms.uUvScale.value.set(1, 1);
      s.uniforms.uUvOffset.value.set(0, 0);
      return;
    }
    const canvasAspect = w / h;
    if (ia > canvasAspect) {
      // Image is wider than the box: crop the sides.
      const scale = canvasAspect / ia;
      s.uniforms.uUvScale.value.set(scale, 1);
      s.uniforms.uUvOffset.value.set((1 - scale) * 0.5, 0);
    } else {
      const scale = ia / canvasAspect;
      s.uniforms.uUvScale.value.set(1, scale);
      s.uniforms.uUvOffset.value.set(0, (1 - scale) * 0.5);
    }
  };

  useEffect(() => {
    const slot = mount.current;
    if (!slot || !ready) return;

    /* The canvas is created here rather than owned by React. `reactStrictMode`
       double-invokes this effect; the first cleanup calls `forceContextLoss()`,
       and `getContext` on that same element afterwards returns the DEAD context
       instead of a fresh one — blank in development, fine in production, which
       is the worst way for a bug to behave. */
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: false,
        alpha: false,
        powerPreference: 'low-power',
      });
    } catch {
      // A context can still be refused between the probe and the construction —
      // the tab may have hit the browser's live-context ceiling in between. three
      // throws rather than returning null, and an uncaught throw here takes the
      // page with it.
      setSupported(false);
      return;
    }
    // Two caps, and the lower wins: a ratio cap for sane machines and an
    // absolute width cap so a 4K hero cannot ask for a 7680px buffer.
    const ratio = Math.min(pixelRatio(maxDpr), MAX_BUFFER_WIDTH / Math.max(width, 1));
    renderer.setPixelRatio(Math.max(ratio, 0.5));
    renderer.setSize(width, height, false);
    const canvas = renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    slot.appendChild(canvas);

    const placeholder = createPlaceholder();

    const uniforms: RevealUniforms = {
      uResolution: { value: new THREE.Vector2(width, height) },
      uImage: { value: image.current ?? placeholder },
      uHasImage: { value: image.current ? 1 : 0 },
      uUvScale: { value: new THREE.Vector2(1, 1) },
      uUvOffset: { value: new THREE.Vector2(0, 0) },
      uTrail: { value: new Float32Array(TRAIL_POINTS * 4) },
      uFlow: { value: new Float32Array(TRAIL_POINTS * 2) },
      uBlock: { value: blockSize },
      uLevels: { value: levels },
      uFlowClamp: { value: FLOW_CLAMP },
      uRestBrightness: { value: restBrightness },
      uRestSaturation: { value: restSaturation },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: ditherTrailImageRevealVertexShader,
      fragmentShader: ditherTrailImageRevealFragmentShader,
      uniforms,
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    const scene = new THREE.Scene();
    scene.add(new THREE.Mesh(geometry, material));
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const render = () => renderer.render(scene, camera);

    /* Listeners on the CANVAS, not the window: a document-level handler
       outlives the renderer it drives, and the rect it measures is not the rect
       being drawn into. Passive, because nothing calls preventDefault here and
       a non-passive move handler stalls the compositor on every event. */
    const onMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      target.current = {
        x: (event.clientX - rect.left) / rect.width,
        // Flipped: uv y is up, client y is down.
        y: 1 - (event.clientY - rect.top) / rect.height,
      };
      if (!inside.current) {
        // Entering: teleport the follower rather than damping to it, or the
        // trail draws a stripe from wherever the pointer was last seen.
        follow.current.x = target.current.x;
        follow.current.y = target.current.y;
        lastSpawn.current.x = target.current.x;
        lastSpawn.current.y = target.current.y;
        velocity.current.x = 0;
        velocity.current.y = 0;
      }
      inside.current = true;
    };
    const onLeave = () => {
      inside.current = false;
      // Samples already in the ring keep ageing out on their own, so the trail
      // finishes its life instead of vanishing the instant the pointer leaves.
    };

    canvas.addEventListener('pointermove', onMove, { passive: true });
    canvas.addEventListener('pointerleave', onLeave, { passive: true });
    canvas.addEventListener('pointercancel', onLeave, { passive: true });

    stage.current = {
      renderer,
      scene,
      camera,
      geometry,
      material,
      uniforms,
      placeholder,
      render,
    };
    applyCover(width, height);
    render();

    return () => {
      stage.current = null;
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('pointercancel', onLeave);
      // `dispose()` frees GPU objects but leaves the context alive until GC
      // decides otherwise. `disposeRenderer` is the one that force-loses it,
      // and the per-process budget is about sixteen contexts.
      disposeRenderer(renderer);
      geometry.dispose();
      material.dispose();
      placeholder.dispose();
      canvas.remove();
    };
    // Everything else is pushed through `live` or the uniforms from the loop.
    // Rebuilding on a prop change would churn WebGL contexts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, maxDpr]);

  /* Loading is its own effect and its own lifetime. It never throws: a 404
     leaves `uHasImage` at 0 and the shader keeps drawing its stand-in. */
  useEffect(() => {
    if (!ready || !src) return;
    let cancelled = false;
    setFailed(false);

    const loader = new THREE.TextureLoader();
    loader.load(
      src,
      (texture) => {
        if (cancelled) {
          // The component unmounted, or `src` changed, mid-decode. Without this
          // the texture is uploaded to a dead context and then leaked.
          texture.dispose();
          return;
        }
        texture.colorSpace = THREE.SRGBColorSpace;
        // No mipmaps: the quad is screen-filling, the image is never minified
        // past 1:1, and mipmapping a non-power-of-two texture silently fails.
        texture.generateMipmaps = false;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;

        image.current?.dispose();
        image.current = texture;

        const source = texture.image as { width?: number; height?: number } | null;
        const w = source?.width ?? 0;
        const h = source?.height ?? 0;
        imageAspect.current = w > 0 && h > 0 ? w / h : 0;

        const s = stage.current;
        if (!s) return;
        s.uniforms.uImage.value = texture;
        s.uniforms.uHasImage.value = 1;
        // From the ref, not the closure: see the note on `size` above.
        applyCover(size.current.width, size.current.height);
        s.render();
      },
      undefined,
      () => {
        if (cancelled) return;
        // A missing image is a content problem, not a crash. The stand-in field
        // keeps the panel legible and the trail keeps working on top of it.
        setFailed(true);
        imageAspect.current = 0;
        const s = stage.current;
        if (!s) return;
        s.uniforms.uHasImage.value = 0;
        s.render();
      },
    );

    return () => {
      cancelled = true;
    };
    // `width`/`height` are read for the cover fit but must not retrigger a
    // fetch; the resize effect re-applies the fit on its own.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, ready]);

  // The decoded texture outlives the renderer, so it is released on unmount
  // rather than in the loader effect, which reruns whenever `src` changes.
  useEffect(() => {
    return () => {
      image.current?.dispose();
      image.current = null;
    };
  }, []);

  useEffect(() => {
    const s = stage.current;
    if (!s || width < 1 || height < 1) return;
    const ratio = Math.min(pixelRatio(maxDpr), MAX_BUFFER_WIDTH / width);
    s.renderer.setPixelRatio(Math.max(ratio, 0.5));
    s.renderer.setSize(width, height, false);
    s.uniforms.uResolution.value.set(width, height);
    applyCover(width, height);
    // Redraw once, or a resize while the loop is paused leaves the previous
    // framebuffer stretched across the new size.
    s.render();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height, maxDpr]);

  const writeTrailUniforms = (elapsed: number, life: number) => {
    const s = stage.current;
    if (!s) return;
    const points = s.uniforms.uTrail.value;
    const flows = s.uniforms.uFlow.value;
    let i = 0;
    for (const sample of trail.current) {
      const age = sample.born < 0 ? Infinity : elapsed - sample.born;
      const remaining = clamp(1 - age / life, 0, 1);
      points[i * 4] = sample.x;
      points[i * 4 + 1] = sample.y;
      points[i * 4 + 2] = remaining;
      points[i * 4 + 3] = sample.speed;
      flows[i * 2] = sample.flowX;
      flows[i * 2 + 1] = sample.flowY;
      i += 1;
    }
  };

  useRaf(
    (dt, elapsed) => {
      const s = stage.current;
      if (!s) return;
      const cfg = live.current;

      const previousX = follow.current.x;
      const previousY = follow.current.y;

      const aim = target.current;
      if (aim) {
        follow.current.x = damp(follow.current.x, aim.x, cfg.smoothing, dt);
        follow.current.y = damp(follow.current.y, aim.y, cfg.smoothing, dt);
      }

      // Velocity of the FOLLOWER, in uv units per second. Dividing by dt is
      // what makes it a velocity rather than a per-frame delta that measures
      // twice as large at 60Hz as at 120Hz for the same hand movement.
      const step = Math.max(dt, 0.0001);
      velocity.current.x = damp(
        velocity.current.x,
        (follow.current.x - previousX) / step,
        VELOCITY_SMOOTHING,
        dt,
      );
      velocity.current.y = damp(
        velocity.current.y,
        (follow.current.y - previousY) / step,
        VELOCITY_SMOOTHING,
        dt,
      );

      /* Spawn on DISTANCE travelled, or on a time floor. Distance alone gives
         an evenly spaced trail but lets the reveal decay to nothing under a
         pointer that has stopped; the time floor keeps a stationary hover
         alive. Spawning per event instead would clump on a slow drag and smear
         on a flick, because events fire on sub-pixel movement. */
      if (inside.current && aim) {
        const moved = Math.hypot(
          follow.current.x - lastSpawn.current.x,
          follow.current.y - lastSpawn.current.y,
        );
        const waited = elapsed - lastSpawn.current.at;
        if (moved >= cfg.spawnDistance || waited >= cfg.spawnInterval) {
          const slot = trail.current[writeIndex.current % TRAIL_POINTS];
          if (slot) {
            writeIndex.current = (writeIndex.current + 1) % TRAIL_POINTS;
            slot.x = follow.current.x;
            slot.y = follow.current.y;
            slot.born = elapsed;
            slot.flowX = clamp(velocity.current.x * cfg.flowGain, -FLOW_MAX, FLOW_MAX);
            slot.flowY = clamp(velocity.current.y * cfg.flowGain, -FLOW_MAX, FLOW_MAX);
            slot.speed = clamp(
              Math.hypot(velocity.current.x, velocity.current.y) / SPEED_FULL_SCALE,
              0,
              1,
            );
          }
          lastSpawn.current.x = follow.current.x;
          lastSpawn.current.y = follow.current.y;
          lastSpawn.current.at = elapsed;
        }
      }

      const life = Math.max(cfg.trailLife, 0.05);
      writeTrailUniforms(elapsed, life);

      const u = s.uniforms;
      u.uBlock.value = Math.max(cfg.blockSize, 1);
      u.uLevels.value = Math.max(cfg.levels, 2);
      u.uRestBrightness.value = cfg.restBrightness;
      u.uRestSaturation.value = cfg.restSaturation;

      /* Draw-rate throttle. The state above updates every frame — a trail
         sampled at 30Hz has visible corners — but the DRAW is the expensive
         half and 30fps is indistinguishable through 5px blocks. Subtracting
         the budget rather than zeroing the accumulator keeps the long-run rate
         exact instead of quietly losing the remainder every frame. */
      const frameBudget = 1 / clamp(cfg.fps, 10, 120);
      budget.current += dt;
      if (budget.current < frameBudget) return;
      budget.current = Math.min(budget.current - frameBudget, frameBudget);

      s.render();
    },
    ready && inView && visible && !reduced && finePointer,
  );

  /* Reduced motion, and coarse pointers, get a composed still: a short frozen
     swipe baked into the ring so the panel shows what the effect produces. The
     listeners stay attached and their target is never consumed. */
  useEffect(() => {
    const s = stage.current;
    if (!s || !ready) return;
    if (!reduced && finePointer) return;

    const [flowX = 0.02, flowY = 0.008] = STILL_FLOW;
    let i = 0;
    for (const sample of trail.current) {
      const t = i / (STILL_POINTS - 1);
      const inSwipe = i < STILL_POINTS;
      sample.x = 0.3 + t * 0.42;
      sample.y = 0.4 + Math.sin(t * 2.2) * 0.12;
      sample.flowX = flowX;
      sample.flowY = flowY;
      sample.speed = inSwipe ? 0.45 : 0;
      // `born` is unused by the still: lives are written straight below.
      sample.born = -1;
      i += 1;
    }

    const points = s.uniforms.uTrail.value;
    const flows = s.uniforms.uFlow.value;
    let j = 0;
    for (const sample of trail.current) {
      const remaining = j < STILL_POINTS ? 1 - j / STILL_POINTS : 0;
      points[j * 4] = sample.x;
      points[j * 4 + 1] = sample.y;
      points[j * 4 + 2] = remaining;
      points[j * 4 + 3] = sample.speed;
      flows[j * 2] = sample.flowX;
      flows[j * 2 + 1] = sample.flowY;
      j += 1;
    }
    s.render();
  }, [reduced, finePointer, ready, width, height]);
  // #endregion critical

  const decorative = alt.length === 0;

  return (
    <div
      ref={host}
      className={cn('relative h-full w-full overflow-hidden bg-bg', className)}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : alt}
      aria-hidden={decorative ? true : undefined}
    >
      <div ref={mount} className="absolute inset-0" />
      {supported ? null : (
        // No WebGL: the image is still the point, so it is shown plainly. The
        // src is a prop, so this ships no asset of its own.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      )}
      {failed && supported ? (
        <span className="sr-only">Image unavailable; showing a placeholder field.</span>
      ) : null}
    </div>
  );
}
