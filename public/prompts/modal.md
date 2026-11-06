# Build: Modal

A centred dialog built on React Aria's `ModalOverlay`, `Modal` and `Dialog`: focus is trapped and returned to the trigger, the page behind stops scrolling, and Escape or a backdrop press dismisses it. The panel fades in from scale 0.85 with a 4px blur on the iOS sheet curve and plays the same transition in reverse before it unmounts. `ModalHeader`, `ModalBody` and `ModalFooter` lay out the content, and `AlertDialog` is the destructive-confirm preset whose async `onConfirm` keeps it open and busy until the promise settles.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Dialog over a dimmed page with a header, scrolling body and actions, plus an alert dialog for destructive confirms.

- Category: overlay
- Runtime cost: css
- Dependencies: @remixicon/react@^4.9.0, react-aria-components@^1.22.1

## How it works

1. `ModalTrigger` splits its children with `Children.toArray`: the first child is the trigger and is wrapped in React Aria's `Pressable`, so any kit button that forwards its ref and spreads props opens the dialog; the rest (the `Modal`) are passed through to `DialogTrigger`. Without a trigger, `Modal` is controlled from outside with `isOpen` / `onOpenChange`.
2. `Modal` renders `ModalOverlay` (`fixed inset-x-0 top-0 z-100`, height `h-(--visual-viewport-height)`, centred with `p-4 sm:p-6`) with `isDismissable` defaulting to true and `dir` from `useDirection()`. Inside it sits an `aria-hidden` backdrop div (`absolute inset-0 bg-black/70`) and the `AriaModal` panel, whose width comes from the `size` map: sm 400, md 480, lg 640, xl 800px.
3. Motion is pure CSS keyed on React Aria's `data-entering` / `data-exiting` attributes. The overlay is a `group/modal`, so the backdrop fades with `group-data-[entering]/modal:opacity-0` over `duration-300 ease-out`. The panel transitions `opacity, scale, filter` over 300ms on `cubic-bezier(0.32,0.72,0,1)` from `opacity-0` plus, under `motion-safe:` only, `scale-[0.85]` and `blur-[4px]`. React Aria waits for the exit transition before unmounting, so closing replays the entrance in reverse.
4. `ModalDialog` (shared with Drawer) renders the `AriaDialog` surface: `rounded-3xl border border-separator-border bg-background-full shadow-xs`, `py-6`, `gap-4`, and `overflow-clip` rather than `overflow-hidden`. It owns a `useId()` description id and a `described` flag in context; `ModalHeader` sets that flag in a `useLayoutEffect` when it has a description, so `aria-describedby` points at the description only while one is rendered.
5. `ModalHeader` renders an optional 40px icon circle (tinted with the notification-error tokens when `tone="danger"`), the title as a React Aria `Heading slot="title"` so it names the dialog, the description, and a `CloseButton` that calls `useModalClose()` (which reads `OverlayTriggerStateContext`). `ModalBody` is the only scroller (`overflow-y-auto overscroll-contain`) and shows a `ScrollFade` once scrolled; `ModalFooter` stacks actions `flex-col-reverse` on phones and becomes a trailing row from `sm`.
6. `AlertDialog` renders `Modal` with `role="alertdialog"`, `size="sm"` and `isDismissable` false by default. Its confirm handler calls `onConfirm`; if that returns a thenable it sets `pending`, disables Cancel, turns the confirm button `aria-busy` with a spinner and `pendingLabel`, blocks Escape (`isKeyboardDismissDisabled`) and backdrop dismissal, closes on resolve and stays open on reject. Cancel carries `autoFocus`, so focus lands on the safe action.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `panel widths = sm 400 / md 480 / lg 640 / xl 800 px`
  `md` is the default for forms; `AlertDialog` defaults to `sm` because a confirm holds one sentence and two buttons, and a wider panel stretches the line length past comfortable reading.
- `entrance / exit = 300ms, cubic-bezier(0.32,0.72,0,1), scale 0.85, blur 4px`
  The iOS sheet curve front-loads the motion so the panel arrives fast and settles; the blur hides the scaled-up rasterisation of the first frames. The same values run in reverse on exit.
- `backdrop = bg-black/70, 300ms ease-out opacity`
  Dark enough to separate the panel from a busy page in both themes, and timed with the panel so the two arrive together.
- `icon circle = size-10 (40px) with a size-5 (20px) glyph, mb-4`
  Matches the Settings Modal header so dialogs across the kit share one header rhythm.

## API

```ts
function ModalTrigger(props: Omit<DialogTriggerProps, "children"> & { children: ReactNode }): JSX.Element
function Modal(props: Omit<ModalOverlayProps, "children" | "className" | "style"> & { size?: "sm" | "md" | "lg" | "xl"; role?: "dialog" | "alertdialog"; "aria-label"?: string; className?: string; overlayClassName?: string; children: ReactNode | ((renderProps: DialogRenderProps) => ReactNode) }): JSX.Element
function ModalHeader(props: { title: ReactNode; description?: ReactNode; icon?: IconComponent; tone?: "default" | "danger"; showCloseButton?: boolean; closeLabel?: string; className?: string; children?: ReactNode }): JSX.Element
function ModalBody(props: { className?: string; children: ReactNode }): JSX.Element
function ModalFooter(props: { className?: string; children: ReactNode }): JSX.Element
function AlertDialog(props: AlertDialogProps): JSX.Element
function useModalClose(): () => void
```

- `size: "sm" | "md" | "lg" | "xl"` — default `"md"`
  Panel max width: 400, 480, 640 or 800px. AlertDialog defaults to "sm".
- `isDismissable: boolean` — default `true (Modal) / false (AlertDialog)`
  Whether a press on the backdrop closes the dialog.
- `isOpen / onOpenChange: boolean / (isOpen: boolean) => void`
  Controlled open state when the Modal is used without a ModalTrigger.
- `children: ReactNode | ((renderProps: DialogRenderProps) => ReactNode)`
  Dialog content; the function form receives `close`.
- `overlayClassName: string`
  Classes on the full-screen overlay, e.g. to pin the panel to the top.
- `ModalHeader.description: ReactNode`
  Supporting copy under the title, wired to the dialog's `aria-describedby`.
- `ModalHeader.tone: "default" | "danger"` — default `"default"`
  Danger tints the 40px icon circle with the error tokens.
- `AlertDialog.onConfirm: () => void | Promise<unknown>`
  Return a promise to keep the dialog open and busy until it settles; it closes on resolve and stays open on reject.
- `AlertDialog.variant: "danger" | "default"` — default `"danger"`
  Danger pairs the warning icon tint with a danger confirm button.
- `AlertDialog.isConfirmDisabled: boolean` — default `false`
  Disables the confirm action, e.g. until a confirmation phrase is typed.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function Modal({
  size = "md",
  role,
  "aria-label": ariaLabel,
  className,
  overlayClassName,
  isDismissable = true,
  children,
  ...props
}: ModalProps) {
  const direction = useDirection();

  return (
    <AriaModalOverlay {...props} dir={direction} isDismissable={isDismissable} className={cx(styles.overlay, overlayClassName)}>
      <div aria-hidden className={styles.backdrop} />
      <AriaModal className={cx(styles.modal, styles.size[size])}>
        <ModalDialog role={role} aria-label={ariaLabel} className={className}>
          {children}
        </ModalDialog>
      </AriaModal>
    </AriaModalOverlay>
  );
}

export interface ModalDialogProps {
  role?: "dialog" | "alertdialog";
  "aria-label"?: string;
  /** Classes merged onto the panel surface. */
  className?: string;
  children: ReactNode | ((renderProps: DialogRenderProps) => ReactNode);
}

/**
 * The panel surface and dialog element shared by Modal and Drawer: the
 * ModalHeader title names it and the description is wired to
 * aria-describedby. Render it inside a React Aria Modal.
 */
export function ModalDialog({ role, "aria-label": ariaLabel, className, children }: ModalDialogProps) {
  const descriptionId = useId();
  const [described, setDescribed] = useState(false);

  return (
    <AriaDialog
      role={role}
      aria-label={ariaLabel}
      aria-describedby={described ? descriptionId : undefined}
      className={cx(styles.dialog, className)}
    >
      {(renderProps) => (
        <ModalContext.Provider value={{ descriptionId, setDescribed }}>
          {typeof children === "function" ? children(renderProps) : children}
        </ModalContext.Provider>
      )}
    </AriaDialog>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** React Aria releases the focus trap, restores focus to the trigger, and removes the scroll lock when the overlay unmounts after its exit transition. The ModalHeader layout effect resets the `described` flag on unmount. No timers or listeners of its own.

**Reduced motion.** The panel's scale and blur are behind `motion-safe:` and are dropped under `prefers-reduced-motion: reduce`; the backdrop and panel still fade over 300ms, so opening and closing remain perceptible without movement.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Do not use `overflow-hidden` on the dialog surface. A hidden box is still programmatically scrollable, so focusing a field clipped by the body scroller can scroll the whole panel; `overflow-clip` cannot be scrolled.
- Do not let the panel or the header scroll. Only `ModalBody` scrolls (`min-h-0 flex-1 overflow-y-auto`), so the title and the actions stay put on a short viewport.
- Do not animate the panel with JS or a keyframe that ignores `data-exiting`. React Aria only delays unmount for a CSS transition or animation on the exiting element, which is what makes the close replay the entrance.
- Do not hard-code `aria-describedby`. It is set only while `ModalHeader` renders a description, otherwise it would point at an id that does not exist.
- Do not make an `AlertDialog` dismissable by default or put the initial focus on the destructive button. An alert asks for an answer, and Enter on a focused Delete is an accident waiting to happen.

## Notes

- `useModalClose()` is exported so deep children (a form submit handler, a list row) can close the surrounding Modal, Drawer or AlertDialog without threading `close` down.
- Reduced motion keeps the opacity fade and only drops the scale and blur, because those are behind `motion-safe:`.
- The surface uses `bg-background-full`: page white in light mode and, in dark mode, a ground darker than the inputs and menus inside, so they keep an edge.

## Definition of done

Pressing "Invite teammates" fades in a dimmed backdrop and a panel that grows from slightly smaller and blurred to sharp; Tab cycles only inside the panel, Escape or a click on the backdrop closes it with the reverse animation, and focus returns to the trigger. In the delete AlertDialog, focus starts on Cancel, a backdrop click does nothing, and Delete shows a spinner with "Deleting…" while Cancel is disabled, then closes when the promise resolves.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
