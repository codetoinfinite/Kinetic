/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Testimonial Carousel" (boardui.com/).
 * No BoardUI source was used.
 */
"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { FocusEvent, ReactNode } from "react";
import { RiArrowLeftSLine, RiArrowRightSLine, RiPauseLine, RiPlayLine } from "@remixicon/react";
import { cx } from "@/registry/lib/cx";
import { useReducedMotion } from "@/registry/hooks/use-reduced-motion";
import { Avatar } from "@/registry/ui/avatar";
import { IconButton } from "@/registry/ui/icon-button";

export interface Testimonial {
  id: string;
  quote: ReactNode;
  name: string;
  role: string;
  company?: string;
  companyHref?: string;
  handle?: string;
  /** Defaults to the first letters of the first two words of `name`. */
  initials?: string;
  avatarColor?: "neutral" | "blue" | "lime" | "pink";
}

export interface TestimonialCarouselProps {
  items: Testimonial[];
  /** Pill text above the quotes. */
  label?: ReactNode;
  /** Accessible name of the carousel region. */
  "aria-label"?: string;
  /** Milliseconds each quote stays before advancing; 0 turns autoplay off. */
  interval?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  className?: string;
}

/** Share of the viewport one slide takes (narrow / wide container); the rest shows the faded neighbours. */
const SLIDE_WIDTH = "[--slide:86%] @2xl:[--slide:60%]";
const SLIDE_MS = 520;

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

// #region critical
export function TestimonialCarousel({
  items,
  label,
  "aria-label": ariaLabel = "Testimonials",
  interval = 6000,
  defaultIndex = 0,
  onIndexChange,
  className,
}: TestimonialCarouselProps) {
  const uid = useId();
  const count = items.length;
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(() => Math.min(Math.max(defaultIndex, 0), Math.max(count - 1, 0)));
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [stopped, setStopped] = useState(false);
  const fillRef = useRef<HTMLSpanElement>(null);
  const animRef = useRef<Animation | null>(null);

  const go = useCallback(
    (next: number) => {
      if (count === 0) return;
      const wrapped = ((next % count) + count) % count;
      setIndex(wrapped);
      onIndexChange?.(wrapped);
    },
    [count, onIndexChange],
  );

  // Autoplay is never on under reduced motion, with one item, or after the user stops it.
  const autoplay = interval > 0 && count > 1 && !reduced && !stopped;
  const paused = hovered || focused;

  // The active dot's fill IS the timer: a Web Animation that grows across `interval`
  // and advances the slide when it finishes. Pausing the animation pauses the timer
  // with its remaining time intact, so hover never resets the countdown.
  useEffect(() => {
    const fill = fillRef.current;
    if (!autoplay || !fill || typeof fill.animate !== "function") return;
    const anim = fill.animate([{ scale: "0 1" }, { scale: "1 1" }], {
      duration: interval,
      easing: "linear",
      fill: "forwards",
    });
    anim.onfinish = () => go(index + 1);
    animRef.current = anim;
    return () => {
      anim.onfinish = null;
      anim.cancel();
      animRef.current = null;
    };
  }, [autoplay, interval, index, go]);

  useEffect(() => {
    const anim = animRef.current;
    if (!anim) return;
    if (paused) anim.pause();
    else if (anim.playState === "paused") anim.play();
  }, [paused, index, autoplay]);

  const onBlur = (event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
  };

  return (
    <section
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={onBlur}
      className={cx("@container flex w-full flex-col items-center", className)}
    >
      {label && (
        <span className="rounded-full bg-background-primary-default px-3.5 py-1.5 text-body-2-medium text-text-secondary shadow-xs ring-1 ring-separator-border">
          {label}
        </span>
      )}

      <div className={cx("mt-8 w-full overflow-hidden mask-x-from-92% mask-x-to-100% @2xl:mask-x-from-80%", SLIDE_WIDTH)}>
        <div
          aria-live={autoplay && !paused ? "off" : "polite"}
          className="flex w-full transition-transform ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
          style={{
            // Percentages resolve against the track, which is exactly as wide as the viewport.
            transform: `translateX(calc((100% - var(--slide)) / 2 - var(--slide) * ${index}))`,
            transitionDuration: `${SLIDE_MS}ms`,
          }}
        >
          {items.map((item, i) => {
            const active = i === index;
            return (
              <figure
                key={item.id}
                id={`${uid}-slide-${i}`}
                role="group"
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${count}`}
                aria-hidden={!active}
                inert={!active}
                className={cx(
                  "flex shrink-0 basis-(--slide) flex-col items-center px-4 text-center transition-opacity duration-500 ease-out motion-reduce:transition-none @container",
                  active ? "opacity-100" : "opacity-40",
                )}
              >
                <figcaption className="flex items-center gap-3 text-left">
                  <Avatar
                    size="lg"
                    color={item.avatarColor ?? "neutral"}
                    initials={item.initials ?? initialsOf(item.name)}
                    className="size-11 text-headline-semibold"
                  />
                  <span className="flex flex-col">
                    <span className="text-body-semibold text-text-primary">{item.name}</span>
                    <span className="text-body-2-regular text-text-tertiary">
                      {item.role}
                      {item.company && (
                        <>
                          {" at "}
                          {item.companyHref ? (
                            <a
                              href={item.companyHref}
                              className="text-text-secondary underline decoration-separator-border-strong underline-offset-2 hover:text-text-primary"
                            >
                              {item.company}
                            </a>
                          ) : (
                            <span className="text-text-secondary">{item.company}</span>
                          )}
                        </>
                      )}
                      {item.handle && <span className="text-text-tertiary">{` · ${item.handle}`}</span>}
                    </span>
                  </span>
                </figcaption>
                <blockquote className="mt-6 max-w-3xl text-title-2-medium tracking-tight text-balance text-text-primary @lg:text-title-1-medium">
                  <p>{item.quote}</p>
                </blockquote>
              </figure>
            );
          })}
        </div>
      </div>

      {count > 1 && (
        <div className="mt-8 flex items-center gap-3">
          <IconButton size="small" icon={RiArrowLeftSLine} aria-label="Previous testimonial" onClick={() => go(index - 1)} className="rounded-full" />
          <div className="flex items-center gap-1.5">
            {items.map((item, i) => {
              const active = i === index;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-label={`Show testimonial ${i + 1}`}
                  aria-controls={`${uid}-slide-${i}`}
                  aria-current={active ? "true" : undefined}
                  onClick={() => go(i)}
                  className="group grid h-6 cursor-pointer place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
                >
                  <span
                    className={cx(
                      "relative block h-1.5 overflow-hidden rounded-full transition-[width,background-color] duration-300 ease-out motion-reduce:transition-none",
                      active ? "w-8 bg-background-quaternary-default" : "w-1.5 bg-background-tertiary-hover group-hover:bg-foreground-icon-quaternary",
                    )}
                  >
                    {active && (
                      <span
                        ref={fillRef}
                        aria-hidden
                        className={cx("absolute inset-0 origin-left rounded-full bg-text-primary", autoplay && "scale-x-0")}
                      />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
          <IconButton size="small" icon={RiArrowRightSLine} aria-label="Next testimonial" onClick={() => go(index + 1)} className="rounded-full" />
          {interval > 0 && !reduced && (
            <IconButton
              size="small"
              icon={stopped ? RiPlayLine : RiPauseLine}
              aria-label={stopped ? "Start autoplay" : "Stop autoplay"}
              onClick={() => setStopped((s) => !s)}
              className="ml-1 rounded-full"
            />
          )}
        </div>
      )}
    </section>
  );
}
// #endregion
