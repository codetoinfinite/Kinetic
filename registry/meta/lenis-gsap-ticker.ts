import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'lenis-gsap-ticker',
  title: 'Lenis On The GSAP Ticker',
  category: 'scroll',
  tags: ['scroll', 'lenis', 'gsap', 'scrolltrigger', 'smooth-scroll'],
  blurb: 'Smooth scroll and ScrollTrigger on one clock, with the lag-smoothing line everyone omits.',
  cost: 'dom',
  motif: 'wave',

  files: [
    { path: 'registry/ui/lenis-gsap-ticker.tsx', type: 'registry:ui', role: 'component' },
    { path: 'registry/hooks/use-lenis.ts', type: 'registry:hook', role: 'refcounted Lenis instance driven by an external ticker' },
    { path: 'registry/hooks/use-reduced-motion.ts', type: 'registry:hook', role: 'reduced-motion query, SSR-safe' },
  ],
  dependencies: ['gsap@^3.15.0', 'lenis@^1.3.11'],

  summary:
    'Lenis and ScrollTrigger each work alone and tear together, because each runs its own clock: Lenis advances the scroll position on its rAF, ScrollTrigger samples it on GSAP\'s, and a pinned section ends up a frame behind the page it is pinned to. Mounted once near the root, this hands Lenis to `gsap.ticker`, updates ScrollTrigger on Lenis\'s scroll event rather than per frame, and disables lag smoothing so the two agree about how much time passed.',

  mechanism: [
    'Lenis is driven by `gsap.ticker.add((t) => lenis.raf(t * 1000))` — seconds to milliseconds — and its own `autoRaf` is switched off. One clock advances the scroll position and the tweens, in that order, every frame.',
    '`gsap.ticker.lagSmoothing(0)` is the line that makes it correct rather than merely working. GSAP normally clamps a large `deltaTime` after a stall so tweens do not jump; but that clamped value is now what Lenis integrates, so an under-reported frame leaves Lenis\'s scroll position permanently offset from ScrollTrigger\'s idea of it. Nothing resyncs them afterwards.',
    'ScrollTrigger is updated from `lenis.on("scroll")`, not from the ticker. It then samples on the same tick the position actually changed, instead of one frame after — the difference is visible as a shimmering seam at the top edge of a pin.',
    '`paused` calls `lenis.stop()` and `lenis.start()` rather than tearing the instance down. This is the preloader gate: construct on mount so everything is measured and ready, but refuse wheel input until the intro clears — which is why you cannot scroll during a well-built intro sequence.',
    'Coming out of `paused`, and again on `load` and on `document.fonts.ready`, `ScrollTrigger.refresh()` re-measures. Images and fonts change document height after hydration, and every trigger below the fold was computed against the old one.',
    'The instance itself is refcounted at module scope in `use-lenis`, so mounting the provider twice — a layout and a page, say — reuses one Lenis instead of creating two that both `preventDefault` on wheel and scroll the page at double speed.',
    'Under `prefers-reduced-motion` no instance is constructed at all. The page scrolls natively and ScrollTrigger reads the native position, which is the path it is already correct on.',
  ],

  constants: [
    {
      name: 'duration',
      value: '1.05',
      why: 'Seconds for a wheel step to settle. Roughly the feel of Lenis\'s `lerp: 0.09`, which is the value most award-site builds land on: slow enough to read as smooth, fast enough that a trackpad flick does not feel like it is dragging the page through syrup. Past ~1.4 the page feels detached from the hand.',
    },
    {
      name: 'easing',
      value: '1.001 - 2^(-10t)',
      why: 'Lenis\'s own default — an exponential decay that is ~99.9 percent settled at t=1, so the tail never visibly crawls. The `1.001` guarantees it reaches exactly 1 rather than approaching it forever.',
    },
    {
      name: 'lagSmoothing',
      value: '0',
      why: 'Disabled, not tuned. Any non-zero threshold means GSAP will eventually report a deltaTime that did not happen, and Lenis will integrate it into a scroll position that does not match the document.',
    },
    {
      name: 'ScrollTrigger.update trigger',
      value: 'lenis scroll event',
      why: 'One update per position change, on the tick it changed. Calling it from the ticker instead costs an update on frames where nothing moved and delivers a stale position on frames where it did.',
    },
  ],

  pitfalls: [
    'Leaving lag smoothing at its default. Everything looks right until the first stall — a heavy image decode, a devtools pause — after which pinned sections sit permanently a few pixels off and no interaction resyncs them.',
    'Letting Lenis keep `autoRaf` while also adding it to the ticker. It then advances twice per frame: scrolling runs at double speed and the smoothing constant no longer means anything.',
    'Mounting the provider in two places. Two instances both listen on `wheel`, both call `preventDefault`, and the page moves twice as far as the gesture — the refcount in `use-lenis` exists specifically to make the second mount a no-op.',
    'Calling `ScrollTrigger.update` from the ticker instead of from the scroll event. Triggers lag the smoothed position by exactly one frame, which is most visible as a seam that shivers at the top of a pinned section.',
    'Skipping `ScrollTrigger.refresh()` after `load` and after fonts settle. Every trigger below the fold is measured against a document height that no longer exists, so they all fire early by the difference.',
    'Passing an inline arrow as `easing`. It is a new identity every render, so the effect that owns the instance tears Lenis down and rebuilds it on each one — visible as scroll position snapping to the top mid-gesture.',
    'Smooth-scrolling a subtree by mounting a second window-level Lenis. Lenis attaches to the window unless given an explicit wrapper; a nested instance fights the outer one for the same wheel events.',
  ],

  notes: [
    'The preview does not mount an enabled instance. `useLenis` attaches to the window, and a window-level smooth scroll inside a documentation page would take over the page hosting the preview rather than the preview. The demo therefore shows the provider mounted with `enabled={false}` beside a local reproduction: the right-hand column is offset by the same exponential filter Lenis applies, the left is the raw native position, and the bar at the bottom is the instantaneous gap between them. The ticker wiring itself is exactly as shipped.',
    'The demo derives its filter constant with `perFrameToSmoothing(0.09)` from `lib/damp`, which converts Lenis\'s per-frame `lerp` into the per-second constant `damp` wants. That conversion is the same one that makes any ported per-frame easing frame-rate independent.',
    'Mount above everything that registers a ScrollTrigger. Triggers created before the ticker wiring exists still work, but they are measured against a document that has not yet been refreshed.',
    'Smooth scroll is a preference, not an improvement. Ship the `enabled` escape hatch and honour reduced motion — a real fraction of users find hijacked scrolling nauseating.',
  ],

  apiSignature:
    'function LenisGsapTicker(props: { children?: ReactNode; duration?: number; easing?: (t: number) => number; paused?: boolean; enabled?: boolean }): JSX.Element',

  props: [
    { name: 'children', type: 'ReactNode', description: 'Rendered as-is; the provider adds no DOM of its own.' },
    { name: 'duration', type: 'number', default: '1.05', description: 'Seconds for a wheel step to settle.' },
    { name: 'easing', type: '(t: number) => number', description: 'Decay curve. Must be a stable reference — define it at module scope.' },
    { name: 'paused', type: 'boolean', default: 'false', description: 'Holds input via `lenis.stop()` without destroying the instance. Releasing it also refreshes ScrollTrigger.' },
    { name: 'enabled', type: 'boolean', default: 'true', description: 'False restores native scrolling and constructs nothing.' },
  ],

  reducedMotion:
    'No Lenis instance is constructed when `prefers-reduced-motion: reduce` matches, so scrolling is entirely native and the ticker is left alone. ScrollTrigger keeps working against the native position. The query is live: toggling the OS setting takes effect on the next render without a reload.',

  cleanup:
    '`use-lenis` removes its scroll listener, removes the update function from `gsap.ticker`, and destroys the instance only when the last consumer unmounts. The provider removes its own `load` listener and guards the `document.fonts.ready` continuation with a cancelled flag, so a refresh cannot land after unmount.',

  acceptance:
    'Scrolling is smoothed and a pinned section stays welded to the page with no shivering seam at its top edge. Pause during a stall — hold a devtools breakpoint for a second — and on release the pin is still aligned. Mounting the provider twice does not double scroll speed. With reduced motion on, scrolling is native and ScrollTrigger still fires at the right positions.',

  criticalRegion: 'critical',
};

export default meta;
