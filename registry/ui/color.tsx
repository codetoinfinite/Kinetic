/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Color" (boardui.com/components/color).
 * No BoardUI source was used.
 */
"use client";

import { RiCheckLine, RiFileCopyLine } from "@remixicon/react";
import { useEffect, useState } from "react";
import type { Ref } from "react";

import { cx } from "@/registry/lib/cx";
import { useCopyToClipboard } from "@/registry/ui/code-block-copy";

export interface ColorToken {
  /** The custom property, e.g. `--color-text-primary`. */
  name: string;
  /** The utility that consumes it, e.g. `text-text-primary`. Display only. */
  utility: string;
}

export interface ColorGroup {
  id: string;
  title: string;
  description: string;
  tokens: readonly ColorToken[];
}

/** Display-only helper: `--color-<path>` plus the `<prefix>-<path>` utility that reads it. */
function tokens(prefix: string, paths: readonly string[]): ColorToken[] {
  return paths.map((path) => ({ name: `--color-${path}`, utility: `${prefix}-${path}` }));
}

/** The semantic layer of the kit theme, grouped by role. */
export const COLOR_GROUPS: readonly ColorGroup[] = [
  {
    id: "background",
    title: "Background",
    description: "Surface fills, from the outer canvas through nested primary, secondary, tertiary and quaternary surfaces with their hover states.",
    tokens: tokens("bg", [
      "background-full",
      "background-primary-default",
      "background-primary-hover",
      "background-primary-active",
      "background-primary-disabled",
      "background-inner-default",
      "background-secondary-default",
      "background-secondary-hover",
      "background-tertiary-default",
      "background-tertiary-hover",
      "background-tertiary-error",
      "background-quaternary-default",
      "background-quaternary-hover",
      "background-quaternary-error",
    ]),
  },
  {
    id: "text",
    title: "Text",
    description: "The copy hierarchy: primary for headings and values, secondary for supporting copy, tertiary for hints, then disabled, error and on-colour text.",
    tokens: [
      ...tokens("text", [
        "text-primary",
        "text-secondary",
        "text-tertiary",
        "text-disabled",
        "text-disabled-danger",
        "text-error-primary",
        "text-destructive",
      ]),
      { name: "--color-text-placeholder", utility: "placeholder:text-text-placeholder" },
      { name: "--color-text-error-placeholder", utility: "placeholder:text-text-error-placeholder" },
      { name: "--color-text-white", utility: "text-text-white" },
    ],
  },
  {
    id: "border",
    title: "Border",
    description: "Hairlines, control outlines and the focus ring. Button and checkbox borders get darker from default to hover to active.",
    tokens: [
      ...tokens("border", [
        "border-button-default",
        "border-button-hover",
        "border-button-active",
        "border-button-white",
        "border-button-group",
        "border-checkbox-default",
        "border-checkbox-hover",
        "border-checkbox-active",
        "border-table",
        "border-error-default",
        "separator-border",
        "separator-border-strong",
      ]),
      { name: "--color-border-focus-ring", utility: "ring-border-focus-ring" },
    ],
  },
  {
    id: "status",
    title: "Status",
    description: "Feedback colours for badges, chips and deltas. Each hue pairs a tinted background with a text colour that stays readable on it.",
    tokens: [
      { name: "--color-state-success-base", utility: "bg-state-success-base" },
      { name: "--color-state-success-text", utility: "text-state-success-text" },
      ...["lime", "yellow", "orange", "rose", "cyan", "blue", "purple"].flatMap((hue) => [
        { name: `--color-status-${hue}-background`, utility: `bg-status-${hue}-background` },
        { name: `--color-status-${hue}-text`, utility: `text-status-${hue}-text` },
      ]),
    ],
  },
  {
    id: "chart",
    title: "Chart",
    description: "Series colours. Track sits behind a bar or ring, cursor marks the hover line, and each numbered hue has an active step one tone darker for emphasis.",
    tokens: [
      ...tokens("fill", ["chart-track", "chart-cursor", "chart-neutral"]),
      ...Array.from({ length: 9 }, (_, i) => tokens("fill", [`chart-${i + 1}`, `chart-${i + 1}-active`])).flat(),
    ],
  },
];

export interface ThemeValue {
  /** Raw declared value under `:root`, e.g. `var(--color-neutral-950)`. */
  light?: string;
  /** Raw declared value under `.dark`; falls back to `light` when not overridden. */
  dark?: string;
}

// #region critical
function collect(rules: CSSRuleList, names: ReadonlySet<string>, out: Map<string, ThemeValue>) {
  for (const rule of Array.from(rules)) {
    if (rule instanceof CSSImportRule) {
      if (rule.styleSheet) safeCollect(rule.styleSheet, names, out);
    } else if (rule instanceof CSSStyleRule) {
      // Only the two theme scopes count; `.dark[data-accent]` and friends are refinements.
      const selectors = rule.selectorText.split(",").map((s) => s.trim());
      const scope = selectors.includes(".dark") ? "dark" : selectors.includes(":root") ? "light" : null;
      if (!scope) continue;
      for (const name of names) {
        const value = rule.style.getPropertyValue(name).trim();
        if (value) out.set(name, { ...out.get(name), [scope]: value });
      }
    } else if (!(rule instanceof CSSMediaRule) && "cssRules" in rule) {
      // @layer / @supports blocks; @media is skipped so a colour-scheme query is never read as light.
      collect((rule as CSSGroupingRule).cssRules, names, out);
    }
  }
}

function safeCollect(sheet: CSSStyleSheet, names: ReadonlySet<string>, out: Map<string, ThemeValue>) {
  try {
    collect(sheet.cssRules, names, out);
  } catch {
    // Cross-origin sheets throw on cssRules; they never hold the kit theme.
  }
}

/**
 * Reads what each token is declared as in the light (`:root`) and dark
 * (`.dark`) scopes straight from the loaded stylesheets, so the table shows
 * both themes no matter which one the page is in. Client only.
 */
export function readThemeValues(names: readonly string[]): Map<string, ThemeValue> {
  const out = new Map<string, ThemeValue>();
  const wanted = new Set(names);
  for (const sheet of Array.from(document.styleSheets)) safeCollect(sheet, wanted, out);
  for (const [name, value] of out) if (!value.dark && value.light) out.set(name, { ...value, dark: value.light });
  return out;
}
// #endregion

/** `var(--color-neutral-950)` → `neutral-950`; `color-mix(in srgb, var(--color-neutral-800) 60%, transparent)` → `neutral-800 / 60%`. */
export function formatColorValue(raw: string): string {
  const v = raw.replace(/\s+/g, " ").trim();
  const ref = /^var\(--color-([a-z0-9-]+)\)$/.exec(v);
  if (ref) return ref[1]!;
  const mix = /^color-mix\(in [a-z]+, ?var\(--color-([a-z0-9-]+)\) ([\d.]+%), ?transparent\)$/.exec(v);
  if (mix) return `${mix[1]} / ${mix[2]}`;
  return v;
}

const ROW_GRID =
  "grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-2.5 sm:grid-cols-[minmax(0,1fr)_9.5rem_9.5rem] sm:gap-x-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_9.5rem_9.5rem]";

function ValueCell({ raw, label }: { raw: string | undefined; label: string }) {
  return (
    <span role="cell" className="flex min-w-0 items-center gap-2">
      <span
        aria-hidden
        className="size-3.5 shrink-0 rounded-[4px] ring-1 ring-border-button-default ring-inset"
        style={raw ? { background: raw } : undefined}
      />
      <span className="sr-only">{label}: </span>
      <span className="min-w-0 truncate font-mono text-caption-1-regular text-text-secondary max-sm:sr-only" title={raw}>
        {raw ? formatColorValue(raw) : "–"}
      </span>
    </span>
  );
}

export interface ColorTokenTableProps {
  group: ColorGroup;
  /** Raw light/dark values from `readThemeValues`; empty until mounted. */
  values: ReadonlyMap<string, ThemeValue>;
  /** Token currently showing the copied check. */
  copiedName?: string | null;
  onCopy: (name: string) => void;
  headingLevel?: 2 | 3 | 4;
  className?: string;
}

/** One group: heading, description and a table of swatch, variable, utility, light and dark value. */
export function ColorTokenTable({ group, values, copiedName, onCopy, headingLevel = 3, className }: ColorTokenTableProps) {
  const Heading = `h${headingLevel}` as const;
  return (
    <section aria-labelledby={`color-${group.id}`} className={cx("flex flex-col gap-3", className)} data-group={group.id}>
      <div className="flex flex-col gap-1">
        <Heading id={`color-${group.id}`} className="text-title-3-regular text-text-primary">
          {group.title}
        </Heading>
        <p className="max-w-[640px] text-body-regular text-text-secondary">{group.description}</p>
      </div>
      <div
        role="table"
        aria-labelledby={`color-${group.id}`}
        className="overflow-hidden rounded-2xl border border-border-button-default bg-background-primary-default"
      >
        <div role="rowgroup">
          <div
            role="row"
            className={cx(ROW_GRID, "border-b border-border-button-default px-3 py-2.5 text-caption-1-medium sm:px-4 text-text-tertiary uppercase")}
          >
            <span role="columnheader" className="ps-[34px]">Token</span>
            <span role="columnheader" className="hidden lg:block">Tailwind class</span>
            <span role="columnheader" className="max-sm:sr-only">Light</span>
            <span role="columnheader" className="max-sm:sr-only">Dark</span>
          </div>
        </div>
        <div role="rowgroup">
          {group.tokens.map((token) => {
            const value = values.get(token.name);
            const copied = copiedName === token.name;
            return (
              <div
                key={token.name}
                role="row"
                className={cx(ROW_GRID, "border-b border-border-button-default px-3 py-2 last:border-b-0 sm:px-4")}
              >
                <span role="cell" className="flex min-w-0 flex-col">
                  <button
                    type="button"
                    onClick={() => onCopy(token.name)}
                    aria-label={copied ? `Copied ${token.name}` : `Copy ${token.name}`}
                    className={cx(
                      "group -ms-1.5 flex min-w-0 cursor-pointer items-center gap-3 rounded-lg px-1.5 py-1 text-start outline-none",
                      "transition-colors duration-150 ease-out motion-reduce:transition-none",
                      "hover:bg-background-secondary-default focus-visible:ring-2 focus-visible:ring-border-focus-ring",
                    )}
                  >
                    <span
                      aria-hidden
                      className="size-[22px] shrink-0 rounded-md ring-1 ring-border-button-default ring-inset"
                      style={{ background: `var(${token.name})` }}
                    />
                    <span className="min-w-0 font-mono text-body-2-regular break-all text-text-primary sm:truncate">{token.name}</span>
                    {copied ? (
                      <RiCheckLine aria-hidden className="size-3.5 shrink-0 text-status-lime-text" />
                    ) : (
                      <RiFileCopyLine
                        aria-hidden
                        className="size-3.5 shrink-0 text-foreground-icon-tertiary opacity-0 max-sm:hidden transition-opacity duration-150 ease-out group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
                      />
                    )}
                  </button>
                  <span className="ps-[34px] font-mono text-caption-1-regular break-all text-text-tertiary sm:truncate lg:hidden">
                    {token.utility}
                  </span>
                </span>
                <span role="cell" className="hidden min-w-0 truncate font-mono text-caption-1-regular text-text-secondary lg:block">
                  {token.utility}
                </span>
                <ValueCell raw={value?.light} label="Light" />
                <ValueCell raw={value?.dark} label="Dark" />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export interface ColorPaletteProps {
  /** Group ids to show, in `COLOR_GROUPS` order. Defaults to all five. */
  groups?: readonly string[];
  /** Case-insensitive filter on the variable and utility names. */
  query?: string;
  headingLevel?: 2 | 3 | 4;
  /** Called with the variable name after it reaches the clipboard. */
  onCopied?: (name: string) => void;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

/** The kit's semantic colour tokens as grouped swatch tables. Clicking a token copies its variable name. */
export function ColorPalette({ groups, query = "", headingLevel, onCopied, className, ref }: ColorPaletteProps) {
  const [values, setValues] = useState<ReadonlyMap<string, ThemeValue>>(() => new Map());
  const [lastCopied, setLastCopied] = useState<string | null>(null);
  const { copied, copy } = useCopyToClipboard(1400);

  useEffect(() => {
    // Declared values do not change with the theme (the swatch uses var() for that), so one read is enough.
    setValues(readThemeValues(COLOR_GROUPS.flatMap((g) => g.tokens.map((t) => t.name))));
  }, []);

  const q = query.trim().toLowerCase();
  const visible = COLOR_GROUPS.filter((g) => !groups || groups.includes(g.id))
    .map((g) => (q ? { ...g, tokens: g.tokens.filter((t) => t.name.includes(q) || t.utility.includes(q)) } : g))
    .filter((g) => g.tokens.length > 0);

  const handleCopy = (name: string) => {
    setLastCopied(name);
    void copy(name).then((ok) => {
      if (ok) onCopied?.(name);
    });
  };

  return (
    <div ref={ref} className={cx("flex flex-col gap-10", className)}>
      {visible.map((group) => (
        <ColorTokenTable
          key={group.id}
          group={group}
          values={values}
          copiedName={copied ? lastCopied : null}
          onCopy={handleCopy}
          headingLevel={headingLevel}
        />
      ))}
      {visible.length === 0 && (
        <p className="py-10 text-center text-body-regular text-text-tertiary">No tokens match “{query.trim()}”.</p>
      )}
      <span role="status" className="sr-only">
        {copied && lastCopied ? `Copied ${lastCopied}` : ""}
      </span>
    </div>
  );
}
