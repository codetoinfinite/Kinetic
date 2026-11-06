# Build: Props Table

A documentation table for a component API: prop name in a grey code chip, the TypeScript type in the purple command colour, the default in muted code and a plain-language description. Required and deprecated props get small tinted tags. When the slot it sits in is narrower than 42rem, the same table re-flows into one bordered card per prop with Type and Default labels.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

API props table with code-styled names, types and defaults; long unions collapse, and narrow slots stack each prop into a card.

- Category: display
- Runtime cost: css
- Dependencies: none beyond React

## How it works

1. The root is an `@container`; every layout switch uses `@2xl:` container variants, so the table reacts to the width of the column it lives in (a sidebar, a modal, a phone) rather than the viewport.
2. Mobile-first, the `<table>`, `<tbody>` and `<tr>` are `block` / `flex flex-col` and each row is a rounded bordered card; from `@2xl` they return to `table`, `table-row-group` and `table-row` with a top separator instead of a card border. Explicit `role="table|rowgroup|row|columnheader|rowheader|cell"` attributes keep the semantics that `display` overrides strip in some engines.
3. The header row is `sr-only` in card mode (`@2xl:not-sr-only` brings it back) and each cell carries its own `aria-hidden` label ("Type", "Default") that is `@2xl:hidden`, so sighted users get labels in cards while screen readers keep the column headers.
4. A string `type` is split by `splitUnion`, which walks the string and only splits on `|` at depth 0 outside quotes (tracking `([{<` and ignoring the `>` of `=>`). Unions with more than `maxUnionMembers` members show the first ones plus a "+N more" button with `aria-expanded` / `aria-controls`; the expanded rows are kept in a `Set` keyed by prop name.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `stack breakpoint = @2xl (42rem / 672px container width)`
  Below this the four columns squeeze descriptions into 2-3 words per line; the card layout reads better.
- `maxUnionMembers = 4 (demo uses 3)`
  Four literal members fit one line of a 30% column; longer unions wrap into a wall of code.
- `column widths = 22% / 30% / 14% / rest`
  Types need the most room after descriptions; defaults are short literals.
- `cell padding = px-4 py-3, header py-2.5`
  Matches the 16px inset of the docs preview cards and keeps rows at a ~44px minimum.

## API

```ts
function PropsTable(props: { rows: PropsTableRow[]; caption?: string; maxUnionMembers?: number; labels?: PropsTableLabels; idPrefix?: string; className?: string }): JSX.Element
type PropsTableRow = { name: string; type: string | ReactNode; default?: string | ReactNode; description?: ReactNode; required?: boolean; deprecated?: boolean }
function splitUnion(type: string): string[]
```

- `rows: PropsTableRow[]`
  One entry per prop: name, type, optional default, description, required and deprecated flags.
- `caption: string`
  Visually hidden `<caption>` naming the table.
- `maxUnionMembers: number` — default `4`
  Unions longer than this collapse behind a "+N more" toggle; 0 never collapses.
- `labels: PropsTableLabels` — default `{ name: "Prop", type: "Type", default: "Default", description: "Description", ... }`
  Header and tag wording, for localisation.
- `idPrefix: string`
  Gives each row an id of `<idPrefix>-<name>` for deep links.
- `className: string`
  Merged onto the container element.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/**
 * Splits a type string on `|` at nesting depth 0, so
 * `"a" | Array<"b" | "c"> | (() => void)` yields three members.
 */
export function splitUnion(type: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let start = 0;
  for (let i = 0; i < type.length; i++) {
    const ch = type[i];
    if (quote) {
      if (ch === quote && type[i - 1] !== "\\") quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    else if (ch === "(" || ch === "[" || ch === "{" || ch === "<") depth++;
    else if (ch === ")" || ch === "]" || ch === "}" || (ch === ">" && type[i - 1] !== "=")) depth = Math.max(0, depth - 1);
    else if (ch === "|" && depth === 0) {
      parts.push(type.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(type.slice(start).trim());
  return parts.filter(Boolean);
}

function TypeCell({
  type,
  max,
  expanded,
  onToggle,
  controlsId,
}: {
  type: PropsTableRow["type"];
  max: number;
  expanded: boolean;
  onToggle: () => void;
  controlsId: string;
}) {
  if (typeof type !== "string") return <>{type}</>;
  const members = splitUnion(type);
  const collapsible = max > 0 && members.length > max;
  const shown = collapsible && !expanded ? members.slice(0, max) : members;
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-1 gap-y-0.5">
      <code id={controlsId} className="font-mono text-caption-1-regular break-words text-docs-command-accent">
        {shown.map((member, i) => (
          <span key={`${member}-${i}`}>
            {i > 0 ? <span className="text-text-tertiary"> | </span> : null}
            {member}
          </span>
        ))}
      </code>
      {collapsible ? (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={controlsId}
          onClick={onToggle}
          className={cx(
            "cursor-pointer rounded-md px-1 text-caption-1-medium text-text-tertiary outline-none",
            "transition-colors duration-150 ease-out hover:bg-background-secondary-hover hover:text-text-primary motion-reduce:transition-none",
            "focus-visible:ring-2 focus-visible:ring-border-focus-ring",
          )}
        >
          {expanded ? "Show less" : `+${members.length - max} more`}
        </button>
      ) : null}
    </span>
  );
}

const CELL_LABEL = "w-20 shrink-0 text-caption-1-medium text-text-tertiary @2xl:hidden";

export function PropsTable({
  rows,
  caption,
  maxUnionMembers = 4,
  labels: labelsProp,
  idPrefix,
  className,
}: PropsTableProps) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp };
  const baseId = useId();
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const toggle = (name: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  // Explicit ARIA roles keep table semantics while the narrow layout sets
  // every element to block/flex (display overrides strip implicit roles in
  // some engines). The layout switch is a container query, so it follows the
  // width of the slot the table sits in, not the viewport.
  return (
    <div className={cx("@container w-full", className)}>
      <div className="@2xl:overflow-hidden @2xl:rounded-2xl @2xl:border @2xl:border-border-component-detail-container @2xl:bg-background-primary-default">
        <table role="table" className="block w-full border-collapse text-start @2xl:table">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead role="rowgroup" className="sr-only @2xl:not-sr-only @2xl:table-header-group">
            <tr role="row" className="@2xl:bg-background-secondary-default">
              {[
                [labels.name, "w-[22%]"],
                [labels.type, "w-[30%]"],
                [labels.default, "w-[14%]"],
                [labels.description, ""],
              ].map(([label, width]) => (
                <th
                  key={label}
                  role="columnheader"
                  scope="col"
                  className={cx("px-4 py-2.5 text-start align-middle text-caption-1-medium text-text-tertiary", width)}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody role="rowgroup" className="flex flex-col gap-2 @2xl:table-row-group">
            {rows.map((row) => {
              const typeId = `${baseId}-${row.name}-type`;
              return (
                <tr
                  key={row.name}
                  role="row"
                  id={idPrefix ? `${idPrefix}-${row.name}` : undefined}
                  className={cx(
                    "flex scroll-mt-20 flex-col gap-2 rounded-2xl border border-border-component-detail-container bg-background-primary-default p-4",
                    "@2xl:table-row @2xl:rounded-none @2xl:border-0 @2xl:border-t @2xl:border-border-table @2xl:bg-transparent @2xl:p-0",
                    "@2xl:target:bg-background-secondary-default",
                  )}
                >
                  <th role="rowheader" scope="row" className="block text-start font-normal @2xl:table-cell @2xl:px-4 @2xl:py-3 @2xl:align-top">
                    <span className="inline-flex flex-wrap items-center gap-1.5">
                      <code
                        className={cx(
                          "rounded-md bg-background-secondary-default px-1.5 py-0.5 font-mono text-caption-1-medium text-text-primary",
                          row.deprecated && "text-text-tertiary line-through",
                        )}
                      >
                        {row.name}
                      </code>
                      {row.required ? (
                        <span className="rounded-sm bg-status-rose-background px-1 text-caption-2-medium text-status-rose-text">
                          {labels.required}
                        </span>
                      ) : null}
                      {row.deprecated ? (
                        <span className="rounded-sm bg-status-yellow-background px-1 text-caption-2-medium text-status-yellow-text">
                          {labels.deprecated}
                        </span>
                      ) : null}
                    </span>
                  </th>
                  <td role="cell" className="flex gap-3 @2xl:table-cell @2xl:px-4 @2xl:py-3 @2xl:align-top">
                    <span aria-hidden className={CELL_LABEL}>
                      {labels.type}
                    </span>
                    <TypeCell
                      type={row.type}
                      max={maxUnionMembers}
                      expanded={expanded.has(row.name)}
                      onToggle={() => toggle(row.name)}
                      controlsId={typeId}
                    />
                  </td>
                  <td role="cell" className="flex gap-3 @2xl:table-cell @2xl:px-4 @2xl:py-3 @2xl:align-top">
                    <span aria-hidden className={CELL_LABEL}>
                      {labels.default}
                    </span>
                    {row.default === undefined ? (
                      <span className="text-caption-1-regular text-text-tertiary">
                        <span aria-hidden>—</span>
                        <span className="sr-only">{labels.none}</span>
                      </span>
                    ) : typeof row.default === "string" ? (
                      <code className="font-mono text-caption-1-regular break-words text-text-secondary">{row.default}</code>
                    ) : (
                      row.default
                    )}
                  </td>
                  <td
                    role="cell"
                    className={cx(
                      "block text-body-regular text-text-secondary @2xl:table-cell @2xl:border-0 @2xl:px-4 @2xl:py-3 @2xl:align-top",
                      row.description ? "border-t border-border-table pt-3" : "hidden",
                    )}
                  >
                    {row.description}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing to release: no timers, listeners or observers. Container queries are pure CSS.

**Reduced motion.** Only the "+N more" button has a 150ms colour transition, removed with `motion-reduce:transition-none`. The layout switch is instant.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Using viewport breakpoints (`md:`) for the stack switch. A props table in a narrow docs column on a wide screen would stay a cramped table; a container query follows the slot.
- Setting `display: block` on table elements without explicit ARIA roles. Some browsers then expose a flat list of text with no row or column relationships.
- Splitting union types on every `|`. Pipes inside generics, tuples, object types or string literals belong to one member.
- Labelling card cells with visible text that screen readers also hear next to the real column header. Mark the inline labels `aria-hidden`.

## Notes

- Pass a ReactNode as `type` or `default` to skip union splitting and render your own markup (links to type docs, for example).
- With `idPrefix`, each row gets `id="<prefix>-<name>"` and `scroll-mt-20`, and a `:target` row is highlighted in table mode.

## Definition of done

At full width the demo shows a bordered table with Prop, Type, Default and Description headers and six LineChartCard rows; `data` carries a "required" tag and `curve` a struck-through name with "deprecated". The `range` type shows three members and "+3 more"; clicking it reveals all six and the button reads "Show less" with aria-expanded="true". Switching to ChartTooltip swaps to four rows. Choosing Narrow constrains the slot to 360px and the same rows become separate cards with "Type" and "Default" labels while the header row disappears visually.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
