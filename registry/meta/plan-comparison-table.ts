/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Plan Comparison Table" (boardui.com/pricing).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'plan-comparison-table',
  title: 'Plan Comparison Table',
  category: 'block',
  kit: 'boardui',
  tags: ['pricing', 'table', 'comparison', 'landing', 'boardui'],
  blurb:
    'Feature-by-plan table with a sticky plan header, collapsible groups, check, dash and text cells, and a tinted highlighted column.',
  cost: 'dom',
  motif: 'grid',

  files: [
    { path: 'registry/ui/plan-comparison-table.tsx', type: 'registry:ui', role: 'component' },
  ],
  dependencies: ['@remixicon/react@^4.9.0'],

  summary:
    'A real `<table>` comparing plans feature by feature. The header row carries each plan name, badge, price and CTA and sticks to the top of the scroll container while you read. Feature rows are grouped; each group has a full-width toggle row that collapses or expands its rows. Cells render a check for `true`, a dash for `false` or a missing value, and plain text for strings. On narrow containers a segmented control picks which single plan column sits beside the labels.',

  mechanism: [
    'The header cells (`th` in `thead`) are `position: sticky` with `top` taken from the `stickyTop` prop and an opaque `bg-background-full`, so rows scroll beneath them. The table uses `border-separate` because sticky cells in a collapsed-border table lose their borders while stuck.',
    'Each group is its own `<tbody>`. Its first row is a `th scope="colgroup"` spanning every column that holds a native button with `aria-expanded` and `aria-controls` listing the ids of the group rows. Collapsed group ids live in a `Set` in state, seeded from `defaultCollapsed`; a collapsed group renders no feature rows at all.',
    'Expanded rows fade in through `@starting-style` (`starting:opacity-0` with a 200ms opacity transition), so expanding needs no JavaScript animation. The chevron rotates by -90deg when the group is closed.',
    '`ValueCell` maps `true` to a check in a tinted circle with sr-only "Included", `false`, `""` or a missing key to a dash with sr-only "Not included", and any other string to text.',
    'The block is a size container. From `@3xl` (48rem) every plan column shows; below that the cells of all plans except `focusPlan` get `hidden`, and a `SegmentedControl` above the table (itself `@3xl:hidden`) switches `focusPlan`. `focusPlan` starts at the highlighted plan, or the first plan.',
    'A highlighted plan tints its whole column with the same class on header, body and footer cells; the header tint is drawn on an inner div with rounded top corners and the footer cell has rounded bottom corners, so the column reads as one tall card. Its CTAs use the primary button.',
    'CTAs appear in the sticky header (small) and again in the footer row (xs). A plan with `cta.href` renders `ButtonLink`; without it a `Button` calls `onSelectPlan(plan.id)`.',
  ],

  constants: [
    { name: 'container breakpoint', value: '@3xl (48rem)', why: 'Below about 768px four plan columns plus labels squeeze each cell under 120px; one focused column keeps values readable.' },
    { name: 'label column', value: '55% narrow, 32% wide', why: 'Labels wrap less than values, so they get the larger share when only one plan is visible.' },
    { name: 'row fade', value: '200ms opacity, ease-out, @starting-style', why: 'Short enough not to delay reading, and @starting-style animates newly inserted rows without measuring heights.' },
    { name: 'TINT', value: 'accent-50 / accent-950 at 40% in dark', why: 'A quiet column wash marks the recommended plan without competing with check marks.' },
  ],

  pitfalls: [
    'Wrapping the table in `overflow: auto` or `overflow: hidden` for a horizontal scroll or rounded clip. That ancestor becomes the sticky containing scroller and the header stops sticking; the block switches columns with container queries instead.',
    'Using `border-collapse: collapse`. Borders of sticky cells disappear while stuck in Chromium; `border-separate border-spacing-0` keeps them.',
    'Collapsing rows with `opacity: 0` or a zero height. They stay in the accessibility tree and screen readers still read them; collapsed rows here are not rendered at all.',
    'A transparent sticky header. Rows would show through it; it needs an opaque background, with the highlighted tint on an inner element.',
  ],

  notes: [
    'Set `stickyTop` to the height of a fixed site header so the plan header docks beneath it.',
    'Values are keyed by plan id, so a plan without an entry in a row shows a dash.',
  ],

  apiSignature:
    'function PlanComparisonTable(props: { plans: ComparisonPlan[]; groups: ComparisonGroup[]; defaultCollapsed?: string[]; stickyTop?: number; label?: string; sublabel?: string; onSelectPlan?: (planId: string) => void; className?: string }): JSX.Element\ninterface ComparisonPlan { id: string; name: string; price: string; period?: string; highlighted?: boolean; badge?: string; cta?: { label: string; href?: string } }\ninterface ComparisonGroup { id: string; title: string; icon?: IconComponent; rows: { id: string; label: string; hint?: string; values: Partial<Record<string, boolean | string>> }[] }',

  props: [
    { name: 'plans', type: 'ComparisonPlan[]', description: 'Columns in display order.' },
    { name: 'groups', type: 'ComparisonGroup[]', description: 'Feature groups; each row maps plan ids to true, false or text.' },
    { name: 'defaultCollapsed', type: 'string[]', default: '[]', description: 'Group ids that start collapsed.' },
    { name: 'stickyTop', type: 'number', default: '0', description: 'Pixel offset of the sticky header from the scroll container top.' },
    { name: 'label', type: 'string', default: '"Compare plans"', description: 'First header cell text and the table caption.' },
    { name: 'sublabel', type: 'string', description: 'Second line in the first header cell.' },
    { name: 'onSelectPlan', type: '(planId: string) => void', description: 'Called by CTAs of plans without `cta.href`.' },
    { name: 'className', type: 'string', description: 'Merged onto the container element.' },
  ],

  reducedMotion:
    'Under `prefers-reduced-motion: reduce` the row fade, the chevron rotation and the toggle hover colour all use `motion-reduce:transition-none`, so groups open and close instantly.',

  cleanup:
    'Nothing to clean up: the block uses only React state and CSS. No listeners, timers or observers are created.',

  acceptance:
    'At 1280px four plan columns show under a header with names, prices and CTAs; the Team column is tinted with a "Popular" pill. Scrolling the page keeps the header row pinned at the top. Clicking the "Support" group toggle reveals its three rows and sets `aria-expanded="true"`; clicking "Components & blocks" hides its five rows. Checks, dashes and text values ("3", "While subscribed") render in the right cells. At 360px only one plan column shows and the segmented control switches it.',

  criticalRegion: 'critical',
};

export default meta;
