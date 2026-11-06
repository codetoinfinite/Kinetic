import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'toast',
  title: 'Toast',
  category: 'overlay',
  kit: 'boardui',
  tags: ['toast', 'notification', 'snackbar', 'imperative', 'boardui'],
  blurb:
    'Imperative toast() with success, error, update and dismiss, drawn by one Toaster as a capped, pausable stack of Notification cards.',
  cost: 'dom',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/toast.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: [],

  summary:
    'Fire-and-forget notifications callable from any event handler: `toast.success("Changes saved")`, `toast.error(...)`, or `toast("Exporting…", { duration: Infinity })` followed by `toast.update(id, ...)`. A single `<Toaster />` near the root draws them as Notification cards in a NotificationViewport, so toasts share its status icons, countdown bar, enter and exit motion and the spring that closes gaps in the stack. It shows at most three at a time, pauses every countdown while the pointer or keyboard focus is inside the stack, and announces new toasts through a polite live region.',

  mechanism: [
    'The store is module state: a `toasts` array of records (`{ ...options, id, title, dismissed, key }`), an id counter starting at 1, a card-key counter and a `Set` of listeners. A generated id skips any id a caller has already given a toast in the store. `show()` replaces the showing (not dismissed) record that has the same id, keeping its `key`, or appends a new record with a new key, then notifies the listeners and returns the id. When the id only belongs to a toast that is leaving, the new toast is appended as a fresh card at the end of the stack and the leaving record stays until its exit finishes, so that card still plays out and its `onDismiss` still fires.',
    '`toast()` calls `show`; `toast.success`, `toast.error` and `toast.info` fix `status` to "success", "error" and "information". `toast.update(id, options)` finds the record if it is still showing (not dismissed), merges the new options over it (the title too, when given) and calls `show` with the same id. `toast.dismiss(id?)` only sets `dismissed` on one record, or on all of them without an id: the card plays its exit, and its `onDismiss` then calls `remove(key)`, which drops that card\'s record (never a newer toast that has taken the same id) and runs the toast\'s own `onDismiss`. A card that closes itself, from its close button or countdown, calls `toast.dismiss(id)` through `onDismissStart`, so the store knows it is leaving.',
    '`Toaster` reads the array with `useSyncExternalStore`. Each Toaster registers a `useId()` in a module-level `owners` list on mount and leaves it on unmount; only `owners[0]` renders (the server snapshot is `false`), so a second Toaster renders nothing and takes over if the first unmounts.',
    'An effect enforces `limit` (default 3): when more records are live than the limit, the oldest ones are marked `dismissed`, so they leave with their exit animation rather than disappearing. A card already leaving is not live, so closing one and firing another does not push out an extra toast.',
    'The owner renders a `NotificationViewport` with `role="region"`, `aria-live="polite"`, `aria-relevant="additions text"` and `z-130` (merged over the viewport\'s `z-100`). Each record becomes a `Notification` keyed `${key}:${timeout}`, with `introDelay={0}` for the entrance, `autoDismissDuration` set only when the duration is finite and above zero, `dismissed` from the record and every action\'s `onClick` wrapped to call `toast.dismiss(id)` after it. Because the duration is part of the key, an update with a new duration remounts the card and restarts its countdown.',
    '`paused` is `hovered || focused`, from pointer enter and leave on the stack and from focus and a blur whose `relatedTarget` is outside it. A toast removed from under the pointer or focus fires neither leave nor blur, so when the stack becomes empty both flags are reset during render, and while `focused` is set, every change to the stack checks on the next frame that focus is still inside it.',
  ],

  constants: [
    {
      name: 'limit',
      value: '3',
      why: 'Enough to see a short burst of toasts together without the stack climbing up the screen; older ones exit to make room.',
    },
    {
      name: 'duration',
      value: '5000ms',
      why: 'Long enough to read a title and a one-line description; `Infinity` (or any non-positive value) keeps a toast until it is closed.',
    },
    {
      name: 'z-index',
      value: 'z-130',
      why: 'Above the modal and drawer layer (z-100), popovers and menus (z-110) and tooltips (z-120), so a toast fired from inside any overlay is never hidden behind it.',
    },
    {
      name: 'card key',
      value: '`${key}:${timeout}`',
      why: 'Keeps a card mounted through an update that leaves the duration alone, while a new duration remounts it so the countdown starts again from the full time. The internal key, not the id, keeps ids 1 and "1" apart.',
    },
  ],

  pitfalls: [
    'Do not combine `duration: Infinity` with `dismissible: false` unless your code later calls `toast.update` or `toast.dismiss` for that id. With no timer and no close button, nothing else can remove it.',
    'Do not pass `duration: 0` to close a toast immediately. Only a finite duration above zero starts a countdown, so 0 keeps the toast until it is closed; use `toast.dismiss(id)`.',
    'Do not call `toast()` during render. It updates the store synchronously, which re-renders the Toaster while another component is rendering; call it from event handlers or effects.',
    'Do not expect `toast.update` to bring back a toast that is leaving. It returns without doing anything once the record is dismissed or gone; call `toast()` with the same id to show it again.',
  ],

  notes: [
    'Toasts live in module state, not in the Toaster. A record is removed by its card\'s `onDismiss`, after the exit animation. A toast dismissed while no Toaster is mounted (or whose Toaster unmounted mid-exit) has no card to finish, so it stays in the store until a Toaster takes over, which removes it at once and fires its `onDismiss`.',
    'Pressing any action also dismisses its toast, so actions do not need to close it themselves.',
    '`toast.update` leaves the toast\'s existing options unless they are overridden; pass `icon: undefined` to go back to the status icon after a custom one.',
  ],

  apiSignature:
    'type ToastId = string | number\ninterface ToastOptions { id?: ToastId; description?: ReactNode; status?: NotificationStatus; icon?: IconComponent; avatar?: NotificationAvatar; actions?: NotificationAction[]; duration?: number; dismissible?: boolean; onDismiss?: () => void }\nfunction toast(title: ReactNode, options?: ToastOptions): ToastId\ntoast.success | toast.error | toast.info: (title: ReactNode, options?: Omit<ToastOptions, "status">) => ToastId\ntoast.update: (id: ToastId, options: ToastOptions & { title?: ReactNode }) => void\ntoast.dismiss: (id?: ToastId) => void\nfunction Toaster(props: { position?: NotificationPosition; limit?: number; duration?: number; "aria-label"?: string; closeLabel?: string; className?: string }): JSX.Element | null',

  props: [
    { name: 'Toaster.position', type: 'NotificationPosition', default: '"bottom-end"', description: 'Edge or corner the stack is anchored to.' },
    { name: 'Toaster.limit', type: 'number', default: '3', description: 'How many toasts show at once; older ones exit as new ones arrive.' },
    { name: 'Toaster.duration', type: 'number (ms)', default: '5000', description: 'Countdown for toasts that do not set their own.' },
    { name: 'Toaster.aria-label / closeLabel', type: 'string', default: '"Notifications" / the card\'s default', description: 'Names of the region and of each close button.' },
    { name: 'id', type: 'ToastId', description: 'Reuse an id to replace a toast that is still showing.' },
    { name: 'description / status / icon / avatar', type: 'ReactNode / NotificationStatus / IconComponent / NotificationAvatar', description: 'Passed straight to the Notification card.' },
    { name: 'actions', type: 'NotificationAction[]', description: 'Small buttons; pressing one runs its `onClick` and dismisses the toast.' },
    { name: 'duration', type: 'number (ms)', default: 'the Toaster\'s', description: '`Infinity`, 0 or less keeps the toast until closed.' },
    { name: 'dismissible', type: 'boolean', default: 'true', description: 'Show the close button.' },
    { name: 'onDismiss', type: '() => void', description: 'Called once the toast has left the screen and the store.' },
  ],

  reducedMotion:
    'Toasts use the Notification card\'s motion, which does not read `prefers-reduced-motion`: the 0.25s entrance, the 0.18s exit and the layout spring run regardless, and a host can wrap the app in Motion\'s `MotionConfig reducedMotion="user"`. The demo\'s loading spinner turns only under `motion-safe:`.',

  cleanup:
    'An unmounting Toaster unsubscribes from the store and removes itself from `owners`, notifying the other Toasters so the next one takes over drawing the stack. Each card\'s countdown and timer are cleaned up by Notification. The demo clears its pending export timer on unmount and dismisses that toast.',

  acceptance:
    'Nothing shows until a button is pressed. "Save" brings a "Changes saved" success card into the bottom-end corner with a countdown bar. "Archive" adds an information card with an Undo button; Undo closes it and fires "Project restored". "Upload" adds an error card, announced as an alert. "Export" shows a spinning "Exporting report…" card with no close button or bar, which about 1.8s later becomes "Report exported" with a 4s countdown. A fourth toast pushes the oldest out with its exit animation, hovering or focusing the stack holds every bar, and "Dismiss all" clears the stack.',

  criticalRegion: 'critical',
};

export default meta;
