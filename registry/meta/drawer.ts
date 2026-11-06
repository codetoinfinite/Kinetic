import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'drawer',
  title: 'Drawer',
  category: 'overlay',
  kit: 'boardui',
  tags: ['drawer', 'sheet', 'side-panel', 'bottom-sheet', 'overlay', 'react-aria', 'boardui'],
  blurb:
    'Panel that slides in from any edge over a dimmed page, for filters, details and bottom sheets, sharing Modal\'s header, body and actions.',
  cost: 'css',
  motif: 'split',

  files: [
    {
      path: 'registry/ui/drawer.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['react-aria-components@^1.22.1'],

  summary:
    'Modal\'s sibling on the same React Aria `ModalOverlay`: a floating panel that slides in from the start, end, top or bottom edge over a black/40 backdrop. Focus is trapped and returned to the trigger, the page stops scrolling, and Escape or a backdrop press closes it. The header, body, footer and trigger are Modal\'s parts re-exported under Drawer names, so a drawer and a dialog share one content vocabulary.',

  mechanism: [
    '`Drawer` renders `AriaModalOverlay` as a `group/drawer` (`fixed inset-x-0 top-0 z-100 flex h-(--visual-viewport-height) p-2 sm:p-3`) with `dir` from `useDirection()` and `isDismissable` defaulting to true. The placement map adds the overlay alignment: `justify-end` for end, `justify-start` for start, `items-end` for bottom, `items-start` for top.',
    'Inside, an `aria-hidden` backdrop div (`absolute inset-0 bg-black/40`) fades over 300ms ease-out via `group-data-[entering]/drawer:opacity-0` and `group-data-[exiting]/drawer:opacity-0`. The `AriaModal` panel is `h-full` for side drawers with a width from the size map (sm 320, md 400, lg 600px), or `max-h-[85%]` and full width for top and bottom drawers.',
    'The slide is a CSS `translate` transition keyed on React Aria\'s `data-entering` / `data-exiting`: 300ms on `cubic-bezier(0.32,0.72,0,1)` (Modal\'s timing), transitioning `translate, filter, opacity`. Each edge starts `calc(100%+24px)` past its edge so no sliver of the 12px-inset panel or its shadow shows before it moves; `motion-safe:` also adds a 4px blur on entry and exit. React Aria holds the panel mounted until the exit transition ends, so closing slides it back out.',
    'Start and end follow the reading direction: the classes are written per direction (`motion-safe:ltr:data-[entering]:translate-x-[calc(100%+24px)]` vs `motion-safe:rtl:data-[entering]:-translate-x-[calc(100%+24px)]`), so an end drawer opens from the right in LTR and from the left in RTL. Every class is a literal so Tailwind can see it.',
    'The surface is Modal\'s `ModalDialog` with `flex-1` added, so the panel uses the same `rounded-3xl border bg-background-full` card and `aria-describedby` wiring; `ModalBody` takes the remaining height (`flex-1 min-h-0`) and scrolls on its own while header and footer stay pinned.',
  ],

  constants: [
    {
      name: 'off-screen offset',
      value: 'calc(100% + 24px)',
      why: 'The panel floats 12px inside the viewport (8px on phones) and casts a shadow; starting 24px past its own size guarantees nothing of it is visible before the slide begins.',
    },
    {
      name: 'motion',
      value: '300ms, cubic-bezier(0.32,0.72,0,1), blur 4px',
      why: 'Same duration and curve as Modal so dialogs and drawers feel like one family; the iOS sheet curve arrives fast and settles.',
    },
    {
      name: 'side widths',
      value: 'sm 320 / md 400 / lg 600 px',
      why: '320 holds a filter list on the narrowest phones; 400 is the default detail panel; 600 fits a two-column form. Top and bottom drawers ignore `size` and span the screen.',
    },
    {
      name: 'top / bottom max height',
      value: 'max-h-[85%]',
      why: 'Leaves a strip of the dimmed page visible, which tells the reader a tap there dismisses the sheet.',
    },
    {
      name: 'backdrop',
      value: 'bg-black/40',
      why: 'Lighter than Modal\'s black/70 because a drawer leaves most of the page visible as context rather than replacing it.',
    },
  ],

  pitfalls: [
    'Do not build the translate classes with string interpolation (`translate-x-[${offset}]`). Tailwind only generates literal class names it can find in the source, so every edge and direction is spelled out.',
    'Do not use `left` / `right` for start and end. The per-direction `ltr:` / `rtl:` variants are what make an end drawer open from the left in RTL.',
    'Do not animate the slide with `transform` and the blur with a separate keyframe. React Aria waits for the transition on the exiting element before unmounting, so keep `translate`, `filter` and `opacity` in the one transition list.',
    'Do not apply `size` to top or bottom drawers; they are full width by design, which is why the size class is only added when `placement` is start or end.',
  ],

  notes: [
    '`DrawerTrigger`, `DrawerHeader`, `DrawerBody` and `DrawerFooter` are `ModalTrigger`, `ModalHeader`, `ModalBody` and `ModalFooter` re-exported, so `useModalClose()` from the modal file also closes a drawer.',
    'Under reduced motion the slide and blur (both `motion-safe:`) are dropped and `motion-reduce:` adds an opacity fade instead.',
  ],

  apiSignature:
    'function Drawer(props: Omit<ModalOverlayProps, "children" | "className" | "style"> & { placement?: "start" | "end" | "top" | "bottom"; size?: "sm" | "md" | "lg"; "aria-label"?: string; className?: string; overlayClassName?: string; children: ReactNode | ((renderProps: DialogRenderProps) => ReactNode) }): JSX.Element\nexport { ModalBody as DrawerBody, ModalFooter as DrawerFooter, ModalHeader as DrawerHeader, ModalTrigger as DrawerTrigger }',

  props: [
    { name: 'placement', type: '"start" | "end" | "top" | "bottom"', default: '"end"', description: 'The edge the panel slides in from. Start and end follow the reading direction.' },
    { name: 'size', type: '"sm" | "md" | "lg"', default: '"md"', description: 'Width of a start or end drawer: 320, 400 or 600px. Ignored for top and bottom.' },
    { name: 'isDismissable', type: 'boolean', default: 'true', description: 'Whether a press on the backdrop closes the drawer.' },
    { name: 'isOpen / onOpenChange', type: 'boolean / (isOpen: boolean) => void', description: 'Controlled open state when used without a DrawerTrigger.' },
    { name: 'aria-label', type: 'string', description: 'Accessible name when the content has no DrawerHeader title.' },
    { name: 'className', type: 'string', description: 'Classes on the panel surface.' },
    { name: 'overlayClassName', type: 'string', description: 'Classes on the full-screen overlay.' },
    { name: 'children', type: 'ReactNode | ((renderProps: DialogRenderProps) => ReactNode)', description: 'Drawer content; the function form receives `close`.' },
  ],

  reducedMotion:
    'Under `prefers-reduced-motion: reduce` the translate and blur are not applied; the panel instead fades in and out (`motion-reduce:data-[entering]:opacity-0`) over the same 300ms, and the backdrop still fades.',

  cleanup:
    'React Aria releases the focus trap, restores focus to the trigger and removes the page scroll lock when the overlay unmounts after the exit transition. The component adds no listeners or timers.',

  acceptance:
    'Pressing "Filters" dims the page and slides a 320px panel in from the right edge (from the left with `dir="rtl"`), sharpening from a slight blur; its body scrolls on its own while the header and footer stay put. Escape or a click on the dimmed area slides it back out and returns focus to the button. "Bottom sheet" rises from the bottom edge, spans the width and stops at 85% of the viewport height.',

  criticalRegion: 'critical',
};

export default meta;
