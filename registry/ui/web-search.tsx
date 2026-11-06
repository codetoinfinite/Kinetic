/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Web Search" (boardui.com/components/web-search).
 * No BoardUI source was used.
 */
"use client";

import { useCallback, useId, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Focusable } from "react-aria-components";
import { RiArrowDownSLine, RiGlobalLine, RiSearchLine } from "@remixicon/react";
import type { RemixiconComponentType } from "@remixicon/react";
import { cx } from "@/registry/lib/cx";
import { Tooltip, TooltipTrigger } from "@/registry/ui/tooltip";
import { SOCIAL_PROVIDERS } from "@/registry/ui/social-providers";
import type { SocialProvider } from "@/registry/ui/social-providers";
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
 * Web Search: the research side of an agent log. Where Task List records what
 * the agent did, this records where it looked. Each step is a query it ran or a
 * page it opened; a step that found something branches once more into a Sources
 * row of overlapping site marks, which expands into titles and domains.
 *
 * It shares the Agent Log reveal, clipping edge and curved guide with Task
 * List, so both can sit in one thread.
 */

export interface WebSearchSource {
  title: string;
  domain: string;
  /** One of the social-button marks; anything else shows a plain globe. */
  brand?: SocialProvider;
  /** Makes the mark and its list entry a link (opens in a new tab). */
  href?: string;
}

export interface WebSearchStep {
  label: string;
  /** Emphasised after the label, e.g. `Searched Reddit for` + `"design tokens"`. */
  query?: string;
  /** Leading glyph when there is no brand. */
  icon?: RemixiconComponentType;
  /** Draws the site's mark as the glyph instead of an icon. */
  brand?: SocialProvider;
  /** A top-level row; the plain steps after it nest beneath it. */
  heading?: boolean;
  /** Quiet trailing text, e.g. `5 results`. */
  meta?: string;
  /** How long the trail holds on this step (shimmering) before the next lands, ms. */
  dwell?: number;
  /** What the step found; adds a Sources row, which is a unit of its own. */
  sources?: readonly WebSearchSource[];
}

export interface WebSearchProps {
  steps: readonly WebSearchStep[];
  /** Pause / resume the internal timer. */
  run?: boolean;
  /** Delay before the first row lands, ms. */
  startDelay?: number;
  /** Hold on a step that has no `dwell`, ms. */
  stepInterval?: number;
  /** Gap between a step and its Sources row, ms. */
  sourceBeat?: number;
  /** Rows landed, when driven from real events (disables the timer). */
  revealed?: number;
  /** Marks drawn before the rest collapse into a count. */
  maxMarks?: number;
  /** Label of the tail indicator while running; `false` hides it. */
  working?: string | false;
  /** Fires once when the last row lands. */
  onComplete?: () => void;
  "aria-label"?: string;
  className?: string;
}

/** Rows a step occupies: itself, plus its Sources row when it found any. */
export function searchStepUnits(step: WebSearchStep): number {
  return step.sources && step.sources.length > 0 ? 2 : 1;
}

/** Total rows, the unit `revealed` counts against. */
export function countSearchUnits(steps: readonly WebSearchStep[]): number {
  return steps.reduce((sum, step) => sum + searchStepUnits(step), 0);
}

/* Marks whose brand colour is black take the text colour and follow the theme. */
const INK_BRANDS: ReadonlySet<SocialProvider> = new Set<SocialProvider>(["apple", "github", "x", "notion", "tiktok"]);

function SiteGlyph({ brand, className }: { brand?: SocialProvider; className?: string }) {
  if (!brand) {
    return <RiGlobalLine aria-hidden className={cx("shrink-0 text-foreground-icon-tertiary", className)} />;
  }
  const mark = SOCIAL_PROVIDERS[brand];
  const ink = INK_BRANDS.has(brand);
  return (
    <svg
      aria-hidden
      viewBox={mark.viewBox}
      fill="currentColor"
      className={cx("shrink-0", ink && "text-text-primary", className)}
      style={ink ? undefined : { color: mark.brand }}
    >
      <path d={mark.path} />
    </svg>
  );
}

const MARK_TILE =
  "relative flex size-5 items-center justify-center rounded-md border border-border-button-default bg-background-primary-default shadow-xs outline-none transition-transform duration-150 ease-out hover:z-10 hover:-translate-y-0.5 focus-visible:z-10 focus-visible:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-border-focus-ring motion-reduce:transition-none";

function SourceMark({ source }: { source: WebSearchSource }) {
  const label = `${source.title}, ${source.domain}`;
  const glyph = <SiteGlyph brand={source.brand} className="size-3" />;
  return (
    <TooltipTrigger delay={150}>
      <Focusable excludeFromTabOrder={!source.href}>
        {source.href ? (
          <a href={source.href} target="_blank" rel="noreferrer" aria-label={label} className={MARK_TILE}>
            {glyph}
          </a>
        ) : (
          <span role="img" aria-label={label} className={MARK_TILE}>
            {glyph}
          </span>
        )}
      </Focusable>
      <Tooltip placement="top">
        <span className="block truncate">{source.title}</span>
        <span className="block text-text-tertiary">{source.domain}</span>
      </Tooltip>
    </TooltipTrigger>
  );
}

function SourceEntry({ source }: { source: WebSearchSource }) {
  const body = (
    <>
      <SiteGlyph brand={source.brand} className="size-3.5" />
      <span className="min-w-0 flex-1 truncate text-body-2-regular text-text-primary">{source.title}</span>
      <span className="max-w-[40%] shrink-0 truncate text-caption-1-regular text-text-tertiary">{source.domain}</span>
    </>
  );
  const row = "flex min-w-0 items-center gap-2 rounded-md px-1 py-1";
  return source.href ? (
    <a
      href={source.href}
      target="_blank"
      rel="noreferrer"
      className={cx(row, "outline-none hover:bg-background-secondary-default focus-visible:ring-2 focus-visible:ring-border-focus-ring")}
    >
      {body}
    </a>
  ) : (
    <div className={row}>{body}</div>
  );
}

function SourcesRow({ sources, maxMarks }: { sources: readonly WebSearchSource[]; maxMarks: number }) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const marks = sources.slice(0, maxMarks);
  const rest = sources.length - marks.length;
  const toggle = () => setOpen((o) => !o);

  return (
    <div>
      <div className="flex min-w-0 items-center gap-2 py-1">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={listId}
          aria-label={`${sources.length} sources`}
          onClick={toggle}
          className="shrink-0 cursor-pointer rounded-md text-body-regular text-text-secondary outline-none hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring"
        >
          Sources
        </button>
        <ul aria-label="Source sites" className="flex min-w-0 items-center ps-0.5">
          {marks.map((source, i) => (
            <li key={i} className={cx("flex", i > 0 && "-ms-1.5")}>
              <SourceMark source={source} />
            </li>
          ))}
          {rest > 0 && (
            <li className="-ms-1.5 flex">
              <span className="relative flex h-5 items-center rounded-md border border-border-button-default bg-background-tertiary-default px-1 text-caption-2-medium text-text-secondary shadow-xs">
                +{rest}
              </span>
            </li>
          )}
        </ul>
        {/* A larger pointer target for the same toggle; keyboard and screen
            readers use the Sources button. */}
        <span aria-hidden onClick={toggle} className="flex shrink-0 cursor-pointer">
          <RiArrowDownSLine
            className={cx(
              "size-4 text-foreground-icon-tertiary transition-transform duration-200 ease-out hover:text-foreground-icon-secondary motion-reduce:transition-none",
              open && "rotate-180",
            )}
          />
        </span>
      </div>
      <div
        id={listId}
        role="region"
        aria-label="Sources"
        inert={!open}
        className={cx(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <ul className="flex flex-col pb-1">
            {sources.map((source, i) => (
              <li key={i}>
                <SourceEntry source={source} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function StepRow({ step, running }: { step: WebSearchStep; running: boolean }) {
  const Icon = step.icon ?? (step.heading ? RiSearchLine : RiGlobalLine);
  return (
    <div className="flex min-w-0 items-center gap-2 py-1">
      {step.brand ? (
        <SiteGlyph brand={step.brand} className="size-4" />
      ) : (
        <Icon aria-hidden className="size-4 shrink-0 text-foreground-icon-secondary" />
      )}
      <span
        className={cx(
          "min-w-0 flex-1 truncate text-body-regular",
          step.heading ? "text-text-primary" : "text-text-secondary",
        )}
      >
        {running ? <ShimmerText>{step.label}</ShimmerText> : step.label}
        {step.query ? <span className="text-text-primary"> {step.query}</span> : null}
      </span>
      {step.meta ? <span className="shrink-0 ps-3 text-body-2-regular text-text-tertiary">{step.meta}</span> : null}
    </div>
  );
}

interface SearchNode {
  index: number;
  step: WebSearchStep;
  /** Offset of this step's first row in the reveal order. */
  start: number;
  children: SearchNode[];
}

interface StepBodyProps {
  node: SearchNode;
  revealed: number;
  runningStep: number;
  maxMarks: number;
  /** Rows nest below this step's Sources row, so its guide keeps going. */
  continues: boolean;
  reduce: boolean;
}

/** A step's own row, then its Sources row a level deeper once that lands. */
function StepBody({ node, revealed, runningStep, maxMarks, continues, reduce }: StepBodyProps) {
  const sources = node.step.sources ?? [];
  const sourcesShown = sources.length > 0 && revealed > node.start + 1;
  return (
    <>
      <StepRow step={node.step} running={node.index === runningStep} />
      {sourcesShown && (
        <>
          <div className="relative h-0">
            <GuideBridge height={6} offset={8} reduce={reduce} />
          </div>
          <ul className="ms-2 flex flex-col">
            <LogRow first={false} last={!continues} reduce={reduce}>
              <SourcesRow sources={sources} maxMarks={maxMarks} />
            </LogRow>
          </ul>
        </>
      )}
    </>
  );
}

function TopBlock({ node, revealed, runningStep, maxMarks, reduce }: Omit<StepBodyProps, "continues">) {
  const mask = useRevealMask(reduce);
  const children = node.children.filter((child) => revealed > child.start);
  const sourcesShown = (node.step.sources?.length ?? 0) > 0 && revealed > node.start + 1;
  return (
    <motion.li
      initial={reduce ? false : UNIT_INITIAL}
      animate={UNIT_ANIMATE}
      transition={UNIT_TRANSITION}
      {...mask}
      className="overflow-hidden"
    >
      <StepBody
        node={node}
        revealed={revealed}
        runningStep={runningStep}
        maxMarks={maxMarks}
        continues={children.length > 0}
        reduce={reduce}
      />
      {children.length > 0 && (
        <>
          {/* With a Sources row above, its trunk already reaches this list. */}
          {!sourcesShown && (
            <div className="relative h-0">
              <GuideBridge height={6} offset={8} reduce={reduce} />
            </div>
          )}
          <ul className="ms-2 flex flex-col">
            {children.map((child, i) => (
              <LogRow key={child.index} first={false} last={i === children.length - 1} reduce={reduce}>
                <StepBody
                  node={child}
                  revealed={revealed}
                  runningStep={runningStep}
                  maxMarks={maxMarks}
                  continues={false}
                  reduce={reduce}
                />
              </LogRow>
            ))}
          </ul>
        </>
      )}
    </motion.li>
  );
}

export function WebSearch({
  steps,
  run = true,
  startDelay = 320,
  stepInterval = 850,
  sourceBeat = 450,
  revealed: controlledRevealed,
  maxMarks = 6,
  working = "Working",
  onComplete,
  "aria-label": ariaLabel = "Web search",
  className,
}: WebSearchProps) {
  const reduce = useLogMotion();

  // #region critical
  // Reveal order: every step is one row and a step with sources is two, the
  // step then its Sources row. Pacing is per row: the Sources row lands a beat
  // after its step, and the trail then holds for that step's dwell (or the
  // interval) before the next step, so slow searches look slow.
  const units = useMemo(() => {
    const out: { step: number; sources: boolean }[] = [];
    steps.forEach((step, i) => {
      out.push({ step: i, sources: false });
      if (searchStepUnits(step) === 2) out.push({ step: i, sources: true });
    });
    return out;
  }, [steps]);

  const delayFor = useCallback(
    (index: number) => {
      if (index === 0) return startDelay;
      if (units[index]?.sources) return sourceBeat;
      const prev = units[index - 1];
      const step = prev ? steps[prev.step] : undefined;
      return step?.dwell ?? stepInterval;
    },
    [units, steps, startDelay, stepInterval, sourceBeat],
  );

  // Headings open a level; plain steps after one nest under it, and plain
  // steps before any heading sit at the top level.
  const tree = useMemo(() => {
    const top: SearchNode[] = [];
    let parent: SearchNode | null = null;
    let offset = 0;
    steps.forEach((step, index) => {
      const node: SearchNode = { index, step, start: offset, children: [] };
      offset += searchStepUnits(step);
      if (step.heading) {
        top.push(node);
        parent = node;
      } else if (parent) {
        parent.children.push(node);
      } else {
        top.push(node);
      }
    });
    return top;
  }, [steps]);
  // #endregion

  const total = units.length;
  const revealed = useRevealTicker({
    total,
    run,
    startDelay,
    stepInterval,
    revealed: controlledRevealed,
    delayFor,
    onComplete,
  });
  const complete = total > 0 && revealed >= total;
  // The step the trail is holding on shimmers until the next one lands.
  const runningStep = !complete && revealed > 0 ? (units[revealed - 1]?.step ?? -1) : -1;

  return (
    <div role="log" aria-label={ariaLabel} aria-live="polite" className={cx("flex w-full flex-col", className)}>
      <ul className="flex flex-col">
        {tree
          .filter((node) => revealed > node.start)
          .map((node) => (
            <TopBlock
              key={node.index}
              node={node}
              revealed={revealed}
              runningStep={runningStep}
              maxMarks={maxMarks}
              reduce={reduce}
            />
          ))}
      </ul>
      {working !== false && !complete && <WorkingRow label={working} reduce={reduce} className="mt-0.5" />}
    </div>
  );
}
