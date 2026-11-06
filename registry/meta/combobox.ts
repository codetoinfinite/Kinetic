import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'combobox',
  title: 'Combobox',
  category: 'form',
  kit: 'boardui',
  tags: ['combobox', 'autocomplete', 'typeahead', 'search', 'react-aria', 'form', 'boardui'],
  blurb:
    'Type to filter a list: Input\'s own field with a chevron toggle, and a field-width menu with sections, a check and a scroll fade.',
  cost: 'dom',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/combobox.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['@remixicon/react@^4.9.0', 'react-aria-components@^1.22.1'],

  summary:
    'React Aria\'s `ComboBox` dressed in the kit\'s existing parts. The field is Input\'s `InputBase`, so hover, focus, invalid and disabled states match every other text field, and the menu is Select\'s surface, so the motion and row styling match every other list. Two details are its own: the popover anchors to the whole field and copies its measured width, and the list scrolls under a progressive top blur that ramps in over the first 24px of scroll.',

  mechanism: [
    'React Aria would anchor the popover to the bare `<input>`. The component instead passes `groupRef={fieldRef}` into `InputBase` and `triggerRef={fieldRef}` to the `AriaPopover`, so the menu opens under the full field, icon and chevron included.',
    'A `ResizeObserver` on that field writes `field.offsetWidth` into state, and the popover gets `style={{ width: fieldWidth }}`. The menu therefore stays exactly as wide as the field through container resizes and font loading.',
    'The toggle is an `AriaButton` in `InputBase`\'s `trailingAddon`. React Aria finds it by context and wires it as the open button. Its `ChevronDownSmall` turns `rotate-180` while open over 200ms.',
    '`useScrollFade()` turns the listbox\'s `scrollTop` into a 0–1 `progress` over its distance, and `<ScrollFade progress>` overlays a masked backdrop blur plus a wash at the top of the list. `onOpenChange` calls `fade.reset()` on each open, because every opening starts the list at the top.',
    '`allowsEmptyCollection` keeps the popover open when the filter matches nothing, and the listbox\'s `renderEmptyState` shows `emptyMessage` ("No results" by default) instead of closing on the user mid-word.',
    '`ComboBoxItem` uses the shared `MENU_ITEM` row and only adds `MENU_ITEM_ACTIVE` for the focused row. Selection shows as a 16px `RiCheckLine` in the accent colour at the end of the row. `ComboBoxSection` adds a muted `Header` and 8px of top padding between groups.',
  ],

  constants: [
    {
      name: 'popover offset',
      value: '4px',
      why: 'Matches Select, so a combobox and a select in the same form open their menus at the same distance.',
    },
    {
      name: 'list height',
      value: 'max-h-[240px], overscroll-contain',
      why: 'About six rows before the list scrolls. `overscroll-contain` stops a wheel at the end of the list from scrolling the page behind it.',
    },
    {
      name: 'scroll-fade distance',
      value: '24px (SCROLL_FADE_DISTANCE)',
      why: 'The fade reaches full strength after one row of scrolling. A longer ramp leaves the first rows sharp under the edge, and a shorter one makes the blur pop in.',
    },
    {
      name: 'emptyMessage',
      value: '"No results"',
      why: 'Shown in tertiary text instead of closing the list, so a typo leaves the popover in place and the user can correct it.',
    },
  ],

  pitfalls: [
    'Giving rows rich children with no `textValue`. Filtering and the input text after selection both use `textValue`, so an avatar row without it never matches anything typed.',
    'Leaving out both `label` and `aria-label`. React Aria logs an accessibility warning and the input has no accessible name.',
    'Expecting `className` to style the input. It goes on the root column. Width belongs there, and field styling comes from `InputBase` and `size`.',
    'Passing data through `items` and expecting the list to filter as the user types. With `items` the consumer owns filtering. Use `defaultItems` to let React Aria filter by `textValue`.',
  ],

  notes: [
    'With a function child, pass the data through `defaultItems` (uncontrolled filtering) or `items` (you filter). With static `ComboBoxItem` children, React Aria filters by `textValue` itself.',
    '`menuTrigger="focus"` opens the list on focus, which suits short lists such as timezones. The default `"input"` waits for typing.',
  ],

  apiSignature:
    'function ComboBox<T extends object>(props: Omit<AriaComboBoxProps<T>, "children" | "className"> & { label?: ReactNode; hint?: ReactNode; placeholder?: string; leadingIcon?: IconComponent; size?: InputSize; emptyMessage?: ReactNode; className?: string; popoverClassName?: string; children: ReactNode | ((item: T) => ReactNode); ref?: Ref<HTMLDivElement> }): JSX.Element; function ComboBoxItem(props: Omit<AriaListBoxItemProps, "children"> & { children?: ReactNode }): JSX.Element; function ComboBoxSection<T extends object>(props: Omit<AriaListBoxSectionProps<T>, "className" | "children"> & { title?: ReactNode; className?: string; children: ReactNode }): JSX.Element',

  props: [
    { name: 'label', type: 'ReactNode', description: 'Field label, wired as the accessible name. Without it, pass `aria-label`.' },
    { name: 'placeholder', type: 'string', description: 'Input placeholder.' },
    { name: 'leadingIcon', type: 'ComponentType<{ className?: string }>', description: 'Icon at the start of the field, for example `RiSearchLine`.' },
    { name: 'hint', type: 'ReactNode', description: 'Help text under the field. Shown in the error colour while the field is invalid.' },
    { name: 'size', type: '"medium" | "small"', default: '"medium"', description: 'Field height, 36px or 32px, as Input.' },
    { name: 'emptyMessage', type: 'ReactNode', default: '"No results"', description: 'Shown in the list when nothing matches.' },
    { name: 'defaultItems / items', type: 'Iterable<T>', description: 'Data for a function child. `defaultItems` lets React Aria filter; `items` means you filter.' },
    { name: 'value / defaultValue / onChange', type: 'Key | null', description: 'React Aria\'s selected key, controlled or uncontrolled.' },
    { name: 'inputValue / onInputChange / allowsCustomValue', type: 'string / boolean', description: 'Control the typed text, or keep text that matches no row.' },
    { name: 'popoverClassName', type: 'string', description: 'Classes on the list popover.' },
    { name: 'children', type: 'ReactNode | ((item: T) => ReactNode)', description: '`ComboBoxItem` rows, optionally grouped in `ComboBoxSection`.' },
  ],

  reducedMotion:
    'The menu fade, scale and blur and the 200ms chevron rotation are CSS transitions from the shared menu recipe. None of them moves content across the screen, so they stay under `prefers-reduced-motion`. The scroll fade follows scroll position directly and has no animation of its own.',

  cleanup:
    'The `ResizeObserver` on the field is disconnected in the effect\'s cleanup on unmount. React Aria removes the popover portal on close.',

  acceptance:
    'Typing "ma" into Assignee narrows the list to Maya Chen and Mateo Ruiz, and the menu is exactly as wide as the field, icon to chevron. Typing "zz" keeps the menu open with "No one by that name". Choosing a row closes the menu, fills the input with the name and shows a check on that row the next time the menu opens. In Timezone the list opens on focus with three headed sections, and scrolling it blurs the rows that pass under the top edge. Escape closes either menu, and arrow keys move the highlight.',

  criticalRegion: 'critical',
};

export default meta;
