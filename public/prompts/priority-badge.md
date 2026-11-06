# Build: Priority Badge

The priority pill from the project board cards: "Low" on blue, "Medium" on yellow, "High" on orange and "Urgent" on rose, drawn from the kit's status tokens so it flips cleanly in dark mode. A small three-bar glyph (one, two or three lit bars, an alert tile for urgent) can ride in front of the label so the level still reads for people who cannot tell the colours apart. Sorting helpers (`PRIORITIES`, `PRIORITY_RANK`) ship with it.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Urgent, high, medium and low ticket pills with a signal-bars glyph, in tinted, plain and icon-only looks.

- Category: display
- Runtime cost: css
- Dependencies: none beyond React

## How it works

1. Four levels map to four status token pairs in one `sortCx` table: urgent → `status-rose`, high → `status-orange`, medium → `status-yellow`, low → `status-blue`, each as `bg-status-*-background text-status-*-text`. The dark sheet redefines those tokens as 60% colour-mixed 950 fills with brighter text, so the pill needs no `dark:` classes.
2. `PriorityGlyph` is a 16×16 SVG in `currentColor`: three 3px-wide bars at x = 2, 6.5, 11 with heights 4.5, 8 and 11.5, bottom-aligned at y = 14.5. `LIT_BARS` decides how many are lit (low 1, medium 2, high 3) and the rest draw at 30% opacity. Urgent replaces the bars with a 13px rounded tile and an exclamation cut out in `--color-background-primary-default`, so it reads as a hole in light and dark.
3. The `soft` variant tints the whole pill. The `plain` variant drops the fill, writes the label in `text-text-secondary` and tints only the glyph with the level's text token, for dense lists where five coloured pills in a row get loud.
4. `iconOnly` hides the visible label but keeps "<Level> priority" in an `sr-only` span, so the glyph never becomes an unlabeled image. `label` overrides the visible text for localized copy, and `data-priority` is stamped on the root for styling hooks and tests.
5. `PRIORITIES` lists the levels highest first and `PRIORITY_RANK` gives weights 4…1, so a board can sort with `PRIORITY_RANK[b] - PRIORITY_RANK[a]` without string comparisons.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `md pill = px-1.5 py-px, 14/20 body-regular, radius 6px`
  Measured off the board card: a 22px tall pill with the label in regular weight, the same height as the bordered project tag beside it, so the two sit on one line.
- `sm pill = px-1 py-px, 12/16 caption-1-medium, 12px glyph`
  For table rows and pickers. The glyph shrinks with the type so it never towers over the label.
- `unlit bar opacity = 0.3`
  Enough to show the empty slots (so "low" reads as one of three, not just one bar) while staying clearly off in both themes.
- `PRIORITY_RANK = low 1, medium 2, high 3, urgent 4`
  Integer weights make the board's sort a subtraction and keep "urgent above high" true even if labels are translated.

## API

```ts
type Priority = "urgent" | "high" | "medium" | "low";
function PriorityBadge(props: Omit<HTMLAttributes<HTMLSpanElement>, "children"> & { priority: Priority; variant?: "soft" | "plain"; size?: "sm" | "md"; showIcon?: boolean; iconOnly?: boolean; label?: string; ref?: Ref<HTMLSpanElement> }): JSX.Element
function PriorityGlyph(props: { priority: Priority; className?: string }): JSX.Element
const PRIORITIES: readonly Priority[]; const PRIORITY_LABELS: Record<Priority, string>; const PRIORITY_RANK: Record<Priority, number>
```

- `priority: "urgent" | "high" | "medium" | "low"`
  Level to show. Picks the token pair, glyph and default label.
- `variant: "soft" | "plain"` — default `"soft"`
  Tinted pill, or no fill with a tinted glyph and muted label.
- `size: "sm" | "md"` — default `"md"`
  18px caption pill or 22px body pill.
- `showIcon: boolean` — default `true`
  Draw the bars glyph before the label. Always on for `plain` and `iconOnly`.
- `iconOnly: boolean` — default `false`
  Glyph only; the label moves into an sr-only span.
- `label: string`
  Replaces the visible text, e.g. for localized copy.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/** 3-bar signal glyph in `currentColor`; unlit bars sit at 30% opacity. */
export function PriorityGlyph({ priority, className }: PriorityGlyphProps) {
  if (priority === "urgent") {
    return (
      <svg viewBox="0 0 16 16" aria-hidden className={cx("size-3.5 shrink-0", className)}>
        <rect x="1.5" y="1.5" width="13" height="13" rx="3.5" fill="currentColor" />
        <path d="M8 4.5v4.25" stroke="var(--color-background-primary-default)" strokeWidth="1.75" strokeLinecap="round" />
        <circle cx="8" cy="11.25" r="1" fill="var(--color-background-primary-default)" />
      </svg>
    );
  }
  const lit = LIT_BARS[priority];
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={cx("size-3.5 shrink-0", className)}>
      {[0, 1, 2].map((i) => (
        <rect
          key={i}
          x={2 + i * 4.5}
          y={10 - i * 3.5}
          width="3"
          height={4.5 + i * 3.5}
          rx="1"
          fill="currentColor"
          opacity={i < lit ? 1 : 0.3}
        />
      ))}
    </svg>
  );
}

const styles = sortCx({
  base: "inline-flex shrink-0 items-center whitespace-nowrap rounded-md",
  size: {
    sm: "gap-0.5 px-1 py-px text-caption-1-medium",
    md: "gap-1 px-1.5 py-px text-body-regular",
  },
  soft: {
    urgent: "bg-status-rose-background text-status-rose-text",
    high: "bg-status-orange-background text-status-orange-text",
    medium: "bg-status-yellow-background text-status-yellow-text",
    low: "bg-status-blue-background text-status-blue-text",
  },
  /** Plain: no fill, label in secondary text, only the glyph is tinted. */
  plainGlyph: {
    urgent: "text-status-rose-text",
    high: "text-status-orange-text",
    medium: "text-status-yellow-text",
    low: "text-status-blue-text",
  },
});

export interface PriorityBadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  priority: Priority;
  /** `soft` = tinted pill (board cards); `plain` = glyph + muted label (dense lists). */
  variant?: PriorityBadgeVariant;
  size?: PriorityBadgeSize;
  /** Draw the bars glyph before the label. Forced on for `plain`. */
  showIcon?: boolean;
  /** Hide the visible label (glyph only). The label stays as the accessible name. */
  iconOnly?: boolean;
  /** Override the visible text (e.g. localized copy). */
  label?: string;
  ref?: Ref<HTMLSpanElement>;
}

export function PriorityBadge({
  priority,
  variant = "soft",
  size = "md",
  showIcon = true,
  iconOnly = false,
  label,
  className,
  ref,
  ...props
}: PriorityBadgeProps) {
  const text = label ?? PRIORITY_LABELS[priority];
  const glyph = showIcon || iconOnly || variant === "plain";
  return (
    <span
      ref={ref}
      data-priority={priority}
      className={cx(
        styles.base,
        styles.size[size],
        variant === "soft" ? styles.soft[priority] : "px-0 text-text-secondary",
        iconOnly && (size === "sm" ? "px-0.5" : "px-1"),
        className,
      )}
      {...props}
    >
      {glyph && (
        <PriorityGlyph
          priority={priority}
          className={cx(size === "sm" && "size-3", variant === "plain" && styles.plainGlyph[priority])}
        />
      )}
      {iconOnly ? <span className="sr-only">{`${text} priority`}</span> : text}
    </span>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing to clean up: no state, effects, listeners or timers.

**Reduced motion.** Nothing animates in the badge itself; it is static markup. The demo's row and picker colour transitions are dropped with `motion-reduce:transition-none`.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Hard-coding blue/yellow/orange/rose shades. The status tokens are redefined for dark mode as translucent fills with lighter text; raw shades leave bright pastel blocks on dark cards.
- Relying on colour alone. Yellow and orange are close for many people; keep `showIcon` on wherever the badge is the only priority cue.
- Rendering `iconOnly` without a label. The SVG is `aria-hidden`, so the `sr-only` "<Level> priority" span is the only thing a screen reader hears.
- Sorting by label string. "Urgent" < "Low" alphabetically is meaningless; sort with `PRIORITY_RANK`.

## Notes

- The board cards in BoardUI's template show the text-only pill; pass `showIcon={false}` for that look. Kanban Card does exactly that.
- The urgent tile's cut-out uses the primary surface token, so on a non-white custom surface pass a `className` to the glyph if the hole should match that surface.
- Below 768px the demo shows only the triage queue so it fits a phone screen; the Levels grid joins it from `md` up.

## Definition of done

Four pills render in rose, orange, yellow and blue with labels Urgent, High, Medium, Low; the glyph lights 1, 2 and 3 bars for low, medium and high and shows an alert tile for urgent. In the demo, selecting FE-82 and choosing Urgent changes that row's badge to "Urgent" and, with Priority sort on, moves it to the top of the list; switching to Recent reorders by date. In dark mode every pill keeps readable contrast.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
