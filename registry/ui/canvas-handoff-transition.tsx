'use client';

import gsap from 'gsap';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react';
import * as THREE from 'three';
import { cn } from '@/lib/cn';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';
import { disposeRenderer, hasWebGL, pixelRatio } from '@/registry/lib/webgl';
import {
  canvasHandoffFragmentShader,
  canvasHandoffVertexShader,
} from '@/registry/shaders/canvas-handoff-transition';

/* ==========================================================================
   Canvas Handoff Transition
   --------------------------------------------------------------------------
   A WebGL surface that SURVIVES the route change. The destination page does
   not build a second renderer and crossfade to it — it is handed the live
   canvas, still holding its context, still mid-frame, and the canvas flies
   from the outgoing slot's rectangle to the incoming one.

   The normal way to put a shader on two pages is to mount it on both and let
   each own its context. That costs a fresh compile, a fresh first frame and,
   on a page with several of them, an eviction: Chromium caps live contexts per
   RENDERER PROCESS and quietly kills the oldest to make room. It also blinks.
   No amount of easing hides a shader restarting from t = 0.

   The four moves, in the order they have to happen:

     1. MEASURE FIRST, before React knows anything. `handoff()` reads the
        canvas rect inside the click handler. One `setState` later the old
        slot is gone and that number is unrecoverable.
     2. FLUSH one frame, so the pixels about to travel are this frame's, not
        the last idle frame's.
     3. MOVE in a LAYOUT effect. React's DOM mutations and layout effects run
        in the same task, so the canvas is detached and re-attached without a
        paint in between. In a passive `useEffect` the browser has already
        painted a frame with a hole in it.
     4. RESIZE LAST, on the tween's completion. Writing `canvas.width` is what
        reallocates and CLEARS the drawing buffer; do it mid-flight and the
        thing you are animating goes black for a frame.

   REACT MUST NEVER OWN THE CANVAS. Not as `<canvas ref>`, not as JSX at all.
   React owns the empty slot `<div>`s and nothing else. Two reasons, and the
   second one is the one that bites:

     - React unmounts the outgoing page's subtree on a route change. A canvas
       rendered by that subtree is destroyed with it, context and all, which is
       the exact failure this component exists to avoid.
     - `reactStrictMode` double-invokes effects in development. A React-owned
       canvas is the SAME node across both invocations, so the first cleanup's
       `forceContextLoss()` hands the second invocation a dead context and the
       component renders permanently blank — in dev only, which is a genuinely
       nasty way to lose an afternoon. Creating the canvas inside the effect
       and removing it in the cleanup makes the second run a clean slate.
   ========================================================================== */

/** Seconds for the flight between slots. */
export const HANDOFF_DURATION = 0.72;
/** Easing for the flight. */
export const HANDOFF_EASE = 'power3.inOut';

const SURGE_EASE = 'sine.inOut';
const INK: readonly [number, number, number] = [0.42, 0.65, 1];
const PAPER: readonly [number, number, number] = [0.035, 0.037, 0.045];
const LEVELS = 6;
const CELL = 2;
const MAX_DPR = 2;

/* The canvas is absolutely positioned so it fills its slot exactly at rest and
   can overflow it freely during the flight; `z-index: 1` lifts it over static
   page content on the way past. Anything that must sit ON TOP of the field
   needs its own stacking context (`relative z-10` and up).

   Declared here rather than inline: React re-renders during a route change,
   and a `style` prop would fight the transform GSAP is writing to the same
   element on the same frame. */
const HANDOFF_CSS = `
.kx-handoff-slot { position: relative; }
.kx-handoff-canvas {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  z-index: 1;
  pointer-events: none;
}
.kx-handoff-fallback {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(120% 90% at 28% 18%, var(--kx-handoff-ink, #6ba6ff) 0%, transparent 62%),
    var(--kx-handoff-paper, #09090b);
  opacity: 0.55;
}
`;

/* The index signature is what `ShaderMaterial.uniforms` is declared as; the
   named members sit alongside it so `uniforms.uHandoff.value` is a `number`
   at the call sites rather than whatever the index signature widens to. */
interface HandoffUniforms {
  [key: string]: THREE.IUniform<unknown>;
  uResolution: THREE.IUniform<THREE.Vector2>;
  uTime: THREE.IUniform<number>;
  uHandoff: THREE.IUniform<number>;
  uLevels: THREE.IUniform<number>;
  uCell: THREE.IUniform<number>;
  uInk: THREE.IUniform<THREE.Vector3>;
  uPaper: THREE.IUniform<THREE.Vector3>;
}

interface HandoffEngine {
  canvas: HTMLCanvasElement;
  uniforms: HandoffUniforms;
  /** Draw one frame right now. */
  render: () => void;
  /** Match the drawing buffer to the current slot, then draw. */
  resize: () => void;
  /** True for the length of a flight; suppresses the deferred resize. */
  flying: boolean;
}

interface CanvasHandoffInternal {
  slots: RefObject<Map<string, HTMLDivElement>>;
  engine: RefObject<HandoffEngine | null>;
  first: RefObject<DOMRect | null>;
  activeRef: RefObject<string>;
  setFallback: (value: boolean) => void;
}

export interface CanvasHandoff {
  /** Slot id currently holding the live canvas. */
  active: string;
  /** True once the host has determined WebGL is unavailable. */
  fallback: boolean;
  /**
   * Hand the canvas to `id` and run `commit` in the same task. `commit` is
   * where the route actually changes — `setState`, `router.push`, whatever.
   * Safe to call again mid-flight: the new flight starts from where the canvas
   * visually is, not from where it was going.
   */
  handoff: (id: string, commit?: () => void) => void;
  /** @internal wiring between the slots and the host. Not part of the API. */
  internal: CanvasHandoffInternal;
}

/**
 * Owns the slot registry and the active id. Call once, high enough in the tree
 * that it outlives every page it hands the canvas between.
 */
export function useCanvasHandoff(initialId: string): CanvasHandoff {
  const slots = useRef<Map<string, HTMLDivElement>>(new Map());
  const engine = useRef<HandoffEngine | null>(null);
  const first = useRef<DOMRect | null>(null);
  const activeRef = useRef(initialId);
  const [active, setActive] = useState(initialId);
  const [fallback, setFallback] = useState(false);

  const handoff = useCallback((id: string, commit?: () => void) => {
    const e = engine.current;
    if (e) {
      /* Measured HERE, in the handler, because this is the last moment the
         outgoing rectangle exists. If a flight is already running this reads
         the transformed rect — the canvas's visual position, mid-air — which
         is exactly what an interrupted FLIP should continue from. */
      first.current = e.canvas.getBoundingClientRect();
      /* One frame, now. A canvas that is detached and re-attached inside a
         single task is never repainted, so whatever sits in the drawing buffer
         at the moment of the move is what the viewer sees for that frame. */
      e.render();
    }
    activeRef.current = id;
    setActive(id);
    commit?.();
  }, []);

  return useMemo<CanvasHandoff>(
    () => ({
      active,
      fallback,
      handoff,
      internal: { slots, engine, first, activeRef, setFallback },
    }),
    [active, fallback, handoff],
  );
}

export interface CanvasHandoffSlotProps {
  controller: CanvasHandoff;
  /** Stable identity for this landing place. Unique within one controller. */
  id: string;
  className?: string;
}

/**
 * An empty box that says "the canvas belongs here on this page". It renders no
 * children while WebGL is live, so React has an empty child list for this node
 * and never touches the canvas sitting inside it.
 */
export function CanvasHandoffSlot({ controller, id, className }: CanvasHandoffSlotProps) {
  const { slots } = controller.internal;
  const mine = useRef<HTMLDivElement | null>(null);

  const ref = useCallback(
    (el: HTMLDivElement | null) => {
      const map = slots.current;
      if (el) {
        mine.current = el;
        map.set(id, el);
        return;
      }
      /* Identity-guarded: two pages may legitimately use the same id, and
         React detaches the outgoing ref before attaching the incoming one.
         Deleting blindly would drop a registration that is already correct. */
      if (map.get(id) === mine.current) map.delete(id);
      mine.current = null;
    },
    [slots, id],
  );

  return (
    <div ref={ref} className={cn('kx-handoff-slot', className)} aria-hidden>
      {controller.fallback ? <div className="kx-handoff-fallback" /> : null}
    </div>
  );
}

export interface CanvasHandoffTransitionProps {
  controller: CanvasHandoff;
  /** The pages. Each renders a `CanvasHandoffSlot` for its own landing place. */
  children: ReactNode;
  /** Seconds for the flight between slots. */
  duration?: number;
  /** Easing for the flight. */
  ease?: string;
  /** Bright end of the quantisation ramp, linear 0..1 RGB. */
  ink?: readonly [number, number, number];
  /** Dark end of the quantisation ramp, linear 0..1 RGB. */
  paper?: readonly [number, number, number];
  /** How many tones the field is crushed to. */
  levels?: number;
  /** Dither cell size in drawing-buffer pixels. */
  cell?: number;
  /** Device pixel ratio ceiling. */
  maxDpr?: number;
  className?: string;
}

/**
 * The host. Mount once, outside every page it serves — if this unmounts, the
 * context goes with it and there is nothing left to hand over.
 */
export function CanvasHandoffTransition({
  controller,
  children,
  duration = HANDOFF_DURATION,
  ease = HANDOFF_EASE,
  ink = INK,
  paper = PAPER,
  levels = LEVELS,
  cell = CELL,
  maxDpr = MAX_DPR,
  className,
}: CanvasHandoffTransitionProps) {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { slots, engine, first, activeRef, setFallback } = controller.internal;
  const active = controller.active;

  const [ink0, ink1, ink2] = ink;
  const [paper0, paper1, paper2] = paper;

  /* Read by the builder so a rebuild picks up the current look without the
     look being a dependency of the rebuild. */
  const look = useRef({ ink0, ink1, ink2, paper0, paper1, paper2, levels, cell });
  look.current = { ink0, ink1, ink2, paper0, paper1, paper2, levels, cell };

  // #region critical
  /* ------------------------------------------------------------------------
     BUILD. Depends on the motion preference and the DPR ceiling and nothing
     else — emphatically not on the active slot, or a route change would tear
     down the very context the component exists to preserve.
     ------------------------------------------------------------------------ */
  useEffect(() => {
    const rootEl = root.current;
    if (!rootEl) return;

    /* Probed in an effect, never during render: `hasWebGL()` needs `document`,
       and branching the markup on it would be a hydration mismatch rather than
       a graceful degradation. */
    if (!hasWebGL()) {
      setFallback(true);
      return;
    }
    setFallback(false);

    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      powerPreference: 'low-power',
    });
    renderer.setPixelRatio(pixelRatio(maxDpr));

    /* three constructs the canvas; React never sees it. This is the whole
       strict-mode story: the second invocation gets a brand new element and a
       brand new context, because the first invocation's cleanup removed and
       released its own. */
    const canvas = renderer.domElement;
    canvas.className = 'kx-handoff-canvas';
    canvas.setAttribute('aria-hidden', 'true');

    const l = look.current;
    const uniforms: HandoffUniforms = {
      uResolution: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uHandoff: { value: 0 },
      uLevels: { value: l.levels },
      uCell: { value: l.cell },
      /* Vector3, not Color: three applies working-colour-space conversion to a
         Color and none to a Vector3, and a `ShaderMaterial` emits `gl_FragColor`
         without the output-encoding chunk. Vector3 is the only pair of ends
         where the numbers written here are the numbers that reach the screen. */
      uInk: { value: new THREE.Vector3(l.ink0, l.ink1, l.ink2) },
      uPaper: { value: new THREE.Vector3(l.paper0, l.paper1, l.paper2) },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: canvasHandoffVertexShader,
      fragmentShader: canvasHandoffFragmentShader,
      uniforms,
    });
    // A 2x2 plane under an identity ortho camera is a full-screen quad with no
    // projection maths and no camera to keep in sync on resize.
    const geometry = new THREE.PlaneGeometry(2, 2);
    const scene = new THREE.Scene();
    scene.add(new THREE.Mesh(geometry, material));
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const render = () => renderer.render(scene, camera);

    const resize = () => {
      const host = canvas.parentElement;
      if (!host) return;
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (w === 0 || h === 0) return;
      // `false` leaves the CSS size alone; the stylesheet's 100%/100% is what
      // keeps the canvas glued to whichever slot currently owns it.
      renderer.setSize(w, h, false);
      uniforms.uResolution.value.set(w, h);
      render();
    };

    // Whatever slot is active right now. `rootEl` is the safety net for a
    // controller whose slots have not registered — the canvas is visible and
    // full-bleed rather than orphaned.
    const home = slots.current.get(activeRef.current) ?? rootEl;
    home.appendChild(canvas);
    resize();

    /* Observed on the CANVAS, not the slot: the observation follows the node
       across the handoff, so one observer covers every slot it will ever live
       in. `setSize(..., false)` never writes the CSS box, so this cannot feed
       back on itself. */
    const observer = new ResizeObserver(() => {
      // The flight deliberately runs at the OLD buffer size, scaled. Honouring
      // the resize here is the black frame the deferral exists to prevent.
      if (engine.current?.flying) return;
      resize();
    });
    observer.observe(canvas);

    if (reduced) {
      // One frame, then nothing. A field that drifts forever is motion, and
      // motion is what was asked not to happen.
      render();
    } else {
      // The timestamp is absolute, so elapsed time survives the handoff with
      // no accumulator to carry across and nothing to reset.
      renderer.setAnimationLoop((time) => {
        uniforms.uTime.value = time / 1000;
        render();
      });
    }

    engine.current = { canvas, uniforms, render, resize, flying: false };

    return () => {
      observer.disconnect();
      gsap.killTweensOf(canvas);
      gsap.killTweensOf(uniforms.uHandoff);
      // Stops the loop before releasing the context; a queued frame rendering
      // into a lost context throws out of the cleanup.
      disposeRenderer(renderer);
      material.dispose();
      geometry.dispose();
      // The effect appended it, the effect removes it. React has no idea this
      // node was ever here and will not try to reconcile it.
      canvas.remove();
      engine.current = null;
    };
  }, [reduced, maxDpr, slots, engine, activeRef, setFallback]);

  /* ------------------------------------------------------------------------
     HAND OVER. A LAYOUT effect, because React's mutations and its layout
     effects share one task: the canvas leaves the old parent and arrives at
     the new one with no paint in between. The same code in `useEffect` shows a
     frame with a hole where the canvas used to be.
     ------------------------------------------------------------------------ */
  useLayoutEffect(() => {
    const e = engine.current;
    const target = slots.current.get(active);
    if (!e || !target) return;

    const from = first.current;
    first.current = null;

    // First run after the build already parked it correctly.
    if (e.canvas.parentElement === target) return;

    // `appendChild` on a node that already has a parent MOVES it. No clone, no
    // re-creation, and the WebGL context rides along untouched.
    target.appendChild(e.canvas);

    /* An interrupted flight leaves an inline transform behind. Clear it before
       measuring or Last is read through the previous flight's scale, and the
       inversion comes out compounded — the canvas leaps somewhere neither slot
       has ever been. `clearProps` rather than a set to identity so the instant
       paths below leave the element genuinely untouched. */
    gsap.killTweensOf(e.canvas);
    gsap.set(e.canvas, { clearProps: 'transform' });

    if (!from || reduced || duration <= 0) {
      e.resize();
      return;
    }

    const to = e.canvas.getBoundingClientRect();
    if (to.width === 0 || to.height === 0) {
      e.resize();
      return;
    }

    // FLIP: invert the measured difference, then animate the inversion away.
    // Scale rather than width/height — width is a layout property and a layout
    // property tweened for 0.7 s is 0.7 s of reflow.
    const scaleX = from.width / to.width;
    const scaleY = from.height / to.height;
    const x = from.left + from.width / 2 - (to.left + to.width / 2);
    const y = from.top + from.height / 2 - (to.top + to.height / 2);

    /* For the length of the flight the canvas is bigger than, and outside, the
       slot it now lives in — so the slot must not clip. Written INLINE and
       restored afterwards, because the thing being overridden is usually a
       utility class on the consumer's own markup, and a rule in our stylesheet
       would lose to it. Skip this and the transition is invisible: the canvas
       is cropped to its destination rectangle from the first frame, which
       looks exactly like no transition at all. */
    const clipped = target.style.overflow;
    target.style.overflow = 'visible';
    const unclip = () => {
      target.style.overflow = clipped;
    };

    e.flying = true;
    const tl = gsap.timeline({
      onComplete: () => {
        e.flying = false;
        unclip();
        gsap.set(e.canvas, { clearProps: 'transform' });
        // The ONE buffer resize, now that nothing is moving.
        e.resize();
      },
    });

    tl.fromTo(
      e.canvas,
      { x, y, scaleX, scaleY, transformOrigin: '50% 50%' },
      { x: 0, y: 0, scaleX: 1, scaleY: 1, duration, ease },
      0,
    ).fromTo(
      e.uniforms.uHandoff,
      { value: 0 },
      { value: 1, duration: duration / 2, ease: SURGE_EASE, yoyo: true, repeat: 1 },
      0,
    );

    return () => {
      tl.kill();
      unclip();
      e.flying = false;
    };
  }, [active, duration, ease, reduced, engine, slots, first]);
  // #endregion critical

  /* Look changes without a rebuild. Uniform writes are free; recompiling a
     program because someone tweaked a colour is not. */
  useEffect(() => {
    const e = engine.current;
    if (!e) return;
    e.uniforms.uInk.value.set(ink0, ink1, ink2);
    e.uniforms.uPaper.value.set(paper0, paper1, paper2);
    e.uniforms.uLevels.value = levels;
    e.uniforms.uCell.value = cell;
    // Under reduced motion there is no loop to pick the change up.
    e.render();
  }, [ink0, ink1, ink2, paper0, paper1, paper2, levels, cell, engine]);

  const rgb = (r: number, g: number, b: number) =>
    `rgb(${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)})`;

  return (
    <div
      ref={root}
      className={cn('relative', className)}
      /* Only these two are inline. They are read by CSS and never touched by
         GSAP, so a re-render cannot fight a tween over them — the rule that
         keeps animated custom properties out of `style` does not apply. */
      style={
        {
          '--kx-handoff-ink': rgb(ink0, ink1, ink2),
          '--kx-handoff-paper': rgb(paper0, paper1, paper2),
        } as CSSProperties
      }
    >
      <style href="kinetic-canvas-handoff-transition" precedence="medium">
        {HANDOFF_CSS}
      </style>
      {children}
    </div>
  );
}
