# Build: Badge

A `<span>` with two colour tones and one fixed shape, 12px semibold type in a 4px-radius pill. It exists so every count in the kit (sidebar items, tab counts, unread totals) has the same metrics. The tone tracks the selection state of whatever holds it, not the meaning of the number.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

The small numeric counter on nav items and unread totals: a 16px pill in a selected (blue) or resting (neutral) tone.

- Category: display
- Runtime cost: css
- Dependencies: none beyond React

## How it works

1. The shape is one class string: `inline-flex` centred content, `px-1 py-px`, `rounded-sm` and the kit's `text-caption-1-semibold` type style (12px over a 16px line). With one pixel of vertical padding the pill is 18px tall, short enough to sit inside a 32px nav row without pushing its height.
2. `whitespace-nowrap` keeps "1,204" or "99+" on one line. Combined with `inline-flex` the pill grows with its content, and there is no fixed width that a three-digit count could overflow.
3. `primary` uses `bg-accent-400` with white text and is meant for a badge inside the selected nav item, where the row itself is tinted. `neutral` uses the `badge-neutral-background` token with secondary text for every other row. The neutral token is redefined in `.dark`, so the same class reads correctly on both themes.
4. All other attributes spread onto the `<span>`, so `aria-label="12 unread"` or a `title` pass straight through. `className` merges through `tailwind-merge`, so `rounded-full` replaces `rounded-sm` instead of both applying.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `padding = px-1 py-px (4px / 1px)`
  Figma's counter spec. Horizontal padding of 4px keeps a single digit almost square. Larger vertical padding makes the badge taller than the label text it sits beside, and the nav row starts to look uneven.
- `type = text-caption-1-semibold, tracking-normal`
  The smallest tier in the kit's type scale. `tracking-normal` overrides the negative tracking the scale applies at larger sizes, because tight tracking at 12px makes adjacent digits such as 11 merge into one shape.

## API

```ts
function Badge(props: HTMLAttributes<HTMLSpanElement> & { color?: "primary" | "neutral"; ref?: Ref<HTMLSpanElement> }): JSX.Element
```

- `color: "primary" | "neutral"` — default `"neutral"`
  `primary` (blue fill, white text) inside a selected row; `neutral` everywhere else.
- `children: ReactNode`
  The count or short label. Keep it to a few characters.
- `className: string`
  Merged through `tailwind-merge`, so conflicting utilities replace the defaults.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
const styles = sortCx({
  base: "inline-flex items-center justify-center rounded-sm px-1 py-px text-caption-1-semibold tracking-normal whitespace-nowrap",
  color: {
    primary: "bg-accent-400 text-white",
    neutral: "bg-badge-neutral-background text-text-secondary",
  },
});

export function Badge({ color = "neutral", className, ref, ...props }: BadgeProps) {
  return (
    <span
      ref={ref}
      className={cx(styles.base, styles.color[color], className)}
      {...props}
    />
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing to clean up. The component renders a styled span with no state, effects or listeners.

**Reduced motion.** Nothing animates. The badge is static, so there is no motion to reduce.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Choosing the tone by meaning ("red for errors"). Badge has no status palette on purpose: its tone follows selection. For status use `Chip` or `StatusDot`, which do carry status colours.
- Using a bare number as the only label. A screen reader hears "12" with no context. Pass `aria-label` ("12 unread messages"), or make sure the surrounding link text explains the count.
- Giving the pill a fixed `w-*` so counts line up. Three digits then clip or wrap. Align the column with the parent's layout instead, for example `ms-auto` in a flex row.

## Notes

- The sidebar, tabs and notification centre all import this file, so changing its metrics changes every count in the kit at once. That shared source is the reason it is its own item.

## Definition of done

A neutral badge reads clearly on the page background in both light and dark themes, and a primary badge is legible white-on-blue inside a selected nav row. "7", "48" and "1,204" all sit on one line with even side padding, and the pill is no taller than the 16px label line beside it. A consumer `rounded-full` turns it into a full pill without leaving `rounded-sm` in the computed styles.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
