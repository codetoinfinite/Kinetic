/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Sankey Chart Card" (boardui.com/components/sankey-chart-card).
 * No BoardUI source was used.
 */
"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import {
  CHART_COLORS,
  ChartCardFrame,
  ChartCardHeader,
  PeriodSelect,
  chartColorAt,
  formatInt,
  type ChartColor,
} from "@/registry/ui/funnel-chart-card-shell";
import { useReducedMotion } from "@/registry/hooks/use-reduced-motion";
import { useResizeObserver } from "@/registry/hooks/use-resize-observer";
import { cx } from "@/registry/lib/cx";
import { easeOutCubic } from "@/registry/lib/easing";

/**
 * Sankey Chart Card: flows from sources to sinks in the dashboard card shell.
 * The layout is computed here (columns by link depth, nodes stacked to one
 * shared px-per-unit scale, ribbons stacked in the order of the node they
 * lead to), drawn as filled SVG ribbons tinted with their source's colour.
 * Hovering a node or a ribbon lights its whole path and dims the rest, and
 * the headline follows. Labels are HTML buttons so the flows are reachable
 * by keyboard and screen reader.
 */

export type FlowNode = {
  name: string;
  /** Palette colour. First-column nodes cycle the palette when omitted; others are neutral. */
  color?: ChartColor;
};

export type FlowLink = {
  /** Node name or index. */
  source: string | number;
  /** Node name or index. */
  target: string | number;
  value: number;
};

export type FlowRange = {
  id: string;
  /** Text in the period select. */
  label: string;
  nodes: FlowNode[];
  links: FlowLink[];
  /** Percent change for the headline chip; omit for no chip. */
  delta?: number;
  /** Headline when nothing is hovered; defaults to the first column's total. */
  headline?: number;
};

const SOURCES: FlowNode[] = [
  { name: "Focus", color: "emerald" },
  { name: "Meetings", color: "purple" },
  { name: "Breaks", color: "yellow" },
  { name: "Admin", color: "blue" },
  { name: "Learning", color: "pink" },
];
const SINKS = ["Browsing", "Writing", "Messaging", "Productivity", "Email", "Video calls", "Everything else"];

/** Builds a two-column range from a sources x sinks matrix of hours. */
function matrixRange(id: string, label: string, matrix: number[][], delta?: number): FlowRange {
  const links: FlowLink[] = [];
  matrix.forEach((row, s) =>
    row.forEach((value, t) => {
      if (value > 0) links.push({ source: s, target: SOURCES.length + t, value });
    }),
  );
  return { id, label, delta, nodes: [...SOURCES, ...SINKS.map((name) => ({ name }))], links };
}

/** Three demo weeks of tracked time: activities on the left, apps on the right, in hours. */
export const TRACKED_TIME_RANGES: FlowRange[] = [
  matrixRange("this-week", "This week", [
    [9, 9, 5, 6, 3, 0, 0],
    [0, 2, 3, 0, 0, 9, 4],
    [5, 0, 0, 0, 0, 2, 5],
    [0, 3.5, 3, 3, 2, 1, 1.5],
    [5, 1, 0, 1.5, 2, 0, 0.5],
  ]),
  matrixRange("last-week", "Last week", [
    [7, 11, 4, 5, 2, 0, 0],
    [0, 1, 4, 0, 0, 11, 5],
    [6, 0, 0, 0, 0, 1, 4],
    [0, 2, 3, 2, 3, 0, 1],
    [3, 2, 0, 1, 0, 0, 1],
  ]),
  matrixRange("this-month", "This month", [
    [38, 41, 22, 27, 11, 0, 0],
    [0, 8, 14, 0, 0, 39, 17],
    [21, 0, 0, 0, 0, 9, 20],
    [0, 14, 12, 12, 9, 4, 6],
    [19, 4, 0, 6, 8, 0, 2],
  ]),
];

/** Node bar width in px. */
const NODE_W = 12;
/** Vertical gap between nodes in a column, in px. */
const NODE_GAP = 14;
/** Space between a node and its label, in px. */
const LABEL_GAP = 8;
/** Ribbon fill-opacity at rest, on the lit path, and when dimmed. */
const RIBBON = { rest: 0.4, lit: 0.65, dim: 0.1 } as const;
/** Ribbons sweep in left to right over this long on mount and on every period change. */
const SWEEP_MS = 800;
/** Below this chart width the sink labels stack their share under the name. */
const COMPACT_W = 440;
/** Fill for nodes past the first column that have no colour of their own. */
const NEUTRAL_FILL = "var(--color-text-tertiary)";

const formatHours = (value: number) => `${formatInt(value)}h`;
const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const r2 = (value: number) => Math.round(value * 100) / 100;

type LaidNode = {
  index: number;
  name: string;
  fill: string;
  colorKey: ChartColor | null;
  depth: number;
  value: number;
  x: number;
  y0: number;
  y1: number;
};

type LaidLink = {
  index: number;
  source: number;
  target: number;
  value: number;
  fill: string;
  d: string;
};

type Layout = { nodes: LaidNode[]; links: LaidLink[]; maxDepth: number; total: number };

type Hover = { kind: "node" | "link"; index: number } | null;

// #region critical
/**
 * Columns come from link depth (a node sits one column right of its deepest
 * source). Every column is stacked to the same px-per-unit scale, the
 * tightest one any column allows, then centred. Ribbons leave a node in the
 * vertical order of their targets and arrive in the order of their sources,
 * so they only cross where the data makes them.
 */
function layoutSankey(
  nodesIn: readonly FlowNode[],
  linksIn: readonly FlowLink[],
  box: { width: number; height: number; left: number; right: number },
): Layout {
  const byName = new Map(nodesIn.map((node, index) => [node.name, index] as const));
  const resolve = (ref: string | number) =>
    typeof ref === "number" ? (ref >= 0 && ref < nodesIn.length ? ref : -1) : (byName.get(ref) ?? -1);
  const links = linksIn
    .map((link) => ({ source: resolve(link.source), target: resolve(link.target), value: link.value }))
    .filter((link) => link.source >= 0 && link.target >= 0 && link.source !== link.target && link.value > 0);

  const count = nodesIn.length;
  const depth = new Array<number>(count).fill(0);
  // Relax depths; capping the passes at the node count keeps a cycle from looping forever.
  for (let pass = 0; pass < count; pass++) {
    let changed = false;
    for (const link of links) {
      const next = (depth[link.source] ?? 0) + 1;
      if (next > (depth[link.target] ?? 0) && next < count) {
        depth[link.target] = next;
        changed = true;
      }
    }
    if (!changed) break;
  }
  const maxDepth = Math.max(0, ...depth);

  const inSum = new Array<number>(count).fill(0);
  const outSum = new Array<number>(count).fill(0);
  for (const link of links) {
    outSum[link.source] = (outSum[link.source] ?? 0) + link.value;
    inSum[link.target] = (inSum[link.target] ?? 0) + link.value;
  }
  const values = nodesIn.map((_, i) => Math.max(inSum[i] ?? 0, outSum[i] ?? 0));

  const columns: number[][] = Array.from({ length: maxDepth + 1 }, () => []);
  depth.forEach((d, i) => columns[d]?.push(i));

  let scale = Infinity;
  for (const column of columns) {
    const sum = column.reduce((acc, i) => acc + (values[i] ?? 0), 0);
    if (sum > 0) scale = Math.min(scale, (box.height - NODE_GAP * (column.length - 1)) / sum);
  }
  if (!Number.isFinite(scale) || scale < 0) scale = 0;

  const span = Math.max(0, box.width - box.left - box.right - NODE_W);
  let firstOrdinal = 0;
  const nodes: LaidNode[] = nodesIn.map((node, index) => {
    const d = depth[index] ?? 0;
    const colorKey = node.color ?? (d === 0 ? chartColorAt(firstOrdinal++) : null);
    return {
      index,
      name: node.name,
      colorKey,
      fill: colorKey ? CHART_COLORS[colorKey].fill : NEUTRAL_FILL,
      depth: d,
      value: values[index] ?? 0,
      x: box.left + (maxDepth > 0 ? (d / maxDepth) * span : 0),
      y0: 0,
      y1: 0,
    };
  });

  for (const column of columns) {
    const used =
      column.reduce((acc, i) => acc + (values[i] ?? 0) * scale, 0) + NODE_GAP * Math.max(0, column.length - 1);
    let y = (box.height - used) / 2;
    for (const i of column) {
      const node = nodes[i];
      if (!node) continue;
      node.y0 = y;
      node.y1 = y + node.value * scale;
      y = node.y1 + NODE_GAP;
    }
  }

  const top = (i: number) => nodes[i]?.y0 ?? 0;
  const outOffset = nodes.map((node) => node.y0);
  const inOffset = nodes.map((node) => node.y0);
  const sy = new Array<number>(links.length).fill(0);
  const ty = new Array<number>(links.length).fill(0);
  const order = links.map((_, i) => i);
  for (const i of [...order].sort((a, b) => top(links[a]!.target) - top(links[b]!.target) || a - b)) {
    const link = links[i]!;
    sy[i] = outOffset[link.source] ?? 0;
    outOffset[link.source] = sy[i]! + link.value * scale;
  }
  for (const i of [...order].sort((a, b) => top(links[a]!.source) - top(links[b]!.source) || a - b)) {
    const link = links[i]!;
    ty[i] = inOffset[link.target] ?? 0;
    inOffset[link.target] = ty[i]! + link.value * scale;
  }

  const laidLinks: LaidLink[] = links.map((link, index) => {
    const from = nodes[link.source]!;
    const to = nodes[link.target]!;
    const h = link.value * scale;
    const x0 = r2(from.x + NODE_W);
    const x1 = r2(to.x);
    const xm = r2((x0 + x1) / 2);
    const s0 = r2(sy[index] ?? 0);
    const s1 = r2((sy[index] ?? 0) + h);
    const t0 = r2(ty[index] ?? 0);
    const t1 = r2((ty[index] ?? 0) + h);
    return {
      index,
      source: link.source,
      target: link.target,
      value: link.value,
      fill: from.fill,
      d: `M${x0} ${s0}C${xm} ${s0} ${xm} ${t0} ${x1} ${t0}V${t1}C${xm} ${t1} ${xm} ${s1} ${x0} ${s1}Z`,
    };
  });

  const total = nodes.filter((node) => node.depth === 0).reduce((acc, node) => acc + node.value, 0);
  return { nodes, links: laidLinks, maxDepth, total };
}

/** Everything upstream and downstream of the hovered node, or of the hovered ribbon's ends. */
function litPath(hover: Hover, layout: Layout) {
  if (!hover) return null;
  const nodes = new Set<number>();
  const links = new Set<number>();
  const walk = (start: number, dir: "up" | "down") => {
    const queue = [start];
    while (queue.length) {
      const at = queue.shift()!;
      for (const link of layout.links) {
        const from = dir === "down" ? link.source : link.target;
        const to = dir === "down" ? link.target : link.source;
        if (from !== at || links.has(link.index)) continue;
        links.add(link.index);
        nodes.add(to);
        queue.push(to);
      }
    }
  };
  if (hover.kind === "node") {
    nodes.add(hover.index);
    walk(hover.index, "up");
    walk(hover.index, "down");
  } else {
    const link = layout.links[hover.index];
    if (!link) return null;
    links.add(link.index);
    nodes.add(link.source).add(link.target);
    walk(link.source, "up");
    walk(link.target, "down");
  }
  return { nodes, links };
}

/** 0 to 1 eased progress that restarts whenever `key` changes; 1 throughout when disabled. */
function useSweep(key: string, disabled: boolean) {
  const [progress, setProgress] = useState(0);
  const [lastKey, setLastKey] = useState(key);
  if (lastKey !== key) {
    setLastKey(key);
    setProgress(0);
  }
  useEffect(() => {
    if (disabled) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      // rAF's timestamp is the frame's start, which can precede the effect's
      // performance.now() after a long commit; unclamped, t < 0 gives a
      // negative clip width.
      const t = Math.min(1, Math.max(0, (now - start) / SWEEP_MS));
      setProgress(easeOutCubic(t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [key, disabled]);
  return disabled ? 1 : progress;
}
// #endregion

export type SankeyChartCardProps = {
  /** Card label while nothing is hovered; also the card's accessible name. */
  title?: string;
  /** Periods, each with its own nodes and links; the select appears with two or more. */
  ranges?: FlowRange[];
  /** A single data set; with `links` it replaces `ranges` and hides the select. */
  nodes?: FlowNode[];
  links?: FlowLink[];
  /** Headline chip when `nodes`/`links` are used. */
  delta?: number;
  range?: string;
  defaultRange?: string;
  onRangeChange?: (id: string) => void;
  /** Formats the headline, the left labels and the hovered values. Defaults to whole hours. */
  formatValue?: (value: number) => string;
  /** Caption under the first column. */
  sourceCaption?: string;
  /** Caption under the last column. */
  targetCaption?: string;
  /** Chart height in px. */
  chartHeight?: number;
  className?: string;
};

export function SankeyChartCard({
  title = "Tracked time",
  ranges = TRACKED_TIME_RANGES,
  nodes: nodesProp,
  links: linksProp,
  delta: deltaProp,
  range: rangeProp,
  defaultRange,
  onRangeChange,
  formatValue = formatHours,
  sourceCaption = "Tracked time",
  targetCaption = "Share of tracked time",
  chartHeight = 340,
  className,
}: SankeyChartCardProps) {
  const reduced = useReducedMotion();
  const [innerRange, setInnerRange] = useState(defaultRange ?? ranges[0]?.id ?? "");
  const rangeId = rangeProp ?? innerRange;
  const activeRange = ranges.find((r) => r.id === rangeId) ?? ranges[0];
  const isStatic = nodesProp !== undefined && linksProp !== undefined;
  const nodesIn = isStatic ? nodesProp : (activeRange?.nodes ?? []);
  const linksIn = isStatic ? linksProp : (activeRange?.links ?? []);
  const delta = isStatic ? deltaProp : activeRange?.delta;

  const boxRef = useRef<HTMLDivElement>(null);
  const { width } = useResizeObserver(boxRef);
  const compact = width > 0 && width < COMPACT_W;
  const left = clamp(width * 0.14, 72, 96);
  const right = clamp(width * 0.26, 104, 168);

  const layout = useMemo(
    () => layoutSankey(nodesIn, linksIn, { width, height: chartHeight, left, right }),
    [nodesIn, linksIn, width, chartHeight, left, right],
  );

  const [hover, setHover] = useState<Hover>(null);
  const lit = litPath(hover, layout);
  const sweep = useSweep(isStatic ? "static" : (activeRange?.id ?? ""), reduced);
  const clipId = `sankey-${useId().replace(/[^\w-]/g, "")}`;

  const hoveredNode = hover?.kind === "node" ? layout.nodes[hover.index] : undefined;
  const hoveredLink = hover?.kind === "link" ? layout.links[hover.index] : undefined;
  const linkFrom = hoveredLink ? layout.nodes[hoveredLink.source] : undefined;
  const linkTo = hoveredLink ? layout.nodes[hoveredLink.target] : undefined;
  const headline = hoveredNode?.value ?? hoveredLink?.value ?? ((!isStatic && activeRange?.headline) || layout.total);

  const selectRange = (id: string) => {
    if (rangeProp === undefined) setInnerRange(id);
    setHover(null);
    onRangeChange?.(id);
  };

  const describe = (node: LaidNode) => {
    const outs = layout.links.filter((l) => l.source === node.index);
    const ins = layout.links.filter((l) => l.target === node.index);
    const list = (items: LaidLink[], end: "source" | "target") =>
      items.map((l) => `${layout.nodes[l[end]]?.name} ${formatValue(l.value)}`).join(", ");
    return [
      `${node.name}: ${formatValue(node.value)}, ${pct(node.value, layout.total)}% of total`,
      ins.length ? `from ${list(ins, "source")}` : "",
      outs.length ? `to ${list(outs, "target")}` : "",
    ]
      .filter(Boolean)
      .join(". ");
  };

  return (
    <ChartCardFrame className={className} aria-label={title}>
      <ChartCardHeader
        label={hoveredNode ? hoveredNode.name : hoveredLink ? `${linkFrom?.name} → ${linkTo?.name}` : title}
        value={headline}
        formatValue={formatValue}
        valueKey={hover ? `${hover.kind}-${hover.index}` : "total"}
        delta={hover ? undefined : delta}
        note={
          hoveredNode
            ? `${pct(hoveredNode.value, layout.total)}% of total`
            : hoveredLink && linkFrom
              ? `${pct(hoveredLink.value, linkFrom.value)}% of ${linkFrom.name}`
              : undefined
        }
        action={
          !isStatic && ranges.length > 1 ? (
            <PeriodSelect options={ranges} selectedId={activeRange?.id ?? ""} onChange={selectRange} />
          ) : undefined
        }
      />

      <div className="flex flex-col gap-3 px-2 pb-2">
        <div
          ref={boxRef}
          role="group"
          aria-label={`${title} flows`}
          className="relative w-full"
          style={{ height: chartHeight }}
          onPointerLeave={() => setHover(null)}
        >
          {width > 0 ? (
            <svg aria-hidden width={width} height={chartHeight} className="absolute inset-0 overflow-visible">
              <defs>
                <clipPath id={clipId}>
                  <rect x={0} y={-1} width={left + NODE_W + sweep * (width - left - NODE_W)} height={chartHeight + 2} />
                </clipPath>
              </defs>
              <g clipPath={`url(#${clipId})`}>
                {layout.links.map((link) => (
                  <path
                    key={link.index}
                    data-link={`${layout.nodes[link.source]?.name}->${layout.nodes[link.target]?.name}`}
                    d={link.d}
                    onPointerEnter={() => setHover({ kind: "link", index: link.index })}
                    onPointerLeave={() =>
                      setHover((h) => (h?.kind === "link" && h.index === link.index ? null : h))
                    }
                    className="cursor-pointer transition-[fill-opacity] duration-200 ease-out motion-reduce:transition-none"
                    style={{
                      fill: link.fill,
                      fillOpacity: !lit ? RIBBON.rest : lit.links.has(link.index) ? RIBBON.lit : RIBBON.dim,
                    }}
                  />
                ))}
              </g>
              {layout.nodes.map((node) =>
                node.y1 - node.y0 > 0 ? (
                  <rect
                    key={node.index}
                    x={node.x}
                    y={node.y0}
                    width={NODE_W}
                    height={Math.max(1, node.y1 - node.y0)}
                    rx={3}
                    onPointerEnter={() => setHover({ kind: "node", index: node.index })}
                    className="cursor-pointer transition-opacity duration-200 ease-out motion-reduce:transition-none"
                    style={{ fill: node.fill, opacity: lit && !lit.nodes.has(node.index) ? 0.3 : 1 }}
                  />
                ) : null,
              )}
            </svg>
          ) : null}

          {width > 0
            ? layout.nodes.map((node) => {
                const first = node.depth === 0 && layout.maxDepth > 0;
                const share = pct(node.value, layout.total);
                const dimmed = lit !== null && !lit.nodes.has(node.index);
                const stacked = first || compact;
                return (
                  <button
                    key={node.index}
                    type="button"
                    aria-label={describe(node)}
                    onPointerEnter={() => setHover({ kind: "node", index: node.index })}
                    onFocus={() => setHover({ kind: "node", index: node.index })}
                    onBlur={() => setHover(null)}
                    className={cx(
                      "absolute flex -translate-y-1/2 cursor-pointer rounded-sm outline-none",
                      "transition-opacity duration-200 ease-out motion-reduce:transition-none",
                      "focus-visible:ring-2 focus-visible:ring-border-focus-ring",
                      stacked ? "flex-col" : "items-baseline gap-1 whitespace-nowrap",
                      first ? "items-end text-right" : "items-start text-left",
                      dimmed && "opacity-40",
                    )}
                    style={{
                      top: (node.y0 + node.y1) / 2,
                      ...(first
                        ? { right: width - node.x + LABEL_GAP, maxWidth: left - LABEL_GAP }
                        : { left: node.x + NODE_W + LABEL_GAP, maxWidth: right - LABEL_GAP }),
                    }}
                  >
                    <span
                      className={cx(
                        "max-w-full truncate text-text-primary",
                        compact ? "text-caption-1-medium" : "text-body-2-medium",
                      )}
                    >
                      {node.name}
                    </span>
                    <span className="text-caption-1-regular text-text-tertiary tabular-nums">
                      {first ? formatValue(node.value) : `${stacked ? "" : "· "}${share}%`}
                    </span>
                  </button>
                );
              })
            : null}
        </div>

        <div className="flex justify-between gap-3 text-caption-1-regular text-text-tertiary">
          <span>{sourceCaption}</span>
          <span className="text-right">{targetCaption}</span>
        </div>
      </div>
    </ChartCardFrame>
  );
}
