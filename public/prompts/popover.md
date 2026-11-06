# Build: Popover

A non-modal surface for a share link, a short form or the explanation behind an info icon, anchored to its trigger with React Aria's `DialogTrigger`, `Popover` and `Dialog`. It positions and flips itself, Escape closes it and focus returns to the trigger. It opens with the menu family's 150ms fade, 0.95 scale and 2px blur, grown from the point nearest the trigger, and can draw Tooltip's caret pointing back at it.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Free-form content anchored to a trigger, with an optional arrow, smart positioning and the menu family's motion, built on React Aria.

- Category: overlay
- Runtime cost: css
- Dependencies: react-aria-components@^1.22.1

## How it works

1. `PopoverTrigger` owns the open state (controlled `isOpen` or uncontrolled `defaultOpen`) and keeps two refs in context: `triggerRef` on a `Pressable` wrapped around the first child (so any kit button that forwards its ref works as the trigger) and `popoverRef`, which `Popover` attaches to the surface. The remaining children go through to `AriaDialogTrigger`.
2. The popover is non-modal (`isNonModal` whenever it sits inside `PopoverTrigger`): React Aria's modal popovers lock page scroll and the reflow shunts sticky layout. Because non-modal popovers lose outside-press dismissal, `useDismissOnOutsidePress` adds a capture-phase `pointerdown` listener on `document` that closes it when a press lands outside both refs.
3. `useTriggerToggle` watches for a `pointerdown` on the trigger while open and swallows the reopen that would follow, so `onOpenChange` is gated by `allowOpenChange(next)` and pressing the trigger again closes the popover instead of flickering it closed and open.
4. `Popover` renders `AriaPopover` with `placement` defaulting to "bottom", `offset` 10 with the arrow or 8 without, `dir` from `useDirection()`, and the surface classes `z-110 w-80 max-w-[calc(100vw-32px)] rounded-[20px] border border-border-button-default bg-background-primary-default p-1.5 shadow-dropdown`.
5. Motion is CSS on React Aria's state attributes: `origin-(--trigger-anchor-point)` grows the surface from the point nearest the trigger, `transition-[opacity,scale,filter] duration-150 ease-out`, `data-[entering]` / `data-[exiting]` set `opacity-0`, and `motion-safe:` adds `scale-95` and `blur-[2px]`. React Aria keeps the popover mounted until the exit transition finishes.
6. With `showArrow`, an `OverlayArrow` render prop reads the resolved `placement` and draws the matching SVG path from `TOOLTIP_CARETS` (imported from Tooltip) with `fill-background-primary-default stroke-border-button-default` and a placement-specific 5% black drop shadow, so the caret flips with the popover. The content sits in an `AriaDialog` with `flex flex-col gap-3 p-2.5`; `PopoverHeader` renders the title as `Heading slot="title"` so it names the dialog.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `offset = 8px, or 10px with the arrow`
  The extra 2px makes room for the caret so its tip, not the surface, sits 8px from the trigger.
- `width = w-80 (320px), max-w-[calc(100vw-32px)]`
  A comfortable measure for a sentence or a short form; the cap keeps a 16px gutter on each side on a phone.
- `motion = 150ms ease-out, scale 0.95, blur 2px`
  The same values as Select and Dropdown so every anchored surface in the kit opens alike; small scale and blur read as "growing out of the trigger" without drifting.
- `surface = rounded-[20px], p-1.5 outer + p-2.5 inner`
  The composer permission popover's recipe: the outer 6px padding lets menu-like rows (with `dialogClassName="p-0"`) sit inset with their own radius.
- `z-index = z-110`
  Above Modal and Drawer overlays (z-100), so a popover opened from inside a dialog is not hidden behind it.

## API

```ts
function PopoverTrigger(props: { isOpen?: boolean; defaultOpen?: boolean; onOpenChange?: (isOpen: boolean) => void; children: ReactNode }): JSX.Element
function Popover(props: Pick<AriaPopoverProps, "placement" | "offset" | "crossOffset" | "shouldFlip" | "containerPadding" | "triggerRef" | "isOpen" | "onOpenChange"> & { showArrow?: boolean; "aria-label"?: string; className?: string; dialogClassName?: string; children: ReactNode | ((renderProps: DialogRenderProps) => ReactNode) }): JSX.Element
function PopoverHeader(props: { title: ReactNode; description?: ReactNode; className?: string }): JSX.Element
function PopoverFooter(props: { className?: string; children: ReactNode }): JSX.Element
```

- `showArrow: boolean` — default `false`
  Draw a caret pointing at the trigger; bumps the offset from 8 to 10px.
- `placement: Placement` — default `"bottom"`
  Preferred side; React Aria flips it when there is no room.
- `offset: number` — default `8 (10 with arrow)`
  Distance from the trigger in pixels.
- `className: string`
  Classes on the surface, e.g. a width other than the default 320px.
- `dialogClassName: string`
  Classes on the inner dialog; `p-0` suits menu-like rows that pad themselves.
- `aria-label: string`
  Accessible name when the content has no PopoverHeader title.
- `PopoverTrigger.isOpen / onOpenChange: boolean / (isOpen: boolean) => void`
  Controlled open state; `defaultOpen` for uncontrolled.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function PopoverTrigger({ isOpen: controlledOpen, defaultOpen = false, onOpenChange, children }: PopoverTriggerProps) {
  const triggerRef = useRef<HTMLElement>(null);
  const popoverRef = useRef<HTMLElement>(null);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isOpen = controlledOpen ?? uncontrolledOpen;
  const setOpen = (next: boolean) => {
    setUncontrolledOpen(next);
    onOpenChange?.(next);
  };

  useDismissOnOutsidePress(isOpen, () => setOpen(false), [triggerRef, popoverRef]);
  // Pressing the trigger while open closes the popover instead of reopening it.
  const allowOpenChange = useTriggerToggle(isOpen, triggerRef);

  const [trigger, ...rest] = Children.toArray(children);
  return (
    <PopoverContext.Provider value={{ popoverRef }}>
      <AriaDialogTrigger isOpen={isOpen} onOpenChange={(next) => allowOpenChange(next) && setOpen(next)}>
        {isValidElement(trigger) ? (
          <Pressable ref={triggerRef}>{trigger as ReactElement<Record<string, unknown>, string>}</Pressable>
        ) : (
          trigger
        )}
        {rest}
      </AriaDialogTrigger>
    </PopoverContext.Provider>
  );
}

export interface PopoverProps
  extends Pick<AriaPopoverProps, "placement" | "offset" | "crossOffset" | "shouldFlip" | "containerPadding" | "triggerRef" | "isOpen" | "onOpenChange"> {
  /** Draw a caret pointing at the trigger. */
  showArrow?: boolean;
  /** Accessible name when the content has no PopoverHeader title. */
  "aria-label"?: string;
  /** Classes on the surface, e.g. a width (default 320px). */
  className?: string;
  /** Classes on the inner dialog; `p-0` suits menu-like rows that pad themselves. */
  dialogClassName?: string;
  children: ReactNode | ((renderProps: DialogRenderProps) => ReactNode);
}

export function Popover({
  showArrow = false,
  placement = "bottom",
  offset,
  "aria-label": ariaLabel,
  className,
  dialogClassName,
  children,
  ...props
}: PopoverProps) {
  const context = useContext(PopoverContext);
  const direction = useDirection();

  return (
    <AriaPopover
      {...props}
      ref={context?.popoverRef}
      dir={direction}
      // Standalone (triggerRef + isOpen) popovers keep React Aria's own
      // dismissal; inside PopoverTrigger the trigger restores it.
      isNonModal={context != null}
      placement={placement}
      offset={offset ?? (showArrow ? 10 : 8)}
      className={cx(
        "z-110 w-80 max-w-[calc(100vw-32px)]",
        "rounded-[20px] border border-border-button-default bg-background-primary-default p-1.5 shadow-dropdown",
        "origin-(--trigger-anchor-point) transition-[opacity,scale,filter] duration-150 ease-out",
        "data-[entering]:opacity-0 data-[exiting]:opacity-0",
        "motion-safe:data-[entering]:scale-95 motion-safe:data-[entering]:blur-[2px]",
        "motion-safe:data-[exiting]:scale-95 motion-safe:data-[exiting]:blur-[2px]",
        className,
      )}
    >
      {showArrow ? (
        <AriaOverlayArrow>
          {({ placement: side }) => {
            const caret = TOOLTIP_CARETS[side as keyof typeof TOOLTIP_CARETS] ?? TOOLTIP_CARETS.top;
            return (
              <svg
                width={caret.width}
                height={caret.height}
                viewBox={`0 0 ${caret.width} ${caret.height}`}
                className="block overflow-visible fill-background-primary-default stroke-border-button-default"
                style={{ filter: `drop-shadow(${caret.shadow} rgb(0 0 0 / 0.05))` }}
              >
                <path d={caret.path} />
              </svg>
            );
          }}
        </AriaOverlayArrow>
      ) : null}
      <AriaDialog aria-label={ariaLabel} className={cx("flex flex-col gap-3 p-2.5 outline-none", dialogClassName)}>
        {children}
      </AriaDialog>
    </AriaPopover>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The two `pointerdown` capture listeners on `document` are added only while the popover is open and removed in their effect cleanups when it closes or unmounts. React Aria restores focus to the trigger on close.

**Reduced motion.** The scale and blur are behind `motion-safe:`, so under `prefers-reduced-motion: reduce` the popover only fades in and out over 150ms.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Do not switch the popover to modal to get outside-press dismissal. Modal popovers lock page scroll and shift sticky layout; dismissal comes from the capture-phase `pointerdown` listener instead.
- Do not drop the trigger toggle. Without `useTriggerToggle`, pressing the trigger of an open popover closes it on the outside press and immediately reopens it.
- Do not put the transform origin at the centre. `origin-(--trigger-anchor-point)` is what makes it grow from the trigger after a flip.
- Do not hard-code the caret to one side. The arrow must read `placement` from `OverlayArrow` because React Aria can flip the popover when there is no room.

## Notes

- A standalone `Popover` (outside `PopoverTrigger`, positioned with `triggerRef` and `isOpen`) keeps React Aria's own modal dismissal, because `isNonModal` is only set when the context exists.
- The caret geometry is shared with Tooltip through the exported `TOOLTIP_CARETS` map, so both overlays draw the same arrow.

## Definition of done

Pressing "Details" grows a 320px popover with a caret out of the button over about 150ms; pressing the button again, clicking anywhere outside, or pressing Escape closes it with the reverse motion and focus returns to the button. The page stays scrollable while it is open. The Share popover opens above its button and flips below when there is no room, with "Copy link" and "Done" inside.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
