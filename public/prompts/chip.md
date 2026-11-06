# Build: Chip

A single `<span>` label with a tinted background and a matching text colour, used for statuses ("Completed", "Waiting"), percentage deltas, prices and role tags. Three variants change only the vertical padding and type style, and ten colours map to semantic background/text pairs, so a chip follows light and dark mode without any `dark:` classes. The colour map is exported as `CHIP_COLORS` and reused by Tag Group.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Coloured status, delta and role chips in three emphasis levels and ten theme-aware colour pairs on a 6px radius.

- Category: display
- Runtime cost: css
- Dependencies: none beyond React

## How it works

1. Export `CHIP_COLORS`, a `Record<ChipColor, string>` of background + text pairs. The seven hues use `bg-status-<hue>-background text-status-<hue>-text`. `neutral`, `gray` and `soft` reuse surface tokens (`bg-background-tertiary-default` / `bg-background-secondary-default` with `text-text-secondary` or `text-text-primary`).
2. Build the style map with `sortCx`: `base` is `inline-flex items-center justify-center rounded-md px-1.5 whitespace-nowrap`, and `variant` sets `py-0.5 text-body-medium` (bold), `py-1 text-body-medium` (subtle) or `py-1 text-caption-1-medium` (caption).
3. Define the status tokens per theme. Light pairs the 200 step background with 800 text (purple: 100 with 600). Dark mixes the 950 step at 60% with `transparent` behind 500/400/300 text (purple: 900 at 50% behind 300), so chips glow softly on dark cards instead of sitting as bright blocks.
4. Render one `<span>` whose classes are `cx(base, variant, color, className)`. `cx` is the kit's `tailwind-merge`, so a caller `px-2` or `rounded-full` replaces the default instead of fighting it.
5. Add `transition-[padding,font-size] duration-200` to the base, so a chip that changes variant in place (for example when a table switches density) eases its size instead of jumping.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `horizontal padding / radius = px-1.5 (6px), rounded-md (6px)`
  Shared by every variant so chips of different emphasis line up on their left edges in a column and keep the same corner.
- `variant padding = bold py-0.5 (2px), subtle py-1 (4px), caption py-1 (4px)`
  Bold is the dense status chip that fits a 32px table row (20px line + 4px). Subtle is the roomier price chip. Caption pairs 4px padding with the 12px type style for role tags.
- `type = text-body-medium (14/20, 500) or text-caption-1-medium (12/16, 500)`
  Medium weight keeps the coloured text readable on a tinted fill; the caption tier exists for secondary tags that must not compete with the row's main label.
- `dark status fill = color-mix(in srgb, <hue>-950 60%, transparent)`
  A translucent fill takes on the colour of whatever card it sits on, so the same chip works on primary and secondary dark surfaces.

## API

```ts
type ChipColor = "orange" | "lime" | "rose" | "yellow" | "cyan" | "blue" | "purple" | "neutral" | "gray" | "soft"
const CHIP_COLORS: Record<ChipColor, string>
interface ChipProps extends HTMLAttributes<HTMLSpanElement> { variant?: "bold" | "subtle" | "caption"; color?: ChipColor; ref?: Ref<HTMLSpanElement> }
function Chip(props: ChipProps): JSX.Element
```

- `variant: "bold" | "subtle" | "caption"` — default `"bold"`
  Vertical padding and type style: 2px + 14px, 4px + 14px, or 4px + 12px.
- `color: ChipColor` — default `"neutral"`
  One of ten background/text pairs from `CHIP_COLORS`.
- `className: string`
  Merged last through `tailwind-merge`.
- `ref: Ref<HTMLSpanElement>`
  Forwarded to the span (React 19 ref-as-prop).

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/** Background and text pair per colour, shared with Tag Group's tags. */
export const CHIP_COLORS: Record<ChipColor, string> = {
  orange: "bg-status-orange-background text-status-orange-text",
  lime: "bg-status-lime-background text-status-lime-text",
  rose: "bg-status-rose-background text-status-rose-text",
  yellow: "bg-status-yellow-background text-status-yellow-text",
  cyan: "bg-status-cyan-background text-status-cyan-text",
  blue: "bg-status-blue-background text-status-blue-text",
  purple: "bg-status-purple-background text-status-purple-text",
  neutral: "bg-background-tertiary-default text-text-secondary",
  gray: "bg-background-secondary-default text-text-primary",
  soft: "bg-background-secondary-default text-text-secondary",
};

export interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: ChipVariant;
  color?: ChipColor;
  ref?: Ref<HTMLSpanElement>;
}

const styles = sortCx({
  base: "inline-flex items-center justify-center rounded-md px-1.5 whitespace-nowrap transition-[padding,font-size] duration-200 ease",
  variant: {
    bold: "py-0.5 text-body-medium",
    subtle: "py-1 text-body-medium",
    caption: "py-1 text-caption-1-medium",
  },
  color: CHIP_COLORS,
});

export function Chip({
  variant = "bold",
  color = "neutral",
  className,
  ref,
  ...props
}: ChipProps) {
  return (
    <span
      ref={ref}
      className={cx(styles.base, styles.variant[variant], styles.color[color], className)}
      {...props}
    />
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing to clean up. The component is stateless markup with no listeners, timers or effects.

**Reduced motion.** The only motion is a 200ms padding/font-size transition when a chip changes variant in place. It is not disabled under `prefers-reduced-motion`, since it is a size change, not movement across the screen.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Do not hard-code palette classes such as `bg-lime-200 text-lime-800` on a chip. The semantic `status-*` tokens are what switch to the translucent dark-mode pair.
- Do not remove `whitespace-nowrap`. A two-word status such as "In review" wraps inside a narrow table cell and doubles the row height.
- Do not encode meaning in colour alone. A rose chip still needs its "Failed" or "-3.2%" text.
- Do not add a new colour only to `ChipColor`. It has to exist in `CHIP_COLORS` and as a token in both themes, or the chip renders with no fill.

## Notes

- `CHIP_COLORS` is imported by `tag-group`, so its tags share the exact chip palette.
- The default is `variant="bold"` and `color="neutral"`.

## Definition of done

Twelve chips across all three variants and the ten colours wrap into a ragged cloud. Bold chips are 24px tall, subtle 28px and caption 24px, all with 6px side padding and 6px corners. In light mode the hue chips show a pale fill with dark text; in dark mode the same chips show a translucent dark fill with lighter text. Text never wraps inside a chip.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
