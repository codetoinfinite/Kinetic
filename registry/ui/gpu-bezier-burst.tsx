'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { cn } from '@/lib/cn';
import { useRaf } from '@/registry/hooks/use-raf';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';
import { useResizeObserver } from '@/registry/hooks/use-resize-observer';
import { createRng } from '@/registry/lib/prng';
import { disposeObject, disposeRenderer, hasWebGL, pixelRatio } from '@/registry/lib/webgl';
import { GPU_BEZIER_BURST_FRAG, GPU_BEZIER_BURST_VERT } from '@/registry/shaders/gpu-bezier-burst';

/* ==========================================================================
   GPU Cubic-Bezier Burst
   --------------------------------------------------------------------------
   Concentric rings of dots. Fire a sector and its particles burst outward,
   each on its own cubic-bezier easing curve, solved in the vertex shader by
   Newton's method.

   Two ideas carry the component:

   1. The easing lives on the GPU. Control points ride in a per-vertex
      attribute, so 200 particles can have 200 different curves while the CPU
      does nothing per frame but advance a clock. Solving on the CPU would mean
      either one shared easing for the whole burst, or a buffer upload a frame.

   2. Two clocks. `uRotation` is ambient decoration and freezes under reduced
      motion. `uBurstTime` is feedback for something the user did, and keeps
      running. Reduced motion means less gratuitous movement, not an interface
      that stops answering.
   ========================================================================== */

export interface GpuBezierBurstProps {
  /** Concentric rings in the resting field. */
  ringCount?: number;
  /** Dots on the outermost ring; inner rings scale down to keep density even. */
  ringDots?: number;
  /** Radius of the innermost ring, as a fraction of the outermost. */
  innerRadius?: number;
  /** Sectors that can be fired independently. */
  groups?: number;
  /** Burst particles per sector. */
  burstDots?: number;
  /** Ambient ring rotation, radians per second. */
  spinSpeed?: number;
  /** Seconds between automatic firings. */
  chordInterval?: number;
  /** Seconds a single particle's flight lasts. */
  burstDuration?: number;
  /** How far a particle travels, in CSS pixels. */
  burstRadius?: number;
  /** Dot radius multiplier, in CSS pixels. */
  dotScale?: number;
  /** Model-to-pixel scale as a fraction of the container short side. */
  viewScale?: number;
  opacity?: number;
  color?: string;
  burstColor?: string;
  seed?: number | string;
  className?: string;
}

interface Uniforms {
  /** three types `uniforms` as an open record; a closed interface is not assignable. */
  [name: string]: THREE.IUniform;
  uBurstTime: { value: number };
  uRotation: { value: number };
  uViewScale: { value: number };
  uPixelRatio: { value: number };
  uDotScale: { value: number };
  uOpacity: { value: number };
  uBurstDuration: { value: number };
  uBurstRadius: { value: number };
  uColor: { value: THREE.Color };
  uBurstColor: { value: THREE.Color };
}

interface Stage {
  resize: (width: number, height: number) => void;
  step: (dt: number) => void;
}

/** Rotation the ring is frozen at under reduced motion, in radians. */
const STATIC_ROTATION = 0.35;

/**
 * Largest per-particle launch delay, in seconds. A burst whose particles all
 * leave on the same frame reads as one expanding ring; staggering the launches
 * over ~90ms reads as a spray. Kept well under `burstDuration` so the last
 * particle leaves before the first has landed.
 */
const MAX_LAUNCH_DELAY = 0.09;

/** Resting dots are smaller than burst particles so the burst reads as the event. */
const RING_DOT_SCALE = 0.7;
const BURST_DOT_SCALE = 1.15;

// #region critical
export function GpuBezierBurst({
  ringCount = 4,
  ringDots = 190,
  innerRadius = 0.55,
  groups = 6,
  burstDots = 34,
  spinSpeed = 0.18,
  chordInterval = 1.5,
  burstDuration = 0.45,
  burstRadius = 26,
  dotScale = 1,
  viewScale = 0.4,
  opacity = 1,
  color = '#6f757e',
  burstColor = '#ffffff',
  seed = 'gpu-bezier-burst',
  className,
}: GpuBezierBurstProps) {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage | null>(null);
  const [unsupported, setUnsupported] = useState(false);

  // Gates the frame loop under reduced motion: no ambient animation, but a
  // burst in flight still needs frames until it lands.
  const [burstLive, setBurstLive] = useState(false);

  const { width, height } = useResizeObserver(host);
  const size = useRef({ width, height });
  size.current = { width, height };

  const reduced = useReducedMotion();
  // Read inside the frame loop rather than closed over, so toggling the OS
  // setting does not tear down and rebuild the GL context.
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;

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

    const rng = createRng(seed);

    const positions: number[] = [];
    const burstData: number[] = [];
    const bezier: number[] = [];

    /* ------------------------------------------------------------------
       Resting rings. Dot count scales with radius so the inner rings are
       not visibly denser than the outer ones — constant dots-per-ring is
       the classic tell of a generated field.
       ------------------------------------------------------------------ */
    for (let r = 0; r < ringCount; r += 1) {
      const t = ringCount === 1 ? 1 : r / (ringCount - 1);
      const radius = innerRadius + (1 - innerRadius) * t;
      const count = Math.max(8, Math.round(ringDots * radius));

      for (let i = 0; i < count; i += 1) {
        const angle = (i / count) * Math.PI * 2 + rng() * 0.01;
        positions.push(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
        // isBurst 0: these never move, so flight angle, delay and curve are unused.
        burstData.push(0, angle, RING_DOT_SCALE, 0);
        bezier.push(0, 0, 1, 1);
      }
    }

    /* ------------------------------------------------------------------
       Burst particles, grouped into contiguous sectors so firing one is a
       single contiguous write into the start-time buffer. They sit on the
       outer ring invisible until fired: displacing the resting dots
       instead would leave a hole in the ring, then pop them back.
       ------------------------------------------------------------------ */
    const groupRanges: { start: number; end: number }[] = [];
    const restingDots = positions.length / 3;
    const sector = (Math.PI * 2) / groups;

    for (let g = 0; g < groups; g += 1) {
      const start = positions.length / 3;
      const centre = g * sector;

      for (let i = 0; i < burstDots; i += 1) {
        const angle = centre + (rng() - 0.5) * sector * 0.9;
        const radius = 0.94 + rng() * 0.06;
        positions.push(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
        burstData.push(
          1,
          // Flight direction fans slightly off pure radial, so the burst
          // spreads instead of leaving on rails.
          angle + (rng() - 0.5) * 0.35,
          BURST_DOT_SCALE,
          rng() * MAX_LAUNCH_DELAY,
        );

        /* Each particle gets its own curve, jittered around an ease-out
           (0, 0.9, 0.5, 1). x-coordinates are clamped to 0..1 because the
           solver needs the curve monotonic in x — exactly the constraint
           CSS puts on cubic-bezier(). y is free to overshoot. */
        bezier.push(
          Math.min(1, Math.max(0, rng() * 0.25)),
          0.9 + (rng() - 0.5) * 0.3,
          Math.min(1, Math.max(0, 0.5 + (rng() - 0.5) * 0.4)),
          0.95 + rng() * 0.1,
        );
      }
      groupRanges.push({ start, end: positions.length / 3 });
    }

    const total = positions.length / 3;
    const starts = new Float32Array(total);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(Float32Array.from(positions), 3));
    geometry.setAttribute('aBurstData', new THREE.BufferAttribute(Float32Array.from(burstData), 4));
    geometry.setAttribute('aBezier', new THREE.BufferAttribute(Float32Array.from(bezier), 4));

    const startAttribute = new THREE.BufferAttribute(starts, 1);
    // The only buffer that changes at runtime, and only on a firing.
    startAttribute.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('aStart', startAttribute);

    const uniforms: Uniforms = {
      uBurstTime: { value: 0 },
      uRotation: { value: STATIC_ROTATION },
      uViewScale: { value: 1 },
      uPixelRatio: { value: renderer.getPixelRatio() },
      uDotScale: { value: dotScale },
      uOpacity: { value: opacity },
      uBurstDuration: { value: burstDuration },
      uBurstRadius: { value: burstRadius },
      uColor: { value: new THREE.Color(color) },
      uBurstColor: { value: new THREE.Color(burstColor) },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: GPU_BEZIER_BURST_VERT,
      fragmentShader: GPU_BEZIER_BURST_FRAG,
      uniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    const points = new THREE.Points(geometry, material);
    // Vertices are unit-scale and the real placement happens in the shader, so
    // three's bounding sphere does not describe what is on screen.
    points.frustumCulled = false;
    scene.add(points);

    el.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';

    /* -- the two clocks ------------------------------------------------ */
    let rotation = STATIC_ROTATION; // ambient; frozen under reduced motion
    let burstTime = 1; // feedback; always runs. Starts at 1 so a start
    //                    time of 0 can mean 'never fired'.
    let nextFire = chordInterval;
    let liveUntil = 0;
    let cursor = 0;

    const fire = (group: number) => {
      const range = groupRanges[group % groupRanges.length];
      if (!range) return;
      for (let i = range.start; i < range.end; i += 1) starts[i] = burstTime;
      startAttribute.needsUpdate = true;
      liveUntil = burstTime + burstDuration + MAX_LAUNCH_DELAY + 0.05;
      setBurstLive(true);
    };

    const render = () => renderer.render(scene, camera);

    const step = (dt: number) => {
      burstTime += dt;

      if (!reducedRef.current) {
        rotation += dt * spinSpeed;
        if (burstTime >= nextFire) {
          fire(cursor);
          cursor += 1;
          nextFire = burstTime + chordInterval;
        }
      } else if (burstTime > liveUntil) {
        // Nothing in flight and no ambient motion to draw: stand the loop
        // down. Idempotent, so this is safe to call every frame.
        setBurstLive(false);
      }

      uniforms.uRotation.value = rotation;
      uniforms.uBurstTime.value = burstTime;
      render();
    };

    const resize = (w: number, h: number) => {
      renderer.setSize(w, h, false);
      camera.left = -w / 2;
      camera.right = w / 2;
      camera.top = h / 2;
      camera.bottom = -h / 2;
      camera.updateProjectionMatrix();
      uniforms.uViewScale.value = Math.min(w, h) * viewScale;
      uniforms.uPixelRatio.value = renderer.getPixelRatio();
      render();
    };

    /* -- pointer: user-initiated, so it fires under reduced motion too -- */
    const onPointerDown = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const x = event.clientX - rect.left - rect.width / 2;
      // Screen y grows downward, model y grows upward.
      const y = rect.height / 2 - (event.clientY - rect.top);
      // Undo the ambient rotation so the sector under the cursor is the one
      // that fires, not the one that was there before the ring turned.
      const angle = Math.atan2(y, x) - rotation;
      const normalised = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      fire(Math.round(normalised / sector) % groups);
    };
    el.addEventListener('pointerdown', onPointerDown);

    resize(size.current.width, size.current.height);
    stage.current = { resize, step };

    return () => {
      stage.current = null;
      el.removeEventListener('pointerdown', onPointerDown);
      disposeObject(scene);
      material.dispose();
      disposeRenderer(renderer);
      renderer.domElement.remove();
    };
  }, [
    ready,
    ringCount,
    ringDots,
    innerRadius,
    groups,
    burstDots,
    spinSpeed,
    chordInterval,
    burstDuration,
    burstRadius,
    dotScale,
    viewScale,
    opacity,
    color,
    burstColor,
    seed,
  ]);

  useEffect(() => {
    stage.current?.resize(width, height);
  }, [width, height]);

  useRaf((dt) => stage.current?.step(dt), ready && !unsupported && (!reduced || burstLive));
  // #endregion critical

  return (
    <div
      ref={host}
      className={cn('relative h-full w-full cursor-pointer overflow-hidden', className)}
    >
      {unsupported ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="aspect-square h-[70%] rounded-full border border-line" />
        </div>
      ) : null}
    </div>
  );
}
