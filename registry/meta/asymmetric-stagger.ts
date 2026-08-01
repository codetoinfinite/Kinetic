import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'asymmetric-stagger',
  title: 'Asymmetric In/Out Staggers',
  category: 'transition',
  tags: ['gsap', 'stagger', 'list', 'enter-exit', 'choreography'],
  blurb: 'A list that arrives item by item after a hold and leaves twice as fast, from the last row backwards.',
  cost: 'dom',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/asymmetric-stagger.tsx',
      target: 'components/motion/asymmetric-stagger.tsx',
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
      role: 'motion preference',
    },
  ],
  dependencies: ['gsap@^3.15.0'],
  registryDependencies: [],

  summary:
    'A list whose entrance and exit are deliberately different animations. In: 24px up, 0.5s each, 0.06s apart, after a 0.25s hold that lets the outgoing view clear. Out: 16px up, 0.3s each, 0.03s apart, running from the last item back to the first. The exit is roughly half the total time of the entrance, which is what makes a view swap feel responsive without making the arrival feel rushed.',

  mechanism: [
    'Every direct child is wrapped in a `[data-stagger-item]` div, so the caller writes ordinary list markup and the component owns the animated node — no cloneElement, no required ref forwarding.',
    'Entering runs `gsap.fromTo(items, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: "power2.out", stagger: 0.06, delay: 0.25 })`. The delay is not decoration: it is the window in which whatever this list replaces finishes leaving.',
    'Leaving runs `gsap.to(items, { autoAlpha: 0, y: -16, duration: 0.3, ease: "power2.in", stagger: { each: 0.03, from: "end" } })`. Halving the stagger and reversing its origin is what stops the exit from reading as the entrance rewound.',
    '`autoAlpha` rather than `opacity`: at zero it also writes `visibility: hidden`, so a faded row cannot swallow a click aimed at the view underneath it.',
    'Both tweens carry `overwrite: "auto"`, and the whole thing lives in a `useGsap` context keyed on `show`, so toggling twice in quick succession cancels the in-flight direction instead of layering two opposing tweens on the same nodes.',
    'A layout effect hides the items before first paint when the component mounts closed, and an internal `hasShown` flag makes sure `onExited` can only fire after a real entrance.',
  ],

  constants: [
    {
      name: 'inStagger',
      value: '0.06',
      why: 'Seconds between arriving items. Below ~0.04 a five-item list reads as one block; above ~0.1 the last row lands well after the eye has moved on and the list feels slow to load.',
    },
    {
      name: 'outStagger',
      value: '0.03',
      why: 'Half the entrance value. Exits are acknowledgement, not presentation — the wave still reads as a direction, but the whole list is gone in under 200ms.',
    },
    {
      name: 'inDelay',
      value: '0.25',
      why: 'Seconds of hold before the first item arrives. Sized to the outgoing view\'s own fade (~0.3-0.4s) so the two never overlap; at 0 both views are half-opaque at the same time and the frame looks like a rendering bug.',
    },
    {
      name: 'inDuration / outDuration',
      value: '0.5 / 0.3',
      why: 'Per-item. The exit is shorter for the same reason its stagger is: nobody is reading rows that are leaving.',
    },
    {
      name: 'inDistance / outDistance',
      value: '24 / 16',
      why: 'Pixels. The entrance comes up from below (from where the content is arriving); the exit continues upward and travels less, because a long exit path is time spent watching nothing.',
    },
    {
      name: "stagger.from",
      value: "'end'",
      why: 'Reverses the exit wave. Same-direction staggers make the exit look like a backwards entrance; from the end it looks like the list is being pulled off the screen.',
    },
  ],

  pitfalls: [
    'Reusing the entrance timeline with `reverse()`. That gives you power2.out played backwards (so it decelerates into nothing), the entrance delay stranded at the end, and the same stagger direction — three separate reasons the exit feels heavy.',
    'Unmounting the list when `show` flips false. React removes the nodes on the same frame, so the exit never runs; the component stays mounted and reports completion through `onExited`.',
    'Animating `opacity` alone. A finished row sits at opacity 0 with full hit area and eats clicks intended for the view underneath. `autoAlpha` writes `visibility: hidden` at zero.',
    'Omitting `overwrite: "auto"`. Toggling twice inside 300ms leaves the entrance tween running under the exit tween, and the rows settle at whatever opacity the two happen to agree on.',
    'Setting the initial hidden state in a passive effect. Mounting with `show={false}` paints the list once, then hides it — a visible flash of content that was never meant to be seen. It is set in `useLayoutEffect` instead.',
    'Firing `onExited` on mount. With `show={false}` at mount there is nothing to exit, and under StrictMode the double-invoked effect would call it twice; a `hasShown` flag gates it.',
  ],

  notes: [
    'The same numbers apply outside lists — modals, drawers, route content. Any pair of entrance/exit values that are equal is worth questioning.',
    'App Router wiring: drive `show` from a pathname comparison in a layout, and do the actual `router.push` from `onExited` if you want the route to change only once the list has gone.',
  ],

  apiSignature:
    'function AsymmetricStagger(props: { children: ReactNode; show: boolean; inStagger?: number; outStagger?: number; inDelay?: number; inDuration?: number; outDuration?: number; inDistance?: number; outDistance?: number; onExited?: () => void; className?: string; itemClassName?: string }): JSX.Element',

  props: [
    { name: 'children', type: 'ReactNode', description: 'List items. Each direct child is wrapped and animated on its own.' },
    { name: 'show', type: 'boolean', description: 'True enters, false exits. The component stays mounted through both.' },
    { name: 'inStagger', type: 'number', default: '0.06', description: 'Seconds between entering items.' },
    { name: 'outStagger', type: 'number', default: '0.03', description: 'Seconds between leaving items.' },
    { name: 'inDelay', type: 'number', default: '0.25', description: 'Hold before the entrance, sized to the outgoing view.' },
    { name: 'inDuration', type: 'number', default: '0.5', description: 'Per-item entrance length in seconds.' },
    { name: 'outDuration', type: 'number', default: '0.3', description: 'Per-item exit length in seconds.' },
    { name: 'inDistance', type: 'number', default: '24', description: 'Pixels travelled on the way in.' },
    { name: 'outDistance', type: 'number', default: '16', description: 'Pixels travelled on the way out.' },
    { name: 'onExited', type: '() => void', description: 'Called once the last item has left. Safe place to unmount the data.' },
    { name: 'className', type: 'string', description: 'Merged onto the flex column wrapper.' },
    { name: 'itemClassName', type: 'string', description: 'Merged onto every generated item wrapper.' },
  ],

  reducedMotion:
    'No travel and no stagger. Items are set to their visible or hidden state in one `gsap.set`, and `onExited` still fires, so the surrounding state machine behaves identically — only the choreography is dropped.',

  cleanup:
    '`useGsap` reverts the context on unmount and on every `show` change, killing both tweens and restoring the inline styles GSAP wrote. `onExited` is held in a ref so a completion callback cannot reach a stale closure after the parent has re-rendered.',

  acceptance:
    'Switch to the list: the previous view fades, a quarter-second of nothing, then rows arrive top to bottom. Switch back: the bottom row leaves first and the whole list is gone in about half the time it took to arrive. Toggle rapidly and rows never settle at a partial opacity.',

  criticalRegion: 'critical',
};

export default meta;
