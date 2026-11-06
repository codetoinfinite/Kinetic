# Build: Divider

One primitive for every horizontal break in the kit. With no children it is a bare `role="separator"` rule; with children (a label such as "or", a date heading, a small button) it becomes a flex row whose lines grow around the content. Three variants change the treatment: a single hairline, a pair of framing hairlines, or a soft filled strip on the secondary surface.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Horizontal divider in single-hairline, double-line and filled-strip treatments, with optional start, centre or end content.

- Category: display
- Runtime cost: css
- Dependencies: none beyond React

## How it works

1. Decide the branch with `hasContent = children !== undefined && children !== null`, so `0` or an empty string still count as content and only a missing child yields a bare rule.
2. Empty branch: render one `<div role="separator" aria-orientation="horizontal">` with `w-full` plus the variant's empty class: `h-px bg-separator-border` (single), `h-2 border-y border-separator-border` (double) or `h-2 rounded-full bg-background-secondary-default` (fill).
3. Content branch: render a `<div>` with `w-full`, the variant's row class and the `align` justify class. Single is `flex items-center gap-3`; double is `flex items-center border-y border-separator-border py-2.5`; fill is `flex items-center rounded-2lg bg-background-secondary-default px-4 py-2.5`.
4. Only the single variant draws inline lines. Compute `showLeadingLine = variant === "single" && align !== "start"` and `showTrailingLine = variant === "single" && align !== "end"`, and render each as `<span aria-hidden className="h-px min-w-0 flex-1 bg-separator-border">`, so the content sits at the start, centre or end and the remaining line stays flexible.
5. Wrap the children in `<div className="shrink-0 text-body-medium text-text-secondary">` merged with `contentClassName`, so a label never shrinks and inherits the kit's secondary body style. The root gets `data-variant` and `data-align` for styling hooks.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `gap / line = gap-3 (12px), h-px flex-1`
  12px of air on both sides of the label keeps "or" from touching the rule. `min-w-0` on the lines lets them shrink to nothing in a narrow column rather than pushing the label out.
- `double / fill padding = py-2.5 (10px); fill adds px-4 and rounded-2lg (10px)`
  A 20px body line plus 10px top and bottom gives a 40px band, the height of a list section heading in the dashboards.
- `empty heights = single 1px, double / fill 8px (h-2)`
  The double rule needs height between its two borders to read as two lines; the fill strip at 8px reads as a soft spacer band.
- `separator colour = light neutral-200, dark neutral-800`
  `--color-separator-border` is the kit's quietest line colour, so dividers never compete with card borders.

## API

```ts
type DividerVariant = "single" | "double" | "fill"
type DividerAlign = "start" | "center" | "end"
interface DividerProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> { variant?: DividerVariant; align?: DividerAlign; children?: ReactNode; contentClassName?: string; ref?: Ref<HTMLDivElement> }
function Divider(props: DividerProps): JSX.Element
```

- `variant: "single" | "double" | "fill"` — default `"single"`
  One hairline, two framing hairlines, or a filled secondary-surface strip.
- `align: "start" | "center" | "end"` — default `"center"`
  Where the content sits. On the single variant it also removes the line on that side.
- `children: ReactNode`
  Optional label or control. Without it the divider is a bare `role="separator"` rule.
- `contentClassName: string`
  Extra classes for the content wrapper.
- `className: string`
  Merged onto the root through `tailwind-merge`.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
const styles = sortCx({
  root: "w-full",
  line: "h-px min-w-0 flex-1 bg-separator-border",
  content: "shrink-0 text-body-medium text-text-secondary",
  align: {
    start: "justify-start",
    center: "justify-center",
    end: "justify-end",
  },
  withContent: {
    single: "flex items-center gap-3",
    double: "flex items-center border-y border-separator-border py-2.5",
    fill: "flex items-center rounded-2lg bg-background-secondary-default px-4 py-2.5",
  },
  empty: {
    single: "h-px bg-separator-border",
    double: "h-2 border-y border-separator-border",
    fill: "h-2 rounded-full bg-background-secondary-default",
  },
});

/**
 * Horizontal content divider with three BoardUI surface treatments.
 *
 * `single` places content within one continuous hairline, `double` frames it
 * with a line above and below, and `fill` uses the secondary surface color.
 * Children stay completely composable, so labels, buttons, and small controls
 * can share the same primitive.
 */
export function Divider({
  variant = "single",
  align = "center",
  children,
  contentClassName,
  className,
  ref,
  ...props
}: DividerProps) {
  const hasContent = children !== undefined && children !== null;

  if (!hasContent) {
    return (
      <div
        ref={ref}
        role="separator"
        aria-orientation="horizontal"
        data-variant={variant}
        className={cx(styles.root, styles.empty[variant], className)}
        {...props}
      />
    );
  }

  const showLeadingLine = variant === "single" && align !== "start";
  const showTrailingLine = variant === "single" && align !== "end";

  return (
    <div
      ref={ref}
      data-variant={variant}
      data-align={align}
      className={cx(
        styles.root,
        styles.withContent[variant],
        styles.align[align],
        className,
      )}
      {...props}
    >
      {showLeadingLine ? <span aria-hidden className={styles.line} /> : null}
      <div className={cx(styles.content, contentClassName)}>{children}</div>
      {showTrailingLine ? <span aria-hidden className={styles.line} /> : null}
    </div>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing to clean up. The component is stateless markup with no listeners, timers or effects.

**Reduced motion.** Nothing animates, so the divider renders identically under `prefers-reduced-motion: reduce`.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Do not expect the content form to be announced as a separator. Only the empty form carries `role="separator"`; with children the row is plain layout and its label is read as text.
- Do not put long, wrapping text in a divider. The content wrapper is `shrink-0`, so a long label pushes the lines to zero and can overflow a narrow column.
- Do not pass `children={null}` expecting a labelled divider; `null` and `undefined` both select the bare-rule branch.
- Do not hard-code `bg-neutral-200` on a custom line. Use `bg-separator-border` so the hairline flips to neutral-800 in dark mode.

## Notes

- Children are fully composable: a label, a date, or a compact control such as a "Show more" button all work.
- Defaults are `variant="single"` and `align="center"`.

## Definition of done

`<Divider />` renders a full-width 1px rule with `role="separator"`. `<Divider>or</Divider>` renders "or" centred with a hairline growing on each side and 12px between label and line. `align="start"` removes the leading line so the label sits flush left. The double variant frames its label between a top and bottom border with 10px padding, the fill variant sits on a rounded secondary-surface strip, and all lines switch to the dark separator colour in dark mode.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
