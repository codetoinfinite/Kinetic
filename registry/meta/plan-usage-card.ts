/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Plan Usage Card" (boardui.com/).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'plan-usage-card',
  title: 'Plan Usage Card',
  category: 'display',
  kit: 'boardui',
  tags: ['usage', 'billing', 'plan', 'meter', 'limits', 'boardui'],
  blurb:
    'A plan\'s rolling limits as thin meters with reset times, turning amber then red as they fill, plus renewal date and upgrade.',
  cost: 'css',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/plan-usage-card.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['react-aria-components@^1.22.1', '@remixicon/react@^4.9.0'],

  summary:
    'A compact usage tile for a subscription: the plan name in the header, one row per limit (a 5-hour window, weekly caps) with its label, when it resets and the share used, a 4px meter under each row, and a footer with the renewal date and an Upgrade button. Meters change colour as they fill so the limit that will stop you first stands out. `bare` drops the surface so the same rows can sit under a context-window card in one "Agent limits" tile.',

  mechanism: [
    'Clamp each limit\'s `used` to 0–100 and round it; pick a tone from two thresholds: `accent` below `warnAt` (70), `warning` from 70, `error` from `criticalAt` (90).',
    'Render every row as a react-aria `Meter` with `aria-label` = the limit label and a `valueLabel` that reads "38% used, Resets in 2 hr 46 min", so screen readers get the number and the reset together while the visible row splits them into label, muted reset text and a tabular percentage.',
    'Draw the bar with the kit `ProgressTrack` at size `sm` (4px). Its fill paints `bg-current`, so the tone is just a text colour class on the track; the fill slides with a 500ms transform transition when usage changes.',
    'Colour the percentage figure with the same tone once it leaves `accent`, with a 300ms colour transition, so amber and red show in the number as well as the bar.',
    'Render the footer only when `renews` or `onUpgrade` is given: a hairline top border, the renewal text on the left and a primary `xs` Button with a trailing arrow on the right. Omitting `onUpgrade` (e.g. on the top plan) removes the button.',
  ],

  constants: [
    {
      name: 'tone thresholds',
      value: 'warnAt 70, criticalAt 90',
      why: 'Amber leaves time to act before a limit runs out; red at 90 matches the point where one long agent run can end the window.',
    },
    {
      name: 'bar height',
      value: 'ProgressTrack size sm (4px)',
      why: 'Same hairline as the context window bar above it in the Agent limits tile, so the two read as one family.',
    },
    {
      name: 'percent column',
      value: 'w-9, text-end, tabular-nums',
      why: 'A fixed column keeps "3%" and "100%" right-aligned so the reset texts line up row to row.',
    },
  ],

  pitfalls: [
    'Building the bar from a bare div with a width style. You lose the meter role and its value text; the RAC Meter gives both for free.',
    'Putting the reset time only in the visible row. Screen readers announce the meter value without it unless it is part of `valueLabel`.',
    'Signalling the limit state with colour alone. The percentage stays printed next to every bar, so amber and red are reinforcement, not the only cue.',
  ],

  notes: [
    'Nest it with `bare` as `children` of the Context Window Card to get the full Agent limits tile, as the demo does.',
    '`used` is a percentage on purpose: plan limits are rarely published as token counts, and the reset text carries the units that matter.',
  ],

  apiSignature:
    'function PlanUsageCard(props: { plan: ReactNode; limits: PlanLimit[]; title?: ReactNode; renews?: ReactNode; onUpgrade?: () => void; upgradeLabel?: ReactNode; warnAt?: number; criticalAt?: number; bare?: boolean; className?: string }): JSX.Element\ntype PlanLimit = { id: string; label: string; used: number; resets?: string }',

  props: [
    { name: 'plan', type: 'ReactNode', description: 'Plan name shown after the title, e.g. "Max (5x)".' },
    { name: 'limits', type: 'PlanLimit[]', description: 'One meter row per limit: label, percent used (0–100) and an optional reset text.' },
    { name: 'title', type: 'ReactNode', default: '"Plan usage limits"', description: 'Header title before the plan name.' },
    { name: 'renews', type: 'ReactNode', description: 'Renewal line in the footer, e.g. "Renews Dec 1".' },
    { name: 'onUpgrade', type: '() => void', description: 'Shows the Upgrade button and is called when it is pressed.' },
    { name: 'upgradeLabel', type: 'ReactNode', default: '"Upgrade"', description: 'Upgrade button label.' },
    { name: 'warnAt', type: 'number', default: '70', description: 'Percent at which a meter turns amber.' },
    { name: 'criticalAt', type: 'number', default: '90', description: 'Percent at which a meter turns red.' },
    { name: 'bare', type: 'boolean', default: 'false', description: 'Drop the card surface and padding to nest inside another tile.' },
    { name: 'className', type: 'string', description: 'Merged onto the root section.' },
  ],

  reducedMotion:
    'The bar fill and the percentage colour carry `motion-reduce:transition-none`, so new usage values jump into place without a slide or a colour fade.',

  cleanup:
    'Nothing to clean up: the component is stateless and its only motion is CSS transitions.',

  acceptance:
    'The demo shows "Plan usage limits · Max (5x)" with rows at 38%, 3% and 5%. Each "Send a prompt" adds 9 points to the 5-hour row: it turns amber at 74% and red at 92%, and at 100% the button disables and the status reads "5-hour limit reached". "Upgrade" switches the header to Max (20x), quarters every value and removes the button.',

  criticalRegion: 'critical',
};

export default meta;
