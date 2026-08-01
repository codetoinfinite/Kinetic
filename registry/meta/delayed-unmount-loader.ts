import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'delayed-unmount-loader',
  title: 'Delayed-Unmount Loader',
  category: 'transition',
  tags: ['loader', 'css-transition', 'unmount-delay', 'overlay', 'no-deps'],
  blurb: 'A loading overlay that stays mounted 600ms past the signal so its fade can actually play before it leaves.',
  cost: 'css',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/delayed-unmount-loader.tsx',
      target: 'components/motion/delayed-unmount-loader.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: [],
  registryDependencies: [],

  summary:
    'An inverted full-cover loading panel that fades out on a plain CSS transition. The mechanism is the timing of its own removal: when `loading` goes false the element sets `data-exit` and starts a 600ms fade, and a matching 600ms timeout is what finally unmounts it. Nothing is animated in JavaScript — one boolean, one timeout, one transition.',

  mechanism: [
    'Internal `mounted` state starts true so the overlay is present in the very first paint, before any effect has run. Deriving visibility from the `loading` prop alone is what makes the exit impossible to animate.',
    'When `loading` flips false, `data-exit="true"` lands on the element and the CSS rule `.k-dul[data-exit="true"] { opacity: 0; pointer-events: none }` takes over the transition declared on `.k-dul`.',
    'In the same effect a `setTimeout(() => setMounted(false), exitMs)` is armed. The timeout and the transition read the same `exitMs`, passed to CSS as the custom property `--k-dul-exit`, so they cannot drift apart.',
    'If `loading` goes true again — a second route, a refetch — the effect clears the pending timeout and re-arms the overlay. Because the exit is a CSS transition rather than a keyframe, an interruption mid-fade reverses from wherever the opacity had got to instead of jumping to 1.',
    'The panel is drawn with the foreground colour as its background and the background colour as its text, so the reveal reads as a tonal inversion rather than a curtain, and a single pulsing dot between two brackets is the only moving part.',
  ],

  constants: [
    {
      name: 'exitMs',
      value: '600',
      why: 'Drives both the CSS transition and the unmount timeout. Under ~350ms a full-bleed tonal flip reads as a flicker; over ~800ms the page is legible behind a veil that is still technically covering it. Whatever value you pick, the timeout must be >= the transition or the node disappears mid-fade.',
    },
    {
      name: 'pulse period',
      value: '1s',
      why: 'One cycle per second is close to a resting heart rate and reads as "alive, waiting". Faster reads as urgency and makes a slow load feel worse than it is.',
    },
    {
      name: 'pulse scale range',
      value: '0.86 -> 1',
      why: 'Small enough that the dot never appears to change its typographic size between the brackets; a larger range makes the bracket pair look mis-set.',
    },
  ],

  pitfalls: [
    'Rendering `{loading && <Loader />}`. React removes the node on the same commit that flips the flag, so the transition has no element to run on and the loader disappears on a cut. The component owns its own removal.',
    'Using a keyframe animation with `forwards` for the exit. Interrupt it by starting a second load and it snaps to the start; a transition on a class/attribute is interruptible in both directions for free.',
    'Letting the timeout and the transition duration live in different files. They drift, and either the loader is cut off mid-fade or a fully transparent overlay sits on top of the page eating clicks. One `exitMs` feeds both, and the CSS reads it from a custom property.',
    'Forgetting `pointer-events: none` in the exit state. For the whole fade the page is visible but not clickable, which reads as the site having frozen just as it finished loading.',
    'Not clearing the timeout when `loading` goes true again. The stale timer unmounts the re-armed overlay mid-load and the page flashes through underneath.',
    'Leaving the pulse running under `prefers-reduced-motion`. An indefinitely looping animation is exactly what that preference exists to stop; the media query drops it to a static dot.',
  ],

  notes: [
    'App Router wiring: render this in `app/layout.tsx` above `{children}` and drive `loading` from your own readiness state — `document.fonts.ready`, a data promise, or a route-change flag from `usePathname()`. For a first-load preloader that must never hang, use `safe-preloader` instead: this component trusts whoever owns the boolean.',
    '`position="absolute"` covers the nearest positioned ancestor instead of the viewport, which is what makes it embeddable in a card or a preview frame.',
    'The delayed-unmount pattern generalises: any exit animation on a conditionally rendered node needs the node to outlive the condition by at least the animation duration.',
  ],

  apiSignature:
    "function DelayedUnmountLoader(props: { loading: boolean; exitMs?: number; label?: string; hint?: string; position?: 'fixed' | 'absolute'; className?: string }): JSX.Element | null",

  props: [
    { name: 'loading', type: 'boolean', description: 'While true the overlay is opaque. False starts the reveal.' },
    { name: 'exitMs', type: 'number', default: '600', description: 'Fade length and unmount delay. One number drives both.' },
    { name: 'label', type: 'string', default: "'Loading experience'", description: 'Left-hand text.' },
    { name: 'hint', type: 'string', default: "'it won’t be long'", description: 'Right-hand text.' },
    { name: 'position', type: "'fixed' | 'absolute'", default: "'fixed'", description: 'Viewport cover, or cover of the nearest positioned ancestor.' },
    { name: 'className', type: 'string', description: 'Merged onto the overlay.' },
  ],

  reducedMotion:
    'The dot stops pulsing and sits at a fixed opacity, and the fade collapses to 1ms so the overlay simply disappears. The unmount delay is unchanged, and the exiting overlay is `pointer-events: none` throughout, so nothing is blocked while it waits.',

  cleanup:
    'The single timeout is cleared in the effect\'s cleanup, so a route change or an unmount during the fade cannot call `setMounted` on a component React has already released.',

  acceptance:
    'Load the page and the inverted panel is in the first paint with its dot pulsing. When loading ends the panel fades over 600ms and the node is gone from the DOM immediately afterwards — not before. Trigger a second load mid-fade and the panel returns from its current opacity rather than snapping to full.',

  criticalRegion: 'critical',
};

export default meta;
