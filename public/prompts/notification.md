# Build: Notification

A card for one event (a deploy finished, someone commented, a build failed) with a round status icon or an avatar with presence, a title, timestamp, description, small action buttons and a close button. It can dismiss itself after a set time, showing a 3px countdown bar along its bottom edge that pauses and resumes with the timer. `NotificationViewport` portals a fixed stack to any corner or bottom/top centre, and cards entering or leaving it make the others glide into place on a spring.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Dismissible notification card with status icon or avatar, actions and a pausable countdown bar, stacked in a corner viewport.

- Category: overlay
- Runtime cost: dom
- Dependencies: @remixicon/react@^4.9.0, motion@^12.43.0, react-aria@^3.53.1

## How it works

1. `Notification` keeps its own `dismissedState`, ORed with the `dismissed` prop, and renders a `motion.div` inside `AnimatePresence onExitComplete={onDismiss}`. Dismissing (close button, timer or `dismissed`) plays the exit (opacity 0, y 8, scale 0.96, `blur(3px)`, 0.18s easeOut) and only then calls `onDismiss`, so the parent removes the item after the card has gone. A ref marks the card dismissed at once: AnimatePresence keeps rendering the exiting element with its old handlers, so a second press of the close button during the exit does nothing instead of firing `onDismissStart` again.
2. The entrance plays only when `introDelay` is defined: `initial` is opacity 0, y 12, scale 0.97, `blur(4px)`, animating to rest over 0.25s easeOut after `introDelay` seconds. Without it, `initial={false}` renders the card in place.
3. With `autoDismissDuration`, the countdown bar is a native Web Animation (`element.animate` from `scaleX(1)` to `scaleX(0)`, linear, `fill: "forwards"`, delayed by the intro) on a `h-[3px] bg-accent-600` span anchored `origin-left` (`rtl:origin-right`). A second effect owns the timer: `remaining` starts at duration plus intro delay, and each run plays the bar and sets a timeout for `remaining`. On `paused` it pauses the bar, and its cleanup subtracts the elapsed time, so a held countdown resumes where it stopped.
4. The card is `relative flex items-start gap-3 overflow-hidden rounded-2xl border p-4 pe-11` on the primary background with `shadow-dropdown`; `pe-11` reserves room for the `xs` `CloseButton` at `top-3 end-3`. The visual is the avatar (36px Avatar forced to `size-10`, plus a 12px presence dot: lime online, rose busy, grey offline) or a 40px round badge with `icon ?? STATUS_ICON[status]` tinted by status. Actions are small Buttons; without a `variant`, the first is secondary and the rest primary.
5. The card's `role` defaults to "alert" for `status="error"` and "status" otherwise, so screen readers announce errors assertively and the rest politely.
6. `NotificationViewport` waits for hydration (`useSyncExternalStore` returns false on the server), then `createPortal`s a `motion.div layoutRoot` to React Aria's portal container (`useUNSAFE_PortalContext().getContainer`) or `document.body`. The layer is `pointer-events-none fixed z-100 w-[min(400px,calc(100vw-24px))] flex-col gap-3`, positioned 12px from the edges (24px from `sm`). Each child is wrapped in a `pointer-events-auto` `motion.div layout`, keyed by the child's key, inside `AnimatePresence initial={false} mode="popLayout"`, with a layout spring of stiffness 520, damping 42 and mass 0.7.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `layout spring = stiffness 520, damping 42, mass 0.7`
  Quick and almost without overshoot, so the rest of the stack closes the gap promptly when a card leaves without bouncing.
- `enter / exit = enter 0.25s: y 12, scale 0.97, blur 4px / exit 0.18s: y 8, scale 0.96, blur 3px`
  The exit is shorter than the entrance so a dismissed card gets out of the way faster than a new one arrives.
- `countdown bar = 3px, bg-accent-600, linear`
  Linear makes the bar's length a true reading of the time left; 3px is visible along the bottom edge without crowding the actions.
- `viewport width and inset = w-[min(400px,calc(100vw-24px))], 12px inset (24px from sm)`
  A comfortable width for a title, two-line description and actions, while keeping a 12px gutter on each side of a phone.
- `z-index = z-100`
  The overlay layer shared with Modal and Drawer, so notifications sit above page content.

## API

```ts
function Notification(props: Omit<HTMLAttributes<HTMLDivElement>, "title" | "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart" | "onAnimationEnd"> & { title: ReactNode; description?: ReactNode; timestamp?: ReactNode; status?: "neutral" | "information" | "success" | "error"; icon?: IconComponent; avatar?: Omit<AvatarProps, "size"> & { presence?: "online" | "busy" | "offline" }; actions?: { label: ReactNode; onClick?: () => void; variant?: ButtonProps["variant"] }[]; dismissible?: boolean; closeLabel?: string; onDismiss?: () => void; onDismissStart?: () => void; autoDismissDuration?: number; paused?: boolean; dismissed?: boolean; introDelay?: number; ref?: Ref<HTMLDivElement> }): JSX.Element
function NotificationViewport(props: HTMLAttributes<HTMLDivElement> & { children?: ReactNode; position?: NotificationPosition; placement?: "bottom-left" | "bottom-right" }): ReactPortal | null
```

- `title / description / timestamp: ReactNode`
  The card's copy; the timestamp sits after the title.
- `status: "neutral" | "information" | "success" | "error"` — default `"neutral"`
  Badge tint and default icon; "error" also makes the card an alert.
- `icon: IconComponent`
  Replaces the status icon.
- `avatar: AvatarProps & { presence?: "online" | "busy" | "offline" }`
  Shown instead of the icon, with an optional presence dot.
- `actions: { label; onClick?; variant? }[]`
  Small buttons under the message; first secondary, others primary by default.
- `dismissible / closeLabel: boolean / string` — default `true / "Dismiss notification"`
  Show the close button and name it.
- `autoDismissDuration: number (ms)`
  Dismiss after this long, with the countdown bar.
- `paused: boolean` — default `false`
  Hold the countdown and its bar.
- `dismissed: boolean` — default `false`
  Dismiss from outside; the exit plays, then `onDismiss` runs.
- `introDelay: number (s)`
  Enables the entrance animation, after this delay.
- `onDismiss: () => void`
  Called after the exit animation completes.
- `onDismissStart: () => void`
  Called once when the card closes itself (close button or countdown), as the exit starts.
- `NotificationViewport.position: NotificationPosition` — default `"bottom-end"`
  Corner or centre edge the stack is anchored to.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function Notification({
  title,
  description,
  timestamp,
  status = "neutral",
  icon,
  avatar,
  actions,
  dismissible = true,
  closeLabel = "Dismiss notification",
  onDismiss,
  onDismissStart,
  autoDismissDuration,
  paused = false,
  dismissed: dismissedProp = false,
  introDelay,
  className,
  ref,
  role,
  ...props
}: NotificationProps) {
  const [dismissedState, setDismissed] = useState(false);
  const dismissed = dismissedProp || dismissedState;
  // The countdown can fire long after the render that scheduled it, so it
  // reads the latest callback.
  const onDismissStartRef = useRef(onDismissStart);
  useEffect(() => {
    onDismissStartRef.current = onDismissStart;
  });
  // While a card exits, AnimatePresence keeps rendering its last element,
  // whose close button still holds this handler. The ref makes a second press
  // (or the countdown) during the exit a no-op instead of a second
  // onDismissStart.
  const dismissedRef = useRef(dismissed);
  useEffect(() => {
    dismissedRef.current = dismissed;
  });
  const dismiss = () => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    setDismissed(true);
    onDismissStartRef.current?.();
  };
  const Icon = icon ?? STATUS_ICON[status];
  const hasIntro = introDelay !== undefined;
  const introDelayMs = (introDelay ?? 0) * 1000;
  const timed = Boolean(autoDismissDuration && autoDismissDuration > 0);

  // The countdown bar runs as one native Web Animation so `paused` can hold
  // and resume it in step with the timer below. (Motion's standalone
  // animate() on this child cancelled the card's own enter animation.)
  const barRef = useRef<HTMLSpanElement>(null);
  const bar = useRef<Animation | null>(null);
  const remaining = useRef((autoDismissDuration ?? 0) + introDelayMs);

  useEffect(() => {
    const element = barRef.current;
    if (!timed || !element) return;
    bar.current = element.animate(
      [{ transform: "scaleX(1)" }, { transform: "scaleX(0)" }],
      { duration: autoDismissDuration, delay: introDelayMs, easing: "linear", fill: "forwards" },
    );
    return () => bar.current?.cancel();
  }, [timed, autoDismissDuration, introDelayMs]);

  useEffect(() => {
    if (!timed || dismissed) return;
    if (paused) {
      bar.current?.pause();
      return;
    }
    bar.current?.play();
    const startedAt = performance.now();
    const timer = window.setTimeout(dismiss, remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current = Math.max(0, remaining.current - (performance.now() - startedAt));
    };
  }, [timed, paused, dismissed]);

  return (
    <AnimatePresence onExitComplete={onDismiss}>
      {!dismissed ? (
        <motion.div
          ref={ref}
          role={role ?? (status === "error" ? "alert" : "status")}
          initial={
            hasIntro
              ? { opacity: 0, y: 12, scale: 0.97, filter: "blur(4px)" }
              : false
          }
          animate={
            hasIntro
              ? {
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  filter: "blur(0px)",
                  transition: {
                    duration: 0.25,
                    delay: introDelay,
                    ease: "easeOut",
                  },
                }
              : undefined
          }
          exit={{
            opacity: 0,
            y: 8,
            scale: 0.96,
            filter: "blur(3px)",
            transition: { duration: 0.18, ease: "easeOut" },
          }}
          className={cx(styles.card, className)}
          {...props}
        >
          {avatar ? (
            <NotificationAvatarVisual {...avatar} />
          ) : (
            <span className={cx(styles.visual, styles.status[status])}>
              <Icon className={styles.icon} aria-hidden />
            </span>
          )}

          <div className={styles.content}>
            <div className={styles.header}>
              <p className={styles.title}>{title}</p>
              {timestamp ? <span className={styles.timestamp}>{timestamp}</span> : null}
            </div>
            {description ? <p className={styles.description}>{description}</p> : null}

            {actions?.length ? (
              <div className={styles.actions}>
                {actions.map((action, index) => (
                  <Button
                    key={index}
                    size="small"
                    variant={action.variant ?? (index === 0 ? "secondary" : "primary")}
                    onClick={action.onClick}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            ) : null}
          </div>

          {dismissible ? (
            <CloseButton
              size="xs"
              aria-label={closeLabel}
              onClick={dismiss}
              className={styles.close}
            />
          ) : null}

          {timed ? (
            <span
              ref={barRef}
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-[3px] origin-left rtl:origin-right bg-accent-600"
            />
          ) : null}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The countdown Web Animation is cancelled and the dismiss timeout cleared by their effect cleanups (the timer cleanup also banks the elapsed time). The viewport portal unmounts with its owner.

**Reduced motion.** The component does not read `prefers-reduced-motion`: the 0.25s entrance, the 0.18s exit and the layout spring run regardless. A host can wrap the app in Motion's `MotionConfig reducedMotion="user"`. The countdown bar also runs, since it shows how much time is left.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Do not drive the countdown bar with Motion's standalone `animate()`. On this child it cancelled the card's own enter animation; a native Web Animation can be paused and played in step with the timer.
- Do not remove a card from your list to dismiss it. Set `dismissed` (or let the timer or close button do it) and remove it in `onDismiss`, or it vanishes without its exit animation.
- Do not leave out `introDelay` and expect an entrance. Without it `initial` is `false`; pass `introDelay={0}` for cards that arrive while the page is open.
- Do not key the viewport's children by array index. The wrapper falls back to the index when a child has no key, so removing a card from the middle would animate the wrong ones.

## Notes

- `paused` is meant for a stack held by hover or focus; the demo sets it from `onPointerEnter` / `onPointerLeave` on the viewport.
- `position` accepts logical (`top-start`, `bottom-end`) and physical (`top-left`, `bottom-center`, …) corners; `placement` is a deprecated alias for the two bottom corners.
- The viewport defaults to `aria-label="Notifications"` and `position="bottom-end"`.

## Definition of done

Nothing shows until a button is pressed. "Deploy finished" brings a green success card into the bottom-right stack with a blue bar shrinking over 5 seconds; hovering the stack holds the bar, leaving resumes it, and at the end the card blurs out while the others glide into place. "New comment" shows the LS avatar with a green presence dot and Mark read / Reply buttons, either of which closes the card. "Build failed" is announced as an alert. The position control moves the stack to the top or bottom centre, and a fifth card pushes the oldest out with its exit animation.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
