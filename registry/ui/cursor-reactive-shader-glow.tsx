'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import { cn } from '@/lib/cn';
import { useInView } from '@/registry/hooks/use-in-view';
import { useRaf } from '@/registry/hooks/use-raf';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';
import { useResizeObserver } from '@/registry/hooks/use-resize-observer';
import { useVisibility } from '@/registry/hooks/use-visibility';
import { clamp, damp } from '@/registry/lib/damp';
import { disposeRenderer, hasWebGL, pixelRatio } from '@/registry/lib/webgl';
import {
  cursorReactiveShaderGlowFragmentShader,
  cursorReactiveShaderGlowVertexShader,
} from '@/registry/shaders/cursor-reactive-shader-glow';

/* ==========================================================================
   Cursor-Reactive Shader Glow
   --------------------------------------------------------------------------
   A hero backdrop: a slow warped-noise atmosphere with a light that follows
   the cursor through it. Three decisions carry the whole thing.

   1. THE POINTER IS DAMPED ON THE CPU, NEVER WRITTEN STRAIGHT INTO A UNIFORM.
      A `pointermove` handler that assigns the uniform hands the shader one
      raw sample per event: on a 120Hz trackpad that is a staircase, and on a
      dropped frame it is a jump. The handler records a TARGET; the render loop
      damps toward it with `damp(current, target, smoothing, dt)`, which is
      frame-rate independent by construction. A per-frame constant like
      `x += (t - x) * 0.1` converges twice as fast at 120Hz as at 60Hz, so the
      glow would trail differently on different hardware.

   2. THE POINTER ENTERS THE NOISE THREE TIMES, WEAKLY. Once on each warp
      channel with opposite signs, once on the final sample. Three weak
      influences read as "the atmosphere responds to you"; one strong influence
      reads as "the atmosphere is glued to the cursor".

   3. THE OUTPUT HAS A LUMINANCE CEILING. This is a backdrop, so the thing that
      matters is that copy stays readable over it. The shader measures the
      Rec.709 luminance of the colour it composed and scales the whole vector
      until it fits under `ceiling`. Turning `glowGain` up cannot break the
      contrast of the text on top, which means the parameter is safe to tune.

   `energy` is measured from the FOLLOWER's speed, not the raw pointer's. The
   follower is already smooth, so the measurement needs no second filter and a
   single stray event cannot spike it.
   ========================================================================== */

export interface CursorReactiveShaderGlowProps {
  /** Overlay content. Pointer-transparent, so the canvas keeps receiving moves. */
  children?: ReactNode;
  /** Rec.709 luminance the output may never exceed. The contrast guarantee. */
  ceiling?: number;
  /** Radius of the tight glow core, in aspect-corrected UV units. */
  coreRadius?: number;
  /** Radius of the wide halo. Squared in the shader, so it has no edge. */
  haloRadius?: number;
  /** Noise frequency. Below 1 the features are larger than the screen. */
  scale?: number;
  /** How far the two warp channels push the third noise sample. */
  warp?: number;
  /** Peak brightness the noise field adds over `base`. */
  fieldGain?: number;
  /** Peak brightness the cursor glow adds over `base`. */
  glowGain?: number;
  /** Fraction of the pointer gap still remaining after one second. */
  smoothing?: number;
  /** Deepest colour, linear 0..1 RGB. */
  base?: readonly [number, number, number];
  /** Colour the noise field lifts toward. */
  tint?: readonly [number, number, number];
  /** Colour of the cursor light. */
  glowTint?: readonly [number, number, number];
  maxDpr?: number;
  className?: string;
}

// #region critical
/**
 * UV units per second the follower must cover for `uEnergy` to read 1. A slow
 * deliberate sweep across a hero is roughly 0.6/s; above ~2.5 the reading
 * saturates on ordinary movement and the brightness stops meaning anything.
 */
const ENERGY_FULL_SCALE = 1.8;
/** Fast: energy must track the hand, or the brightening arrives after the move. */
const ENERGY_SMOOTHING = 0.002;
/** Slow: presence is a fade in and out, and 400ms of it reads as a light. */
const PRESENCE_SMOOTHING = 0.02;
/** Fixed time slice for the reduced-motion still. Not 0 — that is a flat frame. */
const STILL_TIME = 8.2;
/** Where the light sits in the reduced-motion still. Off-centre reads composed. */
const STILL_POINTER: readonly [number, number] = [0.34, 0.6];
const STILL_ENERGY = 0.35;

const BASE: readonly [number, number, number] = [0.03, 0.031, 0.038];
const TINT: readonly [number, number, number] = [0.62, 0.7, 0.95];
const GLOW_TINT: readonly [number, number, number] = [1, 0.94, 0.86];

interface GlowUniforms {
  /** three types `uniforms` as an open record; the index signature matches it. */
  [name: string]: THREE.IUniform;
  uResolution: THREE.IUniform<THREE.Vector2>;
  uTime: THREE.IUniform<number>;
  uPointer: THREE.IUniform<THREE.Vector2>;
  uPresence: THREE.IUniform<number>;
  uEnergy: THREE.IUniform<number>;
  uScale: THREE.IUniform<number>;
  uWarp: THREE.IUniform<number>;
  uCoreRadius: THREE.IUniform<number>;
  uHaloRadius: THREE.IUniform<number>;
  uFieldGain: THREE.IUniform<number>;
  uGlowGain: THREE.IUniform<number>;
  uCeiling: THREE.IUniform<number>;
  uBase: THREE.IUniform<THREE.Color>;
  uTint: THREE.IUniform<THREE.Color>;
  uGlowTint: THREE.IUniform<THREE.Color>;
}

interface Stage {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  geometry: THREE.PlaneGeometry;
  material: THREE.ShaderMaterial;
  uniforms: GlowUniforms;
}

export function CursorReactiveShaderGlow({
  children,
  ceiling = 0.175,
  coreRadius = 0.22,
  haloRadius = 0.85,
  scale = 0.7,
  warp = 0.9,
  fieldGain = 0.08,
  glowGain = 0.1,
  smoothing = 0.0016,
  base = BASE,
  tint = TINT,
  glowTint = GLOW_TINT,
  maxDpr = 2,
  className,
}: CursorReactiveShaderGlowProps) {
  const host = useRef<HTMLDivElement>(null);
  const mount = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage | null>(null);

  const { width, height } = useResizeObserver(host);
  const { inView } = useInView(host, { rootMargin: '10%' });
  const visible = useVisibility();
  const reduced = useReducedMotion();

  const [supported, setSupported] = useState(true);
  useEffect(() => setSupported(hasWebGL()), []);

  /* Raw pointer target in 0..1 with y up. `null` means no real pointer has been
     seen, which is distinct from a legitimate pointer in the bottom-left
     corner — the glow must not exist before the first move. */
  const target = useRef<{ x: number; y: number } | null>(null);
  const inside = useRef(false);
  /** The damped follower. Seeded at the centre so the first move eases outward. */
  const pos = useRef({ x: 0.5, y: 0.5 });
  const presence = useRef(0);
  const energy = useRef(0);

  /* Live config, read by the loop. Changing a number must not rebuild the
     renderer: Chromium kills the OLDEST context past ~16 per process, so a
     rebuild on every prop change blanks an unrelated canvas on the page. */
  const live = useRef({
    ceiling,
    coreRadius,
    haloRadius,
    scale,
    warp,
    fieldGain,
    glowGain,
    smoothing,
  });
  live.current = {
    ceiling,
    coreRadius,
    haloRadius,
    scale,
    warp,
    fieldGain,
    glowGain,
    smoothing,
  };

  const ready = supported && width > 1 && height > 1;

  useEffect(() => {
    const slot = mount.current;
    if (!slot || !ready) return;

    /* The canvas is created here, not owned by React. `reactStrictMode` is on,
       so this effect runs twice on mount; the first cleanup calls
       `forceContextLoss()`, and asking a React-owned <canvas> for a context
       afterwards hands back the DEAD one rather than a fresh context, leaving
       the preview permanently blank. A canvas created and removed per effect
       run has no such history. */
    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      powerPreference: 'low-power',
    });
    renderer.setPixelRatio(pixelRatio(maxDpr));
    renderer.setSize(width, height, false);
    const canvas = renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    /* `touch-action: none` is deliberately NOT set. This is a decorative
       backdrop; swallowing a touch scroll to feed a glow nobody can see under
       their own finger is a straight downgrade. */
    slot.appendChild(canvas);

    const uniforms: GlowUniforms = {
      uResolution: { value: new THREE.Vector2(width, height) },
      uTime: { value: 0 },
      uPointer: { value: new THREE.Vector2(pos.current.x, pos.current.y) },
      uPresence: { value: 0 },
      uEnergy: { value: 0 },
      uScale: { value: scale },
      uWarp: { value: warp },
      uCoreRadius: { value: coreRadius },
      uHaloRadius: { value: haloRadius },
      uFieldGain: { value: fieldGain },
      uGlowGain: { value: glowGain },
      uCeiling: { value: ceiling },
      uBase: { value: new THREE.Color(base[0], base[1], base[2]) },
      uTint: { value: new THREE.Color(tint[0], tint[1], tint[2]) },
      uGlowTint: { value: new THREE.Color(glowTint[0], glowTint[1], glowTint[2]) },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: cursorReactiveShaderGlowVertexShader,
      fragmentShader: cursorReactiveShaderGlowFragmentShader,
      uniforms,
    });

    // A 2x2 plane under an identity ortho camera is a full-screen quad with no
    // projection maths and no camera to keep in sync on resize.
    const geometry = new THREE.PlaneGeometry(2, 2);
    const scene = new THREE.Scene();
    scene.add(new THREE.Mesh(geometry, material));
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    /* Listener on the CANVAS, not the window: no document-level handler
       survives to drive a disposed renderer, and the rect it measures is the
       rect it draws into. Passive, because nothing here ever calls
       preventDefault and a non-passive move listener on a scrollable page
       forces the compositor to wait for JS on every event. */
    const onMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      target.current = {
        x: (event.clientX - rect.left) / rect.width,
        // Flipped: UV y is up, client y is down.
        y: 1 - (event.clientY - rect.top) / rect.height,
      };
      inside.current = true;
    };
    const onLeave = () => {
      // Presence only. Leaving the position alone dims the light where it
      // stands; tweening it away drags a visible streak off the edge.
      inside.current = false;
    };

    canvas.addEventListener('pointermove', onMove, { passive: true });
    canvas.addEventListener('pointerleave', onLeave, { passive: true });

    stage.current = { renderer, scene, camera, geometry, material, uniforms };
    renderer.render(scene, camera);

    return () => {
      stage.current = null;
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
      // `dispose()` frees GPU objects but leaves the context alive until GC
      // decides otherwise, which may be never. `disposeRenderer` is the one
      // that calls `forceContextLoss()` and actually hands it back.
      disposeRenderer(renderer);
      geometry.dispose();
      material.dispose();
      canvas.remove();
    };
    // Colours and gains are pushed through `live`/`uniforms` from the loop, so
    // they must not appear here — a rebuild per prop change leaks contexts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, maxDpr]);

  // Resize is its own effect, so a reflow never touches the renderer's lifetime.
  useEffect(() => {
    const s = stage.current;
    if (!s || width < 1 || height < 1) return;
    s.renderer.setPixelRatio(pixelRatio(maxDpr));
    s.renderer.setSize(width, height, false);
    // CSS pixels, not the drawing buffer: the shader only takes the ratio.
    s.uniforms.uResolution.value.set(width, height);
    // Render once, or a resize while paused stretches the previous framebuffer
    // until the pointer moves again.
    s.renderer.render(s.scene, s.camera);
  }, [width, height, maxDpr]);

  useRaf(
    (dt, elapsed) => {
      const s = stage.current;
      if (!s) return;
      const cfg = live.current;

      const previousX = pos.current.x;
      const previousY = pos.current.y;

      const aim = target.current;
      if (aim) {
        pos.current.x = damp(pos.current.x, aim.x, cfg.smoothing, dt);
        pos.current.y = damp(pos.current.y, aim.y, cfg.smoothing, dt);
      }

      // Speed of the follower, in UV units per second. Dividing by dt is what
      // makes it a velocity rather than a per-frame delta that reads twice as
      // large at 60Hz as at 120Hz for the same physical hand movement.
      const travelled = Math.hypot(pos.current.x - previousX, pos.current.y - previousY);
      const speed = travelled / Math.max(dt, 0.0001);
      energy.current = damp(
        energy.current,
        clamp(speed / ENERGY_FULL_SCALE, 0, 1),
        ENERGY_SMOOTHING,
        dt,
      );
      presence.current = damp(
        presence.current,
        inside.current && aim !== null ? 1 : 0,
        PRESENCE_SMOOTHING,
        dt,
      );

      const u = s.uniforms;
      u.uTime.value = elapsed;
      u.uPointer.value.set(pos.current.x, pos.current.y);
      u.uPresence.value = presence.current;
      u.uEnergy.value = energy.current;
      u.uScale.value = cfg.scale;
      u.uWarp.value = cfg.warp;
      u.uCoreRadius.value = cfg.coreRadius;
      u.uHaloRadius.value = cfg.haloRadius;
      u.uFieldGain.value = cfg.fieldGain;
      u.uGlowGain.value = cfg.glowGain;
      u.uCeiling.value = cfg.ceiling;

      s.renderer.render(s.scene, s.camera);
    },
    ready && inView && visible && !reduced,
  );

  /* Reduced motion gets a composed picture, not an empty box: one frame at a
     fixed time slice with the light parked off-centre. Nothing ever moves, and
     the pointer listener stays attached but its target is never consumed. */
  useEffect(() => {
    const s = stage.current;
    if (!s || !reduced || width < 1 || height < 1) return;
    const [stillX = 0.34, stillY = 0.6] = STILL_POINTER;
    s.uniforms.uTime.value = STILL_TIME;
    s.uniforms.uPointer.value.set(stillX, stillY);
    s.uniforms.uPresence.value = 1;
    s.uniforms.uEnergy.value = STILL_ENERGY;
    s.renderer.render(s.scene, s.camera);
  }, [reduced, width, height, ready]);
  // #endregion critical

  return (
    <div
      ref={host}
      className={cn('relative isolate h-full w-full overflow-hidden bg-bg', className)}
    >
      <div ref={mount} aria-hidden className="absolute inset-0 z-0" />
      {supported ? null : (
        <div
          aria-hidden
          className="absolute inset-0 z-0"
          style={{
            backgroundImage:
              'radial-gradient(60% 60% at 34% 40%, var(--k-surface), transparent 70%), linear-gradient(160deg, var(--k-bg-subtle), var(--k-bg))',
          }}
        />
      )}
      {children ? (
        // Pointer-transparent: the canvas underneath must keep receiving moves,
        // and a full-bleed content layer would otherwise swallow every one of
        // them over the copy, which is exactly where the glow is wanted.
        <div className="pointer-events-none relative z-10 h-full w-full">{children}</div>
      ) : null}
    </div>
  );
}
