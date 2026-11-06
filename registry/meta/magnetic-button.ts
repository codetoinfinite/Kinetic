import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'magnetic-button',
  title: 'Magnetic Pointer Button',
  category: 'cursor',
  tags: ['gsap', 'pointer', 'button', 'quickto', 'micro-interaction'],
  blurb: 'A button that leans toward the cursor and springs back, with the label leading the box.',
  cost: 'dom',
  motif: 'orbit',

  files: [
    { path: 'registry/ui/magnetic-button.tsx', type: 'registry:ui', role: 'component' },
  ],
  dependencies: ['gsap@^3.15.0'],

  summary:
    'The element translates toward the pointer by a fraction of its offset from centre, and the label translates further still, so the text appears to lead the box it sits in. Release is an elastic overshoot rather than a linear return, which is the difference between "springy" and "sliding back".',

  mechanism: [
    'A window-level pointermove handler measures the pointer against the button\'s live bounding rect, not a cached one — the element is being translated by this same effect, so a rect captured on mount goes stale immediately.',
    'Inside a hit area padded past the border, the offset from centre is scaled by `strength` and pushed into four `gsap.quickTo` setters: x and y for the button, x and y for the label at `labelStrength - 1` so it moves relative to its already-moving parent.',
    'Outside that area, a single `gsap.to` with `elastic.out(1, 0.4)` and `overwrite: "auto"` returns both nodes to zero, cancelling any in-flight follow tween.',
    'Cleanup kills tweens before clearing transforms, so nothing writes to the node after React releases it.',
  ],

  constants: [
    {
      name: 'strength',
      value: '0.35',
      why: 'Fraction of pointer offset the button travels. Below ~0.2 the effect is invisible; above ~0.6 the button outruns the cursor and reads as a rendering fault rather than an affordance.',
    },
    {
      name: 'labelStrength',
      value: '1.6',
      why: 'The label moves 0.6x the button offset *on top of* the button\'s own movement. That parallax between text and border is what makes the surface feel elastic instead of rigid.',
    },
    {
      name: 'padding',
      value: '24',
      why: 'Pixels of grace beyond the border. Without it the effect engages exactly at the edge, and the button visibly jumps as it snaps into the field.',
    },
    {
      name: 'FOLLOW_DURATION',
      value: '0.35',
      why: 'quickTo duration. Short enough to feel attached to the cursor, long enough to smooth the 8-16 ms gaps between pointer events.',
    },
    {
      name: 'RETURN_DURATION',
      value: '0.6',
      why: 'Elastic return. Shorter than this and the overshoot has no room to read as a spring.',
    },
  ],

  pitfalls: [
    'Listening on the element instead of the window. `pointerleave` fires the instant the button translates out from under the cursor, so it chases itself away and stutters along the edge of its own hit area.',
    'Calling `gsap.to()` per pointermove. That allocates a fresh tween ~120 times a second and each one fights the previous for the same property. `quickTo` reuses one tween per property.',
    'Caching the bounding rect on mount. The element moves and the page scrolls; a stale centre makes the button drift further away with every pass.',
    'Skipping `overwrite: "auto"` on the return tween — the follow tween keeps running underneath and the button never actually reaches zero.',
    'Leaving the transform behind on unmount. Clear it, but kill tweens first, or an in-flight tween writes it straight back.',
  ],

  notes: [
    'Gated behind `(pointer: fine)`. On touch there is no hover, so the effect would only fire on press, which reads as a glitch.',
  ],

  apiSignature:
    'function MagneticButton(props: { children: ReactNode; strength?: number; labelStrength?: number; padding?: number; className?: string; onClick?: () => void; disabled?: boolean }): JSX.Element',

  props: [
    { name: 'children', type: 'ReactNode', description: 'Button label. Wrapped in the span that receives the parallax offset.' },
    { name: 'strength', type: 'number', default: '0.35', description: 'Fraction of the pointer offset the button travels.' },
    { name: 'labelStrength', type: 'number', default: '1.6', description: 'Label travel relative to the button. 1 disables parallax.' },
    { name: 'padding', type: 'number', default: '24', description: 'Pixels beyond the border that still count as near.' },
    { name: 'className', type: 'string', description: 'Merged onto the button element via `cn`.' },
    { name: 'onClick', type: '() => void', description: 'Standard click handler.' },
    { name: 'disabled', type: 'boolean', default: 'false', description: 'Disables the button and skips the effect entirely.' },
  ],

  reducedMotion:
    'The effect never attaches when `prefers-reduced-motion: reduce` matches. The button keeps its colour transition on hover, so it still responds — it just does not move.',

  cleanup:
    'Removes the window listener, calls `gsap.killTweensOf` on both nodes, then clears the transform with `gsap.set(..., { clearProps: "transform" })`. Kill precedes clear so no in-flight tween can restore it.',

  acceptance:
    'Approach from any side and the button leans toward the cursor with the label leading it. Leave the padded area and it springs back past zero once before settling. Unmount mid-approach and no transform remains on the node. On a touch device it does not move at all.',

  criticalRegion: 'critical',
};

export default meta;
