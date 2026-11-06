'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { cn } from '@/lib/cn';
import { useInView } from '@/registry/hooks/use-in-view';
import { useRaf } from '@/registry/hooks/use-raf';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';
import { useResizeObserver } from '@/registry/hooks/use-resize-observer';
import { useSmoothPointer } from '@/registry/hooks/use-smooth-pointer';
import { useVisibility } from '@/registry/hooks/use-visibility';
import { clamp, perFrameToSmoothing } from '@/registry/lib/damp';
import { disposeRenderer, hasWebGL, pixelRatio } from '@/registry/lib/webgl';
import {
  FRACTIONAL_SCALE_FRAG,
  FRACTIONAL_SCALE_VERT,
} from '@/registry/shaders/fractional-render-scale';

/* ==========================================================================
   Fractional Render Scale
   --------------------------------------------------------------------------
   A full-bleed shader field whose backing store is 0.6x the size of the box it
   fills. The CSS size stays 1x, so the browser upscales — and 0.6 linear is
   0.36 of the pixels, a 64% cut in fragment shader work. A 2560x1440 window
   is 3.7 M fragments a frame at 1x and 1.3 M at 0.6x; the same window on a 2x
   screen is 14.7 M against 5.3 M.

   Everything else in the file exists to make that invisible:

     - the fog has no detail finer than a dozen pixels, so bilinear upsampling
       has nothing to soften that was not already soft;
     - the grid's line width is specified in BACKING-STORE pixels, so it gets
       wider in CSS terms as the scale drops instead of thinner — a line
       authored in CSS pixels would fall below one texel at 0.6 and stipple;
     - the canvas keeps the browser's default smoothing. `image-rendering:
       pixelated` on this element would undo the entire technique.

   The scale is applied through the device pixel ratio, so it composes with a
   3x screen instead of fighting it: 0.6 always means "0.36 of the fragments
   this display would otherwise ask for".
   ========================================================================== */

export interface FractionalRenderScaleProps {
  /** Backing store size relative to the display's own pixel ratio. */
  renderScale?: number;
  /** Cap on the device pixel ratio before the scale is applied. */
  maxDpr?: number;
  /** Grid spacing in CSS pixels. */
  gridSize?: number;
  /** Every nth line is a major one. */
  majorEvery?: number;
  /** Minor line width in BACKING-STORE pixels. Not CSS pixels — see the header. */
  lineWidth?: number;
  /** Cursor glow radius in CSS pixels. */
  glowRadius?: number;
  /** Darkest colour of the field. */
  baseColor?: string;
  /** Colour the fog lifts toward. */
  fogColor?: string;
  /** Grid line colour. */
  lineColor?: string;
  /** Additive colour under the pointer. */
  glowColor?: string;
  className?: string;
}

/**
 * The source eases the pointer with `x += (target - x) * 0.05` every frame,
 * which is frame-rate dependent by design: it makes the glow trail the cursor
 * rather than stick to it. `perFrameToSmoothing` reproduces that feel exactly
 * at 60 Hz — 0.95^60 of the gap left after a second — while behaving the same
 * on a 120 Hz display, where the raw form would arrive twice as fast.
 */
const POINTER_ALPHA = 0.05;
const POINTER_SMOOTHING = perFrameToSmoothing(POINTER_ALPHA);

/** Below this the grid's one-texel line is wider than a third of a cell. */
const MIN_SCALE = 0.25;

/** Pointer movement, in normalised units, that is worth a redraw when frozen. */
const POINTER_EPSILON = 0.0002;

interface Uniforms {
  [name: string]: THREE.IUniform;
  uResolution: THREE.IUniform<THREE.Vector2>;
  uScale: THREE.IUniform<number>;
  uTime: THREE.IUniform<number>;
  uPointer: THREE.IUniform<THREE.Vector2>;
  uGridSize: THREE.IUniform<number>;
  uMajorEvery: THREE.IUniform<number>;
  uLineWidth: THREE.IUniform<number>;
  uGlowRadius: THREE.IUniform<number>;
  uBaseColor: THREE.IUniform<THREE.Color>;
  uFogColor: THREE.IUniform<THREE.Color>;
  uLineColor: THREE.IUniform<THREE.Color>;
  uGlowColor: THREE.IUniform<THREE.Color>;
}

interface Stage {
  resize(width: number, height: number): void;
  draw(time: number, pointerX: number, pointerY: number): void;
}

// #region critical
export function FractionalRenderScale({
  renderScale = 0.6,
  maxDpr = 2,
  gridSize = 44,
  majorEvery = 5,
  lineWidth = 1,
  glowRadius = 240,
  baseColor = '#080b12',
  fogColor = '#1d3350',
  lineColor = '#8fb6df',
  glowColor = '#3f7fd0',
  className,
}: FractionalRenderScaleProps) {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage | null>(null);

  const { width, height } = useResizeObserver(host);
  const { inView } = useInView(host, { threshold: 0 });
  const visible = useVisibility();
  const reduced = useReducedMotion();
  const pointer = useSmoothPointer({ target: host, smoothing: POINTER_SMOOTHING });

  const [supported, setSupported] = useState(true);
  useEffect(() => setSupported(hasWebGL()), []);

  /* Read inside resize and draw. Keeping them out of the effect's dependency
     list means dragging a render-scale slider re-sizes the backing store
     rather than tearing down the GL context on every step. */
  const live = useRef({ renderScale, maxDpr, gridSize, majorEvery, lineWidth, glowRadius });
  live.current = { renderScale, maxDpr, gridSize, majorEvery, lineWidth, glowRadius };

  const lastPointer = useRef<{ x: number; y: number } | null>(null);

  const ready = width > 1 && height > 1 && supported;

  useEffect(() => {
    const el = host.current;
    if (!el || !ready) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        // Nothing in the field has a geometric edge, so MSAA has nothing to
        // sample — and at a fractional scale it would be antialiasing the wrong
        // grid anyway.
        antialias: false,
        // Opaque: the shader covers every pixel, and an alpha channel would make
        // the compositor blend the canvas over the page for no reason.
        alpha: false,
        depth: false,
        stencil: false,
        // The entire point of the component. On a laptop with switchable
        // graphics this keeps a decorative background off the discrete GPU.
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
    renderer.setClearColor(0x000000, 1);
    renderer.domElement.style.display = 'block';
    // CSS size is 1x and fixed to the box; the backing store is set separately
    // by setSize(..., false). The gap between the two IS the render scale.
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.Camera();

    // One oversized triangle, not a quad. It covers the viewport with three
    // vertices and no diagonal seam for the GPU to shade twice.
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3),
    );

    const uniforms: Uniforms = {
      uResolution: { value: new THREE.Vector2(1, 1) },
      uScale: { value: 1 },
      uTime: { value: 0 },
      uPointer: { value: new THREE.Vector2(0.5, 0.5) },
      uGridSize: { value: gridSize },
      uMajorEvery: { value: majorEvery },
      uLineWidth: { value: lineWidth },
      uGlowRadius: { value: glowRadius },
      uBaseColor: { value: new THREE.Color(baseColor) },
      uFogColor: { value: new THREE.Color(fogColor) },
      uLineColor: { value: new THREE.Color(lineColor) },
      uGlowColor: { value: new THREE.Color(glowColor) },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: FRACTIONAL_SCALE_VERT,
      fragmentShader: FRACTIONAL_SCALE_FRAG,
      uniforms,
      depthTest: false,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    // The triangle's vertices sit outside a unit bounding sphere, and there is
    // no camera transform to cull against in the first place.
    mesh.frustumCulled = false;
    scene.add(mesh);

    const buffer = new THREE.Vector2();

    stage.current = {
      resize(w, h) {
        const state = live.current;
        const scale = clamp(state.renderScale, MIN_SCALE, 1);
        // Scale folded into the pixel ratio: three then multiplies it through
        // setSize for the backing store while the CSS size stays whatever the
        // stylesheet says. One number, no second sizing path to keep in sync.
        renderer.setPixelRatio(pixelRatio(state.maxDpr) * scale);
        renderer.setSize(w, h, false);

        renderer.getDrawingBufferSize(buffer);
        const bw = Math.max(1, Math.round(buffer.x));
        const bh = Math.max(1, Math.round(buffer.y));
        uniforms.uResolution.value.set(bw, bh);
        // Measured, not assumed. setSize floors, so the achieved ratio differs
        // from dpr * scale by up to a pixel — and the grid is authored in CSS
        // pixels, which would then drift against the layout.
        uniforms.uScale.value = w > 0 ? bw / w : 1;

        uniforms.uGridSize.value = Math.max(4, state.gridSize);
        uniforms.uMajorEvery.value = Math.max(1, Math.round(state.majorEvery));
        uniforms.uLineWidth.value = Math.max(0.5, state.lineWidth);
        uniforms.uGlowRadius.value = Math.max(1, state.glowRadius);
      },

      draw(time, pointerX, pointerY) {
        uniforms.uTime.value = time;
        uniforms.uPointer.value.set(pointerX, pointerY);
        renderer.render(scene, camera);
      },
    };

    stage.current.resize(el.clientWidth, el.clientHeight);
    stage.current.draw(0, 0.5, 0.5);

    return () => {
      stage.current = null;
      geometry.dispose();
      material.dispose();
      disposeRenderer(renderer);
      renderer.domElement.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, baseColor, fogColor, lineColor, glowColor]);

  useEffect(() => {
    const current = stage.current;
    if (!current || width < 1 || height < 1) return;
    current.resize(width, height);
    // Resizing a canvas clears its drawing buffer. When time is frozen the
    // loop skips every frame in which the pointer has not moved, so the
    // redraw has to happen here or the field stays blank until it does. When
    // time is running the next frame covers it a few milliseconds later.
    if (reduced) {
      const state = pointer.current;
      current.draw(0, state.nx, 1 - state.ny);
      lastPointer.current = { x: state.nx, y: 1 - state.ny };
    }
  }, [
    width,
    height,
    reduced,
    renderScale,
    maxDpr,
    gridSize,
    majorEvery,
    lineWidth,
    glowRadius,
    pointer,
  ]);

  useRaf(
    (_dt, elapsed) => {
      const current = stage.current;
      if (!current) return;

      const state = pointer.current;
      const px = state.nx;
      // GL's y axis points up; the pointer's does not.
      const py = 1 - state.ny;

      // Reduced motion freezes time at 0 rather than stopping the render, so
      // the fog, the vignette and the cursor glow all survive — only the drift
      // is gone. With time constant the image is a pure function of the
      // pointer, so a frame where the pointer has not moved is skippable.
      if (reduced) {
        const last = lastPointer.current;
        if (
          last &&
          Math.abs(px - last.x) < POINTER_EPSILON &&
          Math.abs(py - last.y) < POINTER_EPSILON
        ) {
          return;
        }
      }

      lastPointer.current = { x: px, y: py };
      current.draw(reduced ? 0 : elapsed, px, py);
    },
    ready && inView && visible,
  );
  // #endregion critical

  return (
    <div className={cn('relative h-full w-full overflow-hidden', className)}>
      <div ref={host} className="absolute inset-0" />
      {!supported ? (
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: baseColor,
            backgroundImage: `radial-gradient(70% 70% at 50% 45%, ${fogColor}, transparent 75%), repeating-linear-gradient(0deg, ${lineColor}22 0 1px, transparent 1px ${gridSize}px), repeating-linear-gradient(90deg, ${lineColor}22 0 1px, transparent 1px ${gridSize}px)`,
          }}
        />
      ) : null}
    </div>
  );
}
