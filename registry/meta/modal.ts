import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'modal',
  title: 'Modal',
  category: 'overlay',
  kit: 'boardui',
  tags: ['modal', 'dialog', 'alert-dialog', 'overlay', 'react-aria', 'boardui'],
  blurb:
    'Dialog over a dimmed page with a header, scrolling body and actions, plus an alert dialog for destructive confirms.',
  cost: 'css',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/modal.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['@remixicon/react@^4.9.0', 'react-aria-components@^1.22.1'],

  summary:
    'A centred dialog built on React Aria\'s `ModalOverlay`, `Modal` and `Dialog`: focus is trapped and returned to the trigger, the page behind stops scrolling, and Escape or a backdrop press dismisses it. The panel fades in from scale 0.85 with a 4px blur on the iOS sheet curve and plays the same transition in reverse before it unmounts. `ModalHeader`, `ModalBody` and `ModalFooter` lay out the content, and `AlertDialog` is the destructive-confirm preset whose async `onConfirm` keeps it open and busy until the promise settles.',

  mechanism: [
    '`ModalTrigger` splits its children with `Children.toArray`: the first child is the trigger and is wrapped in React Aria\'s `Pressable`, so any kit button that forwards its ref and spreads props opens the dialog; the rest (the `Modal`) are passed through to `DialogTrigger`. Without a trigger, `Modal` is controlled from outside with `isOpen` / `onOpenChange`.',
    '`Modal` renders `ModalOverlay` (`fixed inset-x-0 top-0 z-100`, height `h-(--visual-viewport-height)`, centred with `p-4 sm:p-6`) with `isDismissable` defaulting to true and `dir` from `useDirection()`. Inside it sits an `aria-hidden` backdrop div (`absolute inset-0 bg-black/70`) and the `AriaModal` panel, whose width comes from the `size` map: sm 400, md 480, lg 640, xl 800px.',
    'Motion is pure CSS keyed on React Aria\'s `data-entering` / `data-exiting` attributes. The overlay is a `group/modal`, so the backdrop fades with `group-data-[entering]/modal:opacity-0` over `duration-300 ease-out`. The panel transitions `opacity, scale, filter` over 300ms on `cubic-bezier(0.32,0.72,0,1)` from `opacity-0` plus, under `motion-safe:` only, `scale-[0.85]` and `blur-[4px]`. React Aria waits for the exit transition before unmounting, so closing replays the entrance in reverse.',
    '`ModalDialog` (shared with Drawer) renders the `AriaDialog` surface: `rounded-3xl border border-separator-border bg-background-full shadow-xs`, `py-6`, `gap-4`, and `overflow-clip` rather than `overflow-hidden`. It owns a `useId()` description id and a `described` flag in context; `ModalHeader` sets that flag in a `useLayoutEffect` when it has a description, so `aria-describedby` points at the description only while one is rendered.',
    '`ModalHeader` renders an optional 40px icon circle (tinted with the notification-error tokens when `tone="danger"`), the title as a React Aria `Heading slot="title"` so it names the dialog, the description, and a `CloseButton` that calls `useModalClose()` (which reads `OverlayTriggerStateContext`). `ModalBody` is the only scroller (`overflow-y-auto overscroll-contain`) and shows a `ScrollFade` once scrolled; `ModalFooter` stacks actions `flex-col-reverse` on phones and becomes a trailing row from `sm`.',
    '`AlertDialog` renders `Modal` with `role="alertdialog"`, `size="sm"` and `isDismissable` false by default. Its confirm handler calls `onConfirm`; if that returns a thenable it sets `pending`, disables Cancel, turns the confirm button `aria-busy` with a spinner and `pendingLabel`, blocks Escape (`isKeyboardDismissDisabled`) and backdrop dismissal, closes on resolve and stays open on reject. Cancel carries `autoFocus`, so focus lands on the safe action.',
  ],

  constants: [
    {
      name: 'panel widths',
      value: 'sm 400 / md 480 / lg 640 / xl 800 px',
      why: '`md` is the default for forms; `AlertDialog` defaults to `sm` because a confirm holds one sentence and two buttons, and a wider panel stretches the line length past comfortable reading.',
    },
    {
      name: 'entrance / exit',
      value: '300ms, cubic-bezier(0.32,0.72,0,1), scale 0.85, blur 4px',
      why: 'The iOS sheet curve front-loads the motion so the panel arrives fast and settles; the blur hides the scaled-up rasterisation of the first frames. The same values run in reverse on exit.',
    },
    {
      name: 'backdrop',
      value: 'bg-black/70, 300ms ease-out opacity',
      why: 'Dark enough to separate the panel from a busy page in both themes, and timed with the panel so the two arrive together.',
    },
    {
      name: 'icon circle',
      value: 'size-10 (40px) with a size-5 (20px) glyph, mb-4',
      why: 'Matches the Settings Modal header so dialogs across the kit share one header rhythm.',
    },
  ],

  pitfalls: [
    'Do not use `overflow-hidden` on the dialog surface. A hidden box is still programmatically scrollable, so focusing a field clipped by the body scroller can scroll the whole panel; `overflow-clip` cannot be scrolled.',
    'Do not let the panel or the header scroll. Only `ModalBody` scrolls (`min-h-0 flex-1 overflow-y-auto`), so the title and the actions stay put on a short viewport.',
    'Do not animate the panel with JS or a keyframe that ignores `data-exiting`. React Aria only delays unmount for a CSS transition or animation on the exiting element, which is what makes the close replay the entrance.',
    'Do not hard-code `aria-describedby`. It is set only while `ModalHeader` renders a description, otherwise it would point at an id that does not exist.',
    'Do not make an `AlertDialog` dismissable by default or put the initial focus on the destructive button. An alert asks for an answer, and Enter on a focused Delete is an accident waiting to happen.',
  ],

  notes: [
    '`useModalClose()` is exported so deep children (a form submit handler, a list row) can close the surrounding Modal, Drawer or AlertDialog without threading `close` down.',
    'Reduced motion keeps the opacity fade and only drops the scale and blur, because those are behind `motion-safe:`.',
    'The surface uses `bg-background-full`: page white in light mode and, in dark mode, a ground darker than the inputs and menus inside, so they keep an edge.',
  ],

  apiSignature:
    'function ModalTrigger(props: Omit<DialogTriggerProps, "children"> & { children: ReactNode }): JSX.Element\nfunction Modal(props: Omit<ModalOverlayProps, "children" | "className" | "style"> & { size?: "sm" | "md" | "lg" | "xl"; role?: "dialog" | "alertdialog"; "aria-label"?: string; className?: string; overlayClassName?: string; children: ReactNode | ((renderProps: DialogRenderProps) => ReactNode) }): JSX.Element\nfunction ModalHeader(props: { title: ReactNode; description?: ReactNode; icon?: IconComponent; tone?: "default" | "danger"; showCloseButton?: boolean; closeLabel?: string; className?: string; children?: ReactNode }): JSX.Element\nfunction ModalBody(props: { className?: string; children: ReactNode }): JSX.Element\nfunction ModalFooter(props: { className?: string; children: ReactNode }): JSX.Element\nfunction AlertDialog(props: AlertDialogProps): JSX.Element\nfunction useModalClose(): () => void',

  props: [
    { name: 'size', type: '"sm" | "md" | "lg" | "xl"', default: '"md"', description: 'Panel max width: 400, 480, 640 or 800px. AlertDialog defaults to "sm".' },
    { name: 'isDismissable', type: 'boolean', default: 'true (Modal) / false (AlertDialog)', description: 'Whether a press on the backdrop closes the dialog.' },
    { name: 'isOpen / onOpenChange', type: 'boolean / (isOpen: boolean) => void', description: 'Controlled open state when the Modal is used without a ModalTrigger.' },
    { name: 'children', type: 'ReactNode | ((renderProps: DialogRenderProps) => ReactNode)', description: 'Dialog content; the function form receives `close`.' },
    { name: 'overlayClassName', type: 'string', description: 'Classes on the full-screen overlay, e.g. to pin the panel to the top.' },
    { name: 'ModalHeader.description', type: 'ReactNode', description: 'Supporting copy under the title, wired to the dialog\'s `aria-describedby`.' },
    { name: 'ModalHeader.tone', type: '"default" | "danger"', default: '"default"', description: 'Danger tints the 40px icon circle with the error tokens.' },
    { name: 'AlertDialog.onConfirm', type: '() => void | Promise<unknown>', description: 'Return a promise to keep the dialog open and busy until it settles; it closes on resolve and stays open on reject.' },
    { name: 'AlertDialog.variant', type: '"danger" | "default"', default: '"danger"', description: 'Danger pairs the warning icon tint with a danger confirm button.' },
    { name: 'AlertDialog.isConfirmDisabled', type: 'boolean', default: 'false', description: 'Disables the confirm action, e.g. until a confirmation phrase is typed.' },
  ],

  reducedMotion:
    'The panel\'s scale and blur are behind `motion-safe:` and are dropped under `prefers-reduced-motion: reduce`; the backdrop and panel still fade over 300ms, so opening and closing remain perceptible without movement.',

  cleanup:
    'React Aria releases the focus trap, restores focus to the trigger, and removes the scroll lock when the overlay unmounts after its exit transition. The ModalHeader layout effect resets the `described` flag on unmount. No timers or listeners of its own.',

  acceptance:
    'Pressing "Invite teammates" fades in a dimmed backdrop and a panel that grows from slightly smaller and blurred to sharp; Tab cycles only inside the panel, Escape or a click on the backdrop closes it with the reverse animation, and focus returns to the trigger. In the delete AlertDialog, focus starts on Cancel, a backdrop click does nothing, and Delete shows a spinner with "Deleting…" while Cancel is disabled, then closes when the promise resolves.',

  criticalRegion: 'critical',
};

export default meta;
