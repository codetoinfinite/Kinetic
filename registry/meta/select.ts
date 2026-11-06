import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'select',
  title: 'Select',
  category: 'form',
  kit: 'boardui',
  tags: ['select', 'dropdown', 'listbox', 'react-aria', 'form', 'boardui'],
  blurb:
    'A React Aria select: bordered trigger with a turning chevron, non-modal popover on the shared menu surface, free-form rows.',
  cost: 'css',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/select.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['react-aria-components@^1.22.1'],

  summary:
    'React Aria\'s `Select` with BoardUI\'s trigger and menu chrome: a 10px-radius bordered button whose 16px chevron turns 180° while open, and a 266px popover that shares the Dropdown recipe (radius 2xl, shadow-dropdown, 150ms fade, scale and blur). The popover is deliberately non-modal so opening a select never locks page scroll, and the component restores the outside-press dismissal and trigger toggle that React Aria drops in that mode. Rows take any content, so a status dot, avatar or flag sits beside the text.',

  mechanism: [
    'Open state is controlled locally (`isOpen` in `useState`) and passed to `AriaSelect`. The `AriaPopover` is `isNonModal` with `offset={4}`, which skips React Aria\'s scroll lock: that lock sets `overflow: hidden` on `<html>` and, under an `h-full` root, makes the page jump each time a select opens.',
    '`isNonModal` also turns off React Aria\'s outside-press dismissal, so `useDismissOnOutsidePress(isOpen, close, [triggerRef, popoverRef])` adds a capture-phase `pointerdown` listener on `document` while open and closes when the press lands outside both refs.',
    'Pressing the trigger while open makes React Aria call `onOpenChange(false)` then `onOpenChange(true)` in the same press. `useTriggerToggle` watches for that pointerdown and swallows the reopen, so `onOpenChange={(o) => allowOpenChange(o) && setIsOpen(o)}` turns the trigger into a true toggle.',
    'The trigger is an `AriaButton` holding `AriaSelectValue` (the selected row\'s own content, or `renderValue`) and `ChevronDownSmall`, which gets `rotate-180` from the render-prop `isOpen` and animates with `transition-transform duration-200`. The button itself transitions background, border, shadow, padding and font size over 200ms, so hover and a `size` switch both ease.',
    'The popover combines `MENU_POPOVER_WIDTH` (266px), `MENU_POPOVER_SURFACE` and `p-2`. The surface\'s `data-[entering]` and `data-[exiting]` classes run opacity 0, `scale-95` and `blur-[2px]` over 150ms ease-out, with `transform-origin` taken from `data-placement`. Inside, an `AriaListBox` scrolls past `max-h-[240px]`.',
    '`size` goes down to the rows through `SelectSizeContext`. `SelectItem` reads it to pick `text-body-medium` (md) or `px-2 py-1.5 text-body-2-medium` (sm), and applies `MENU_ITEM_ACTIVE` when the row is focused or selected.',
  ],

  constants: [
    {
      name: 'popover offset',
      value: '4px',
      why: 'The gap between trigger and menu. It is enough to show the trigger border and shadow, and close enough that the menu reads as belonging to that trigger.',
    },
    {
      name: 'menu width',
      value: 'w-[266px] (MENU_POPOVER_WIDTH)',
      why: 'Shared with Dropdown so every menu in the kit has the same width. Pass `popoverClassName` to narrow it, for example to the trigger width in a filter bar.',
    },
    {
      name: 'list height',
      value: 'max-h-[240px]',
      why: 'About six rows at 36px plus 4px gaps. Longer lists scroll inside the popover instead of running past the viewport.',
    },
    {
      name: 'trigger padding',
      value: 'md px-2.5 py-2, gap-1.5 / sm px-[7px] py-1, gap-1',
      why: 'From Figma: md gives a 38px trigger that lines up with Input, and sm gives a 28px trigger for compact table toolbars.',
    },
    {
      name: 'motion',
      value: 'chevron 200ms rotate; popover 150ms opacity/scale-95/blur-2px',
      why: 'The menu is quicker than the chevron so the list is readable by the time the chevron settles. The 2px blur hides the scale step on the first frame.',
    },
  ],

  pitfalls: [
    'Leaving out both `label` and `aria-label`. React Aria then logs an accessibility warning and screen readers announce an unnamed button. Pass one of them.',
    'Removing `isNonModal` to get dismissal for free. The modal popover\'s scroll lock returns and the page jumps under an `h-full` root on every open.',
    'Giving a `SelectItem` rich children with no `textValue`. Typeahead and the accessible name then fall back to an empty string, so pass `textValue` whenever children are not plain text.',
    'Passing `isOpen` or `onOpenChange` from outside. The component controls open state itself, and the spread comes before its own props, so outside values are overwritten.',
  ],

  notes: [
    'The trigger value is the selected row\'s own content, so a row with a status dot shows the dot in the trigger too. Use `renderValue` when the trigger needs a more compact form, such as a flag and a dial code.',
    'Like the other BoardUI controls, `className` and `triggerClassName` merge through tailwind-merge, so `w-[240px]` replaces the default width cleanly.',
  ],

  apiSignature:
    'function Select<T extends object>(props: Omit<AriaSelectProps<T>, "children"> & { label?: ReactNode; className?: string; triggerClassName?: string; popoverClassName?: string; size?: "sm" | "md"; children: ReactNode; items?: Iterable<T>; renderValue?: ReactNode | ((values: AriaSelectValueRenderProps<T>) => ReactNode); ref?: Ref<HTMLDivElement> }): JSX.Element; function SelectItem(props: Omit<AriaListBoxItemProps, "children"> & { children?: ReactNode }): JSX.Element',

  props: [
    { name: 'label', type: 'ReactNode', description: 'Visible label above the trigger. React Aria wires it as the accessible name. Without it, pass `aria-label`.' },
    { name: 'size', type: '"sm" | "md"', default: '"md"', description: 'Trigger padding and type size. Rows read the same size through context.' },
    { name: 'placeholder', type: 'string', description: 'React Aria\'s placeholder, shown in the trigger until something is selected.' },
    { name: 'value / defaultValue / onChange', type: 'Key | null', description: 'React Aria\'s selection value, controlled or uncontrolled. The older `selectedKey` props still work but are deprecated in React Aria.' },
    { name: 'renderValue', type: 'ReactNode | ((values) => ReactNode)', description: 'Custom trigger content. Falls back to the selected row\'s children.' },
    { name: 'className', type: 'string', description: 'Classes on the root, for example a fixed width.' },
    { name: 'triggerClassName', type: 'string', description: 'Classes on the trigger button.' },
    { name: 'popoverClassName', type: 'string', description: 'Classes on the popover, for example a narrower width.' },
    { name: 'items', type: 'Iterable<T>', description: 'Optional dynamic collection, rendered with a children function inside the listbox.' },
    { name: 'children', type: 'ReactNode', description: '`SelectItem` rows, each with an `id` and a `textValue`.' },
  ],

  reducedMotion:
    'The chevron rotation, the trigger colour transitions and the popover fade, scale and blur are CSS transitions of 150–200ms with no JavaScript tween. They do not change position on screen, so they run under `prefers-reduced-motion` too. Add `motion-reduce:transition-none` through `popoverClassName` and `triggerClassName` to remove them.',

  cleanup:
    'The outside-press listener is added in an effect only while the popover is open and removed in that effect\'s cleanup, both on close and on unmount. `useTriggerToggle` clears its 400ms safety timeout the same way. React Aria owns the popover portal and removes it on close.',

  acceptance:
    'Clicking the trigger opens a 266px menu 4px below it with a short fade and scale, and the chevron turns 180°. Picking a row closes the menu and shows that row\'s content, status dot included, in the trigger. Clicking the trigger again, clicking outside, or pressing Escape closes the menu, and the page does not scroll or jump. Arrow keys move the highlight, and typing a letter jumps to the matching `textValue`. No accessibility warning appears in the console when `label` or `aria-label` is passed.',

  criticalRegion: 'critical',
};

export default meta;
