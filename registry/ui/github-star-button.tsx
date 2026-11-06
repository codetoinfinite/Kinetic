/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "GitHub Star Button" (boardui.com/).
 * No BoardUI source was used.
 */
"use client";

import { useState } from "react";
import { ToggleButton } from "react-aria-components";
import { AnimatePresence, motion } from "motion/react";
import type { Variants } from "motion/react";
import { RiStarFill, RiStarLine } from "@remixicon/react";
import { cx } from "@/registry/lib/cx";
import { useReducedMotion } from "@/registry/hooks/use-reduced-motion";

export interface GithubStarButtonProps {
  /** Star total when the component loads; includes the viewer's star if `defaultStarred`. */
  count: number;
  defaultStarred?: boolean;
  onStarredChange?: (starred: boolean) => void;
  label?: string;
  starredLabel?: string;
  /** Accessible name; defaults to `label`. The current total is appended. */
  "aria-label"?: string;
  className?: string;
}

const numberFormat = new Intl.NumberFormat("en-US");
const ROLL = { type: "spring", duration: 0.35, bounce: 0.2 } as const;

// Direction is read at exit time through AnimatePresence `custom`, so the leaving number goes the right way.
const roll: Variants = {
  enter: (dir: number) => ({ y: dir > 0 ? "100%" : "-100%", opacity: 0 }),
  center: { y: "0%", opacity: 1 },
  exit: (dir: number) => ({ y: dir > 0 ? "-100%" : "100%", opacity: 0 }),
};

// #region critical
export function GithubStarButton({
  count,
  defaultStarred = false,
  onStarredChange,
  label = "Star",
  starredLabel = "Starred",
  "aria-label": ariaLabel,
  className,
}: GithubStarButtonProps) {
  const reduce = useReducedMotion();
  const [starred, setStarred] = useState(defaultStarred);
  // +1 for "count went up", -1 for "went down"; drives which way the digits roll.
  const [dir, setDir] = useState(1);
  const total = count + Number(starred) - Number(defaultStarred);
  const formatted = numberFormat.format(total);

  const toggle = (next: boolean) => {
    setDir(next ? 1 : -1);
    setStarred(next);
    onStarredChange?.(next);
  };

  const Icon = starred ? RiStarFill : RiStarLine;

  return (
    <ToggleButton
      isSelected={starred}
      onChange={toggle}
      aria-label={`${ariaLabel ?? label}, ${formatted} stars`}
      className={cx(
        "group inline-flex h-9 items-center gap-2 rounded-xl bg-background-primary-default pr-1.5 pl-3 text-body-2-medium text-text-primary shadow-xs ring-1 ring-separator-border outline-none select-none",
        "cursor-pointer transition-[background-color,box-shadow,scale] duration-150 ease-out motion-reduce:transition-none",
        "data-hovered:bg-background-secondary-hover data-pressed:scale-[0.97] data-focus-visible:ring-2 data-focus-visible:ring-border-focus-ring",
        className,
      )}
    >
      <span className="relative grid size-4 place-items-center">
        {reduce ? (
          <Icon aria-hidden className={cx("size-4", starred ? "text-status-yellow-text" : "text-foreground-icon-secondary")} />
        ) : (
          <motion.span
            key={String(starred)}
            initial={{ scale: starred ? 0.4 : 0.8, rotate: starred ? -40 : 0 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", duration: 0.45, bounce: starred ? 0.55 : 0 }}
            className="grid place-items-center"
          >
            <Icon aria-hidden className={cx("size-4", starred ? "text-status-yellow-text" : "text-foreground-icon-secondary")} />
          </motion.span>
        )}
      </span>
      <span aria-hidden>{starred ? starredLabel : label}</span>
      <span
        aria-hidden
        data-count
        className="relative inline-flex h-6 items-center overflow-hidden rounded-lg bg-background-secondary-default px-2 text-caption-1-semibold text-text-secondary tabular-nums ring-1 ring-separator-border group-data-selected:text-text-primary"
      >
        {reduce ? (
          formatted
        ) : (
          <AnimatePresence mode="popLayout" initial={false} custom={dir}>
            <motion.span
              key={total}
              custom={dir}
              variants={roll}
              initial="enter"
              animate="center"
              exit="exit"
              transition={ROLL}
              className="inline-block"
            >
              {formatted}
            </motion.span>
          </AnimatePresence>
        )}
      </span>
    </ToggleButton>
  );
}
// #endregion
