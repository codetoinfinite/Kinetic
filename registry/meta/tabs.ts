import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'tabs',
  title: 'Tabs',
  category: 'navigation',
  kit: 'boardui',
  tags: ['tabs', 'underline', 'pill', 'react-aria', 'navigation', 'boardui'],
  blurb:
    'React Aria underline tabs with a measured 2px indicator that slides between tabs, plus a pill switcher whose thumb settles with a spring.',
  cost: 'dom',
  motif: 'split',

  files: [
    {
      path: 'registry/ui/tabs.tsx',
      type: 'registry:ui',
      role: 'underline tabs (Tabs, TabList, Tab, TabPanel)',
    },
    {
      path: 'registry/ui/pill-tab.tsx',
      type: 'registry:ui',
      role: 'pill switcher (PillTabList, PillTab)',
    },
  ],
  dependencies: ['react-aria-components@^1.22.1'],

  summary:
    'Two tab styles from one kit. The underline tabs wrap React Aria `Tabs`, so arrow keys, roving focus and tab/panel wiring come for free, and a single absolutely positioned 2px bar glides to whichever tab is selected. The pill switcher is a plain row of toggle buttons for local view state, with a shared rounded thumb that slides under the active pill and overshoots slightly before it settles.',

  mechanism: [
    '`Tabs`, `TabList`, `Tab` and `TabPanel` spread their props onto the React Aria primitives, which handle roving tabindex, arrow-key navigation, automatic activation and the `aria-controls` link between a tab and its panel. Every `className` accepts a string or React Aria\'s state function and is merged through `cx`. `Tabs` is a `flex-col gap-4` stack that flips to `flex-row` when `orientation` is vertical.',
    '`TabList` wraps the Aria list in a `relative w-full` div. The list itself is `flex items-center gap-1 border-b border-separator-border`, the 1px baseline every tab sits on. The selected tab is not underlined by its own border: an `aria-hidden` span (`absolute bottom-0 left-0 h-0.5 bg-accent-600`) is drawn once and moved.',
    'A layout effect (`useLayoutEffect` on the client, `useEffect` on the server to avoid the SSR warning) queries `[role=\'tab\'][data-selected]` and stores its `offsetLeft` and `offsetWidth`. The bar is rendered with `transform: translateX(left px)` and `width`, and `transition-[transform,width] duration-200` animates both, so it slides and resizes in one motion between tabs of different widths.',
    'Measurement re-runs on three triggers: a `ResizeObserver` on the strip and on every tab (labels and web fonts change tab widths without resizing the strip), and a `MutationObserver` on the subtree filtered to `data-selected`, which fires when React Aria moves the selection. The MutationObserver also re-observes tabs when children change. The effect depends on `useDirection()`, so switching between LTR and RTL re-measures from the new layout.',
    '`Tab` renders the label in `text-body-medium text-accent-600` when selected and `text-body-regular text-text-primary` otherwise, with an optional 16px leading `icon` that inherits the colour. A `count` badge (`rounded-sm px-1 py-px text-caption-1-medium`) uses `bg-tab-count-selected-background text-accent-600` when selected, and `bg-black/10 text-text-primary opacity-50` when not.',
    '`PillTabList` is a `role="group"` row (`relative inline-flex gap-1`). It finds the `[data-pill-selected]` button and stores its `left`, `top`, `width`, `height` and variant (read from `data-pill-variant`), then paints one thumb with `translate(left, top)` plus width and height, transitioned over 300ms on `cubic-bezier(0.34,1.2,0.64,1)`. The same Resize/Mutation observer pair keeps it aligned.',
    '`PillTab` is a `<button type="button" aria-pressed>` at `z-10` above the thumb. Variant `blue` is `rounded-full` with an accent-50 thumb and `text-accent-500` label. Variant `gray` is `rounded-2lg` with `bg-background-tertiary-default`. An unselected pill fades in its own hover layer (`opacity-0` to `group-hover:opacity-100`, 200ms), so hover never moves the shared thumb.',
  ],

  constants: [
    {
      name: 'underline',
      value: 'h-0.5 (2px), 200ms, transform + width',
      why: 'Figma draws a 2px blue rule over the 1px baseline. Transitioning only `transform` and `width` keeps the slide on the compositor-friendly path, and 200ms is short enough that rapid arrow-key presses never leave the bar lagging two tabs behind.',
    },
    {
      name: 'pill thumb easing',
      value: '300ms cubic-bezier(0.34, 1.2, 0.64, 1)',
      why: 'The second control point at 1.2 overshoots by a few percent, which reads as a small spring settle without a JS spring. It is longer than the underline because the thumb moves a filled surface and the overshoot needs time to read.',
    },
    {
      name: 'tab padding',
      value: 'px-2.5 py-2, gap-2.5 label to count',
      why: '10px by 8px and the 10px label-to-count gap are the Figma tab spec (node 3793:2942). The indicator width is measured from the tab box, so changing padding also changes how wide the underline is.',
    },
    {
      name: 'pill padding',
      value: 'px-2 py-[5px], icon size-5',
      why: '8px by 5px around a 20px icon and 20px line height gives a 30px pill, the height of the AI chat panel switcher it came from.',
    },
  ],

  pitfalls: [
    'Do not draw the active underline with a border on each `Tab`. It cannot animate between tabs, and it doubles up with the strip\'s own `border-b`. The single measured span is what slides.',
    'Do not measure in a plain `useEffect`. The first paint would show the bar at its old position, or missing, for one frame. The isomorphic layout effect measures before paint.',
    'Do not drop the `ResizeObserver` on the individual tabs. A web font that loads after mount widens the labels without resizing the strip, and the underline is then left short of the text.',
    'Do not use `PillTab` for routed content panels. It is a toggle button with `aria-pressed`, not a `role="tab"`, so it has no arrow-key navigation and no panel association. Use the React Aria `Tabs` for that.',
    'Do not forget `aria-label` on `TabList`. React Aria warns at runtime when a tab list has no accessible name.',
  ],

  notes: [
    '`PillTab` is controlled only: it takes `isSelected` and `onSelect`, and the parent owns which one is active. Several pills can be selected at once, but the thumb only follows the first `[data-pill-selected]` it finds.',
    'The thumb picks up the variant of the selected pill, so a row can mix blue and gray pills and the surface colour and radius switch as the selection moves.',
  ],

  apiSignature:
    'function Tabs(props: AriaTabsProps & { ref?: Ref<HTMLDivElement> }): JSX.Element\nfunction TabList<T extends object>(props: AriaTabListProps<T> & { ref?: Ref<HTMLDivElement> }): JSX.Element\nfunction Tab(props: Omit<AriaTabProps, "children"> & { children?: ReactNode; icon?: IconComponent; count?: ReactNode; ref?: Ref<HTMLDivElement> }): JSX.Element\nfunction TabPanel(props: AriaTabPanelProps & { ref?: Ref<HTMLDivElement> }): JSX.Element\nfunction PillTabList(props: HTMLAttributes<HTMLDivElement> & { ref?: Ref<HTMLDivElement> }): JSX.Element\nfunction PillTab(props: { variant?: "blue" | "gray"; icon?: IconComponent; isSelected: boolean; onSelect: () => void; children: ReactNode; className?: string }): JSX.Element',

  props: [
    { name: 'Tabs.selectedKey / defaultSelectedKey', type: 'Key', description: 'Controlled or uncontrolled selection, straight from React Aria. Pair with `onSelectionChange`.' },
    { name: 'Tabs.orientation', type: '"horizontal" | "vertical"', default: '"horizontal"', description: 'Vertical switches the outer stack to `flex-row`. The underline measures `offsetLeft` only, so it is designed for horizontal strips.' },
    { name: 'TabList.aria-label', type: 'string', description: 'Accessible name for the tab list. Required when there is no visible heading.' },
    { name: 'Tab.id', type: 'Key', description: 'Key that matches the `id` of the `TabPanel` it controls.' },
    { name: 'Tab.icon', type: 'ComponentType<{ className?: string }>', description: '16px leading icon component. Inherits the label colour.' },
    { name: 'Tab.count', type: 'ReactNode', description: 'Trailing badge, accent-tinted when the tab is selected and muted otherwise. Omitted when null.' },
    { name: 'PillTab.variant', type: '"blue" | "gray"', default: '"blue"', description: 'Blue is fully rounded with an accent thumb; gray is a 10px radius with a neutral thumb.' },
    { name: 'PillTab.isSelected / onSelect', type: 'boolean / () => void', description: 'Controlled selection. The selected pill carries `data-pill-selected`, which the list measures.' },
  ],

  reducedMotion:
    'The component does not check `prefers-reduced-motion` itself. The underline (200ms) and pill thumb (300ms) slides and the colour fades are plain CSS transitions, so a global reduced-motion rule that zeroes transition durations makes them jump straight to the new tab.',

  cleanup:
    'Each list disconnects its `ResizeObserver` and `MutationObserver` in the layout effect cleanup, on unmount and whenever the direction changes. There are no timers or animation frames.',

  acceptance:
    'An underline strip with three tabs shows a 2px accent bar under the selected tab only. Click or arrow-key to another tab and the bar slides and resizes to the new tab in about 200ms, while the label turns accent and medium weight. Count badges are tinted on the selected tab and faded on the others. In a pill row, selecting another pill slides one shared thumb under it with a small overshoot, and hovering an unselected pill tints only that pill.',

  criticalRegion: 'critical',
};

export default meta;
