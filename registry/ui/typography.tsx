/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Typography" (boardui.com/components/typography).
 * No BoardUI source was used.
 */
"use client";

import { RiCheckLine } from "@remixicon/react";
import { useEffect, useRef, useState } from "react";
import type { Ref } from "react";

import { cx } from "@/registry/lib/cx";
import { useCopyToClipboard } from "@/registry/ui/code-block-copy";

export type TypeWeight = "regular" | "medium" | "semibold" | "bold";

export interface TypeWeightInfo {
  id: TypeWeight;
  name: string;
}

export const TYPE_WEIGHTS: readonly TypeWeightInfo[] = [
  { id: "regular", name: "Regular" },
  { id: "medium", name: "Medium" },
  { id: "semibold", name: "Semibold" },
  { id: "bold", name: "Bold" },
];

export interface TypeFamily {
  id: string;
  name: string;
  /** Where the style is used, shown under the family heading. */
  usage: string;
  /**
   * The composite utility for each weight. Written out in full (never built
   * with a template string) so Tailwind's scanner sees every class.
   */
  classes: Record<TypeWeight, string>;
}

/** The 13 text-{family}-{weight} families of the kit theme, largest first. */
export const TYPE_SCALE: readonly TypeFamily[] = [
  {
    id: "large-title",
    name: "Large Title",
    usage: "Hero numerals and marketing-scale headings.",
    classes: { regular: "text-large-title-regular", medium: "text-large-title-medium", semibold: "text-large-title-semibold", bold: "text-large-title-bold" },
  },
  {
    id: "display-1",
    name: "Display 1",
    usage: "Full-page hero headings.",
    classes: { regular: "text-display-1-regular", medium: "text-display-1-medium", semibold: "text-display-1-semibold", bold: "text-display-1-bold" },
  },
  {
    id: "display-2",
    name: "Display 2",
    usage: "Large section heroes.",
    classes: { regular: "text-display-2-regular", medium: "text-display-2-medium", semibold: "text-display-2-semibold", bold: "text-display-2-bold" },
  },
  {
    id: "display-3",
    name: "Display 3",
    usage: "Prominent stats and page heroes.",
    classes: { regular: "text-display-3-regular", medium: "text-display-3-medium", semibold: "text-display-3-semibold", bold: "text-display-3-bold" },
  },
  {
    id: "display-4",
    name: "Display 4",
    usage: "Page titles; the largest style used inside the app shell.",
    classes: { regular: "text-display-4-regular", medium: "text-display-4-medium", semibold: "text-display-4-semibold", bold: "text-display-4-bold" },
  },
  {
    id: "title-1",
    name: "Title 1",
    usage: "Card headline figures (step totals, earnings).",
    classes: { regular: "text-title-1-regular", medium: "text-title-1-medium", semibold: "text-title-1-semibold", bold: "text-title-1-bold" },
  },
  {
    id: "title-2",
    name: "Title 2",
    usage: "Section headings inside pages and panels.",
    classes: { regular: "text-title-2-regular", medium: "text-title-2-medium", semibold: "text-title-2-semibold", bold: "text-title-2-bold" },
  },
  {
    id: "title-3",
    name: "Title 3",
    usage: "Sub-section headings, calendar month titles.",
    classes: { regular: "text-title-3-regular", medium: "text-title-3-medium", semibold: "text-title-3-semibold", bold: "text-title-3-bold" },
  },
  {
    id: "headline",
    name: "Headline",
    usage: "Emphasized body copy and lead paragraphs.",
    classes: { regular: "text-headline-regular", medium: "text-headline-medium", semibold: "text-headline-semibold", bold: "text-headline-bold" },
  },
  {
    id: "body",
    name: "Body",
    usage: "The default UI text: labels, table cells, nav items.",
    classes: { regular: "text-body-regular", medium: "text-body-medium", semibold: "text-body-semibold", bold: "text-body-bold" },
  },
  {
    id: "body-2",
    name: "Body 2",
    usage: "Dense contexts: compact tables, secondary descriptions.",
    classes: { regular: "text-body-2-regular", medium: "text-body-2-medium", semibold: "text-body-2-semibold", bold: "text-body-2-bold" },
  },
  {
    id: "caption-1",
    name: "Caption 1",
    usage: "Axis labels, unit suffixes, timestamps.",
    classes: { regular: "text-caption-1-regular", medium: "text-caption-1-medium", semibold: "text-caption-1-semibold", bold: "text-caption-1-bold" },
  },
  {
    id: "caption-2",
    name: "Caption 2",
    usage: "The smallest legible annotations (badges, fine print).",
    classes: { regular: "text-caption-2-regular", medium: "text-caption-2-medium", semibold: "text-caption-2-semibold", bold: "text-caption-2-bold" },
  },
];

export interface TypeMetrics {
  fontSize: number;
  lineHeight: number;
  /** In px; 0 when the style sets none. */
  letterSpacing: number;
  fontWeight: number;
}

function px(value: string): number {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function fmt(n: number): string {
  return `${Math.round(n * 100) / 100}px`;
}

/** Reads the metrics a composite text utility actually resolves to. */
export function readTypeMetrics(element: Element): TypeMetrics {
  const style = getComputedStyle(element);
  const fontSize = px(style.fontSize);
  return {
    fontSize,
    // "normal" only happens when a utility sets no line height; approximate it.
    lineHeight: style.lineHeight === "normal" ? Math.round(fontSize * 1.2) : px(style.lineHeight),
    letterSpacing: style.letterSpacing === "normal" ? 0 : px(style.letterSpacing),
    fontWeight: Number.parseInt(style.fontWeight, 10) || 400,
  };
}

/** "18px / 24–26px · tracking 0.15px", ranged when weights differ. */
export function formatFamilyMetrics(metrics: readonly TypeMetrics[]): string {
  const first = metrics[0];
  if (!first) return "";
  const heights = metrics.map((m) => m.lineHeight);
  const lo = Math.min(...heights);
  const hi = Math.max(...heights);
  const line = lo === hi ? fmt(lo) : `${Math.round(lo * 100) / 100}–${fmt(hi)}`;
  const tracking = first.letterSpacing ? ` · tracking ${fmt(first.letterSpacing)}` : "";
  return `${fmt(first.fontSize)} / ${line}${tracking}`;
}

function TokenCopy({ token }: { token: string }) {
  const { copied, copy } = useCopyToClipboard(1400);
  return (
    <button
      type="button"
      onClick={() => void copy(token)}
      aria-label={copied ? `Copied ${token}` : `Copy ${token}`}
      className={cx(
        "-ms-1.5 inline-flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 font-mono whitespace-nowrap sm:ms-0 sm:-me-1.5 text-caption-1-regular text-text-secondary outline-none",
        "transition-colors duration-150 ease-out motion-reduce:transition-none",
        "hover:bg-background-secondary-default hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring",
      )}
    >
      {copied && <RiCheckLine aria-hidden className="size-3.5 text-status-lime-text" />}
      {token}
    </button>
  );
}

export interface TypeFamilySectionProps {
  family: TypeFamily;
  weights?: readonly TypeWeight[];
  sample?: string;
  /** Heading level of the family name. */
  headingLevel?: 2 | 3 | 4;
  className?: string;
}

/** One family: heading with metrics read from the rendered rows, then a card of weight rows. */
export function TypeFamilySection({
  family,
  weights = ["regular", "medium", "semibold", "bold"],
  sample = "The five boxing wizards jump quickly.",
  headingLevel = 3,
  className,
}: TypeFamilySectionProps) {
  const sampleRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const [metrics, setMetrics] = useState<(TypeMetrics | null)[]>([]);
  const weightKey = weights.join(",");

  // #region critical
  // Metrics come from getComputedStyle on the rendered sample, not from a
  // table in this file, so the specimen always shows what the theme CSS
  // really resolves to (including a rem change or an overridden token).
  useEffect(() => {
    const read = () =>
      setMetrics(
        weightKey.split(",").map((_, i) => {
          const el = sampleRefs.current[i];
          return el ? readTypeMetrics(el) : null;
        }),
      );
    read();
    // Page zoom and responsive root sizes arrive as a resize; re-read then.
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, [family.id, weightKey]);
  // #endregion

  const measured = metrics.filter((m): m is TypeMetrics => m !== null);
  const Heading = `h${headingLevel}` as const;

  return (
    <section aria-labelledby={`type-${family.id}`} className={cx("flex flex-col gap-3", className)} data-family={family.id}>
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <Heading id={`type-${family.id}`} className="text-title-2-regular text-text-primary">
            {family.name}
          </Heading>
          <span className="font-mono text-caption-1-regular text-text-tertiary" data-metrics>
            {measured.length ? formatFamilyMetrics(measured) : " "}
          </span>
        </div>
        <p className="text-body-regular text-text-secondary">{family.usage}</p>
      </div>
      <ul className="flex flex-col overflow-hidden rounded-2xl border border-border-button-default bg-background-primary-default">
        {weights.map((weight, i) => {
          const token = family.classes[weight];
          const m = metrics[i];
          const name = TYPE_WEIGHTS.find((w) => w.id === weight)?.name ?? weight;
          return (
            <li
              key={weight}
              className="flex flex-col gap-2 border-b border-border-button-default px-4 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
            >
              <p
                ref={(el) => {
                  sampleRefs.current[i] = el;
                }}
                className={cx("min-w-0 break-words text-text-primary", token)}
              >
                {sample}
              </p>
              <div className="flex shrink-0 flex-row flex-wrap items-center gap-x-2 gap-y-0.5 sm:flex-col sm:items-end sm:gap-0.5">
                <TokenCopy token={token} />
                <span className="text-caption-1-regular whitespace-nowrap text-text-tertiary">
                  {name} · {m ? m.fontWeight : "–"}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export interface TypographyProps {
  /** Family ids to show, in scale order. Defaults to all 13. */
  families?: readonly string[];
  /** Weights to show per family. */
  weights?: readonly TypeWeight[];
  /** Sample sentence for every row. */
  sample?: string;
  headingLevel?: 2 | 3 | 4;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

/** The kit type scale as a specimen: every family, every weight, with live metrics and copyable token names. */
export function Typography({ families, weights, sample, headingLevel, className, ref }: TypographyProps) {
  const list = families ? TYPE_SCALE.filter((f) => families.includes(f.id)) : TYPE_SCALE;
  return (
    <div ref={ref} className={cx("flex flex-col gap-10", className)}>
      {list.map((family) => (
        <TypeFamilySection key={family.id} family={family} weights={weights} sample={sample} headingLevel={headingLevel} />
      ))}
    </div>
  );
}
