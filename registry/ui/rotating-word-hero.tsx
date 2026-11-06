/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Rotating Word Hero" (boardui.com/).
 * No BoardUI source was used.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import type { ComponentType, MouseEventHandler, ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cx } from "@/registry/lib/cx";
import { useReducedMotion } from "@/registry/hooks/use-reduced-motion";
import { useInView } from "@/registry/hooks/use-in-view";
import { useVisibility } from "@/registry/hooks/use-visibility";

type IconComponent = ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;

export interface HeroBadgeItem {
  label: string;
  version?: string;
  icon?: IconComponent;
}

export interface RotatingWordProps {
  words: string[];
  /** Milliseconds each word stays on screen. */
  interval?: number;
  /** Stops the rotation on the current word. */
  paused?: boolean;
  /** Dotted rule under the word, hinting that it changes. */
  underline?: boolean;
  className?: string;
}

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

// #region critical
/**
 * A word that swaps in place: the outgoing word slides up and blurs out while
 * the next rises from below. An in-flow invisible copy of the current word
 * gives the slot its height and baseline; a ResizeObserver on that copy feeds
 * an explicit width, so the surrounding line glides to the new length instead
 * of jumping. The rotation stops under reduced motion, while hovered, off
 * screen and in a hidden tab.
 */
export function RotatingWord({ words, interval = 2600, paused = false, underline = true, className }: RotatingWordProps) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const sizerRef = useRef<HTMLSpanElement>(null);
  const [index, setIndex] = useState(0);
  const [width, setWidth] = useState<number | undefined>(undefined);
  const [hovered, setHovered] = useState(false);
  const reduced = useReducedMotion();
  const visible = useVisibility();
  const { inView } = useInView(rootRef);

  const count = words.length;
  const word = words[index % Math.max(count, 1)] ?? "";
  const running = count > 1 && !paused && !reduced && !hovered && visible && inView;

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), interval);
    return () => window.clearInterval(id);
  }, [running, interval, count]);

  useEffect(() => {
    const sizer = sizerRef.current;
    if (!sizer || typeof ResizeObserver === "undefined") return;
    // Layout size, not getBoundingClientRect: the hero may sit inside a scaled preview.
    const ro = new ResizeObserver((entries) => {
      const box = entries[0]?.borderBoxSize?.[0];
      setWidth(box ? box.inlineSize : sizer.offsetWidth);
    });
    ro.observe(sizer);
    return () => ro.disconnect();
  }, []);

  return (
    <span
      ref={rootRef}
      data-word={word}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      className={cx(
        "relative inline-block whitespace-nowrap",
        !reduced && "transition-[width] duration-500 ease-out",
        className,
      )}
      style={width === undefined ? undefined : { width }}
    >
      <span className="sr-only">{words[0]}</span>
      <span ref={sizerRef} aria-hidden="true" className="invisible inline-block">
        {word}
      </span>
      <span aria-hidden="true" className="absolute inset-0">
        <AnimatePresence initial={false}>
          <motion.span
            key={`${index}-${word}`}
            className="absolute top-0 left-0 inline-block"
            initial={reduced ? false : { y: "45%", opacity: 0, filter: "blur(8px)" }}
            animate={{ y: "0%", opacity: 1, filter: "blur(0px)" }}
            exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { y: "-45%", opacity: 0, filter: "blur(8px)" }}
            transition={{ duration: 0.55, ease: EASE_OUT }}
          >
            {word}
          </motion.span>
        </AnimatePresence>
      </span>
      {underline ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -bottom-[0.08em] h-[0.1em] bg-[radial-gradient(circle,currentColor_0.032em,transparent_0.042em)] bg-size-[0.15em_0.1em] bg-repeat-x text-text-placeholder opacity-70"
        />
      ) : null}
    </span>
  );
}
// #endregion

export interface HeroAnnouncementProps {
  /** Short uppercase tag, e.g. "New". */
  tag?: string;
  href?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  children: ReactNode;
  className?: string;
}

export function HeroAnnouncement({ tag = "New", href, onClick, children, className }: HeroAnnouncementProps) {
  const body = (
    <>
      <span className="rounded-full bg-badge-new-background px-2 py-0.5 text-caption-2-semibold uppercase text-badge-new-text">
        {tag}
      </span>
      <span>{children}</span>
    </>
  );
  const base = "inline-flex items-center gap-2 rounded-full py-1 pr-3 pl-1 text-body-medium text-text-primary";
  if (!href) return <span className={cx(base, className)}>{body}</span>;
  return (
    <a
      href={href}
      onClick={onClick}
      className={cx(
        base,
        "outline-none transition-colors duration-150 hover:bg-background-secondary-default focus-visible:ring-2 focus-visible:ring-border-focus-ring",
        className,
      )}
    >
      {body}
    </a>
  );
}

export interface RotatingWordHeroProps {
  /** Pill above the headline; pass a `HeroAnnouncement`. */
  announcement?: ReactNode;
  /** Headline text before the rotating word. */
  before?: ReactNode;
  words: string[];
  /** Headline text after the rotating word. */
  after?: ReactNode;
  description?: ReactNode;
  /** Call-to-action buttons. */
  actions?: ReactNode;
  /** Small "built with" row under the actions. */
  badges?: HeroBadgeItem[];
  interval?: number;
  paused?: boolean;
  /** Soft accent light behind the headline. */
  glow?: boolean;
  /** Anything below the badges, e.g. a product shot. */
  children?: ReactNode;
  className?: string;
}

export function RotatingWordHero({
  announcement,
  before,
  words,
  after,
  description,
  actions,
  badges = [],
  interval,
  paused,
  glow = true,
  children,
  className,
}: RotatingWordHeroProps) {
  return (
    <section className={cx("@container/hero relative isolate w-full", className)}>
      {glow ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -top-24 -z-10 flex h-[420px] justify-center gap-10 overflow-hidden mask-b-from-20%"
        >
          <span className="h-full w-16 rounded-full bg-accent-300 opacity-25 blur-2xl" />
          <span className="mt-10 h-4/5 w-10 rounded-full bg-chart-3 opacity-20 blur-2xl" />
          <span className="h-full w-24 rounded-full bg-accent-400 opacity-20 blur-3xl" />
          <span className="mt-16 h-3/4 w-12 rounded-full bg-chart-5 opacity-15 blur-2xl" />
        </div>
      ) : null}

      <div className="mx-auto flex w-full max-w-[1080px] flex-col items-center px-4 text-center @3xl/hero:px-8">
        {announcement ? <div className="mb-6">{announcement}</div> : null}

        <h1 className="text-display-4-semibold tracking-[-0.03em] text-balance text-text-primary @xl/hero:text-display-2-semibold @4xl/hero:text-large-title-semibold @4xl/hero:tracking-[-0.035em]">
          {before}
          {before ? " " : null}
          <RotatingWord words={words} interval={interval} paused={paused} />
          {after ? " " : null}
          {after}
        </h1>

        {description ? (
          <p className="mt-6 max-w-[620px] text-headline-regular text-pretty text-text-secondary">{description}</p>
        ) : null}

        {actions ? <div className="mt-7 flex flex-wrap items-center justify-center gap-2">{actions}</div> : null}

        {badges.length > 0 ? (
          <ul className="mt-14 flex flex-wrap items-center justify-center gap-x-4 gap-y-3">
            {badges.map((badge, i) => {
              const Icon = badge.icon;
              return (
                <li key={badge.label} className="flex items-center gap-4">
                  {i > 0 ? <span aria-hidden="true" className="size-1 rounded-full bg-text-placeholder" /> : null}
                  <span className="flex items-center gap-1.5 text-body-medium text-text-primary">
                    {Icon ? <Icon aria-hidden="true" className="size-4 shrink-0 text-foreground-icon-secondary" /> : null}
                    {badge.label}
                    {badge.version ? (
                      <span className="text-caption-1-regular text-text-tertiary">{badge.version}</span>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      {children ? <div className="mt-14 w-full">{children}</div> : null}
    </section>
  );
}
