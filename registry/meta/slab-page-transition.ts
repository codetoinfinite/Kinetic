import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'slab-page-transition',
  title: 'Slab Page Transition',
  category: 'transition',
  tags: ['route', 'gsap', 'timeline', 'slab', 'overlay', 'directional'],
  blurb:
    'An opaque slab rises through the frame, the route changes under it, and it keeps going — nothing ever reverses.',
  cost: 'dom',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/slab-page-transition.tsx',
      type: 'registry:ui',
      role: 'component + useSlabNavigation',
    },
    { path: 'registry/hooks/use-gsap.ts', type: 'registry:hook', role: 'gsap.context + revert' },
    {
      path: 'registry/hooks/use-reduced-motion.ts',
      type: 'registry:hook',
      role: 'motion preference',
    },
  ],
  dependencies: ['gsap@^3.15.0'],
  registryDependencies: ['use-gsap', 'use-reduced-motion'],

  summary:
    'The outgoing page slides one screen height up and out while a solid slab rises from below to take its place. The route commits under the slab, the slab holds for a beat with the destination name on it, then the slab keeps travelling up and out while the new page follows it in from below. Nothing reverses direction at any point, which is the whole difference between a slab and a curtain: a curtain that drops and lifts reads as an interruption, a slab that passes through reads as travel.',

  mechanism: [
    'One paused GSAP timeline, played from zero on every navigation, covers the whole gesture. `to(content, { y: -H })` and `fromTo(slab, { y: +H }, { y: 0 })` both start at 0 and run for `duration`; a `.call()` at `duration` fires the caller\'s commit; `set(content, { y: +H })` on that same frame teleports the page below the frame; then `to(slab, { y: -H })` and `to(content, { y: 0 })` both start at `duration + hold`. Total length is `2 * duration + hold`.',
    'The midpoint commit and the content teleport happen while the slab is exactly covering the frame, so neither is ever visible. That is the only reason the page can jump from -H to +H without a flash: there is an opaque surface in front of it for the whole of that frame.',
    'Each half eases `power3.inOut` on its own rather than one tween covering the full 2H. An `inOut` across the whole travel is at its FASTEST in the middle — precisely where the slab has to look like it stopped. Two `inOut` halves meet at zero velocity, so the slab lands, holds, and leaves.',
    'Travel is measured in pixels per run — `window.innerHeight` when `position="fixed"`, `root.getBoundingClientRect().height` when `"absolute"` — through GSAP function-based values. `yPercent: -100` would be 100% of the CONTENT element\'s own height, which on a long page is the whole document, so the page would fly thousands of pixels instead of one screen.',
    '`tl.invalidate().play(0)` starts each run. `invalidate()` re-evaluates every function-based value, so a resized container or a flipped direction is picked up without rebuilding the timeline; without it the slab travels whatever height the box had when the component mounted.',
    'Direction is a sign read from a ref inside those function values, and the ref is written in `run()` before `play(0)` rather than during render. `play(0)` renders the timeline synchronously, so a direction that only landed on the next React commit would be read one frame late and the two halves would disagree about which way is out.',
    'The slab\'s parked position — `transform: translateY(100%)` — is declared in an injected stylesheet, not set from an effect. Effects run after the first paint, so a slab parked from JS is one frame of full-frame colour on mount. GSAP\'s inline transform outranks the rule while a transition runs, and when `useGsap` reverts it strips that inline value, which re-parks the slab with no extra code.',
  ],

  constants: [
    {
      name: 'SLAB_DURATION',
      value: '0.8',
      why: 'Seconds for ONE half; the full gesture is twice this plus the hold. The source ran 1 s per half and 0.8 keeps the weight while taking 0.4 s off the round trip. Under ~0.5 s the slab stops reading as a physical object and becomes a colour flash; over ~1.1 s the hold in the middle turns into a wait and people click a second nav item.',
    },
    {
      name: 'SLAB_HOLD',
      value: '0.12',
      why: 'Seconds the slab sits still at full cover. Two jobs: it is the beat in which the label is legible, and it is the margin in which React commits the destination — the commit fires at the start of the hold, so a page whose first layout costs two or three frames still finishes laying out before the slab moves off it. At 0 a heavy destination visibly settles while it is sliding in.',
    },
    {
      name: 'SLAB_EASE',
      value: "'power3.inOut'",
      why: 'Applied to each half separately. `inOut` is the only family that starts and ends at zero velocity, which is what makes the midpoint a stop rather than a peak. `power3` specifically: `power2` does not hold still long enough at the ends for the hold to read as deliberate, and `power4` spends so long near stationary that the 0.8 s feels like 1.2 s.',
    },
    {
      name: 'zIndex',
      value: '190',
      why: 'Above a custom cursor (150) and a scroll progress bar (120), both of which must be hidden during a transition, and below a preloader (200), which has to be able to sit over a slab on first load.',
    },
  ],

  pitfalls: [
    'Using `yPercent: -100` on the page wrapper. Percentage transforms resolve against the element\'s OWN height, so on a 6000 px page the wrapper travels 6000 px in 0.8 s and the screen just goes blank a frame in. The travel has to be one screen — measured in pixels, or written as the original did with an explicit `vh` unit.',
    'Reversing the slab instead of driving it through. `tl.reverse()` after the commit sends the slab back down the way it came, and the eye reads the whole thing as a mistake being undone rather than as a move. The second half is a separate forward tween to `-H`.',
    'One `power3.inOut` across the full 2H travel. That ease is at maximum speed at its own midpoint, which is exactly the frame the route changes on, so the slab appears to accelerate straight through the cover and the label is unreadable.',
    'Putting the direction flag in the `useGsap` dependency list. Every dependency change reverts the context, and `revert()` strips the inline transform GSAP is mid-way through writing — so flipping direction during a transition drops the slab back to its CSS park while it is meant to be covering, and the content swap is visible. Direction is read from a ref by function-based values instead.',
    'Parking the slab with `gsap.set` in an effect. Effects run after the first paint, so the first frame of the page is a full-frame slab. The rest position belongs in a stylesheet; GSAP overrides it from the inline style the moment it is needed.',
    'Setting the slab label through state. `setLabel()` inside the navigate handler re-renders the subtree React is about to hand to GSAP on the exact frame the timeline starts. The label is one `textContent` write on a ref, and the slab is off-frame when it happens.',
    'Letting a second click start a second run. Without the `tl.isActive()` guard a double click queues two commits and the visitor lands one page past where they aimed.',
    'Dropping the commit when the timeline is destroyed. If a prop change reverts the context mid-transition, the `.call()` never fires and the route never changes — the visitor clicked a link and stayed put. The `useGsap` cleanup flushes any pending commit.',
    'Leaving the slab clickable. A full-frame opaque div swallows the pointer for the length of the transition, and mid-transition the pointer is usually already aimed at the next nav item. It carries `pointer-events: none` and `aria-hidden`.',
  ],

  notes: [
    'In Next.js App Router: mount once in `app/layout.tsx` with `position="fixed"`, then replace nav `<Link>` elements with buttons calling `navigate(() => router.push(href), { label })`. Nothing in this file imports `next/navigation` — the commit is a callback, so the same component works under React Router or a plain `useState` page switch.',
    'The content wrapper stays in normal flow. A transform moves an element without taking it out of flow, so the page keeps its own height and the document still scrolls — which an `absolute inset-0` wrapper would break on any real page.',
    'The colour must be opaque. A translucent slab shows the content teleport at the midpoint, which is the single artefact this technique exists to hide.',
    'Browser back and forward change the route without going through `navigate()`, so they get no slab. That is correct: by the time your code hears about a history navigation it has already happened, and there is nothing left to cover.',
    'Set `direction: "down"` per navigation for anything that reads as going back — an up-nav click, a breadcrumb, a close button — and the site acquires a sense of which way the visitor is travelling for the cost of one ternary.',
  ],

  apiSignature:
    'function SlabPageTransition(props: { controller: SlabNavigation; children: ReactNode; duration?: number; hold?: number; direction?: "up" | "down"; color?: string; labelClassName?: string; position?: "fixed" | "absolute"; zIndex?: number; className?: string }): JSX.Element\nfunction useSlabNavigation(): { host: RefObject<SlabRunner | null>; navigate: (commit: () => void, options?: { label?: string; direction?: "up" | "down" }) => void }',

  props: [
    {
      name: 'controller',
      type: 'SlabNavigation',
      description: 'From `useSlabNavigation()`. The component registers its runner on it.',
    },
    {
      name: 'children',
      type: 'ReactNode',
      description: 'The current page. Swapped by the `commit` you hand to `navigate`.',
    },
    {
      name: 'duration',
      type: 'number',
      default: '0.8',
      description: 'Seconds for ONE half. The full gesture is `2 * duration + hold`.',
    },
    {
      name: 'hold',
      type: 'number',
      default: '0.12',
      description: 'Seconds the slab holds at full cover, between the halves.',
    },
    {
      name: 'direction',
      type: '"up" | "down"',
      default: '"up"',
      description: 'Default travel. Overridable per navigation via the options argument.',
    },
    {
      name: 'color',
      type: 'string',
      default: "'#000'",
      description: 'Any CSS colour. Must be opaque, or the swap shows through the slab.',
    },
    {
      name: 'labelClassName',
      type: 'string',
      description: 'Applied to the label span, so the caller owns its typography.',
    },
    {
      name: 'position',
      type: '"fixed" | "absolute"',
      default: '"fixed"',
      description: '`absolute` inside a bounded container; `fixed` for a real page transition.',
    },
    {
      name: 'zIndex',
      type: 'number',
      default: '190',
      description: 'Above the site and any custom cursor, below a preloader.',
    },
    { name: 'className', type: 'string', description: 'Merged onto the root via `cn`.' },
  ],

  reducedMotion:
    'The timeline is never played. `navigate()` calls the commit synchronously and `tl.pause(0)` resets the slab to its rest position — deliberately not a zero-duration slab, which is still one frame of full-frame colour. `pause()` suppresses callbacks, so the midpoint `.call()` cannot fire a second commit. Navigation is a hard cut straight to the destination in both directions.',

  cleanup:
    '`useGsap` reverts the `gsap.context`, which kills the timeline and strips every inline transform it wrote — restoring the slab to the parked position its stylesheet rule specifies and the page to `y: 0`. The cleanup also flushes any commit that had not fired yet, so a prop change mid-transition cannot lose a navigation. The runner registration is removed from the controller on unmount, and it is removed only if it is still the current one, so a remount cannot null out the live handle.',

  acceptance:
    'Click a nav item: the page slides up out of frame while a coloured slab rises from below, the slab pauses at full cover with the destination name on it, then continues up and out while the new page follows it in from below. The slab never travels downward on a forward navigation, and there is no frame in which old and new content are both visible. Click a nav item to the left of the current one and the whole gesture mirrors — everything travels down. Click two items in quick succession and you land on the first one you clicked, not past it. Resize the preview and navigate again: the slab still travels exactly one frame height. With reduced motion the content swaps instantly with no coloured frame in either direction.',

  criticalRegion: 'critical',
};

export default meta;
