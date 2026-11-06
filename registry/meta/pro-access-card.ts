import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'pro-access-card',
  title: 'Pro Access Card',
  category: 'display',
  kit: 'boardui',
  tags: ['docs', 'paywall', 'locked', 'upsell', 'boardui'],
  blurb:
    'Pro-locked component placeholder: metallic lock tile, a blurred inert preview, upsell copy and a get-access action that lifts the veil.',
  cost: 'css',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/pro-access-card.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['@remixicon/react@^4.9.0'],

  summary:
    'The card a docs page shows in place of a paid component. A brushed-metal lock tile, the heading and licence copy sit on top with a "Pro access" pill; below, inside a grey inset, the real preview is rendered blurred and desaturated under a "locked" chip, and a footer carries the upsell line with a get-access button. When `locked` turns false the blur lifts, the chip fades and the footer swaps to your unlocked content.',

  mechanism: [
    'Layout: a rounded-3xl bordered section; the header is a flex row of a lock tile (40px, 56px from `sm`) and a title column; the title has a 14rem flex-basis, so in narrow cards the pill wraps under it instead of squeezing the heading. A `bg-background-secondary-default` inset with 4px padding holds the preview stage (rounded-[20px], primary background) and the footer, which reads as two nested surfaces like the docs install panel.',
    'The veil is the preview wrapper itself: while locked it gets `blur-[6px] saturate-50 opacity-60 scale-[1.03]`, `pointer-events-none select-none`, the `inert` attribute and `aria-hidden`, so the preview cannot be focused, clicked, selected or read out. The slight scale pushes the blurred edge outside the clipped stage so no soft halo shows at the corners.',
    'Unlocking sets the wrapper back to `blur-none` and identity scale/opacity with a 500ms `transition-[filter,opacity,scale]`, while the absolutely positioned lock chip runs a 300ms `transition-[opacity,visibility]` to `invisible opacity-0` so it leaves the tab order and the accessibility tree once faded.',
    'The footer is an `aria-live="polite"` region: locked, it shows the title/description and the action (a `ButtonLink` with `actionHref`, else a `Button`); `pending` swaps the icon for a spinner glyph and sets `aria-disabled` (not `disabled`, so focus stays on the button) and `aria-busy` on the card; unlocked, it renders `unlockedFooter`.',
  ],

  constants: [
    { name: 'veil', value: 'blur 6px, saturate 50%, opacity 60%, scale 1.03', why: 'Enough to hide detail and colour while the silhouette still sells the component; the scale hides the blur halo at the clipped edge.' },
    { name: 'unveil', value: '500ms ease-out (chip 300ms)', why: 'The chip is gone before the preview finishes sharpening, so the reveal reads as one motion.' },
    { name: 'lock tile', value: '56px (40px below sm), rx 14', why: 'Matches the icon tile in the reference header and the card\'s rounded-3xl rhythm.' },
    { name: 'inset', value: 'p-1 (4px), stage radius 20px', why: 'Outer radius 24px minus the 4px inset keeps the nested corners concentric.' },
  ],

  pitfalls: [
    'Blurring a preview that is still interactive. Without `inert` keyboard users tab into invisible-looking controls and screen readers read the hidden component; add `inert` and `aria-hidden` together.',
    'Fading the overlay with opacity only. It stays clickable and announced; pair it with `visibility` in the same transition.',
    'Setting `disabled` on the action while pending. The focused button loses focus to `<body>`; use `aria-disabled` and ignore clicks instead.',
    'Writing `blur-0` to clear the filter in Tailwind v4: it emits nothing. Use `blur-none`.',
  ],

  notes: [
    'The card does not own the licence state: pass `locked` from wherever you check it, and `pending` while an activation request is in flight.',
    'The lock tile colours are fixed SVG artwork (brushed metal reads the same in both themes); pass `icon` to use your own.',
  ],

  apiSignature:
    'function ProAccessCard(props: { title: ReactNode; description?: ReactNode; badge?: ReactNode; unlockedBadge?: ReactNode; icon?: ReactNode; preview?: ReactNode; lockedLabel?: ReactNode; locked?: boolean; footerTitle?: ReactNode; footerDescription?: ReactNode; unlockedFooter?: ReactNode; actionLabel?: ReactNode; actionIcon?: IconComponent; actionHref?: string; onAction?: () => void; pending?: boolean; titleAs?: "h2" | "h3" | "h4"; previewClassName?: string; className?: string }): JSX.Element\nfunction ProLockTile(props: { className?: string }): JSX.Element',

  props: [
    { name: 'title', type: 'ReactNode', description: 'Heading, e.g. "Line Chart Card is a Pro component."; labels the section.' },
    { name: 'description', type: 'ReactNode', description: 'Licence copy under the title.' },
    { name: 'preview', type: 'ReactNode', description: 'The component preview, veiled while locked.' },
    { name: 'locked', type: 'boolean', default: 'true', description: 'Blurs and disables the preview and shows the call to action.' },
    { name: 'pending', type: 'boolean', default: 'false', description: 'Spinner in the action, `aria-disabled`, and `aria-busy` on the card.' },
    { name: 'onAction / actionHref', type: '() => void / string', description: 'Click handler, or a link target that renders the action as an anchor.' },
    { name: 'actionLabel / actionIcon', type: 'ReactNode / IconComponent', default: '"Get access" / RiVipCrown2Line', description: 'Action text and leading icon.' },
    { name: 'badge / unlockedBadge', type: 'ReactNode', default: '"Pro access" / "Unlocked"', description: 'Pill text for each state.' },
    { name: 'lockedLabel', type: 'ReactNode', default: '"Preview locked"', description: 'Chip over the blurred preview.' },
    { name: 'footerTitle / footerDescription', type: 'ReactNode', default: '"This component is included in Pro"', description: 'Upsell copy beside the action.' },
    { name: 'unlockedFooter', type: 'ReactNode', description: 'Replaces the footer once unlocked.' },
    { name: 'icon', type: 'ReactNode', default: '<ProLockTile />', description: 'Header icon.' },
    { name: 'titleAs', type: '"h2" | "h3" | "h4"', default: '"h3"', description: 'Heading level for the title.' },
    { name: 'previewClassName', type: 'string', default: '"p-3 sm:p-6"', description: 'Classes for the preview stage.' },
  ],

  reducedMotion:
    'Every transition (veil filter/opacity/scale, chip fade, pill colour) carries `motion-reduce:transition-none`, so the preview snaps between veiled and clear.',

  cleanup:
    'The component holds no timers or listeners. The demo\'s simulated activation is a `setTimeout` inside an effect keyed on the status and cleared in its cleanup.',

  acceptance:
    'The demo loads with a blurred revenue chart, an "Unlock to use this component" chip, a "Pro access" pill and a "Get Pro" button; nothing in the preview is focusable. Clicking Get Pro shows "Activating…" with a spinner and aria-disabled for about 900ms, then the chart sharpens, the chip fades, the pill reads "Unlocked", the footer says the licence is active and focus lands on "Lock again". Clicking Lock again restores the veil and the Get Pro button.',

  criticalRegion: 'critical',
};

export default meta;
