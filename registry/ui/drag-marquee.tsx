'use client';

import gsap from 'gsap';
import {
  Children,
  isValidElement,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/cn';
import { useGsap } from '@/registry/hooks/use-gsap';
import { useInView } from '@/registry/hooks/use-in-view';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';
import { useResizeObserver } from '@/registry/hooks/use-resize-observer';
import { clamp } from '@/registry/lib/damp';
import { createRng } from '@/registry/lib/prng';
import { mod } from '@/registry/lib/wrap';

/* ==========================================================================
   Drag Marquee
   --------------------------------------------------------------------------
   A row that drifts forever, that you can grab and throw, and that scatters
   its cards while your hand is down.

   Three ideas hold it together.

   1. **One unwrapped number.** Everything — the idle drift, the drag, the
      throw — adds to a single accumulator that is never corrected. It walks
      off to -50000 and nobody cares. The wrap happens once, in the tween's
      `modifiers`, as `mod(x, period) - period`. Because a true modulo is
      total, a delta of 4.3 periods in one frame lands in exactly the right
      place; the usual `if (x < -period) x += period` correction only ever
      undoes one period, so a fast flick or a tab that was backgrounded for a
      second lands the row on the wrong tile and the seam tears.

   2. **The wrap is invisible on the near side.** For `x` already inside
      `[-period, 0)`, `mod(x, period) - period === x`, so the modifier is the
      identity in the range the row normally lives in and only bites when the
      accumulator leaves it. Nothing snaps at the boundary because the two
      sides of the boundary paint the same pixels.

   3. **Enough copies that the seam is never on screen.** `period` is the
      measured width of one copy of the children, gap included, and the row
      holds `ceil(hostWidth / period) + 1` copies. With `x` bounded to one
      period, the visible window can never run past the last copy.

   The throw needs no plugin: `power3.out` is `p(t) = 1 - (1 - t)^3`, so
   `p'(0) = 3`, and a tween of duration `D` that covers `Δ` leaves at `3Δ/D`
   px/s. Retargeting the follow tween to `x + v·D/3` on release therefore
   continues the gesture at the exact speed the hand left it.
   ========================================================================== */

export interface DragMarqueeProps {
  /** One tile per child. The set is duplicated as many times as it takes. */
  children: ReactNode;
  /** Idle drift in px/s. Positive drifts left; 0 parks the row. */
  speed?: number;
  /** Pixels between tiles. Applied inside a copy so it also spans the seam. */
  gap?: number;
  /** Seconds the row takes to catch up with the pointer. Also the throw time. */
  smoothing?: number;
  /** Scatter distance on press, as a percentage of each tile's own size. */
  scatter?: number;
  /** Half-range of the per-tile rotation on press, in degrees. */
  spin?: number;
  /** Tile scale while the pointer is down. */
  pressScale?: number;
  /** Seconds of the scatter in and back out. */
  scatterDuration?: number;
  /** Seeds the scatter. Same seed, same arrangement, on server and client. */
  seed?: number | string;
  className?: string;
  /** Applied to every tile — size the items here. */
  tileClassName?: string;
  'aria-label'?: string;
}

const SPEED = 60;
const GAP = 24;
const SMOOTHING = 0.5;
const SCATTER = 6;
const SPIN = 10;
const PRESS_SCALE = 0.95;
const SCATTER_DURATION = 0.5;

/** Initial slope of `power3.out`. `d/dt [1 - (1 - t)^3]` at t = 0. */
const POWER3_OUT_SLOPE = 3;
/** Pixels of travel before a press counts as a drag rather than a tap. */
const DRAG_THRESHOLD = 5;
/** Seconds of gesture history the release velocity is measured over. */
const VELOCITY_WINDOW = 0.07;
/** px/s. Above this a fling is a mis-measurement, not a throw. */
const MAX_VELOCITY = 4000;
/** Hard cap on how far one throw may carry, in pixels. */
const MAX_THROW = 1200;
/**
 * Two copies is the minimum that can hide a seam; eight is a guard against a
 * one-word tile in a wide hero producing hundreds of nodes.
 */
const MIN_COPIES = 2;
const MAX_COPIES = 8;

export function DragMarquee({
  children,
  speed = SPEED,
  gap = GAP,
  smoothing = SMOOTHING,
  scatter = SCATTER,
  spin = SPIN,
  pressScale = PRESS_SCALE,
  scatterDuration = SCATTER_DURATION,
  seed = 'drag-marquee',
  className,
  tileClassName,
  'aria-label': ariaLabel = 'Marquee',
}: DragMarqueeProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);

  /** The unwrapped accumulator. Drift, drag and throw all add to this. */
  const rawRef = useRef(0);
  /** What the tween actually animates. Its `x` is already wrapped. */
  const proxyRef = useRef({ x: 0 });
  /** Measured width of one copy, gap included. Read live inside the modifier. */
  const periodRef = useRef(0);
  const xToRef = useRef<ReturnType<typeof gsap.quickTo> | null>(null);
  const scatterRef = useRef<gsap.core.Timeline | null>(null);
  const pressedRef = useRef(false);

  const [copies, setCopies] = useState(MIN_COPIES);

  const reduced = useReducedMotion();
  const hostSize = useResizeObserver(hostRef);
  const copySize = useResizeObserver(copyRef);
  const { inView } = useInView(hostRef);

  const tiles = Children.toArray(children);
  const perCopy = tiles.length;

  // #region critical
  /** The only place the track's transform is written. */
  const paint = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    track.style.transform = `translate3d(${proxyRef.current.x.toFixed(2)}px, 0px, 0px)`;
  }, []);

  /**
   * Move the accumulator to `value`. With motion allowed this retargets the
   * follow tween — `quickTo` reuses one tween and one `PropTween` rather than
   * allocating a tween per frame — and the wrap happens in its modifier. With
   * reduced motion there is no tween, so the wrap is applied here instead.
   */
  const push = useCallback(
    (value: number) => {
      rawRef.current = value;
      const xTo = xToRef.current;
      if (xTo) {
        xTo(value);
        return;
      }
      const period = periodRef.current;
      proxyRef.current.x = period < 1 ? 0 : mod(value, period) - period;
      paint();
    },
    [paint],
  );

  /**
   * One follow tween for the life of the component. The wrap lives in
   * `modifiers`, which post-processes the value on its way to the target and
   * never feeds back: `resetTo` advances the tween's start from its own
   * `s + ratio * c`, not by re-reading `proxy.x`. Put the wrap anywhere else
   * — in `onUpdate`, say — and the next retarget interpolates from a value the
   * tween does not believe in, and the row lurches a full period.
   */
  useEffect(() => {
    const proxy = proxyRef.current;
    if (reduced) {
      xToRef.current = null;
      return;
    }

    const xTo = gsap.quickTo(proxy, 'x', {
      duration: smoothing,
      ease: 'power3',
      modifiers: {
        // Reads the ref, so a resize changes the period without rebuilding
        // the tween — rebuilding mid-throw would restart the ease from rest.
        x: (value: number) => {
          const period = periodRef.current;
          return period < 1 ? 0 : mod(value, period) - period;
        },
      },
      onUpdate: paint,
    });
    xToRef.current = xTo;

    return () => {
      xToRef.current = null;
      gsap.killTweensOf(proxy);
    };
  }, [reduced, smoothing, paint]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let pointerId: number | null = null;
    let lastX = 0;
    let pressX = 0;
    let pressY = 0;
    let moved = false;
    let swallowClick = false;
    /** Rolling window: the accumulator and clock at the start of the window. */
    let sampleRaw = 0;
    let sampleTime = 0;

    const now = () => performance.now() / 1000;

    const onPointerDown = (e: PointerEvent) => {
      // One pointer owns the row. A second finger arriving mid-throw would
      // otherwise reset the origin and the row would jump.
      if (pointerId !== null || !e.isPrimary) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;

      pointerId = e.pointerId;
      lastX = e.clientX;
      pressX = e.clientX;
      pressY = e.clientY;
      moved = false;
      sampleRaw = rawRef.current;
      sampleTime = now();
      pressedRef.current = true;

      // Capture on press, not once the threshold is crossed: by then the
      // pointer may already have left the element and `pointermove` would have
      // stopped arriving.
      host.setPointerCapture(e.pointerId);
      // Scatter on press, like a physical stack of cards being pinned — the
      // press, not the drag, is what the eye reads as "I have hold of this".
      scatterRef.current?.play();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (pointerId !== e.pointerId) return;

      const dx = e.clientX - lastX;
      lastX = e.clientX;

      if (!moved) {
        if (Math.hypot(e.clientX - pressX, e.clientY - pressY) < DRAG_THRESHOLD) return;
        moved = true;
      }

      push(rawRef.current + dx);

      // Retire the velocity window once it is full. Measuring over a window
      // rather than off the last delta is what stops "drag, pause, lift" from
      // throwing the row: with no movement there are no events, the window
      // never advances, and the measured speed decays toward zero on its own.
      const t = now();
      if (t - sampleTime > VELOCITY_WINDOW) {
        sampleRaw = rawRef.current;
        sampleTime = t;
      }
    };

    /**
     * Idempotent. Called from `pointerup`, `pointercancel` and
     * `lostpointercapture`, all three of which can be the last event a gesture
     * produces, and at least one of which always arrives — including when the
     * pointer is released outside the window or the OS takes it away for a
     * gesture of its own. Guarding on `pointerId` makes the extra calls no-ops
     * instead of a double throw, and it is what stops a drag that ended
     * off-screen from leaving the row stuck mid-throw with the cards still
     * scattered.
     */
    const finish = (e: PointerEvent) => {
      if (pointerId !== e.pointerId) return;
      const id = pointerId;
      pointerId = null;
      pressedRef.current = false;

      const elapsed = now() - sampleTime;
      const velocity =
        moved && elapsed > 0
          ? clamp((rawRef.current - sampleRaw) / elapsed, -MAX_VELOCITY, MAX_VELOCITY)
          : 0;

      swallowClick = moved;
      moved = false;

      if (host.hasPointerCapture(id)) host.releasePointerCapture(id);
      scatterRef.current?.reverse();

      if (velocity !== 0) {
        // v·D/3 is the distance a `power3.out` of duration D covers when it
        // departs at v. Retargeting by exactly that hands the row over from
        // the finger without a change of speed.
        push(
          rawRef.current +
            clamp((velocity * smoothing) / POWER3_OUT_SLOPE, -MAX_THROW, MAX_THROW),
        );
      }
    };

    // Capture phase, ahead of any child's own handler. A drag ends with a
    // `click` on whatever happens to be under the pointer, so without this the
    // gesture that scrolls the row also activates a card.
    const onClick = (e: MouseEvent) => {
      if (!swallowClick) return;
      swallowClick = false;
      e.preventDefault();
      e.stopPropagation();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const direction = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (direction === 0) return;
      e.preventDefault();
      const step = perCopy > 0 ? periodRef.current / perCopy : periodRef.current;
      push(rawRef.current + direction * step);
    };

    host.addEventListener('pointerdown', onPointerDown);
    host.addEventListener('pointermove', onPointerMove);
    host.addEventListener('pointerup', finish);
    host.addEventListener('pointercancel', finish);
    host.addEventListener('lostpointercapture', finish);
    host.addEventListener('click', onClick, true);
    host.addEventListener('keydown', onKeyDown);

    return () => {
      host.removeEventListener('pointerdown', onPointerDown);
      host.removeEventListener('pointermove', onPointerMove);
      host.removeEventListener('pointerup', finish);
      host.removeEventListener('pointercancel', finish);
      host.removeEventListener('lostpointercapture', finish);
      host.removeEventListener('click', onClick, true);
      host.removeEventListener('keydown', onKeyDown);
      if (pointerId !== null && host.hasPointerCapture(pointerId)) {
        host.releasePointerCapture(pointerId);
      }
      pointerId = null;
      pressedRef.current = false;
    };
  }, [push, smoothing, perCopy]);
  // #endregion critical

  /**
   * Measure one copy and decide how many there need to be.
   * `getBoundingClientRect`, not `offsetWidth`: the latter rounds to whole
   * pixels, and half a pixel of error in the period is half a pixel of gap
   * that only ever shows up at the seam.
   */
  useEffect(() => {
    const host = hostRef.current;
    const copy = copyRef.current;
    if (!host || !copy) return;

    const width = copy.getBoundingClientRect().width;
    if (width < 1) return;
    periodRef.current = width;

    setCopies(clamp(Math.ceil(host.clientWidth / width) + 1, MIN_COPIES, MAX_COPIES));
  }, [hostSize.width, copySize.width, perCopy, gap]);

  /**
   * Idle drift. `gsap.ticker` rather than a second rAF loop so the drift and
   * the follow tween are updated in the same tick — on separate loops the row
   * is one frame stale every other frame, which reads as a shimmer.
   */
  useEffect(() => {
    // Off-screen rows do not need to be redrawn 60 times a second. Where
    // there is no IntersectionObserver at all the gate opens rather than
    // closes — a missing API should cost battery, not the animation.
    const gated = typeof IntersectionObserver !== 'undefined' && !inView;
    if (reduced || speed === 0 || gated) return;

    const tick = (_time: number, deltaTime: number) => {
      // The drift stops while the pointer is down. Left running, the row
      // creeps out from under the finger, which is exactly the thing the
      // one-to-one tracking is there to avoid.
      if (pressedRef.current) return;
      push(rawRef.current - (deltaTime / 1000) * speed);
    };

    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
    };
  }, [reduced, speed, inView, push]);

  /**
   * The scatter. One paused timeline, played forwards on press and reversed on
   * release — never rebuilt per press. A press/release flag in the deps would
   * make `revert()` strip the inline transforms GSAP wrote, so the reverse
   * would start from the stylesheet default and animate nowhere.
   */
  useGsap(
    gsap,
    () => {
      const track = trackRef.current;
      if (!track || reduced || perCopy === 0) return;

      const nodes = Array.from(track.querySelectorAll<HTMLElement>('[data-kx-tile]'));
      if (nodes.length === 0) return;

      // Seeded, and indexed by position *within* a copy, so every copy of a
      // tile scatters identically. Per-node randomness makes the duplicate
      // visible the moment the cards move.
      const rng = createRng(seed);
      const spread = Array.from({ length: perCopy }, () => ({
        rotate: (rng() - 0.5) * 2 * spin,
        x: (rng() - 0.5) * 2 * scatter,
        y: (rng() - 0.5) * 2 * scatter,
      }));

      const at = (i: number) => spread[i % perCopy];

      const tl = gsap.timeline({ paused: true });
      tl.to(nodes, {
        rotate: (i: number) => at(i)?.rotate ?? 0,
        xPercent: (i: number) => at(i)?.x ?? 0,
        yPercent: (i: number) => at(i)?.y ?? 0,
        scale: pressScale,
        duration: scatterDuration,
        // `back.inOut` overshoots at both ends, so the cards spring apart and
        // spring back rather than easing politely in both directions.
        ease: 'back.inOut(3)',
      });
      scatterRef.current = tl;

      return () => {
        scatterRef.current = null;
      };
    },
    hostRef,
    [reduced, copies, perCopy, scatter, spin, pressScale, scatterDuration, seed],
  );

  const copyIndices = Array.from({ length: copies }, (_unused, i) => i);

  return (
    <div
      ref={hostRef}
      role="group"
      aria-label={ariaLabel}
      tabIndex={0}
      className={cn(
        // `touch-action: none`, not `pan-y`: on a phone the browser claims the
        // first 10 px of a horizontal drag for a scroll unless the element
        // says outright that it wants every pointer event.
        'relative h-full w-full touch-none select-none overflow-hidden',
        'cursor-grab active:cursor-grabbing focus-visible:outline-none',
        className,
      )}
    >
      <div
        ref={trackRef}
        className="flex h-full w-max flex-nowrap items-center will-change-transform"
      >
        {copyIndices.map((copyIndex) => (
          <div
            key={copyIndex}
            ref={copyIndex === 0 ? copyRef : undefined}
            // Only the first copy is real content. The rest are wallpaper, and
            // a screen reader that reads the list four times is a bug.
            aria-hidden={copyIndex > 0 || undefined}
            className="flex shrink-0 flex-nowrap items-center"
          >
            {tiles.map((tile, i) => (
              <div
                key={isValidElement(tile) && tile.key !== null ? tile.key : i}
                data-kx-tile=""
                // The gap is a trailing margin inside the copy rather than
                // `gap` on the track: a track-level gap sits *between* copies
                // too, so the measured copy width no longer equals the wrap
                // period and the seam gains one gap of drift per lap.
                style={{ marginRight: `${gap}px` }}
                className={cn('shrink-0', tileClassName)}
              >
                {tile}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
