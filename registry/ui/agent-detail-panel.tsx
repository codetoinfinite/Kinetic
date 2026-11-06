/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Agent Detail Panel" (boardui.com/components/multi-agent-chat).
 * No BoardUI source was used.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  RiCheckLine,
  RiCloseLine,
  RiErrorWarningLine,
  RiPauseFill,
  RiPauseLine,
  RiPlayLine,
  RiQuestionMark,
  RiRestartLine,
  RiStopFill,
  RiStopLine,
} from "@remixicon/react";
import type { RemixiconComponentType } from "@remixicon/react";
import { Button } from "@/registry/ui/button";
import { SpinnerGlyph } from "@/registry/ui/spinner";
import { ProgressTrack } from "@/registry/ui/progress";
import { AgentMonogram } from "@/registry/ui/agent-list-panel";
import { cx } from "@/registry/lib/cx";
import { useReducedMotion } from "@/registry/hooks/use-reduced-motion";

export type AgentRunStatus = "running" | "waiting" | "paused" | "done" | "stopped" | "error";
export type AgentStepState = "done" | "active" | "pending" | "failed";
export type AgentRunAction = "pause" | "resume" | "stop" | "restart";

export interface AgentStep {
  id: string;
  title: string;
  detail?: string;
  /** Pre-formatted time or duration ("0:42", "2m"). */
  time?: string;
  state: AgentStepState;
}

export interface AgentDetailStat {
  label: string;
  value: ReactNode;
}

export interface AgentDetailPanelProps {
  name: string;
  /** Role or label under the name ("Design", "Research"). */
  subtitle?: string;
  /** 40px avatar node; defaults to a seeded monogram. */
  avatar?: ReactNode;
  /** The instruction the agent is working on. */
  task?: ReactNode;
  steps: AgentStep[];
  stats?: AgentDetailStat[];
  status?: AgentRunStatus;
  defaultStatus?: AgentRunStatus;
  onStatusChange?: (status: AgentRunStatus, action: AgentRunAction) => void;
  /** Shows "Run again" once the run is done, stopped or failed. */
  onRestart?: () => void;
  /** Shows a close button in the header. */
  onClose?: () => void;
  /** Ask before stopping. */
  confirmStop?: boolean;
  /** Scroll the body so the active step stays in view as it moves. */
  followActive?: boolean;
  className?: string;
}

type IconType = RemixiconComponentType;

export const AGENT_RUN_STATUS_META: Record<AgentRunStatus, { label: string; pill: string; dot: string }> = {
  running: { label: "Running", pill: "bg-status-lime-background text-status-lime-text", dot: "bg-green-500" },
  waiting: { label: "Needs input", pill: "bg-status-yellow-background text-status-yellow-text", dot: "bg-yellow-500" },
  paused: { label: "Paused", pill: "bg-status-orange-background text-status-orange-text", dot: "bg-orange-500" },
  done: { label: "Done", pill: "bg-status-blue-background text-status-blue-text", dot: "bg-blue-500" },
  stopped: { label: "Stopped", pill: "bg-background-tertiary-default text-text-secondary", dot: "bg-neutral-400" },
  error: { label: "Failed", pill: "bg-status-rose-background text-status-rose-text", dot: "bg-red-500" },
};

const TERMINAL: ReadonlySet<AgentRunStatus> = new Set(["done", "stopped", "error"]);

/** What a step reads as once the run status is folded in. */
type StepLook = "done" | "working" | "waiting" | "paused" | "stopped" | "failed" | "pending" | "skipped";

const STEP_LOOK: Record<StepLook, { label: string; icon?: IconType; chip: string }> = {
  done: { label: "Done", icon: RiCheckLine, chip: "bg-status-lime-background text-status-lime-text" },
  working: { label: "In progress", chip: "" },
  waiting: { label: "Waiting for input", icon: RiQuestionMark, chip: "bg-status-yellow-background text-status-yellow-text" },
  paused: { label: "Paused", icon: RiPauseFill, chip: "bg-status-orange-background text-status-orange-text" },
  stopped: { label: "Stopped", icon: RiStopFill, chip: "bg-background-tertiary-default text-text-secondary" },
  failed: { label: "Failed", icon: RiErrorWarningLine, chip: "bg-status-rose-background text-status-rose-text" },
  pending: { label: "Pending", chip: "border border-dashed border-border-button-hover" },
  skipped: { label: "Skipped", chip: "border border-dashed border-border-button-default" },
};

// #region critical
export function stepLook(step: AgentStepState, run: AgentRunStatus): StepLook {
  if (step === "done") return "done";
  if (step === "failed") return "failed";
  if (step === "active") {
    if (run === "running") return "working";
    if (run === "waiting") return "waiting";
    if (run === "paused") return "paused";
    if (run === "error") return "failed";
    if (run === "done") return "done";
    return "stopped";
  }
  return run === "stopped" || run === "error" ? "skipped" : "pending";
}

export function nextRunStatus(action: AgentRunAction): AgentRunStatus {
  if (action === "pause") return "paused";
  if (action === "stop") return "stopped";
  return "running";
}

/** Controlled-or-uncontrolled run status plus the action dispatcher behind the footer buttons. */
export function useAgentRunStatus({
  status,
  defaultStatus = "running",
  onStatusChange,
  onRestart,
}: Pick<AgentDetailPanelProps, "status" | "defaultStatus" | "onStatusChange" | "onRestart">) {
  const [innerStatus, setInnerStatus] = useState<AgentRunStatus>(defaultStatus);
  const run = status ?? innerStatus;
  const act = (action: AgentRunAction) => {
    const next = nextRunStatus(action);
    if (status === undefined) setInnerStatus(next);
    onStatusChange?.(next, action);
    if (action === "restart") onRestart?.();
  };
  return [run, act] as const;
}
// #endregion

export function AgentDetailPanel({
  name,
  subtitle,
  avatar,
  task,
  steps,
  stats,
  status,
  defaultStatus = "running",
  onStatusChange,
  onRestart,
  onClose,
  confirmStop = true,
  followActive = true,
  className,
}: AgentDetailPanelProps) {
  const [run, dispatch] = useAgentRunStatus({ status, defaultStatus, onStatusChange, onRestart });
  const [confirming, setConfirming] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const activeStepId = steps.find((s) => s.state === "active")?.id;

  // Keep the live step in view: scroll only the panel body, never the page.
  useEffect(() => {
    const body = bodyRef.current;
    if (!followActive || !body || !activeStepId) return;
    const el = body.querySelector<HTMLElement>(`[data-step-id="${CSS.escape(activeStepId)}"]`);
    if (!el) return;
    const top = el.offsetTop;
    const bottom = top + el.offsetHeight;
    if (top >= body.scrollTop && bottom <= body.scrollTop + body.clientHeight) return;
    body.scrollTo({ top: Math.max(0, bottom - body.clientHeight + 16), behavior: reduce ? "auto" : "smooth" });
  }, [activeStepId, followActive, reduce]);
  const meta = AGENT_RUN_STATUS_META[run];
  const terminal = TERMINAL.has(run);
  const doneCount = steps.filter((s) => s.state === "done").length;
  const percent = steps.length ? (doneCount / steps.length) * 100 : 0;

  const act = (action: AgentRunAction) => {
    setConfirming(false);
    dispatch(action);
  };

  return (
    <section
      aria-label={`${name} details`}
      className={cx(
        "@container flex min-h-0 flex-col rounded-3xl border border-border-button-default bg-background-primary-default",
        className,
      )}
    >
      <header className="flex items-center gap-3 border-b border-border-button-default p-4">
        <span className="shrink-0">{avatar ?? <AgentMonogram name={name} className="size-10 rounded-xl text-body-semibold" />}</span>
        <div className="flex min-w-0 flex-1 flex-col">
          <h2 className="truncate text-body-semibold text-text-primary">{name}</h2>
          {subtitle && <p className="truncate text-caption-1-regular text-text-tertiary">{subtitle}</p>}
        </div>
        <span
          role="status"
          className={cx(
            "flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-caption-1-medium @max-[22rem]:p-1.5 transition-colors duration-200 ease-out motion-reduce:transition-none",
            meta.pill,
          )}
        >
          <span aria-hidden className={cx("relative size-1.5 rounded-full", meta.dot)}>
            {run === "running" && (
              <span className="absolute inset-0 animate-ping rounded-full bg-green-500 opacity-70 motion-reduce:hidden" />
            )}
          </span>
          <span className="@max-[22rem]:sr-only">{meta.label}</span>
        </span>
        {onClose && (
          <button
            type="button"
            aria-label="Close details"
            onClick={onClose}
            className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full bg-background-tertiary-default text-foreground-icon-secondary outline-none transition-colors duration-150 ease-out hover:bg-background-tertiary-hover hover:text-foreground-icon-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring motion-reduce:transition-none"
          >
            <RiCloseLine aria-hidden className="size-4" />
          </button>
        )}
      </header>

      <div ref={bodyRef} className="relative flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
        {task && (
          <div className="flex flex-col gap-1 rounded-2xl bg-background-secondary-default p-3">
            <span className="text-caption-1-medium text-text-tertiary">Task</span>
            <p className="text-body-2-regular text-text-primary">{task}</p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-body-2-medium text-text-primary">Steps</span>
            <span className="text-caption-1-medium tabular-nums text-text-tertiary">
              {doneCount} of {steps.length}
            </span>
          </div>
          <ProgressTrack
            percentage={percent}
            size="sm"
            className={cx(
              run === "paused" && "text-orange-500",
              run === "stopped" && "text-neutral-400",
              run === "error" && "text-red-500",
              run === "done" && "text-green-500",
            )}
          />
        </div>

        {stats && stats.length > 0 && (
          <dl className="grid grid-cols-3 gap-2">
            {stats.map((s) => (
              <div key={s.label} className="flex min-w-0 flex-col gap-0.5 rounded-xl border border-border-button-default px-3 py-2">
                <dt className="truncate text-caption-2-medium text-text-tertiary">{s.label}</dt>
                <dd className="truncate text-body-2-semibold tabular-nums text-text-primary">{s.value}</dd>
              </div>
            ))}
          </dl>
        )}

        <ol aria-label="Step log" className="flex flex-col">
          {steps.map((step, i) => {
            const look = stepLook(step.state, run);
            const spec = STEP_LOOK[look];
            const Icon = spec.icon;
            const last = i === steps.length - 1;
            const muted = look === "pending" || look === "skipped";
            return (
              <li key={step.id} data-step-id={step.id} data-state={look} className="relative flex gap-3 pb-4 last:pb-0">
                {!last && (
                  <span
                    aria-hidden
                    className={cx(
                      "absolute start-2.5 top-6 bottom-1 w-px -translate-x-1/2 rtl:translate-x-1/2",
                      look === "done" ? "bg-status-lime-text/40" : "bg-border-button-default",
                    )}
                  />
                )}
                <span
                  aria-hidden
                  className={cx(
                    "relative z-10 flex size-5 shrink-0 items-center justify-center rounded-full transition-colors duration-200 ease-out motion-reduce:transition-none",
                    spec.chip,
                  )}
                >
                  {look === "working" ? <SpinnerGlyph size="sm" /> : Icon ? <Icon aria-hidden className="size-3" /> : null}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex items-baseline gap-2">
                    <span
                      className={cx(
                        "min-w-0 flex-1 text-body-2-medium",
                        muted ? "text-text-tertiary" : "text-text-primary",
                        look === "skipped" && "line-through decoration-text-tertiary/60",
                      )}
                    >
                      {step.title}
                    </span>
                    <span className="shrink-0 text-caption-2-regular tabular-nums text-text-tertiary">
                      {look === "skipped" ? "Skipped" : step.time}
                    </span>
                  </div>
                  {step.detail && !muted && (
                    <p className="text-caption-1-regular text-text-secondary">{step.detail}</p>
                  )}
                  <span className="sr-only">{spec.label}</span>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <footer className="border-t border-border-button-default p-3">
        {confirming ? (
          <div key="confirm"
            role="group"
            aria-label="Confirm stop"
            className="flex flex-wrap items-center gap-2 transition-[opacity,translate] duration-150 ease-out starting:translate-y-1 starting:opacity-0 motion-reduce:transition-none"
          >
            <p className="min-w-0 flex-1 text-body-2-regular text-text-secondary">
              Stop this run? Finished steps are kept.
            </p>
            <Button size="small" variant="secondary" onClick={() => setConfirming(false)}>
              Keep running
            </Button>
            <Button size="small" variant="danger" leadingIcon={RiStopFill} onClick={() => act("stop")}>
              Stop run
            </Button>
          </div>
        ) : terminal ? (
          <div key="terminal" className="flex items-center gap-2">
            <p className="min-w-0 flex-1 text-body-2-regular text-text-tertiary">
              {run === "done" ? "Run finished." : run === "error" ? "Run failed." : "Run stopped."}
            </p>
            {onRestart && (
              <Button size="small" variant="secondary" leadingIcon={RiRestartLine} onClick={() => act("restart")}>
                Run again
              </Button>
            )}
          </div>
        ) : (
          <div key="live" className="flex items-center gap-2">
            {run === "paused" ? (
              <Button size="small" variant="primary" leadingIcon={RiPlayLine} onClick={() => act("resume")} className="flex-1">
                Resume
              </Button>
            ) : (
              <Button size="small" variant="secondary" leadingIcon={RiPauseLine} onClick={() => act("pause")} className="flex-1">
                Pause
              </Button>
            )}
            <Button
              size="small"
              variant="secondary"
              leadingIcon={RiStopLine}
              onClick={() => (confirmStop ? setConfirming(true) : act("stop"))}
              className="flex-1 text-text-destructive"
            >
              Stop
            </Button>
          </div>
        )}
      </footer>
    </section>
  );
}
