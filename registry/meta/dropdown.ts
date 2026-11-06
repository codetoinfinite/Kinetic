import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'dropdown',
  title: 'Dropdown',
  category: 'overlay',
  kit: 'boardui',
  tags: ['dropdown', 'menu', 'popover', 'overlay', 'react-aria', 'boardui'],
  blurb:
    'Composable popover menu (trigger, panel, groups, rows, dividers) built on React Aria: the recipe behind the sidebar team and account menus.',
  cost: 'css',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/dropdown.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['react-aria-components@^1.22.1'],

  summary:
    'A free-form menu surface rather than a value picker: grouped rows of actions, headers, avatars, footers of buttons, whatever the panel needs. It is built from React Aria\'s `DialogTrigger`, `Popover` and `Dialog` and shares the kit\'s menu recipe with Select, so the 266px white panel opens with the same 150ms fade, scale 0.95 and 2px blur, grown from the corner nearest the trigger. Open state can be controlled so the trigger can react to it (a turning chevron) and rows can close the panel.',

  mechanism: [
    '`Dropdown` holds the open state, bridging controlled (`isOpen` / `onOpenChange`) and uncontrolled use, and shares a `triggerRef` and a `popoverRef` through context. It renders `AriaDialogTrigger` with `onOpenChange={(o) => allowOpenChange(o) && setOpen(o)}`.',
    'The panel is `isNonModal`: React Aria\'s modal scroll lock puts `overflow: hidden` on `<html>`, which collapses the page scroll position and yanks sticky layout whenever a menu opens. Non-modal loses outside-press dismissal, so `useDismissOnOutsidePress` restores it with a capture-phase `pointerdown` listener that closes the menu when a press lands outside both refs, and `useTriggerToggle` swallows the reopen when the open trigger itself is pressed, so the trigger toggles.',
    '`DropdownTrigger` is a React Aria `Button` carrying `triggerRef`, with only `cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring` of its own; the consumer styles the rest through `className`.',
    '`DropdownPopover` renders `AriaPopover` (`placement` "bottom start", `offset` 4) with `MENU_POPOVER_WIDTH` (`w-[266px]`) and `MENU_POPOVER_SURFACE`: `z-110 max-w-[calc(100vw-32px)] overflow-y-auto rounded-2xl border border-border-button-default bg-background-primary-default p-2.5 shadow-dropdown`, a `transition duration-150 ease-out`, and `data-[entering]` / `data-[exiting]` set to `opacity-0 scale-95 blur-[2px]`; `DropdownPopover` adds `motion-reduce:transition-none` after them. The transform origin follows `data-[placement]` and the reading direction (`origin-top-left`, `rtl:origin-top-right`, and so on). Inside, an `AriaDialog` labelled by the required `aria-label` is a `flex flex-col gap-1` column.',
    'Rows: `DropdownGroup` stacks an optional `ps-2 text-body-medium text-text-secondary` label over a `gap-1` column and only adds `pt-1` when there is a label. `DropdownItem` is a native `<button type="button">` with `aria-pressed={selected}`, `MENU_ITEM` (`flex w-full items-center gap-2 rounded-2lg p-2 text-start text-text-primary transition-colors`) and either the active background or hover / focus-visible backgrounds (`bg-dropdown-item-hover-background`). `DropdownDivider` bleeds through the panel padding with `-mx-2.5 my-1.5 h-px bg-border-button-default`.',
  ],

  constants: [
    {
      name: 'panel width',
      value: 'w-[266px], max-w-[calc(100vw-32px)]',
      why: 'The width of the dashboard sidebar\'s team and account menus, shared with Select through `MENU_POPOVER_WIDTH`; the cap keeps a 16px gutter on phones.',
    },
    {
      name: 'motion',
      value: '150ms ease-out, scale 0.95, blur 2px',
      why: 'The menu family\'s appear animation, identical in Select and Popover so every anchored surface opens alike.',
    },
    {
      name: 'row rhythm',
      value: 'gap-1 (4px) between rows, p-2 per row',
      why: 'The same rhythm as the Select listbox. The divider\'s `my-1.5` plus the dialog\'s `gap-1` on both sides gives the original 10px around a divider.',
    },
    {
      name: 'offset',
      value: '4px, placement "bottom start"',
      why: 'Close enough that the panel reads as belonging to its trigger; start alignment keeps the menu\'s left edge (right in RTL) under the trigger\'s.',
    },
  ],

  pitfalls: [
    'Do not make the popover modal to get outside-press dismissal back. The modal scroll lock sets `overflow: hidden` on `<html>` and shunts sticky layout every time a menu opens.',
    'Do not nest a `<button>` inside `DropdownItem`. The row is itself a native button; put footer buttons outside the rows, as the demo does.',
    'Do not add `pt-1` to a label-less group. Its first row would float 4px lower than the panel padding implies, visible as extra space above the first hover pill.',
    'Do not omit `aria-label` on `DropdownPopover`; it is required because the dialog has no heading to name it.',
  ],

  notes: [
    'Unlike Select, Dropdown does not put a value into the trigger; it is the composable shell behind the sidebar team / account menus and the AI chat template\'s add, model and folder menus.',
    'The `MENU_*` class constants live in `registry/lib/menu-styles`, shared with Select and Context Menu so the menu surfaces stay identical.',
  ],

  apiSignature:
    'function Dropdown(props: { isOpen?: boolean; onOpenChange?: (isOpen: boolean) => void; children: ReactNode }): JSX.Element\nfunction DropdownTrigger(props: ComponentProps<typeof AriaButton>): JSX.Element\nfunction DropdownPopover(props: Pick<ComponentProps<typeof AriaPopover>, "placement" | "offset" | "crossOffset"> & { "aria-label": string; className?: string; dialogClassName?: string; children: ReactNode }): JSX.Element\nfunction DropdownGroup(props: { label?: string; className?: string; children: ReactNode }): JSX.Element\nfunction DropdownItem(props: { selected?: boolean; onSelect?: () => void; className?: string; children: ReactNode }): JSX.Element\nfunction DropdownDivider(props: { className?: string }): JSX.Element',

  props: [
    { name: 'isOpen / onOpenChange', type: 'boolean / (isOpen: boolean) => void', description: 'Optional controlled state, for a trigger that reacts to it or rows that close the panel.' },
    { name: 'DropdownPopover.aria-label', type: 'string', description: 'Required accessible name for the menu dialog.' },
    { name: 'DropdownPopover.placement', type: 'Placement', default: '"bottom start"', description: 'Preferred side and alignment; flips on collision.' },
    { name: 'DropdownPopover.offset', type: 'number', default: '4', description: 'Gap between trigger and panel in pixels.' },
    { name: 'DropdownPopover.className', type: 'string', description: 'Extra panel classes, e.g. a width override for the default 266px.' },
    { name: 'DropdownGroup.label', type: 'string', description: 'Muted body-medium heading above the rows.' },
    { name: 'DropdownItem.selected', type: 'boolean', description: 'Keeps the hover pill on the row and sets `aria-pressed`.' },
    { name: 'DropdownItem.onSelect', type: '() => void', description: 'Click handler for the row.' },
  ],

  reducedMotion:
    'Under `prefers-reduced-motion: reduce`, `motion-reduce:transition-none` on the panel removes its 150ms scale, blur and fade: it opens and closes at once, and react-aria unmounts it without waiting. Row hover changes are colour only.',

  cleanup:
    'The capture-phase `pointerdown` listeners on `document` exist only while the menu is open and are removed by their effect cleanups on close or unmount. React Aria returns focus to the trigger.',

  acceptance:
    'Clicking "Team access" grows a 266px white panel from its top-left corner below the trigger and turns the chevron; the page keeps scrolling normally. The current owner\'s row keeps the grey pill, hovering another row shows the pill, and clicking it changes the owner and closes the panel. Clicking the trigger again, clicking outside, or pressing Escape closes it.',

  criticalRegion: 'critical',
};

export default meta;
