import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'knockout-zoom-pin',
  title: 'Knockout Zoom Pin',
  category: 'scroll',
  tags: ['scroll', 'pin', 'zoom', 'typography', 'damping'],
  blurb: 'A word the size of the screen shrinks into a headline as you scroll, with the scene showing through its letters.',
  cost: 'dom',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/knockout-zoom-pin.tsx',
      target: 'components/motion/knockout-zoom-pin.tsx',
      type: 'registry:ui',
      role: 'component',
    },
    {
      path: 'registry/hooks/use-raf.ts',
      target: 'hooks/use-raf.ts',
      type: 'registry:hook',
      role: 'shared rAF loop with clamped delta',
    },
    {
      path: 'registry/hooks/use-reduced-motion.ts',
      target: 'hooks/use-reduced-motion.ts',
      type: 'registry:hook',
      role: 'reduced-motion query, SSR-safe',
    },
    {
      path: 'registry/lib/damp.ts',
      target: 'lib/damp.ts',
      type: 'registry:lib',
      role: 'frame-rate-independent interpolation, clamp, lerp',
    },
    {
      path: 'registry/lib/easing.ts',
      target: 'lib/easing.ts',
      type: 'registry:lib',
      role: 'cubic easing curves',
    },
  ],
  dependencies: [],

  summary:
    'A sticky section holds a single word while a manufactured scroll range plays a zoom out: the word starts several screens wide, showing a gradient through its letters, and settles into a normal headline position. No library — the progress is read from the sticky section\'s own rect, smoothed exponentially in wall-clock time, and written as one composited transform per changed frame.',

  mechanism: [
    'The scroll range is manufactured from the scroller\'s own height: the section is sized `hostHeight * (1 + viewports)` in pixels and the sticky child is sized `hostHeight`, so the leftover is exactly the pin duration. Pixels, not `vh`, because inside a scrollable box viewport units describe the wrong element.',
    'Progress is `(hostTop - sectionTop) / (total - hostHeight)`, clamped. It comes from `getBoundingClientRect()` on the frame it is used, so it stays correct through resizes, font swaps and layout shifts with nothing to invalidate.',
    'The raw progress is smoothed with `damp(smoothed, target, smoothing, dt)` — `x + (t - x) * (1 - s^dt)` — so the settle takes the same wall-clock time at 60 and 144 Hz. The per-frame form (`x += (t - x) * 0.1`) converges more than twice as fast on a high-refresh display.',
    'Scale and position use different curves on purpose. Scale is `cover - (cover - 1) * easeOutCubic(L)`, front-loading the shrink; the recentre is `easeInCubic(L)`, which keeps the word centred until it is small enough for its position to mean anything.',
    'The transform is built as a string, rounded to 4 decimals of scale and 0.1 px of translate, and compared with the previous frame\'s string. Unchanged frames skip the DOM write entirely, which at both ends of the range is most of them.',
    'The letters are a window rather than a fill: `background-clip: text` with a transparent colour, so the gradient behind them scales with the word and the section reads as cut out of the page.',
    'The word is sized in `cqw` against a `container-type: inline-size` pin box, so the component is identical in a 320 px preview card and a full-bleed page without a single breakpoint.',
  ],

  constants: [
    {
      name: 'cover',
      value: '7',
      why: 'Scale at progress 0 — enough that only the counters of one or two letters are on screen, so the opening frame reads as texture and the reveal of the word is the payoff. Below ~4 the word is legible immediately and there is nothing to reveal.',
    },
    {
      name: 'viewports',
      value: '1.6',
      why: 'Scroll travel as a multiple of the scroller height. Under ~1 the zoom is over before it registers; past ~2.5 the pin outstays its welcome and users start scrolling hard to escape it.',
    },
    {
      name: 'smoothing',
      value: '0.0067',
      why: 'Fraction of the gap remaining after one second — `e^-5`, i.e. the familiar `1 - exp(-5 * dt)` filter. It removes trackpad and wheel-step judder without the word feeling detached from the hand. At 0.05 the lag is visible as rubberiness.',
    },
    {
      name: 'rest',
      value: '-0.3',
      why: 'Final vertical position as a fraction of the pinned box: three tenths above centre, which is where a display headline sits when body copy follows it.',
    },
    {
      name: 'veil window',
      value: 'progress 0.45 → 0.95',
      why: 'When the content behind fades up. Earlier and it competes with a word still too large to read past; later and it arrives after the motion has stopped, which reads as a second, unrelated event.',
    },
    {
      name: 'write quantisation',
      value: '4 dp scale, 0.1 px translate',
      why: 'Below a tenth of a device pixel nothing changes on screen, so the comparison lets idle frames cost one string build and one comparison instead of a style write and a composite.',
    },
  ],

  pitfalls: [
    'Sizing the range in `vh` inside a scrollable container. The section is then sized against the window while progress is measured against the box, so the zoom finishes early, late, or never — and it looks correct only when the container happens to be full-height.',
    'Smoothing with a per-frame constant. The zoom lags noticeably further behind the scroll on a 60 Hz display than on a 120 Hz one, and every attempt to tune it makes the other refresh rate worse.',
    'Using the same easing for scale and for position. Move the word early and it slides around the screen while still too large to locate, which reads as a bug rather than as choreography.',
    'Animating `font-size` or `width` instead of `transform: scale`. Every frame relayouts and re-rasterises glyphs at a new size — the single most reliable way to turn this effect into a slideshow on a laptop.',
    'Writing the transform unconditionally each frame. At the top and bottom of the range the value is identical for dozens of frames, and each write still costs a style invalidation and a composite.',
    'Caching the section rect. A font swap or an image landing above the section moves it, and a cached top makes the zoom finish at the wrong scroll position for the rest of the session.',
    'Leaving the manufactured range in place under reduced motion. The user gets a screen and a half of scrolling where nothing happens at all; the height must collapse along with the animation.',
  ],

  notes: [
    'The scroll container is auto-detected by walking ancestors for a scrollable `overflow-y`, so the component works unchanged on a normal page. Pass `scroller` when the container is ambiguous or created later.',
    'The knockout is `background-clip: text`, not an SVG mask: no extra element, no viewBox to keep in sync, and the text stays selectable and readable to assistive technology.',
    'A single word works best. Two lines re-wrap as the scale changes and the knockout stops reading as one shape.',
  ],

  apiSignature:
    'function KnockoutZoomPin(props: { children: ReactNode; behind?: ReactNode; cover?: number; viewports?: number; smoothing?: number; rest?: number; scroller?: RefObject<HTMLElement | null>; className?: string }): JSX.Element',

  props: [
    { name: 'children', type: 'ReactNode', description: 'The word. Kept on one line — it is a display element.' },
    { name: 'behind', type: 'ReactNode', description: 'Content faded up behind the word as it settles.' },
    { name: 'cover', type: 'number', default: '7', description: 'Scale at progress 0.' },
    { name: 'viewports', type: 'number', default: '1.6', description: 'Scroll travel as a multiple of the scroller height.' },
    { name: 'smoothing', type: 'number', default: '0.0067', description: 'Fraction of the gap left after one second.' },
    { name: 'rest', type: 'number', default: '-0.3', description: 'Final vertical position as a fraction of the pinned box height.' },
    { name: 'scroller', type: 'RefObject<HTMLElement | null>', description: 'Scroll container. Omit to auto-detect the nearest scrollable ancestor.' },
    { name: 'className', type: 'string', description: 'Merged onto the outer section.' },
  ],

  reducedMotion:
    'The manufactured range collapses to one screen and the smoothing is bypassed, so progress tracks scroll exactly. The word passes through at its resting scale with the caption already present — the section becomes an ordinary headline block instead of leaving a screen and a half of empty scrolling behind.',

  cleanup:
    '`useRaf` unsubscribes from the shared loop on unmount; the only state is refs. The inline `height` values written to the section and the pin die with the elements, and no observers, listeners or timers are registered.',

  acceptance:
    'The word is unreadably large at the top of the section and lands as a normal headline exactly as the section releases. Scrolling backwards reverses it at the same rate. Stopping mid-zoom settles within about a quarter second with no drift. Resizing the window mid-zoom keeps the word at the same progress. With reduced motion on, the section is one screen tall and nothing scales.',

  criticalRegion: 'critical',
};

export default meta;
