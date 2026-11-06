/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Template Showcase Tabs" (boardui.com/).
 * No BoardUI source was used.
 */
"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { Tab, TabList, TabPanel, Tabs } from "react-aria-components";
import type { Key } from "react-aria-components";
import { cx } from "@/registry/lib/cx";
import { useReducedMotion } from "@/registry/hooks/use-reduced-motion";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export interface TemplateShowcaseItem {
  id: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  /** Miniature layout shown in the preview area. Rendered as a picture (role="img"). */
  preview: ReactNode;
}

export interface TemplateShowcaseTabsProps {
  items: TemplateShowcaseItem[];
  selectedKey?: string;
  defaultSelectedKey?: string;
  onSelectionChange?: (id: string) => void;
  /** Right side of the tab bar, e.g. a "Live preview" button. The function form gets the selected item. */
  action?: ReactNode | ((item: TemplateShowcaseItem) => ReactNode);
  "aria-label"?: string;
  className?: string;
}

interface Pill {
  left: number;
  width: number;
}

// #region critical
/**
 * A framed card: a scrollable row of tabs over a preview area. The selected tab
 * sits on a pill that slides between tabs (measured with offsetLeft/offsetWidth,
 * which ignore CSS transforms, so it stays correct inside scaled previews).
 * Every panel stays mounted in one grid cell; unselected ones carry `inert`
 * from react-aria, and `data-inert` fades them out, so switching is a crossfade.
 */
export function TemplateShowcaseTabs({
  items,
  selectedKey,
  defaultSelectedKey,
  onSelectionChange,
  action,
  "aria-label": ariaLabel = "Templates",
  className,
}: TemplateShowcaseTabsProps) {
  const reduced = useReducedMotion();
  const [internal, setInternal] = useState<string | undefined>(defaultSelectedKey ?? items[0]?.id);
  const selected = selectedKey ?? internal;
  const current = items.find((item) => item.id === selected) ?? items[0];

  const scrollerRef = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState<Pill | null>(null);
  const [edges, setEdges] = useState({ start: false, end: false });
  const firstRun = useRef(true);

  useIsoLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const measure = () => {
      const tab = scroller.querySelector<HTMLElement>("[role='tab'][data-selected]");
      if (tab) setPill({ left: tab.offsetLeft, width: tab.offsetWidth });
      const max = scroller.scrollWidth - scroller.clientWidth;
      const at = Math.abs(scroller.scrollLeft);
      setEdges({ start: at > 1, end: max - at > 1 });
    };
    measure();

    // Bring the newly selected tab fully into view without touching the page scroll.
    const tab = scroller.querySelector<HTMLElement>("[role='tab'][data-selected]");
    if (tab && !firstRun.current) {
      const pad = 24;
      const left = tab.offsetLeft;
      const right = left + tab.offsetWidth;
      let next: number | null = null;
      if (left - pad < scroller.scrollLeft) next = left - pad;
      else if (right + pad > scroller.scrollLeft + scroller.clientWidth) next = right + pad - scroller.clientWidth;
      if (next !== null) scroller.scrollTo({ left: next, behavior: reduced ? "auto" : "smooth" });
    }
    firstRun.current = false;

    const ro = new ResizeObserver(measure);
    ro.observe(scroller);
    scroller.querySelectorAll("[role='tab']").forEach((el) => ro.observe(el));
    scroller.addEventListener("scroll", measure, { passive: true });
    return () => {
      ro.disconnect();
      scroller.removeEventListener("scroll", measure);
    };
  }, [selected, items.length, reduced]);

  const handleChange = (key: Key) => {
    const id = String(key);
    if (selectedKey === undefined) setInternal(id);
    onSelectionChange?.(id);
  };

  const actionNode = typeof action === "function" ? (current ? action(current) : null) : action;

  return (
    <Tabs
      selectedKey={selected}
      onSelectionChange={handleChange}
      className={cx(
        "@container/showcase flex w-full flex-col gap-2 rounded-[28px] border border-border-button-default bg-background-primary-default p-2 shadow-xs",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <div
          ref={scrollerRef}
          className={cx(
            "relative min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            edges.start && "mask-l-from-[calc(100%-3rem)]",
            edges.end && "mask-r-from-[calc(100%-3rem)]",
          )}
        >
          {pill ? (
            <span
              aria-hidden="true"
              className={cx(
                "pointer-events-none absolute inset-y-0 left-0 rounded-2xl bg-pill-tab-blue-selected-background",
                !reduced && "transition-[translate,width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
              )}
              style={{ width: pill.width, translate: `${pill.left}px 0` }}
            />
          ) : null}
          <TabList aria-label={ariaLabel} className="relative flex w-max items-center gap-0.5">
            {items.map(({ id, label, icon: Icon }) => (
              <Tab
                key={id}
                id={id}
                className={cx(
                  "group/tab relative flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-2xl px-3.5 text-headline-regular whitespace-nowrap outline-none",
                  "text-text-secondary transition-colors duration-150 ease-out",
                  "data-hovered:text-text-primary not-data-selected:data-hovered:bg-pill-tab-blue-hover-background",
                  "data-selected:text-accent-500",
                  "data-focus-visible:ring-2 data-focus-visible:ring-border-focus-ring data-focus-visible:ring-inset",
                )}
              >
                {Icon ? (
                  <Icon className="size-[18px] shrink-0 text-foreground-icon-secondary group-data-selected/tab:text-accent-500" />
                ) : null}
                {label}
              </Tab>
            ))}
          </TabList>
        </div>
        {actionNode ? <div className="flex shrink-0 items-center pe-1">{actionNode}</div> : null}
      </div>

      <div className="@container/preview grid overflow-hidden rounded-[20px] border border-border-button-default bg-background-secondary-default">
        {items.map((item) => (
          <TabPanel
            key={item.id}
            id={item.id}
            shouldForceMount
            className={cx(
              "col-start-1 row-start-1 h-[460px] outline-none @3xl/showcase:h-[540px]",
              "data-inert:invisible data-inert:opacity-0 data-inert:scale-[0.985]",
              !reduced && "transition-[opacity,scale,visibility] duration-300 ease-out",
              "data-focus-visible:ring-2 data-focus-visible:ring-border-focus-ring data-focus-visible:ring-inset",
            )}
          >
            <div role="img" aria-label={`${item.label} template preview`} className="h-full w-full">
              {item.preview}
            </div>
          </TabPanel>
        ))}
      </div>
    </Tabs>
  );
}
// #endregion

export interface TemplateShowcaseProps {
  eyebrow?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** Usually a `TemplateShowcaseTabs`. */
  children: ReactNode;
  className?: string;
}

/** Centred section header over the showcase card. */
export function TemplateShowcase({ eyebrow, title, description, actions, children, className }: TemplateShowcaseProps) {
  return (
    <section className={cx("@container/templates w-full", className)}>
      <div className="mx-auto flex w-full max-w-[1280px] flex-col px-4 @3xl/templates:px-8">
        <header className="mx-auto mb-10 flex max-w-[640px] flex-col items-center text-center">
          {eyebrow ? <div className="mb-4">{eyebrow}</div> : null}
          {title ? (
            <h2 className="text-display-4-semibold tracking-[-0.03em] text-balance text-text-primary @3xl/templates:text-display-2-semibold">
              {title}
            </h2>
          ) : null}
          {description ? (
            <p className="mt-4 max-w-[520px] text-headline-regular text-pretty text-text-secondary">{description}</p>
          ) : null}
          {actions ? <div className="mt-6 flex flex-wrap items-center justify-center gap-2">{actions}</div> : null}
        </header>
        {children}
      </div>
    </section>
  );
}
