import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'notification',
  title: 'Notification',
  category: 'overlay',
  kit: 'boardui',
  tags: ['notification', 'toast', 'alert', 'countdown', 'motion', 'boardui'],
  blurb:
    'Dismissible notification card with status icon or avatar, actions and a pausable countdown bar, stacked in a corner viewport.',
  cost: 'dom',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/notification.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['@remixicon/react@^4.9.0', 'motion@^12.43.0', 'react-aria@^3.53.1'],

  summary:
    'A card for one event (a deploy finished, someone commented, a build failed) with a round status icon or an avatar with presence, a title, timestamp, description, small action buttons and a close button. It can dismiss itself after a set time, showing a 3px countdown bar along its bottom edge that pauses and resumes with the timer. `NotificationViewport` portals a fixed stack to any corner or bottom/top centre, and cards entering or leaving it make the others glide into place on a spring.',

  mechanism: [
    '`Notification` keeps its own `dismissedState`, ORed with the `dismissed` prop, and renders a `motion.div` inside `AnimatePresence onExitComplete={onDismiss}`. Dismissing (close button, timer or `dismissed`) plays the exit (opacity 0, y 8, scale 0.96, `blur(3px)`, 0.18s easeOut) and only then calls `onDismiss`, so the parent removes the item after the card has gone. A ref marks the card dismissed at once: AnimatePresence keeps rendering the exiting element with its old handlers, so a second press of the close button during the exit does nothing instead of firing `onDismissStart` again.',
    'The entrance plays only when `introDelay` is defined: `initial` is opacity 0, y 12, scale 0.97, `blur(4px)`, animating to rest over 0.25s easeOut after `introDelay` seconds. Without it, `initial={false}` renders the card in place.',
    'With `autoDismissDuration`, the countdown bar is a native Web Animation (`element.animate` from `scaleX(1)` to `scaleX(0)`, linear, `fill: "forwards"`, delayed by the intro) on a `h-[3px] bg-accent-600` span anchored `origin-left` (`rtl:origin-right`). A second effect owns the timer: `remaining` starts at duration plus intro delay, and each run plays the bar and sets a timeout for `remaining`. On `paused` it pauses the bar, and its cleanup subtracts the elapsed time, so a held countdown resumes where it stopped.',
    'The card is `relative flex items-start gap-3 overflow-hidden rounded-2xl border p-4 pe-11` on the primary background with `shadow-dropdown`; `pe-11` reserves room for the `xs` `CloseButton` at `top-3 end-3`. The visual is the avatar (36px Avatar forced to `size-10`, plus a 12px presence dot: lime online, rose busy, grey offline) or a 40px round badge with `icon ?? STATUS_ICON[status]` tinted by status. Actions are small Buttons; without a `variant`, the first is secondary and the rest primary.',
    'The card\'s `role` defaults to "alert" for `status="error"` and "status" otherwise, so screen readers announce errors assertively and the rest politely.',
    '`NotificationViewport` waits for hydration (`useSyncExternalStore` returns false on the server), then `createPortal`s a `motion.div layoutRoot` to React Aria\'s portal container (`useUNSAFE_PortalContext().getContainer`) or `document.body`. The layer is `pointer-events-none fixed z-100 w-[min(400px,calc(100vw-24px))] flex-col gap-3`, positioned 12px from the edges (24px from `sm`). Each child is wrapped in a `pointer-events-auto` `motion.div layout`, keyed by the child\'s key, inside `AnimatePresence initial={false} mode="popLayout"`, with a layout spring of stiffness 520, damping 42 and mass 0.7.',
  ],

  constants: [
    {
      name: 'layout spring',
      value: 'stiffness 520, damping 42, mass 0.7',
      why: 'Quick and almost without overshoot, so the rest of the stack closes the gap promptly when a card leaves without bouncing.',
    },
    {
      name: 'enter / exit',
      value: 'enter 0.25s: y 12, scale 0.97, blur 4px / exit 0.18s: y 8, scale 0.96, blur 3px',
      why: 'The exit is shorter than the entrance so a dismissed card gets out of the way faster than a new one arrives.',
    },
    {
      name: 'countdown bar',
      value: '3px, bg-accent-600, linear',
      why: 'Linear makes the bar\'s length a true reading of the time left; 3px is visible along the bottom edge without crowding the actions.',
    },
    {
      name: 'viewport width and inset',
      value: 'w-[min(400px,calc(100vw-24px))], 12px inset (24px from sm)',
      why: 'A comfortable width for a title, two-line description and actions, while keeping a 12px gutter on each side of a phone.',
    },
    {
      name: 'z-index',
      value: 'z-100',
      why: 'The overlay layer shared with Modal and Drawer, so notifications sit above page content.',
    },
  ],

  pitfalls: [
    'Do not drive the countdown bar with Motion\'s standalone `animate()`. On this child it cancelled the card\'s own enter animation; a native Web Animation can be paused and played in step with the timer.',
    'Do not remove a card from your list to dismiss it. Set `dismissed` (or let the timer or close button do it) and remove it in `onDismiss`, or it vanishes without its exit animation.',
    'Do not leave out `introDelay` and expect an entrance. Without it `initial` is `false`; pass `introDelay={0}` for cards that arrive while the page is open.',
    'Do not key the viewport\'s children by array index. The wrapper falls back to the index when a child has no key, so removing a card from the middle would animate the wrong ones.',
  ],

  notes: [
    '`paused` is meant for a stack held by hover or focus; the demo sets it from `onPointerEnter` / `onPointerLeave` on the viewport.',
    '`position` accepts logical (`top-start`, `bottom-end`) and physical (`top-left`, `bottom-center`, …) corners; `placement` is a deprecated alias for the two bottom corners.',
    'The viewport defaults to `aria-label="Notifications"` and `position="bottom-end"`.',
  ],

  apiSignature:
    'function Notification(props: Omit<HTMLAttributes<HTMLDivElement>, "title" | "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart" | "onAnimationEnd"> & { title: ReactNode; description?: ReactNode; timestamp?: ReactNode; status?: "neutral" | "information" | "success" | "error"; icon?: IconComponent; avatar?: Omit<AvatarProps, "size"> & { presence?: "online" | "busy" | "offline" }; actions?: { label: ReactNode; onClick?: () => void; variant?: ButtonProps["variant"] }[]; dismissible?: boolean; closeLabel?: string; onDismiss?: () => void; onDismissStart?: () => void; autoDismissDuration?: number; paused?: boolean; dismissed?: boolean; introDelay?: number; ref?: Ref<HTMLDivElement> }): JSX.Element\nfunction NotificationViewport(props: HTMLAttributes<HTMLDivElement> & { children?: ReactNode; position?: NotificationPosition; placement?: "bottom-left" | "bottom-right" }): ReactPortal | null',

  props: [
    { name: 'title / description / timestamp', type: 'ReactNode', description: 'The card\'s copy; the timestamp sits after the title.' },
    { name: 'status', type: '"neutral" | "information" | "success" | "error"', default: '"neutral"', description: 'Badge tint and default icon; "error" also makes the card an alert.' },
    { name: 'icon', type: 'IconComponent', description: 'Replaces the status icon.' },
    { name: 'avatar', type: 'AvatarProps & { presence?: "online" | "busy" | "offline" }', description: 'Shown instead of the icon, with an optional presence dot.' },
    { name: 'actions', type: '{ label; onClick?; variant? }[]', description: 'Small buttons under the message; first secondary, others primary by default.' },
    { name: 'dismissible / closeLabel', type: 'boolean / string', default: 'true / "Dismiss notification"', description: 'Show the close button and name it.' },
    { name: 'autoDismissDuration', type: 'number (ms)', description: 'Dismiss after this long, with the countdown bar.' },
    { name: 'paused', type: 'boolean', default: 'false', description: 'Hold the countdown and its bar.' },
    { name: 'dismissed', type: 'boolean', default: 'false', description: 'Dismiss from outside; the exit plays, then `onDismiss` runs.' },
    { name: 'introDelay', type: 'number (s)', description: 'Enables the entrance animation, after this delay.' },
    { name: 'onDismiss', type: '() => void', description: 'Called after the exit animation completes.' },
    { name: 'onDismissStart', type: '() => void', description: 'Called once when the card closes itself (close button or countdown), as the exit starts.' },
    { name: 'NotificationViewport.position', type: 'NotificationPosition', default: '"bottom-end"', description: 'Corner or centre edge the stack is anchored to.' },
  ],

  reducedMotion:
    'The component does not read `prefers-reduced-motion`: the 0.25s entrance, the 0.18s exit and the layout spring run regardless. A host can wrap the app in Motion\'s `MotionConfig reducedMotion="user"`. The countdown bar also runs, since it shows how much time is left.',

  cleanup:
    'The countdown Web Animation is cancelled and the dismiss timeout cleared by their effect cleanups (the timer cleanup also banks the elapsed time). The viewport portal unmounts with its owner.',

  acceptance:
    'Nothing shows until a button is pressed. "Deploy finished" brings a green success card into the bottom-right stack with a blue bar shrinking over 5 seconds; hovering the stack holds the bar, leaving resumes it, and at the end the card blurs out while the others glide into place. "New comment" shows the LS avatar with a green presence dot and Mark read / Reply buttons, either of which closes the card. "Build failed" is announced as an alert. The position control moves the stack to the top or bottom centre, and a fifth card pushes the oldest out with its exit animation.',

  criticalRegion: 'critical',
};

export default meta;
