'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { useRaf } from '@/registry/hooks/use-raf';
import { damp } from '@/registry/lib/damp';

/* ==========================================================================
   Pointer position, smoothed, in several coordinate spaces at once.
   --------------------------------------------------------------------------
   Almost every cursor effect wants the same four things and computes them
   slightly differently each time: client pixels, element-local pixels, 0..1
   normalised, and -1..1 NDC for shaders. Producing all four from one damped
   source keeps a cursor dot and the shader it drives exactly in step.

   Exposed via ref for the same reason as scroll velocity: per-frame values
   must not re-render.
   ========================================================================== */

export interface PointerState {
  /** Viewport pixels. */
  clientX: number;
  clientY: number;
  /** Pixels relative to the target element's top-left. */
  x: number;
  y: number;
  /** 0..1 across the element. */
  nx: number;
  ny: number;
  /** -1..1, y up. Feed straight into a shader uniform. */
  ndcX: number;
  ndcY: number;
  /** Whether the pointer has been seen. Nothing should render before. */
  active: boolean;
}

export interface UseSmoothPointerOptions {
  /** Fraction of the gap remaining after one second. Lower = tighter. */
  smoothing?: number;
  /** Listen on this element rather than the window. */
  target?: RefObject<HTMLElement | null>;
  /** Follow touch drags as well as mouse moves. */
  touch?: boolean;
}

function makeInitialState(): PointerState {
  return {
    clientX: 0,
    clientY: 0,
    x: 0,
    y: 0,
    nx: 0.5,
    ny: 0.5,
    ndcX: 0,
    ndcY: 0,
    active: false,
  };
}

export function useSmoothPointer(
  options: UseSmoothPointerOptions = {},
): { current: PointerState } {
  const { smoothing = 0.001, target, touch = true } = options;

  const state = useRef<PointerState>(makeInitialState());
  // `null` means "no real pointer yet", which is distinct from a legitimate
  // pointer at (0, 0) in the top-left corner.
  const targetPos = useRef<{ clientX: number; clientY: number } | null>(null);
  const seeded = useRef(false);

  // Options the listener needs but that must not re-subscribe it on change.
  const touchRef = useRef(touch);
  touchRef.current = touch;

  useEffect(() => {
    const el = target?.current ?? null;
    const node: HTMLElement | Window = el ?? window;

    const onMove = (event: Event) => {
      const e = event as PointerEvent;
      if (!touchRef.current && e.pointerType === 'touch') return;
      targetPos.current = { clientX: e.clientX, clientY: e.clientY };
    };

    node.addEventListener('pointermove', onMove, { passive: true });
    return () => node.removeEventListener('pointermove', onMove);
    // `target` is a ref object; its identity is stable for the component's
    // lifetime, so this subscribes once.
  }, [target]);

  useRaf((dt) => {
    const el = target?.current ?? null;
    const rect = el
      ? el.getBoundingClientRect()
      : {
          left: 0,
          top: 0,
          width: window.innerWidth,
          height: window.innerHeight,
        };

    const pointer = targetPos.current;

    if (pointer === null) {
      // Park at the centre until a real pointer arrives, so the first move
      // eases out from the middle rather than snapping in from (0, 0). Done
      // once — re-centring every frame would fight a slow first movement.
      if (!seeded.current && rect.width > 0 && rect.height > 0) {
        seeded.current = true;
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        state.current = {
          ...state.current,
          clientX: cx,
          clientY: cy,
          x: cx - rect.left,
          y: cy - rect.top,
        };
      }
      return;
    }

    const clientX = damp(state.current.clientX, pointer.clientX, smoothing, dt);
    const clientY = damp(state.current.clientY, pointer.clientY, smoothing, dt);

    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const nx = rect.width > 0 ? x / rect.width : 0.5;
    const ny = rect.height > 0 ? y / rect.height : 0.5;

    state.current = {
      clientX,
      clientY,
      x,
      y,
      nx,
      ny,
      ndcX: nx * 2 - 1,
      ndcY: -(ny * 2 - 1),
      active: true,
    };
  });

  return state;
}
