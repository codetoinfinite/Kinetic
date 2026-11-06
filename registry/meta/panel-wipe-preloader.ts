import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'panel-wipe-preloader',
  title: 'Staggered Panel Wipe',
  category: 'transition',
  tags: ['gsap', 'preloader', 'timeline', 'counter', 'stagger'],
  blurb: 'An eased 0-100 counter, a word list and a five-column wipe, all on one timeline so they cannot drift.',
  cost: 'dom',
  motif: 'split',

  files: [
    { path: 'registry/ui/panel-wipe-preloader.tsx', type: 'registry:ui', role: 'component' },
    { path: 'registry/hooks/use-gsap.ts', type: 'registry:hook', role: 'context lifecycle' },
    { path: 'registry/hooks/use-reduced-motion.ts', type: 'registry:hook', role: 'motion preference' },
  ],
  dependencies: ['gsap@^3.15.0'],

  summary:
    'The counter, the word list and the exit wipe are three parts of a single `gsap.timeline`, not three independent animations racing each other. The number is tweened on a plain object with `power2.inOut`, so it accelerates and settles instead of ticking linearly — the difference between a loading count and a progress bar wearing a costume.',

  mechanism: [
    'A plain object `{ v: 0 }` is tweened to 100 over `countDuration` seconds. `onUpdate` writes `String(Math.round(count.v)).padStart(3, "0")` into a ref\'d span. Tweening the object rather than the DOM keeps the eased value in one place and means the number is interpolated by the same engine, on the same clock, as everything else on the timeline.',
    'The words are placed with `tl.set(wordEl, { textContent: w }, i * step)` where `step = countDuration / words.length` — for five words over 1.6 s that is one word every 320 ms. Because they are positioned on the timeline rather than scheduled with `setTimeout`, they stay locked to the counter if the timeline is retimed, paused, or seeked.',
    'When the count lands, the content block leaves on `yPercent: -120, opacity: 0` over 0.5 s with `power3.inOut`. -120 rather than -100 clears the block past its own height plus a margin, so a descender never lingers at the top edge.',
    'The five columns then retract with `scaleY: 0` and `transformOrigin: "top"`, 0.9 s of `power4.inOut`, staggered 0.08 s apart, inserted at `-=0.2` so the wipe begins while the content is still leaving. `scaleY` is a compositor-friendly transform; animating `height` here would relayout five elements every frame.',
    'The whole build runs inside `useGsap`, which wraps it in a `gsap.context` scoped to the root and calls `ctx.revert()` on unmount, so a preloader torn down mid-count leaves no inline transforms behind.',
    'Only after the timeline\'s `onComplete` fires does React set `gone` and return `null`. Unmounting on a timer instead would pull the nodes out from under running tweens.',
  ],

  constants: [
    {
      name: 'countDuration',
      value: '1.6',
      why: 'Seconds for 0 to 100. Under ~1.2 s the digits change too fast to read as a count and the word list flickers; over ~2.5 s people have already decided the site is slow.',
    },
    {
      name: 'CONTENT_DURATION',
      value: '0.5',
      why: 'Content exit. Long enough to read as a departure rather than a cut, short enough that it is finished before the panels have opened far enough to reveal what is behind it.',
    },
    {
      name: 'PANEL_DURATION',
      value: '0.9',
      why: 'Per-column retract. `power4.inOut` spends most of its time near the ends, so a shorter duration collapses the slow start and the whole wipe reads as a single instant cut.',
    },
    {
      name: 'PANEL_STAGGER',
      value: '0.08',
      why: 'Gap between columns. At 0 the five columns are one panel; past ~0.15 the last column is still standing after the first has finished, which reads as a stuck element rather than a sequence.',
    },
    {
      name: 'PANEL_OVERLAP',
      value: '0.2',
      why: 'Seconds the wipe is pulled back into the content exit. Without the overlap there is a dead beat between the number disappearing and the panels moving, and that pause is where the eye decides something has hung.',
    },
    {
      name: 'padStart(3, "0")',
      value: '3',
      why: 'Fixed three-digit width. Without it the counter changes character count at 10 and 100 and the number visibly jumps sideways twice mid-tween.',
    },
  ],

  pitfalls: [
    'Driving the counter with `setInterval` and the panels with GSAP. Two clocks, and on a loaded main thread the number finishes after the wipe has already covered it.',
    'Tweening a linear counter. It is the ease that sells the count — `power2.inOut` slows near 100, which is the shape of real work finishing.',
    'Animating panel `height` instead of `scaleY`. Five elements relayouting every frame on a page that is simultaneously mounting its real content is the one place the jank is guaranteed to be visible.',
    'Unmounting the preloader on a `setTimeout` sized to match the timeline. The two drift under load; unmount from `onComplete` instead.',
    'Leaving the preloader in the tree with `opacity: 0`. It still swallows every click on the page underneath. This returns `null`.',
    'Forgetting `transformOrigin: "top"`. The default centre origin makes the columns shrink to a band in the middle of the screen instead of retracting like a blind.',
  ],

  notes: [
    'In a Next.js App Router project this mounts once in `app/layout.tsx`, above `{children}`, and calls `onDone` to flip a context flag the hero listens to. It is deliberately not keyed to the pathname — a preloader that replays on every navigation is a bug, not a feature.',
    'If the real site has an actual load signal (fonts ready, hero image decoded), gate `onDone` on both the timeline and that promise. See `safe-preloader` for the ceiling-and-floor version of that problem.',
    'The counter is decorative. The root carries `aria-hidden`, so a screen reader is never read a number climbing to 100.',
  ],

  apiSignature:
    'function PanelWipePreloader(props: { words?: string[]; panels?: number; countDuration?: number; onDone?: () => void; position?: "fixed" | "absolute"; className?: string }): JSX.Element | null',

  props: [
    { name: 'words', type: 'string[]', default: "['Assets', 'Type', 'Shaders', 'Layout', 'Ready']", description: 'Words shown under the counter, spread evenly across the count.' },
    { name: 'panels', type: 'number', default: '5', description: 'Number of collapsing columns.' },
    { name: 'countDuration', type: 'number', default: '1.6', description: 'Seconds the counter takes to reach 100.' },
    { name: 'onDone', type: '() => void', description: 'Fires from the timeline\'s `onComplete`, after the last column has collapsed.' },
    { name: 'position', type: '"fixed" | "absolute"', default: '"fixed"', description: 'Use `absolute` inside a bounded container; `fixed` for a real full-page preloader.' },
    { name: 'className', type: 'string', description: 'Merged onto the root via `cn`.' },
  ],

  reducedMotion:
    'No timeline is built at all. The counter is written straight to 100, the last word is set, the component unmounts itself and `onDone` fires on the same tick — so a reduced-motion visitor sees the real page immediately rather than a silent panel that still has to be waited out.',

  cleanup:
    '`useGsap` runs the whole build inside a `gsap.context` scoped to the root and calls `ctx.revert()` on unmount, which kills the counter tween, the positioned `set` calls and the panel stagger, and restores every property they touched — including the span\'s original `textContent`.',

  acceptance:
    'The number counts 000 to 100 with a visible ease, never changing width. Five words swap under it at even intervals and the last word lands as the number does. The content lifts away and five columns retract upward in sequence, the wipe starting before the content has finished leaving. `onDone` fires once, after the last column. With reduced motion the preloader is gone on the first frame. Unmount mid-count and no transforms or altered text remain.',

  criticalRegion: 'critical',
};

export default meta;
