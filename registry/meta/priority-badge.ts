import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'priority-badge',
  title: 'Priority Badge',
  category: 'display',
  kit: 'boardui',
  tags: ['badge', 'priority', 'kanban', 'status', 'boardui'],
  blurb: 'Urgent, high, medium and low ticket pills with a signal-bars glyph, in tinted, plain and icon-only looks.',
  cost: 'css',
  motif: 'stack',

  files: [{ path: 'registry/ui/priority-badge.tsx', type: 'registry:ui', role: 'component' }],
  dependencies: [],

  summary:
    'The priority pill from the project board cards: "Low" on blue, "Medium" on yellow, "High" on orange and "Urgent" on rose, drawn from the kit\'s status tokens so it flips cleanly in dark mode. A small three-bar glyph (one, two or three lit bars, an alert tile for urgent) can ride in front of the label so the level still reads for people who cannot tell the colours apart. Sorting helpers (`PRIORITIES`, `PRIORITY_RANK`) ship with it.',

  mechanism: [
    'Four levels map to four status token pairs in one `sortCx` table: urgent → `status-rose`, high → `status-orange`, medium → `status-yellow`, low → `status-blue`, each as `bg-status-*-background text-status-*-text`. The dark sheet redefines those tokens as 60% colour-mixed 950 fills with brighter text, so the pill needs no `dark:` classes.',
    '`PriorityGlyph` is a 16×16 SVG in `currentColor`: three 3px-wide bars at x = 2, 6.5, 11 with heights 4.5, 8 and 11.5, bottom-aligned at y = 14.5. `LIT_BARS` decides how many are lit (low 1, medium 2, high 3) and the rest draw at 30% opacity. Urgent replaces the bars with a 13px rounded tile and an exclamation cut out in `--color-background-primary-default`, so it reads as a hole in light and dark.',
    'The `soft` variant tints the whole pill. The `plain` variant drops the fill, writes the label in `text-text-secondary` and tints only the glyph with the level\'s text token, for dense lists where five coloured pills in a row get loud.',
    '`iconOnly` hides the visible label but keeps "<Level> priority" in an `sr-only` span, so the glyph never becomes an unlabeled image. `label` overrides the visible text for localized copy, and `data-priority` is stamped on the root for styling hooks and tests.',
    '`PRIORITIES` lists the levels highest first and `PRIORITY_RANK` gives weights 4…1, so a board can sort with `PRIORITY_RANK[b] - PRIORITY_RANK[a]` without string comparisons.',
  ],

  constants: [
    { name: 'md pill', value: 'px-1.5 py-px, 14/20 body-regular, radius 6px', why: 'Measured off the board card: a 22px tall pill with the label in regular weight, the same height as the bordered project tag beside it, so the two sit on one line.' },
    { name: 'sm pill', value: 'px-1 py-px, 12/16 caption-1-medium, 12px glyph', why: 'For table rows and pickers. The glyph shrinks with the type so it never towers over the label.' },
    { name: 'unlit bar opacity', value: '0.3', why: 'Enough to show the empty slots (so "low" reads as one of three, not just one bar) while staying clearly off in both themes.' },
    { name: 'PRIORITY_RANK', value: 'low 1, medium 2, high 3, urgent 4', why: 'Integer weights make the board\'s sort a subtraction and keep "urgent above high" true even if labels are translated.' },
  ],

  pitfalls: [
    'Hard-coding blue/yellow/orange/rose shades. The status tokens are redefined for dark mode as translucent fills with lighter text; raw shades leave bright pastel blocks on dark cards.',
    'Relying on colour alone. Yellow and orange are close for many people; keep `showIcon` on wherever the badge is the only priority cue.',
    'Rendering `iconOnly` without a label. The SVG is `aria-hidden`, so the `sr-only` "<Level> priority" span is the only thing a screen reader hears.',
    'Sorting by label string. "Urgent" < "Low" alphabetically is meaningless; sort with `PRIORITY_RANK`.',
  ],

  notes: [
    'The board cards in BoardUI\'s template show the text-only pill; pass `showIcon={false}` for that look. Kanban Card does exactly that.',
    'The urgent tile\'s cut-out uses the primary surface token, so on a non-white custom surface pass a `className` to the glyph if the hole should match that surface.',
    'Below 768px the demo shows only the triage queue so it fits a phone screen; the Levels grid joins it from `md` up.',
  ],

  apiSignature:
    'type Priority = "urgent" | "high" | "medium" | "low";\nfunction PriorityBadge(props: Omit<HTMLAttributes<HTMLSpanElement>, "children"> & { priority: Priority; variant?: "soft" | "plain"; size?: "sm" | "md"; showIcon?: boolean; iconOnly?: boolean; label?: string; ref?: Ref<HTMLSpanElement> }): JSX.Element\nfunction PriorityGlyph(props: { priority: Priority; className?: string }): JSX.Element\nconst PRIORITIES: readonly Priority[]; const PRIORITY_LABELS: Record<Priority, string>; const PRIORITY_RANK: Record<Priority, number>',

  props: [
    { name: 'priority', type: '"urgent" | "high" | "medium" | "low"', description: 'Level to show. Picks the token pair, glyph and default label.' },
    { name: 'variant', type: '"soft" | "plain"', default: '"soft"', description: 'Tinted pill, or no fill with a tinted glyph and muted label.' },
    { name: 'size', type: '"sm" | "md"', default: '"md"', description: '18px caption pill or 22px body pill.' },
    { name: 'showIcon', type: 'boolean', default: 'true', description: 'Draw the bars glyph before the label. Always on for `plain` and `iconOnly`.' },
    { name: 'iconOnly', type: 'boolean', default: 'false', description: 'Glyph only; the label moves into an sr-only span.' },
    { name: 'label', type: 'string', description: 'Replaces the visible text, e.g. for localized copy.' },
  ],

  reducedMotion: 'Nothing animates in the badge itself; it is static markup. The demo\'s row and picker colour transitions are dropped with `motion-reduce:transition-none`.',

  cleanup: 'Nothing to clean up: no state, effects, listeners or timers.',

  acceptance:
    'Four pills render in rose, orange, yellow and blue with labels Urgent, High, Medium, Low; the glyph lights 1, 2 and 3 bars for low, medium and high and shows an alert tile for urgent. In the demo, selecting FE-82 and choosing Urgent changes that row\'s badge to "Urgent" and, with Priority sort on, moves it to the top of the list; switching to Recent reorders by date. In dark mode every pill keeps readable contrast.',

  criticalRegion: 'critical',
};

export default meta;
