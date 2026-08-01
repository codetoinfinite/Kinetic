import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'converging-scrub-words',
  title: 'Converging Headline Words',
  category: 'text',
  tags: ['gsap', 'scrolltrigger', 'scrub', 'headline', 'split'],
  blurb:
    'Headline words slide in from opposite margins and lock into a sentence, pinned to scroll position.',
  cost: 'dom',
  motif: 'split',

  files: [
    {
      path: 'registry/ui/converging-scrub-words.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['gsap@^3.15.0'],
  registryDependencies: [],

  summary:
    'A stacked headline assembles out of the margins as you approach it. Odd lines enter from the right, even lines from the left, and both land on zero at the same scrub position, so they cross the frame in opposite directions and lock into a sentence. Because the tween is scrubbed, scrolling back up disassembles it — the headline is a function of scroll position, not a playback that has happened or not happened.',

  mechanism: [
    'Each word is a block-level span with `data-word`. A single `gsap.timeline` with a `scrollTrigger` holds one `fromTo` per word, all inserted at position `0`, so every word shares the timeline\'s full length and therefore the full scroll range.',
    'The travel is `xPercent`, not `x`: percent of *the element\'s own width*, so a short word and a long word both start entirely outside the frame and neither needs a hand-tuned pixel value.',
    'Direction alternates on index parity — `i % 2 === 0 ? -travel : travel` — and the text alignment alternates with it, so each word enters from the side it is aligned to and travels the shortest distance to its resting place.',
    '`ease: "none"` on every tween. Under `scrub` the scroll position *is* the easing curve; layering `power2.out` on top means the words accelerate away from the scrollbar and then wait for it, which is precisely the sensation people describe as the scroll feeling sticky.',
    '`fromTo`, not `to`. A bare `to` reads its start value from the DOM, and the DOM already says `xPercent: 0` because the rendered markup is the assembled headline — that is what the no-JS and reduced-motion renders show.',
    '`gsap.registerPlugin(ScrollTrigger)` is called inside the effect rather than at module scope, because `registerPlugin` touches `window` and this module is still evaluated during server rendering.',
  ],

  constants: [
    {
      name: 'TRAVEL',
      value: '120',
      why: 'Percent of each word\'s own width. At exactly 100 the word starts flush against the frame edge and is already peeking in on the first pixel of scroll; the extra 20% buys a moment of empty margin before it arrives.',
    },
    {
      name: 'SCRUB',
      value: '1',
      why: 'One second of catch-up between the scrollbar and the words. `scrub: true` welds them exactly, which on a trackpad exposes every jitter in the input; past ~1.5s the headline is still assembling well after the reader has stopped scrolling.',
    },
    {
      name: 'START',
      value: "'top bottom'",
      why: 'The scrub begins the instant the headline\'s top edge enters the viewport. Starting later means the words are still outside the frame when the headline is already half on screen, which reads as missing content rather than as an entrance.',
    },
    {
      name: 'END',
      value: "'top 25%'",
      why: 'Assembly completes when the headline top reaches the upper quarter of the viewport. Ending at centre leaves the headline unresolved while it is the dominant thing on screen; ending earlier compresses the whole effect into the bottom sliver of the viewport.',
    },
  ],

  pitfalls: [
    'Using an ease other than `none` under `scrub`. The words lead or lag the scrollbar and the page feels like it is fighting the input — the single most common complaint about scrubbed animation.',
    'Using `to` instead of `fromTo`. GSAP samples the current DOM value as the start, which is the resting position, so nothing moves — or worse, it moves only after a resize invalidates the cached start.',
    'Animating `x` in pixels. A word that is 400px wide and one that is 120px wide need different offsets to clear the frame; `xPercent` is self-scaling and survives a font-size change.',
    'Setting `overflow: hidden` on the container. It stops the horizontal scrollbar, but CSS forces `overflow-y` to `auto` when one axis is `hidden`, which silently breaks any sticky ancestor and clips descenders. `overflow-x: clip` does the same job without that side effect.',
    'Omitting the `scroller` option when the headline lives inside a scrolling panel rather than the document. ScrollTrigger measures against the window, so the trigger fires at the wrong time or never.',
    'Registering ScrollTrigger at module scope. `registerPlugin` reaches for `window` and throws during server rendering.',
    'Cleaning up with `kill()` on the timeline only. The ScrollTrigger instance survives and keeps measuring a detached element; `ctx.revert()` disposes both and strips the inline transforms.',
  ],

  notes: [
    'No text-splitting library: the words arrive as an array prop and are rendered as spans by React. A splitter would add a dependency and a DOM-mutation lifecycle for something the caller already has as data.',
    'If you feed this component text you split elsewhere, gate the split on `document.fonts.ready` — measuring before the webfont lands gives fallback-font line breaks that never re-flow. See `font-safe-text-split`.',
    'The `scroller` prop exists so the component can be demoed and used inside an `overflow-y-auto` panel rather than only in the document scroller.',
  ],

  apiSignature:
    'function ConvergingScrubWords(props: { words: string[]; travel?: number; scrub?: number; start?: string; end?: string; scroller?: Element | null; className?: string }): JSX.Element',

  props: [
    { name: 'words', type: 'string[]', description: 'One per line. Even indices enter from the left, odd from the right.' },
    { name: 'travel', type: 'number', default: '120', description: "Percent of each word's own width that it starts offset by." },
    { name: 'scrub', type: 'number', default: '1', description: 'Seconds of catch-up between the scrollbar and the words.' },
    { name: 'start', type: 'string', default: "'top bottom'", description: 'ScrollTrigger `start`.' },
    { name: 'end', type: 'string', default: "'top 25%'", description: 'ScrollTrigger `end`.' },
    { name: 'scroller', type: 'Element | null', default: 'null', description: 'Scroll container, when the headline is not in the document scroller.' },
    { name: 'className', type: 'string', description: 'Merged onto the wrapper via `cn` — type size and tracking go here.' },
  ],

  reducedMotion:
    'No ScrollTrigger is attached and no tween is created. The markup React renders is already the assembled headline at `xPercent: 0`, so the finished sentence is on screen from first paint — nothing is off-screen waiting for a scroll that will not drive it.',

  cleanup:
    '`ctx.revert()` on the `gsap.context` scoped to the root. That kills the timeline, disposes the ScrollTrigger instance (so it stops measuring a detached element and stops contributing to `ScrollTrigger.refresh()`), and strips the inline transforms GSAP wrote.',

  acceptance:
    'Scroll down slowly: the words travel inward from alternating sides and are exactly aligned when the headline top reaches the upper quarter of the viewport. Scroll back up and they separate again, tracking the scrollbar. No horizontal scrollbar appears on the document at any point. With reduced motion enabled the assembled headline is present on first paint and does not move.',

  criticalRegion: 'critical',
};

export default meta;
