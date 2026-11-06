# Build: Pro Access Card

The card a docs page shows in place of a paid component. A brushed-metal lock tile, the heading and licence copy sit on top with a "Pro access" pill; below, inside a grey inset, the real preview is rendered blurred and desaturated under a "locked" chip, and a footer carries the upsell line with a get-access button. When `locked` turns false the blur lifts, the chip fades and the footer swaps to your unlocked content.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Pro-locked component placeholder: metallic lock tile, a blurred inert preview, upsell copy and a get-access action that lifts the veil.

- Category: display
- Runtime cost: css
- Dependencies: @remixicon/react@^4.9.0

## How it works

1. Layout: a rounded-3xl bordered section; the header is a flex row of a lock tile (40px, 56px from `sm`) and a title column; the title has a 14rem flex-basis, so in narrow cards the pill wraps under it instead of squeezing the heading. A `bg-background-secondary-default` inset with 4px padding holds the preview stage (rounded-[20px], primary background) and the footer, which reads as two nested surfaces like the docs install panel.
2. The veil is the preview wrapper itself: while locked it gets `blur-[6px] saturate-50 opacity-60 scale-[1.03]`, `pointer-events-none select-none`, the `inert` attribute and `aria-hidden`, so the preview cannot be focused, clicked, selected or read out. The slight scale pushes the blurred edge outside the clipped stage so no soft halo shows at the corners.
3. Unlocking sets the wrapper back to `blur-none` and identity scale/opacity with a 500ms `transition-[filter,opacity,scale]`, while the absolutely positioned lock chip runs a 300ms `transition-[opacity,visibility]` to `invisible opacity-0` so it leaves the tab order and the accessibility tree once faded.
4. The footer is an `aria-live="polite"` region: locked, it shows the title/description and the action (a `ButtonLink` with `actionHref`, else a `Button`); `pending` swaps the icon for a spinner glyph and sets `aria-disabled` (not `disabled`, so focus stays on the button) and `aria-busy` on the card; unlocked, it renders `unlockedFooter`.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `veil = blur 6px, saturate 50%, opacity 60%, scale 1.03`
  Enough to hide detail and colour while the silhouette still sells the component; the scale hides the blur halo at the clipped edge.
- `unveil = 500ms ease-out (chip 300ms)`
  The chip is gone before the preview finishes sharpening, so the reveal reads as one motion.
- `lock tile = 56px (40px below sm), rx 14`
  Matches the icon tile in the reference header and the card's rounded-3xl rhythm.
- `inset = p-1 (4px), stage radius 20px`
  Outer radius 24px minus the 4px inset keeps the nested corners concentric.

## API

```ts
function ProAccessCard(props: { title: ReactNode; description?: ReactNode; badge?: ReactNode; unlockedBadge?: ReactNode; icon?: ReactNode; preview?: ReactNode; lockedLabel?: ReactNode; locked?: boolean; footerTitle?: ReactNode; footerDescription?: ReactNode; unlockedFooter?: ReactNode; actionLabel?: ReactNode; actionIcon?: IconComponent; actionHref?: string; onAction?: () => void; pending?: boolean; titleAs?: "h2" | "h3" | "h4"; previewClassName?: string; className?: string }): JSX.Element
function ProLockTile(props: { className?: string }): JSX.Element
```

- `title: ReactNode`
  Heading, e.g. "Line Chart Card is a Pro component."; labels the section.
- `description: ReactNode`
  Licence copy under the title.
- `preview: ReactNode`
  The component preview, veiled while locked.
- `locked: boolean` — default `true`
  Blurs and disables the preview and shows the call to action.
- `pending: boolean` — default `false`
  Spinner in the action, `aria-disabled`, and `aria-busy` on the card.
- `onAction / actionHref: () => void / string`
  Click handler, or a link target that renders the action as an anchor.
- `actionLabel / actionIcon: ReactNode / IconComponent` — default `"Get access" / RiVipCrown2Line`
  Action text and leading icon.
- `badge / unlockedBadge: ReactNode` — default `"Pro access" / "Unlocked"`
  Pill text for each state.
- `lockedLabel: ReactNode` — default `"Preview locked"`
  Chip over the blurred preview.
- `footerTitle / footerDescription: ReactNode` — default `"This component is included in Pro"`
  Upsell copy beside the action.
- `unlockedFooter: ReactNode`
  Replaces the footer once unlocked.
- `icon: ReactNode` — default `<ProLockTile />`
  Header icon.
- `titleAs: "h2" | "h3" | "h4"` — default `"h3"`
  Heading level for the title.
- `previewClassName: string` — default `"p-3 sm:p-6"`
  Classes for the preview stage.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
// The veil: blur + desaturate + inert while locked, so the preview teases
// the component but cannot be tabbed into, clicked or read out. Unlocking
// transitions filter, opacity and scale back to identity in one 500ms pass,
// while the lock chip fades out over 300ms and then turns `invisible`.
const veilClass = cx(
  "origin-center transition-[filter,opacity,scale] duration-500 ease-out motion-reduce:transition-none",
  locked ? "pointer-events-none scale-[1.03] opacity-60 blur-[6px] saturate-50 select-none" : "blur-none",
  previewClassName ?? "p-3 sm:p-6",
);
const overlayClass = cx(
  "absolute inset-0 flex items-center justify-center bg-background-primary-default/30",
  "transition-[opacity,visibility] duration-300 ease-out motion-reduce:transition-none",
  locked ? "visible opacity-100" : "invisible opacity-0",
);
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The component holds no timers or listeners. The demo's simulated activation is a `setTimeout` inside an effect keyed on the status and cleared in its cleanup.

**Reduced motion.** Every transition (veil filter/opacity/scale, chip fade, pill colour) carries `motion-reduce:transition-none`, so the preview snaps between veiled and clear.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Blurring a preview that is still interactive. Without `inert` keyboard users tab into invisible-looking controls and screen readers read the hidden component; add `inert` and `aria-hidden` together.
- Fading the overlay with opacity only. It stays clickable and announced; pair it with `visibility` in the same transition.
- Setting `disabled` on the action while pending. The focused button loses focus to `<body>`; use `aria-disabled` and ignore clicks instead.
- Writing `blur-0` to clear the filter in Tailwind v4: it emits nothing. Use `blur-none`.

## Notes

- The card does not own the licence state: pass `locked` from wherever you check it, and `pending` while an activation request is in flight.
- The lock tile colours are fixed SVG artwork (brushed metal reads the same in both themes); pass `icon` to use your own.

## Definition of done

The demo loads with a blurred revenue chart, an "Unlock to use this component" chip, a "Pro access" pill and a "Get Pro" button; nothing in the preview is focusable. Clicking Get Pro shows "Activating…" with a spinner and aria-disabled for about 900ms, then the chart sharpens, the chip fades, the pill reads "Unlocked", the footer says the licence is active and focus lands on "Lock again". Clicking Lock again restores the veil and the Get Pro button.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
