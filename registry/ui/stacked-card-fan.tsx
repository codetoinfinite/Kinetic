/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Stacked Card Fan" (boardui.com/).
 * No BoardUI source was used.
 */
"use client";

import { useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, ReactNode } from "react";
import { RiCollapseDiagonalLine, RiExpandDiagonalLine } from "@remixicon/react";
import { mergeProps, useFocusRing, useHover } from "react-aria";
import { Button } from "@/registry/ui/button";
import { cx } from "@/registry/lib/cx";
import { useResizeObserver } from "@/registry/hooks/use-resize-observer";

export interface StackedCardFanItem {
  id: string;
  /** Announced when the card comes to the front. */
  label: string;
  content: ReactNode;
}

export interface StackedCardFanProps {
  items: StackedCardFanItem[];
  activeIndex?: number;
  defaultActiveIndex?: number;
  onActiveChange?: (index: number) => void;
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  /** Show the "See all" pill under the stack. */
  showToggle?: boolean;
  expandLabel?: string;
  collapseLabel?: string;
  /** Card size in px; both shrink together when the container is narrow. */
  cardWidth?: number;
  cardHeight?: number;
  /** Fade the lower part of the stack into the page. */
  fade?: boolean;
  "aria-label"?: string;
  className?: string;
}

type FanVars = CSSProperties & Record<`--${string}`, string | number>;

// #region critical
/**
 * Signed circular distance from the front card: for five cards and front 0,
 * the order is 0, 1, 2, -2, -1. The front card sits at 0, the rest alternate
 * to its right (+) and left (-), and cycling the front card makes the one
 * leaving the far end slip round behind the stack to the other end.
 */
function slotOf(index: number, active: number, count: number) {
  const half = Math.floor(count / 2);
  return ((((index - active + half) % count) + count) % count) - half;
}

/**
 * Every card has one transform made of CSS variables: `--d` (its slot) and
 * `--ad` (|slot|) are set per card, while `--spread`, `--tilt`, `--drop`,
 * `--shrink` are set by the stack state (rest, peek on hover/focus, expanded). A change of
 * either re-computes the transform and a single CSS transition animates it, so
 * hover, cycling and expanding all share one code path with no JS animation.
 * The horizontal gap is capped by the container so the outer cards never
 * leave it: half * gap + card / 2 <= 50cqi.
 */
const CARD_TRANSFORM =
  "translateX(-50%) translateX(calc(var(--d) * var(--gap))) translateY(calc(var(--ad) * var(--drop))) rotate(calc(var(--d) * var(--tilt))) scale(calc(var(--base) * (1 - var(--ad) * var(--shrink))))";

const GAP = "max(12px, min(calc(var(--card-w) * var(--spread)), calc((100cqi - var(--card-w)) / var(--span))))";

/** Each expanded card advances this fraction of a card width past the one before (14% overlap). */
const EXPANDED_STEP = 0.86;

/**
 * Expanded lays every card out in a row, so cards must also shrink: the scale
 * that makes card + (n - 1) * step * card fit the measured width. Scale is a
 * plain number, which CSS cannot derive from lengths everywhere yet, so it is
 * computed here from the container's layout width.
 */
function expandedLayout(width: number, cardWidth: number, count: number) {
  const card = Math.min(cardWidth, width * 0.8);
  const scale = Math.min(1, width / (card * (1 + (count - 1) * EXPANDED_STEP)));
  return { scale, gap: card * scale * EXPANDED_STEP };
}
// #endregion

/**
 * A fanned stack of cards. Hovering or focusing it spreads the fan; clicking
 * the front card or pressing the arrow keys brings the next card forward, and
 * clicking a card behind brings that one forward.
 */
export function StackedCardFan({
  items,
  activeIndex,
  defaultActiveIndex = 0,
  onActiveChange,
  expanded,
  defaultExpanded = false,
  onExpandedChange,
  showToggle = true,
  expandLabel,
  collapseLabel = "Stack cards",
  cardWidth = 300,
  cardHeight = 260,
  fade = false,
  "aria-label": ariaLabel = "Card stack",
  className,
}: StackedCardFanProps) {
  const count = items.length;
  const [innerActive, setInnerActive] = useState(defaultActiveIndex);
  const [innerExpanded, setInnerExpanded] = useState(defaultExpanded);
  const active = count ? (((activeIndex ?? innerActive) % count) + count) % count : 0;
  const isExpanded = expanded ?? innerExpanded;
  const { hoverProps, isHovered } = useHover({});
  const { focusProps, isFocusVisible } = useFocusRing();
  const wrapRef = useRef<HTMLDivElement>(null);
  const { width } = useResizeObserver(wrapRef);

  const select = (index: number) => {
    const next = ((index % count) + count) % count;
    if (activeIndex === undefined) setInnerActive(next);
    onActiveChange?.(next);
  };
  const toggle = () => {
    if (expanded === undefined) setInnerExpanded(!isExpanded);
    onExpandedChange?.(!isExpanded);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const step: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1, Enter: 1, " ": 1 };
    if (event.key === "Home") select(0);
    else if (event.key === "End") select(count - 1);
    else if (step[event.key] !== undefined) select(active + step[event.key]!);
    else return;
    event.preventDefault();
  };

  const state = isExpanded ? "expanded" : isHovered || isFocusVisible ? "peek" : "rest";
  const front = items[active];
  const vars: FanVars = {
    "--card-w": `min(${cardWidth}px, 80cqi)`,
    "--card-h": `calc(var(--card-w) * ${cardHeight / cardWidth})`,
    "--span": Math.max(1, 2 * Math.floor(count / 2)),
  };
  // --gap reads --spread, which the stage sets per state, so it is declared on the stage.
  const stageVars: FanVars = { height: "calc(var(--card-h) + 64px)", "--gap": GAP, "--base": 1 };
  if (isExpanded && width > 0) {
    const layout = expandedLayout(width, cardWidth, count);
    stageVars["--gap"] = `${layout.gap}px`;
    stageVars["--base"] = layout.scale;
  }

  return (
    <div ref={wrapRef} className={cx("@container/fan flex w-full flex-col items-center", className)} style={vars}>
      <div
        {...mergeProps(hoverProps, focusProps)}
        role="group"
        aria-roledescription="card stack"
        aria-label={`${ariaLabel}. Use the arrow keys to bring the next card forward.`}
        tabIndex={0}
        onKeyDown={onKeyDown}
        data-state={state}
        data-active={active}
        className={cx(
          "relative w-full rounded-3xl outline-none",
          "[--drop:10px] [--shrink:0.04] [--spread:0.3] [--tilt:5deg]",
          "data-[state=peek]:[--drop:16px] data-[state=peek]:[--spread:0.46] data-[state=peek]:[--tilt:8deg]",
          "data-[state=expanded]:[--drop:4px] data-[state=expanded]:[--shrink:0] data-[state=expanded]:[--spread:0.98] data-[state=expanded]:[--tilt:1.5deg]",
          "focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-4 focus-visible:ring-offset-background-primary-default",
          fade && "mask-b-from-55% mask-b-to-100%",
        )}
        style={stageVars}
      >
        {items.map((item, index) => {
          const d = slotOf(index, active, count);
          const ad = Math.abs(d);
          const isFront = d === 0;
          return (
            <div
              key={item.id}
              aria-hidden={isFront ? undefined : true}
              data-front={isFront || undefined}
              data-card={item.id}
              onClick={() => select(isFront ? active + 1 : index)}
              className={cx(
                "@container/card absolute top-4 left-1/2 flex cursor-pointer flex-col overflow-hidden rounded-[22px] border border-border-button-default bg-background-primary-default p-4 shadow-lg select-none",
                "transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
              )}
              style={{
                width: "var(--card-w)",
                height: "var(--card-h)",
                zIndex: count - ad,
                transform: CARD_TRANSFORM,
                ["--d" as string]: d,
                ["--ad" as string]: ad,
              }}
            >
              {item.content}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-background-primary-default transition-opacity duration-500 motion-reduce:transition-none"
                style={{ opacity: Math.min(0.6, ad * (isExpanded ? 0.08 : 0.24)) }}
              />
            </div>
          );
        })}
      </div>

      <span className="sr-only" aria-live="polite">
        {front ? `${front.label}, ${active + 1} of ${count}` : ""}
      </span>

      {showToggle && count > 1 ? (
        <Button
          variant="secondary"
          size="small"
          leadingIcon={isExpanded ? RiCollapseDiagonalLine : RiExpandDiagonalLine}
          type="button"
          aria-pressed={isExpanded}
          onClick={toggle}
          className="relative z-10 -mt-5 rounded-full shadow-sm"
        >
          {isExpanded ? collapseLabel : (expandLabel ?? `See all ${count}`)}
        </Button>
      ) : null}
    </div>
  );
}
