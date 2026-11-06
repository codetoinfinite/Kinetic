'use client';

import gsap from 'gsap';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useInView } from '@/registry/hooks/use-in-view';
import { useRaf } from '@/registry/hooks/use-raf';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';
import { useResizeObserver } from '@/registry/hooks/use-resize-observer';
import { useVisibility } from '@/registry/hooks/use-visibility';
import { disposeRenderer, hasWebGL, pixelRatio } from '@/registry/lib/webgl';
import { fragmentShader, vertexShader } from '@/registry/shaders/tweened-cursor-uniform';
import { cn } from '@/lib/cn';

/* ==========================================================================
   Tweened Cursor Uniform
   --------------------------------------------------------------------------
   The pointer position is not assigned into the uniform. It is TWEENED into
   a plain JS object which the render loop then copies into the uniform, so
   the bulge trails the cursor with GSAP's easing rather than the shader's.

   That is the whole idea, and it is worth being precise about why it differs
   from `useSmoothPointer`. A `damp` follower closes a fixed fraction of the
   remaining gap per second: it is always in motion, always behind, and never
   arrives. A tween has a duration and an end — `power3.out` decelerates into
   a hard stop, so the bulge settles exactly under the cursor when the hand
   stops. Presence is a second, independent tween, which is why leaving the
   container fades the lens out where it is instead of dragging it off-screen.
   ========================================================================== */

export interface TweenedCursorUniformProps {
  /** Seconds for the bulge to catch the pointer. */
  followDuration?: number;
  /** Radius of the lens in centre-space units (0.5 == half the short edge). */
  radius?: number;
  /** How far UVs are pulled toward the cursor at full strength. */
  amount?: number;
  className?: string;
}

interface Scene {
  renderer: THREE.WebGLRenderer;
  camera: THREE.OrthographicCamera;
  scene: THREE.Scene;
  geometry: THREE.PlaneGeometry;
  material: THREE.ShaderMaterial;
}

// #region critical
const FOLLOW_EASE = 'power3.out';
const PRESENCE_IN = 0.4;
const PRESENCE_OUT = 0.6;
/** Far outside NDC, so `exp(-d²/r²)` underflows to 0 before the first move. */
const PARKED_NDC = 999;

export function TweenedCursorUniform({
  followDuration = 0.6,
  radius = 0.28,
  amount = 0.22,
  className,
}: TweenedCursorUniformProps) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<Scene | null>(null);

  /* The two tween targets. Plain objects, not uniforms: GSAP writes numbers
     onto them and the loop copies them across once per frame. Tweening the
     uniform's `.value` vector directly works too, but this keeps the tween
     alive across a material rebuild. */
  const smooth = useRef({ x: PARKED_NDC, y: PARKED_NDC });
  const presence = useRef({ value: 0 });

  const reduced = useReducedMotion();
  const { width, height } = useResizeObserver(host);
  const { inView } = useInView(host, { rootMargin: '128px' });
  const visible = useVisibility();

  /* Build once. Never in the resize effect — recreating a WebGLRenderer on
     every resize leaks contexts, and Chromium kills the OLDEST live context
     when the ~16-per-process ceiling is hit, so an unrelated canvas
     elsewhere on the page goes black. */
  useEffect(() => {
    const el = host.current;
    if (!el || !hasWebGL()) return;

    /* three owns its canvas and it is appended here, per effect run. Handing
       the constructor a React-rendered `<canvas ref>` was the bug: cleanup
       calls `forceContextLoss()`, and `getContext` on an element that has been
       through that returns the same dead context, so the next construction
       threw straight into the catch below and the component stayed blank. The
       preview host hides components with `<Activity mode="hidden">` — effects
       unmount, the DOM does not — so that cycle is ordinary scrolling here,
       not just StrictMode in development. */
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
      return;
    }
    renderer.setPixelRatio(pixelRatio(2));
    renderer.domElement.className = 'block h-full w-full';
    el.append(renderer.domElement);

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uResolution: { value: new THREE.Vector2(1, 1) },
        uCursor: { value: new THREE.Vector2(PARKED_NDC, PARKED_NDC) },
        uStrength: { value: 0 },
        uTime: { value: 0 },
        uRadius: { value: radius },
        uAmount: { value: amount },
        uInk: { value: new THREE.Color(0.08, 0.09, 0.11) },
        uPaper: { value: new THREE.Color(0.04, 0.04, 0.05) },
        uAccent: { value: new THREE.Color(0.95, 0.55, 0.2) },
      },
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    const scene = new THREE.Scene();
    scene.add(new THREE.Mesh(geometry, material));

    // A 2x2 plane under an identity-ish ortho camera is a full-screen quad
    // with no projection maths and no camera to keep in sync on resize.
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    api.current = { renderer, camera, scene, geometry, material };

    return () => {
      api.current = null;
      // `dispose()` alone frees GPU objects but leaves the context alive;
      // only `forceContextLoss()` hands it back, which is what this does.
      disposeRenderer(renderer);
      geometry.dispose();
      material.dispose();
      renderer.domElement.remove();
    };
    // Deliberately empty. `radius` and `amount` are uniform values and used to
    // sit here, which meant changing either tore the renderer down and built a
    // whole new context for what is one float. The effect below writes them
    // onto the live material instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Uniform values, not construction inputs. Written straight onto the live
     material so a prop change costs one assignment rather than a context. */
  useEffect(() => {
    const s = api.current;
    if (!s) return;
    const r = s.material.uniforms.uRadius;
    if (r) r.value = radius;
    const a = s.material.uniforms.uAmount;
    if (a) a.value = amount;
  }, [radius, amount]);

  /* Size in its own effect so a resize never touches the renderer's lifetime. */
  useEffect(() => {
    const s = api.current;
    if (!s || width === 0 || height === 0) return;
    s.renderer.setSize(width, height, false);
    const res = s.material.uniforms.uResolution;
    if (res) (res.value as THREE.Vector2).set(width, height);
    // Render once so a resize while paused still repaints, rather than
    // stretching the previous framebuffer until the pointer moves again.
    s.renderer.render(s.scene, s.camera);
  }, [width, height]);

  /* Pointer -> tween. The tween is the smoothing; nothing else damps. */
  useEffect(() => {
    const el = host.current;
    if (!el || reduced || !hasWebGL()) return;
    // A coarse pointer only produces events during a drag, so the lens would
    // pop into existence under a finger and vanish on release.
    if (!window.matchMedia('(pointer: fine)').matches) return;

    const pos = smooth.current;
    const pres = presence.current;

    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

      // `overwrite: true` (not 'auto'): each move must kill the whole previous
      // tween, including the half of it that has not started easing yet.
      gsap.to(pos, { x, y, duration: followDuration, ease: FOLLOW_EASE, overwrite: true });
      gsap.to(pres, { value: 1, duration: PRESENCE_IN, ease: 'power2.out', overwrite: 'auto' });
    };

    const onLeave = () => {
      // Fade presence only. Leaving position alone means the lens dims where
      // it stands; tweening it to a corner instead drags a visible streak.
      gsap.to(pres, { value: 0, duration: PRESENCE_OUT, ease: 'power2.out', overwrite: 'auto' });
    };

    el.addEventListener('pointermove', onMove, { passive: true });
    el.addEventListener('pointerleave', onLeave);

    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      gsap.killTweensOf([pos, pres]);
    };
  }, [followDuration, reduced]);

  useRaf(
    (_dt, elapsed) => {
      const s = api.current;
      if (!s) return;
      const u = s.material.uniforms;
      const cursor = u.uCursor;
      const strength = u.uStrength;
      const time = u.uTime;
      if (cursor) (cursor.value as THREE.Vector2).set(smooth.current.x, smooth.current.y);
      if (strength) strength.value = presence.current.value;
      if (time) time.value = elapsed;
      s.renderer.render(s.scene, s.camera);
    },
    inView && visible && !reduced,
  );

  /* Reduced motion still gets a picture — a single frame with the lens parked
     off-centre — rather than an empty box. One render, then nothing. */
  useEffect(() => {
    const s = api.current;
    if (!s || !reduced || width === 0 || height === 0) return;
    const cursor = s.material.uniforms.uCursor;
    const strength = s.material.uniforms.uStrength;
    if (cursor) (cursor.value as THREE.Vector2).set(-0.25, 0.15);
    if (strength) strength.value = 1;
    s.renderer.render(s.scene, s.camera);
  }, [reduced, width, height]);
  // #endregion critical

  return (
    <div ref={host} className={cn('relative h-full w-full overflow-hidden bg-bg', className)}>
      {/* The canvas is three's own, appended by the effect above. */}
    </div>
  );
}
