import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'segmented-control',
  title: 'Segmented Control',
  category: 'form',
  kit: 'boardui',
  tags: ['segmented', 'toggle-group', 'tabs', 'switcher', 'react-aria', 'boardui'],
  blurb:
    'A pill switcher for Weekly / Monthly / Yearly choices: one white thumb, measured from the DOM, slides under the selected segment.',
  cost: 'dom',
  motif: 'split',

  files: [
    {
      path: 'registry/ui/segmented-control.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['react-aria-components@^1.22.1'],

  summary:
    'A single-select segmented control on React Aria\'s ToggleButtonGroup, so arrow keys move focus, Space or Enter selects, and the selection can never be emptied. Instead of each segment painting its own background, one absolutely positioned thumb is measured off the selected button and slides between segments over 200ms. A `plain` variant drops the track and the thumb and marks the selection with text weight and colour alone.',

  mechanism: [
    '`SegmentedControl` renders an `AriaToggleButtonGroup` with `selectionMode="single"` and `disallowEmptySelection` fixed, then spreads the caller\'s props (`selectedKeys`, `defaultSelectedKeys`, `onSelectionChange`, `aria-label`, ...). The `solid` track is `inline-flex gap-0.5 rounded-2lg p-1` on `bg-segmented-control-background`.',
    'In a layout effect (a plain effect on the server) it queries the group for the `[data-selected]` button that React Aria marks and stores its `offsetLeft`, `offsetTop`, `offsetWidth` and `offsetHeight`. A 0px width (the control is hidden or not laid out yet) or no selection stores no thumb, and equal measurements keep the previous state so observer callbacks cannot re-render in a loop. Offsets are relative to the group because the group is `relative`, so the thumb needs no `getBoundingClientRect` arithmetic.',
    'The thumb is a single `aria-hidden` span at `left-0 top-0`, placed with `transform: translate(left, top)` and sized with explicit `width` / `height`, with `transition-[transform,width,height] duration-200`. Moving between segments of different widths therefore slides and resizes in one motion.',
    'Re-measuring is event driven, never polled: a ResizeObserver watches the group and every button (labels can change width when fonts load or text changes), and a MutationObserver on the subtree re-observes new buttons and re-measures when `data-selected` or the children change. Both disconnect on cleanup; the effect re-runs when the document direction flips.',
    'Each `SegmentedControlItem` is a `relative z-10` React Aria `ToggleButton` above the thumb: `px-2.5 py-1 rounded-md`, `text-body-medium text-text-primary` when selected and `text-body-regular text-text-secondary` otherwise, with a 200ms colour transition, a focus-visible ring and 50% opacity when disabled. Until the thumb exists (the server render, or a hidden control) a context flag gives the selected segment the thumb\'s own `bg-segmented-control-selected-background shadow-2xs`, so first paint already shows the white pill; once the thumb is measured the segment drops it and the thumb takes over and slides.',
  ],

  constants: [
    {
      name: 'thumb transition',
      value: '200ms on transform, width and height',
      why: 'Long enough to read as one object moving to the new choice, short enough that rapid clicking never lags behind the selection.',
    },
    {
      name: 'track',
      value: 'p-1, gap-0.5, rounded-2lg (10px); segments rounded-md (6px)',
      why: 'From the Figma switch (node 3731:3096). A 4px inset with a 6px inner radius keeps the thumb\'s corners concentric with the 10px track.',
    },
    {
      name: 'segment padding',
      value: 'px-2.5 py-1',
      why: 'Compact enough to sit in a card header next to a title without dominating it.',
    },
    {
      name: 'thumb shadow',
      value: 'shadow-2xs: 0 1px rgb(0 0 0 / 0.16)',
      why: 'A single-pixel bottom edge lifts the white thumb off the light-grey track without a blurred shadow.',
    },
  ],

  pitfalls: [
    'Do not give each selected segment its own background once the thumb is measured. The point is a single thumb that travels; per-segment backgrounds jump with no motion. The segment fill is only the stand-in before the first measurement.',
    'Do not measure with `getBoundingClientRect` against the viewport. The thumb is positioned inside the `relative` group, so `offsetLeft` / `offsetTop` are already in the right space and survive page scroll.',
    'Do not measure only once on mount. Web fonts, translated labels and a direction flip all change segment widths; without the ResizeObserver and MutationObserver the thumb drifts off its segment.',
    'Do not pass `selectionMode` or `disallowEmptySelection`. Both are fixed by the component and omitted from its props; a segmented control that can be emptied leaves the thumb parked on nothing.',
  ],

  notes: [
    'Selection uses React Aria\'s key sets: `selectedKeys={new Set(["monthly"])}` with `onSelectionChange={(keys) => ...}`, where each item\'s `id` is its key.',
    'Give the group an `aria-label` ("Period", "View"); React Aria renders it as `role="radiogroup"` with radio items in single-selection mode.',
    'The thumb renders only after the first measurement. Before that (on the server, or while the control is hidden) the selected segment paints the same white fill itself, so server HTML and first paint match the measured look.',
  ],

  apiSignature:
    'function SegmentedControl(props: Omit<ToggleButtonGroupProps, "selectionMode" | "disallowEmptySelection"> & { variant?: "solid" | "plain"; children?: ReactNode; ref?: Ref<HTMLDivElement> }): JSX.Element\nfunction SegmentedControlItem(props: Omit<ToggleButtonProps, "children"> & { children?: ReactNode; ref?: Ref<HTMLButtonElement> }): JSX.Element',

  props: [
    { name: 'selectedKeys / defaultSelectedKeys', type: 'Iterable<Key>', description: 'Controlled or initial selection; holds exactly one item id.' },
    { name: 'onSelectionChange', type: '(keys: Set<Key>) => void', description: 'Fires with the new one-key set.' },
    { name: 'variant', type: '"solid" | "plain"', default: '"solid"', description: '`plain` drops the track background and the thumb.' },
    { name: 'aria-label', type: 'string', description: 'Names the group for assistive technology.' },
    { name: 'isDisabled', type: 'boolean', description: 'On the group or a single `SegmentedControlItem`; disabled items drop to 50% opacity.' },
    { name: 'id', type: 'Key', description: 'SegmentedControlItem only. The key reported in the selection set.' },
  ],

  reducedMotion:
    'The component does not branch on `prefers-reduced-motion`. The only motion is the 200ms thumb slide plus colour fades on the labels, and the selected state is also carried by text weight and colour, so turning transitions off loses nothing.',

  cleanup:
    'The layout effect disconnects its ResizeObserver and MutationObserver when the control unmounts or the direction changes. No timers or window listeners.',

  acceptance:
    'A grey pill track holds Weekly, Monthly and Yearly with a white thumb under the selected one. Clicking another segment slides and resizes the thumb to it in about 200ms while its label turns medium weight and primary colour. Arrow keys move focus between segments and Space selects; clicking the selected segment keeps it selected. The `plain` variant shows no track or thumb, only the weight and colour change, and a disabled item is dimmed and cannot be chosen.',

  criticalRegion: 'critical',
};

export default meta;
