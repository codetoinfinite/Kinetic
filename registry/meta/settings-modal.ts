import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'settings-modal',
  title: 'Settings Modal',
  category: 'block',
  kit: 'boardui',
  tags: ['settings', 'modal', 'dialog', 'preferences', 'webgl', 'boardui'],
  blurb:
    'A controlled settings dialog with a section rail and General, Profile, Tools and Storage pages. It scales in from 85% with a light blur.',
  cost: 'webgl',
  motif: 'split',

  files: [
    { path: 'registry/ui/settings-modal.tsx', type: 'registry:ui', role: 'component' },
    { path: 'registry/ui/settings-general.tsx', type: 'registry:ui', role: 'general-page' },
    { path: 'registry/ui/settings-profile.tsx', type: 'registry:ui', role: 'profile-page' },
    { path: 'registry/ui/settings-rows.tsx', type: 'registry:ui', role: 'row-primitives' },
    { path: 'registry/ui/settings-storage.tsx', type: 'registry:ui', role: 'storage-page' },
    { path: 'registry/ui/settings-tools.tsx', type: 'registry:ui', role: 'tools-page' },
    { path: 'registry/ui/plan-art-flame.tsx', type: 'registry:ui', role: 'plan-art' },
    { path: 'registry/ui/settings-storage-icons.ts', type: 'registry:ui', role: 'icon-data' },
  ],
  dependencies: [
    '@remixicon/react@^4.9.0',
    'react-aria@^3.53.1',
    'react-aria-components@^1.22.1',
    '@internationalized/date@^3.12.4',
  ],

  summary:
    'A controlled `SettingsModal` (`isOpen` / `onClose`) portals an 871×614 panel with a grouped section rail on the left and a scrolling page on the right. It ships four pages built from shared row primitives: General (a plan card with a WebGL "burning flag" artwork, pull-request and notification preferences), Profile (fields that save on Enter or blur and trigger a "Saved" toast), Tools (MCP servers by scope) and Storage (a sortable, filterable, paginated file table with uploads). The open and close are the same transition run in reverse. The DOM is kept mounted until the close has finished.',

  mechanism: [
    'Opening runs in two phases. `mounted` puts the portal in the DOM at its hidden pose (`scale-[0.85] opacity-0 blur-[4px]`), and a double `requestAnimationFrame` flips `visible` one frame after that pose has been committed. Without the second frame the browser merges both class sets into one style recalc and skips the transition. Closing clears `visible` straight away and only unmounts after a 320ms timer, so the 300ms exit plays in full.',
    'The backdrop and the panel transition separately. The backdrop is a `bg-black/70` `<button>` (`tabIndex={-1}`, clicking it closes) that fades its opacity over 300ms. The wrapper carries `transform-gpu transition-[opacity,transform,filter]` on `cubic-bezier(0.32,0.72,0,1)`, a fast start that settles softly. The "Saved" toast lives in this same wrapper, outside the panel\'s clip, so it scales with the panel while sitting across its bottom edge.',
    'The portal target is `useUNSAFE_PortalContext().getContainer?.() ?? document.body`. Hosts that clip fixed children, such as a scaled preview frame, can hand it their own container. Opening focuses the panel (`role="dialog"`, `aria-modal`, `tabIndex={-1}`), and a document `keydown` listener closes it on Escape. That listener only exists while `isOpen` is true.',
    'The rail renders `NAV_GROUPS` as Settings, Desktop app and Customize. Only entries that carry a `page` navigate. The others (Appearance, Billing, Plugins…) are inert rows that complete the layout. Marketplace only appears when a `marketplace` node is passed. Each open resets the page to `defaultPage`. Switching pages resets the scroll fade, an `h-10` gradient over the top of the scroller that fades in over 200ms once `scrollTop > 0`.',
    'The Saved toast is a three-phase state machine: `hidden → shown → leaving → hidden`. Each phase has its own offset: it rises in from 12px below its resting spot, stays for 2000ms, then drifts 10px up while fading and blurring. After 220ms it is quietly reset to the bottom start, so the next save rises in again instead of falling back down. A new save within the window restarts the timer.',
    'General\'s plan art is `PlanArtFlame`. It is a fullscreen-quad fragment shader that ripples the artwork like a flag, with the most movement at the edges, and burns it away with 4-octave fbm noise behind an ember rim and three layers of rising flakes. The pointer hotspot is eased toward the cursor every frame. With no `planArtSrc` it burns built-in blobs painted from theme colour tokens. If WebGL is unavailable it falls back to a static DOM blur.',
  ],

  constants: [
    {
      name: 'enter / exit pose',
      value: 'scale 0.85, opacity 0, blur 4px → 1, 1, 0 over 300ms',
      why: 'An 85% start reads as the dialog coming forward rather than popping. The blur was 8px until the close stuttered. Re-filtering an 8px blur over the whole 871×614 panel every frame of the scale-down was the cost, and 4px with GPU promotion stays smooth.',
    },
    {
      name: 'unmount delay',
      value: '320ms',
      why: '20ms longer than the 300ms transition, so the last frame of the exit lands before the portal is removed. If it is equal or shorter, the panel can vanish one frame early on a busy main thread.',
    },
    {
      name: 'panel size',
      value: '871 × 614 px, capped at calc(100vw-32px) × calc(100dvh-32px)',
      why: 'Taken from the Figma frame. The caps keep a 16px gutter on small screens, and the rail falls back to icons only (`w-14`) below `sm` so the page still has room.',
    },
    {
      name: 'saved toast timing',
      value: '2000ms shown, 200ms transitions, 220ms reset',
      why: 'Two seconds is enough to notice and still gone before the next edit. The reset waits 20ms past the fade so the jump back to the start offset happens at opacity 0 and is never seen.',
    },
    {
      name: 'storage table',
      value: '1,262 rows (mulberry32 seed 26), 6 per page, 400ms row enter / 225ms row exit',
      why: 'A seeded PRNG generates the same inventory on the server and the client, so there is no hydration mismatch. The exit is shorter than the enter because removing a row should feel immediate, while a new row needs time to be noticed.',
    },
    {
      name: 'flame pointer easing',
      value: 'position 0.12, strength 0.07 per frame',
      why: 'Position follows quickly enough that the heat clearly tracks the cursor. Strength eases about half as fast, so the burn swells and cools gradually instead of switching on and off at the canvas edge.',
    },
  ],

  pitfalls: [
    'Setting `visible` in the same commit as `mounted`. The panel never renders its hidden pose, so the open snaps in. The double rAF is not a superstition.',
    'Using `overflow-hidden` on the panel instead of `overflow-clip`. A hidden-overflow box is still programmatically scrollable, so focusing a switch\'s visually hidden input in a row clipped by the inner scroller scrolls the whole panel and shifts the modal with no way back. `clip` forbids scrolling outright.',
    'Passing an inline arrow as `onClose` and expecting the Escape listener to stay put. The effect depends on `onClose`, so a new function every render re-binds the listener and re-focuses the panel. Memoise it if the parent re-renders while the dialog is open.',
    'Rendering the modal inside a transformed or `overflow-hidden` ancestor without a portal container. `fixed inset-0` becomes relative to the transformed ancestor and the dialog is clipped to it. Provide an `UNSAFE_PortalProvider` container or let it fall back to `document.body`.',
    'Opening many settings dialogs at once in a gallery. Each General page creates its own WebGL context, and Chromium silently drops the oldest one at about 16.',
  ],

  notes: [
    'The rows (`SettingsCard`, `SettingsRow`, `SettingsSectionLabel`, `SettingsValueField`) live in `settings-rows.tsx`, so a new page can be added with the same rhythm: 52px rows, a 202px value column and a hairline between rows.',
    'The Storage page uses data-URI SVGs from `settings-storage-icons.ts` in place of BoardUI\'s `/public` artwork, so the item works without static assets.',
    '`SettingsProfile` uses `@internationalized/date` for its birth-date picker. That is why the date package is a direct dependency even though the modal shell never touches dates.',
  ],

  apiSignature:
    'type SettingsPage = "general" | "profile" | "storage" | "tools" | "marketplace"\nfunction SettingsModal(props: { isOpen: boolean; onClose: () => void; defaultPage?: SettingsPage; planArtSrc?: string; marketplace?: ReactNode }): ReactPortal | null',

  props: [
    { name: 'isOpen', type: 'boolean', description: 'Controlled open state. Flipping it to false plays the exit and unmounts 320ms later.' },
    { name: 'onClose', type: '() => void', description: 'Called by the backdrop, the close button and Escape. The parent sets `isOpen` back to false.' },
    { name: 'defaultPage', type: 'SettingsPage', default: '"general"', description: 'Page shown each time the dialog opens. Read on the open transition only.' },
    { name: 'planArtSrc', type: 'string', description: 'Image burned by the plan card\'s WebGL artwork. Omit it to burn the built-in token-coloured blobs.' },
    { name: 'marketplace', type: 'ReactNode', description: 'Content for an optional Marketplace page. The rail entry is hidden unless this is provided.' },
  ],

  reducedMotion:
    'Not handled in JavaScript. The open and close transitions, the Saved toast and the scroll fade all run at full duration under `prefers-reduced-motion: reduce`, and the plan card\'s WebGL flame keeps animating. Only the Storage row enter and exit animations are cut to 1ms by the theme sheet. To honour the setting, add `motion-reduce:transition-none` to the wrapper and backdrop, and gate `PlanArtFlame`\'s rAF loop on the media query, drawing one frame instead.',

  cleanup:
    'Closing clears the Saved-toast timers and schedules the unmount timer. Unmounting clears both. The Escape listener is removed whenever `isOpen` goes false. `PlanArtFlame` cancels its rAF, removes its window `pointermove` listener, calls `WEBGL_lose_context.loseContext()` and removes its canvas. The canvas is created inside the effect, so StrictMode\'s re-run gets a fresh context rather than the dead one. The Storage page clears its pending row-delete and just-added timers on unmount.',

  acceptance:
    'Nothing is on screen until the trigger is clicked. Opening scales the dialog up from about 85% while it fades in and sharpens, behind a 70% black backdrop. Clicking the backdrop, the round close button or pressing Escape plays the same motion in reverse, and the DOM is gone afterwards. Rail items with pages switch the content and highlight the selected row. Scrolling a page fades in a gradient under the title. On General, the plan card\'s artwork ripples and burns at the edges, and the burn intensifies near the cursor. On Profile, changing a name and pressing Enter shows a "Saved" pill that rises in across the bottom edge and drifts up and away after about 2 seconds. On Storage, sorting, filtering, paging, selecting and deleting rows all work, and deleted rows collapse upward.',

  criticalRegion: 'critical',
};

export default meta;
