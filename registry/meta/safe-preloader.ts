import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'safe-preloader',
  title: 'Preloader That Cannot Hang',
  category: 'transition',
  tags: ['preloader', 'overlay', 'timeout', 'sessionstorage', 'resilience'],
  blurb: 'An intro overlay with a hard ceiling, a minimum visible time and a once-per-session flag, so a stalled load cannot trap the page.',
  cost: 'dom',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/safe-preloader.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: [],

  summary:
    'Every hand-rolled preloader eventually ships the same bug: a signal that never arrives — a 404 on a font, a decode that fails on iOS, an image behind a dead CDN — and the site is a permanent opaque rectangle nobody can see through or tab past. This inverts the contract. A hard ceiling guarantees the page is visible by a fixed time and the load signal only ever makes it sooner; a floor stops a warm cache turning the overlay into a two-frame flash; a session flag keeps it an introduction rather than a toll booth.',

  mechanism: [
    'A three-state phase machine — `holding`, `leaving`, `gone` — drives the render. It starts at `holding` on both server and client so the markup matches, and the session check runs in a `useLayoutEffect`, before paint, so a returning visitor never sees a single frame of the overlay.',
    'THE CEILING: `setTimeout(reveal, ceilingMs)` is armed in an effect on mount, before anything subscribes to a load signal, and nothing clears it except a successful reveal or unmount. This is not a fallback — it is the actual guarantee, and the load signal is the optimisation.',
    'THE FLOOR: when the signal does arrive, the remaining hold is `Math.max(0, floorMs - (performance.now() - started))` and the reveal is deferred by that much. Measured from mount, not from the signal, so the floor overlaps the load instead of being added to it.',
    'The signal is `ready` when the prop is passed, otherwise the browser\'s own: `document.readyState === "complete"` is checked first and only then is a one-shot `load` listener attached, because if the document has already finished the event has been and gone and a listener alone would wait forever.',
    'ONCE: on reveal, `sessionStorage[sessionKey] = "1"`, wrapped in try/catch because `setItem` throws in Safari private browsing and a preloader is not worth taking the page down for. Both the read and the write are guarded.',
    '`reveal()` guards on a ref, not on state, so the ceiling and the floor firing in the same tick still reveal exactly once. It sets `leaving` — a CSS opacity transition on `[data-leaving="true"]` — and schedules the actual removal `fadeMs` later, so the node is never pulled out of the tree mid-transition. `onDone` fires from that same timer, after the overlay is gone.',
  ],

  constants: [
    {
      name: 'ceilingMs',
      value: '4000',
      why: 'The reveal deadline. Long enough that a genuinely slow first paint on a cold 3G connection is not cut off mid-load, short enough that a user staring at a broken overlay gives up after it rather than before. Past ~6s people reload, which restarts the same stall.',
    },
    {
      name: 'floorMs',
      value: '700',
      why: 'Minimum visible time. On a warm cache the signal resolves in about 40ms; without a floor the overlay appears and vanishes inside two frames, which reads as a rendering fault rather than an introduction. Below ~400ms the fade has no room to be perceived as deliberate.',
    },
    {
      name: 'fadeMs',
      value: '420',
      why: 'Fade-out duration, passed to CSS as `--k-safe-fade` and used as the removal delay so the two can never disagree. Long enough that the page underneath is already composited and visible through the fade; past ~700ms the user is looking at content they cannot yet click.',
    },
    {
      name: 'fade easing',
      value: 'cubic-bezier(0.22, 1, 0.36, 1)',
      why: 'Heavily front-loaded, so most of the opacity is gone in the first third and the perceived wait is shorter than the measured one. A linear fade of the same length feels about twice as long.',
    },
    {
      name: 'scan bar',
      value: '1.4s cubic-bezier(0.65, 0, 0.35, 1) infinite',
      why: 'A determinate progress bar would be a lie — nothing here knows a byte count. This is an indeterminate scan whose cycle is slow enough not to read as urgency and fast enough to prove the page is not frozen. The in-out curve keeps the ends from clipping at the container edges.',
    },
    {
      name: 'sessionKey',
      value: "'k-preloader'",
      why: 'Session, not local, storage. Local storage would mean the introduction plays once ever, so a returning visitor months later gets no reveal and QA can never see it again without clearing site data.',
    },
  ],

  pitfalls: [
    'Having no ceiling at all. One 404 on a font or a decode that fails only on iOS, and the overlay stays up forever: the content is not visible, not scrollable, and not reachable by keyboard, and it happens to a fraction of users you will never hear from.',
    'Clearing the ceiling when the load signal is subscribed to, or when it fires. Whatever the signal hands off to — a floor timer, a promise chain, a decode — can itself stall, and the one thing that guaranteed a reveal has already been thrown away.',
    'Attaching a `load` listener without checking `document.readyState` first. On a warm cache or after a client-side navigation the event has already fired, so the listener never runs; the ceiling silently does all the work and you only discover it the day someone shortens the ceiling.',
    'Shipping without a floor. The overlay appears and vanishes inside two frames on a fast connection, producing a black flash on every load that reads as a broken paint and is nearly impossible to reproduce on a throttled dev machine.',
    'Starting the floor clock when the signal arrives instead of at mount. The floor is then added to the load time rather than overlapping it, so a 2s load becomes a 2.7s hold for no benefit.',
    'Using state for the reveal-once guard. The ceiling and the floor can both fire before React re-renders, so `reveal` runs twice and the second call re-arms the fade on a node that is already leaving. A ref flips synchronously and cannot be raced.',
    'Unmounting the overlay in the same commit that starts the fade. The node leaves the tree before the transition can run a single frame, so the overlay simply disappears and the fade you wrote never happens.',
    'Reading `sessionStorage` in `useEffect` instead of `useLayoutEffect`. The overlay gets one painted frame before the effect runs, so a returning visitor sees a flash of it on every single navigation.',
    'Initialising state from `sessionStorage` during render. The server has no session storage, so it renders `holding` while the client renders `gone`, and React logs a hydration mismatch and re-renders the tree.',
    'Calling `sessionStorage.setItem` unguarded. It throws in Safari private browsing, and an unhandled throw inside the reveal path leaves the overlay up permanently — the exact failure the component exists to prevent.',
    'Replaying it on every visit. A preloader is an introduction; on the fourth arrival in the same session it is a toll booth, and the fix is one flag rather than a shorter animation.',
    'Leaving timers pending on unmount. The removal timer fires after the route has changed, so `setPhase` runs on a dead component and `onDone` fires for a page that is no longer mounted.',
  ],

  notes: [
    '`position` defaults to `fixed` for real page use and can be switched to `absolute` so the overlay can be demonstrated, or used, inside a bounded container.',
    'The overlay is `role="status"` with `aria-live="polite"`, so a screen reader announces the loading state once rather than reading a decorative bar, and the announcement is not interrupted by the reveal.',
    '`once={false}` exists for development and for the demo. In production the default keeps the overlay to one appearance per tab session.',
  ],

  apiSignature:
    "function SafePreloader(props: { children?: ReactNode; ready?: boolean; ceilingMs?: number; floorMs?: number; fadeMs?: number; sessionKey?: string; once?: boolean; onDone?: () => void; position?: 'fixed' | 'absolute'; className?: string }): JSX.Element | null",

  props: [
    { name: 'children', type: 'ReactNode', description: 'Overlay content. Defaults to a label and an indeterminate scan bar.' },
    { name: 'ready', type: 'boolean', description: 'The load signal. Leave undefined to use the browser\'s own `load` event and `readyState`.' },
    { name: 'ceilingMs', type: 'number', default: '4000', description: 'Hard ceiling. The reveal happens by this time whether or not the signal ever arrives.' },
    { name: 'floorMs', type: 'number', default: '700', description: 'Minimum time the overlay stays up, measured from mount.' },
    { name: 'fadeMs', type: 'number', default: '420', description: 'Fade-out duration in ms. Also the delay before the node is removed.' },
    { name: 'sessionKey', type: 'string', default: "'k-preloader'", description: 'sessionStorage key used by the once-per-session gate.' },
    { name: 'once', type: 'boolean', default: 'true', description: 'Set false to replay on every load, for development.' },
    { name: 'onDone', type: '() => void', description: 'Fires after the overlay has finished leaving and unmounted.' },
    { name: 'position', type: "'fixed' | 'absolute'", default: "'fixed'", description: 'Absolute lets the overlay be scoped to a container instead of the viewport.' },
    { name: 'className', type: 'string', description: 'Merged onto the overlay via `cn`.' },
  ],

  reducedMotion:
    'The overlay still appears and the ceiling still applies — withholding content is a behaviour, not an animation, so it is not skipped. What goes away is the motion: the floor collapses to 0 so nothing is held longer than it must be, the removal delay drops to 0 and the CSS transition to 1ms, and the scanning bar becomes a static full-width rule via `animation: none; transform: scaleX(1)` rather than a pulsing one. The result is a brief still plate, not a zero-duration version of the animated one.',

  cleanup:
    'Every timeout is pushed into a ref array and cleared on unmount, the ceiling effect clears its own id, and the one-shot `load` listener is removed by its effect. Because the removal timer is cleared, `setPhase` cannot run on a dead component and `onDone` cannot fire for a page that has already gone. No rAF, no observers, no global state beyond the session flag.',

  acceptance:
    'Simulate a signal that never arrives and the page is nonetheless visible and interactive at the ceiling. Reload with a warm cache and the overlay is visible for at least the floor — never a single-frame flash. Reload again in the same tab and no overlay is painted at all, not even one frame. Watch the reveal and the overlay fades rather than vanishing, with the content already composited underneath. Navigate away mid-hold and no state update warning appears and `onDone` never fires. With reduced motion on, the plate appears static and leaves immediately.',

  criticalRegion: 'critical',
};

export default meta;
