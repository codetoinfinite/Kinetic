/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Image Generating Loader" (boardui.com/templates/ai-image-generation).
 * No BoardUI source was used.
 */
"use client";

import { memo, useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { RiCheckLine } from "@remixicon/react";

import { useReducedMotion } from "@/registry/hooks/use-reduced-motion";
import { cx } from "@/registry/lib/cx";

/**
 * Image Generating Loader: the placeholder tile an image model leaves in a
 * chat thread while it works.
 *
 * A halftone ring of dots ripples outward from the centre, a pill in the
 * middle counts the percentage and names the current stage, and the footer
 * counts the seconds down. Past 40% the finished picture starts to come
 * through: first as a halftone of dots that swell until they merge, plus a
 * feathered disc that grows out from the centre, so the image "develops"
 * rather than fading in.
 */

/** Dots per side of the ripple field. */
const GRID = 17;
/** Distance between dot centres, in viewBox units. */
const PITCH = 10;
/** Dot radius at rest, in viewBox units. */
const DOT_R = 1.7;
/** Ring peak, as a fraction of the field's half-width. */
const RING_RADIUS = 0.7;
/** Gaussian spread of the ring around its peak. */
const RING_SPREAD = 0.22;
/** One ripple cycle, in seconds. */
const RIPPLE_PERIOD = 1.8;
/** How much later the edge peaks than the centre, in seconds. */
const RIPPLE_LAG = 1.1;
/** Progress (%) at which the result starts to show through. */
const REVEAL_START = 40;
/** Halftone cell of the reveal mask, in CSS px. */
const MASK_CELL = 6;
/** Width of the soft edge on the growing disc, in % of the half-width. */
const FEATHER = 22;

const DEFAULT_STAGES = ["Composing", "Sketching", "Painting", "Refining"] as const;

type Dot = { x: number; y: number; alpha: number; delay: number };

const round3 = (value: number) => Math.round(value * 1000) / 1000;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/* Built once at module load from fixed constants, so server and client
   markup agree and there is nothing random in render. */
const DOTS: Dot[] = (() => {
  const dots: Dot[] = [];
  const half = (GRID - 1) / 2;
  for (let row = 0; row < GRID; row += 1) {
    for (let col = 0; col < GRID; col += 1) {
      const dx = (col - half) / half;
      const dy = (row - half) / half;
      const distance = Math.hypot(dx, dy);
      if (distance > 1.04) continue;
      const k = (distance - RING_RADIUS) / RING_SPREAD;
      const ring = Math.exp(-k * k);
      // The middle stays empty; outside the ring a faint halo of dots remains.
      const alpha = distance < RING_RADIUS ? ring : Math.max(ring, 0.18);
      if (alpha < 0.08) continue;
      dots.push({
        x: col * PITCH + PITCH / 2,
        y: row * PITCH + PITCH / 2,
        alpha: round3(alpha),
        delay: round3(distance * RIPPLE_LAG - RIPPLE_PERIOD),
      });
    }
  }
  return dots;
})();

/* One rule set per document: React 19 hoists `<style href precedence>` into
   <head> and de-duplicates it by href. Variables inside keyframes resolve per
   element, so every dot pulses up to its own ring alpha. */
const RIPPLE_CSS = `
@keyframes kx-igl-ripple {
  0%, 100% { opacity: calc(var(--kx-igl-a) * 0.2); transform: scale(0.5); }
  32% { opacity: var(--kx-igl-a); transform: scale(1.2); }
}`;

const DotField = memo(function DotField({ animated, paused }: { animated: boolean; paused: boolean }) {
  return (
    <svg viewBox={`0 0 ${GRID * PITCH} ${GRID * PITCH}`} className="size-full text-text-primary" aria-hidden>
      {DOTS.map((dot) => (
        <circle
          key={`${dot.x}-${dot.y}`}
          cx={dot.x}
          cy={dot.y}
          r={DOT_R}
          fill="currentColor"
          style={
            {
              "--kx-igl-a": dot.alpha * 0.8,
              transformBox: "fill-box",
              transformOrigin: "center",
              opacity: animated ? undefined : round3(dot.alpha * 0.7),
              // Longhands only: mixing the `animation` shorthand with
              // `animationPlayState` makes React warn on every re-render.
              animationName: animated ? "kx-igl-ripple" : undefined,
              animationDuration: animated ? `${RIPPLE_PERIOD}s` : undefined,
              animationTimingFunction: animated ? "ease-in-out" : undefined,
              animationDelay: animated ? `${dot.delay}s` : undefined,
              animationIterationCount: animated ? "infinite" : undefined,
              animationPlayState: animated && paused ? "paused" : undefined,
            } as CSSProperties
          }
        />
      ))}
    </svg>
  );
});

export interface ImageGeneratingLoaderProps {
  /** Controlled progress, 0-100. Leave undefined to run on an internal timer of `duration`. */
  progress?: number;
  /** Length of the internal run in ms (uncontrolled only). */
  duration?: number;
  /** Freezes the internal timer and the ripple. */
  paused?: boolean;
  /** Seconds left, shown in the footer. Derived from `duration` when uncontrolled. */
  remainingSeconds?: number;
  /** The finished image (inline SVG, an <img>, a gradient). Revealed from 40% on. */
  result?: ReactNode;
  /** Footer label while working; also the progress bar's accessible name. */
  label?: string;
  /** Footer label once progress reaches 100. */
  doneLabel?: string;
  /** Stage names shown under the percentage, spread evenly across the run. */
  stages?: readonly string[];
  /** Fires once when progress reaches 100. */
  onComplete?: () => void;
  className?: string;
}

// #region critical
export function ImageGeneratingLoader({
  progress: progressProp,
  duration = 6000,
  paused = false,
  remainingSeconds,
  result,
  label = "Generating image",
  doneLabel = "Image ready",
  stages = DEFAULT_STAGES,
  onComplete,
  className,
}: ImageGeneratingLoaderProps) {
  const reduced = useReducedMotion();
  const controlled = progressProp !== undefined;
  const [autoProgress, setAutoProgress] = useState(0);
  const elapsed = useRef(0);

  // Uncontrolled run: accumulate elapsed time frame by frame, so pausing and
  // resuming continues from where it stopped instead of jumping ahead.
  useEffect(() => {
    if (controlled || paused) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      elapsed.current = Math.min(duration, elapsed.current + (now - last));
      last = now;
      setAutoProgress(Math.round((elapsed.current / duration) * 1000) / 10);
      if (elapsed.current < duration) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [controlled, paused, duration]);

  const progress = clamp(controlled ? progressProp : autoProgress, 0, 100);
  const done = progress >= 100;
  const percent = Math.floor(progress);

  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  });
  useEffect(() => {
    if (done) onCompleteRef.current?.();
  }, [done]);

  const stage = stages.length
    ? stages[Math.min(stages.length - 1, Math.floor((progress / 100) * stages.length))]
    : undefined;
  const secondsLeft =
    remainingSeconds ?? (controlled ? undefined : Math.ceil((((100 - progress) / 100) * duration) / 1000));

  // Halftone + feathered-disc reveal. `t` runs 0→1 from REVEAL_START to 100%.
  const t = clamp((progress - REVEAL_START) / (100 - REVEAL_START), 0, 1);
  const dotRadius = round3(t * MASK_CELL * 0.75);
  const core = round3(t * t * 100);
  const revealStyle: CSSProperties | undefined =
    done || reduced
      ? undefined
      : {
          maskImage: `radial-gradient(circle, black ${dotRadius}px, transparent ${round3(dotRadius + 0.75)}px), radial-gradient(circle closest-side, black ${core}%, transparent ${round3(core + FEATHER)}%)`,
          maskSize: `${MASK_CELL}px ${MASK_CELL}px, 100% 100%`,
          maskRepeat: "repeat, no-repeat",
          maskPosition: "center, center",
        };
  // Reduced motion: no developing halftone, the image simply appears at 100%.
  const resultVisible = done || (!reduced && t > 0);

  return (
    <div
      className={cx(
        "flex w-[200px] flex-col gap-2 rounded-2xl bg-background-primary-default p-3 shadow-2xs",
        className,
      )}
    >
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={done ? doneLabel : `${percent}%${stage ? `, ${stage}` : ""}`}
        className="relative aspect-square w-full overflow-hidden rounded-xl"
      >
        <style href="kinetic-image-generating-loader" precedence="medium">
          {RIPPLE_CSS}
        </style>
        <div
          className={cx(
            "absolute inset-0 transition-opacity duration-500 ease-out motion-reduce:transition-none",
            done && result ? "opacity-0" : "opacity-100",
          )}
        >
          <DotField animated={!reduced && !done} paused={paused} />
        </div>

        {result ? (
          <div
            aria-hidden={!done}
            className={cx("absolute inset-0 [&>*]:size-full", resultVisible ? "opacity-100" : "opacity-0")}
            style={revealStyle}
          >
            {result}
          </div>
        ) : null}

        {!done ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
            <div className="flex flex-col items-center rounded-lg bg-background-primary-default/80 px-2 py-1 backdrop-blur-sm">
              <span className="text-body-medium text-text-primary tabular-nums">{percent}%</span>
              {stage ? <span className="text-caption-2-medium text-text-tertiary">{stage}</span> : null}
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-2 px-1 pb-0.5">
        <span
          className={cx(
            "truncate text-body-regular",
            done ? "text-text-primary" : paused ? "text-text-secondary" : "agent-progress-loading-text",
          )}
        >
          {done ? doneLabel : label}
        </span>
        {done ? (
          <RiCheckLine className="size-4 shrink-0 text-status-lime-text" aria-hidden />
        ) : secondsLeft !== undefined ? (
          <span className="flex shrink-0 items-center gap-0.5 text-body-regular text-text-tertiary tabular-nums">
            <span
              key={secondsLeft}
              className="animate-number-fade rounded bg-background-tertiary-default px-1 text-text-secondary dark:bg-background-quaternary-default motion-reduce:animate-none"
              aria-hidden
            >
              {secondsLeft}
            </span>
            <span aria-hidden>s</span>
            <span className="sr-only">
              {secondsLeft} {secondsLeft === 1 ? "second" : "seconds"} remaining
            </span>
          </span>
        ) : null}
      </div>
      <span className="sr-only" aria-live="polite">
        {done ? doneLabel : ""}
      </span>
    </div>
  );
}
// #endregion
