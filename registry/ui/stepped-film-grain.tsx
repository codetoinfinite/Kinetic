'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { cn } from '@/lib/cn';
import { useRaf } from '@/registry/hooks/use-raf';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';
import { useResizeObserver } from '@/registry/hooks/use-resize-observer';
import { useVisibility } from '@/registry/hooks/use-visibility';
import { createRng } from '@/registry/lib/prng';
import { disposeRenderer, hasWebGL, pixelRatio } from '@/registry/lib/webgl';
import {
  STEPPED_FILM_GRAIN_FRAG,
  STEPPED_FILM_GRAIN_VERT,
} from '@/registry/shaders/stepped-film-grain';

/* ==========================================================================
   Stepped Film Grain
   --------------------------------------------------------------------------
   A transparent grain overlay whose pattern advances on a fixed clock instead
   of once per frame. That single decision is the whole component: per-frame
   noise reads as television snow — broken hardware — while noise that holds
   for four or five frames and then jumps reads as film.

   The step index is quantised to `stepsPerSecond`, and the offsets it walks
   are a small seeded table of integer jumps into a tiling noise lattice. Two
   consequences fall out of that:

     * the pattern changes wholesale rather than sliding, so nothing crawls in
       a direction the eye can track;
     * frames where the index has not changed are not drawn at all, so a
       120 Hz display costs the same twelve draws a second as a 60 Hz one.
   ========================================================================== */

export interface SteppedFilmGrainProps {
  /** Overall strength. 0.4 is the top of the range that still reads as stock. */
  opacity?: number;
  /** Peak-to-peak swing of the noise before opacity. */
  contrast?: number;
  /** Mean offset added to the noise — film base fog, which opens up blacks. */
  lift?: number;
  /** Size of one grain cell in CSS pixels, so grain is DPR-invariant. */
  cellSize?: number;
  /** Cells before the noise lattice repeats. */
  tile?: number;
  /** Pattern changes per second. This is the filmic/snow dial. */
  stepsPerSecond?: number;
  /** Entries in the offset table. Longer means a longer cycle before repeat. */
  steps?: number;
  /**
   * Backing-store cap. 1 by default: a grain cell is a whole CSS pixel, so
   * rendering at 2x quadruples the fill cost for an identical image.
   */
  maxDpr?: number;
  seed?: number | string;
  className?: string;
}

interface Uniforms {
  /** three types `uniforms` as an open record; without this it is not assignable. */
  [name: string]: THREE.IUniform;
  uPixelRatio: { value: number };
  uOffset: { value: THREE.Vector2 };
  uCellSize: { value: number };
  uTile: { value: number };
  uContrast: { value: number };
  uLift: { value: number };
  uOpacity: { value: number };
}

interface Stage {
  resize: (width: number, height: number) => void;
  step: (index: number) => void;
}

// #region critical
export function SteppedFilmGrain({
  opacity = 0.4,
  contrast = 0.24,
  lift = 0.095,
  cellSize = 1,
  tile = 170,
  stepsPerSecond = 12,
  steps = 24,
  maxDpr = 1,
  seed = 'stepped-film-grain',
  className,
}: SteppedFilmGrainProps) {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage | null>(null);
  const [unsupported, setUnsupported] = useState(false);

  const { width, height } = useResizeObserver(host);
  const size = useRef({ width, height });
  size.current = { width, height };

  const reduced = useReducedMotion();
  const visible = useVisibility();
  const ready = width > 0 && height > 0;

  const stepCount = Math.max(1, Math.round(steps));

  useEffect(() => {
    const el = host.current;
    if (!el || !ready) return;

    if (!hasWebGL()) {
      setUnsupported(true);
      return;
    }

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        // Nothing here has a geometric edge, so MSAA would allocate a
        // multisample buffer the size of the canvas and resolve it every draw
        // for no visible difference.
        antialias: false,
        alpha: true,
        depth: false,
        stencil: false,
        powerPreference: 'low-power',
      });
    } catch {
      // A context can still be refused between the probe and the construction —
      // the tab may have hit the browser's live-context ceiling in between. three
      // throws rather than returning null, and an uncaught throw here takes the
      // page with it.
      setUnsupported(true);
      return;
    }
    renderer.setPixelRatio(pixelRatio(maxDpr));
    renderer.setClearAlpha(0);

    const scene = new THREE.Scene();
    // The quad is authored in clip space, so the camera exists only because
    // three's render signature requires one.
    const camera = new THREE.Camera();

    const geometry = new THREE.PlaneGeometry(2, 2);

    const uniforms: Uniforms = {
      uPixelRatio: { value: renderer.getPixelRatio() },
      uOffset: { value: new THREE.Vector2() },
      uCellSize: { value: Math.max(cellSize, 0.25) },
      uTile: { value: Math.max(tile, 8) },
      uContrast: { value: contrast },
      uLift: { value: lift },
      uOpacity: { value: opacity },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: STEPPED_FILM_GRAIN_VERT,
      fragmentShader: STEPPED_FILM_GRAIN_FRAG,
      uniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      // Normal blending, not additive: the shader emits black as well as white
      // and additive could only lighten, which turns grain into haze.
      blending: THREE.NormalBlending,
    });

    const quad = new THREE.Mesh(geometry, material);
    quad.frustumCulled = false;
    scene.add(quad);

    /* The offset table. Seeded, not `Math.random`, so the sequence is identical
       on the server, on the client, and on every reload — and integer, so each
       jump lands exactly on the cell lattice. A non-integer offset resamples
       cell boundaries and the grain appears to slide a fraction of a cell,
       which is the crawl this component exists to avoid. */
    const rng = createRng(seed);
    const wrap = uniforms.uTile.value;
    const offsets: Array<[number, number]> = [];
    for (let i = 0; i < stepCount; i += 1) {
      offsets.push([Math.floor(rng() * wrap), Math.floor(rng() * wrap)]);
    }

    el.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';

    let lastIndex = -1;

    const resize = (w: number, h: number) => {
      if (w <= 0 || h <= 0) return;
      renderer.setPixelRatio(pixelRatio(maxDpr));
      renderer.setSize(w, h, false);
      // Re-read rather than assume: dragging the window between a retina and a
      // non-retina display changes devicePixelRatio without changing the CSS
      // size, and a stale value rescales every grain cell.
      uniforms.uPixelRatio.value = renderer.getPixelRatio();
      // Resizing a canvas clears its drawing buffer, and this component only
      // draws on a step change — without a redraw here the overlay would be
      // blank until the next step, up to 1/stepsPerSecond later.
      renderer.render(scene, camera);
    };

    const step = (index: number) => {
      if (index === lastIndex) return;
      lastIndex = index;
      const pair = offsets[index] ?? offsets[0];
      if (pair) uniforms.uOffset.value.set(pair[0], pair[1]);
      renderer.render(scene, camera);
    };

    resize(size.current.width, size.current.height);
    stage.current = { resize, step };
    step(0);

    return () => {
      stage.current = null;
      geometry.dispose();
      material.dispose();
      disposeRenderer(renderer);
      renderer.domElement.remove();
    };
  }, [ready, opacity, contrast, lift, cellSize, tile, stepCount, maxDpr, seed]);

  useEffect(() => {
    stage.current?.resize(width, height);
  }, [width, height]);

  useRaf((_dt, elapsed) => {
    // Quantised time, not time. Everything filmic about this component is the
    // fact that this number changes twelve times a second and the draw call
    // is skipped in between.
    const index = Math.floor(elapsed * stepsPerSecond) % stepCount;
    stage.current?.step(index);
  }, ready && visible && !reduced && !unsupported);
  // #endregion critical

  return (
    <div
      aria-hidden
      ref={host}
      className={cn('pointer-events-none relative h-full w-full overflow-hidden', className)}
    />
  );
}
