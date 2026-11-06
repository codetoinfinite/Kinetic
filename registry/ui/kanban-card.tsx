/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Kanban Card" (boardui.com/templates/project-board).
 * No BoardUI source was used.
 */
"use client";

import { useId, type HTMLAttributes, type ReactNode, type Ref } from "react";
import { RiArrowRightSLine, RiAttachment2, RiCalendarLine, RiChat3Line, RiFolderLine } from "@remixicon/react";
import { AvatarStack, type AvatarStackPerson } from "@/registry/ui/avatar-stack";
import { PriorityBadge, type Priority } from "@/registry/ui/priority-badge";
import { cx, sortCx } from "@/registry/lib/cx";

/**
 * Ticket card from the project board: "DS-38 › Agent handoff" breadcrumb with
 * the assignee stack on the right, a row of priority + project tags, the
 * ticket title, an optional two-line description and a footer with the age
 * line, comment / attachment counts and a due date.
 *
 * The title is the card's one real control: when `onPress` is set it renders
 * as a button whose hit area is stretched over the whole card (an `::after`
 * overlay), so the card opens on a click anywhere while the avatar tooltips
 * and the `actions` slot sit above that overlay and stay independently
 * focusable. No buttons are nested.
 */

/** How the card is taking part in a drag: still, the dimmed origin, or the lifted ghost under the pointer. */
export type KanbanCardDragState = "idle" | "source" | "overlay";
export type KanbanCardDueState = "upcoming" | "soon" | "overdue";

export interface KanbanCardProps extends Omit<HTMLAttributes<HTMLElement>, "title" | "children"> {
  /** Ticket key, e.g. "DS-38". */
  code: string;
  /** Epic / area after the chevron, e.g. "Agent handoff". */
  area?: string;
  title: string;
  /** Muted body text under the title, clamped to two lines. */
  description?: string;
  priority?: Priority;
  /** Project chips drawn with a folder glyph ("vibl", "BoardUI"). */
  tags?: readonly string[];
  assignees?: readonly AvatarStackPerson[];
  /** Avatars shown before "+N". Default 2 (cards are narrow). */
  maxAssignees?: number;
  comments?: number;
  attachments?: number;
  /** Pre-formatted due label, e.g. "18 Sep". */
  due?: string;
  /** Tints the due chip: `soon` orange, `overdue` rose. Default `upcoming`. */
  dueState?: KanbanCardDueState;
  /** Age / status line at the start of the footer, e.g. "Since 14 Sep". */
  meta?: ReactNode;
  /** Makes the whole card pressable through its title button (open a detail panel, etc.). */
  onPress?: () => void;
  /** Accent ring + `aria-current` for the ticket whose detail is open. */
  isSelected?: boolean;
  dragState?: KanbanCardDragState;
  /** Trailing footer controls (e.g. a move menu). Rendered above the press overlay. */
  actions?: ReactNode;
  /** Heading level of the title. Default 3. */
  headingLevel?: 2 | 3 | 4 | 5;
  ref?: Ref<HTMLElement>;
}

const styles = sortCx({
  card: [
    "group/card relative flex w-full min-w-0 flex-col rounded-xl bg-background-primary-default p-3 text-start shadow-card",
    "transition-[box-shadow,opacity,transform] duration-150 ease-out motion-reduce:transition-none",
  ].join(" "),
  drag: {
    idle: "",
    source: "opacity-40",
    overlay: "rotate-2 scale-[1.02] cursor-grabbing shadow-xl motion-reduce:rotate-0 motion-reduce:scale-100",
  },
  selected: "ring-2 ring-border-focus-ring",
  press: [
    "cursor-pointer rounded-sm text-start outline-none",
    "after:absolute after:inset-0 after:rounded-xl after:content-['']",
    "focus-visible:after:ring-2 focus-visible:after:ring-border-focus-ring",
  ].join(" "),
  tag: "inline-flex min-w-0 items-center gap-1 rounded-md border border-border-button-default px-1.5 text-body-regular text-text-secondary",
  stat: "inline-flex shrink-0 items-center gap-1 text-body-2-regular text-text-secondary",
  due: {
    upcoming: "text-text-secondary",
    soon: "rounded-md bg-status-orange-background px-1 text-status-orange-text",
    overdue: "rounded-md bg-status-rose-background px-1 text-status-rose-text",
  },
});

// #region critical
export function KanbanCard({
  code,
  area,
  title,
  description,
  priority,
  tags = [],
  assignees = [],
  maxAssignees = 2,
  comments,
  attachments,
  due,
  dueState = "upcoming",
  meta,
  onPress,
  isSelected = false,
  dragState = "idle",
  actions,
  headingLevel = 3,
  className,
  ref,
  ...props
}: KanbanCardProps) {
  const titleId = useId();
  const Heading = `h${headingLevel}` as const;
  const hasStats = comments !== undefined || attachments !== undefined || due !== undefined;
  // The ghost copy under the pointer is decoration: keep it out of the tab order and the a11y tree.
  const isOverlay = dragState === "overlay";

  return (
    <article
      ref={ref}
      aria-labelledby={isOverlay ? undefined : titleId}
      aria-hidden={isOverlay || undefined}
      data-selected={isSelected || undefined}
      data-drag-state={dragState}
      className={cx(
        styles.card,
        styles.drag[dragState],
        onPress && dragState === "idle" && "hover:shadow-sm",
        isSelected && styles.selected,
        className,
      )}
      {...props}
    >
      <div className="flex min-h-5 items-center gap-2">
        <p className="flex min-w-0 flex-1 items-center gap-0.5 text-body-regular text-text-secondary">
          <span className="shrink-0">{code}</span>
          {area && (
            <>
              <RiArrowRightSLine aria-hidden className="size-4 shrink-0 text-foreground-icon-tertiary rtl:rotate-180" />
              <span className="truncate">{area}</span>
            </>
          )}
        </p>
        {assignees.length > 0 && (
          <AvatarStack
            people={assignees}
            max={maxAssignees}
            size="xs"
            tooltips={!isOverlay}
            className="relative z-10"
          />
        )}
      </div>

      {(priority || tags.length > 0) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {priority && <PriorityBadge priority={priority} showIcon={false} />}
          {tags.map((tag) => (
            <span key={tag} className={styles.tag}>
              <RiFolderLine aria-hidden className="size-3.5 shrink-0 text-foreground-icon-tertiary" />
              <span className="truncate">{tag}</span>
            </span>
          ))}
        </div>
      )}

      <Heading id={titleId} className="mt-2 text-body-medium text-text-primary">
        {onPress && !isOverlay ? (
          <button
            type="button"
            data-kanban-press
            data-kanban-focus
            aria-current={isSelected ? "true" : undefined}
            onClick={onPress}
            className={styles.press}
          >
            {title}
          </button>
        ) : (
          title
        )}
      </Heading>

      {description && <p className="mt-1 line-clamp-2 text-body-2-regular text-text-secondary">{description}</p>}

      {(meta || hasStats || actions) && (
        <div className="mt-1.5 flex min-h-6 flex-wrap items-center gap-x-3 gap-y-1">
          {meta && <span className="min-w-0 flex-1 truncate text-body-regular text-text-secondary">{meta}</span>}
          {hasStats && (
            <span className={cx("flex items-center gap-2.5", !meta && "flex-1")}>
              {comments !== undefined && (
                <span className={styles.stat}>
                  <RiChat3Line aria-hidden className="size-3.5 text-foreground-icon-tertiary" />
                  {comments}
                  <span className="sr-only">{comments === 1 ? " comment" : " comments"}</span>
                </span>
              )}
              {attachments !== undefined && (
                <span className={styles.stat}>
                  <RiAttachment2 aria-hidden className="size-3.5 text-foreground-icon-tertiary" />
                  {attachments}
                  <span className="sr-only">{attachments === 1 ? " attachment" : " attachments"}</span>
                </span>
              )}
              {due !== undefined && (
                <span className={cx(styles.stat, styles.due[dueState])}>
                  <RiCalendarLine aria-hidden className="size-3.5" />
                  <span className="sr-only">{dueState === "overdue" ? "Overdue, was due " : "Due "}</span>
                  {due}
                </span>
              )}
            </span>
          )}
          {actions && !isOverlay && <span className="relative z-10 ms-auto flex items-center">{actions}</span>}
        </div>
      )}
    </article>
  );
}
// #endregion
