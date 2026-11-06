# Build: Color

A docs palette for the semantic layer of the kit theme. The tokens are grouped into Background, Text, Border, Status and Chart. Each group is a bordered table, and each row has a live swatch, the custom property name, the utility that consumes it, and what the token points to in the light and the dark theme. The light and dark columns are read from the loaded stylesheets, not typed in, so they stay correct when the theme changes. They show both themes whichever one the page is in. Clicking a token copies `--color-…` to the clipboard.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Semantic colour token palette: grouped swatch tables with light and dark values read from the theme, click a token to copy its variable.

- Category: display
- Runtime cost: css
- Dependencies: @remixicon/react@^4.9.0

## How it works

1. `COLOR_GROUPS` lists 74 tokens in five groups. Each token has its variable name and a display-only utility string (`bg-…`, `text-…`, `border-…`, `ring-…`, `fill-…`, `placeholder:text-…`).
2. On mount, `readThemeValues` walks `document.styleSheets`, recursing into `@import` and `@layer`/`@supports` blocks and skipping `@media`. It keeps only style rules whose selector list contains exactly `:root` (light) or `.dark` (dark), and reads each wanted custom property with `rule.style.getPropertyValue`. Cross-origin sheets throw on `cssRules` and are skipped. A token that `.dark` never overrides takes its light value.
3. `formatColorValue` turns the raw declarations into palette names: `var(--color-neutral-950)` becomes `neutral-950`, and `color-mix(in srgb, var(--color-neutral-800) 60%, transparent)` becomes `neutral-800 / 60%`. The light and dark chips are painted with the raw value itself, so they resolve through the primitives and show the other theme correctly.
4. The main swatch in each row is painted with `var(<token>)`, so it follows whichever theme is active with no JS. Rows are a CSS grid with ARIA table roles. One template gives aligned columns: three columns on phones (the utility moves under the name and the light/dark labels become screen-reader text), and four from `lg`.
5. One `useCopyToClipboard` instance in `ColorPalette` serves every row. `lastCopied` records which token was clicked, so only that row shows the lime check for 1.4s. A `role="status"` span announces "Copied --color-…".

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `groups = background 14, text 10, border 13, status 16, chart 21`
  Every semantic colour that components consume. Primitives (`neutral-*`, `accent-*`) stay out, because components must never use them directly.
- `row grid = 1.4fr / 1fr / 9.5rem / 9.5rem from lg, 1fr / auto / auto (chips only) on phones`
  Fixed value columns keep the light and dark chips aligned across rows and fit "neutral-700 / 60%". On phones the names get almost the whole width and wrap instead of truncating.
- `swatch = 22px, rounded-md, 1px inset ring border-button-default`
  The inset ring keeps white and transparent swatches visible on a white card without changing their size.
- `copy reset = 1400 ms`
  Long enough to see the check, short enough for copying several tokens in a row.

## API

```ts
function ColorPalette(props: { groups?: readonly string[]; query?: string; headingLevel?: 2 | 3 | 4; onCopied?: (name: string) => void; className?: string; ref?: Ref<HTMLDivElement> }): JSX.Element
function ColorTokenTable(props: { group: ColorGroup; values: ReadonlyMap<string, ThemeValue>; copiedName?: string | null; onCopy: (name: string) => void; headingLevel?: 2 | 3 | 4; className?: string }): JSX.Element
function readThemeValues(names: readonly string[]): Map<string, { light?: string; dark?: string }>
function formatColorValue(raw: string): string
const COLOR_GROUPS: readonly ColorGroup[]
```

- `groups: readonly string[]` — default `all five`
  Group ids to show: `background`, `text`, `border`, `status`, `chart`.
- `query: string` — default `""`
  Case-insensitive filter on variable and utility names. Groups with no matches are hidden.
- `headingLevel: 2 | 3 | 4` — default `3`
  Heading level of each group title.
- `onCopied: (name: string) => void`
  Called with the variable name after a successful copy.
- `className: string`
  Extra classes on the stack of groups.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
function collect(rules: CSSRuleList, names: ReadonlySet<string>, out: Map<string, ThemeValue>) {
  for (const rule of Array.from(rules)) {
    if (rule instanceof CSSImportRule) {
      if (rule.styleSheet) safeCollect(rule.styleSheet, names, out);
    } else if (rule instanceof CSSStyleRule) {
      // Only the two theme scopes count; `.dark[data-accent]` and friends are refinements.
      const selectors = rule.selectorText.split(",").map((s) => s.trim());
      const scope = selectors.includes(".dark") ? "dark" : selectors.includes(":root") ? "light" : null;
      if (!scope) continue;
      for (const name of names) {
        const value = rule.style.getPropertyValue(name).trim();
        if (value) out.set(name, { ...out.get(name), [scope]: value });
      }
    } else if (!(rule instanceof CSSMediaRule) && "cssRules" in rule) {
      // @layer / @supports blocks; @media is skipped so a colour-scheme query is never read as light.
      collect((rule as CSSGroupingRule).cssRules, names, out);
    }
  }
}

function safeCollect(sheet: CSSStyleSheet, names: ReadonlySet<string>, out: Map<string, ThemeValue>) {
  try {
    collect(sheet.cssRules, names, out);
  } catch {
    // Cross-origin sheets throw on cssRules; they never hold the kit theme.
  }
}

/**
 * Reads what each token is declared as in the light (`:root`) and dark
 * (`.dark`) scopes straight from the loaded stylesheets, so the table shows
 * both themes no matter which one the page is in. Client only.
 */
export function readThemeValues(names: readonly string[]): Map<string, ThemeValue> {
  const out = new Map<string, ThemeValue>();
  const wanted = new Set(names);
  for (const sheet of Array.from(document.styleSheets)) safeCollect(sheet, wanted, out);
  for (const [name, value] of out) if (!value.dark && value.light) out.set(name, { ...value, dark: value.light });
  return out;
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The stylesheet read runs once in a mount effect and adds no listeners or observers. The copied-state timeout belongs to `useCopyToClipboard` and is cleared on unmount.

**Reduced motion.** Nothing animates apart from the hover tint and the copy icon fade. Both use `motion-reduce:transition-none`.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Reading values with `getComputedStyle(document.documentElement)`. That only returns the active theme, and only the resolved colour, so the light column shows dark values in dark mode and the primitive name is lost.
- Treating a `@media (prefers-color-scheme: dark) { :root { … } }` block as light. That is why `@media` rules are skipped while walking.
- Painting the dark chip with `var(--token)`. On a light page that resolves to the light value. The chip has to use the declared `.dark` value, which references primitives that do not change with the theme.

## Notes

- `readThemeValues` and `formatColorValue` are exported, so a design-review tool can diff token declarations between two themes.
- Pass `groups={["status"]}` to put a single table on a badge or chip docs page, and `query` to wire a search field.

## Definition of done

In light mode the `--color-text-primary` row shows a near-black swatch, `text-text-primary`, Light `neutral-950` and Dark `neutral-50`. Switching the page to dark turns the swatch near-white while the Light and Dark columns stay the same. `--color-background-inner-default` shows Dark `neutral-800 / 60%`. Clicking a token puts exactly `--color-…` on the clipboard and shows a lime check on that row only. Filtering with "chart" leaves only the Chart group. At 360px each row shows the swatch, name, utility and two value chips with no horizontal scroll.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
