import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'popover',
  title: 'Popover',
  category: 'overlay',
  kit: 'boardui',
  tags: ['popover', 'overlay', 'dialog', 'arrow', 'react-aria', 'boardui'],
  blurb:
    'Free-form content anchored to a trigger, with an optional arrow, smart positioning and the menu family\'s motion, built on React Aria.',
  cost: 'css',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/popover.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['react-aria-components@^1.22.1'],

  summary:
    'A non-modal surface for a share link, a short form or the explanation behind an info icon, anchored to its trigger with React Aria\'s `DialogTrigger`, `Popover` and `Dialog`. It positions and flips itself, Escape closes it and focus returns to the trigger. It opens with the menu family\'s 150ms fade, 0.95 scale and 2px blur, grown from the point nearest the trigger, and can draw Tooltip\'s caret pointing back at it.',

  mechanism: [
    '`PopoverTrigger` owns the open state (controlled `isOpen` or uncontrolled `defaultOpen`) and keeps two refs in context: `triggerRef` on a `Pressable` wrapped around the first child (so any kit button that forwards its ref works as the trigger) and `popoverRef`, which `Popover` attaches to the surface. The remaining children go through to `AriaDialogTrigger`.',
    'The popover is non-modal (`isNonModal` whenever it sits inside `PopoverTrigger`): React Aria\'s modal popovers lock page scroll and the reflow shunts sticky layout. Because non-modal popovers lose outside-press dismissal, `useDismissOnOutsidePress` adds a capture-phase `pointerdown` listener on `document` that closes it when a press lands outside both refs.',
    '`useTriggerToggle` watches for a `pointerdown` on the trigger while open and swallows the reopen that would follow, so `onOpenChange` is gated by `allowOpenChange(next)` and pressing the trigger again closes the popover instead of flickering it closed and open.',
    '`Popover` renders `AriaPopover` with `placement` defaulting to "bottom", `offset` 10 with the arrow or 8 without, `dir` from `useDirection()`, and the surface classes `z-110 w-80 max-w-[calc(100vw-32px)] rounded-[20px] border border-border-button-default bg-background-primary-default p-1.5 shadow-dropdown`.',
    'Motion is CSS on React Aria\'s state attributes: `origin-(--trigger-anchor-point)` grows the surface from the point nearest the trigger, `transition-[opacity,scale,filter] duration-150 ease-out`, `data-[entering]` / `data-[exiting]` set `opacity-0`, and `motion-safe:` adds `scale-95` and `blur-[2px]`. React Aria keeps the popover mounted until the exit transition finishes.',
    'With `showArrow`, an `OverlayArrow` render prop reads the resolved `placement` and draws the matching SVG path from `TOOLTIP_CARETS` (imported from Tooltip) with `fill-background-primary-default stroke-border-button-default` and a placement-specific 5% black drop shadow, so the caret flips with the popover. The content sits in an `AriaDialog` with `flex flex-col gap-3 p-2.5`; `PopoverHeader` renders the title as `Heading slot="title"` so it names the dialog.',
  ],

  constants: [
    {
      name: 'offset',
      value: '8px, or 10px with the arrow',
      why: 'The extra 2px makes room for the caret so its tip, not the surface, sits 8px from the trigger.',
    },
    {
      name: 'width',
      value: 'w-80 (320px), max-w-[calc(100vw-32px)]',
      why: 'A comfortable measure for a sentence or a short form; the cap keeps a 16px gutter on each side on a phone.',
    },
    {
      name: 'motion',
      value: '150ms ease-out, scale 0.95, blur 2px',
      why: 'The same values as Select and Dropdown so every anchored surface in the kit opens alike; small scale and blur read as "growing out of the trigger" without drifting.',
    },
    {
      name: 'surface',
      value: 'rounded-[20px], p-1.5 outer + p-2.5 inner',
      why: 'The composer permission popover\'s recipe: the outer 6px padding lets menu-like rows (with `dialogClassName="p-0"`) sit inset with their own radius.',
    },
    {
      name: 'z-index',
      value: 'z-110',
      why: 'Above Modal and Drawer overlays (z-100), so a popover opened from inside a dialog is not hidden behind it.',
    },
  ],

  pitfalls: [
    'Do not switch the popover to modal to get outside-press dismissal. Modal popovers lock page scroll and shift sticky layout; dismissal comes from the capture-phase `pointerdown` listener instead.',
    'Do not drop the trigger toggle. Without `useTriggerToggle`, pressing the trigger of an open popover closes it on the outside press and immediately reopens it.',
    'Do not put the transform origin at the centre. `origin-(--trigger-anchor-point)` is what makes it grow from the trigger after a flip.',
    'Do not hard-code the caret to one side. The arrow must read `placement` from `OverlayArrow` because React Aria can flip the popover when there is no room.',
  ],

  notes: [
    'A standalone `Popover` (outside `PopoverTrigger`, positioned with `triggerRef` and `isOpen`) keeps React Aria\'s own modal dismissal, because `isNonModal` is only set when the context exists.',
    'The caret geometry is shared with Tooltip through the exported `TOOLTIP_CARETS` map, so both overlays draw the same arrow.',
  ],

  apiSignature:
    'function PopoverTrigger(props: { isOpen?: boolean; defaultOpen?: boolean; onOpenChange?: (isOpen: boolean) => void; children: ReactNode }): JSX.Element\nfunction Popover(props: Pick<AriaPopoverProps, "placement" | "offset" | "crossOffset" | "shouldFlip" | "containerPadding" | "triggerRef" | "isOpen" | "onOpenChange"> & { showArrow?: boolean; "aria-label"?: string; className?: string; dialogClassName?: string; children: ReactNode | ((renderProps: DialogRenderProps) => ReactNode) }): JSX.Element\nfunction PopoverHeader(props: { title: ReactNode; description?: ReactNode; className?: string }): JSX.Element\nfunction PopoverFooter(props: { className?: string; children: ReactNode }): JSX.Element',

  props: [
    { name: 'showArrow', type: 'boolean', default: 'false', description: 'Draw a caret pointing at the trigger; bumps the offset from 8 to 10px.' },
    { name: 'placement', type: 'Placement', default: '"bottom"', description: 'Preferred side; React Aria flips it when there is no room.' },
    { name: 'offset', type: 'number', default: '8 (10 with arrow)', description: 'Distance from the trigger in pixels.' },
    { name: 'className', type: 'string', description: 'Classes on the surface, e.g. a width other than the default 320px.' },
    { name: 'dialogClassName', type: 'string', description: 'Classes on the inner dialog; `p-0` suits menu-like rows that pad themselves.' },
    { name: 'aria-label', type: 'string', description: 'Accessible name when the content has no PopoverHeader title.' },
    { name: 'PopoverTrigger.isOpen / onOpenChange', type: 'boolean / (isOpen: boolean) => void', description: 'Controlled open state; `defaultOpen` for uncontrolled.' },
  ],

  reducedMotion:
    'The scale and blur are behind `motion-safe:`, so under `prefers-reduced-motion: reduce` the popover only fades in and out over 150ms.',

  cleanup:
    'The two `pointerdown` capture listeners on `document` are added only while the popover is open and removed in their effect cleanups when it closes or unmounts. React Aria restores focus to the trigger on close.',

  acceptance:
    'Pressing "Details" grows a 320px popover with a caret out of the button over about 150ms; pressing the button again, clicking anywhere outside, or pressing Escape closes it with the reverse motion and focus returns to the button. The page stays scrollable while it is open. The Share popover opens above its button and flips below when there is no room, with "Copy link" and "Done" inside.',

  criticalRegion: 'critical',
};

export default meta;
