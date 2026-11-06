/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Task List" (boardui.com/components/task-list).
 * No BoardUI source was used.
 */
"use client";

import { useId, useState } from "react";
import type { ReactNode } from "react";
import { motion } from "motion/react";
import { RiArrowUpSLine, RiSearchLine } from "@remixicon/react";
import type { RemixiconComponentType } from "@remixicon/react";
import { cx } from "@/registry/lib/cx";
import {
  GuideBridge,
  LogRow,
  ShimmerText,
  UNIT_ANIMATE,
  UNIT_INITIAL,
  UNIT_TRANSITION,
  WorkingRow,
  useLogMotion,
  useRevealMask,
  useRevealTicker,
} from "@/registry/ui/agent-log";

/**
 * Task List: a streaming log of what an agent did. Every task is one unit for
 * its header plus one unit per step; the shared Agent Log ticker reveals one
 * unit per tick, so the list grows the way the work does. A task shimmers its
 * running title until its last step lands, then settles on `doneTitle`.
 */

export interface TaskChip {
  /** File or resource name; long names truncate. */
  label: string;
  /** Optional glyph before the label (a 14px icon). */
  icon?: ReactNode;
}

export interface TaskStep {
  label: string;
  /** Resources the step touched, rendered inline after the label. */
  chips?: readonly TaskChip[];
}

export interface TaskItem {
  id: string;
  /** Title while the task is running (shimmers). */
  title: string;
  /** Title once every step has landed. Defaults to `title`. */
  doneTitle?: string;
  /** Leading glyph. Defaults to a search icon. */
  icon?: RemixiconComponentType;
  steps: readonly TaskStep[];
}

export interface TaskListProps {
  tasks: readonly TaskItem[];
  /** Pause / resume the internal ticker. */
  run?: boolean;
  /** Delay before the first unit lands, ms. */
  startDelay?: number;
  /** Delay between units, ms. */
  stepInterval?: number;
  /** Units revealed, when driven from real events (disables the timer). */
  revealed?: number;
  /**
   * `true` folds each task as soon as its own steps land; `"all"` holds every
   * task open until the run completes, then folds them together.
   */
  collapseOnComplete?: boolean | "all";
  /** Label of the tail indicator while running; `false` hides it. */
  working?: string | false;
  /** Fires once when the final unit lands. */
  onComplete?: () => void;
  /** Accessible name of the log. */
  "aria-label"?: string;
  className?: string;
}

/** Units a task occupies: its header plus one per step. */
export function taskUnits(task: TaskItem): number {
  return 1 + task.steps.length;
}

/** Total units of a task list, the unit `revealed` counts against. */
export function countTaskUnits(tasks: readonly TaskItem[]): number {
  return tasks.reduce((sum, task) => sum + taskUnits(task), 0);
}

function Chip({ chip }: { chip: TaskChip }) {
  return (
    <span className="inline-flex h-5 max-w-40 min-w-0 items-center gap-1 rounded-md border border-border-button-default bg-background-secondary-default px-1.5 align-middle text-caption-1-medium text-text-primary">
      {chip.icon ? <span aria-hidden className="flex shrink-0 items-center [&>svg]:size-3.5">{chip.icon}</span> : null}
      <span className="truncate">{chip.label}</span>
    </span>
  );
}

interface TaskBlockProps {
  task: TaskItem;
  /** How many of this task's steps have landed. */
  shown: number;
  done: boolean;
  open: boolean;
  onToggle: () => void;
  reduce: boolean;
}

function TaskBlock({ task, shown, done, open, onToggle, reduce }: TaskBlockProps) {
  const regionId = useId();
  const mask = useRevealMask(reduce);
  const Icon = task.icon ?? RiSearchLine;
  const title = done ? (task.doneTitle ?? task.title) : task.title;
  const steps = task.steps.slice(0, shown);

  return (
    <motion.li
      initial={reduce ? false : UNIT_INITIAL}
      animate={UNIT_ANIMATE}
      transition={UNIT_TRANSITION}
      {...mask}
      className="overflow-hidden"
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={regionId}
        onClick={onToggle}
        className="group flex w-full cursor-pointer items-center gap-2 rounded-md py-1 text-start outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
      >
        <Icon aria-hidden className="size-4 shrink-0 text-foreground-icon-secondary" />
        <span className="min-w-0 flex-1 truncate text-body-regular text-text-primary">
          {done ? title : <ShimmerText>{title}</ShimmerText>}
        </span>
        <RiArrowUpSLine
          aria-hidden
          className={cx(
            "size-4 shrink-0 text-foreground-icon-tertiary transition-transform duration-200 ease-out group-hover:text-foreground-icon-secondary motion-reduce:transition-none",
            !open && "rotate-180",
          )}
        />
      </button>
      {/* Drops from the header glyph to the steps' trunk. It sits outside the
          collapsing region so that region's overflow clip cannot cut it. */}
      {open && steps.length > 0 && (
        <div className="relative h-0">
          <GuideBridge height={6} offset={8} reduce={reduce} />
        </div>
      )}
      <div
        id={regionId}
        role="region"
        aria-label={title}
        inert={!open}
        className={cx(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          {steps.length > 0 && (
            <div className="ms-2">
              <ul className="flex flex-col">
                {steps.map((step, i) => (
                  <LogRow key={i} first={false} last={i === steps.length - 1} reduce={reduce}>
                    <div className="flex min-w-0 items-center gap-1.5 py-1 text-body-regular text-text-secondary">
                      <span className="min-w-0 truncate">{step.label}</span>
                      {step.chips?.map((chip, c) => <Chip key={c} chip={chip} />)}
                    </div>
                  </LogRow>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </motion.li>
  );
}

export function TaskList({
  tasks,
  run = true,
  startDelay = 320,
  stepInterval = 850,
  revealed: controlledRevealed,
  collapseOnComplete = false,
  working = "Working",
  onComplete,
  "aria-label": ariaLabel = "Agent tasks",
  className,
}: TaskListProps) {
  const reduce = useLogMotion();
  const total = countTaskUnits(tasks);
  const revealed = useRevealTicker({
    total,
    run,
    startDelay,
    stepInterval,
    revealed: controlledRevealed,
    onComplete,
  });
  // A reader's own open/close wins over the automatic fold.
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const complete = total > 0 && revealed >= total;

  // #region critical
  // Walk the tasks once, handing each its slice of the revealed units: the
  // first unit shows the header, the rest land its steps in order. A task is
  // done once all of its units are in, which settles its title and, with
  // collapseOnComplete, folds it (or waits for the whole run with "all").
  let offset = 0;
  const blocks = tasks.map((task) => {
    const start = offset;
    offset += taskUnits(task);
    const visible = revealed > start;
    const shown = Math.max(0, Math.min(task.steps.length, revealed - start - 1));
    const done = revealed >= start + taskUnits(task);
    const autoClosed =
      collapseOnComplete === "all" ? complete : collapseOnComplete ? done : false;
    const open = overrides[task.id] ?? !autoClosed;
    return { task, visible, shown, done, open };
  });
  // #endregion

  return (
    <div role="log" aria-label={ariaLabel} aria-live="polite" className={cx("flex w-full flex-col", className)}>
      <ul className="flex flex-col">
        {blocks
          .filter((b) => b.visible)
          .map((b) => (
            <TaskBlock
              key={b.task.id}
              task={b.task}
              shown={b.shown}
              done={b.done}
              open={b.open}
              reduce={reduce}
              onToggle={() => setOverrides((prev) => ({ ...prev, [b.task.id]: !b.open }))}
            />
          ))}
      </ul>
      {working !== false && !complete && (
        <WorkingRow label={working} reduce={reduce} className="mt-0.5" />
      )}
    </div>
  );
}
