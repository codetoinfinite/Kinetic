/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Avatar Stack" (boardui.com/templates/project-board).
 * No BoardUI source was used.
 */
"use client";

import type { HTMLAttributes, Ref } from "react";
import { Focusable } from "react-aria-components";
import { Avatar, type AvatarProps } from "@/registry/ui/avatar";
import { Tooltip, TooltipTrigger } from "@/registry/ui/tooltip";
import { cx, sortCx } from "@/registry/lib/cx";

/**
 * Overlapping assignee avatars from the project board cards: each disc sits
 * a quarter over the previous one with a ring in the surface colour, so the
 * stack reads as cut-outs. Past `max`, the rest collapse into a "+N" disc.
 * Every disc is focusable and names its person in a tooltip.
 */

export type AvatarStackSize = NonNullable<AvatarProps["size"]>;
export type AvatarStackColor = NonNullable<AvatarProps["color"]>;

export interface AvatarStackPerson {
  /** Stable key; falls back to `name`. */
  id?: string;
  name: string;
  /** Defaults to the first letters of the first two words of `name`. */
  initials?: string;
  /** Initial tint. Defaults to a colour hashed from `name`, so it is stable. */
  color?: AvatarStackColor;
  /** Photo URL (wins over initials). */
  src?: string;
  /** Muted second line in the tooltip, e.g. a role. */
  description?: string;
}

export interface AvatarStackProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  people: readonly AvatarStackPerson[];
  /** Discs shown before the rest collapse into "+N". Default 3. */
  max?: number;
  size?: AvatarStackSize;
  /** Name tooltips on hover and focus. When off, discs are not tab stops. Default true. */
  tooltips?: boolean;
  /** Ring colour; match it to the surface the stack sits on. */
  ringClassName?: string;
  /** Prefix for the group's accessible name. Default "Assignees". */
  label?: string;
  /** Makes the "+N" disc a button (e.g. to open a member list). */
  onOverflowPress?: () => void;
  ref?: Ref<HTMLDivElement>;
}

const TINTS: readonly AvatarStackColor[] = ["blue", "lime", "pink", "neutral"];

/** First letters of the first two words: "Ana de Wit" → "AD". */
export function initialsOf(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
}

/** Stable tint from the name (djb2 hash), so a person keeps their colour everywhere. */
export function tintOf(name: string): AvatarStackColor {
  let h = 5381;
  for (let i = 0; i < name.length; i++) h = ((h << 5) + h + name.charCodeAt(i)) | 0;
  return TINTS[Math.abs(h) % TINTS.length] ?? "neutral";
}

const styles = sortCx({
  overlap: { xs: "-ms-1.5", sm: "-ms-1.5", md: "-ms-2", lg: "-ms-2.5" },
  overflow: {
    xs: "size-5 text-[10px] leading-[15px] font-semibold",
    sm: "size-6 text-caption-1-semibold",
    md: "size-8 text-body-2-semibold",
    lg: "size-9 text-body-semibold",
  },
  disc: [
    "relative ring-2 outline-none",
    "transition-transform duration-150 ease-out motion-reduce:transition-none",
    "hover:z-10 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0",
    "focus-visible:z-10 focus-visible:ring-border-focus-ring",
  ].join(" "),
});

// #region critical
export function AvatarStack({
  people,
  max = 3,
  size = "sm",
  tooltips = true,
  ringClassName = "ring-background-primary-default",
  label = "Assignees",
  onOverflowPress,
  className,
  ref,
  ...props
}: AvatarStackProps) {
  // Showing "+1" in place of the last avatar saves no room, so only collapse
  // when at least two people would hide.
  const limit = Math.max(1, max);
  const visibleCount = people.length > limit + 1 ? limit : people.length;
  const shown = people.slice(0, visibleCount);
  const hidden = people.slice(visibleCount);
  const names = people.map((p) => p.name);

  const discClass = (index: number) => cx(styles.disc, ringClassName, index > 0 && styles.overlap[size]);

  const overflowDisc = hidden.length > 0 && (
    <OverflowDisc
      count={hidden.length}
      names={hidden.map((p) => p.name)}
      className={cx(
        discClass(shown.length),
        styles.overflow[size],
        "inline-flex shrink-0 select-none items-center justify-center rounded-full bg-background-tertiary-default text-text-secondary",
      )}
      tooltips={tooltips}
      onPress={onOverflowPress}
    />
  );

  return (
    <div
      ref={ref}
      role="group"
      aria-label={people.length ? `${label}: ${names.join(", ")}` : `${label}: none`}
      className={cx("inline-flex shrink-0 items-center isolate", className)}
      {...props}
    >
      {shown.map((person, i) => {
        const disc = (
          <Avatar
            key={person.id ?? person.name}
            size={size}
            color={person.color ?? tintOf(person.name)}
            src={person.src}
            alt=""
            initials={person.initials ?? initialsOf(person.name)}
            role="img"
            aria-label={person.name}
            className={discClass(i)}
          />
        );
        if (!tooltips) return disc;
        return (
          <TooltipTrigger key={person.id ?? person.name} delay={150}>
            <Focusable>{disc}</Focusable>
            <Tooltip placement="top">
              <span className="block">{person.name}</span>
              {person.description && <span className="block text-text-secondary">{person.description}</span>}
            </Tooltip>
          </TooltipTrigger>
        );
      })}
      {overflowDisc}
    </div>
  );
}
// #endregion

function OverflowDisc({
  count,
  names,
  className,
  tooltips,
  onPress,
}: {
  count: number;
  names: string[];
  className: string;
  tooltips: boolean;
  onPress?: () => void;
}) {
  const a11y = `${count} more: ${names.join(", ")}`;
  const disc = onPress ? (
    <button type="button" aria-label={a11y} onClick={onPress} className={cx(className, "cursor-pointer hover:bg-background-tertiary-hover")}>
      +{count}
    </button>
  ) : (
    <span role="img" aria-label={a11y} className={className}>
      +{count}
    </span>
  );
  if (!tooltips) return disc;
  return (
    <TooltipTrigger delay={150}>
      <Focusable>{disc}</Focusable>
      <Tooltip placement="top">
        {names.map((n, i) => (
          <span key={`${n}-${i}`} className="block">
            {n}
          </span>
        ))}
      </Tooltip>
    </TooltipTrigger>
  );
}
