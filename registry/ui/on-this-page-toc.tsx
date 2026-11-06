/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "On This Page TOC" (boardui.com/components/typography).
 * No BoardUI source was used.
 */
"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, ReactNode, RefObject } from "react";
import { RiListUnordered } from "@remixicon/react";
import { cx } from "@/registry/lib/cx";
import { useReducedMotion } from "@/registry/hooks/use-reduced-motion";
import { useResizeObserver } from "@/registry/hooks/use-resize-observer";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export interface TocItem {
  /** Id of the section element on the page (prefer the section wrapper over its heading). */
  id: string;
  label: string;
  /** 0 = top level, 1-2 indent sub-sections. */
  depth?: 0 | 1 | 2;
}

export interface OnThisPageTocProps {
  items: TocItem[];
  /**
   * Scroll container the sections live in. Used as the IntersectionObserver
   * root and as the element scrolled on click. Omit for the window.
   */
  scrollRoot?: RefObject<HTMLElement | null>;
  /** Active section id (controlled). */
  activeId?: string | null;
  defaultActiveId?: string | null;
  onActiveChange?: (id: string) => void;
  title?: ReactNode;
  /** Px kept between the root's top edge and a section scrolled to. */
  offset?: number;
  /** Height of the activation band, as a fraction of the root, from its top. */
  activationRatio?: number;
  /** Focus the section after jumping so keyboard and screen-reader users land there. */
  focusTarget?: boolean;
  "aria-label"?: string;
  className?: string;
}

const depthPad = ["ps-4", "ps-7", "ps-10"] as const;

export function OnThisPageToc({
  items,
  scrollRoot,
  activeId: activeProp,
  defaultActiveId,
  onActiveChange,
  title = "On this page",
  offset = 16,
  activationRatio = 0.3,
  focusTarget = true,
  "aria-label": ariaLabel = "On this page",
  className,
}: OnThisPageTocProps) {
  const reduced = useReducedMotion();
  const controlled = activeProp !== undefined;
  const [inner, setInner] = useState<string | null>(defaultActiveId ?? items[0]?.id ?? null);
  const active = controlled ? activeProp : inner;

  const lastRef = useRef<string | null>(active);
  const onChangeRef = useRef(onActiveChange);
  const lockRef = useRef<string | null>(null);
  const releaseRef = useRef<(() => void) | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const linkRefs = useRef(new Map<string, HTMLAnchorElement>());
  const listSize = useResizeObserver(listRef);
  const [bar, setBar] = useState({ y: 0, h: 0, animate: false });

  useEffect(() => {
    onChangeRef.current = onActiveChange;
  }, [onActiveChange]);

  useEffect(() => {
    lastRef.current = active;
  }, [active]);

  const commit = useCallback(
    (id: string) => {
      if (lastRef.current === id) return;
      lastRef.current = id;
      if (!controlled) setInner(id);
      onChangeRef.current?.(id);
    },
    [controlled],
  );

  const ids = items.map((item) => item.id).join("|");

  // #region critical
  // Scrollspy: the active section is the last one (in TOC order) inside a band
  // from `offset` px below the root's top down to `activationRatio` of its
  // height, i.e. the section whose heading most recently entered the band.
  // Scrolled to the very end, the last section wins even when it is too short
  // to ever reach the band.
  useEffect(() => {
    const root = scrollRoot?.current ?? null;
    const order = ids.split("|").filter(Boolean);
    const targets = order
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0 || typeof IntersectionObserver === "undefined") return;

    const inBand = new Set<string>();
    const atEnd = () =>
      root
        ? root.scrollTop + root.clientHeight >= root.scrollHeight - 2
        : window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
    const pick = () => {
      if (lockRef.current) return;
      const last = order[order.length - 1];
      const scrolled = (root ? root.scrollTop : window.scrollY) > 0;
      if (last && scrolled && atEnd()) return commit(last);
      let current: string | undefined;
      for (const id of order) if (inBand.has(id)) current = id;
      if (current) commit(current);
    };

    const bottomInset = Math.round((1 - activationRatio) * 100);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) inBand.add(entry.target.id);
          else inBand.delete(entry.target.id);
        }
        pick();
      },
      { root, rootMargin: `-${offset}px 0px -${bottomInset}% 0px`, threshold: 0 },
    );
    for (const target of targets) observer.observe(target);

    let wasAtEnd = atEnd();
    const scroller: HTMLElement | Window = root ?? window;
    const onScroll = () => {
      const end = atEnd();
      if (end !== wasAtEnd) {
        wasAtEnd = end;
        pick();
      }
    };
    scroller.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      observer.disconnect();
      scroller.removeEventListener("scroll", onScroll);
    };
  }, [ids, scrollRoot, offset, activationRatio, commit]);

  const jumpTo = (event: ReactMouseEvent<HTMLAnchorElement>, id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    const root = scrollRoot?.current ?? null;
    const behavior: ScrollBehavior = reduced ? "auto" : "smooth";

    // Hold the clicked item while the smooth scroll passes other sections.
    releaseRef.current?.();
    lockRef.current = id;
    commit(id);
    const scroller: HTMLElement | Window = root ?? window;
    const release = () => {
      lockRef.current = null;
      scroller.removeEventListener("scrollend", release);
      window.clearTimeout(timer);
      releaseRef.current = null;
    };
    const timer = window.setTimeout(release, 900);
    scroller.addEventListener("scrollend", release);
    releaseRef.current = release;

    if (root) {
      const top = root.scrollTop + target.getBoundingClientRect().top - root.getBoundingClientRect().top - offset;
      root.scrollTo({ top, behavior });
    } else {
      window.scrollTo({ top: window.scrollY + target.getBoundingClientRect().top - offset, behavior });
    }
    if (focusTarget) {
      if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    }
  };
  // #endregion

  useEffect(() => () => releaseRef.current?.(), []);

  // Slide the indicator to the active link; the first placement does not animate.
  useIsoLayoutEffect(() => {
    const link = active ? linkRefs.current.get(active) : undefined;
    if (!link) {
      setBar((prev) => (prev.h === 0 ? prev : { y: prev.y, h: 0, animate: false }));
      return;
    }
    const y = link.offsetTop;
    const h = link.offsetHeight;
    setBar((prev) => (prev.y === y && prev.h === h ? prev : { y, h, animate: prev.h > 0 }));
  }, [active, ids, listSize.width]);

  return (
    <nav aria-label={ariaLabel} className={cx("flex w-full max-w-[240px] flex-col gap-4", className)}>
      {title ? (
        <p className="flex items-center gap-2 text-body-medium text-text-primary">
          <RiListUnordered aria-hidden className="size-4 shrink-0 text-foreground-icon-secondary" />
          {title}
        </p>
      ) : null}
      <div className="relative">
        <span aria-hidden className="absolute inset-y-0 start-0 w-px bg-separator-border" />
        <span
          aria-hidden
          className={cx(
            "absolute start-0 top-0 w-0.5 rounded-full bg-text-primary",
            bar.animate && "transition-[transform,height] duration-300 ease-out motion-reduce:transition-none",
            bar.h === 0 && "opacity-0",
          )}
          style={{ transform: `translateY(${bar.y}px)`, height: bar.h }}
        />
        <ul ref={listRef} className="flex flex-col">
          {items.map((item) => {
            const isActive = item.id === active;
            return (
              <li key={item.id}>
                <a
                  ref={(node) => {
                    if (node) linkRefs.current.set(item.id, node);
                    else linkRefs.current.delete(item.id);
                  }}
                  href={`#${item.id}`}
                  aria-current={isActive ? "location" : undefined}
                  onClick={(event) => jumpTo(event, item.id)}
                  className={cx(
                    "block rounded-sm py-1.5 pe-2 text-body-regular outline-none",
                    "transition-colors duration-150 ease-out motion-reduce:transition-none",
                    "focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:ring-inset",
                    depthPad[item.depth ?? 0],
                    isActive ? "text-text-primary" : "text-text-tertiary hover:text-text-secondary",
                  )}
                >
                  {item.label}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
