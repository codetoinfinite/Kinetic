import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'meter',
  title: 'Meter',
  category: 'display',
  kit: 'boardui',
  tags: ['meter', 'usage', 'quota', 'gauge', 'react-aria', 'boardui'],
  blurb: 'A level within a known range (storage, seats, quotas) with accent, success, warning and error tones, on React Aria Meter.',
  cost: 'css',
  motif: 'split',

  files: [
    {
      path: 'registry/ui/meter.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['react-aria-components@^1.22.1'],

  summary:
    'A labelled rail that shows a quantity within a known range: storage used, seats taken, API quota. It is React Aria\'s `Meter`, so it is announced as `role="meter"` (a level, not a task heading towards done), and it is drawn on Progress\'s `ProgressTrack`, sharing the same rail and eased translate fill. A `tone` recolours the fill from semantic tokens so a meter can turn amber or red as it nears its limit.',

  mechanism: [
    'Map `tone` to a text-colour class in a `sortCx` map: `accent` → `text-accent-500`, `success` → `text-notification-success-foreground`, `warning` → `text-chart-8-active`, `error` → `text-notification-error-foreground`. The fill paints in `currentColor`, so a text class is all it takes.',
    'Render `AriaMeter` with every React Aria prop passed through (`value`, `minValue`, `maxValue`, `valueLabel`, `formatOptions`) and `flex w-full flex-col gap-1.5` on the root.',
    'Use the render props `{ percentage, valueText }`. When there is a label or the value is shown, render a `flex items-baseline justify-between gap-3` row: the kit `Label` (truncated) and `valueText` in `text-body-medium text-text-secondary tabular-nums`. `showValueLabel` defaults to `label != null`.',
    'Render `<ProgressTrack percentage={percentage} size={size} className={tones[tone]} />`: a `bg-border-button-default` rail 4 / 6 / 8px tall whose full-width fill is shifted by `translate` and eases over 500ms on `cubic-bezier(0.22,1,0.36,1)` when the value changes.',
    'Render the optional `description` underneath in `text-caption-1-medium text-text-secondary`.',
  ],

  constants: [
    {
      name: 'tone tokens',
      value: 'accent-500; success lime-600 (dark lime-300); warning yellow-500 (chart-8-active); error rose-600 (dark rose-300)',
      why: 'Semantic tokens rather than palette classes, so the fill keeps its contrast on dark cards, where success and error lighten to the 300 step.',
    },
    {
      name: 'track',
      value: 'h-1 / h-1.5 / h-2 (4 / 6 / 8px), default md',
      why: 'Shared with ProgressBar so a meter and a progress bar stacked on one card are identical rails.',
    },
    {
      name: 'fill easing',
      value: '500ms cubic-bezier(0.22, 1, 0.36, 1) on translate',
      why: 'Inherited from ProgressTrack: a value change eases in on the compositor instead of animating width.',
    },
  ],

  pitfalls: [
    'Do not use a Meter for a task in progress (an upload, an import). That is a ProgressBar; Meter is announced as a level and has no indeterminate state.',
    'Do not pass a raw count without `maxValue`. React Aria assumes 0..100, so `value={19}` for 19 of 20 seats renders as 19% full.',
    'Do not encode the status only in the tone colour. Put the number or a description next to it ("1 seat left").',
    'Do not recolour the fill with `bg-*` classes. The fill is `bg-current`; set a text colour (or `tone`) instead.',
  ],

  notes: [
    '`valueLabel` (React Aria) replaces the formatted percentage with custom text, e.g. "7.2 of 10 GB".',
    'Tone thresholds are the caller\'s decision; the component never switches tone by itself.',
  ],

  apiSignature:
    'type MeterTone = "accent" | "success" | "warning" | "error"\ninterface MeterProps extends Omit<AriaMeterProps, "children" | "className"> { label?: ReactNode; showValueLabel?: boolean; description?: ReactNode; tone?: MeterTone; size?: ProgressSize; className?: string }\nfunction Meter(props: MeterProps): JSX.Element',

  props: [
    { name: 'value', type: 'number', default: '0', description: 'Current level (React Aria).' },
    { name: 'minValue / maxValue', type: 'number', default: '0 / 100', description: 'The range the value sits in (React Aria).' },
    { name: 'valueLabel', type: 'ReactNode', description: 'Custom value text instead of the formatted percentage (React Aria).' },
    { name: 'label', type: 'ReactNode', description: 'Label above the rail; also turns the value label on by default.' },
    { name: 'showValueLabel', type: 'boolean', description: 'Show the value at the end of the label row. Defaults to `label != null`.' },
    { name: 'description', type: 'ReactNode', description: 'Helper text under the rail.' },
    { name: 'tone', type: '"accent" | "success" | "warning" | "error"', default: '"accent"', description: 'Colour of the fill.' },
    { name: 'size', type: '"sm" | "md" | "lg"', default: '"md"', description: '4, 6 or 8px rail.' },
  ],

  reducedMotion:
    'The fill\'s 500ms translate transition is removed by ProgressTrack\'s `motion-reduce:transition-none`, so a new value appears immediately.',

  cleanup: 'Nothing to clean up. The component is stateless apart from React Aria\'s render props; there are no listeners or timers.',

  acceptance:
    '`<Meter label="Seats" value={19} maxValue={20} tone="warning" />` renders "Seats" with "95%" on the right and a 6px rail filled 95% in amber, exposed as `role="meter"` with aria-valuenow 19. `valueLabel="7.2 of 10 GB"` replaces the percentage text. Changing the value eases the fill to its new length over half a second, and the error tone fill is rose in light mode and a lighter rose in dark mode.',

  criticalRegion: 'critical',
};

export default meta;
