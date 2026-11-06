# Build: Kanban Card

The ticket card from the project board: a "DS-38 › Agent handoff" breadcrumb with overlapping assignee avatars on the right, a row with the priority pill and folder-tagged project chips, the title in medium weight, an optional two-line description and a footer with the "Since 14 Sep" line, comment and attachment counts and a tinted due chip. The whole card opens through its title button, whose hit area is stretched over the card, and it carries `source` and `overlay` looks so a board can drag it.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Project board ticket: key and area, assignee stack, priority and project tags, title, description, counts and due date.

- Category: display
- Runtime cost: css
- Dependencies: @remixicon/react@^4.9.0

## How it works

1. The card is an `<article>` labelled by its heading (`aria-labelledby` → the `useId` title id). Layout is one flex column with `p-3` and fixed gaps: breadcrumb row (`min-h-5`), `mt-2` tag row, `mt-2` title, `mt-1` description clamped with `line-clamp-2`, `mt-1.5` footer.
2. When `onPress` is set, the title renders as a `<button data-kanban-press data-kanban-focus>` whose `::after` is `absolute inset-0 rounded-xl`, so a click anywhere on the card lands on the button. The avatar stack and the `actions` slot are `relative z-10`, which lifts them over that overlay and keeps them separately hoverable and focusable without nesting interactive elements. Focus shows as a 2px focus-ring on the overlay, so the whole card outlines.
3. The breadcrumb right side is an `AvatarStack` at size `xs` with `max` 2 by default (the stack only collapses when two or more would hide, so three people show as three discs). The tag row is a `PriorityBadge` with `showIcon={false}` (the text-only pill the board uses) followed by bordered chips with a 14px `RiFolderLine`.
4. Footer stats are text plus a 14px icon; each number carries an `sr-only` noun ("4 comments", "Overdue, was due 12 Sep") so the icons can stay `aria-hidden`. `dueState` picks no tint, `bg-status-orange-background` (soon) or `bg-status-rose-background` (overdue).
5. `dragState` swaps the visual role during a board drag: `source` drops to 40% opacity in place, `overlay` tilts 2° and scales to 1.02 with `shadow-xl`, removes the press button, actions and tooltips, and sets `aria-hidden` so the ghost copy never doubles up in the accessibility tree.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `card padding / radius = p-3 (12px), rounded-xl (12px)`
  Measured off the board: text starts 12px in from a 12px-radius white card that sits 6px inside the 20px-radius column.
- `row gaps = mt-2 tags, mt-2 title, mt-1 description, mt-1.5 footer`
  Reproduces the 146px card height of the reference with a two-line title.
- `maxAssignees = 2`
  Cards are ~260px wide; two 20px discs plus "+N" leave room for a long area name before it truncates.
- `overlay transform = rotate-2 scale-[1.02] shadow-xl`
  Enough lift to read as "picked up" without the ghost covering the drop slot beneath it.
- `source opacity = 0.4`
  The origin stays visible as a placeholder so the user can see where a cancelled drag will return.

## API

```ts
function KanbanCard(props: Omit<HTMLAttributes<HTMLElement>, "title" | "children"> & { code: string; area?: string; title: string; description?: string; priority?: Priority; tags?: readonly string[]; assignees?: readonly AvatarStackPerson[]; maxAssignees?: number; comments?: number; attachments?: number; due?: string; dueState?: "upcoming" | "soon" | "overdue"; meta?: ReactNode; onPress?: () => void; isSelected?: boolean; dragState?: "idle" | "source" | "overlay"; actions?: ReactNode; headingLevel?: 2 | 3 | 4 | 5; ref?: Ref<HTMLElement> }): JSX.Element
```

- `code: string`
  Ticket key shown first in the breadcrumb, e.g. "DS-38".
- `area: string`
  Epic or area after the chevron; truncates.
- `title: string`
  Ticket title; also the accessible name of the card and its press button.
- `description: string`
  Muted text under the title, clamped to two lines.
- `priority: "urgent" | "high" | "medium" | "low"`
  Shows a text-only PriorityBadge.
- `tags: readonly string[]` — default `[]`
  Project chips with a folder glyph.
- `assignees: readonly AvatarStackPerson[]` — default `[]`
  Avatar stack on the breadcrumb row, with name tooltips.
- `maxAssignees: number` — default `2`
  Discs before the rest collapse into "+N".
- `comments / attachments: number`
  Footer counts with chat and paperclip glyphs.
- `due: string`
  Pre-formatted due label for the calendar chip.
- `dueState: "upcoming" | "soon" | "overdue"` — default `"upcoming"`
  Tints the due chip (none, orange, rose) and words its sr-only prefix.
- `meta: ReactNode`
  Age line at the start of the footer, e.g. "Since 14 Sep".
- `onPress: () => void`
  Makes the card pressable through a stretched title button.
- `isSelected: boolean` — default `false`
  Focus-ring outline and `aria-current` for the open ticket.
- `dragState: "idle" | "source" | "overlay"` — default `"idle"`
  Dimmed origin or lifted, aria-hidden ghost during a drag.
- `actions: ReactNode`
  Trailing footer controls, layered above the press overlay.
- `headingLevel: 2 | 3 | 4 | 5` — default `3`
  Heading element used for the title.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
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
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing to clean up: the card has no effects, timers or listeners. Avatar tooltips are React Aria overlays that unmount with the card.

**Reduced motion.** Only the hover shadow, opacity and ghost transform transition; all of it is dropped with `motion-reduce:transition-none`, and the overlay keeps its shadow but loses the tilt and scale (`motion-reduce:rotate-0 motion-reduce:scale-100`).

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Wrapping the whole card in a `<button>`: the avatar tooltips and any menu in `actions` become nested interactive content. Use the stretched title button and keep extra controls `relative z-10`.
- Forgetting `aria-hidden` on the drag ghost. Two cards with the same name in the tree confuse screen readers and the flow tests that query by role.
- Colouring the due date only. The `sr-only` "Overdue, was due" prefix carries the meaning for people who cannot see the tint.

## Notes

- The card owns no state; selection, drag state and actions come from the board around it. Kanban Column passes `dragState` through its item render prop.
- Photos work through `AvatarStackPerson.src`; the demo uses initials so it stays offline.

## Definition of done

The demo shows three cards: DS-38 with two avatars, a blue "Low" pill and a "vibl" folder chip; FE-79 with a description, "4" comments, "2" attachments and an orange "18 Sep" due chip; DS-31 with an "Urgent" pill, two avatars plus "+2" and a rose overdue chip. FE-79 starts outlined. Clicking DS-31 anywhere moves the outline to it and the caption reads "Open: DS-31"; clicking it again clears the selection. Hovering an avatar shows the person's name. Tab reaches each card's title button and Enter selects it. Dark mode keeps white text on neutral-800 cards on a neutral-900 panel.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
