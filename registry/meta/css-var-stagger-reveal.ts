import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'css-var-stagger-reveal',
  title: 'CSS Variable Stagger Reveal',
  category: 'scroll',
  tags: ['intersection-observer', 'css-variables', 'stagger', 'reveal', 'zero-js-animation'],
  blurb:
    'Groups reveal as they enter their scroll container; the stagger delay is a CSS calc over an index the JS writes once.',
  cost: 'css',
  motif: 'stack',

  files: [
    { path: 'registry/ui/css-var-stagger-reveal.tsx', type: 'registry:ui', role: 'component' },
  ],
  dependencies: [],
  registryDependencies: [],

  summary:
    'A reveal system where JavaScript writes one number per element and then gets out of the way. The stagger delay is `calc(var(--kx-reveal-index) * var(--kx-reveal-step))`, so duration, travel, easing and the delay ramp all live in CSS where they can be retuned — or overridden from an unrelated stylesheet — without touching the component. The observer measures against the nearest scrollable ancestor, so the same component works inside a card, a modal, or the document.',

  mechanism: [
    'On mount the component collects `[data-reveal-group]` descendants, falling back to itself as a single group, and writes `--kx-reveal-index` as an inline custom property on each `[data-reveal]` inside each group. Index restarts at zero per group, so a second group does not inherit a delay whose beginning the reader never saw.',
    'One shipped rule computes the per-element delay: `--kx-reveal-delay: calc(var(--kx-reveal-index, 0) * var(--kx-reveal-step, 90ms))`, and both the opacity and transform transitions use it as their `transition-delay`. This is the entire stagger — there is no timeline object and no rAF loop anywhere in the component.',
    'The start state (`opacity: 0`, `translate3d(0, var(--kx-reveal-distance), 0)`) is a CSS rule rather than an inline style, so it is already in effect before hydration and there is no frame of un-hidden content.',
    'An IntersectionObserver with `threshold: 0.15` and `rootMargin: "0px 0px -8% 0px"` sets `data-kx-revealed` on the group. The negative bottom margin shrinks the observation box up from the bottom edge, so an element must be genuinely inside the container rather than merely touching its edge — without it, a reveal fires while the element is still one pixel of its own height into view.',
    'The observer `root` is resolved in three steps: an explicit `scroller` ref if given, otherwise a walk up the ancestor chain for the first element whose computed `overflow-x` or `overflow-y` is `auto`, `scroll` or `overlay`, otherwise `null`, which is the value that means the viewport. Nothing in the component references `window`, so it behaves identically in a 320 px preview card and on a full page.',
    'Revealed groups are unobserved immediately unless `repeat` is set, so a long page is not still servicing a hundred settled groups. `repeat` instead deletes the attribute on exit, and CSS runs the same transition backwards.',
  ],

  constants: [
    {
      name: 'stepMs',
      value: '90',
      why: 'Delay per index. Below ~50 ms the elements read as arriving together and the stagger is wasted; above ~140 ms a group of six takes over three quarters of a second to finish and the last line is still moving after the eye has reached it.',
    },
    {
      name: 'durationMs',
      value: '700',
      why: 'Per-element transition duration, roughly 8x the step. Keeping duration well above step is what makes the group overlap into one motion rather than resolve as six separate events.',
    },
    {
      name: 'distance',
      value: '28px',
      why: 'Travel. Small enough that the text never leaves its own line box — a reveal that starts 100 px down reads as an element flying in from elsewhere, which fights the impression that the content was always there.',
    },
    {
      name: 'ease',
      value: 'cubic-bezier(0.22, 1, 0.36, 1)',
      why: 'An ease-out-quint. Nearly all of the travel happens in the first third, so the element appears to arrive and settle rather than to decelerate the whole way. A symmetric ease-in-out on a reveal always reads as slow.',
    },
    {
      name: 'threshold',
      value: '0.15',
      why: 'Fraction of the group that must be visible. At 0 the reveal fires on a single pixel of intersection, which for a tall group means the stagger completes before the content is on screen. Past ~0.4 a group taller than the container can never satisfy it and never reveals at all.',
    },
    {
      name: 'rootMargin',
      value: '0px 0px -8% 0px',
      why: 'Shrinks the observation box 8% up from the bottom, so the element is genuinely inside the container before it fires. Positive values here are the usual mistake: they fire the reveal below the fold and the user scrolls onto content that has already finished animating.',
    },
  ],

  pitfalls: [
    'Writing the delay as an inline `transition-delay` per element. It works, and it moves the choreography into JavaScript where a designer cannot reach it and a stylesheet cannot override it. The point of the index-as-custom-property indirection is that JS contributes a number and CSS owns every unit.',
    'Numbering targets across the whole scope instead of per group. The second group starts at index 6 and sits at a 540 ms delay, so the reader watches nothing happen for half a second after it enters view.',
    'Assuming the scroll container is the window. Inside any `overflow-y: auto` panel, an observer with `root: null` compares against the viewport: everything in the panel is "in view" from the start, so the entire page reveals at once on mount and never staggers again.',
    'Testing `scrollHeight > clientHeight` when hunting for the scroll parent. A panel that has not overflowed yet is still the container the reveal will live inside once content arrives; rejecting it picks the document and fires everything at once.',
    'Putting the hidden start state in an inline style set from an effect. The server-rendered markup then paints visible, hides on hydration, and animates — a flash of correct content followed by a reveal, which is worse than no reveal.',
    'Shipping a hidden-by-default rule with no escape hatch for a document that never runs scripts. `@media (scripting: none)` restores opacity and transform; without it the page is simply blank for anyone who has JS off.',
    'Leaving the observer connected. It keeps a strong reference to every observed group, so an unmounted section is still measured on every scroll of the container that outlived it.',
    'Adding only `[data-kx-revealed] [data-reveal]` as the revealed selector. When the scope declares no groups, the marker lands on the scope element itself, which is not a descendant of itself — so the reveal silently never applies.',
  ],

  notes: [
    'Every knob is a custom property, which means a consumer can retune the whole system from any ancestor: `--kx-reveal-step`, `--kx-reveal-duration`, `--kx-reveal-distance`, `--kx-reveal-ease`. The props are conveniences that write those same properties onto the scope element.',
    'This is the CSS-owned sibling of the GSAP reveal systems in the registry. Choose this one when the choreography is a fade-and-rise and the value is that a designer can retune it; choose a GSAP builder when the reveal needs scrubbing, a per-element timeline, or to be measured against a horizontal container animation.',
    'The observer watches groups, not individual elements. A group that is taller than its container reveals when 15% of it is visible — if a section is very tall, wrap the parts you want revealed separately in their own `data-reveal-group`.',
  ],

  apiSignature:
    'function CssVarStaggerReveal(props: { children: ReactNode; scroller?: RefObject<HTMLElement | null>; stepMs?: number; durationMs?: number; distance?: string; ease?: string; threshold?: number; rootMargin?: string; repeat?: boolean; className?: string }): JSX.Element',

  props: [
    { name: 'children', type: 'ReactNode', description: 'Mark groups with `data-reveal-group` and targets with `data-reveal`. A scope with no groups is treated as one group.' },
    { name: 'scroller', type: 'RefObject<HTMLElement | null>', description: 'Scroll container for the observer. Omit and the nearest scrollable ancestor is found by walking computed overflow.' },
    { name: 'stepMs', type: 'number', default: '90', description: 'Milliseconds of delay per index step. Written as `--kx-reveal-step`.' },
    { name: 'durationMs', type: 'number', default: '700', description: 'Transition duration. Written as `--kx-reveal-duration`.' },
    { name: 'distance', type: 'string', default: "'28px'", description: 'Starting vertical offset, any CSS length. Written as `--kx-reveal-distance`.' },
    { name: 'ease', type: 'string', default: "'cubic-bezier(0.22, 1, 0.36, 1)'", description: 'Timing function. Written as `--kx-reveal-ease`.' },
    { name: 'threshold', type: 'number', default: '0.15', description: 'Fraction of a group that must be visible before it reveals.' },
    { name: 'rootMargin', type: 'string', default: "'0px 0px -8% 0px'", description: 'Observation box inset. The negative bottom means "genuinely in view".' },
    { name: 'repeat', type: 'boolean', default: 'false', description: 'Re-hide groups that leave the container. Off by default, which also lets settled groups be unobserved.' },
    { name: 'className', type: 'string', description: 'Merged onto the scope element.' },
  ],

  reducedMotion:
    'A `@media (prefers-reduced-motion: reduce)` block in the shipped rule set resolves every target to its END state — `opacity: 1`, `transform: none`, `transition: none` — so the content is simply present, with no travel and no delay ramp to sit through. The observer still runs and still sets `data-kx-revealed`, so anything else keyed off that attribute keeps working; it just has nothing to transition.',

  cleanup:
    '`observer.disconnect()` in the effect teardown, which releases the observer\'s references to every group. The inline `--kx-reveal-index` properties and the `data-kx-revealed` attributes live on nodes React owns and are discarded with them. There is no rAF, no listener and no timer to cancel — the hoisted `<style>` is reference-counted and removed by React when the last instance unmounts.',

  acceptance:
    'Scroll the container: each group\'s children rise and fade in one after another, about 90 ms apart, and the group does not start until it is genuinely inside the box rather than touching its bottom edge. Inspect a revealed child and its computed `transition-delay` equals index x 90 ms. Set `--kx-reveal-step: 200ms` on any ancestor in dev tools and the stagger widens immediately with no re-render. With reduced motion on, everything is already visible and in place. Unmount the scroller and no observer callbacks fire.',

  criticalRegion: 'critical',
};

export default meta;
