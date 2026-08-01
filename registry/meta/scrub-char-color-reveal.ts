import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'scrub-char-color-reveal',
  title: 'Scrubbed Character Colour Reveal',
  category: 'text',
  tags: ['gsap', 'scrolltrigger', 'scrub', 'stagger', 'split'],
  blurb:
    'A dim paragraph resolves character by character as it crosses the viewport, tied to scroll position not a clock.',
  cost: 'dom',
  motif: 'split',

  files: [
    {
      path: 'registry/ui/scrub-char-color-reveal.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['gsap@^3.15.0'],
  registryDependencies: [],

  summary:
    'A paragraph sits at 16% strength and resolves character by character as it crosses the viewport, with the reveal position pinned to the scrollbar rather than to a clock. Scroll back up and the characters ghost out again in reverse, because a scrubbed timeline is a function of position, not a playback. The stagger and durations are ratios of the scroll range rather than seconds, so the pacing per character is unchanged whether the paragraph is thirty words or three hundred.',

  mechanism: [
    'The text is split in JSX — `text.split(" ")` for word boxes, `Array.from(word)` for one `inline-block` span per character — so React owns every node and nothing mutates the tree behind its back.',
    'One `gsap.to(chars, { opacity: 1, stagger, duration, ease: "power1.out", scrollTrigger: {...} })` does the whole reveal. GSAP builds the stagger internally as a single tween whose total length is `duration + (n - 1) * stagger`.',
    'ScrollTrigger maps that total length onto the distance between `start` and `end`, which is why `stagger: 0.1` and `duration: 0.35` are ratios, not seconds: each character begins 0.1/total of the way through the scroll range and takes 0.35/total to resolve. Change the paragraph length and the pacing per character is identical; change the scroll range and everything rescales together.',
    'The resting opacity is written as a JSX inline style on each character, so the pre-scroll frame — including the server render and the no-JS render — is already the dim state, and GSAP has a real DOM value to tween away from.',
    'The paragraph carries `aria-label={text}` and the character spans are inside an `aria-hidden` wrapper, so assistive technology reads one paragraph rather than two hundred single letters.',
    '`ease: "power1.out"` applies *within* each character\'s own resolve, not across the stagger. The stagger itself remains linear against scroll, which is what keeps the sweep pinned to the scrollbar.',
  ],

  constants: [
    {
      name: 'DIM',
      value: '0.16',
      why: 'Resting strength as opacity on `currentColor`. Below ~0.1 the unread text is illegible and the block reads as a loading skeleton; above ~0.3 the contrast between resolved and unresolved is too weak for the sweep to be visible while scrolling.',
    },
    {
      name: 'STAGGER',
      value: '0.1',
      why: 'Timeline units between adjacent characters. Combined with `CHAR_DURATION` it sets the width of the resolve front: roughly 3-4 characters are mid-transition at any moment. Larger and the front narrows to one character at a time, which reads as a typewriter rather than a wash.',
    },
    {
      name: 'CHAR_DURATION',
      value: '0.35',
      why: '3.5x the stagger, so several characters are always resolving together. Equal to the stagger it becomes a hard edge sweeping the paragraph; much larger and the front is so soft the reveal has no direction.',
    },
    {
      name: 'SCRUB',
      value: '0.75',
      why: 'Seconds of catch-up. `scrub: true` welds the reveal to the scrollbar exactly, which on a trackpad exposes every jitter in the input. Three quarters of a second smooths it without ever feeling like the text is animating on its own.',
    },
    {
      name: 'START / END',
      value: "'top 78%' / 'bottom 55%'",
      why: 'The reveal begins when the paragraph top is a little above the fold and completes when its bottom passes just past the middle. Ending at `bottom top` means the last characters only resolve as the paragraph leaves the screen, so the reader never sees the finished text.',
    },
  ],

  pitfalls: [
    'Splitting text before the webfont has loaded. Character boxes are measured against the fallback face, so widths and line breaks are wrong and never re-flow when the real font arrives — see `font-safe-text-split` for the `document.fonts.ready` gate and the debounced re-split this needs at scale.',
    'Treating `stagger` and `duration` as seconds. Under `scrub` they are proportions of the scroll range; a value tuned as "0.35 seconds" behaves completely differently the moment the trigger distance changes.',
    'Building a separate tween per character. That is one ScrollTrigger per character on a paragraph of two hundred, and refresh cost becomes visible on resize. A single staggered tween is one trigger.',
    'Leaving the character spans exposed to assistive technology. A screen reader announces every letter individually — `aria-label` on the paragraph plus `aria-hidden` on the spans is not optional here.',
    'Setting the resting opacity from `gsap.set` in the effect. The first paint then shows the paragraph at full strength before dimming it, which is a visible flash on every load.',
    'Splitting straight to characters with no word boxes. Line breaks land inside words and the paragraph becomes unreadable at narrow widths.',
    'Forgetting `scroller` when the paragraph lives in an `overflow-y-auto` panel. ScrollTrigger measures the window instead and the reveal fires at the wrong scroll position or not at all.',
  ],

  notes: [
    'The split is declarative JSX, deliberately: GSAP `SplitText` is reserved for the two components whose subject *is* SplitText (`nested-splittext-restore`, `font-safe-text-split`). Here a React split gives the same per-character targets with no DOM mutation and no extra dependency for the consumer.',
    'Opacity on `currentColor` rather than a literal colour tween, so the component is correct in any theme without a per-context variant.',
  ],

  apiSignature:
    'function ScrubCharColorReveal(props: { text: string; dim?: number; stagger?: number; charDuration?: number; scrub?: number; start?: string; end?: string; scroller?: Element | null; className?: string }): JSX.Element',

  props: [
    { name: 'text', type: 'string', description: 'Body copy. Split to words then characters in JSX.' },
    { name: 'dim', type: 'number', default: '0.16', description: 'Resting strength of an unrevealed character, 0-1.' },
    { name: 'stagger', type: 'number', default: '0.1', description: 'Timeline units between adjacent characters.' },
    { name: 'charDuration', type: 'number', default: '0.35', description: 'Timeline units for one character to resolve.' },
    { name: 'scrub', type: 'number', default: '0.75', description: 'Seconds of catch-up between the scrollbar and the reveal.' },
    { name: 'start', type: 'string', default: "'top 78%'", description: 'ScrollTrigger `start`.' },
    { name: 'end', type: 'string', default: "'bottom 55%'", description: 'ScrollTrigger `end`.' },
    { name: 'scroller', type: 'Element | null', default: 'null', description: 'Scroll container, when the text is not in the document scroller.' },
    { name: 'className', type: 'string', description: 'Merged onto the paragraph via `cn`.' },
  ],

  reducedMotion:
    'The resting opacity collapses to 1 in the JSX, so the paragraph renders fully resolved, and the effect returns before registering ScrollTrigger. The text is never left dim waiting for a scroll that will not drive it.',

  cleanup:
    '`ctx.revert()` on the `gsap.context` scoped to the paragraph. That kills the staggered tween, disposes the ScrollTrigger instance so it stops measuring a detached node, and strips the inline `opacity` GSAP wrote — leaving React\'s own inline dim value intact.',

  acceptance:
    'Scroll the paragraph up through the viewport: characters brighten in a soft front sweeping left to right and top to bottom, and the front position tracks the scrollbar rather than a clock. Scroll back up and it reverses. Turn on a screen reader and the paragraph is announced once as whole sentences, not letter by letter. With reduced motion enabled the paragraph is at full strength on first paint.',

  criticalRegion: 'critical',
};

export default meta;
