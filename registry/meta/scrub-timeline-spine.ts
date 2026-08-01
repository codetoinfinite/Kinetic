import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'scrub-timeline-spine',
  title: 'Scrub Timeline Spine',
  category: 'scroll',
  tags: ['gsap', 'scrolltrigger', 'timeline', 'toggleactions', 'scrub', 'reversible'],
  blurb: 'A rule that fills as you scroll, with entries alternating either side and reversing on the way back.',
  cost: 'dom',
  motif: 'split',

  files: [
    {
      path: 'registry/ui/scrub-timeline-spine.tsx',
      target: 'components/motion/scrub-timeline-spine.tsx',
      type: 'registry:ui',
      role: 'component',
    },
    {
      path: 'registry/hooks/use-gsap.ts',
      target: 'hooks/use-gsap.ts',
      type: 'registry:hook',
      role: 'gsap.context lifecycle',
    },
    {
      path: 'registry/hooks/use-reduced-motion.ts',
      target: 'hooks/use-reduced-motion.ts',
      type: 'registry:hook',
      role: 'reduced-motion query',
    },
    {
      path: 'registry/hooks/use-resize-observer.ts',
      target: 'hooks/use-resize-observer.ts',
      type: 'registry:hook',
      role: 'container-width measurement',
    },
  ],
  dependencies: ['gsap@^3.15.0'],
  registryDependencies: [],

  summary:
    'A vertical rule that fills with scroll while entries alternate either side of it. Entries rest at 50% opacity rather than 0, so the animation adds emphasis to content that is already readable, and each one reverses as it leaves — so scrolling back up replays the sequence instead of showing a column of finished animations.',

  mechanism: [
    'The rule is two elements: a faint full-height track, and a fill of the same height scaled with `gsap.fromTo(fill, { scaleY: 0 }, { scaleY: 1, ease: "none" })` on a `scrub: 0.6` trigger running `top 55%` → `bottom 75%`.',
    '`transformOrigin: "top center"` is passed to the tween, not just set in CSS. GSAP writes its own transform string, and without it the fill grows from the centre and the rule appears to unroll in both directions at once.',
    'Every entry gets its own trigger with `toggleActions: "play reverse play reverse"` — the four slots are onEnter, onLeave, onEnterBack, onLeaveBack. Reversing on leave is what makes the column scrubbable upward as well as downward.',
    'Entries animate `fromTo({ opacity: 0.5, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.6, ease: "power2.out" })`. The rest state is 0.5, not 0, so nothing is gated behind a scroll event.',
    '`transformOrigin` per entry follows the side it hangs off — `left center` on the left column, `right center` on the right — so each card grows outward from the spine. A centre origin makes both columns creep toward the middle and the rule looks squeezed.',
    'Alternation is decided from the measured container width. Below `alternateAbove` px, entries stop alternating and stack to the right of a left-hand rule, and every origin becomes `left center`.',
  ],

  constants: [
    {
      name: 'restOpacity',
      value: '0.5',
      why: 'The resting state of an entry. Zero is the obvious choice and the wrong one: it makes the animation a gate on the content, so a failed script or a skipped trigger leaves a blank column, and a screen reader meets text that is visually absent. At 0.5 the animation is emphasis, not access.',
    },
    {
      name: 'restScale',
      value: '0.9',
      why: 'Paired with the opacity change so the entry gains presence rather than just brightness. Below ~0.85 the text visibly reflows as it scales and becomes hard to read mid-transition.',
    },
    {
      name: 'scrub',
      value: '0.6',
      why: 'Catch-up on the fill only. The rule keeps advancing for about half a second after the wheel stops, which reads as the timeline settling. `true` makes it feel welded to the mouse.',
    },
    {
      name: 'fillStart / fillEnd',
      value: "'top 55%' / 'bottom 75%'",
      why: 'The fill begins once the section is past halfway up the scroller and completes before its bottom clears. Ending at `bottom top` instead would leave the rule still filling while the last entry is already being read, which makes the last item feel unreached.',
    },
    {
      name: 'entryDuration',
      value: '0.6',
      why: 'Not scrubbed — this one plays on its own clock, so it must be short enough to finish before the next entry enters at normal scrolling speed.',
    },
    {
      name: 'alternateAbove',
      value: '420',
      why: 'Container width in px below which a half-width column cannot hold a title and a line of body. Measured from the element, not the window, because the spine is usually inside an article column narrower than the page.',
    },
  ],

  pitfalls: [
    '`toggleActions: "play none none none"`. The default-feeling choice, and it means scrolling back up shows a column of already-completed animations with no motion left in them. Reversing on leave is what makes the direction of travel legible.',
    'Resting entries at `opacity: 0`. The animation becomes a gate: any trigger that fails to fire — a mis-set scroller, a refresh during a resize, a JS error elsewhere — leaves the content permanently invisible while still occupying layout and still being read by assistive technology.',
    'Setting `transform-origin` only in CSS. GSAP writes a complete transform and its own `transform-origin`, so the CSS value is overwritten and the fill grows from the middle of the rule instead of the top.',
    'A single centre `transform-origin` for both columns. Cards then scale toward the spine, so the whole layout appears to pinch inward as you scroll instead of each entry growing outward from the rule.',
    'Scaling the same element that is the track. The fill needs to be a second element; scaling the visible track means the "remaining" portion disappears and the reader loses the sense of how much is left.',
    'One shared ScrollTrigger for all entries. The emphasis then depends on the section\'s progress rather than each entry\'s own position, so on a tall screen three entries brighten at once and none of them reads as current.',
  ],

  notes: [
    'The fill uses the accent token, so it inherits the category accent when placed inside a `data-category` subtree.',
    'Entries are a real `<ol>`, so the sequence is conveyed structurally and not only by the drawn rule.',
  ],

  apiSignature:
    'function ScrubTimelineSpine(props: { entries: { label: string; title: string; body?: string }[]; scrub?: number; restOpacity?: number; restScale?: number; entryDuration?: number; fillStart?: string; fillEnd?: string; entryStart?: string; alternateAbove?: number; scrollerRef?: RefObject<HTMLElement | null>; className?: string }): JSX.Element',

  props: [
    { name: 'entries', type: '{ label: string; title: string; body?: string }[]', description: 'Ordered entries. Rendered as an `<ol>` either side of the rule.' },
    { name: 'scrub', type: 'number', default: '0.6', description: 'Seconds of catch-up on the fill.' },
    { name: 'restOpacity', type: 'number', default: '0.5', description: 'Resting opacity of an inactive entry. Do not set 0.' },
    { name: 'restScale', type: 'number', default: '0.9', description: 'Resting scale of an inactive entry.' },
    { name: 'entryDuration', type: 'number', default: '0.6', description: 'Seconds for one entry to reach full emphasis.' },
    { name: 'fillStart', type: 'string', default: "'top 55%'", description: 'ScrollTrigger start for the fill.' },
    { name: 'fillEnd', type: 'string', default: "'bottom 75%'", description: 'ScrollTrigger end for the fill.' },
    { name: 'entryStart', type: 'string', default: "'top 78%'", description: 'ScrollTrigger start for each entry.' },
    { name: 'alternateAbove', type: 'number', default: '420', description: 'Container width in px above which entries alternate sides.' },
    { name: 'scrollerRef', type: 'RefObject<HTMLElement | null>', description: 'The scroll container that owns the scroll position. Omit for the document.' },
    { name: 'className', type: 'string', description: 'Merged onto the wrapper via `cn`.' },
  ],

  reducedMotion:
    'The fill is set to `scaleY: 1` and every entry to full opacity and scale during the first effect, with no triggers created. The spine renders as a completed timeline — the rule is drawn, every entry is emphasised, and nothing changes with scroll.',

  cleanup:
    '`useGsap` reverts the `gsap.context`, killing the fill tween, all per-entry tweens and all of their ScrollTriggers, and restoring the inline transform and opacity. This matters more than usual here because the alternation flip rebuilds every trigger on resize: a surviving trigger would keep writing a right-edge `transform-origin` to a card now laid out on the left.',

  acceptance:
    'Scroll down: the accent rule fills from the top and each entry brightens and grows outward from its own side of the rule as it arrives. Scroll back up and each entry dims again as it leaves the top, and the rule retreats. Stop mid-section and the fill continues for about half a second. Disable JavaScript and every entry is still readable at half opacity. Narrow the container and the entries stack to the right of a left-hand rule.',

  criticalRegion: 'critical',
};

export default meta;
