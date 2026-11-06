import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'pointer-var-gradient',
  title: 'Pointer-Variable Gradient',
  category: 'cursor',
  tags: ['css', 'custom-properties', 'gradient', 'pointer', 'no-raf'],
  blurb: 'A soft glow tracks the pointer through two CSS custom properties. No rAF, no tween, no string rebuilding.',
  cost: 'css',
  motif: 'rings',

  files: [
    { path: 'registry/ui/pointer-var-gradient.tsx', type: 'registry:ui', role: 'component' },
  ],
  dependencies: [],

  summary:
    'A radial gradient declared once in CSS reads its centre from `--pointer-x` and `--pointer-y`. The pointer handler does nothing but write those two properties as percentages. There is no animation frame, no tween library and no `background` string assembled in JavaScript.',

  mechanism: [
    'The gradient — its size, colour, stops and the layer underneath it — is declared once on the element. The only thing JavaScript ever writes is two custom properties, so the style engine invalidates the paint of one gradient rather than re-parsing a `background` shorthand it has already parsed thousands of times.',
    'Values are written as percentages, not pixels. A percentage in a gradient position resolves against the element box, so the glow stays put relative to the panel across a resize with no resize listener and no recomputation — the value that was correct before the resize is still correct after it.',
    'There is deliberately no `requestAnimationFrame`. A custom-property write is not a layout read, so there is nothing to batch away from; the browser already coalesces style changes into the next paint. Wrapping this in a frame loop adds one frame of latency and buys nothing measurable.',
    'There is deliberately no tween. Smoothing the glow would mean owning a value between the pointer and the gradient, which means a frame loop, which is the cost this component exists to avoid. A 38rem glow is so diffuse that a few pixels of jitter are invisible — the smoothing would be paying for something no one can see.',
    'Leaving removes the properties rather than writing the rest position back, so the fallback declared in the inline `style` takes over and the resting position is stated in exactly one place.',
  ],

  constants: [
    {
      name: 'REST_X / REST_Y',
      value: "'50%' / '38%'",
      why: 'Where the glow sits before any pointer has been seen, and where it returns to on leave. Slightly above centre because a glow that sits dead-centre behind a headline reads as a lighting mistake, while one a little high reads as a source above the frame.',
    },
    {
      name: 'glowWidth / glowHeight',
      value: "'38rem' / '30rem'",
      why: 'Wider than tall, matching the aspect of most content blocks. Sizing in rem rather than % means the glow keeps its physical size on a small panel instead of shrinking to a hotspot — a percentage-sized gradient in a 320px preview looks like a different effect entirely.',
    },
    {
      name: 'intensity',
      value: '0.09',
      why: 'Peak accent opacity at the centre. Under ~0.05 it is indistinguishable from a gradient banding artefact; over ~0.2 it stops being ambient light and becomes a coloured blob that competes with the text it is behind.',
    },
    {
      name: 'transparent 68%',
      value: '68%',
      why: 'Where the glow reaches zero. Ending short of 100% keeps the falloff inside the gradient box so the edge is never visible as a circle boundary against the panel edge.',
    },
  ],

  pitfalls: [
    'Rebuilding the whole `background` string in JavaScript on every move. The browser re-parses every layer, including the static one, and you have moved a CSS declaration into a hot event handler where it will drift out of sync with the stylesheet.',
    'Expecting a `transition` on the gradient to smooth the leave. An unregistered custom property is an untyped token and cannot be interpolated, so the transition silently does nothing and there is no warning anywhere. Smoothing requires `@property { syntax: "<percentage>"; inherits: false; initial-value: 50% }` in a real stylesheet.',
    'Writing pixel values instead of percentages. They are correct only until the element resizes, at which point the glow is offset by however much the box changed and stays wrong until the next pointer move.',
    'Wrapping the write in `requestAnimationFrame`. It adds a frame of latency to a write that was never the bottleneck. rAF batching is for handlers that read layout; this one does not.',
    'Setting the properties on `document.documentElement` instead of the element. Every subtree that uses the same variable names then responds to a pointer that is nowhere near it, and two instances on one page fight over the same two globals.',
    'Reading `getBoundingClientRect()` and caching it. The rect is cheap here because nothing in this component writes layout, so there is no forced reflow to avoid — but a cached rect goes stale on scroll, which is the actual bug people ship trying to optimise this.',
  ],

  notes: [
    'Gated on `(pointer: fine)`. On touch no listener attaches at all: `pointermove` only fires mid-drag, so the glow would follow the finger that is scrolling and be abandoned wherever it lifted. The inline rest position remains, so touch users get a composed static gradient rather than a blank panel.',
    'No reduced-motion branch is needed and none is present. There is no animation to reduce — the glow does not move on its own, does not ease, and does not persist after the pointer leaves. It is a hover state that happens to be continuous.',
    'The glow colour is `color-mix(in oklab, var(--k-accent) N%, transparent)` so it follows the category accent and the light/dark theme without a second code path.',
    'This is the cheapest component in the cursor category. If an effect can be expressed this way it should be, and the interesting question about any pointer effect is why it cannot.',
  ],

  apiSignature:
    'function PointerVarGradient(props: { children?: ReactNode; glowWidth?: string; glowHeight?: string; intensity?: number; className?: string }): JSX.Element',

  props: [
    { name: 'children', type: 'ReactNode', description: 'Content rendered over the gradient.' },
    { name: 'glowWidth', type: 'string', default: "'38rem'", description: 'Horizontal radius of the glow, any CSS length.' },
    { name: 'glowHeight', type: 'string', default: "'30rem'", description: 'Vertical radius of the glow, any CSS length.' },
    { name: 'intensity', type: 'number', default: '0.09', description: 'Peak accent opacity at the glow centre, 0..1.' },
    { name: 'className', type: 'string', description: 'Merged onto the root container via `cn`.' },
  ],

  reducedMotion:
    'Unchanged, and intentionally so. Nothing here animates: the gradient centre tracks the pointer one-to-one with no easing, no inertia and no continuing motion after input stops. Suppressing it would remove a hover affordance rather than a motion effect.',

  cleanup:
    'Removes the two pointer listeners and removes both custom properties from the element, so a remount starts from the declared rest position rather than inheriting the last pointer location. Nothing else was ever allocated — no frame loop, no tween, no observer.',

  acceptance:
    'Move across the panel and a soft accent glow follows the pointer exactly, with no lag and no easing. Leave and it snaps back above centre. Resize the panel while the pointer is stationary and the glow stays in the same relative position rather than sliding. Open DevTools and confirm the element has exactly two inline custom properties changing and that no `background` or `background-image` value is being rewritten. On touch the glow never moves.',

  criticalRegion: 'critical',
};

export default meta;
