'use client';

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { cn } from '@/lib/cn';
import { useRaf } from '@/registry/hooks/use-raf';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';
import { useResizeObserver } from '@/registry/hooks/use-resize-observer';
import { clamp } from '@/registry/lib/damp';

/* ==========================================================================
   Raycaster-Free Hover Picking
   --------------------------------------------------------------------------
   The ring spins on the compositor: one keyframe pair handed to the browser,
   zero JS writes to the transform. Nothing on the main thread knows where the
   plates are — the DOM rects are stale the moment the animation starts, and
   asking for them would force layout fourteen times a frame.

   So the CPU runs the same transform the GPU is running. Rotate, tilt, divide
   by depth: four lines that mirror the CSS exactly, giving a screen-space
   point per plate every frame. Hit-testing is then a distance compare.

   This is not merely cheaper than a raycaster — for anything whose vertices
   are moved after they leave JS (a CSS transform, a vertex shader, a GPU
   skinning pass) it is the only correct approach. The CPU-side geometry never
   moved, so a raycaster tests where the object *would* be if nothing were
   animating it.
   ========================================================================== */

export interface CpuMirrorPickingProps {
  /** Plates around the ring. */
  count?: number;
  /** Seconds for one revolution. The CPU mirror reads this back off the clock. */
  period?: number;
  /** Draw the computed screen positions and the pick radius. */
  showMirror?: boolean;
  className?: string;
}

const TAU = Math.PI * 2;

// #region critical
/** Must match the CSS `perspective` exactly — the mirror divides by this. */
const PERSPECTIVE = 900;
/** Stage lean, degrees. Matches the CSS `rotateX`. */
const TILT = 16;
const SIN_TILT = Math.sin((TILT * Math.PI) / 180);
const COS_TILT = Math.cos((TILT * Math.PI) / 180);
/** Pointer-to-plate distance that counts as a hit, in CSS pixels. */
const PICK_RADIUS = 44;
const PICK_RADIUS_SQ = PICK_RADIUS * PICK_RADIUS;
const RADIUS_RATIO = 0.36;
const MIN_RADIUS = 64;
const MAX_RADIUS = 190;
const SPIN_PERIOD = 26;

interface Projected {
  x: number;
  y: number;
  z: number;
  scale: number;
}

/**
 * The mirror. Every line here has a counterpart in the element's CSS:
 *
 *   ul   transform: rotateY(spin)              <- from the running animation
 *   li   transform: rotateY(theta) translateZ(radius)
 *   root perspective: PERSPECTIVE
 *   stage transform: rotateX(TILT)
 *
 * A plate's centre starts at the ring origin, so `rotateY(a) translateZ(r)`
 * puts it at (r·sin a, 0, r·cos a) with a = theta + spin. Composing the two
 * rotateY into one addition is the whole trick — the rest is the standard
 * perspective divide.
 */
function project(theta: number, spin: number, radius: number, cx: number, cy: number, out: Projected): void {
  const a = theta + spin;
  const x = Math.sin(a) * radius;
  const depth = Math.cos(a) * radius;
  // rotateX(t): y' = y·cos t − z·sin t, z' = y·sin t + z·cos t. y is 0 here,
  // so the tilt turns depth into vertical offset and shortens the ring.
  const y = -depth * SIN_TILT;
  const z = depth * COS_TILT;
  // CSS perspective: everything at depth z scales by d / (d − z).
  const scale = PERSPECTIVE / (PERSPECTIVE - z);
  out.x = cx + x * scale;
  out.y = cy + y * scale;
  out.z = z;
  out.scale = scale;
}

/**
 * `Animation.currentTime` is typed `CSSNumberish | null`: a plain number in
 * every shipping engine, but the spec permits a CSSNumericValue. Narrow it
 * rather than cast, and treat a null clock (animation not yet started) as 0.
 */
function readMs(anim: Animation | null): number {
  if (!anim) return 0;
  const t = anim.currentTime;
  if (t === null) return 0;
  return typeof t === 'number' ? t : t.to('ms').value;
}

export function CpuMirrorPicking({
  count = 14,
  period = SPIN_PERIOD,
  showMirror = true,
  className,
}: CpuMirrorPickingProps) {
  const root = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLUListElement>(null);
  const plates = useRef<(HTMLLIElement | null)[]>([]);
  const probe = useRef<HTMLDivElement>(null);
  const halo = useRef<HTMLDivElement>(null);

  const anim = useRef<Animation | null>(null);
  /** Pointer in the root's own coordinate space. Null when it has left. */
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const hovered = useRef(-1);
  const scratch = useRef<Projected>({ x: 0, y: 0, z: 0, scale: 1 });

  const [hover, setHover] = useState(-1);
  const [picked, setPicked] = useState(-1);

  const reduced = useReducedMotion();
  const size = useResizeObserver(root);
  const radius = clamp(size.width * RADIUS_RATIO, MIN_RADIUS, MAX_RADIUS);

  // The compositor owns the spin. One keyframe pair, then the main thread is
  // out of the loop entirely — which is exactly why it has to reconstruct the
  // angle instead of remembering it.
  useEffect(() => {
    const el = ring.current;
    if (!el || reduced) return;
    const a = el.animate(
      [{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(360deg)' }],
      { duration: period * 1000, iterations: Infinity, easing: 'linear' },
    );
    anim.current = a;
    return () => {
      a.cancel();
      anim.current = null;
    };
  }, [period, reduced]);

  const readPointer = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const el = root.current;
    if (!el) return;
    // One rect read per pointer event, for the container only. Reading a rect
    // per plate per event is the version that costs fourteen forced layouts.
    const rect = el.getBoundingClientRect();
    pointer.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const clearPointer = useCallback(() => {
    pointer.current = null;
  }, []);

  useRaf((_dt) => {
    if (size.width === 0) return;

    // Picking runs per frame, not per pointermove. The ring moves under a
    // stationary cursor, so the hit answer changes when nothing was pointed.
    const spin = reduced ? 0 : (readMs(anim.current) / (period * 1000)) * TAU;
    const cx = size.width / 2;
    const cy = size.height / 2;
    const p = pointer.current;
    const out = scratch.current;

    let best = -1;
    let bestDist = PICK_RADIUS_SQ;
    let bestX = 0;
    let bestY = 0;

    for (let i = 0; i < count; i += 1) {
      project((i / count) * TAU, spin, radius, cx, cy, out);

      // The projection pass already knows the depth, so the fade rides along
      // rather than needing a second traversal.
      const el = plates.current[i];
      if (el) {
        const depth = out.z / (radius * COS_TILT);
        el.style.opacity = (0.18 + 0.82 * (depth * 0.5 + 0.5)).toFixed(3);
      }

      // z <= 0 is the far half of the ring: drawn, but behind the near plates
      // and never the intended target of a click.
      if (!p || out.z <= 0) continue;
      const dx = p.x - out.x;
      const dy = p.y - out.y;
      const dist = dx * dx + dy * dy;
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
        bestX = out.x;
        bestY = out.y;
      }
    }

    const marker = probe.current;
    if (marker) {
      marker.style.opacity = best >= 0 ? '1' : '0';
      if (best >= 0) {
        marker.style.transform = `translate3d(${bestX.toFixed(1)}px, ${bestY.toFixed(1)}px, 0) translate(-50%, -50%)`;
      }
    }
    const cursor = halo.current;
    if (cursor) {
      cursor.style.opacity = p ? '1' : '0';
      if (p) {
        cursor.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0) translate(-50%, -50%)`;
      }
    }

    if (best !== hovered.current) {
      hovered.current = best;
      setHover(best);
    }
  });
  // #endregion critical

  const items = Array.from({ length: count }, (_, i) => i);

  return (
    <div
      ref={root}
      // `overflow-hidden` is safe here because this element carries the
      // perspective, not preserve-3d. Put it on a preserve-3d element and the
      // whole subtree silently flattens.
      className={cn(
        'relative h-full w-full select-none overflow-hidden bg-bg',
        hover >= 0 ? 'cursor-pointer' : 'cursor-default',
        className,
      )}
      style={{ perspective: `${PERSPECTIVE}px` }}
      onPointerMove={readPointer}
      onPointerDown={readPointer}
      onPointerLeave={clearPointer}
      onClick={() => setPicked(hovered.current)}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{ transformStyle: 'preserve-3d', transform: `rotateX(${TILT}deg)` }}
      >
        <ul
          ref={ring}
          className="absolute left-1/2 top-1/2 m-0 list-none p-0"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {items.map((i) => (
            <li
              key={i}
              ref={(el) => {
                plates.current[i] = el;
              }}
              className={cn(
                'absolute left-0 top-0 grid h-14 w-10 place-items-center border font-mono text-[11px] tabular-nums transition-colors duration-150',
                i === picked
                  ? 'border-accent bg-accent/15 text-accent'
                  : i === hover
                    ? 'border-line-strong bg-surface text-fg'
                    : 'border-line bg-bg-subtle text-muted',
              )}
              style={{
                transform: `translate(-50%, -50%) rotateY(${((i / count) * 360).toFixed(3)}deg) translateZ(${radius.toFixed(1)}px)`,
              }}
            >
              {String(i).padStart(2, '0')}
            </li>
          ))}
        </ul>
      </div>

      {/* The mirror made visible: where the CPU thinks the plate is, and how
          close the pointer has to get. Neither is a DOM measurement. */}
      {showMirror && (
        <div className="pointer-events-none absolute inset-0">
          <div
            ref={halo}
            className="absolute left-0 top-0 rounded-full border border-dashed border-line-strong/70 opacity-0"
            style={{ width: PICK_RADIUS * 2, height: PICK_RADIUS * 2 }}
          />
          <div ref={probe} className="absolute left-0 top-0 opacity-0">
            <div className="absolute left-1/2 top-1/2 h-px w-5 -translate-x-1/2 -translate-y-1/2 bg-accent" />
            <div className="absolute left-1/2 top-1/2 h-5 w-px -translate-x-1/2 -translate-y-1/2 bg-accent" />
            <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent" />
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute bottom-3 left-3 font-mono text-[10px] uppercase tracking-[0.08em] text-faint">
        <span>pick r {PICK_RADIUS}px</span>
        <span className="mx-2 text-line-strong">/</span>
        <span className={hover >= 0 ? 'text-fg' : undefined}>
          {hover >= 0 ? `hit ${String(hover).padStart(2, '0')}` : 'no hit'}
        </span>
        <span className="mx-2 text-line-strong">/</span>
        <span className={picked >= 0 ? 'text-accent' : undefined}>
          {picked >= 0 ? `picked ${String(picked).padStart(2, '0')}` : 'nothing picked'}
        </span>
      </div>
    </div>
  );
}
