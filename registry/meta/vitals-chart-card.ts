/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Vitals Chart Card" (boardui.com/templates/medical-profile).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'vitals-chart-card',
  title: 'Vitals Chart Card',
  category: 'display',
  kit: 'boardui',
  tags: ['chart', 'medical', 'vitals', 'health', 'bar-chart', 'boardui'],
  blurb:
    'A weekly vital-sign card: track-and-fill columns, a dashed normal-range band, pink out-of-range bars and a period stepper.',
  cost: 'css',
  motif: 'grid',

  files: [
    {
      path: 'registry/ui/vitals-chart-card.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['@remixicon/react@^4.9.0'],

  summary:
    'One vital sign over a short period, drawn like the medical profile\'s steps card: a column per reading, each a full-height grey track filled from the bottom. A dashed band marks the normal range, readings outside it turn pink, and an inner tile under the chart spells the range out next to an in-range count. Hovering, focusing or selecting a column swaps the headline for that reading; a "range" variant floats each bar from a low to a high value for blood pressure.',

  mechanism: [
    'The value axis is `domain` or, when omitted, the min and max of every value, low and normal-range bound padded by 25% of the spread. `pct(v)` maps a value into 0-100% of the plot height and clamps it.',
    'Each reading is a `<button>` track (`bg-chart-track`, 10px radius) in a CSS grid of `repeat(n, minmax(0, 1fr))` columns, positioned `absolute inset-0` inside the flex-1 plot box. Its fill is an absolutely positioned span with `bottom` 0 (bars) or `pct(low)` (range) and `height` `pct(value) - bottom`, so a new period animates through a 500ms CSS transition of `height` and `bottom`.',
    '`vitalStatus` compares `value` with `normalRange` (and, when `value` is normal, `low` with `lowNormalRange`) and returns low, normal or high. Normal fills use the `color` prop\'s chart token, anything else uses `bg-chart-3`, and the dashed `bg-chart-7/10` band (one per range) is laid over the tracks with the same `pct` mapping.',
    'The active column is the hovered one, else the selected one. Clicking toggles selection (controlled `selectedIndex` or uncontrolled `defaultSelectedIndex`), other fills dim to 40%, and the headline re-keys so the kit `animate-number-fade` replays with that day\'s value, detail label and a Normal, High or Low chip.',
    'Columns use a roving tabindex: Arrow keys, Home and End move focus and preview the reading (a focus that matches `:focus-visible` previews, a mouse focus does not), Enter or Space toggles it, and Escape clears the selection.',
    'With no active column the headline shows the `summary` (average, latest, max or min; range readings print as value/low) and the chip reads "n/total in range", lime when every reading is normal and orange otherwise. The optional `period` prop renders a bordered stepper whose arrows call `onPrevious` and `onNext`.',
  ],

  constants: [
    { name: 'card min height', value: '330px', why: 'Matches the medical profile row of cards, so it lines up with Patient Info Card.' },
    { name: 'domain padding', value: '25% of the data spread', why: 'Keeps the tallest bar and the normal band clear of the top and bottom of the track.' },
    { name: 'fill transition', value: '500ms ease-out', why: 'Long enough to read the change when stepping periods, short enough not to delay hovering.' },
    { name: 'dimmed fill opacity', value: '40%', why: 'Keeps the other readings visible while the active one is read.' },
    { name: 'track radius', value: '10px', why: 'The rounded column shape of the steps chart.' },
  ],

  pitfalls: [
    'Do not use pink (`chart-3`) as the card colour: it is reserved for out-of-range readings, so the `color` prop excludes it.',
    'Do not let a mouse focus preview the column; only keyboard focus (`:focus-visible`) should, or the headline sticks after the pointer leaves.',
    'Do not size the column grid with h-full inside a flex-1 box whose parent only has a min-height: the percentage resolves to auto and the tracks collapse to zero. Position the grid absolute inset-0 inside the relative plot box instead.',
  ],

  notes: [
    'Values print with `Intl.NumberFormat("en-US")` and `decimals` fraction digits; range readings print as "118/76", and the range variant\'s hint drops the unit ("90–120/60–80") so it fits a third-width card.',
    'The period stepper is display-only: the parent owns which readings are shown and passes new `readings` plus the period label.',
  ],

  apiSignature:
    'export function VitalsChartCard({ title, unit, icon, readings, normalRange, lowNormalRange, domain, variant = "bars", color = "teal", summary = "average", decimals = 0, period, selectedIndex, defaultSelectedIndex = null, onSelectedIndexChange, className }: VitalsChartCardProps): JSX.Element',

  props: [
    { name: 'title', type: 'string', description: 'Card label, e.g. "Heart rate".' },
    { name: 'unit', type: 'string', description: 'Unit printed after the headline and in the range hint.' },
    { name: 'icon', type: 'ComponentType', description: 'Optional icon before the title.' },
    { name: 'readings', type: 'VitalReading[]', description: 'One column per reading: label, optional detail, value and optional low.' },
    { name: 'normalRange', type: 'readonly [number, number]', description: 'Inclusive normal range for value; drawn as the dashed band.' },
    { name: 'lowNormalRange', type: 'readonly [number, number]', description: 'Inclusive normal range for low in the range variant; draws a second band.' },
    { name: 'domain', type: 'readonly [number, number]', description: 'Value axis floor and ceiling; derived from the data when omitted.' },
    { name: 'variant', type: '"bars" | "range"', default: '"bars"', description: 'Fill from the floor, or float from low to value.' },
    { name: 'color', type: '"teal" | "lime" | "sky" | "purple" | "blue" | "emerald" | "indigo"', default: '"teal"', description: 'Chart token for in-range fills.' },
    { name: 'summary', type: '"average" | "latest" | "max" | "min"', default: '"average"', description: 'Headline when no column is active.' },
    { name: 'decimals', type: 'number', default: '0', description: 'Fraction digits for printed values.' },
    { name: 'period', type: 'VitalsPeriod', description: 'Label plus onPrevious/onNext and disabled flags for the header stepper.' },
    { name: 'selectedIndex', type: 'number | null', description: 'Controlled selected column.' },
    { name: 'defaultSelectedIndex', type: 'number | null', default: 'null', description: 'Initial selected column when uncontrolled.' },
    { name: 'onSelectedIndexChange', type: '(index: number | null) => void', description: 'Called when a column is selected or cleared.' },
    { name: 'className', type: 'string', description: 'Classes on the card.' },
  ],

  reducedMotion:
    'The fill height transition, the label colour fade and the headline fade are removed with motion-reduce:transition-none and motion-reduce:animate-none; values change instantly.',
  cleanup:
    'No timers, listeners or observers; hover state lives in React state and the column refs are plain arrays.',
  acceptance:
    'Clicking a column sets aria-pressed and shows that day\'s value, detail and status chip in the header; Escape clears it; the previous-period arrow swaps the readings and the label, and readings outside normalRange render with the pink fill.',
  criticalRegion: 'critical',
};

export default meta;
