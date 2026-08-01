import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'font-safe-text-split',
  title: 'Font-Safe Text Splitting',
  category: 'text',
  tags: ['gsap', 'splittext', 'fonts', 'resize', 'scrolltrigger'],
  blurb:
    'Line splitting gated on document.fonts.ready, re-split on late fonts and on width change, debounced.',
  cost: 'dom',
  motif: 'split',

  files: [
    {
      path: 'registry/ui/font-safe-text-split.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['gsap@^3.15.0'],
  registryDependencies: [],

  summary:
    'Splitting text into lines is a measurement, and measuring before the webfont arrives measures the fallback face. The line boxes are then wrapped in the wrong places and never re-flow when the real font swaps in — with a line mask, the visible symptom is words sliced in half by an invisible edge, and it only reproduces on a cold cache. This component owns the whole lifecycle: gate the first split on `document.fonts.ready`, re-split when a late font finishes loading, and re-split on width change behind a debounce.',

  mechanism: [
    'The first split is deferred behind `document.fonts.ready`, so the browser has finished laying out with the real faces before any line box is measured.',
    'A `loadingdone` listener on `document.fonts` re-applies the split. Fonts requested after first paint — a lazily mounted section, a second weight, an icon face — trigger another layout pass that moves the line breaks under wrappers that were already fixed.',
    'A `ResizeObserver` on the container re-applies the split behind a `debounceMs` timer. Line breaks are a function of container width and nothing else recomputes them; without this, rotating a phone leaves the wrappers describing a layout that no longer exists.',
    'The resize guard compares `Math.round(entry.contentRect.width)` against the last value and returns when they match. On iOS the URL bar collapsing changes viewport *height* and fires resize; re-splitting there destroys and rebuilds the DOM mid-scroll for no benefit, on the device least able to spare the frames.',
    '`apply()` always tears down first — `ctx.revert()` then `split.revert()` — so a re-split never nests one set of line wrappers inside the previous set. Nesting is what turns three re-splits into a paragraph wrapped nine deep.',
    'A `revealed` flag is set by the ScrollTrigger `onEnter`. After the entrance has played, a re-split writes `gsap.set(lines, { yPercent: 0, opacity: 1 })` instead of `gsap.from(...)`, so rotating the device does not replay the entrance from off-screen.',
    '`ScrollTrigger.refresh()` runs after every split, because wrapping lines changes this element\'s height and every trigger positioned below it is now measuring against stale coordinates.',
  ],

  constants: [
    {
      name: 'DEBOUNCE_MS',
      value: '200',
      why: 'Milliseconds of quiet after the last resize before re-splitting. A split is a full teardown and rebuild of the subtree; running it per resize event during a window drag rebuilds it dozens of times a second. Below ~120ms a drag still triggers repeatedly; past ~350ms the text is visibly broken while the user waits.',
    },
    {
      name: 'Y',
      value: '110',
      why: 'Percent of a line\'s own height it starts below the mask. Past 100 rather than at it, because the mask clips to the line box and descenders otherwise peek below the mask edge on the first frame.',
    },
    {
      name: 'DURATION',
      value: '0.9',
      why: 'Seconds per line. `power3.out` needs this much room for its deceleration to read; below ~0.5s the curve flattens and lines snap into place.',
    },
    {
      name: 'STAGGER',
      value: '0.09',
      why: 'Seconds between lines. Roughly a tenth of the duration, so several lines are always rising together and the block reads as one mass rather than as a queue.',
    },
    {
      name: 'START',
      value: "'top 88%'",
      why: 'The reveal fires as the block\'s top edge clears the bottom eighth of the viewport — after it is unambiguously on screen, but before the reader has arrived at it.',
    },
    {
      name: 'width comparison',
      value: 'Math.round(contentRect.width)',
      why: 'Sub-pixel `contentRect` values differ by fractions on a scrollbar appearing or a zoom level change, so an exact float comparison never matches and the debounce fires forever. Rounding to whole pixels is the smallest unit a line break can actually respond to.',
    },
  ],

  pitfalls: [
    'Splitting synchronously on mount. On a cold cache the fallback face is measured, the line wrappers are fixed at the wrong break points, and when the real font swaps in the masked lines clip words in half. It works perfectly on every reload after the first, which is why it ships.',
    'Waiting only on `document.fonts.ready` and stopping there. It resolves once for the fonts the document knew about at that moment; a font requested later re-flows the text under wrappers that are already fixed.',
    'Re-splitting on every resize event. Each split is a full DOM teardown and rebuild, so dragging a window edge rebuilds the subtree dozens of times a second and the page locks up.',
    'Re-splitting on any resize rather than on width change. iOS fires resize on every URL-bar collapse, so scrolling on a phone continuously destroys and rebuilds the paragraph.',
    'Comparing raw `contentRect.width` floats. They wobble by fractions of a pixel and the debounce re-arms forever.',
    'Re-splitting without reverting the previous split first. The new line wrappers nest inside the old ones, and after a few resizes the paragraph is wrapped several layers deep with stale masks at every level.',
    'Replaying the entrance on re-split. The text drops back below its mask and rises again because the user rotated their phone, which reads as a rendering glitch.',
    'Skipping `ScrollTrigger.refresh()` after the split. The element\'s height changed, so every trigger below it on the page fires at the wrong scroll position — usually the bug reported as "the section below animates too early".',
  ],

  notes: [
    'This is one of the two components that deliberately use GSAP `SplitText`, because the technique *is* SplitText\'s lifecycle. `SplitText` ships inside the main `gsap` package and is free to use; it is imported from `gsap/SplitText` rather than vendored, so this is a use grant with no redistribution. The other text components in this set split declaratively in JSX so consumers are not forced into GSAP for effects that do not need it.',
    'Every other split-based component in the registry inherits this problem. If you split text anywhere — by hand, with `split-type`, or with SplitText — the `document.fonts.ready` gate and the width-only debounced re-split apply just as much.',
    'GSAP 3.13+ offers `autoSplit` and `onRevert`, which cover part of this. The explicit lifecycle here is kept because it also handles the late-`loadingdone` case and gives you the `revealed` flag, and because it is legible: you can see exactly which of the three triggers fired.',
  ],

  apiSignature:
    'function FontSafeTextSplit(props: { children: ReactNode; type?: string; mask?: boolean; y?: number; duration?: number; stagger?: number; start?: string; scroller?: Element | null; debounceMs?: number; className?: string }): JSX.Element',

  props: [
    { name: 'children', type: 'ReactNode', description: 'Text or markup to split into lines.' },
    { name: 'type', type: 'string', default: "'lines'", description: 'SplitText `type`. Lines are what the mask and the re-split are for.' },
    { name: 'mask', type: 'boolean', default: 'true', description: 'Wrap each line in an overflow-hidden box.' },
    { name: 'y', type: 'number', default: '110', description: "Percent of a line's height it starts below the mask." },
    { name: 'duration', type: 'number', default: '0.9', description: 'Seconds per line.' },
    { name: 'stagger', type: 'number', default: '0.09', description: 'Seconds between lines.' },
    { name: 'start', type: 'string', default: "'top 88%'", description: 'ScrollTrigger `start` for the reveal.' },
    { name: 'scroller', type: 'Element | null', default: 'null', description: 'Scroll container, when the text is not in the document scroller.' },
    { name: 'debounceMs', type: 'number', default: '200', description: 'Milliseconds of quiet after the last resize before re-splitting.' },
    { name: 'className', type: 'string', description: 'Merged onto the container via `cn`.' },
  ],

  reducedMotion:
    'The effect returns before registering anything: no split, no font listener, no ResizeObserver. The text React rendered is the finished state and is fully visible on first paint — which also means the entire measurement lifecycle costs nothing for users who asked for less motion.',

  cleanup:
    'Sets a `cancelled` flag that closes the async `document.fonts.ready` gap, clears the pending debounce timeout, disconnects the `ResizeObserver`, removes the `loadingdone` listener, then reverts the `gsap.context` and the split in that order. Nothing can re-split or tween after unmount.',

  acceptance:
    'Hard-reload with the cache disabled and throttled network: the lines break correctly and no word is clipped by a mask edge, on the first load as well as subsequent ones. Drag the window narrower and the lines re-break about 200ms after you stop, once, without replaying the entrance. Scroll on an iOS device and the paragraph never rebuilds as the URL bar collapses. Resize repeatedly and inspect the DOM: line wrappers are exactly one level deep, never nested. A section below the text still triggers at the correct scroll position after a re-split.',

  criticalRegion: 'critical',
};

export default meta;
