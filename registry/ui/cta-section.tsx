/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "CTA Section" (boardui.com/).
 * No BoardUI source was used.
 */
"use client";

import { useId, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import { cx } from "@/registry/lib/cx";
import { useInView } from "@/registry/hooks/use-in-view";
import { useReducedMotion } from "@/registry/hooks/use-reduced-motion";
import { StackedCardFan } from "@/registry/ui/stacked-card-fan";
import type { StackedCardFanItem, StackedCardFanProps } from "@/registry/ui/stacked-card-fan";

export interface CtaSectionProps {
  /** Headline, rendered as an `h2` that labels the section. */
  title: ReactNode;
  /** Supporting copy under the headline. */
  description?: ReactNode;
  /** Buttons or links, laid out in a wrapping row. */
  actions?: ReactNode;
  /** Cards for the stacked-card visual above the headline. Omit for a text-only CTA. */
  cards?: StackedCardFanItem[];
  /** Extra props for the card stack (the bottom fade is on by default). */
  fanProps?: Omit<StackedCardFanProps, "items">;
  className?: string;
}

// #region critical
/**
 * Entrance: the visual, headline, copy and actions rise 16px, unblur and fade
 * in one after another the first time a quarter of the section is on screen.
 * Each part waits `order * STAGGER_MS` before starting, so one shared flag on
 * the root (`data-shown`) drives the whole sequence with CSS transitions only.
 * Hidden styles are keyed to `data-shown="false"`, so a reduced-motion visitor,
 * for whom the flag starts true, never sees a hidden frame.
 */
const STAGGER_MS = 90;

const REVEAL =
  "transition-[opacity,translate,filter] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none " +
  "group-data-[shown=false]/cta:translate-y-4 group-data-[shown=false]/cta:opacity-0 group-data-[shown=false]/cta:blur-sm";

function revealDelay(order: number): CSSProperties {
  return { transitionDelay: `${order * STAGGER_MS}ms` };
}
// #endregion

/**
 * Closing call-to-action: an optional stacked-card visual, a large headline,
 * supporting copy and a row of actions, centred on a full-width surface.
 */
export function CtaSection({ title, description, actions, cards, fanProps, className }: CtaSectionProps) {
  const rootRef = useRef<HTMLElement>(null);
  const headingId = useId();
  const reduced = useReducedMotion();
  const { inView } = useInView(rootRef, { once: true, threshold: 0.25 });
  const shown = reduced || inView;
  let order = 0;

  return (
    <section
      ref={rootRef}
      aria-labelledby={headingId}
      data-shown={shown}
      className={cx(
        "group/cta @container/cta flex w-full flex-col items-center bg-background-primary-default px-4 py-16",
        className,
      )}
    >
      {cards && cards.length > 0 ? (
        <div className={cx("mb-8 w-full max-w-[680px]", REVEAL)} style={revealDelay(order++)}>
          <StackedCardFan items={cards} fade cardWidth={320} cardHeight={280} aria-label="Preview cards" {...fanProps} />
        </div>
      ) : null}

      <h2
        id={headingId}
        className={cx(
          "max-w-[18ch] text-center text-display-4-medium text-balance text-text-primary @2xl/cta:text-display-2-medium",
          REVEAL,
        )}
        style={revealDelay(order++)}
      >
        {title}
      </h2>

      {description ? (
        <p
          className={cx(
            "mt-4 max-w-[580px] text-center text-body-regular text-pretty text-text-secondary @2xl/cta:text-headline-regular",
            REVEAL,
          )}
          style={revealDelay(order++)}
        >
          {description}
        </p>
      ) : null}

      {actions ? (
        <div className={cx("mt-7 flex flex-wrap items-center justify-center gap-2.5", REVEAL)} style={revealDelay(order++)}>
          {actions}
        </div>
      ) : null}
    </section>
  );
}
