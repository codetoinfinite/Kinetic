import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'blend-difference-cursor',
  title: 'Blend-Difference Cursor',
  category: 'cursor',
  tags: ['gsap', 'quickto', 'mix-blend-mode', 'cursor', 'pointer', 'hover'],
  blurb: 'A white dot in difference blend mode inverts whatever it crosses, growing 16 to 44 to 150px on hover.',
  cost: 'dom',
  motif: 'rings',

  files: [
    {
      path: 'registry/ui/blend-difference-cursor.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['gsap@^3.15.0'],

  summary:
    'A white circle replaces the pointer and inverts everything under it via `mix-blend-mode: difference`, so it is legible over any background without a single contrast rule. It has three sizes — 16px idle, 44px over a link, 150px over a `data-cursor="view"` target, the last carrying a text label — and the size change is CSS while the position is GSAP, deliberately kept on different properties.',

  mechanism: [
    'Difference blending subtracts the backdrop from the source per channel. A pure white source therefore outputs `1 - backdrop`: black over white, white over black, the complement over any colour. That is the entire contrast strategy — no theme awareness, no luminance sampling, no per-section overrides.',
    'Position is two `gsap.quickTo` setters created once, each backed by a single tween whose end value is mutated per event. At 0.32s with `power3` the dot trails the pointer by a few frames — enough to read as a physical object, short enough that clicking still feels direct.',
    '`xPercent: -50, yPercent: -50` centres the dot on its own box once at mount, so the handler can pass raw pointer coordinates and, critically, the centring survives the width and height changing from 16px to 150px. A pixel offset would have to be recomputed for every size.',
    'Size transitions list `width`, `height` and `background-color` explicitly. `transform` is excluded because GSAP writes it every frame; a CSS transition on the same property would interpolate toward a value GSAP has already replaced, and the result is a cursor that lags by a constant distance no tween duration accounts for.',
    'Hover state is resolved by hit-testing `e.target.closest(...)` on each move rather than binding listeners to interactive children. React can add, remove and reorder those children freely and the cursor keeps working, with no subscription bookkeeping.',
    'The dot is `display: none` in markup and only switched to `flex` after the `(pointer: fine)` check passes, so nothing renders before JS confirms there is a cursor to replace — no stray blob flashes during hydration on a phone.',
  ],

  constants: [
    {
      name: 'SIZE_IDLE / SIZE_HOVER / SIZE_VIEW',
      value: '16 / 44 / 150',
      why: '16px reads as a cursor rather than a dot of dust. 44px is roughly the tap-target minimum and clearly signals "this is interactive" without hiding the word underneath. 150px is enormous on purpose: it has to hold a 15px label with breathing room, and at that size the inverted region becomes a design element rather than a pointer.',
    },
    {
      name: 'FOLLOW_DURATION',
      value: '0.32',
      why: 'Seconds of catch-up. Below ~0.15 the dot is welded to the pointer and the blend looks like a rendering artefact; above ~0.5 clicking feels disconnected because the visual lands after the press.',
    },
    {
      name: "ease: 'power3'",
      value: 'power3 (in-out)',
      why: 'In-out rather than `.out`. quickTo remutates the end value continuously, so the tween is always restarting mid-flight; the symmetric curve absorbs direction changes instead of snapping into a fresh outward ramp on every event.',
    },
    {
      name: 'size transition timing',
      value: '0.4s cubic-bezier(0.22, 1, 0.36, 1)',
      why: 'A strong ease-out. The dot reaches most of its new size in the first ~120ms so the hover feels instant, then settles. Linear at this scale looks mechanical; a longer duration means the dot is still growing when the pointer has left the target.',
    },
    {
      name: 'label scale',
      value: '0.5 -> 1',
      why: 'The label grows with the dot rather than fading in at full size, so at the halfway point of the transition the text is proportionate to the circle around it instead of overflowing it.',
    },
  ],

  pitfalls: [
    'An ancestor that creates a stacking context. A `transform`, `filter`, `opacity` below 1, `will-change`, `isolation: isolate`, `contain: paint`, a `position: fixed` parent or a `backdrop-filter` anywhere between the intended blend root and the dot silently confines the blend to that subtree — the dot inverts its immediate parent and nothing else. This is the single most common reason this effect "does not work", and it produces no error, no warning and no console output.',
    'Transitioning `all` on the dot. It catches `transform`, which GSAP is writing at 60-120fps, and CSS interpolates toward values that are already stale. The cursor then trails the pointer by a fixed distance that changing the tween duration does not fix, because the tween is not the thing lagging.',
    'Scaling instead of resizing. `scale()` is a transform, so it collides with the follow tween AND it scales the label\'s stroke weight and letter-spacing along with the circle. Animating `width`/`height` keeps typography at its designed size.',
    'Listening for `pointermove` on the dot itself. It sits under the pointer, so it receives its own `pointerleave` as it slides, and the cursor chases itself out of the panel. Listen on the container and keep `pointer-events: none` on the dot.',
    'Hiding the native cursor from CSS. A `cursor: none` rule applies on touch devices too, where this component renders nothing to replace it, so links become untappable-looking with no visible affordance. Set it from JS after the `(pointer: fine)` check and restore it on cleanup.',
    'Centring with a negative margin instead of `xPercent`/`yPercent`. The margin is a fixed pixel value and the dot changes size by a factor of nine, so it visibly slides off the pointer as it grows.',
    'Leaving the effect on over navigation. A 150px inverted blob over link text is genuinely worse than an arrow; a real deployment needs an escape hatch that restores the native cursor over the nav.',
    'Using a theme token for the dot colour. Difference blending only produces a clean inversion from pure white; a near-white token yields a muddy tint over mid-greys.',
  ],

  notes: [
    'Gated on `(pointer: fine)`. On touch nothing mounts, the native cursor is never hidden, and the markup stays `display: none` — there is no hover to grow into and `pointermove` only exists mid-drag, which would put the dot under the finger already covering it.',
    'Scoped to its own container with `position: absolute` inside a `relative isolate` root rather than `position: fixed`. A production site-level cursor is `fixed` at the document root; the isolate here is what makes the blend stop at the component edge instead of inverting the whole page.',
    'Reduced motion keeps the cursor but sets every duration to 0, so the affordance and the inversion survive while the drift does not.',
    'The label is `#000` and the dot `#fff` as raw literals, not tokens. Difference blending is defined on the actual channel values; a token would break the inversion the moment the theme shifted.',
  ],

  apiSignature:
    'function BlendDifferenceCursor(props: { children?: ReactNode; label?: string; className?: string }): JSX.Element',

  props: [
    { name: 'children', type: 'ReactNode', description: 'Content the cursor inverts. Mark targets with `data-cursor="view"` or use plain `a`/`button`.' },
    { name: 'label', type: 'string', default: "'View'", description: 'Text shown inside the 150px state. Must fit at 15px inside the circle.' },
    { name: 'className', type: 'string', description: 'Merged onto the root container via `cn`.' },
  ],

  reducedMotion:
    'The cursor still appears, still inverts and still changes size — those are affordances, not motion. Both quickTo durations drop to 0 so the dot is welded to the pointer, and the fade in and out is instant. The CSS size transition is left in place; it is a 400ms state change, not continuous movement.',

  cleanup:
    'Removes both container listeners, restores the container\'s original inline `cursor` value, resets the dot to `display: none`, then `gsap.killTweensOf` and `clearProps: "all"` to drop the two quickTo tweens and the centring transform. Nothing is left on the element for a remount to inherit.',

  acceptance:
    'Move across the panel and a white dot follows a few frames behind, inverting the text and background under it — dark text goes light where the dot crosses it. Hover a link and it grows to 44px; hover a `data-cursor="view"` target and it grows to 150px with a label that scales up inside it. During the growth the dot stays centred on the pointer and never lags further behind than it did at rest. Leave the panel and it fades out. On touch there is no dot at all and the native cursor is untouched.',

  criticalRegion: 'critical',
};

export default meta;
