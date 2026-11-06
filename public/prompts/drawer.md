# Build: Drawer

Modal's sibling on the same React Aria `ModalOverlay`: a floating panel that slides in from the start, end, top or bottom edge over a black/40 backdrop. Focus is trapped and returned to the trigger, the page stops scrolling, and Escape or a backdrop press closes it. The header, body, footer and trigger are Modal's parts re-exported under Drawer names, so a drawer and a dialog share one content vocabulary.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Panel that slides in from any edge over a dimmed page, for filters, details and bottom sheets, sharing Modal's header, body and actions.

- Category: overlay
- Runtime cost: css
- Dependencies: react-aria-components@^1.22.1

## How it works

1. `Drawer` renders `AriaModalOverlay` as a `group/drawer` (`fixed inset-x-0 top-0 z-100 flex h-(--visual-viewport-height) p-2 sm:p-3`) with `dir` from `useDirection()` and `isDismissable` defaulting to true. The placement map adds the overlay alignment: `justify-end` for end, `justify-start` for start, `items-end` for bottom, `items-start` for top.
2. Inside, an `aria-hidden` backdrop div (`absolute inset-0 bg-black/40`) fades over 300ms ease-out via `group-data-[entering]/drawer:opacity-0` and `group-data-[exiting]/drawer:opacity-0`. The `AriaModal` panel is `h-full` for side drawers with a width from the size map (sm 320, md 400, lg 600px), or `max-h-[85%]` and full width for top and bottom drawers.
3. The slide is a CSS `translate` transition keyed on React Aria's `data-entering` / `data-exiting`: 300ms on `cubic-bezier(0.32,0.72,0,1)` (Modal's timing), transitioning `translate, filter, opacity`. Each edge starts `calc(100%+24px)` past its edge so no sliver of the 12px-inset panel or its shadow shows before it moves; `motion-safe:` also adds a 4px blur on entry and exit. React Aria holds the panel mounted until the exit transition ends, so closing slides it back out.
4. Start and end follow the reading direction: the classes are written per direction (`motion-safe:ltr:data-[entering]:translate-x-[calc(100%+24px)]` vs `motion-safe:rtl:data-[entering]:-translate-x-[calc(100%+24px)]`), so an end drawer opens from the right in LTR and from the left in RTL. Every class is a literal so Tailwind can see it.
5. The surface is Modal's `ModalDialog` with `flex-1` added, so the panel uses the same `rounded-3xl border bg-background-full` card and `aria-describedby` wiring; `ModalBody` takes the remaining height (`flex-1 min-h-0`) and scrolls on its own while header and footer stay pinned.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `off-screen offset = calc(100% + 24px)`
  The panel floats 12px inside the viewport (8px on phones) and casts a shadow; starting 24px past its own size guarantees nothing of it is visible before the slide begins.
- `motion = 300ms, cubic-bezier(0.32,0.72,0,1), blur 4px`
  Same duration and curve as Modal so dialogs and drawers feel like one family; the iOS sheet curve arrives fast and settles.
- `side widths = sm 320 / md 400 / lg 600 px`
  320 holds a filter list on the narrowest phones; 400 is the default detail panel; 600 fits a two-column form. Top and bottom drawers ignore `size` and span the screen.
- `top / bottom max height = max-h-[85%]`
  Leaves a strip of the dimmed page visible, which tells the reader a tap there dismisses the sheet.
- `backdrop = bg-black/40`
  Lighter than Modal's black/70 because a drawer leaves most of the page visible as context rather than replacing it.

## API

```ts
function Drawer(props: Omit<ModalOverlayProps, "children" | "className" | "style"> & { placement?: "start" | "end" | "top" | "bottom"; size?: "sm" | "md" | "lg"; "aria-label"?: string; className?: string; overlayClassName?: string; children: ReactNode | ((renderProps: DialogRenderProps) => ReactNode) }): JSX.Element
export { ModalBody as DrawerBody, ModalFooter as DrawerFooter, ModalHeader as DrawerHeader, ModalTrigger as DrawerTrigger }
```

- `placement: "start" | "end" | "top" | "bottom"` — default `"end"`
  The edge the panel slides in from. Start and end follow the reading direction.
- `size: "sm" | "md" | "lg"` — default `"md"`
  Width of a start or end drawer: 320, 400 or 600px. Ignored for top and bottom.
- `isDismissable: boolean` — default `true`
  Whether a press on the backdrop closes the drawer.
- `isOpen / onOpenChange: boolean / (isOpen: boolean) => void`
  Controlled open state when used without a DrawerTrigger.
- `aria-label: string`
  Accessible name when the content has no DrawerHeader title.
- `className: string`
  Classes on the panel surface.
- `overlayClassName: string`
  Classes on the full-screen overlay.
- `children: ReactNode | ((renderProps: DialogRenderProps) => ReactNode)`
  Drawer content; the function form receives `close`.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
const styles = sortCx({
  overlay: "group/drawer fixed inset-x-0 top-0 z-100 flex h-(--visual-viewport-height) p-2 sm:p-3",
  backdrop: [
    "absolute inset-0 bg-black/40",
    "transition-opacity duration-300 ease-out",
    "group-data-[entering]/drawer:opacity-0 group-data-[exiting]/drawer:opacity-0",
  ].join(" "),
  modal: [
    "relative flex w-full flex-col outline-none",
    "transform-gpu transition-[translate,filter,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
    "motion-safe:data-[entering]:blur-[4px] motion-safe:data-[exiting]:blur-[4px]",
    "motion-reduce:data-[entering]:opacity-0 motion-reduce:data-[exiting]:opacity-0",
  ].join(" "),
  dialog: "flex-1",
  // Each panel starts 24px past its edge (the 12px inset plus its shadow),
  // so no sliver of it shows before it moves. Literal per edge and direction
  // so Tailwind can see every class.
  placement: {
    end: {
      overlay: "justify-end",
      modal: [
        "h-full",
        "motion-safe:ltr:data-[entering]:translate-x-[calc(100%+24px)] motion-safe:ltr:data-[exiting]:translate-x-[calc(100%+24px)]",
        "motion-safe:rtl:data-[entering]:-translate-x-[calc(100%+24px)] motion-safe:rtl:data-[exiting]:-translate-x-[calc(100%+24px)]",
      ].join(" "),
    },
    start: {
      overlay: "justify-start",
      modal: [
        "h-full",
        "motion-safe:ltr:data-[entering]:-translate-x-[calc(100%+24px)] motion-safe:ltr:data-[exiting]:-translate-x-[calc(100%+24px)]",
        "motion-safe:rtl:data-[entering]:translate-x-[calc(100%+24px)] motion-safe:rtl:data-[exiting]:translate-x-[calc(100%+24px)]",
      ].join(" "),
    },
    bottom: {
      overlay: "items-end",
      modal: "max-h-[85%] motion-safe:data-[entering]:translate-y-[calc(100%+24px)] motion-safe:data-[exiting]:translate-y-[calc(100%+24px)]",
    },
    top: {
      overlay: "items-start",
      modal: "max-h-[85%] motion-safe:data-[entering]:-translate-y-[calc(100%+24px)] motion-safe:data-[exiting]:-translate-y-[calc(100%+24px)]",
    },
  },
  // Side drawers only; top and bottom drawers span the screen.
  size: {
    sm: "max-w-[320px]",
    md: "max-w-[400px]",
    lg: "max-w-[600px]",
  },
});

export interface DrawerProps extends Omit<ModalOverlayProps, "children" | "className" | "style"> {
  /** The edge the panel slides in from. `start` and `end` follow the reading direction. */
  placement?: DrawerPlacement;
  /** Width of a start or end drawer: 320, 400 (default), or 600px. */
  size?: DrawerSize;
  /** Accessible name when the content has no DrawerHeader title. */
  "aria-label"?: string;
  /** Classes on the panel surface. */
  className?: string;
  /** Classes on the full-screen overlay. */
  overlayClassName?: string;
  children: ReactNode | ((renderProps: DialogRenderProps) => ReactNode);
}

export function Drawer({
  placement = "end",
  size = "md",
  "aria-label": ariaLabel,
  className,
  overlayClassName,
  isDismissable = true,
  children,
  ...props
}: DrawerProps) {
  const direction = useDirection();
  const edge = styles.placement[placement];
  const side = placement === "start" || placement === "end";

  return (
    <AriaModalOverlay
      {...props}
      dir={direction}
      isDismissable={isDismissable}
      className={cx(styles.overlay, edge.overlay, overlayClassName)}
    >
      <div aria-hidden className={styles.backdrop} />
      <AriaModal className={cx(styles.modal, edge.modal, side && styles.size[size])}>
        <ModalDialog aria-label={ariaLabel} className={cx(styles.dialog, className)}>
          {children}
        </ModalDialog>
      </AriaModal>
    </AriaModalOverlay>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** React Aria releases the focus trap, restores focus to the trigger and removes the page scroll lock when the overlay unmounts after the exit transition. The component adds no listeners or timers.

**Reduced motion.** Under `prefers-reduced-motion: reduce` the translate and blur are not applied; the panel instead fades in and out (`motion-reduce:data-[entering]:opacity-0`) over the same 300ms, and the backdrop still fades.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Do not build the translate classes with string interpolation (`translate-x-[${offset}]`). Tailwind only generates literal class names it can find in the source, so every edge and direction is spelled out.
- Do not use `left` / `right` for start and end. The per-direction `ltr:` / `rtl:` variants are what make an end drawer open from the left in RTL.
- Do not animate the slide with `transform` and the blur with a separate keyframe. React Aria waits for the transition on the exiting element before unmounting, so keep `translate`, `filter` and `opacity` in the one transition list.
- Do not apply `size` to top or bottom drawers; they are full width by design, which is why the size class is only added when `placement` is start or end.

## Notes

- `DrawerTrigger`, `DrawerHeader`, `DrawerBody` and `DrawerFooter` are `ModalTrigger`, `ModalHeader`, `ModalBody` and `ModalFooter` re-exported, so `useModalClose()` from the modal file also closes a drawer.
- Under reduced motion the slide and blur (both `motion-safe:`) are dropped and `motion-reduce:` adds an opacity fade instead.

## Definition of done

Pressing "Filters" dims the page and slides a 320px panel in from the right edge (from the left with `dir="rtl"`), sharpening from a slight blur; its body scrolls on its own while the header and footer stay put. Escape or a click on the dimmed area slides it back out and returns focus to the button. "Bottom sheet" rises from the bottom edge, spans the width and stops at 85% of the viewport height.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
