/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Testimonial Carousel" (boardui.com/).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'testimonial-carousel',
  title: 'Testimonial Carousel',
  category: 'block',
  kit: 'boardui',
  tags: ['testimonial', 'carousel', 'autoplay', 'landing', 'boardui'],
  blurb:
    'A centred quote carousel with faded neighbours, initials avatars, prev / next, progress dots and autoplay that pauses on hover and focus.',
  cost: 'dom',
  motif: 'trail',

  files: [
    { path: 'registry/ui/testimonial-carousel.tsx', type: 'registry:ui', role: 'component' },
  ],
  dependencies: ['@remixicon/react@^4.9.0'],

  summary:
    'A landing-page testimonial strip: a pill label, then a horizontal track where the active quote sits centred and its neighbours peek in at the edges, faded out by a mask. Each slide shows an initials avatar, the name, "role at company" with an optional link and handle, and a large quote. Below sit previous / next buttons, a row of dots whose active dot widens into a pill that fills as the autoplay timer runs, and a button to stop autoplay.',

  mechanism: [
    'Slides sit in one flex track, each `flex-basis: var(--slide)`. The section is a size container and sets `--slide` to 86% below `@2xl` and 60% from it. The track is translated by `calc((100% - var(--slide)) / 2 - var(--slide) * index)`, which centres the active slide and leaves the neighbours peeking in on both sides. Percentages resolve against the track, which is exactly as wide as the viewport.',
    'The viewport clips with `overflow-hidden` and fades both edges with Tailwind `mask-x-from-80% mask-x-to-100%` (92% when narrow), so neighbours dissolve rather than end at a hard edge. Inactive slides also drop to 40% opacity and get `inert` plus `aria-hidden`, which keeps their links out of the tab order.',
    'The autoplay timer is the active dot itself: a Web Animation grows the dot fill from `scale: 0 1` to `scale: 1 1` over `interval` ms, and its `onfinish` advances to the next slide. Pausing calls `animation.pause()`, so the remaining time is kept and the fill visibly stops.',
    'Hover (`pointerenter` / `pointerleave` on the section) and focus inside the section (`focus`, and `blur` whose `relatedTarget` falls outside) both pause it. The stop button turns autoplay off entirely; `prefers-reduced-motion` turns it off and hides that button.',
    'Navigation wraps with `((next % count) + count) % count`. Each change calls `onIndexChange`. The track uses `aria-live="off"` while autoplay is running and `"polite"` otherwise, so manual changes are announced and timed ones are not.',
    'The section carries `aria-roledescription="carousel"`; each slide is a `figure` with `role="group"`, `aria-roledescription="slide"` and an "n of N" label. Dots are buttons labelled "Show testimonial n" with `aria-current` on the active one.',
  ],

  constants: [
    { name: '--slide', value: '60% from @2xl, 86% below', why: 'Wide: 20% of each neighbour shows, enough to read as a carousel without competing with the active quote. Narrow: the quote needs nearly the full width, so only a sliver peeks in.' },
    { name: 'SLIDE_MS', value: '520', why: 'Long enough for the eye to follow a full-width slide, with an ease-out-expo curve `cubic-bezier(0.22, 1, 0.36, 1)` so it settles quickly.' },
    { name: 'interval', value: '6000', why: 'Roughly the time needed to read a two-line quote twice. WCAG 2.2.2 asks for a way to pause anything that moves for over 5 seconds, which the hover, focus and stop controls provide.' },
    { name: 'edge mask', value: 'mask-x-from-80% (92% narrow)', why: 'The fade spans the neighbour peek exactly, so neighbour text fades out towards the edge and the active slide stays fully opaque.' },
  ],

  pitfalls: [
    'Restarting a `setTimeout` on every hover leave. The countdown resets and a reader who keeps nudging the mouse never sees the next quote; pausing the animation keeps the remaining time.',
    'Animating `transform` on an element that also has a Tailwind v4 `scale-x-*` class. v4 writes the separate `scale` property, which multiplies with `transform`, so the fill would stay at 0; the animation targets `scale` instead.',
    'Leaving off-screen slides focusable. Tabbing would land on a hidden company link and scroll the track; `inert` removes them.',
    'Announcing every timed slide change. `aria-live` stays `off` while autoplay runs.',
  ],

  notes: [
    'Pass `interval={0}` for a manual-only carousel; the dots then show a solid active pill.',
    'Quotes are `ReactNode`, so a highlighted phrase can be wrapped in `<strong>`.',
  ],

  apiSignature:
    'function TestimonialCarousel(props: { items: Testimonial[]; label?: ReactNode; "aria-label"?: string; interval?: number; defaultIndex?: number; onIndexChange?: (index: number) => void; className?: string }): JSX.Element\ninterface Testimonial { id: string; quote: ReactNode; name: string; role: string; company?: string; companyHref?: string; handle?: string; initials?: string; avatarColor?: "neutral" | "blue" | "lime" | "pink" }',

  props: [
    { name: 'items', type: 'Testimonial[]', description: 'Quotes in order.' },
    { name: 'label', type: 'ReactNode', description: 'Pill text above the track.' },
    { name: 'aria-label', type: 'string', default: '"Testimonials"', description: 'Accessible name of the carousel section.' },
    { name: 'interval', type: 'number', default: '6000', description: 'Autoplay time per quote in ms; 0 disables autoplay.' },
    { name: 'defaultIndex', type: 'number', default: '0', description: 'Initially active quote (clamped to the item range).' },
    { name: 'onIndexChange', type: '(index: number) => void', description: 'Fires on every change, manual or timed.' },
    { name: 'className', type: 'string', description: 'Merged onto the section.' },
  ],

  reducedMotion:
    'Under `prefers-reduced-motion: reduce` autoplay never starts and the stop button is not rendered. The track slide, slide fade and dot width changes use `motion-reduce:transition-none`, so prev / next and dots switch instantly.',

  cleanup:
    'The dot-fill Web Animation is cancelled and its `onfinish` cleared whenever the slide, interval or autoplay state changes and on unmount, so no timer survives the component.',

  acceptance:
    'Four quotes load with the first centred and the next one faded at the right edge. The first dot is a wide pill that fills over six seconds, then the track slides to quote two. Hovering the section stops the fill where it is and no slide change happens until the pointer leaves. Next / previous wrap around the ends; clicking dot 3 jumps to quote 3 and sets `aria-current` on it. The stop button freezes autoplay and turns into a play button. With reduced motion nothing advances on its own.',

  criticalRegion: 'critical',
};

export default meta;
