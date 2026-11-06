import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'color',
  title: 'Color',
  category: 'display',
  kit: 'boardui',
  tags: ['color', 'tokens', 'palette', 'theme', 'dark-mode', 'docs', 'boardui'],
  blurb:
    'Semantic colour token palette: grouped swatch tables with light and dark values read from the theme, click a token to copy its variable.',
  cost: 'css',
  motif: 'grid',

  files: [{ path: 'registry/ui/color.tsx', type: 'registry:ui', role: 'component' }],
  dependencies: ['@remixicon/react@^4.9.0'],

  summary:
    'A docs palette for the semantic layer of the kit theme. The tokens are grouped into Background, Text, Border, Status and Chart. Each group is a bordered table, and each row has a live swatch, the custom property name, the utility that consumes it, and what the token points to in the light and the dark theme. The light and dark columns are read from the loaded stylesheets, not typed in, so they stay correct when the theme changes. They show both themes whichever one the page is in. Clicking a token copies `--color-…` to the clipboard.',

  mechanism: [
    '`COLOR_GROUPS` lists 74 tokens in five groups. Each token has its variable name and a display-only utility string (`bg-…`, `text-…`, `border-…`, `ring-…`, `fill-…`, `placeholder:text-…`).',
    'On mount, `readThemeValues` walks `document.styleSheets`, recursing into `@import` and `@layer`/`@supports` blocks and skipping `@media`. It keeps only style rules whose selector list contains exactly `:root` (light) or `.dark` (dark), and reads each wanted custom property with `rule.style.getPropertyValue`. Cross-origin sheets throw on `cssRules` and are skipped. A token that `.dark` never overrides takes its light value.',
    '`formatColorValue` turns the raw declarations into palette names: `var(--color-neutral-950)` becomes `neutral-950`, and `color-mix(in srgb, var(--color-neutral-800) 60%, transparent)` becomes `neutral-800 / 60%`. The light and dark chips are painted with the raw value itself, so they resolve through the primitives and show the other theme correctly.',
    'The main swatch in each row is painted with `var(<token>)`, so it follows whichever theme is active with no JS. Rows are a CSS grid with ARIA table roles. One template gives aligned columns: three columns on phones (the utility moves under the name and the light/dark labels become screen-reader text), and four from `lg`.',
    'One `useCopyToClipboard` instance in `ColorPalette` serves every row. `lastCopied` records which token was clicked, so only that row shows the lime check for 1.4s. A `role="status"` span announces "Copied --color-…".',
  ],

  constants: [
    { name: 'groups', value: 'background 14, text 10, border 13, status 16, chart 21', why: 'Every semantic colour that components consume. Primitives (`neutral-*`, `accent-*`) stay out, because components must never use them directly.' },
    { name: 'row grid', value: '1.4fr / 1fr / 9.5rem / 9.5rem from lg, 1fr / auto / auto (chips only) on phones', why: 'Fixed value columns keep the light and dark chips aligned across rows and fit "neutral-700 / 60%". On phones the names get almost the whole width and wrap instead of truncating.' },
    { name: 'swatch', value: '22px, rounded-md, 1px inset ring border-button-default', why: 'The inset ring keeps white and transparent swatches visible on a white card without changing their size.' },
    { name: 'copy reset', value: '1400 ms', why: 'Long enough to see the check, short enough for copying several tokens in a row.' },
  ],

  pitfalls: [
    'Reading values with `getComputedStyle(document.documentElement)`. That only returns the active theme, and only the resolved colour, so the light column shows dark values in dark mode and the primitive name is lost.',
    'Treating a `@media (prefers-color-scheme: dark) { :root { … } }` block as light. That is why `@media` rules are skipped while walking.',
    'Painting the dark chip with `var(--token)`. On a light page that resolves to the light value. The chip has to use the declared `.dark` value, which references primitives that do not change with the theme.',
  ],

  notes: [
    '`readThemeValues` and `formatColorValue` are exported, so a design-review tool can diff token declarations between two themes.',
    'Pass `groups={["status"]}` to put a single table on a badge or chip docs page, and `query` to wire a search field.',
  ],

  apiSignature:
    'function ColorPalette(props: { groups?: readonly string[]; query?: string; headingLevel?: 2 | 3 | 4; onCopied?: (name: string) => void; className?: string; ref?: Ref<HTMLDivElement> }): JSX.Element\nfunction ColorTokenTable(props: { group: ColorGroup; values: ReadonlyMap<string, ThemeValue>; copiedName?: string | null; onCopy: (name: string) => void; headingLevel?: 2 | 3 | 4; className?: string }): JSX.Element\nfunction readThemeValues(names: readonly string[]): Map<string, { light?: string; dark?: string }>\nfunction formatColorValue(raw: string): string\nconst COLOR_GROUPS: readonly ColorGroup[]',

  props: [
    { name: 'groups', type: 'readonly string[]', default: 'all five', description: 'Group ids to show: `background`, `text`, `border`, `status`, `chart`.' },
    { name: 'query', type: 'string', default: '""', description: 'Case-insensitive filter on variable and utility names. Groups with no matches are hidden.' },
    { name: 'headingLevel', type: '2 | 3 | 4', default: '3', description: 'Heading level of each group title.' },
    { name: 'onCopied', type: '(name: string) => void', description: 'Called with the variable name after a successful copy.' },
    { name: 'className', type: 'string', description: 'Extra classes on the stack of groups.' },
  ],

  reducedMotion:
    'Nothing animates apart from the hover tint and the copy icon fade. Both use `motion-reduce:transition-none`.',

  cleanup:
    'The stylesheet read runs once in a mount effect and adds no listeners or observers. The copied-state timeout belongs to `useCopyToClipboard` and is cleared on unmount.',

  acceptance:
    'In light mode the `--color-text-primary` row shows a near-black swatch, `text-text-primary`, Light `neutral-950` and Dark `neutral-50`. Switching the page to dark turns the swatch near-white while the Light and Dark columns stay the same. `--color-background-inner-default` shows Dark `neutral-800 / 60%`. Clicking a token puts exactly `--color-…` on the clipboard and shows a lime check on that row only. Filtering with "chart" leaves only the Chart group. At 360px each row shows the swatch, name, utility and two value chips with no horizontal scroll.',

  criticalRegion: 'critical',
};

export default meta;
