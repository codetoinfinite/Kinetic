'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { damp, perFrameToSmoothing } from '@/registry/lib/damp';
import { useRaf } from '@/registry/hooks/use-raf';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';
import { useVisibility } from '@/registry/hooks/use-visibility';

/* ==========================================================================
   Self-Parking RAF
   --------------------------------------------------------------------------
   An eased value never arrives. `current += (target - current) * 0.12` closes
   88% of the remaining gap every frame and therefore closes it 100% never:
   the distance shrinks toward zero asymptotically and `current !== target`
   stays true forever. A loop conditioned on that comparison runs for the life
   of the page, burning a frame callback and a paint to move something by a
   ten-thousandth of a pixel.

   The fix is one line — an epsilon snap. Below a threshold, assign the target
   exactly. Now the equality test can succeed, so the loop reaches its own
   stopping condition and unsubscribes itself. Nothing outside has to know
   when the motion ended; the motion knows.

   This is the opposite of the usual always-on rAF. The loop exists only while
   something is actually moving, which for a scrubber, a hover offset, or a
   settling counter is a small fraction of the time the page is open.
   ========================================================================== */

export interface SelfParkingOptions {
  /**
   * Fraction of the gap that REMAINS after one second. Smaller is snappier.
   * Defaults to the frame-rate-independent equivalent of `* 0.12` per frame
   * at 60fps.
   */
  smoothing?: number;
  /**
   * Distance below which `current` is assigned `target` outright. Must be
   * scaled to the unit of the value — see the note on `epsilon` below.
   */
  epsilon?: number;
  /**
   * Called with the damped value every frame while running, and once more
   * when it parks. Write to the DOM here; do not call `setState`.
   */
  onFrame: (value: number) => void;
}

export interface SelfParkingValue {
  /** True while the loop is alive. Goes false the frame it parks. */
  running: boolean;
  /** The live damped value, for reading inside another loop. */
  value: RefObject<number>;
  /** Assign `target` immediately and park, skipping the remaining travel. */
  park: () => void;
}

// #region critical
/**
 * `0.12` of the gap per frame, measured at 60fps, expressed as the retention
 * factor `damp` wants. Using the raw 0.12 with a per-frame multiply would run
 * twice as fast on a 120 Hz display; this converges in the same wall-clock
 * time on any refresh rate.
 */
const SMOOTHING = perFrameToSmoothing(0.12);
/** The snap threshold. This single line is what allows the loop to end. */
const EPSILON = 0.0002;

/**
 * A damped value that runs a frame loop only while it is moving.
 *
 * `target` is a plain prop: changing it wakes the loop, and the loop parks
 * itself once it arrives. There is no `start`, and there is no
 * `requestAnimationFrame` running when the value is at rest.
 */
export function useSelfParkingRaf(
  target: number,
  options: SelfParkingOptions,
): SelfParkingValue {
  const { smoothing = SMOOTHING, epsilon = EPSILON } = options;
  const reduced = useReducedMotion();
  const visible = useVisibility();

  const value = useRef(target);
  const [running, setRunning] = useState(false);

  const config = useRef({ smoothing, epsilon, target, options });
  config.current = { smoothing, epsilon, target, options };

  const park = useCallback(() => {
    const cfg = config.current;
    value.current = cfg.target;
    cfg.options.onFrame(value.current);
    setRunning(false);
  }, []);

  // Waking the loop is the only thing a target change does. The guard matters:
  // without it, any unrelated re-render that happens to pass the same target
  // restarts a loop that had already parked.
  useEffect(() => {
    if (value.current === target) return;
    // Nothing to interpolate: reduced motion wants the end state, and a hidden
    // tab has no observer, so both arrive in one write instead of a loop.
    if (reduced || !visible) {
      park();
      return;
    }
    setRunning(true);
  }, [target, reduced, visible, park]);

  useRaf((dt) => {
    const cfg = config.current;
    let next = damp(value.current, cfg.target, cfg.smoothing, dt);

    // The whole technique. Asymptotic approach means `next` would otherwise
    // never equal `cfg.target`, so the exit test below could never pass.
    if (Math.abs(cfg.target - next) < cfg.epsilon) next = cfg.target;

    value.current = next;
    cfg.options.onFrame(next);

    // Parking flips `running`, which drops the `useRaf` subscription. When the
    // last subscriber goes, the shared loop cancels its frame entirely.
    if (next === cfg.target) setRunning(false);
  }, running);
  // #endregion critical

  return { running, value, park };
}
