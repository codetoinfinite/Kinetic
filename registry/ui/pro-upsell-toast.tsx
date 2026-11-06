/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Pro Upsell Toast" (boardui.com/templates/ai-image-generation).
 * No BoardUI source was used.
 */
"use client";

import { useEffect, useId, useRef } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";

import { useReducedMotion } from "@/registry/hooks/use-reduced-motion";
import { cx } from "@/registry/lib/cx";
import { Button } from "@/registry/ui/button";
import { CloseButton } from "@/registry/ui/close-button";

/**
 * Pro Upsell Toast: a floating "Upgrade to Pro" card for a locked feature.
 *
 * A pastel, grainy wash runs across the top of a white card that carries an
 * app tile, a title, one line of copy, a full-width call to action and a
 * round dismiss button. It is a non-modal dialog: it rises in from the
 * corner, takes focus so Tab reaches its buttons, closes on Escape and hands
 * focus back to whatever opened it.
 */

export interface ProUpsellToastProps {
  isOpen: boolean;
  /** Called with `false` by the dismiss button and Escape. */
  onOpenChange?: (isOpen: boolean) => void;
  title?: ReactNode;
  description?: ReactNode;
  ctaLabel?: ReactNode;
  onCta?: () => void;
  /** Replaces the default Pro tile. */
  icon?: ReactNode;
  /** Move focus into the card when it opens. Turn off when it appears on its own. */
  autoFocus?: boolean;
  /** Placement: `fixed end-4 bottom-4` by default; pass `absolute` to pin it inside a frame. */
  className?: string;
}

const ENTER_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const EXIT_EASE: [number, number, number, number] = [0.4, 0, 1, 1];

/** Vertical light streaks with film grain, faded out downwards. Artwork, so raw colours. */
function ProWash({ className }: { className?: string }) {
  const id = useId();
  const blur = `${id}-blur`;
  const grain = `${id}-grain`;
  const fade = `${id}-fade`;
  const mask = `${id}-mask`;
  return (
    <svg viewBox="0 0 300 120" preserveAspectRatio="none" aria-hidden className={className}>
      <defs>
        <filter id={blur} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="12" />
        </filter>
        <filter id={grain}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix values="0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0.6 0" />
        </filter>
        <linearGradient id={fade} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0.7" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id={mask}>
          <rect width="300" height="120" fill={`url(#${fade})`} />
        </mask>
      </defs>
      <g mask={`url(#${mask})`}>
        <g filter={`url(#${blur})`}>
          <ellipse cx="62" cy="20" rx="22" ry="62" fill="#8cc8ff" opacity="0.75" />
          <ellipse cx="128" cy="6" rx="14" ry="44" fill="#b9c8ff" opacity="0.6" />
          <ellipse cx="196" cy="18" rx="20" ry="60" fill="#7ab8ff" opacity="0.8" />
          <ellipse cx="250" cy="0" rx="12" ry="40" fill="#d4c2ff" opacity="0.55" />
          <ellipse cx="296" cy="22" rx="20" ry="58" fill="#ffb8d2" opacity="0.8" />
        </g>
        <rect width="300" height="120" filter={`url(#${grain})`} opacity="0.12" />
      </g>
    </svg>
  );
}

/** A brushed-metal app tile holding a package: the "full source" you unlock. */
function ProTile() {
  const id = useId();
  const metal = `${id}-metal`;
  const box = `${id}-box`;
  return (
    <svg viewBox="0 0 48 48" aria-hidden className="size-12 shrink-0 drop-shadow-sm">
      <defs>
        <linearGradient id={metal} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#fbfbfc" />
          <stop offset="0.55" stopColor="#d9dce2" />
          <stop offset="1" stopColor="#b4b9c3" />
        </linearGradient>
        <linearGradient id={box} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6d7380" />
          <stop offset="1" stopColor="#3b404b" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="46" height="46" rx="12" fill={`url(#${metal})`} />
      <rect x="1.5" y="1.5" width="45" height="45" rx="11.5" fill="none" stroke="#fff" strokeOpacity="0.9" />
      <rect x="11" y="20" width="26" height="17" rx="3.5" fill={`url(#${box})`} />
      <rect x="9" y="13" width="30" height="8" rx="3" fill="#868c98" />
      <rect x="21" y="13" width="6" height="12" rx="1.5" fill="#e9ebef" />
      <rect x="19.5" y="27" width="9" height="5" rx="2.5" fill="#e9ebef" opacity="0.85" />
    </svg>
  );
}

// #region critical
export function ProUpsellToast({
  isOpen,
  onOpenChange,
  title = "This template is part of Pro",
  description = "Buy once and install the full source with the CLI.",
  ctaLabel = "Get Pro",
  onCta,
  icon,
  autoFocus = true,
  className,
}: ProUpsellToastProps) {
  const reduced = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (isOpen) {
      if (!autoFocus) return;
      const active = document.activeElement;
      returnTo.current = active instanceof HTMLElement ? active : null;
      cardRef.current?.focus({ preventScroll: true });
      return;
    }
    // The card is still mounted while it animates out, so this sees where
    // focus is. Only pull it back if it was inside the card.
    if (cardRef.current?.contains(document.activeElement)) returnTo.current?.focus({ preventScroll: true });
    returnTo.current = null;
  }, [isOpen, autoFocus]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Escape") return;
    event.stopPropagation();
    onOpenChange?.(false);
  };

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          key="pro-upsell-toast"
          ref={cardRef}
          role="dialog"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          tabIndex={-1}
          onKeyDown={onKeyDown}
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96 }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
            transition: reduced ? { duration: 0.15 } : { duration: 0.34, ease: ENTER_EASE },
          }}
          exit={
            reduced
              ? { opacity: 0, transition: { duration: 0.12 } }
              : { opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.16, ease: EXIT_EASE } }
          }
          className={cx(
            "fixed end-4 bottom-4 z-50 w-[min(300px,calc(100%-2rem))] origin-bottom overflow-hidden",
            "rounded-3xl bg-background-primary-default p-4 shadow-lg ring-1 ring-border-ai-profile-card outline-none",
            "focus-visible:ring-2 focus-visible:ring-border-focus-ring",
            className,
          )}
        >
          <ProWash className="pointer-events-none absolute inset-x-0 top-0 h-28 w-full dark:opacity-55" />

          <div className="relative flex flex-col">
            <span className="mb-4 flex">{icon ?? <ProTile />}</span>
            <h2 id={titleId} className="pe-8 text-body-medium text-text-primary">
              {title}
            </h2>
            <p id={descriptionId} className="mt-1 text-body-2-regular text-text-secondary">
              {description}
            </p>
            <Button variant="primary" size="medium" className="mt-4 w-full justify-center" onClick={onCta}>
              {ctaLabel}
            </Button>
          </div>

          <CloseButton
            size="sm"
            aria-label="Dismiss"
            onClick={() => onOpenChange?.(false)}
            className="absolute end-3 top-3 dark:bg-background-quaternary-default"
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
// #endregion
