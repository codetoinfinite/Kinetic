/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Pricing Plan Cards" (boardui.com/pricing).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'pricing-plan-cards',
  title: 'Pricing Plan Cards',
  category: 'block',
  kit: 'boardui',
  tags: ['pricing', 'plans', 'billing', 'landing', 'boardui'],
  blurb:
    'Plan cards with a monthly/yearly switch that rolls the prices, shows yearly savings, highlights one plan and lists features with icons.',
  cost: 'dom',
  motif: 'stack',

  files: [
    { path: 'registry/ui/pricing-plan-cards.tsx', type: 'registry:ui', role: 'component' },
  ],
  dependencies: ['@remixicon/react@^4.9.0'],

  summary:
    'A pricing section: an optional icon tile, heading and copy, a Monthly / Yearly segmented control, and a responsive grid of plan cards. Each card is a grey shell holding two white panels (name and description on top, features below) with the price and CTA sitting on the shell between them. Switching the cycle rolls every price to its new per-month figure, strikes through the monthly price and swaps the caption for the yearly saving.',

  mechanism: [
    'The cycle is controlled-or-uncontrolled: `cycle ?? inner`, where `inner` starts at `defaultCycle`. The kit `SegmentedControl` (a React Aria single-select toggle group) feeds `onSelectionChange`, and the handler only accepts the keys "monthly" and "yearly" before calling `setInner` (when uncontrolled) and `onCycleChange`.',
    'Each plan stores `price.monthly` and the annual total `price.yearly`. `perMonth()` returns the monthly price, or `yearly / 12` on the yearly cycle; `yearlySavings()` is `monthly * 12 - yearly`, clamped at 0. The best saving across paid plans, as a rounded percentage, becomes the "-21%" chip inside the Yearly segment.',
    '`useTweenedNumber` rolls the displayed price from where it currently is to the new target over 360ms with an ease-out cubic in a `requestAnimationFrame` loop, writing the in-flight value back to a ref so a toggle mid-roll restarts from what is on screen. The rolling digits are `aria-hidden`; an `sr-only` sibling always holds the final formatted price.',
    'Prices format through two cached `Intl.NumberFormat` instances (whole and two-decimal) built from the fixed `locale` and `currency` props, so the server and client print the same string. A plan with 0 / 0 prices renders `freeLabel` instead of a number.',
    'On the yearly cycle a paid plan with a saving shows the monthly price struck through (with a hidden "was" for screen readers) and replaces the second caption line with "Save €48 a year" in the success colour. A plan with its own `caption` keeps it on both cycles.',
    'The card grid is driven by a container query (`@container` on the section): one column, two from `@2xl` (42rem) and four from `@5xl` (64rem), so the block reflows by the width it is given rather than the viewport. A highlighted plan gets the primary CTA, an accent ring and its badge pill; the others use the secondary button.',
    'The CTA is a `ButtonLink` when the plan has `cta.href`; otherwise a `Button` that calls `onSelectPlan(plan.id, cycle)`. Features render as a list with the given icon, a check when no icon is given, or a dash plus struck text and an "Not included:" prefix for screen readers when `included` is false.',
  ],

  constants: [
    { name: 'TWEEN_MS', value: '360', why: 'Long enough to read as the price rolling to its new value, short enough that a quick double toggle never feels laggy.' },
    { name: 'ease', value: '1 - (1 - t)^3', why: 'Ease-out cubic: the number moves fast first and settles, so the final digits are readable almost immediately.' },
    { name: 'grid breakpoints', value: '@2xl (42rem) → 2 cols, @5xl (64rem) → 4 cols', why: 'Four cards need about 250px each for the feature labels to wrap at most once; container queries keep that true inside narrow hosts.' },
    { name: 'panel radius', value: 'shell rounded-3xl (24px), panels 20px, shell padding 4px', why: 'Inner radius = outer radius minus the padding, so the nested panels stay concentric with the shell.' },
    { name: 'CTA', value: 'h-11 rounded-full', why: 'Matches the reference: a 44px pill across the full card width, taller than the kit default 36px button.' },
  ],

  pitfalls: [
    'Formatting with the browser locale (`toLocaleString()` without a locale). The server and client may print different separators and React reports a hydration mismatch; the `locale` prop pins it.',
    'Tweening the accessible text. Screen readers would announce every intermediate number; the rolling figure is `aria-hidden` and an `sr-only` copy carries the final price.',
    'Storing the yearly price as a per-month value. Savings and the "billed €180 yearly" caption need the annual total; the per-month figure is derived.',
    'Using viewport breakpoints for the grid. Inside a narrow container (a docs preview, a modal) four cards would squeeze; the grid uses container queries instead.',
  ],

  notes: [
    'Pass `cycle` and `onCycleChange` to keep the switch in the URL or in shared state; omit both to let the component own it.',
    'Rich descriptions are allowed: `<strong>` inside `description` is styled as the primary text colour, matching the reference card copy.',
  ],

  apiSignature:
    'function PricingPlanCards(props: { plans: PricingPlan[]; cycle?: BillingCycle; defaultCycle?: BillingCycle; onCycleChange?: (cycle: BillingCycle) => void; onSelectPlan?: (planId: string, cycle: BillingCycle) => void; currency?: string; locale?: string; freeLabel?: string; heading?: ReactNode; description?: ReactNode; icon?: IconComponent; className?: string }): JSX.Element\ntype BillingCycle = "monthly" | "yearly"\ninterface PricingPlan { id: string; name: string; description: ReactNode; icon?: IconComponent; price: { monthly: number; yearly: number }; caption?: [ReactNode, ReactNode]; badge?: string; highlighted?: boolean; cta: { label: string; icon?: IconComponent; href?: string }; features: PricingPlanFeature[] }',

  props: [
    { name: 'plans', type: 'PricingPlan[]', description: 'Cards in display order. `price.yearly` is the annual total.' },
    { name: 'cycle', type: '"monthly" | "yearly"', description: 'Controlled billing cycle.' },
    { name: 'defaultCycle', type: '"monthly" | "yearly"', default: '"monthly"', description: 'Initial cycle when uncontrolled.' },
    { name: 'onCycleChange', type: '(cycle: BillingCycle) => void', description: 'Fires when the segmented control changes.' },
    { name: 'onSelectPlan', type: '(planId: string, cycle: BillingCycle) => void', description: 'Called by CTAs of plans without `cta.href`.' },
    { name: 'currency', type: 'string', default: '"EUR"', description: 'ISO 4217 currency for every price.' },
    { name: 'locale', type: 'string', default: '"en-US"', description: 'Fixed formatting locale, so SSR and client output match.' },
    { name: 'freeLabel', type: 'string', default: '"Free"', description: 'Shown instead of a number for 0 / 0 plans.' },
    { name: 'heading', type: 'ReactNode', description: 'Section heading.' },
    { name: 'description', type: 'ReactNode', description: 'Copy under the heading.' },
    { name: 'icon', type: 'ComponentType', description: 'Glyph drawn in a tile above the heading.' },
  ],

  reducedMotion:
    'Under `prefers-reduced-motion: reduce` the price roll is skipped: `useTweenedNumber` returns the target directly and starts no animation frame. The "Join now" pill hover transition is removed with `motion-reduce:transition-none`.',

  cleanup:
    'The price tween cancels its pending `requestAnimationFrame` when the target changes or the card unmounts. There are no other listeners or timers.',

  acceptance:
    'The section renders four cards in a row at 1280px and one column at 360px. Monthly is selected and the Pro card reads €19 per month. Clicking Yearly rolls Pro to €15, strikes €19 through, and the caption reads "Save €48 a year"; the Yearly segment carries a "-21%" chip. The highlighted Team card has a blue CTA and a "Most popular" pill. Clicking a CTA reports the plan and current cycle through `onSelectPlan`. Under reduced motion prices change instantly.',

  criticalRegion: 'critical',
};

export default meta;
