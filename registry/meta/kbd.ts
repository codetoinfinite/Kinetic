import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'kbd',
  title: 'Kbd',
  category: 'display',
  kit: 'boardui',
  tags: ['kbd', 'keyboard', 'shortcut', 'hint', 'boardui'],
  blurb: 'A fully rounded keyboard-shortcut pill on a semantic <kbd>, 20px tall, for search triggers, menus and command rows.',
  cost: 'css',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/kbd.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: [],

  summary:
    'A one-element component: a native `<kbd>` styled as a small neutral pill with 12px semibold type. It is the shortcut hint the kit puts on the sidebar\'s Quick Search row (`⌘L`) and on command-palette rows, and it takes any `<kbd>` attribute through, so the caller decides the label and the accessible text.',

  mechanism: [
    'Render a native `<kbd>` element, not a `<span>`, so assistive tech and copy-paste both know the text is a key. All `HTMLAttributes<HTMLElement>` spread onto it and React 19\'s `ref` arrives as an ordinary prop.',
    'Shape it with `inline-flex items-center justify-center rounded-full px-1 py-0.5`: 4px side padding, 2px top and bottom, and a full radius so a one-glyph key reads as a lozenge and a chord such as `⌘K` stretches into a pill.',
    'Set type with the kit\'s `text-caption-1-semibold` (12px, 16px line height, weight 600) plus `font-sans`, `tracking-normal` and `whitespace-nowrap`, so the pill is 20px tall and a chord never wraps between its keys.',
    'Colour it with two semantic tokens, `bg-kbd-background` and `text-kbd-foreground`. Light maps them to neutral-300 / neutral-500, dark to neutral-700 / neutral-400, so the hint stays quiet on either theme without a `dark:` class.',
    'Merge the caller\'s `className` last through `cx` (the kit\'s `tailwind-merge` instance), so a consumer `px-1.5` replaces `px-1` instead of both landing in the class list.',
  ],

  constants: [
    {
      name: 'padding',
      value: 'px-1 py-0.5 (4px / 2px)',
      why: 'From the Figma quick-search shortcut (node 3731:2955). With the 16px line height this gives a 20px pill, short enough to sit inside a 36px search row or a 32px menu item without stretching it.',
    },
    {
      name: 'type style',
      value: 'text-caption-1-semibold: 12px / 16px, weight 600',
      why: 'Semibold keeps glyphs such as ⌘ and ⇧ legible at 12px on a low-contrast fill; regular weight blurs into the background.',
    },
    {
      name: 'colours',
      value: 'light neutral-300 on neutral-500 text; dark neutral-700 on neutral-400 text',
      why: 'A hint must sit below the label it annotates. Both pairs are deliberately low contrast against the surface so the shortcut reads as secondary information.',
    },
  ],

  pitfalls: [
    'Do not swap `<kbd>` for a `<span>`. The element is the semantics: screen readers and reader modes treat it as keyboard input.',
    'Do not hard-code neutral colours on the pill. Use `bg-kbd-background` / `text-kbd-foreground`, or the dark theme gets a light chip on a dark row.',
    'Do not drop `whitespace-nowrap`. In a narrow sidebar a chord like `⌘ ⇧ P` would wrap one key per line.',
    'Do not rely on a bare symbol for meaning when it matters. `⌘` is announced inconsistently, so add `aria-label` (as the command palette does with "Enter") where the key name must be spoken.',
  ],

  notes: [
    'Used inside the kit by `dashboard-sidebar` (the `⌘L` Quick Search hint) and `command-palette` (the Enter key and per-row shortcuts).',
    'One `Kbd` per chord is the kit\'s convention (`<Kbd>⌘L</Kbd>`). Render several pills side by side only for sequences such as G then I.',
  ],

  apiSignature:
    'interface KbdProps extends HTMLAttributes<HTMLElement> { ref?: Ref<HTMLElement> }\nfunction Kbd(props: KbdProps): JSX.Element',

  props: [
    { name: 'children', type: 'ReactNode', description: 'The key or chord to show, e.g. `⌘K` or `Esc`.' },
    { name: 'className', type: 'string', description: 'Merged through `tailwind-merge`, so conflicting utilities replace the defaults.' },
    { name: 'ref', type: 'Ref<HTMLElement>', description: 'Forwarded to the `<kbd>` element (React 19 ref-as-prop).' },
  ],

  reducedMotion: 'Nothing animates. The pill is static markup, so it renders identically under `prefers-reduced-motion: reduce`.',

  cleanup: 'Nothing to clean up. The component is stateless markup with no listeners, timers or effects.',

  acceptance:
    'A `<Kbd>⌘K</Kbd>` renders as a `<kbd>` element 20px tall with 4px side padding, a full radius and 12px semibold text, using neutral-300 fill and neutral-500 text in light mode and neutral-700 / neutral-400 in dark mode. A long chord stays on one line, and a `className` such as `px-2` replaces the default horizontal padding.',

  criticalRegion: 'critical',
};

export default meta;
