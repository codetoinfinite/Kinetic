# Build: Board Empty State

What an empty project board column shows instead of a blank grey strip: a small illustration of three ticket cards stacked on a translucent panel, a short title such as "Nothing in progress", one line of help and an "Add ticket" button. The art is built from plain elements filled with the kit's `project-board-empty-*` tokens, so it flips to the neutral-700 family in dark mode with no images. On hover, keyboard focus or an `active` flag the back and middle cards fan out to either side and the front card lifts. A larger `board` size covers a board with no tickets at all.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Empty board or column: three ticket panels stacked on a soft surface that fan out on hover, with copy and a create button.

- Category: display
- Runtime cost: css
- Dependencies: @remixicon/react@^4.9.0

## How it works

1. The illustration is a `relative` box with the `--color-project-board-empty-panel` fill and the 20px column radius. Three absolutely positioned spans sit inside it: the back card (narrowest, highest, `-empty-back`), the middle card (`-empty-middle`) and the front card (widest, lowest, `-empty-front`). Each is inset more from the sides the further back it is, so the stack reads as depth without any shadows on the back layers.
2. The front card is a flex column holding the detail bars, all `rounded-full` and filled with `--color-project-board-empty-detail` (white in light, neutral-500 in dark): a tag pill and an assignee dot on the first row, then two title lines pushed to the bottom with `mt-auto`, the second shorter and at 70% opacity.
3. The root carries `group/board-empty`. Every layer transitions `translate`, `rotate` and `opacity` over 300ms ease-out with `origin-bottom`, and the fan is three variant stacks on the same values: `group-hover`, `group-has-focus-visible` (Tab onto the button) and `group-data-active` (the `active` prop). The back card turns -6° and slides left, the middle card turns 4° and slides right, and the front card rises 4px.
4. Mounting plays an entrance through `@starting-style` (`starting:translate-y-3 starting:opacity-0`). The middle and front layers carry 50ms and 100ms delays, so the cards settle back to front whenever a column empties.
5. Copy and action are ordinary content under the art: a heading (level set by `headingLevel`), a `text-pretty` description, and either `action` or a primary Button with a plus icon built from `onCreate` / `createLabel`. The button is described by the description text. The root is `role="group"` labelled by the heading so the action is announced in context.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `art size = 160×112 column, 224×144 board`
  The column size leaves 50px of air on either side inside a 260px column; the board size reads at a glance in a wide empty area without competing with the heading.
- `layer insets = back 32px, middle 20px, front 12px from the sides (column)`
  Each layer is about 12px wider than the one behind it, which is enough to see three distinct cards at a small size.
- `fan = back -6° / -16px, middle +4° / +16px, front -4px`
  Opposite turns spread the stack like a hand of cards; small angles keep the back cards inside the panel corners.
- `entrance = 300ms ease-out from 12px below, 0 / 50 / 100ms delays`
  Short enough to finish before a reader reaches the button; the stagger shows that the art is a stack, not one shape.

## API

```ts
function BoardEmptyState(props: Omit<HTMLAttributes<HTMLDivElement>, "title"> & { size?: "column" | "board"; title?: ReactNode; description?: ReactNode; onCreate?: () => void; createLabel?: string; action?: ReactNode; active?: boolean; headingLevel?: 2 | 3 | 4; ref?: Ref<HTMLDivElement> }): JSX.Element; function BoardEmptyIllustration(props: { size?: "column" | "board"; className?: string }): JSX.Element
```

- `size: "column" | "board"` — default `"column"`
  Art size, spacing, heading style and button size.
- `title: ReactNode` — default `"No tickets yet"`
  Heading under the art; also labels the group.
- `description: ReactNode`
  One muted line of help; describes the create button.
- `onCreate: () => void`
  Renders the primary create button.
- `createLabel: string` — default `"New ticket"`
  Label of the create button.
- `action: ReactNode`
  Custom actions in place of the default button.
- `active: boolean` — default `false`
  Holds the cards fanned out, for example while something is dragged over.
- `headingLevel: 2 | 3 | 4` — default `3`
  Heading element for the title.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
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
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing to clean up: no effects, timers or listeners. The entrance is CSS `@starting-style`, which runs once per mount.

**Reduced motion.** The entrance and the fan are both written behind `motion-safe:`, so with reduced motion the stack renders still and in place. Hover, focus and `active` change nothing in the art, and the heading and button work the same.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Writing `bg-project-board-empty-front`: the empty tokens are plain theme variables with no utility behind them. Use the variable shorthand `bg-(--color-project-board-empty-front)`.
- Putting the fan behind a bare `hover:` on the art. The art is `aria-hidden` and small, so the fan never runs for keyboard users; hang it on the root group and include `group-has-focus-visible`.
- Applying `motion-reduce:rotate-none` next to `group-hover:-rotate-6`: both are variants and the later one in the stylesheet wins. Gate the fan and the entrance with `motion-safe:` instead.

## Notes

- Drop it into Kanban Column's `empty` prop; while a card is dragged over an empty column the column shows its drop slot in place of the empty state.
- The demo starts with one ticket in In progress, so To do (first on a phone) and Review show the column size. "Clear board" empties everything and swaps the board for the large size, whose "New ticket" button brings the board back.

## Definition of done

With one ticket in In progress, the To do and Review columns each show the three-card stack, a title ("Nothing queued", "Nothing to review"), one line of help and an "Add ticket" button. Hovering a column's empty state fans the back and middle cards apart and lifts the front card. Clicking "Add ticket" in Review puts "New ticket 1" there and the empty state goes. "Clear board" swaps the board for the large empty state; its "New ticket" button brings back the board with one ticket in To do. In dark mode the cards are neutral-700 shades on a neutral-800 panel with neutral-500 detail bars.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
