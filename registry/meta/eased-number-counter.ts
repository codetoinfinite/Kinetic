import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'eased-number-counter',
  title: 'Eased Number Counter',
  category: 'text',
  tags: ['gsap', 'counter', 'number', 'intl', 'stat'],
  blurb:
    'A statistic that counts up on an eased curve and settles on its exact final figure without shifting the layout.',
  cost: 'dom',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/eased-number-counter.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['gsap@^3.15.0'],
  registryDependencies: [],

  summary:
    'A number tweens from one value to another on `power2.inOut` rather than linearly, so it reads as loading rather than as a progress meter — slow to commit, quick through the middle, easing onto the final figure. The thing being tweened is a plain numeric object; the string on screen is formatted from it on every update and written with `textContent`, so React never re-renders while the count runs. A transparent sizer reserves the width of the wider endpoint, so nothing after the counter moves as digits are added.',

  mechanism: [
    'A local object `{ v: from }` is the tween target. `gsap.to(counter, { v: to, duration, ease })` interpolates the number; the DOM is not the tween target at all.',
    '`onUpdate` calls a `write()` closure that does `el.textContent = prefix + format.format(counter.v) + suffix`. Writing `textContent` rather than React children means the tween never touches the reconciler.',
    'The `Intl.NumberFormat` is built once in a `useMemo` keyed on `[locale, decimals, grouping]` — three primitives, so the memo actually holds. `minimumFractionDigits === maximumFractionDigits` also performs the rounding, so no `Math.round` or `toFixed` is needed in the tick.',
    '`onComplete` assigns `counter.v = to` and writes once more. Tween interpolation lands on values like 99.999999997, and a headline number stopping one unit short of itself is a real bug report.',
    'Before the tween starts, `write()` runs once with `v = from`, so the live node is never empty on the first frame and the element does not pop into existence when the tween begins.',
    'The width reservation compares `format.format(to).length` against `format.format(from).length` and renders the longer of the two as a `text-transparent` cell stacked under the live node in an `inline-grid`, both at `col-start-1 row-start-1`.',
  ],

  constants: [
    {
      name: 'DURATION',
      value: '1.6',
      why: 'Seconds. Under ~1s the eye cannot track the digits and the effect is just a flicker before the answer; past ~2.5s the reader has finished the sentence around it and is waiting on a number that has stopped being interesting.',
    },
    {
      name: 'EASE',
      value: "'power2.inOut'",
      why: 'The in-out pair is what separates a counter from a progress bar. `none` reads as a machine metering out a value; `power2.out` starts at full speed and looks like it began before you looked. The slow start is the part that reads as "committing".',
    },
    {
      name: 'VIEW_THRESHOLD',
      value: '0.6',
      why: '60% of the element visible before counting. A stat that starts at 1% visibility has finished before it clears the fold, so the reader arrives at a static number and never sees the effect.',
    },
    {
      name: 'decimals',
      value: '0',
      why: 'Also the rounding rule, via matched `minimumFractionDigits`/`maximumFractionDigits`. Leaving them unmatched lets `Intl` vary the digit count between frames, so the string length oscillates and the number jitters horizontally.',
    },
  ],

  pitfalls: [
    'Constructing `new Intl.NumberFormat()` inside `onUpdate`. It costs tens of microseconds and it is being built 60-120 times a second per counter; a page of eight stats spends milliseconds a frame building formatters it throws away.',
    'Tweening the string, or holding the value in `useState`. A `setState` per frame re-renders the subtree at display refresh rate, and worse, any unrelated parent render snaps the number back to the last committed value mid-count.',
    'Rendering the live value as React children. React will diff and overwrite whatever the tween wrote, so the count freezes on the first parent re-render.',
    'Not snapping to the exact target in `onComplete`. Floating-point interpolation lands near, not on, the target — the counter finishes at 99,999 instead of 100,000.',
    'Letting the box size itself from the current text. Every added digit widens the element and shoves the following copy sideways; the count ends up looking like a layout bug.',
    'Using `visibility: hidden` for the sizer. That removes it from the accessibility tree as well, and the transparent copy is the only readable text on the element — the live node is `aria-hidden` because it is mid-count garbage.',
  ],

  notes: [
    'The `onComplete` callback is held in a ref that is reassigned on every render, so passing an inline arrow from the caller does not restart the count on every parent render.',
    'A number formatting *options object* prop was deliberately not exposed: an object literal is a new reference every render, which would rebuild the formatter, invalidate the effect, and restart the tween continuously.',
  ],

  apiSignature:
    'function EasedNumberCounter(props: { to: number; from?: number; duration?: number; ease?: string; delay?: number; locale?: string; decimals?: number; grouping?: boolean; prefix?: string; suffix?: string; startOnView?: boolean; className?: string; onComplete?: () => void }): JSX.Element',

  props: [
    { name: 'to', type: 'number', description: 'The value to land on.' },
    { name: 'from', type: 'number', default: '0', description: 'The value to start from.' },
    { name: 'duration', type: 'number', default: '1.6', description: 'Seconds of counting.' },
    { name: 'ease', type: 'string', default: "'power2.inOut'", description: 'Any GSAP ease string. `none` makes it read as a meter.' },
    { name: 'delay', type: 'number', default: '0', description: 'Seconds to wait after the trigger before counting.' },
    { name: 'locale', type: 'string', description: 'BCP 47 tag. Omitted uses the runtime default locale.' },
    { name: 'decimals', type: 'number', default: '0', description: 'Fixed fraction digits. Also the rounding.' },
    { name: 'grouping', type: 'boolean', default: 'true', description: 'Thousands separators.' },
    { name: 'prefix', type: 'string', default: "''", description: 'Literal text before the number, e.g. a currency sign.' },
    { name: 'suffix', type: 'string', default: "''", description: 'Literal text after the number, e.g. a percent sign.' },
    { name: 'startOnView', type: 'boolean', default: 'true', description: 'Count when scrolled into view rather than on mount.' },
    { name: 'className', type: 'string', description: 'Merged onto the outer span via `cn`.' },
    { name: 'onComplete', type: '() => void', description: 'Fired once the final figure is written.' },
  ],

  reducedMotion:
    'Writes the final formatted figure immediately and fires `onComplete`, with no tween created at all. It is never left blank and never runs a shortened tween that still flickers through intermediate values.',

  cleanup:
    'The effect returns `tween.kill()`. Because the tween target is a local object rather than a DOM node, nothing is left written to the element beyond the final string, and there are no inline styles to clear.',

  acceptance:
    'Scroll the stat into view: the number counts from its start value, decelerates, and stops on exactly the stated figure — check the last digit. Nothing to the right of the number moves while it counts. Enable reduced motion, reload, and the final figure is present on first paint. Force a parent re-render mid-count and the number keeps counting rather than snapping backwards.',

  criticalRegion: 'critical',
};

export default meta;
