/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Board Empty State" (boardui.com/templates/project-board).
 * No BoardUI source was used.
 */

import { useId } from "react";
import type { HTMLAttributes, ReactNode, Ref } from "react";
import { RiAddLine } from "@remixicon/react";
import { Button } from "@/registry/ui/button";
import { cx, sortCx } from "@/registry/lib/cx";

export type BoardEmptyStateSize = "column" | "board";

/*
 * Every layer transitions translate / rotate / opacity. The fan (hover, keyboard
 * focus inside, or `active`) and the entrance (`starting:`) are both motion-safe
 * only, so reduced motion gets a still stack that simply appears.
 */
const layer =
  "absolute origin-bottom transition-[translate,rotate,opacity] duration-300 ease-out motion-safe:starting:translate-y-3 motion-safe:starting:opacity-0";

const fan = {
  back: "motion-safe:group-hover/board-empty:-rotate-6 motion-safe:group-has-focus-visible/board-empty:-rotate-6 motion-safe:group-data-active/board-empty:-rotate-6",
  middle: "motion-safe:group-hover/board-empty:rotate-4 motion-safe:group-has-focus-visible/board-empty:rotate-4 motion-safe:group-data-active/board-empty:rotate-4",
  front: "motion-safe:group-hover/board-empty:-translate-y-1 motion-safe:group-has-focus-visible/board-empty:-translate-y-1 motion-safe:group-data-active/board-empty:-translate-y-1",
};

const styles = sortCx({
  root: {
    column: "gap-3 px-3 py-6",
    board: "gap-4 px-6 py-10",
  },
  art: {
    column: "h-28 w-40",
    board: "h-36 w-56",
  },
  back: {
    column: "inset-x-8 top-3 h-12 rounded-lg motion-safe:group-hover/board-empty:-translate-x-4 motion-safe:group-has-focus-visible/board-empty:-translate-x-4 motion-safe:group-data-active/board-empty:-translate-x-4",
    board: "inset-x-12 top-4 h-16 rounded-xl motion-safe:group-hover/board-empty:-translate-x-6 motion-safe:group-has-focus-visible/board-empty:-translate-x-6 motion-safe:group-data-active/board-empty:-translate-x-6",
  },
  middle: {
    column: "inset-x-5 top-5 h-14 rounded-lg motion-safe:group-hover/board-empty:translate-x-4 motion-safe:group-has-focus-visible/board-empty:translate-x-4 motion-safe:group-data-active/board-empty:translate-x-4",
    board: "inset-x-8 top-7 h-18 rounded-xl motion-safe:group-hover/board-empty:translate-x-6 motion-safe:group-has-focus-visible/board-empty:translate-x-6 motion-safe:group-data-active/board-empty:translate-x-6",
  },
  front: {
    column: "inset-x-3 top-8 bottom-3 gap-1.5 rounded-xl p-2.5",
    board: "inset-x-4 top-11 bottom-4 gap-2 rounded-xl p-3",
  },
  pill: { column: "h-2.5 w-8", board: "h-3 w-11" },
  dot: { column: "size-3.5", board: "size-4" },
  line: { column: "h-2", board: "h-2.5" },
  title: {
    column: "text-body-semibold",
    board: "text-headline-semibold",
  },
  description: {
    column: "max-w-56 text-body-2-regular",
    board: "max-w-80 text-body-regular",
  },
});

export interface BoardEmptyIllustrationProps {
  size?: BoardEmptyStateSize;
  className?: string;
}

// #region critical
/**
 * Three ticket-shaped panels stacked on the translucent empty-panel surface:
 * back and middle peek out above the front one, which carries the detail bars
 * (tag pill, assignee dot, two title lines). Inside a `group/board-empty`
 * the back and middle panels fan out to either side and the front one lifts.
 */
export function BoardEmptyIllustration({ size = "column", className }: BoardEmptyIllustrationProps) {
  const detail = "rounded-full bg-(--color-project-board-empty-detail)";
  return (
    <div
      aria-hidden
      data-board-empty-art
      className={cx(
        "relative isolate shrink-0 rounded-2-5xl bg-(--color-project-board-empty-panel)",
        styles.art[size],
        className,
      )}
    >
      <span data-layer="back" className={cx(layer, fan.back, styles.back[size], "bg-(--color-project-board-empty-back)")} />
      <span
        data-layer="middle"
        className={cx(layer, fan.middle, styles.middle[size], "bg-(--color-project-board-empty-middle) delay-50")}
      />
      <span
        data-layer="front"
        className={cx(
          layer,
          fan.front,
          styles.front[size],
          "flex flex-col bg-(--color-project-board-empty-front) shadow-xs delay-100",
        )}
      >
        <span className="flex items-center justify-between">
          <span className={cx(detail, styles.pill[size])} />
          <span className={cx(detail, styles.dot[size])} />
        </span>
        <span className={cx(detail, styles.line[size], "mt-auto w-4/5")} />
        <span className={cx(detail, styles.line[size], "w-1/2 opacity-70")} />
      </span>
    </div>
  );
}

export interface BoardEmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  /** "column" fits a 272px board column; "board" fills an empty board or filtered view. */
  size?: BoardEmptyStateSize;
  title?: ReactNode;
  description?: ReactNode;
  /** Shows the default primary button with a plus icon. */
  onCreate?: () => void;
  createLabel?: string;
  /** Replaces the default button, e.g. a pair of buttons or a link. */
  action?: ReactNode;
  /** Holds the panels fanned out, e.g. while a card is dragged over the column. */
  active?: boolean;
  headingLevel?: 2 | 3 | 4;
  ref?: Ref<HTMLDivElement>;
}

export function BoardEmptyState({
  size = "column",
  title = "No tickets yet",
  description,
  onCreate,
  createLabel = "New ticket",
  action,
  active = false,
  headingLevel = 3,
  className,
  ref,
  ...props
}: BoardEmptyStateProps) {
  const titleId = useId();
  const descriptionId = useId();
  const Heading = `h${headingLevel}` as const;
  const button =
    action ??
    (onCreate ? (
      <Button
        size={size === "board" ? "medium" : "small"}
        leadingIcon={RiAddLine}
        onClick={onCreate}
        aria-describedby={description ? descriptionId : undefined}
      >
        {createLabel}
      </Button>
    ) : null);

  return (
    <div
      ref={ref}
      role="group"
      aria-labelledby={titleId}
      data-board-empty={size}
      data-active={active ? "" : undefined}
      className={cx(
        "group/board-empty flex flex-col items-center justify-center text-center",
        styles.root[size],
        className,
      )}
      {...props}
    >
      <BoardEmptyIllustration size={size} />
      <div className="flex flex-col items-center gap-1">
        <Heading id={titleId} className={cx("text-text-primary", styles.title[size])}>
          {title}
        </Heading>
        {description && (
          <p id={descriptionId} className={cx("text-pretty text-text-secondary", styles.description[size])}>
            {description}
          </p>
        )}
      </div>
      {button && <div className="flex flex-wrap items-center justify-center gap-2">{button}</div>}
    </div>
  );
}
// #endregion
