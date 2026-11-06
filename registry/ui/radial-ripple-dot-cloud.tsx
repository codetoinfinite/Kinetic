'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { cn } from '@/lib/cn';
import { useInView } from '@/registry/hooks/use-in-view';
import { useRaf } from '@/registry/hooks/use-raf';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';
import { useResizeObserver } from '@/registry/hooks/use-resize-observer';
import { useVisibility } from '@/registry/hooks/use-visibility';
import { clamp } from '@/registry/lib/damp';
import { createRng } from '@/registry/lib/prng';
import { disposeObject, disposeRenderer, hasWebGL, pixelRatio } from '@/registry/lib/webgl';
import {
  RADIAL_RIPPLE_FRAG,
  RADIAL_RIPPLE_VERT,
} from '@/registry/shaders/radial-ripple-dot-cloud';

/* ==========================================================================
   Radial Ripple Dot Cloud
   --------------------------------------------------------------------------
   A field of dots with a travelling wave running out of one off-centre point.
   Three decisions carry the whole thing:

     1. the wave is a sine in RADIUS minus a phase in TIME, so crests move
        outward instead of standing still;
     2. it is attenuated by exp(-dist * decay), so the field is violent near
        the source and nearly still at the rim — the eye is given an origin;
     3. the dot DENSITY along the radius is a hand-authored cubic B-spline
        rather than a formula, so the rings and gaps are drawn rather than
        derived.

   Rest positions are baked once into an attribute in field units. A resize
   changes one uniform and never touches the buffer.
   ========================================================================== */

export interface RadialRippleDotCloudProps {
  /** Dots kept after density rejection. One buffer, one draw call. */
  count?: number;
  /** Base dot diameter in CSS pixels, before the per-dot density scale. */
  size?: number;
  /** Radians of wave per field unit. Wavelength is 2π / frequency. */
  frequency?: number;
  /** Radians of phase per second. Crest speed is speed / frequency. */
  speed?: number;
  /** Exponential attenuation per field unit of radius. */
  decay?: number;
  /** Peak displacement in field units, where the field is 2 units tall. */
  amplitude?: number;
  /** Ripple origin across the field, 0..1. Deliberately not 0.5. */
  centerX?: number;
  /** Ripple origin down the field, 0..1. */
  centerY?: number;
  /** Dot colour in the troughs. */
  color?: string;
  /** Dot colour on an outgoing crest. */
  crestColor?: string;
  opacity?: number;
  seed?: number | string;
  className?: string;
}

interface Uniforms {
  /** three types `uniforms` as an open record; without this it is not assignable. */
  [name: string]: THREE.IUniform;
  uElapsed: { value: number };
  uCover: { value: number };
  uCenter: { value: THREE.Vector2 };
  uFrequency: { value: number };
  uSpeed: { value: number };
  uDecay: { value: number };
  uAmplitude: { value: number };
  uSize: { value: number };
  uPixelRatio: { value: number };
  uColor: { value: THREE.Color };
  uCrestColor: { value: THREE.Color };
  uOpacity: { value: number };
}

interface Stage {
  resize: (width: number, height: number) => void;
  draw: (elapsed: number) => void;
}

/**
 * Half-width of the baked field in field units, with the field 2 units tall —
 * 16:9. Origins are baked at this one aspect and scaled by `uCover` at draw
 * time, exactly so a resize is a uniform write and not a rebuild.
 */
const FIELD_HALF_W = 16 / 9;

/**
 * Control points of a uniform cubic B-spline over normalised radius: five
 * segments, hand-placed. Reading the curve out loud: a dense core, a gap, a
 * bright secondary band at ~60% radius, then nothing at the rim. The last
 * point is negative on purpose — a control point is not a value, and pulling
 * below zero is what makes the tail actually reach zero.
 */
const DENSITY_RAMP: readonly number[] = [1, 1, 0.34, 0.28, 0.92, 0.5, 0, -0.15];

/** Frame drawn when motion is suppressed — mid-travel, so rings are visible. */
const STATIC_ELAPSED = 3.4;

/** Rejection sampling gives up rather than spinning if the ramp is near zero. */
const MAX_ATTEMPTS_PER_DOT = 24;

// #region critical
/** Uniform cubic B-spline basis at parameter `t` within one span. */
function bsplineWeights(t: number): [number, number, number, number] {
  const t2 = t * t;
  const t3 = t2 * t;
  return [
    (1 - 3 * t + 3 * t2 - t3) / 6,
    (4 - 6 * t2 + 3 * t3) / 6,
    (1 + 3 * t + 3 * t2 - 3 * t3) / 6,
    t3 / 6,
  ];
}

/**
 * Sample the density curve at `u` in 0..1. `n` control points give `n - 3`
 * spans; the curve is C2 and does NOT pass through its control points, which
 * is the property that lets a hand-placed sequence stay smooth.
 */
function sampleRamp(ramp: readonly number[], u: number): number {
  const spans = ramp.length - 3;
  if (spans < 1) return clamp(ramp[0] ?? 0, 0, 1);
  const s = clamp(u, 0, 1) * spans;
  const span = Math.min(Math.floor(s), spans - 1);
  const weights = bsplineWeights(s - span);
  let total = 0;
  for (let k = 0; k < 4; k += 1) {
    total += (ramp[span + k] ?? 0) * (weights[k] ?? 0);
  }
  return clamp(total, 0, 1);
}

export function RadialRippleDotCloud({
  count = 6000,
  size = 2.6,
  frequency = 6.5,
  speed = 2.4,
  decay = 0.85,
  amplitude = 0.045,
  centerX = 0.4,
  centerY = 0.5,
  color = '#5d6b7a',
  crestColor = '#eaf2ff',
  opacity = 1,
  seed = 'radial-ripple-dot-cloud',
  className,
}: RadialRippleDotCloudProps) {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage | null>(null);
  const [unsupported, setUnsupported] = useState(false);

  const { width, height } = useResizeObserver(host);
  const size2 = useRef({ width, height });
  size2.current = { width, height };

  const reduced = useReducedMotion();
  const visible = useVisibility();
  const { inView } = useInView(host, { threshold: 0 });
  const ready = width > 0 && height > 0;

  useEffect(() => {
    const el = host.current;
    if (!el || !ready) return;

    if (!hasWebGL()) {
      setUnsupported(true);
      return;
    }

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

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;

    // Field-unit centre of the ripple. Baked alongside the origins so the
    // normalised radius each dot stores is measured from the same point the
    // shader will use.
    const cx = (centerX * 2 - 1) * FIELD_HALF_W;
    const cy = 1 - centerY * 2;

    /* The farthest corner from the source. Normalising radius by this is what
       makes the density ramp aspect-independent: the tail of the curve lands on
       the corner of the field rather than at some arbitrary unit distance. */
    const maxRadius = Math.max(
      Math.hypot(FIELD_HALF_W - cx, 1 - cy),
      Math.hypot(FIELD_HALF_W + cx, 1 - cy),
      Math.hypot(FIELD_HALF_W - cx, 1 + cy),
      Math.hypot(FIELD_HALF_W + cx, 1 + cy),
    );

    /* Rejection sampling against the density curve. Candidates are uniform over
       the field rectangle and kept with probability `ramp(r)`, which is the only
       way to get an arbitrary hand-drawn radial density out of a uniform PRNG
       without inverting the curve analytically. Seeded, so the layout is
       identical on the server, on the client, and on every reload. */
    const rng = createRng(seed);
    const wanted = Math.max(1, Math.round(count));
    const origins: number[] = [];
    const scales: number[] = [];
    const alphas: number[] = [];

    let attempts = 0;
    const budget = wanted * MAX_ATTEMPTS_PER_DOT;
    while (origins.length < wanted * 2 && attempts < budget) {
      attempts += 1;
      const x = (rng() * 2 - 1) * FIELD_HALF_W;
      const y = rng() * 2 - 1;
      const density = sampleRamp(DENSITY_RAMP, Math.hypot(x - cx, y - cy) / maxRadius);
      if (rng() > density) continue;
      origins.push(x, y);
      // The ramp is reused for weight as well as for density, so a sparse band
      // is also a dim one. Two curves would let them disagree and the field
      // would read as noise with holes in it.
      scales.push(0.55 + 0.75 * density);
      alphas.push(0.3 + 0.7 * density);
    }

    const kept = scales.length;
    const positions = new Float32Array(kept * 3); // zeros; the shader positions
    const originAttr = new Float32Array(kept * 2);
    const scaleAttr = new Float32Array(kept);
    const alphaAttr = new Float32Array(kept);
    for (let i = 0; i < kept; i += 1) {
      originAttr[i * 2] = origins[i * 2] ?? 0;
      originAttr[i * 2 + 1] = origins[i * 2 + 1] ?? 0;
      scaleAttr[i] = scales[i] ?? 1;
      alphaAttr[i] = alphas[i] ?? 1;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aOrigin', new THREE.BufferAttribute(originAttr, 2));
    geometry.setAttribute('aScale', new THREE.BufferAttribute(scaleAttr, 1));
    geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphaAttr, 1));

    const uniforms: Uniforms = {
      uElapsed: { value: 0 },
      uCover: { value: 1 },
      uCenter: { value: new THREE.Vector2(cx, cy) },
      uFrequency: { value: frequency },
      uSpeed: { value: speed },
      uDecay: { value: decay },
      uAmplitude: { value: amplitude },
      uSize: { value: size },
      uPixelRatio: { value: renderer.getPixelRatio() },
      uColor: { value: new THREE.Color(color) },
      uCrestColor: { value: new THREE.Color(crestColor) },
      uOpacity: { value: opacity },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: RADIAL_RIPPLE_VERT,
      fragmentShader: RADIAL_RIPPLE_FRAG,
      uniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      // Additive, because overlapping dots in the dense core should read as
      // brighter rather than as a flat plate of the same colour.
      blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(geometry, material);
    // Every vertex is displaced in the shader, so three's bounding sphere is
    // wrong by construction and culling against it can blank the whole cloud.
    points.frustumCulled = false;
    scene.add(points);

    el.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';

    const resize = (w: number, h: number) => {
      if (w <= 0 || h <= 0) return;
      renderer.setSize(w, h, false);
      const aspect = w / h;
      camera.left = -aspect;
      camera.right = aspect;
      camera.top = 1;
      camera.bottom = -1;
      camera.updateProjectionMatrix();

      /* Cover, not contain. Past 16:9 the baked field is narrower than the
         camera, so it is scaled up until it reaches both edges; the alternative
         is a visible vertical seam where the dots stop. The centre is scaled by
         the same factor so the ripple stays put relative to the field. */
      const cover = Math.max(1, aspect / FIELD_HALF_W);
      uniforms.uCover.value = cover;
      uniforms.uCenter.value.set(cx * cover, cy * cover);
      // Re-read: moving a window between displays changes devicePixelRatio
      // without changing the CSS size, and dot sizes are specified in CSS px.
      uniforms.uPixelRatio.value = renderer.getPixelRatio();
    };

    const draw = (elapsed: number) => {
      uniforms.uElapsed.value = elapsed;
      renderer.render(scene, camera);
    };

    resize(size2.current.width, size2.current.height);
    stage.current = { resize, draw };
    draw(STATIC_ELAPSED);

    return () => {
      stage.current = null;
      disposeObject(scene);
      material.dispose();
      disposeRenderer(renderer);
      renderer.domElement.remove();
    };
  }, [
    ready,
    count,
    size,
    frequency,
    speed,
    decay,
    amplitude,
    centerX,
    centerY,
    color,
    crestColor,
    opacity,
    seed,
  ]);

  useEffect(() => {
    stage.current?.resize(width, height);
    // A resize clears the drawing buffer, so the frozen frame has to be
    // redrawn or a reduced-motion visitor sees an empty box after any reflow.
    if (reduced) stage.current?.draw(STATIC_ELAPSED);
  }, [width, height, reduced]);

  useRaf(
    (_dt, elapsed) => stage.current?.draw(elapsed),
    ready && inView && visible && !reduced && !unsupported,
  );
  // #endregion critical

  return (
    <div ref={host} className={cn('relative h-full w-full overflow-hidden', className)}>
      {unsupported ? (
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(45% 60% at 40% 50%, rgba(234,242,255,0.14), rgba(93,107,122,0.06) 55%, transparent 72%)',
          }}
        />
      ) : null}
    </div>
  );
}
