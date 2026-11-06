import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'divider',
  title: 'Divider',
  category: 'display',
  kit: 'boardui',
  tags: ['divider', 'separator', 'hairline', 'layout', 'boardui'],
  blurb: 'Horizontal divider in single-hairline, double-line and filled-strip treatments, with optional start, centre or end content.',
  cost: 'css',
  motif: 'split',

  files: [
    {
      path: 'registry/ui/divider.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: [],

  summary:
    'One primitive for every horizontal break in the kit. With no children it is a bare `role="separator"` rule; with children (a label such as "or", a date heading, a small button) it becomes a flex row whose lines grow around the content. Three variants change the treatment: a single hairline, a pair of framing hairlines, or a soft filled strip on the secondary surface.',

  mechanism: [
    'Decide the branch with `hasContent = children !== undefined && children !== null`, so `0` or an empty string still count as content and only a missing child yields a bare rule.',
    'Empty branch: render one `<div role="separator" aria-orientation="horizontal">` with `w-full` plus the variant\'s empty class: `h-px bg-separator-border` (single), `h-2 border-y border-separator-border` (double) or `h-2 rounded-full bg-background-secondary-default` (fill).',
    'Content branch: render a `<div>` with `w-full`, the variant\'s row class and the `align` justify class. Single is `flex items-center gap-3`; double is `flex items-center border-y border-separator-border py-2.5`; fill is `flex items-center rounded-2lg bg-background-secondary-default px-4 py-2.5`.',
    'Only the single variant draws inline lines. Compute `showLeadingLine = variant === "single" && align !== "start"` and `showTrailingLine = variant === "single" && align !== "end"`, and render each as `<span aria-hidden className="h-px min-w-0 flex-1 bg-separator-border">`, so the content sits at the start, centre or end and the remaining line stays flexible.',
    'Wrap the children in `<div className="shrink-0 text-body-medium text-text-secondary">` merged with `contentClassName`, so a label never shrinks and inherits the kit\'s secondary body style. The root gets `data-variant` and `data-align` for styling hooks.',
  ],

  constants: [
    {
      name: 'gap / line',
      value: 'gap-3 (12px), h-px flex-1',
      why: '12px of air on both sides of the label keeps "or" from touching the rule. `min-w-0` on the lines lets them shrink to nothing in a narrow column rather than pushing the label out.',
    },
    {
      name: 'double / fill padding',
      value: 'py-2.5 (10px); fill adds px-4 and rounded-2lg (10px)',
      why: 'A 20px body line plus 10px top and bottom gives a 40px band, the height of a list section heading in the dashboards.',
    },
    {
      name: 'empty heights',
      value: 'single 1px, double / fill 8px (h-2)',
      why: 'The double rule needs height between its two borders to read as two lines; the fill strip at 8px reads as a soft spacer band.',
    },
    {
      name: 'separator colour',
      value: 'light neutral-200, dark neutral-800',
      why: '`--color-separator-border` is the kit\'s quietest line colour, so dividers never compete with card borders.',
    },
  ],

  pitfalls: [
    'Do not expect the content form to be announced as a separator. Only the empty form carries `role="separator"`; with children the row is plain layout and its label is read as text.',
    'Do not put long, wrapping text in a divider. The content wrapper is `shrink-0`, so a long label pushes the lines to zero and can overflow a narrow column.',
    'Do not pass `children={null}` expecting a labelled divider; `null` and `undefined` both select the bare-rule branch.',
    'Do not hard-code `bg-neutral-200` on a custom line. Use `bg-separator-border` so the hairline flips to neutral-800 in dark mode.',
  ],

  notes: [
    'Children are fully composable: a label, a date, or a compact control such as a "Show more" button all work.',
    'Defaults are `variant="single"` and `align="center"`.',
  ],

  apiSignature:
    'type DividerVariant = "single" | "double" | "fill"\ntype DividerAlign = "start" | "center" | "end"\ninterface DividerProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> { variant?: DividerVariant; align?: DividerAlign; children?: ReactNode; contentClassName?: string; ref?: Ref<HTMLDivElement> }\nfunction Divider(props: DividerProps): JSX.Element',

  props: [
    { name: 'variant', type: '"single" | "double" | "fill"', default: '"single"', description: 'One hairline, two framing hairlines, or a filled secondary-surface strip.' },
    { name: 'align', type: '"start" | "center" | "end"', default: '"center"', description: 'Where the content sits. On the single variant it also removes the line on that side.' },
    { name: 'children', type: 'ReactNode', description: 'Optional label or control. Without it the divider is a bare `role="separator"` rule.' },
    { name: 'contentClassName', type: 'string', description: 'Extra classes for the content wrapper.' },
    { name: 'className', type: 'string', description: 'Merged onto the root through `tailwind-merge`.' },
  ],

  reducedMotion: 'Nothing animates, so the divider renders identically under `prefers-reduced-motion: reduce`.',

  cleanup: 'Nothing to clean up. The component is stateless markup with no listeners, timers or effects.',

  acceptance:
    '`<Divider />` renders a full-width 1px rule with `role="separator"`. `<Divider>or</Divider>` renders "or" centred with a hairline growing on each side and 12px between label and line. `align="start"` removes the leading line so the label sits flush left. The double variant frames its label between a top and bottom border with 10px padding, the fill variant sits on a rounded secondary-surface strip, and all lines switch to the dark separator colour in dark mode.',

  criticalRegion: 'critical',
};

export default meta;
