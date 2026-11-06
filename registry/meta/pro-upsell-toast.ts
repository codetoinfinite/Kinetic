/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Pro Upsell Toast" (boardui.com/templates/ai-image-generation).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'pro-upsell-toast',
  title: 'Pro Upsell Toast',
  category: 'overlay',
  kit: 'boardui',
  tags: ['upsell', 'toast', 'paywall', 'dialog', 'pricing', 'boardui'],
  blurb:
    'A floating Upgrade-to-Pro card with a grainy pastel wash, app tile, dismiss and a full-width CTA; it rises in and returns focus on close.',
  cost: 'dom',
  motif: 'noise',

  files: [
    {
      path: 'registry/ui/pro-upsell-toast.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['motion@^12.43.0'],

  summary:
    'The card that appears when someone reaches for a paid feature, such as installing a Pro template. A 300px white card floats in the corner with a soft wash of blue and pink light across its top, a brushed-metal app tile, a title, one line of copy, a full-width "Get Pro" button and a round dismiss button. It is controlled with `isOpen`, rises in from the corner, closes on the dismiss button or Escape and hands focus back to the control that opened it.',

  mechanism: [
    'The card is a `motion.div` inside `AnimatePresence`, so it can play an exit before it unmounts. It enters from 16px lower at 96% scale over 340ms on an ease-out curve (0.16, 1, 0.3, 1) with its transform origin at the bottom, and leaves 8px down at 98% over 160ms.',
    'It is a non-modal `role="dialog"` named by its title and described by its copy. When it opens with `autoFocus`, an effect remembers `document.activeElement` and focuses the card itself (`tabIndex={-1}`), so a screen reader reads the title and copy and the next Tab reaches the button. Nothing else on the page is blocked.',
    'When `isOpen` turns false the card is still in the DOM for its exit animation, so the same effect can check whether focus is inside it. If it is, focus goes back to the remembered element; if the user had already moved on, focus is left where it is.',
    'Escape is handled by a `keydown` on the card, not on the window, so it only closes the toast while focus is inside it and never fights a modal or menu elsewhere on the page. The dismiss button and Escape both call `onOpenChange(false)`; the call to action calls `onCta` and leaves closing to the parent.',
    'The wash is inline SVG: five blurred vertical ellipses in pastel blue, violet and pink, a fractal-noise grain at 12% and a gradient mask that fades the lot out by the middle of the card. It is stretched with `preserveAspectRatio="none"` and drops to 55% opacity in dark mode so it glows instead of glaring.',
  ],

  constants: [
    {
      name: 'card',
      value: '300px wide (never wider than the container minus 2rem), radius 24px, 16px padding, 16px from the corner',
      why: 'Wide enough for the title on one line and the copy on two, narrow enough to leave the page usable beside it on a laptop.',
    },
    {
      name: 'enter',
      value: '340ms, y 16 → 0, scale 0.96 → 1, ease (0.16, 1, 0.3, 1)',
      why: 'A fast start with a long settle reads as the card arriving from the corner without bouncing; the small scale keeps the motion near the corner it grows from.',
    },
    {
      name: 'exit',
      value: '160ms, y +8, scale 0.98, ease-in',
      why: 'Leaving is half the length of arriving, so dismissing feels immediate and the page underneath is usable again at once.',
    },
    {
      name: 'wash',
      value: 'blur 12, grain 12%, faded to transparent by 100% of a 112px band; 55% in dark mode',
      why: 'Enough colour to mark the card as special, kept above the text so the copy sits on plain white.',
    },
  ],

  pitfalls: [
    'Clearing the remembered element or skipping the focus return when the parent closes the toast. Keyboard users are left on `<body>` at the top of the page. The effect returns focus whenever the card closes with focus inside it, whoever closed it.',
    'Listening for Escape on `window`. It would close the toast while a modal or a select popover is open, and one keypress would close both. The listener lives on the card.',
    'Making it a modal or trapping focus. An upsell is optional; a trap turns a suggestion into a wall. Use `autoFocus={false}` when the card appears on its own, so it does not steal focus from someone typing.',
    'Placing it `fixed` inside a transformed parent. The parent becomes the containing block and the card lands in the wrong place. Render it near the root, or pass `absolute` to pin it inside a positioned frame as the demo does.',
  ],

  notes: [
    'Pass `icon` to swap the default tile for your product mark, and `title`, `description` and `ctaLabel` for your own plan.',
    'For several toasts at once use the kit Toaster; this card is a single, specific prompt.',
  ],

  apiSignature:
    'function ProUpsellToast(props: ProUpsellToastProps): JSX.Element\ninterface ProUpsellToastProps { isOpen: boolean; onOpenChange?: (isOpen: boolean) => void; title?: ReactNode; description?: ReactNode; ctaLabel?: ReactNode; onCta?: () => void; icon?: ReactNode; autoFocus?: boolean; className?: string }',

  props: [
    { name: 'isOpen', type: 'boolean', description: 'Shows the card. It animates in and out on change.' },
    { name: 'onOpenChange', type: '(isOpen: boolean) => void', description: 'Called with false by the dismiss button and by Escape.' },
    { name: 'title', type: 'ReactNode', default: '"This template is part of Pro"', description: 'Dialog title.' },
    { name: 'description', type: 'ReactNode', default: '"Buy once and install the full source with the CLI."', description: 'One line under the title; also the dialog description.' },
    { name: 'ctaLabel', type: 'ReactNode', default: '"Get Pro"', description: 'Label of the full-width button.' },
    { name: 'onCta', type: '() => void', description: 'Called by the button. Close the card yourself if the action leaves the page state.' },
    { name: 'icon', type: 'ReactNode', description: 'Replaces the default metal Pro tile.' },
    { name: 'autoFocus', type: 'boolean', default: 'true', description: 'Focus the card when it opens and return focus when it closes.' },
    { name: 'className', type: 'string', description: 'Merged onto the card; the default placement is `fixed end-4 bottom-4 z-50`.' },
  ],

  reducedMotion:
    'With prefers-reduced-motion the card does not move or scale: it fades in over 150ms and out over 120ms. The wash and tile are static in every mode.',

  cleanup:
    'There are no timers or global listeners. The Escape handler is a React `onKeyDown` on the card, the focus effect only reads and moves focus, and motion stops the exit animation if the component unmounts mid-way.',

  acceptance:
    'Nothing floats at first. "Install template" opens a 300px card in the bottom-right corner of the frame that rises in with a blue-and-pink grainy glow across its top, a metal tile, "This template is part of Pro", "Buy once and install the full source with the CLI." and a blue "Get Pro" button. Focus lands on the card; Tab reaches Get Pro and then the round dismiss button. Escape or the dismiss button lowers it away and the status reads "Dismissed", with focus back on "Install template". Get Pro closes it and the status reads "Checkout opened".',

  criticalRegion: 'critical',
};

export default meta;
