import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'ab-layer-crossfade',
  title: 'A/B Layer Ping-Pong',
  category: 'transition',
  tags: ['gsap', 'crossfade', 'hover-preview', 'double-buffer', 'opacity'],
  blurb: 'Two stacked layers alternate so any change crossfades, however fast you move between rows.',
  cost: 'dom',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/ab-layer-crossfade.tsx',
      target: 'components/motion/ab-layer-crossfade.tsx',
      type: 'registry:ui',
      role: 'component',
    },
    {
      path: 'registry/hooks/use-reduced-motion.ts',
      target: 'hooks/use-reduced-motion.ts',
      type: 'registry:hook',
      role: 'motion preference',
    },
  ],
  dependencies: ['gsap@^3.15.0'],

  summary:
    'A double buffer for DOM content. Incoming content is written into whichever of two absolutely-positioned layers is currently invisible, then the two swap opacity. Because the outgoing content is still on screen, every change is a real crossfade rather than a swap with a fade bolted on — and running two of these at different durations is how a hover preview gets its lag between thumbnail and full-bleed background.',

  mechanism: [
    'Two absolutely positioned layers share a stacking context. A `front` slot (`"a"` or `"b"`) records which one is currently visible; the other is always at opacity 0.',
    'When `contentKey` changes, the new children are written into the BACK slot and `front` flips. The back layer is already transparent, so the new content mounts invisibly — writing into the front layer instead would replace the outgoing content before it had faded.',
    '`gsap.killTweensOf([inEl, outEl])` runs before every transition. Moving across a list faster than the duration otherwise leaves an unfinished fade-out driving the same node a fade-in is now driving up, and the layers flicker.',
    'Two symmetric tweens — `opacity: 1` on the incoming layer, `opacity: 0` on the outgoing — with `power2.inOut`, which keeps the midpoint of the fade at roughly equal luminance instead of dipping through a visible trough.',
    'The first commit is a `gsap.set`, not a tween, so the initial content is simply present; only subsequent key changes animate.',
    'The last `contentKey` acted on is held in a ref, so a parent re-rendering with the same key (new inline children, a hover on the row that is already active) does not restart the fade.',
  ],

  constants: [
    {
      name: 'duration (background)',
      value: '1',
      why: 'Seconds. A full-bleed area needs a long fade or the whole frame appears to jump brightness; at 0.5s a large gradient change reads as a cut.',
    },
    {
      name: 'duration (thumbnail)',
      value: '0.6',
      why: 'The small element under the cursor answers first. Both at 1s and the interface feels unresponsive; both at 0.6s and the background flickers on fast passes. The 0.4s difference is the effect.',
    },
    {
      name: 'ease',
      value: "'power2.inOut'",
      why: 'Symmetric ease on both halves keeps their crossover near 50/50. With `power2.out` on the way in and `power2.in` on the way out, both layers are dim at the midpoint and the panel visibly darkens mid-fade.',
    },
  ],

  pitfalls: [
    'Crossfading one element by swapping its content at opacity 0. There is nothing to fade out of, so it reads as a blink; the two-layer buffer is the whole point.',
    'Writing incoming content into the front layer. The old content is replaced before it has faded, which is a hard cut with a pointless fade on top.',
    'Skipping `killTweensOf`. Hovering four rows in a second stacks eight opacity tweens across two nodes, and the layers end up at whatever the last-finishing pair leaves behind — usually both partly transparent.',
    'Giving both layers the same duration in a paired preview. The lag between the small element and the full-bleed one is what makes the interaction feel like it is answering you; without it the whole frame changes at once and reads as a page change.',
    'Restarting the fade when the parent re-renders. Any inline `children` array is a new object every render, so the effect must compare `contentKey`, not identity, or a hover crossfades continuously.',
    'Leaving tweens running past unmount. They keep writing opacity onto detached nodes; the unmount cleanup kills both layers.',
  ],

  notes: [
    'Layers hold whatever you give them — a gradient, a canvas, a `<video>`, an image. Nothing here is image-specific.',
    'Content is captured per key, so if the same key needs to show new children you must change the key. That is deliberate: it is the only way to know when a transition is warranted.',
    'App Router wiring: pass `contentKey={usePathname()}` and render the route content as children for a whole-page crossfade with no layout thrash.',
  ],

  apiSignature:
    'function ABLayerCrossfade(props: { contentKey: string; children: ReactNode; duration?: number; ease?: string; className?: string }): JSX.Element',

  props: [
    { name: 'contentKey', type: 'string', description: 'Identity of the current content. A change starts a crossfade.' },
    { name: 'children', type: 'ReactNode', description: 'Content for the current key. Captured into a layer at the moment the key changes.' },
    { name: 'duration', type: 'number', default: '1', description: 'Crossfade length in seconds. Use a shorter one for the smaller element in a pair.' },
    { name: 'ease', type: 'string', default: "'power2.inOut'", description: 'GSAP ease applied to both halves.' },
    { name: 'className', type: 'string', description: 'Merged onto the positioned wrapper. Give it a size — the layers are absolute.' },
  ],

  reducedMotion:
    'The layers still ping-pong, but the swap is a `gsap.set` rather than a tween: content changes instantly with no fade. The double-buffer structure is unchanged, so nothing else in the component behaves differently.',

  cleanup:
    'An unmount effect calls `gsap.killTweensOf` on both layer elements, so an in-flight fade cannot write opacity to a detached node after React has removed it.',

  acceptance:
    'Move down a list at a normal pace and each change is a smooth blend with no dip in brightness at the midpoint. Sweep the cursor across every row as fast as you can and the layers never flicker or settle half-faded. In a paired setup, the small preview visibly finishes before the background does.',

  criticalRegion: 'critical',
};

export default meta;
