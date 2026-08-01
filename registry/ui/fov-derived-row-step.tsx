'use client';

import {
  Children,
  isValidElement,
  useEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/cn';
import { useInView } from '@/registry/hooks/use-in-view';
import { useRaf } from '@/registry/hooks/use-raf';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';
import { useResizeObserver } from '@/registry/hooks/use-resize-observer';
import { damp } from '@/registry/lib/damp';

/* ==========================================================================
   FOV-Derived Row Step
   --------------------------------------------------------------------------
   How far apart do n items go so the row exactly spans the frame?

   Not "container width / n". That answer is wrong the moment the row has any
   depth, and it is the reason hand-tuned galleries need a different magic
   number per breakpoint. The correct spacing comes out of the camera, and the
   camera is two numbers: a field of view and a distance.

   A pinhole camera at distance d from a plane sees, on that plane:

       visibleHeight = 2 · d · tan(fov / 2)
       visibleWidth  = visibleHeight · aspect

   Divide the width across the gaps between item centres and you have the
   step:

       step     = visibleWidth · spanRatio / (n − 1)
       rowWidth = (n − 1) · step
       x_i      = i · step − rowWidth / 2

   The subtraction is what centres the row on the origin without a second
   measurement — the outermost centres land at ±rowWidth/2 by construction.

   This is exactly the derivation a three.js drum uses for its flat pre-intro
   row, and it holds identically in the DOM because CSS `perspective` is the
   same pinhole projection. The bridge is one line: the perspective distance
   in pixels that reproduces a given vertical FOV over a box of height H is

       P = H / (2 · tan(fov / 2))

   which is why nothing here needs to know the pixel size of anything until
   the very last multiplication.
   ========================================================================== */

export interface FovDerivedRowProps {
  /** One cell per child, laid out on the derived step. */
  children: ReactNode;
  /** Vertical field of view in degrees. The row's spacing follows it. */
  fov?: number;
  /** Camera distance to the row plane, in world units. Sets the unit scale. */
  cameraZ?: number;
  /** Fraction of the visible width the row spans. 1 = edge to edge. */
  spanRatio?: number;
  /**
   * World units the outermost items are pushed away from the camera, on a
   * parabola. Their x is compensated so the row still spans exactly.
   */
  bow?: number;
  /** Fraction of the gap remaining after one second while the row re-spreads. */
  smoothing?: number;
  className?: string;
  /** Applied to every positioned cell — size the items here. */
  cellClassName?: string;
}

const FOV = 70;
const CAMERA_Z = 5;
const SPAN_RATIO = 1;
const BOW = 0.6;
const SMOOTHING = 0.0015;
const EPSILON = 0.0005;

// #region critical
export function FovDerivedRow({
  children,
  fov = FOV,
  cameraZ = CAMERA_Z,
  spanRatio = SPAN_RATIO,
  bow = BOW,
  smoothing = SMOOTHING,
  className,
  cellClassName,
}: FovDerivedRowProps) {
  const stage = useRef<HTMLDivElement>(null);
  const cells = useRef<Array<HTMLDivElement | null>>([]);

  const size = useResizeObserver(stage);
  const { inView } = useInView(stage, { threshold: 0 });
  const reduced = useReducedMotion();

  const items = Children.toArray(children);
  const count = items.length;

  /* The three scalars the layout is a pure function of. They are damped rather
     than assigned so that changing the FOV reads as a dolly, not as a jump —
     and because the layout is a pure function of them, interrupting mid-spread
     cannot desynchronise anything. */
  const live = useRef({ fov, cameraZ, spanRatio, bow });
  const current = useRef({ fov, cameraZ, spanRatio, bow });
  const settled = useRef(false);
  live.current = { fov, cameraZ, spanRatio, bow };

  /**
   * Lay the row out for one set of camera scalars. Pure: same inputs, same
   * transforms, no accumulated state.
   */
  const apply = (params: { fov: number; cameraZ: number; spanRatio: number; bow: number }) => {
    const el = stage.current;
    if (!el || count === 0) return;

    const widthPx = el.clientWidth;
    const heightPx = el.clientHeight;
    if (widthPx < 1 || heightPx < 1) return;

    // Half-angle first: every formula below wants tan(fov/2), never tan(fov).
    const tanHalfFov = Math.tan((params.fov * Math.PI) / 360);
    const visibleHeight = 2 * params.cameraZ * tanHalfFov;
    const visibleWidth = visibleHeight * (widthPx / heightPx);

    // World units to CSS pixels. The whole layout is computed in world units
    // and converted exactly once, here.
    const pxPerUnit = heightPx / visibleHeight;
    // P = H / (2 tan(fov/2)). Independent of cameraZ, which is the sanity
    // check that the world-unit scale and the projection agree.
    const perspectivePx = params.cameraZ * pxPerUnit;

    // n − 1, not n: the step is the distance between adjacent CENTRES, and a
    // row of n centres has n − 1 gaps. Dividing by n leaves the row short by
    // one step and the last item never reaches the frame edge.
    const gaps = Math.max(count - 1, 1);
    const step = count > 1 ? (visibleWidth * params.spanRatio) / gaps : 0;
    const rowWidth = (count - 1) * step;
    const halfSpan = Math.max(visibleWidth / 2, 1e-6);

    el.style.perspective = `${perspectivePx}px`;

    for (let i = 0; i < count; i += 1) {
      const cell = cells.current[i];
      if (!cell) continue;

      const flatX = i * step - rowWidth / 2;

      // Parabolic bow: 0 at the centre, `bow` units back at the frame edge.
      const t = flatX / halfSpan;
      const worldZ = -params.bow * t * t;

      // Depth compensation. Moving a point from z = 0 to z shrinks its
      // projected x by cameraZ / (cameraZ − z), so scaling the unprojected x
      // by the inverse leaves the projection exactly where the flat row put
      // it. Without this line, any bow pulls the outer items inward and the
      // row stops spanning the frame — the bug that gets "fixed" by nudging
      // spanRatio past 1 until it looks right at one screen size.
      const depthScale = (params.cameraZ - worldZ) / params.cameraZ;
      const worldX = flatX * depthScale;

      cell.style.transform =
        `translate(-50%, -50%) translate3d(${worldX * pxPerUnit}px, 0px, ${worldZ * pxPerUnit}px)`;
    }
  };

  // Resize is not an animation: re-derive and write immediately, or the row
  // lags a visible beat behind a window drag.
  useEffect(() => {
    apply(current.current);
    // `apply` closes over refs only; re-running on every render would fight
    // the frame loop for the same transforms.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.width, size.height, count]);

  useEffect(() => {
    if (!reduced) return;
    // Reduced motion is the resolved layout, not a fast spread: adopt the
    // target scalars outright and lay out once.
    current.current = { ...live.current };
    settled.current = false;
    apply(current.current);
  }, [reduced, fov, cameraZ, spanRatio, bow]);

  useRaf(
    (dt) => {
      const target = live.current;
      const now = current.current;

      const next = {
        fov: damp(now.fov, target.fov, smoothing, dt),
        cameraZ: damp(now.cameraZ, target.cameraZ, smoothing, dt),
        spanRatio: damp(now.spanRatio, target.spanRatio, smoothing, dt),
        bow: damp(now.bow, target.bow, smoothing, dt),
      };

      // Exponential damping never actually arrives, so it would rewrite n
      // transforms forever. Snap inside epsilon, lay out one last time, and
      // then skip the writes entirely until a prop moves again.
      const gap =
        Math.abs(next.fov - target.fov) +
        Math.abs(next.cameraZ - target.cameraZ) +
        Math.abs(next.spanRatio - target.spanRatio) +
        Math.abs(next.bow - target.bow);

      if (gap < EPSILON) {
        if (settled.current) return;
        current.current = { ...target };
        settled.current = true;
        apply(current.current);
        return;
      }

      settled.current = false;
      current.current = next;
      apply(next);
    },
    inView && !reduced,
  );
  // #endregion critical

  const cellStyle: CSSProperties = {
    // Written by the frame loop from the first effect onward. The initial
    // value keeps the cells stacked at the centre rather than at the top-left
    // corner for the one frame before that runs.
    transform: 'translate(-50%, -50%)',
  };

  return (
    <div
      ref={stage}
      className={cn('relative h-full w-full overflow-hidden', className)}
      style={{ transformStyle: 'preserve-3d', perspectiveOrigin: '50% 50%' }}
    >
      {items.map((child, i) => (
        <div
          key={isValidElement(child) && child.key !== null ? child.key : i}
          ref={(node) => {
            cells.current[i] = node;
          }}
          style={cellStyle}
          className={cn('absolute left-1/2 top-1/2 will-change-transform', cellClassName)}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
