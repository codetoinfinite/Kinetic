/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Preview Code Tabs" (boardui.com/components/line-chart-card).
 * No BoardUI source was used.
 */
"use client";

import { RiCodeSSlashLine, RiEyeLine } from "@remixicon/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode, Ref } from "react";
import { Tab, TabList, TabPanel, Tabs } from "react-aria-components";
import type { Key } from "react-aria-components";

import { cx } from "@/registry/lib/cx";
import { CodeBlock } from "@/registry/ui/code-block";
import type { CodeBlockLanguage } from "@/registry/ui/code-block";

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export type PreviewCodeTab = "preview" | "code";

export interface PreviewCodeTabsProps {
  /** The live example rendered in the preview pane. */
  children: ReactNode;
  /** Source shown in the code pane and copied by its copy button. */
  code: string;
  /** Chip label above the code, e.g. `usage` or `line-chart-card.tsx`. */
  filename?: string;
  /** Tokenize the code as TSX or print it verbatim. */
  language?: CodeBlockLanguage;
  /** Selected tab (controlled). */
  selectedTab?: PreviewCodeTab;
  /** Initial tab when uncontrolled. */
  defaultSelectedTab?: PreviewCodeTab;
  onSelectedTabChange?: (tab: PreviewCodeTab) => void;
  /** Controls placed at the end of the tab row (copy page, open in new tab…). */
  actions?: ReactNode;
  previewLabel?: string;
  codeLabel?: string;
  /** Accessible name of the tab list. */
  "aria-label"?: string;
  /** Minimum height of the preview pane, px. */
  minHeight?: number;
  /** Height cap of the code pane, px; it scrolls past this. */
  codeMaxHeight?: number;
  onCopied?: (code: string) => void;
  previewClassName?: string;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

type Thumb = { left: number; top: number; width: number; height: number };

const TAB_CLASS = cx(
  "relative z-10 inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-body-medium outline-none",
  "text-text-secondary transition-colors duration-150 ease-out hover:text-text-primary",
  "data-[selected]:text-text-primary",
  "data-[focus-visible]:ring-2 data-[focus-visible]:ring-border-focus-ring",
);

function isTab(key: Key): key is PreviewCodeTab {
  return key === "preview" || key === "code";
}

/**
 * The docs "Preview / Code" switcher: a pill track with a sliding white
 * thumb over a bordered preview stage, and the same example's source in a
 * code block on the second tab. Built on react-aria `Tabs`, so arrow keys,
 * Home/End and the tab/tabpanel wiring come for free.
 */
export function PreviewCodeTabs({
  children,
  code,
  filename,
  language = "tsx",
  selectedTab,
  defaultSelectedTab = "preview",
  onSelectedTabChange,
  actions,
  previewLabel = "Preview",
  codeLabel = "Code",
  "aria-label": ariaLabel = "Example view",
  minHeight = 320,
  codeMaxHeight = 420,
  onCopied,
  previewClassName,
  className,
  ref,
}: PreviewCodeTabsProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<Thumb | null>(null);

  // #region critical
  // The thumb is a sibling of the TabList (a collection can only hold Tabs), so
  // it is positioned from the selected tab's offset box inside the track. A
  // ResizeObserver catches font loading and label changes; a MutationObserver
  // on `data-selected` catches selection, controlled or not.
  useIsomorphicLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const measure = () => {
      const selected = track.querySelector<HTMLElement>('[role="tab"][data-selected]');
      if (!selected) return;
      setThumb((prev) => {
        const next = {
          left: selected.offsetLeft,
          top: selected.offsetTop,
          width: selected.offsetWidth,
          height: selected.offsetHeight,
        };
        return prev &&
          prev.left === next.left &&
          prev.top === next.top &&
          prev.width === next.width &&
          prev.height === next.height
          ? prev
          : next;
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(track);
    track.querySelectorAll('[role="tab"]').forEach((tab) => ro.observe(tab));
    const mo = new MutationObserver(measure);
    mo.observe(track, { attributes: true, subtree: true, attributeFilter: ["data-selected"] });
    return () => {
      mo.disconnect();
      ro.disconnect();
    };
  }, []);
  // #endregion

  return (
    <Tabs
      ref={ref}
      selectedKey={selectedTab}
      defaultSelectedKey={selectedTab === undefined ? defaultSelectedTab : undefined}
      onSelectionChange={(key) => {
        if (isTab(key)) onSelectedTabChange?.(key);
      }}
      className={cx("flex w-full min-w-0 flex-col gap-3", className)}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div ref={trackRef} className="relative inline-flex rounded-xl bg-segmented-control-background p-1">
          {thumb && (
            <span
              aria-hidden
              data-thumb
              className="pointer-events-none absolute left-0 top-0 rounded-lg bg-segmented-control-selected-background shadow-2xs transition-[transform,width,height] duration-200 ease-out motion-reduce:transition-none"
              style={{
                transform: `translate(${thumb.left}px, ${thumb.top}px)`,
                width: thumb.width,
                height: thumb.height,
              }}
            />
          )}
          <TabList aria-label={ariaLabel} className="flex gap-0.5">
            <Tab id="preview" className={TAB_CLASS}>
              <RiEyeLine aria-hidden className="size-4" />
              {previewLabel}
            </Tab>
            <Tab id="code" className={TAB_CLASS}>
              <RiCodeSSlashLine aria-hidden className="size-4" />
              {codeLabel}
            </Tab>
          </TabList>
        </div>
        {actions && <div className="flex items-center gap-1">{actions}</div>}
      </div>

      {/* The preview stays mounted while the code tab is open, so the example
          keeps whatever state the reader gave it. */}
      <TabPanel
        id="preview"
        shouldForceMount
        className={({ isInert }) =>
          cx(
            "flex min-w-0 items-center justify-center overflow-auto rounded-[20px] border border-border-button-default bg-background-full p-6 outline-none sm:p-10",
            "focus-visible:ring-2 focus-visible:ring-border-focus-ring",
            isInert && "hidden",
            previewClassName,
          )
        }
        style={{ minHeight }}
      >
        {children}
      </TabPanel>
      {/* Same floor as the stage, so switching tabs never makes the page jump. */}
      <TabPanel id="code" className="min-w-0 outline-none" style={{ minHeight }}>
        <CodeBlock code={code} filename={filename} language={language} maxHeight={codeMaxHeight} onCopied={onCopied} />
      </TabPanel>
    </Tabs>
  );
}
