import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'announcement',
  title: 'Announcement',
  category: 'display',
  kit: 'boardui',
  tags: ['announcement', 'banner', 'onboarding', 'dismissible', 'sidebar', 'motion', 'boardui'],
  blurb:
    'A compact sidebar card with an icon, title, note and full-width call to action that blurs and shrinks away when dismissed.',
  cost: 'dom',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/announcement.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['@remixicon/react@^4.9.0', 'motion@^12.43.0'],

  summary:
    'An onboarding or "what\'s new" card sized for the 260px sidebar footer: a 20px icon, a title, an optional description and an optional full-width secondary button. Dismissal is managed inside the card. The close button plays a 250ms blur, fade and scale-down exit, then the card unmounts and `onClose` fires. An opt-in `introDelay` plays the reverse as an entrance once the surrounding UI has settled.',

  mechanism: [
    'The card is a `motion.div` inside `AnimatePresence`, rendered while a local `dismissed` flag is false. The close button sets the flag, `AnimatePresence` keeps the node mounted for its `exit` animation, and `onExitComplete={onClose}` calls the consumer only after the card has actually left.',
    'The exit animates `opacity: 0`, `scale: 0.85` and `filter: "blur(6px)"` over 0.25s with `easeInOut`. Blur together with scale reads as the card receding rather than being cut out.',
    '`introDelay` turns on the entrance. With it set, `initial` is `{ opacity: 0, y: 15, scale: 0.85, filter: "blur(6px)" }` and `animate` returns everything to rest over 0.25s `easeOut`, starting after `introDelay` seconds. Without it, `initial={false}` and `animate={undefined}`, so the card renders in its final state on the first frame with no animation work.',
    'The layout follows the Figma frame: a `flex-col gap-3 p-3` card with `rounded-xl`, a 1px `border-border-button-default` and `bg-background-primary-default`, and no shadow. Inside it a `gap-1` column holds the 20px icon (`text-foreground-icon-secondary`) and a `gap-0.5` text block with the title in `text-body-medium text-text-primary` and the description in `text-body-2-medium text-text-secondary`. That totals 150px with every part present.',
    'The close control is the kit\'s `CloseButton` at `size="xs"` (a 20px round button), absolutely placed at `end-3 top-3` so it mirrors in RTL. It takes `aria-label={closeLabel}`, which defaults to "Dismiss".',
    'The action is a `Button` with `variant="secondary"`, `size="small"` and `className="w-full"`, rendered only when `actionLabel` is set. It calls `onAction` directly and does not dismiss the card. Leaving out `description`, `actionLabel` or `dismissible` removes that part and the card shrinks to fit.',
  ],

  constants: [
    {
      name: 'exit',
      value: 'scale 0.85, blur 6px, opacity 0 over 0.25s easeInOut',
      why: 'The card leaves visibly without dragging. At 0.85 the shrink reads as dismissal rather than a glitch, and the 6px blur hides the hard edge as it fades so the card never looks clipped.',
    },
    {
      name: 'entrance',
      value: 'y 15px, scale 0.85, blur 6px → rest over 0.25s easeOut, after introDelay',
      why: 'The mirror of the exit plus a small rise from below, so the card arrives from where the eye is not looking yet. `easeOut` lands it softly. The delay lets the sidebar settle first so the card draws attention on its own.',
    },
    {
      name: 'card metrics',
      value: 'p-3, gap-3, rounded-xl, 20px icon, 150px tall',
      why: 'Taken 1:1 from the Figma "Event card": 12 + 20 + 4 + (20 + 2 + 36) + 12 + 32 + 12 = 150. It fills its container (236px inside the 260px sidebar) instead of fixing a width.',
    },
  ],

  pitfalls: [
    'Unmounting the card yourself on close. The card owns its `dismissed` state. If the parent removes it immediately, `AnimatePresence` goes with it and the exit never plays. Listen to `onClose`, which fires after the exit finishes.',
    'Passing an icon element (`icon={<RiSparklingFill />}`). The prop takes the component and renders it at `size-5` with `aria-hidden`.',
    'Expecting the action button to dismiss the card. `onAction` only runs your handler. Hide the card from `onAction` yourself, for example by changing its `key` or rendering it conditionally after your own exit.',
    'Setting `introDelay={0}` and expecting no animation. Any number, including 0, turns the entrance on. Leave the prop out entirely for a card that simply appears.',
  ],

  notes: [
    'The card is uncontrolled. To show it again after a dismissal, remount it with a new `key`.',
    'The component does not read the reduced-motion preference itself. In an app wrapped in `<MotionConfig reducedMotion="user">`, Motion drops the scale and `y` transforms and keeps the opacity and blur fades.',
  ],

  apiSignature:
    'function Announcement(props: Omit<HTMLAttributes<HTMLDivElement>, "title" | "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart" | "onAnimationEnd"> & { title: ReactNode; description?: ReactNode; icon?: IconComponent; actionLabel?: ReactNode; onAction?: () => void; dismissible?: boolean; onClose?: () => void; closeLabel?: string; introDelay?: number; ref?: Ref<HTMLDivElement> }): JSX.Element',

  props: [
    { name: 'title', type: 'ReactNode', description: 'Required headline, set in Body 1 Medium (14/20).' },
    { name: 'description', type: 'ReactNode', description: 'Supporting line in Body 2 Medium (13/18). Omit for a title-only card.' },
    { name: 'icon', type: 'ComponentType<{ className?: string }>', default: 'RiShieldStarFill', description: 'Leading icon component, drawn at 20px.' },
    { name: 'actionLabel', type: 'ReactNode', description: 'Label for the full-width secondary button. No button is rendered without it.' },
    { name: 'onAction', type: '() => void', description: 'Click handler for the action button. Does not dismiss the card.' },
    { name: 'dismissible', type: 'boolean', default: 'false', description: 'Shows the 20px close button in the top-end corner.' },
    { name: 'onClose', type: '() => void', description: 'Called once, after the exit animation finishes.' },
    { name: 'closeLabel', type: 'string', default: '"Dismiss"', description: 'Accessible name of the close button.' },
    { name: 'introDelay', type: 'number', description: 'Seconds before the entrance plays. Leave it out to skip the entrance.' },
  ],

  reducedMotion:
    'There is no reduced-motion branch in the component, and Motion\'s default `reducedMotion` is `"never"`, so the 250ms exit (and the entrance, when enabled) plays as written. Under `<MotionConfig reducedMotion="user">` Motion removes the scale and `y` transforms and keeps the short opacity and blur fades.',

  cleanup:
    'Nothing to release by hand. Motion stops any running entrance or exit animation when the card unmounts, and the component adds no listeners or timers of its own.',

  acceptance:
    'Inside a 260px sidebar the card fills the column, shows the icon, title, description and a full-width "See what\'s new" button, and with a two-line description it is 150px tall. Clicking the close button blurs and shrinks the card away in about a quarter of a second, and `onClose` fires once the card is gone. Clicking the action runs `onAction` and leaves the card in place. A remount with `introDelay={0.1}` rises in from 15px below while un-blurring.',

  criticalRegion: 'critical',
};

export default meta;
