import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'status-dot',
  title: 'Status Dot',
  category: 'display',
  kit: 'boardui',
  tags: ['status', 'dot', 'indicator', 'badge', 'boardui'],
  blurb: 'A 12px status indicator: a solid 6px dot centred on a tinted halo, in green, yellow and indigo, for selects and table cells.',
  cost: 'css',
  motif: 'rings',

  files: [
    {
      path: 'registry/ui/status-dot.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: [],

  summary:
    'Two nested spans: a 12px round halo in a tinted status colour and a 6px solid dot centred inside it. It is the marker the kit puts in front of a purchase status ("Completed", "Waiting", "Processing") in select options and data-table cells. It is decorative by design, so the text beside it carries the meaning.',

  mechanism: [
    'Keep the colour classes in one `sortCx` map with three keys: `base` (`inline-flex size-3 shrink-0 items-center justify-center rounded-full`), `halo` (one semantic token per colour) and `dot` (one palette class per colour).',
    'Render an outer `<span>` with `base` plus `styles.halo[color]`. `size-3` makes it 12px and `shrink-0` stops a flex row (a select option, a table cell) from squeezing the circle into an oval.',
    'Render an inner `<span className="size-1.5 rounded-full">` with `styles.dot[color]`: a 6px solid dot, centred by the outer flex box, painted with the plain palette steps `bg-green-500`, `bg-yellow-500` and `bg-indigo-500`.',
    'Paint the halo with the semantic tokens `bg-status-dot-{green,yellow,indigo}-halo`. Light maps them to green-100, yellow-200 and indigo-100. Dark maps them to the 800 step mixed to 40% with `transparent`, so only the halo dims while the centre dot stays solid.',
    'Set `aria-hidden` on the outer span and spread the remaining props after it, so the dot is skipped by screen readers unless a caller explicitly overrides it.',
  ],

  constants: [
    {
      name: 'sizes',
      value: 'halo size-3 (12px), dot size-1.5 (6px)',
      why: 'From the Figma status-dropdown dots (node 3731:3266). A 3px ring of halo around the dot is wide enough to read as a glow at body-text size without growing past the 12px icon slot of a select option.',
    },
    {
      name: 'light halos',
      value: 'green-100, yellow-200, indigo-100',
      why: 'Yellow is one step darker than the other two because yellow-100 nearly vanishes on a white surface.',
    },
    {
      name: 'dark halos',
      value: 'color-mix(in srgb, <hue>-800 40%, transparent)',
      why: 'A translucent dark halo sits on any dark surface (row hover, selected option) without a visible light disc around the dot.',
    },
  ],

  pitfalls: [
    'Do not use the dot as the only signal of a status. It is `aria-hidden`, so always render the status label next to it.',
    'Do not remove `shrink-0`. In a tight flex row the halo collapses into an ellipse.',
    'Do not paint the halo with a raw palette class such as `bg-green-100`. The semantic token is what switches to the translucent dark-mode halo.',
    'Do not add a colour that is not in both maps. `styles.halo[color]` and `styles.dot[color]` are indexed by the same key, and a missing key renders an invisible dot.',
  ],

  notes: [
    'Used inside the kit by `select` (option markers) and `data-table` (the purchase-status column).',
    'Only three colours exist because the source design defines only three status pairs. Add a fourth by adding a halo token to both themes and a key to both maps.',
  ],

  apiSignature:
    'interface StatusDotProps extends HTMLAttributes<HTMLSpanElement> { color?: "green" | "yellow" | "indigo"; ref?: Ref<HTMLSpanElement> }\nfunction StatusDot(props: StatusDotProps): JSX.Element',

  props: [
    { name: 'color', type: '"green" | "yellow" | "indigo"', default: '"green"', description: 'Picks the halo token and the solid dot colour together.' },
    { name: 'className', type: 'string', description: 'Merged onto the outer halo span through `tailwind-merge`.' },
    { name: 'ref', type: 'Ref<HTMLSpanElement>', description: 'Forwarded to the outer span (React 19 ref-as-prop).' },
  ],

  reducedMotion: 'Nothing animates, so the dot renders identically under `prefers-reduced-motion: reduce`.',

  cleanup: 'Nothing to clean up. The component is stateless markup with no listeners, timers or effects.',

  acceptance:
    'Each of the three colours renders a 12px circle with a 6px solid dot exactly centred in it. The halo is a pale tint of the dot in light mode and a translucent dark tint in dark mode, while the dot itself keeps the same 500-step colour. The outer span has `aria-hidden`, and the circle stays round inside a narrow flex row.',

  criticalRegion: 'critical',
};

export default meta;
