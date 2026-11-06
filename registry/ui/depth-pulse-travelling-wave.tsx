'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { cn } from '@/lib/cn';
import { useRaf } from '@/registry/hooks/use-raf';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';
import { useResizeObserver } from '@/registry/hooks/use-resize-observer';
import { createRng } from '@/registry/lib/prng';
import { disposeObject, disposeRenderer, hasWebGL, pixelRatio } from '@/registry/lib/webgl';
import {
  DEPTH_PULSE_WAVE_FRAG,
  DEPTH_PULSE_WAVE_VERT,
} from '@/registry/shaders/depth-pulse-travelling-wave';

/* ==========================================================================
   Depth Fade And Travelling Pulse
   --------------------------------------------------------------------------
   A lattice of dots bent around a shallow arc, breathing. Two techniques are
   stacked, and the whole point is that they compose:

   1. Depth fade. Model-space z drives alpha AND point size together, so the
      curved edges of the lattice recede without a depth buffer, a perspective
      camera, or a sort.

   2. Travelling pulse. Every column carries its own phase offset, so the
      cosine crest sweeps across the lattice instead of the whole field
      pulsing in unison. The crest also pushes dots toward the viewer, which
      feeds back into (1): the wave arrives as a moving band of brighter,
      larger dots.

   In unison, a pulsing field reads as a loading spinner. In sequence, it
   reads as something passing through.
   ========================================================================== */

export interface DepthPulseTravellingWaveProps {
  /** Columns across the arc. */
  columns?: number;
  /** Rows down each column. */
  rows?: number;
  /** Arc the lattice is bent around, in degrees. */
  arcSpan?: number;
  /** Half-depth of the arc in model units — how far the edges recede. */
  arcDepth?: number;
  /** Lattice height in model units. */
  fieldHeight?: number;
  /** Seconds per pulse. */
  pulseCycle?: number;
  /** Wavelengths visible across the lattice at any instant. */
  waveTurns?: number;
  /** How far a crest pushes a dot toward the viewer, in model units. */
  waveDepth?: number;
  /** Peak yaw of the whole lattice, in degrees. */
  yawAmplitude?: number;
  /** Yaw oscillations per second. */
  yawSpeed?: number;
  /** Dot radius multiplier, in CSS pixels. */
  dotScale?: number;
  /** Model-to-pixel scale as a fraction of the container short side. */
  viewScale?: number;
  opacity?: number;
  color?: string;
  crestColor?: string;
  seed?: number | string;
  className?: string;
}

interface Uniforms {
  /** three types `uniforms` as an open record; without this the object is not assignable. */
  [name: string]: THREE.IUniform;
  uElapsed: { value: number };
  uViewScale: { value: number };
  uPixelRatio: { value: number };
  uDotScale: { value: number };
  uOpacity: { value: number };
  uPulseCycle: { value: number };
  uWaveDepth: { value: number };
  uYaw: { value: number };
  uColor: { value: THREE.Color };
  uCrestColor: { value: THREE.Color };
}

interface Stage {
  resize: (width: number, height: number) => void;
  draw: (elapsed: number) => void;
}

/**
 * Frame drawn under reduced motion. Past INTRO_SECONDS (1.0) so the pulse is
 * at full amplitude, and a third of the way through the default cycle so the
 * crest sits inside the lattice rather than off its edge.
 */
const STATIC_ELAPSED = 1.9;

/** Tiny row contribution to the phase, so the crest leans instead of being a vertical bar. */
const ROW_PHASE_LEAN = 0.12;

// #region critical
export function DepthPulseTravellingWave({
  columns = 110,
  rows = 44,
  arcSpan = 110,
  arcDepth = 0.34,
  fieldHeight = 1.1,
  pulseCycle = 3,
  waveTurns = 1.4,
  waveDepth = 0.18,
  yawAmplitude = 16,
  yawSpeed = 0.25,
  dotScale = 1,
  viewScale = 0.46,
  opacity = 1,
  color = '#6f757e',
  crestColor = '#ffffff',
  seed = 'depth-pulse-travelling-wave',
  className,
}: DepthPulseTravellingWaveProps) {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage | null>(null);
  const [unsupported, setUnsupported] = useState(false);

  const { width, height } = useResizeObserver(host);
  const size = useRef({ width, height });
  size.current = { width, height };

  const reduced = useReducedMotion();
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

    const total = columns * rows;
    const positions = new Float32Array(total * 3);
    const wave = new Float32Array(total * 2);

    /* ------------------------------------------------------------------
       The arc. Columns are placed by angle, then z is renormalised so the
       centre column sits at +arcDepth and the two edges at -arcDepth
       exactly. Without the renormalisation the usable z range depends on
       arcSpan, and the depth fade would get weaker every time the arc was
       flattened — the cue would silently stop working at shallow spans.
       ------------------------------------------------------------------ */
    const halfSpan = (arcSpan * Math.PI) / 360;
    const cosEdge = Math.cos(halfSpan);
    // Guard the degenerate case: a 0 degree span has no depth to normalise.
    const depthSpan = Math.max(1e-4, 1 - cosEdge);

    let cursor = 0;
    for (let c = 0; c < columns; c += 1) {
      const colT = columns === 1 ? 0.5 : c / (columns - 1);
      const angle = (colT - 0.5) * 2 * halfSpan;
      const x = Math.sin(angle);
      const z = ((Math.cos(angle) - cosEdge) / depthSpan) * 2 * arcDepth - arcDepth;

      for (let r = 0; r < rows; r += 1) {
        const rowT = rows === 1 ? 0.5 : r / (rows - 1);
        // Sub-cell jitter, seeded. A perfect lattice moirés against the pixel
        // grid and shows banding as the field yaws.
        const jx = (rng() - 0.5) * (1 / columns) * 0.9;
        const jy = (rng() - 0.5) * (1 / rows) * 0.9;

        positions[cursor * 3] = x + jx;
        positions[cursor * 3 + 1] = (rowT - 0.5 + jy) * fieldHeight;
        positions[cursor * 3 + 2] = z;

        // Phase is what makes it travel. Constant phase across the lattice
        // would give a field that breathes in unison.
        wave[cursor * 2] = colT * waveTurns + rowT * ROW_PHASE_LEAN;
        wave[cursor * 2 + 1] = rng() - 0.5;
        cursor += 1;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aWave', new THREE.BufferAttribute(wave, 2));

    const uniforms: Uniforms = {
      uElapsed: { value: 0 },
      uViewScale: { value: 1 },
      uPixelRatio: { value: renderer.getPixelRatio() },
      uDotScale: { value: dotScale },
      uOpacity: { value: opacity },
      uPulseCycle: { value: pulseCycle },
      uWaveDepth: { value: waveDepth },
      uYaw: { value: 0 },
      uColor: { value: new THREE.Color(color) },
      uCrestColor: { value: new THREE.Color(crestColor) },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: DEPTH_PULSE_WAVE_VERT,
      fragmentShader: DEPTH_PULSE_WAVE_FRAG,
      uniforms,
      transparent: true,
      // Every dot is projected at z = 0; the depth cue is alpha and size, not
      // the depth buffer. Leaving these on would let near dots reject far ones
      // that were rasterised first and punch holes through the lattice.
      depthTest: false,
      depthWrite: false,
    });

    const points = new THREE.Points(geometry, material);
    // Positions are unit-scale around the origin and the real placement happens
    // in the shader, so three's bounding sphere does not describe what is on
    // screen and culling against it would blank the field at some sizes.
    points.frustumCulled = false;
    scene.add(points);

    el.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';

    const resize = (w: number, h: number) => {
      renderer.setSize(w, h, false);
      camera.left = -w / 2;
      camera.right = w / 2;
      camera.top = h / 2;
      camera.bottom = -h / 2;
      camera.updateProjectionMatrix();
      uniforms.uViewScale.value = Math.min(w, h) * viewScale;
      uniforms.uPixelRatio.value = renderer.getPixelRatio();
    };

    const draw = (elapsed: number) => {
      uniforms.uElapsed.value = elapsed;
      // Yaw oscillates rather than spins. A full rotation would carry columns
      // through the arc's own depth range and the travelling crest would stop
      // being readable as a wave.
      uniforms.uYaw.value = Math.sin(elapsed * yawSpeed * Math.PI * 2) * yawAmplitude;
      renderer.render(scene, camera);
    };

    resize(size.current.width, size.current.height);
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
    columns,
    rows,
    arcSpan,
    arcDepth,
    fieldHeight,
    pulseCycle,
    waveTurns,
    waveDepth,
    yawAmplitude,
    yawSpeed,
    dotScale,
    viewScale,
    opacity,
    color,
    crestColor,
    seed,
  ]);

  useEffect(() => {
    stage.current?.resize(width, height);
    if (reduced) stage.current?.draw(STATIC_ELAPSED);
  }, [width, height, reduced]);

  useRaf((_dt, elapsed) => stage.current?.draw(elapsed), ready && !reduced && !unsupported);
  // #endregion critical

  return (
    <div ref={host} className={cn('relative h-full w-full overflow-hidden', className)}>
      {unsupported ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-[55%] w-[70%] flex-col justify-between">
            {Array.from({ length: 9 }, (_, i) => (
              <div
                key={i}
                className="h-px w-full bg-line-strong"
                style={{ opacity: 0.25 + Math.sin((i / 8) * Math.PI) * 0.5 }}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
