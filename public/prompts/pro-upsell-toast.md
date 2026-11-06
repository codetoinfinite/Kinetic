# Build: Pro Upsell Toast

The card that appears when someone reaches for a paid feature, such as installing a Pro template. A 300px white card floats in the corner with a soft wash of blue and pink light across its top, a brushed-metal app tile, a title, one line of copy, a full-width "Get Pro" button and a round dismiss button. It is controlled with `isOpen`, rises in from the corner, closes on the dismiss button or Escape and hands focus back to the control that opened it.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A floating Upgrade-to-Pro card with a grainy pastel wash, app tile, dismiss and a full-width CTA; it rises in and returns focus on close.

- Category: overlay
- Runtime cost: dom
- Dependencies: motion@^12.43.0

## How it works

1. The card is a `motion.div` inside `AnimatePresence`, so it can play an exit before it unmounts. It enters from 16px lower at 96% scale over 340ms on an ease-out curve (0.16, 1, 0.3, 1) with its transform origin at the bottom, and leaves 8px down at 98% over 160ms.
2. It is a non-modal `role="dialog"` named by its title and described by its copy. When it opens with `autoFocus`, an effect remembers `document.activeElement` and focuses the card itself (`tabIndex={-1}`), so a screen reader reads the title and copy and the next Tab reaches the button. Nothing else on the page is blocked.
3. When `isOpen` turns false the card is still in the DOM for its exit animation, so the same effect can check whether focus is inside it. If it is, focus goes back to the remembered element; if the user had already moved on, focus is left where it is.
4. Escape is handled by a `keydown` on the card, not on the window, so it only closes the toast while focus is inside it and never fights a modal or menu elsewhere on the page. The dismiss button and Escape both call `onOpenChange(false)`; the call to action calls `onCta` and leaves closing to the parent.
5. The wash is inline SVG: five blurred vertical ellipses in pastel blue, violet and pink, a fractal-noise grain at 12% and a gradient mask that fades the lot out by the middle of the card. It is stretched with `preserveAspectRatio="none"` and drops to 55% opacity in dark mode so it glows instead of glaring.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `card = 300px wide (never wider than the container minus 2rem), radius 24px, 16px padding, 16px from the corner`
  Wide enough for the title on one line and the copy on two, narrow enough to leave the page usable beside it on a laptop.
- `enter = 340ms, y 16 → 0, scale 0.96 → 1, ease (0.16, 1, 0.3, 1)`
  A fast start with a long settle reads as the card arriving from the corner without bouncing; the small scale keeps the motion near the corner it grows from.
- `exit = 160ms, y +8, scale 0.98, ease-in`
  Leaving is half the length of arriving, so dismissing feels immediate and the page underneath is usable again at once.
- `wash = blur 12, grain 12%, faded to transparent by 100% of a 112px band; 55% in dark mode`
  Enough colour to mark the card as special, kept above the text so the copy sits on plain white.

## API

```ts
function ProUpsellToast(props: ProUpsellToastProps): JSX.Element
interface ProUpsellToastProps { isOpen: boolean; onOpenChange?: (isOpen: boolean) => void; title?: ReactNode; description?: ReactNode; ctaLabel?: ReactNode; onCta?: () => void; icon?: ReactNode; autoFocus?: boolean; className?: string }
```

- `isOpen: boolean`
  Shows the card. It animates in and out on change.
- `onOpenChange: (isOpen: boolean) => void`
  Called with false by the dismiss button and by Escape.
- `title: ReactNode` — default `"This template is part of Pro"`
  Dialog title.
- `description: ReactNode` — default `"Buy once and install the full source with the CLI."`
  One line under the title; also the dialog description.
- `ctaLabel: ReactNode` — default `"Get Pro"`
  Label of the full-width button.
- `onCta: () => void`
  Called by the button. Close the card yourself if the action leaves the page state.
- `icon: ReactNode`
  Replaces the default metal Pro tile.
- `autoFocus: boolean` — default `true`
  Focus the card when it opens and return focus when it closes.
- `className: string`
  Merged onto the card; the default placement is `fixed end-4 bottom-4 z-50`.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function ProUpsellToast({
  isOpen,
  onOpenChange,
  title = "This template is part of Pro",
  description = "Buy once and install the full source with the CLI.",
  ctaLabel = "Get Pro",
  onCta,
  icon,
  autoFocus = true,
  className,
}: ProUpsellToastProps) {
  const reduced = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (isOpen) {
      if (!autoFocus) return;
      const active = document.activeElement;
      returnTo.current = active instanceof HTMLElement ? active : null;
      cardRef.current?.focus({ preventScroll: true });
      return;
    }
    // The card is still mounted while it animates out, so this sees where
    // focus is. Only pull it back if it was inside the card.
    if (cardRef.current?.contains(document.activeElement)) returnTo.current?.focus({ preventScroll: true });
    returnTo.current = null;
  }, [isOpen, autoFocus]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Escape") return;
    event.stopPropagation();
    onOpenChange?.(false);
  };

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          key="pro-upsell-toast"
          ref={cardRef}
          role="dialog"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          tabIndex={-1}
          onKeyDown={onKeyDown}
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96 }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
            transition: reduced ? { duration: 0.15 } : { duration: 0.34, ease: ENTER_EASE },
          }}
          exit={
            reduced
              ? { opacity: 0, transition: { duration: 0.12 } }
              : { opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.16, ease: EXIT_EASE } }
          }
          className={cx(
            "fixed end-4 bottom-4 z-50 w-[min(300px,calc(100%-2rem))] origin-bottom overflow-hidden",
            "rounded-3xl bg-background-primary-default p-4 shadow-lg ring-1 ring-border-ai-profile-card outline-none",
            "focus-visible:ring-2 focus-visible:ring-border-focus-ring",
            className,
          )}
        >
          <ProWash className="pointer-events-none absolute inset-x-0 top-0 h-28 w-full dark:opacity-55" />

          <div className="relative flex flex-col">
            <span className="mb-4 flex">{icon ?? <ProTile />}</span>
            <h2 id={titleId} className="pe-8 text-body-medium text-text-primary">
              {title}
            </h2>
            <p id={descriptionId} className="mt-1 text-body-2-regular text-text-secondary">
              {description}
            </p>
            <Button variant="primary" size="medium" className="mt-4 w-full justify-center" onClick={onCta}>
              {ctaLabel}
            </Button>
          </div>

          <CloseButton
            size="sm"
            aria-label="Dismiss"
            onClick={() => onOpenChange?.(false)}
            className="absolute end-3 top-3 dark:bg-background-quaternary-default"
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** There are no timers or global listeners. The Escape handler is a React `onKeyDown` on the card, the focus effect only reads and moves focus, and motion stops the exit animation if the component unmounts mid-way.

**Reduced motion.** With prefers-reduced-motion the card does not move or scale: it fades in over 150ms and out over 120ms. The wash and tile are static in every mode.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Clearing the remembered element or skipping the focus return when the parent closes the toast. Keyboard users are left on `<body>` at the top of the page. The effect returns focus whenever the card closes with focus inside it, whoever closed it.
- Listening for Escape on `window`. It would close the toast while a modal or a select popover is open, and one keypress would close both. The listener lives on the card.
- Making it a modal or trapping focus. An upsell is optional; a trap turns a suggestion into a wall. Use `autoFocus={false}` when the card appears on its own, so it does not steal focus from someone typing.
- Placing it `fixed` inside a transformed parent. The parent becomes the containing block and the card lands in the wrong place. Render it near the root, or pass `absolute` to pin it inside a positioned frame as the demo does.

## Notes

- Pass `icon` to swap the default tile for your product mark, and `title`, `description` and `ctaLabel` for your own plan.
- For several toasts at once use the kit Toaster; this card is a single, specific prompt.

## Definition of done

Nothing floats at first. "Install template" opens a 300px card in the bottom-right corner of the frame that rises in with a blue-and-pink grainy glow across its top, a metal tile, "This template is part of Pro", "Buy once and install the full source with the CLI." and a blue "Get Pro" button. Focus lands on the card; Tab reaches Get Pro and then the round dismiss button. Escape or the dismiss button lowers it away and the status reads "Dismissed", with focus back on "Install template". Get Pro closes it and the status reads "Checkout opened".

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
