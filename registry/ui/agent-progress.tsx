/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Agent Progress" (boardui.com/components/agent-progress).
 * No BoardUI source was used.
 */
"use client";

import { useEffect, useId, useRef, useState } from "react";
import { RiAddLine, RiCheckLine, RiSubtractLine } from "@remixicon/react";
import { motion } from "motion/react";
import { cx } from "@/registry/lib/cx";
import { useReducedMotion } from "@/registry/hooks/use-reduced-motion";

export type AgentStepState = "done" | "running" | "pending";

export interface AgentProgressProps {
  /** Ordered step labels. */
  steps: readonly string[];
  /** Index of the running step (controlled). steps.length means every step is done. */
  step?: number;
  /** Starting step when uncontrolled. */
  defaultStep?: number;
  /** Called when a step finishes on its own; also the setter for a controlled step. */
  onStepChange?: (step: number) => void;
  /** Milliseconds each step runs before it checks off. */
  stepDuration?: number;
  /** Milliseconds the completed state holds before onFinished fires. */
  completionDelay?: number;
  onFinished?: () => void;
  minimized?: boolean;
  defaultMinimized?: boolean;
  onMinimizedChange?: (minimized: boolean) => void;
  /** Header copy while running. Default "{n} steps left". */
  remainingLabel?: (remaining: number) => string;
  /** Header copy once every step is done. */
  doneLabel?: string;
  className?: string;
}

/** Ring geometry, in a 16-unit viewBox. */
const RING_R = 6.25;
const RING_C = 2 * Math.PI * RING_R;
/** Under reduced motion the ring moves in quarters instead of every frame. */
const REDUCED_TICKS = 4;
const STAGGER_S = 0.06;

const defaultRemaining = (n: number) => `${n} ${n === 1 ? "step" : "steps"} left`;

// #region critical
/** done / running / pending for row i while step `active` runs. */
export function stepState(index: number, active: number): AgentStepState {
  if (index < active) return "done";
  return index === active ? "running" : "pending";
}

/**
 * Drives one step: measures elapsed time from the moment `step` became active
 * and reports the fraction. A frame loop paints the rings smoothly; under
 * reduced motion a 4-tick interval moves them in quarters. When the fraction
 * reaches 1 the step is handed to `advance`, which re-keys this effect.
 */
function useStepClock(
  step: number,
  total: number,
  duration: number,
  reduced: boolean,
  advance: (next: number) => void,
) {
  const [tick, setTick] = useState({ step: -1, fraction: 0 });
  const advanceRef = useRef(advance);
  useEffect(() => {
    advanceRef.current = advance;
  });

  useEffect(() => {
    if (step < 0 || step >= total) return;
    const started = performance.now();
    const span = Math.max(1, duration);
    let raf = 0;
    let interval: ReturnType<typeof setInterval> | undefined;
    const sample = () => {
      const fraction = Math.min(1, (performance.now() - started) / span);
      setTick({ step, fraction });
      if (fraction >= 1) advanceRef.current(step + 1);
      return fraction >= 1;
    };
    if (reduced) {
      interval = setInterval(() => {
        if (sample() && interval) clearInterval(interval);
      }, span / REDUCED_TICKS);
    } else {
      const loop = () => {
        if (!sample()) raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }
    return () => {
      cancelAnimationFrame(raf);
      if (interval) clearInterval(interval);
    };
  }, [step, total, duration, reduced]);

  return tick.step === step ? tick.fraction : 0;
}
// #endregion

/* ------------------------------------------------------------------ parts */

function Ring({ fraction, className }: { fraction: number; className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={cx("size-4 shrink-0 -rotate-90 text-agent-progress-ring", className)}>
      <circle cx="8" cy="8" r={RING_R} fill="none" stroke="currentColor" strokeOpacity={0.18} strokeWidth="2" />
      <circle
        cx="8"
        cy="8"
        r={RING_R}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={RING_C}
        strokeDashoffset={RING_C * (1 - Math.min(1, Math.max(0.04, fraction)))}
      />
    </svg>
  );
}

function PendingDot() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="size-4 shrink-0 text-foreground-icon-quaternary">
      <circle cx="8" cy="8" r={RING_R} fill="none" stroke="currentColor" strokeWidth="1.25" strokeDasharray="2 2.2" />
    </svg>
  );
}

function DoneDot({ reduced }: { reduced: boolean }) {
  return (
    <motion.span
      aria-hidden
      initial={reduced ? false : { scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 520, damping: 30 }}
      className="grid size-4 shrink-0 place-items-center rounded-full bg-foreground-icon-quaternary text-text-white"
    >
      <RiCheckLine className="size-3" />
    </motion.span>
  );
}

/* ------------------------------------------------------------------ block */

export function AgentProgress({
  steps,
  step,
  defaultStep = 0,
  onStepChange,
  stepDuration = 2400,
  completionDelay = 1000,
  onFinished,
  minimized,
  defaultMinimized = false,
  onMinimizedChange,
  remainingLabel = defaultRemaining,
  doneLabel = "All steps done",
  className,
}: AgentProgressProps) {
  const reduced = useReducedMotion();
  const listId = useId();
  const total = steps.length;

  const [ownStep, setOwnStep] = useState(defaultStep);
  const active = Math.min(total, Math.max(0, step ?? ownStep));
  const [ownMin, setOwnMin] = useState(defaultMinimized);
  const isMin = minimized ?? ownMin;

  const advance = (next: number) => {
    if (step === undefined) setOwnStep(next);
    onStepChange?.(next);
  };
  const fraction = useStepClock(active, total, stepDuration, reduced, advance);
  const finished = active >= total;

  // Hold the completed state, then hand back to the caller.
  const finishedRef = useRef(onFinished);
  useEffect(() => {
    finishedRef.current = onFinished;
  });
  useEffect(() => {
    if (!finished) return;
    const t = setTimeout(() => finishedRef.current?.(), Math.max(0, completionDelay));
    return () => clearTimeout(t);
  }, [finished, completionDelay]);

  const overall = total === 0 ? 1 : (Math.min(active, total) + (finished ? 0 : fraction)) / total;
  const remaining = total - active;
  const current = steps[active];

  const toggleMin = () => {
    const next = !isMin;
    if (minimized === undefined) setOwnMin(next);
    onMinimizedChange?.(next);
  };

  return (
    <section
      aria-label="Agent progress"
      className={cx(
        "w-full max-w-[340px] rounded-2xl border border-border-table bg-background-primary-default p-1.5 shadow-xs",
        className,
      )}
    >
      <header className="flex items-center gap-2 py-1 pe-1 ps-2.5">
        <div
          role="progressbar"
          aria-label="Overall progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(overall * 100)}
          className="grid size-4 shrink-0 place-items-center"
        >
          {finished ? <DoneDot reduced={reduced} /> : <Ring fraction={overall} />}
        </div>
        <p className="min-w-0 flex-1 truncate text-body-medium text-text-secondary">
          {finished ? doneLabel : remainingLabel(remaining)}
        </p>
        <button
          type="button"
          onClick={toggleMin}
          aria-expanded={!isMin}
          aria-controls={listId}
          aria-label={isMin ? "Show steps" : "Minimize steps"}
          className="grid size-5 shrink-0 place-items-center rounded-md bg-background-secondary-default text-foreground-icon-secondary transition-colors duration-150 hover:bg-background-secondary-hover hover:text-foreground-icon-primary motion-reduce:transition-none outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
        >
          {isMin ? <RiAddLine aria-hidden className="size-3.5" /> : <RiSubtractLine aria-hidden className="size-3.5" />}
        </button>
      </header>

      <div
        id={listId}
        inert={isMin}
        className={cx(
          "grid transition-[grid-template-rows,opacity,visibility] duration-300 ease-out motion-reduce:transition-none",
          isMin ? "invisible grid-rows-[0fr] opacity-0" : "visible grid-rows-[1fr] opacity-100",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <ol aria-label="Steps" className="flex flex-col gap-0.5 pt-0.5">
            {steps.map((label, i) => {
              const state = stepState(i, active);
              return (
                <motion.li
                  key={`${i}-${label}`}
                  aria-current={state === "running" ? "step" : undefined}
                  initial={reduced ? false : { opacity: 0, y: 6, filter: "blur(2px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ delay: i * STAGGER_S, duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                  className={cx(
                    "flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-body-regular transition-colors duration-200 motion-reduce:transition-none",
                    state === "running"
                      ? "border-border-button-default bg-background-primary-default"
                      : "border-transparent",
                  )}
                >
                  {state === "done" ? (
                    <DoneDot reduced={reduced} />
                  ) : state === "running" ? (
                    <Ring fraction={fraction} />
                  ) : (
                    <PendingDot />
                  )}
                  <span
                    className={cx(
                      "min-w-0 flex-1 truncate",
                      state === "done" && "text-text-tertiary line-through decoration-text-tertiary",
                      state === "running" && "agent-progress-loading-text",
                      state === "pending" && "text-text-secondary",
                    )}
                  >
                    {label}
                  </span>
                  <span className="sr-only">
                    {state === "done" ? ", done" : state === "running" ? ", in progress" : ", pending"}
                  </span>
                </motion.li>
              );
            })}
          </ol>
        </div>
      </div>

      <p role="status" className="sr-only">
        {finished ? doneLabel : current ? `Step ${active + 1} of ${total}: ${current}` : ""}
      </p>
    </section>
  );
}
