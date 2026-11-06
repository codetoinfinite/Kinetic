# Build: Plan Comparison Table

A real `<table>` comparing plans feature by feature. The header row carries each plan name, badge, price and CTA and sticks to the top of the scroll container while you read. Feature rows are grouped; each group has a full-width toggle row that collapses or expands its rows. Cells render a check for `true`, a dash for `false` or a missing value, and plain text for strings. On narrow containers a segmented control picks which single plan column sits beside the labels.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Feature-by-plan table with a sticky plan header, collapsible groups, check, dash and text cells, and a tinted highlighted column.

- Category: block
- Runtime cost: dom
- Dependencies: @remixicon/react@^4.9.0

## How it works

1. The header cells (`th` in `thead`) are `position: sticky` with `top` taken from the `stickyTop` prop and an opaque `bg-background-full`, so rows scroll beneath them. The table uses `border-separate` because sticky cells in a collapsed-border table lose their borders while stuck.
2. Each group is its own `<tbody>`. Its first row is a `th scope="colgroup"` spanning every column that holds a native button with `aria-expanded` and `aria-controls` listing the ids of the group rows. Collapsed group ids live in a `Set` in state, seeded from `defaultCollapsed`; a collapsed group renders no feature rows at all.
3. Expanded rows fade in through `@starting-style` (`starting:opacity-0` with a 200ms opacity transition), so expanding needs no JavaScript animation. The chevron rotates by -90deg when the group is closed.
4. `ValueCell` maps `true` to a check in a tinted circle with sr-only "Included", `false`, `""` or a missing key to a dash with sr-only "Not included", and any other string to text.
5. The block is a size container. From `@3xl` (48rem) every plan column shows; below that the cells of all plans except `focusPlan` get `hidden`, and a `SegmentedControl` above the table (itself `@3xl:hidden`) switches `focusPlan`. `focusPlan` starts at the highlighted plan, or the first plan.
6. A highlighted plan tints its whole column with the same class on header, body and footer cells; the header tint is drawn on an inner div with rounded top corners and the footer cell has rounded bottom corners, so the column reads as one tall card. Its CTAs use the primary button.
7. CTAs appear in the sticky header (small) and again in the footer row (xs). A plan with `cta.href` renders `ButtonLink`; without it a `Button` calls `onSelectPlan(plan.id)`.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `container breakpoint = @3xl (48rem)`
  Below about 768px four plan columns plus labels squeeze each cell under 120px; one focused column keeps values readable.
- `label column = 55% narrow, 32% wide`
  Labels wrap less than values, so they get the larger share when only one plan is visible.
- `row fade = 200ms opacity, ease-out, @starting-style`
  Short enough not to delay reading, and @starting-style animates newly inserted rows without measuring heights.
- `TINT = accent-50 / accent-950 at 40% in dark`
  A quiet column wash marks the recommended plan without competing with check marks.

## API

```ts
function PlanComparisonTable(props: { plans: ComparisonPlan[]; groups: ComparisonGroup[]; defaultCollapsed?: string[]; stickyTop?: number; label?: string; sublabel?: string; onSelectPlan?: (planId: string) => void; className?: string }): JSX.Element
interface ComparisonPlan { id: string; name: string; price: string; period?: string; highlighted?: boolean; badge?: string; cta?: { label: string; href?: string } }
interface ComparisonGroup { id: string; title: string; icon?: IconComponent; rows: { id: string; label: string; hint?: string; values: Partial<Record<string, boolean | string>> }[] }
```

- `plans: ComparisonPlan[]`
  Columns in display order.
- `groups: ComparisonGroup[]`
  Feature groups; each row maps plan ids to true, false or text.
- `defaultCollapsed: string[]` — default `[]`
  Group ids that start collapsed.
- `stickyTop: number` — default `0`
  Pixel offset of the sticky header from the scroll container top.
- `label: string` — default `"Compare plans"`
  First header cell text and the table caption.
- `sublabel: string`
  Second line in the first header cell.
- `onSelectPlan: (planId: string) => void`
  Called by CTAs of plans without `cta.href`.
- `className: string`
  Merged onto the container element.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
function ValueCell({ value }: { value: ComparisonValue | undefined }) {
  if (value === true) {
    return (
      <span className="inline-grid size-5 place-items-center rounded-full bg-badge-new-background text-badge-new-text">
        <RiCheckLine aria-hidden className="size-3.5" />
        <span className="sr-only">Included</span>
      </span>
    );
  }
  if (value === false || value === undefined || value === "") {
    return (
      <span className="inline-flex text-foreground-icon-quaternary">
        <RiSubtractLine aria-hidden className="size-4" />
        <span className="sr-only">Not included</span>
      </span>
    );
  }
  return <span className="text-body-medium text-text-primary">{value}</span>;
}

export function PlanComparisonTable({
  plans,
  groups,
  defaultCollapsed = [],
  stickyTop = 0,
  label = "Compare plans",
  sublabel,
  onSelectPlan,
  className,
}: PlanComparisonTableProps) {
  const uid = useId();
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set(defaultCollapsed));
  // On narrow containers only one plan column fits beside the labels; this picks it.
  const [focusPlan, setFocusPlan] = useState(() => (plans.find((p) => p.highlighted) ?? plans[0])?.id ?? "");

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Every plan column is visible from @3xl; below it only the focused plan's column is.
  const planCol = (plan: ComparisonPlan) =>
    cx(plan.id === focusPlan ? "table-cell" : "hidden @3xl:table-cell", plan.highlighted && TINT);

  const cta = (plan: ComparisonPlan, size: "small" | "xs") => {
    if (!plan.cta) return null;
    const variant = plan.highlighted ? "primary" : "secondary";
    const cls = "w-full rounded-full";
    return plan.cta.href ? (
      <ButtonLink href={plan.cta.href} size={size} variant={variant} className={cls}>
        {plan.cta.label}
      </ButtonLink>
    ) : (
      <Button size={size} variant={variant} className={cls} onClick={() => onSelectPlan?.(plan.id)}>
        {plan.cta.label}
      </Button>
    );
  };

  return (
    <div className={cx("@container w-full", className)}>
      {plans.length > 1 && (
        <div className="mb-4 flex justify-center @3xl:hidden">
          <SegmentedControl
            aria-label="Plan to compare"
            selectedKeys={new Set([focusPlan])}
            onSelectionChange={(keys) => {
              const next = [...keys][0];
              if (typeof next === "string") setFocusPlan(next);
            }}
          >
            {plans.map((plan) => (
              <SegmentedControlItem key={plan.id} id={plan.id}>
                {plan.name}
              </SegmentedControlItem>
            ))}
          </SegmentedControl>
        </div>
      )}

      <table className="w-full table-fixed border-separate border-spacing-0 text-left">
        <caption className="sr-only">{label}</caption>
        <thead>
          <tr>
            <th
              scope="col"
              style={{ top: stickyTop }}
              className="sticky z-10 w-[55%] border-b border-separator-border bg-background-full px-3 pt-5 pb-4 align-bottom @3xl:w-[32%] @3xl:px-4"
            >
              <span className="block text-title-3-medium text-text-primary">{label}</span>
              {sublabel && <span className="mt-1 block text-body-2-regular text-text-tertiary">{sublabel}</span>}
            </th>
            {plans.map((plan) => (
              <th
                key={plan.id}
                scope="col"
                style={{ top: stickyTop }}
                className={cx(
                  "sticky z-10 border-b border-separator-border bg-background-full p-0 align-bottom",
                  plan.id === focusPlan ? "table-cell" : "hidden @3xl:table-cell",
                )}
              >
                <div className={cx("flex h-full flex-col gap-3 rounded-t-2xl px-3 pt-5 pb-4 @3xl:px-4", plan.highlighted && TINT)}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-headline-medium text-text-primary">{plan.name}</span>
                    {plan.badge && (
                      <span className="rounded-full bg-badge-new-background px-2 py-0.5 text-caption-2-semibold text-badge-new-text">
                        {plan.badge}
                      </span>
                    )}
                  </div>
                  <p className="flex items-baseline gap-1">
                    <span className="text-title-1-medium tracking-tight text-text-primary tabular-nums">{plan.price}</span>
                    {plan.period && <span className="text-caption-1-regular text-text-tertiary">{plan.period}</span>}
                  </p>
                  {cta(plan, "small")}
                </div>
              </th>
            ))}
          </tr>
        </thead>

        {groups.map((group) => {
          const open = !collapsed.has(group.id);
          const rowIds = group.rows.map((row) => `${uid}-${group.id}-${row.id}`);
          const GroupIcon = group.icon;
          return (
            <tbody key={group.id}>
              <tr>
                <th scope="colgroup" colSpan={plans.length + 1} className="px-0 pt-6 pb-1">
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={rowIds.join(" ")}
                    onClick={() => toggle(group.id)}
                    className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl bg-background-secondary-default px-3 py-2.5 text-left outline-none transition-colors duration-150 ease-out hover:bg-background-secondary-hover focus-visible:ring-2 focus-visible:ring-border-focus-ring motion-reduce:transition-none @3xl:px-4"
                  >
                    {GroupIcon && <GroupIcon aria-hidden className="size-4 shrink-0 text-foreground-icon-secondary" />}
                    <span className="text-body-semibold text-text-primary">{group.title}</span>
                    <span className="text-caption-1-regular text-text-tertiary tabular-nums">{group.rows.length}</span>
                    <RiArrowDownSLine
                      aria-hidden
                      className={cx(
                        "ml-auto size-4 shrink-0 text-foreground-icon-tertiary transition-transform duration-200 ease-out motion-reduce:transition-none",
                        !open && "-rotate-90",
                      )}
                    />
                  </button>
                </th>
              </tr>
              {open &&
                group.rows.map((row, i) => (
                  <tr
                    key={row.id}
                    id={rowIds[i]}
                    className="transition-opacity duration-200 ease-out starting:opacity-0 motion-reduce:transition-none"
                  >
                    <th scope="row" className="border-b border-separator-border px-3 py-3 align-middle font-normal @3xl:px-4">
                      <span className="block text-body-regular text-text-secondary">{row.label}</span>
                      {row.hint && <span className="mt-0.5 block text-caption-1-regular text-text-tertiary">{row.hint}</span>}
                    </th>
                    {plans.map((plan) => (
                      <td
                        key={plan.id}
                        className={cx("border-b border-separator-border px-3 py-3 align-middle @3xl:px-4", planCol(plan))}
                      >
                        <ValueCell value={row.values[plan.id]} />
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          );
        })}

        <tfoot>
          <tr>
            <td className="px-3 pt-4 pb-5 @3xl:px-4" />
            {plans.map((plan) => (
              <td key={plan.id} className={cx("rounded-b-2xl px-3 pt-4 pb-5 @3xl:px-4", planCol(plan))}>
                {cta(plan, "xs")}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing to clean up: the block uses only React state and CSS. No listeners, timers or observers are created.

**Reduced motion.** Under `prefers-reduced-motion: reduce` the row fade, the chevron rotation and the toggle hover colour all use `motion-reduce:transition-none`, so groups open and close instantly.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Wrapping the table in `overflow: auto` or `overflow: hidden` for a horizontal scroll or rounded clip. That ancestor becomes the sticky containing scroller and the header stops sticking; the block switches columns with container queries instead.
- Using `border-collapse: collapse`. Borders of sticky cells disappear while stuck in Chromium; `border-separate border-spacing-0` keeps them.
- Collapsing rows with `opacity: 0` or a zero height. They stay in the accessibility tree and screen readers still read them; collapsed rows here are not rendered at all.
- A transparent sticky header. Rows would show through it; it needs an opaque background, with the highlighted tint on an inner element.

## Notes

- Set `stickyTop` to the height of a fixed site header so the plan header docks beneath it.
- Values are keyed by plan id, so a plan without an entry in a row shows a dash.

## Definition of done

At 1280px four plan columns show under a header with names, prices and CTAs; the Team column is tinted with a "Popular" pill. Scrolling the page keeps the header row pinned at the top. Clicking the "Support" group toggle reveals its three rows and sets `aria-expanded="true"`; clicking "Components & blocks" hides its five rows. Checks, dashes and text values ("3", "While subscribed") render in the right cells. At 360px only one plan column shows and the segmented control switches it.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
