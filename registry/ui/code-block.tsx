/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Code Block" (boardui.com/components/line-chart-card).
 * No BoardUI source was used.
 */
"use client";

import { RiFileCodeLine, RiTextWrap } from "@remixicon/react";
import { useMemo, useState } from "react";
import type { CSSProperties, ReactNode, Ref } from "react";

import { cx } from "@/registry/lib/cx";
import { CopyButton } from "@/registry/ui/code-block-copy";
import { TOKEN_CLASS, splitLines, tokenizeTsx } from "@/registry/ui/code-block-tokenize";
import type { Token } from "@/registry/ui/code-block-tokenize";

export type CodeBlockLanguage = "tsx" | "plain";
export type CodeBlockChipTone = "neutral" | "file";

export interface CodeBlockProps {
  /** The source to show and copy. Leading and trailing blank lines are trimmed. */
  code: string;
  /** Label in the header chip: a filename (`line-chart-card.tsx`) or a role (`usage`). */
  filename?: string;
  /** `neutral` is the plain white chip; `file` is the purple file chip with a code glyph. */
  chipTone?: CodeBlockChipTone;
  /** `tsx` runs the built-in tokenizer; `plain` prints the text as is. */
  language?: CodeBlockLanguage;
  /** Gutter with 1-based line numbers (not selectable, not copied). */
  showLineNumbers?: boolean;
  /** 1-based line numbers to tint. */
  highlightLines?: number[];
  /** Soft-wrap long lines (controlled). */
  wrap?: boolean;
  /** Initial soft-wrap state when uncontrolled. */
  defaultWrap?: boolean;
  onWrapChange?: (wrap: boolean) => void;
  /** Hide the wrap toggle in the header. */
  hideWrapToggle?: boolean;
  /** Hide the copy button in the header. */
  hideCopy?: boolean;
  /** Cap the code panel height (px); it scrolls past this. */
  maxHeight?: number;
  /** Extra controls rendered in the header before wrap/copy. */
  actions?: ReactNode;
  onCopied?: (code: string) => void;
  className?: string;
  ref?: Ref<HTMLElement>;
}

function trimBlankEdges(code: string) {
  return code.replace(/^(?:[ \t]*\n)+/, "").replace(/\s+$/, "");
}

function plainTokens(code: string): Token[] {
  return [{ kind: "plain", text: code }];
}

/**
 * A docs code block: filename chip header with wrap and copy actions over a
 * white, inset code panel. TSX is coloured by a ~200 line tokenizer that ships
 * alongside (no highlighter dependency); everything else renders verbatim.
 */
export function CodeBlock({
  code,
  filename,
  chipTone = "neutral",
  language = "tsx",
  showLineNumbers = true,
  highlightLines,
  wrap: controlledWrap,
  defaultWrap = false,
  onWrapChange,
  hideWrapToggle = false,
  hideCopy = false,
  maxHeight,
  actions,
  onCopied,
  className,
  ref,
}: CodeBlockProps) {
  const [uncontrolledWrap, setUncontrolledWrap] = useState(defaultWrap);
  const wrap = controlledWrap ?? uncontrolledWrap;
  const setWrap = (next: boolean) => {
    setUncontrolledWrap(next);
    onWrapChange?.(next);
  };

  const source = useMemo(() => trimBlankEdges(code), [code]);

  // #region critical
  // Tokenize once per source, then cut into rows so each line owns its gutter
  // cell. The gutter is sticky, so numbers stay put while long lines scroll.
  const lines = useMemo(
    () => splitLines(language === "tsx" ? tokenizeTsx(source) : plainTokens(source)),
    [source, language],
  );
  const highlighted = useMemo(() => new Set(highlightLines ?? []), [highlightLines]);
  const gutterCh = String(lines.length).length;

  const rows = lines.map((tokens, index) => {
    const lineNo = index + 1;
    const isHighlighted = highlighted.has(lineNo);
    return (
      <span
        key={lineNo}
        data-line={lineNo}
        data-highlighted={isHighlighted || undefined}
        className={cx("flex min-h-5", isHighlighted && "bg-background-secondary-default")}
      >
        {showLineNumbers && (
          <span
            aria-hidden
            className={cx(
              "sticky start-0 z-10 shrink-0 select-none ps-4 pe-4 text-end text-text-tertiary",
              isHighlighted ? "bg-background-secondary-default" : "bg-docs-code-background",
            )}
            style={{ width: `calc(${gutterCh}ch + 2rem)` }}
          >
            {lineNo}
          </span>
        )}
        <span
          className={cx(
            "min-w-0 flex-1 pe-5",
            !showLineNumbers && "ps-5",
            wrap ? "whitespace-pre-wrap break-words" : "whitespace-pre",
          )}
        >
          {tokens.map((token, t) => (
            <span key={t} className={TOKEN_CLASS[token.kind]}>
              {token.text}
            </span>
          ))}
          {"\n"}
        </span>
      </span>
    );
  });
  // #endregion

  const panelStyle: CSSProperties | undefined = maxHeight ? { maxHeight } : undefined;
  const hasHeader = Boolean(filename || actions || !hideCopy || !hideWrapToggle);

  return (
    <figure
      ref={ref}
      className={cx("flex w-full min-w-0 flex-col rounded-2xl bg-background-secondary-default p-1.5", className)}
    >
      {hasHeader && (
        <figcaption className="flex min-h-9 items-center justify-between gap-2 ps-0.5 pe-0.5 pb-1.5">
          {filename ? (
            chipTone === "file" ? (
              <span className="inline-flex min-w-0 items-center gap-1.5 rounded-lg border border-docs-file-chip-border bg-docs-file-chip-background px-2 py-0.5 font-mono text-body-2-medium text-docs-file-chip-foreground">
                <RiFileCodeLine aria-hidden className="size-3.5 shrink-0" />
                <span className="truncate">{filename}</span>
              </span>
            ) : (
              <span className="inline-flex min-w-0 items-center rounded-lg bg-background-primary-default px-2.5 py-1 text-body-medium text-text-primary shadow-2xs">
                <span className="truncate">{filename}</span>
              </span>
            )
          ) : (
            <span />
          )}
          <span className="flex shrink-0 items-center gap-0.5">
            {actions}
            {!hideWrapToggle && (
              <button
                type="button"
                aria-label="Wrap lines"
                aria-pressed={wrap}
                onClick={() => setWrap(!wrap)}
                className={cx(
                  "inline-flex size-8 cursor-pointer items-center justify-center rounded-lg transition-colors duration-150 ease-out",
                  "outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
                  wrap
                    ? "bg-background-primary-default text-foreground-icon-primary shadow-2xs"
                    : "text-foreground-icon-secondary hover:bg-background-secondary-hover hover:text-foreground-icon-primary",
                )}
              >
                <RiTextWrap aria-hidden className="size-[18px]" />
              </button>
            )}
            {!hideCopy && <CopyButton value={source} onCopied={onCopied} />}
          </span>
        </figcaption>
      )}
      <div className="overflow-hidden rounded-xl bg-docs-code-background shadow-xs">
        <pre
          tabIndex={0}
          aria-label={filename ? `${filename} source` : "Code"}
          style={panelStyle}
          className="overflow-auto py-4 font-mono text-body-regular outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:ring-inset"
        >
          <code className={cx("flex flex-col", wrap ? "w-full" : "w-max min-w-full")}>{rows}</code>
        </pre>
      </div>
    </figure>
  );
}
