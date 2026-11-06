import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'time-field',
  title: 'Time Field',
  category: 'form',
  kit: 'boardui',
  tags: ['time', 'input', 'segments', 'react-aria', 'form', 'boardui'],
  blurb:
    'A time of day typed segment by segment in the kit\'s input shell, with 12 or 24 hour cycles, seconds, limits and an accent focus.',
  cost: 'css',
  motif: 'split',

  files: [
    {
      path: 'registry/ui/time-field.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['react-aria-components@^1.22.1', '@remixicon/react@^4.9.0'],

  summary:
    'React Aria\'s `TimeField` dressed in the kit\'s Input shell: the same tertiary surface, hover and focus rings, invalid and disabled states, with a clock icon at the start. Hour, minute, optional second and AM/PM are separate segments; typing fills one and jumps to the next, arrows step the focused one, and the focused segment fills with the accent colour.',

  mechanism: [
    '`AriaTimeField` is the root (`group flex w-full flex-col items-start gap-1`) and uses its render prop to read `isInvalid`, which it passes to the kit `Label` (with `isRequired` and the optional info `tooltip`) and to `HintText` under the field.',
    'The field is `AriaDateInput` whose `className` is a function of React Aria\'s state: it calls Input\'s exported `inputFieldClassName(state, size)`, so hover, focus-within, disabled and invalid rings are literally Input\'s. Each `segment` renders an `AriaDateSegment` with one shared class string.',
    'The shell is switched from flex to `block whitespace-nowrap`. React Aria wraps the digits in bidi isolates, which only order inline content, so inline layout keeps an RTL page reading 9:00 rather than 00:9. The shell also takes `text-body-regular` so its own line box stays 36px tall.',
    'Segments style themselves from data attributes: `data-[placeholder]` is tertiary text, `data-[type=literal]` (the colon and space) loses its padding and goes tertiary, `data-[focused]` fills `bg-accent-500 text-white`, all with a 100ms colour transition. `tabular-nums` keeps the field from shifting width as digits change, and `caret-transparent` hides the caret inside the filled segment.',
    'The clock icon is positioned absolutely at `start-2`, vertically centred, after the input in the DOM, so it can use `peer-data-[invalid]` and `peer-data-[disabled]` to recolour itself from the input\'s state. The input pads its start by 34px with an icon and 12px without, matching Input\'s text inset; `icon={null}` removes it.',
  ],

  constants: [
    {
      name: 'field height',
      value: '36px medium (p-2) / 32px small (h-8)',
      why: 'Inherited from Input\'s size map, so a time field sits flush in a row with text inputs and medium buttons.',
    },
    {
      name: 'start padding',
      value: 'ps-[34px] with icon, ps-3 without',
      why: 'An 8px inset, the 20px icon and a 6px gap put the first digit at 34px, the same x as text in an Input with a leading icon.',
    },
    {
      name: 'segment focus',
      value: 'bg-accent-500 text-white, rounded-md, px-0.5, 100ms',
      why: 'A filled block, not a ring, because segments are a few pixels apart and a ring would collide with the colon.',
    },
  ],

  pitfalls: [
    'Do not make the segment container `flex`. Flex items ignore the bidi isolates React Aria inserts, and RTL locales then show minutes before hours.',
    'Do not pass a JS `Date` or a string. Values are `Time` (or `CalendarDateTime` / `ZonedDateTime`) from `@internationalized/date`, e.g. `new Time(9, 30)`.',
    'Do not rely on the locale for the hour cycle when the copy assumes one. Set `hourCycle={12}` or `{24}` explicitly; otherwise a 24-hour locale drops the AM/PM segment.',
    'Do not render it without `label` or `aria-label`. The segments are spinbuttons that take their name from the field label.',
  ],

  notes: [
    '`granularity="second"` adds a seconds segment; `minValue` / `maxValue` mark out-of-range values invalid, and with `validationBehavior="aria"` the red state and the hint show as soon as the value leaves the range.',
    '`size="small"` gives the 32px shell; `fieldClassName` adds classes to the shell, `className` to the whole field.',
  ],

  apiSignature:
    'function TimeField<T extends TimeValue>(props: Omit<AriaTimeFieldProps<T>, "className" | "children"> & { label?: ReactNode; hint?: ReactNode; tooltip?: boolean | string; size?: "medium" | "small"; icon?: ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }> | null; className?: string; fieldClassName?: string }): JSX.Element',

  props: [
    { name: 'value / defaultValue', type: 'TimeValue | null', description: 'A `Time` from `@internationalized/date`, controlled or initial.' },
    { name: 'onChange', type: '(value: TimeValue | null) => void', description: 'Fires as segments are typed or stepped.' },
    { name: 'hourCycle', type: '12 | 24', description: 'Forces the AM/PM or 24-hour layout instead of the locale default.' },
    { name: 'granularity', type: '"hour" | "minute" | "second"', default: '"minute"', description: 'The smallest segment shown.' },
    { name: 'minValue / maxValue', type: 'TimeValue', description: 'Out-of-range values mark the field invalid.' },
    { name: 'label / hint', type: 'ReactNode', description: 'Kit Label above, HintText below; both turn red when invalid.' },
    { name: 'size', type: '"medium" | "small"', default: '"medium"', description: '36px or 32px shell.' },
    { name: 'icon', type: 'IconComponent | null', default: 'RiTimeLine', description: 'Leading glyph; `null` hides it and tightens the padding.' },
  ],

  reducedMotion:
    'Only 100ms colour transitions on the segments and Input\'s ring transition; nothing moves, so nothing changes under `prefers-reduced-motion`.',

  cleanup:
    'Nothing to clean up. State lives in React Aria\'s time field hook; no timers or global listeners.',

  acceptance:
    'A field labelled "Opens" shows "9:00 AM" next to a clock icon. Clicking the hour fills it with the accent colour; typing 1 then 0 sets 10 and focus moves to the minutes; Up and Down step the focused segment and wrap. Tab leaves the field and the shell\'s focus ring clears. With `minValue` 9:00 and `maxValue` 17:30 and `validationBehavior="aria"`, stepping to 6:00 PM turns the shell, icon and hint red. In an RTL locale the time still reads hour-first.',

  criticalRegion: 'critical',
};

export default meta;
