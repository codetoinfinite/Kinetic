'use client';

import gsap from 'gsap';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { cn } from '@/lib/cn';
import { useInView } from '@/registry/hooks/use-in-view';
import { useRaf } from '@/registry/hooks/use-raf';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';
import { useResizeObserver } from '@/registry/hooks/use-resize-observer';
import { useVisibility } from '@/registry/hooks/use-visibility';
import { gaussian } from '@/registry/lib/damp';
import {
  disposeObject,
  disposeRenderer,
  hasWebGL,
  pixelRatio,
} from '@/registry/lib/webgl';
import { mod, wrapIndex, wrappedOffset } from '@/registry/lib/wrap';
import {
  layoutLerpScalarFragmentShader,
  layoutLerpScalarVertexShader,
} from '@/registry/shaders/layout-lerp-scalar';

/* ==========================================================================
   Layout Lerp Scalar
   --------------------------------------------------------------------------
   Four arrangements — a row, a stack, a drum, a fan — that are not four
   layouts at all. There is one placement function of seven numbers, and each
   "layout" is only a set of values for those numbers. Switching between them
   is `gsap.to(params, preset)`: a tween over an object literal, no bespoke
   animation code, no per-item choreography.

   The important part is *what* is being interpolated. Cross-fading two
   layouts means blending their outputs, `lerp(f(a), f(b), s)`, which sends
   every card along a straight line between its two endpoints — straight
   through the middle of the drum, through its neighbours, through the camera.
   Blending the inputs instead, `f(lerp(a, b, s))`, keeps every intermediate
   frame a valid member of the same family: at any `s` the cards are on a
   well-formed helix, just one with a different radius and pitch. Because the
   function is nonlinear those two are genuinely different animations, and
   only the second one looks like the shape is transforming rather than the
   items relocating.

   The layout is CPU-side scalars written into `position`, `rotation` and
   `scale`, and the vertex shader is the default transform. That is what keeps
   frustum culling and three's transparency sort correct without help: both
   read the CPU matrix, and here the CPU matrix is where the card really is.
   ========================================================================== */

export type LayoutName = 'row' | 'column' | 'drum' | 'fan';

/**
 * Every number the placement function takes. Nothing here is a mode, a branch
 * or an enum — that is the whole design. A parameter you can only switch is a
 * parameter you cannot tween.
 */
export interface LayoutParams {
  /** Drum radius in world units. 0 collapses the ring to a straight line. */
  radius: number;
  /** World units of vertical travel per index step. */
  spacing: number;
  /** Fraction of the camera-derived full-width row step, per index. */
  rowSpread: number;
  /** Revolutions the ring spans across the whole set. */
  turns: number;
  /** World units each card recedes per index step away from the focus. */
  depth: number;
  /** How strongly the gaussian focus falloff is applied, 0-1. */
  focus: number;
  /** Overall card scale. */
  scale: number;
}

export interface LayoutLerpScalarProps {
  /** How many cards. They wrap, so this is also the ring's period. */
  count?: number;
  /** Which preset the parameters are tweened toward. */
  layout?: LayoutName;
  /** Override individual parameters on top of the preset. */
  params?: Partial<LayoutParams>;
  /** Seconds of the morph between presets. */
  duration?: number;
  /** Index steps per second of idle travel. 0 parks it. */
  drift?: number;
  /** First card's hue, 0-360. */
  hueStart?: number;
  /** Degrees of hue between adjacent cards. */
  hueStep?: number;
  /** Alpha multiplier applied before the focus falloff. */
  opacity?: number;
  /** Fires when a different card takes the focus position. */
  onFocusChange?: (index: number) => void;
  className?: string;
}

/* --------------------------------------------------------------------------
   The four presets. Each is nothing but a point in the seven-dimensional
   parameter space the placement function is defined over; the morph is a
   straight line between two points in that space.
   -------------------------------------------------------------------------- */
const PRESETS: Record<LayoutName, LayoutParams> = {
  row: { radius: 0, spacing: 0, rowSpread: 1, turns: 0, depth: 0.1, focus: 0.2, scale: 0.42 },
  column: { radius: 0, spacing: 0.95, rowSpread: 0, turns: 0, depth: 0.35, focus: 0.65, scale: 0.8 },
  drum: { radius: 2.55, spacing: 0.74, rowSpread: 0, turns: 2, depth: 0, focus: 1, scale: 1 },
  fan: { radius: 3.1, spacing: 0.14, rowSpread: 0.3, turns: 0.34, depth: 0, focus: 0.75, scale: 0.78 },
};

const CAMERA_FOV = 42;
const CAMERA_Z = 7.2;
/** Card height as a fraction of the frustum's visible height at z = 0. */
const CARD_HEIGHT_RATIO = 0.4;
/** Card width over card height. */
const CARD_ASPECT = 0.7;
/** Corner radius, in units of card height. */
const CARD_CORNER = 0.055;
/** Fraction of the visible width the flat row spans. */
const ROW_FILL = 0.92;
/** Scale an entirely out-of-focus card keeps. */
const SCALE_FLOOR = 0.72;

const MORPH_EASE = 'power3.inOut';
const TWO_PI = Math.PI * 2;
const DEG_TO_RAD = Math.PI / 180;

/** Uniform bag, as a type alias so it keeps its implicit index signature and
 *  is assignable to `ShaderMaterial`'s `{ [name: string]: THREE.IUniform }`. */
type CardUniforms = {
  uColorA: { value: THREE.Color };
  uColorB: { value: THREE.Color };
  uAspect: { value: number };
  uCorner: { value: number };
  uFocus: { value: number };
  uOpacity: { value: number };
};

interface Card {
  mesh: THREE.Mesh;
  uniforms: CardUniforms;
}

interface Stage {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  geometry: THREE.PlaneGeometry;
  material: THREE.ShaderMaterial;
  cards: Card[];
}

export function LayoutLerpScalar({
  count = 12,
  layout = 'drum',
  params,
  duration = 1.25,
  drift = 0.16,
  hueStart = 232,
  hueStep = 17,
  opacity = 1,
  onFocusChange,
  className,
}: LayoutLerpScalarProps) {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage | null>(null);

  const { width, height } = useResizeObserver(host);
  const { inView } = useInView(host, { threshold: 0 });
  const visible = useVisibility();
  const reduced = useReducedMotion();

  // `hasWebGL` touches `document`, so it cannot run during render without
  // disagreeing with the server. Start optimistic and correct after mount:
  // both renders then agree and nothing hydrates twice.
  const [supported, setSupported] = useState(true);
  useEffect(() => setSupported(hasWebGL()), []);

  /** The live parameter vector. GSAP tweens this object in place. */
  const live = useRef<LayoutParams>({ ...PRESETS[layout], ...params });
  /** Fractional index at the focus position. */
  const position = useRef(0);
  const focusedRef = useRef(-1);

  const notify = useRef(onFocusChange);
  notify.current = onFocusChange;

  const overrideKey = JSON.stringify(params ?? {});
  const ready = width > 1 && height > 1 && supported;

  /* ---- scene construction ------------------------------------------------ */

  useEffect(() => {
    const el = host.current;
    if (!el || !ready || count < 1) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      // A context can still be refused between the probe and the construction —
      // the tab may have hit the browser's live-context ceiling in between. three
      // throws rather than returning null, and an uncaught throw here takes the
      // page with it.
      setSupported(false);
      return;
    }
    // Capped, not raw. A 3x phone with an uncapped ratio pays 9x the fill rate
    // for a difference nobody can see.
    renderer.setPixelRatio(pixelRatio());
    renderer.setSize(el.clientWidth, el.clientHeight, false);
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      CAMERA_FOV,
      el.clientWidth / Math.max(el.clientHeight, 1),
      0.1,
      100,
    );
    camera.position.z = CAMERA_Z;

    // One 1x1 plane for every card; the size is `mesh.scale`, so a resize
    // costs nothing and no geometry is rebuilt. Two triangles each: the card
    // face is drawn in the fragment shader, so there is nothing to subdivide.
    const geometry = new THREE.PlaneGeometry(1, 1);
    // A shared prototype only for the source strings — each card clones it so
    // it can own its colours. three keys its program cache on the shader
    // source, so all the clones still share one compiled program.
    const prototype = new THREE.ShaderMaterial({
      vertexShader: layoutLerpScalarVertexShader,
      fragmentShader: layoutLerpScalarFragmentShader,
      transparent: true,
      side: THREE.DoubleSide,
      // No depth write: a transparent card must not stop the card behind it
      // from drawing. Order therefore comes entirely from three's painter
      // sort, which ranks transparent meshes by their CPU-side view depth —
      // correct here precisely because the CPU is what positions them.
      depthWrite: false,
    });

    const cards: Card[] = [];
    for (let i = 0; i < count; i++) {
      const hue = mod(hueStart + i * hueStep, 360) / 360;
      const uniforms: CardUniforms = {
        // setHSL is told the values are sRGB, so three converts them into the
        // linear working space. Skip that and every card renders lighter and
        // flatter than the CSS colours beside it.
        uColorA: { value: new THREE.Color().setHSL(hue, 0.52, 0.62, THREE.SRGBColorSpace) },
        uColorB: {
          value: new THREE.Color().setHSL(
            mod(hue + 0.05, 1),
            0.5,
            0.14,
            THREE.SRGBColorSpace,
          ),
        },
        uAspect: { value: CARD_ASPECT },
        uCorner: { value: CARD_CORNER },
        uFocus: { value: 1 },
        uOpacity: { value: opacity },
      };

      const material = prototype.clone();
      material.uniforms = uniforms;
      const mesh = new THREE.Mesh(geometry, material);
      // Culling is left ON, unlike every drum that bends its planes in the
      // vertex shader. The bounding sphere is computed from the geometry and
      // the CPU matrix, and here that matrix is the truth, so three can cull
      // the far side of the ring correctly and for free.
      scene.add(mesh);
      cards.push({ mesh, uniforms });
    }

    stage.current = { renderer, scene, camera, geometry, material: prototype, cards };
    renderer.render(scene, camera);

    return () => {
      stage.current = null;
      for (const card of cards) scene.remove(card.mesh);
      disposeObject(scene);
      geometry.dispose();
      prototype.dispose();
      // dispose() frees GPU objects and leaves the context alive. Only
      // forceContextLoss, which disposeRenderer calls, hands it back.
      disposeRenderer(renderer);
      renderer.domElement.remove();
    };
    // `opacity` only seeds a uniform the frame loop overwrites immediately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, count, hueStart, hueStep]);

  /* ---- size -------------------------------------------------------------- */

  useEffect(() => {
    const current = stage.current;
    if (!current || width < 1 || height < 1) return;
    current.renderer.setPixelRatio(pixelRatio());
    // `false` — the canvas is sized by CSS at 100%/100%; letting three write
    // inline pixel dimensions makes it fight the flex parent on every resize.
    current.renderer.setSize(width, height, false);
    current.camera.aspect = width / height;
    current.camera.updateProjectionMatrix();
  }, [width, height]);

  // #region critical
  /* ---- the morph: one tween over an object literal ------------------------ */

  useEffect(() => {
    const target: LayoutParams = { ...PRESETS[layout], ...params };
    const current = live.current;

    if (reduced) {
      Object.assign(current, target);
      return;
    }

    // Every parameter eases together, so the shape passes through a continuous
    // family of shapes rather than each card taking its own path. `overwrite`
    // matters: switch layout twice quickly and the second tween must take the
    // parameters from wherever the first one had got to, not fight it.
    const tween = gsap.to(current, { ...target, duration, ease: MORPH_EASE, overwrite: true });
    return () => {
      tween.kill();
    };
    // `params` is compared by value through `overrideKey`; the object literal
    // most callers pass is a new reference on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, overrideKey, duration, reduced]);

  useEffect(() => {
    const current = live.current;
    return () => {
      gsap.killTweensOf(current);
    };
  }, []);

  /* ---- the frame ---------------------------------------------------------- */

  useRaf(
    (dt) => {
      const current = stage.current;
      if (!current) return;
      const n = current.cards.length;
      if (n === 0) return;

      const p = live.current;
      const speed = reduced ? 0 : drift;
      // Wrapped rather than left to grow: at 0.16 steps/s an unwrapped
      // accumulator is fine for days, but the modulo costs nothing and keeps
      // float precision constant no matter how long the tab stays open.
      position.current = mod(position.current + dt * speed, n);
      const pos = position.current;

      // The one place the camera and the layout meet. `visibleHeight` is the
      // frustum's height at z = 0 — `2 * z * tan(fov/2)` — and the width is
      // that times the aspect. Deriving the row step from it is why the row
      // spans the frame at any viewport instead of being a guessed constant.
      const visibleHeight = 2 * Math.tan((CAMERA_FOV * DEG_TO_RAD) / 2) * CAMERA_Z;
      const visibleWidth = visibleHeight * current.camera.aspect;
      const step = (visibleWidth * ROW_FILL) / Math.max(n - 1, 1);
      const cardHeight = visibleHeight * CARD_HEIGHT_RATIO;
      const cardWidth = cardHeight * CARD_ASPECT;

      for (let i = 0; i < n; i++) {
        const card = current.cards[i];
        if (!card) continue;

        // The call that makes a finite array behave like an endless ring:
        // card 0 is one step BEFORE card 11, not eleven steps after it.
        const offset = wrappedOffset(i, pos, n);
        const angle = (offset / n) * TWO_PI * p.turns;

        // The placement function. Seven scalars in, one transform out, and
        // every layout this component has is somewhere in here.
        card.mesh.position.set(
          p.radius * Math.sin(angle) + offset * p.rowSpread * step,
          -offset * p.spacing,
          // cos(angle) - 1 keeps the focused card at z = 0 whatever the
          // radius, so growing the drum pushes the ring back rather than
          // pulling the front card into the camera. The depth term is what
          // gives the flat layouts a strictly monotonic z, which is what lets
          // three sort them back-to-front without any renderOrder fixing.
          p.radius * (Math.cos(angle) - 1) - p.depth * Math.abs(offset),
        );
        card.mesh.rotation.y = angle;

        // exp(-d^2): 1.000 at the focus, 0.368 one step out, 0.018 two,
        // 0.0001 three. Continuous and branchless, and `focus` scales how much
        // of it applies — at 0 every card is lit equally, which is what makes
        // the flat row read as an index rather than as a selection.
        const f = 1 - p.focus * (1 - gaussian(offset));
        const s = p.scale * (SCALE_FLOOR + (1 - SCALE_FLOOR) * f);
        card.mesh.scale.set(cardWidth * s, cardHeight * s, 1);
        card.uniforms.uFocus.value = f;
        card.uniforms.uOpacity.value = opacity;
      }

      const nextFocus = wrapIndex(Math.round(pos), n);
      if (nextFocus !== focusedRef.current) {
        focusedRef.current = nextFocus;
        notify.current?.(nextFocus);
      }

      current.renderer.render(current.scene, current.camera);
    },
    ready && inView && visible,
  );
  // #endregion critical

  const fallback = useMemo(
    () => (
      <div className="flex h-full w-full items-center justify-center">
        <ol className="flex max-w-full gap-1 overflow-hidden px-4">
          {Array.from({ length: Math.min(count, 7) }, (_unused, index) => (
            <li
              key={index}
              className="h-24 w-8 shrink-0 rounded-sm"
              style={{
                background: `linear-gradient(160deg, hsl(${hueStart + index * hueStep} 50% 14%), hsl(${hueStart + index * hueStep + 18} 52% 62%))`,
              }}
            />
          ))}
        </ol>
      </div>
    ),
    [count, hueStart, hueStep],
  );

  return (
    <div className={cn('relative h-full w-full overflow-hidden', className)}>
      <div ref={host} className="absolute inset-0" aria-hidden="true" />
      {!supported ? fallback : null}
    </div>
  );
}
