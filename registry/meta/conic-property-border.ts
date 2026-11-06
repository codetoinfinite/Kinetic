import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'conic-property-border',
  title: 'Conic @property Border',
  category: 'primitive',
  tags: ['css', 'at-property', 'conic-gradient', 'border', 'zero-js'],
  blurb: 'A gradient ring that rotates around a rounded box. Two highlights chase each other; no JavaScript runs.',
  cost: 'css',
  motif: 'rings',

  files: [
    {
      path: 'registry/ui/conic-property-border.tsx',
      target: 'components/motion/conic-property-border.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: [],

  summary:
    'A rounded box wearing an animated conic-gradient border. Two bright stops travel around the ring in opposite quadrants, so the ring reads as rotating rather than blinking. The whole thing is one element and one keyframe — the only moving part is a registered custom property holding an angle, which the browser interpolates for you.',

  mechanism: [
    '`@property --kx-conic-angle { syntax: "<angle>"; inherits: false; initial-value: 0deg }` registers the custom property so the browser knows its value is an angle. An unregistered custom property is an untyped token stream: a keyframe from `0deg` to `360deg` has no interpolation rule and the value flips at the 50% mark instead of sweeping.',
    'A single keyframe block, `@keyframes kx-conic-spin { to { --kx-conic-angle: 360deg } }`, drives that property from its `initial-value` to a full turn over `--kx-conic-duration` with `linear` timing. Linear is required: any ease makes the highlights visibly hesitate once per revolution.',
    'The element carries two backgrounds. `linear-gradient(fill, fill) padding-box` paints the interior flat; `conic-gradient(from var(--kx-conic-angle), …) border-box` paints under the border. With `border: 1.5px solid transparent`, the conic layer survives the clip only in the ring, which is how the gradient follows `border-radius` — `border-image` cannot round corners.',
    'The gradient has six stops with the glow colour at 55deg and 305deg and the rest colour everywhere else. Two highlights roughly opposite each other read as rotation; a single highlight reads as a light blinking on and off once per cycle.',
    '`inherits: false` on the registration stops descendants from picking up the animating value. With inheritance on, every element in the subtree re-resolves its computed style on every frame of the animation, which turns a one-element repaint into a whole-subtree style recalculation.',
    'Every colour is read through `var(--name, fallback)`, so the component renders correctly with no props and can be re-themed by setting `--conic-glow` or `--conic-fill` on any ancestor.',
  ],

  constants: [
    {
      name: 'glow stop positions',
      value: '55deg and 305deg',
      why: 'Two highlights, not one, and not diametrically opposite. 250 degrees apart means one is entering the top edge as the other leaves the bottom, so there is always motion somewhere on the ring. At 180 degrees apart the pair reads as a symmetric pulse; with one stop it reads as a blinking dot.',
    },
    {
      name: 'durationMs',
      value: '4000',
      why: 'One revolution. Below ~2500 ms the ring reads as a loading spinner and demands attention; above ~7000 ms the highlight barely appears to move and the border looks like a static gradient someone got wrong.',
    },
    {
      name: 'thickness',
      value: '1.5px',
      why: 'Sub-pixel on a 1x display, which is what keeps it a hairline rather than a stripe. At 1px the highlight is too thin to read colour; at 3px or more the conic banding between stops becomes visible as facets.',
    },
    {
      name: 'rest colour alpha',
      value: 'currentColor at 10%',
      why: 'The dim majority of the ring. At 0% the border disappears between highlights and the box appears to lose its outline; above ~20% the contrast against the glow collapses and the rotation stops reading.',
    },
    {
      name: 'reduced-motion parked angle',
      value: '132deg',
      why: 'Puts one highlight past the top-left shoulder rather than exactly on an edge or a corner. At the `initial-value` of 0deg the highlight sits dead centre on the right edge, which looks like a rendering artefact rather than a decision.',
    },
  ],

  pitfalls: [
    'Animating the custom property without registering it with `@property`. The animation runs — `getComputedStyle` even reports it — but the gradient snaps from its start angle to its end angle at the halfway point, because an unregistered custom property interpolates as a discrete token stream. This is the single most common way this effect is reported "broken".',
    'Writing `border: 1.5px solid` with no colour, or omitting the border entirely. With no border there is no border-box area outside the padding box, the conic layer is fully covered by the fill layer, and the ring is invisible. The border must exist and must be transparent.',
    'Putting the fill layer second in the `background` list. Backgrounds paint first-listed on top; with the order reversed the flat fill is painted underneath and the conic gradient covers the entire box, not just the ring.',
    'Leaving `inherits` at its default of `true`. Descendants then inherit an animating value, so the browser recomputes styles for the whole subtree every frame. On a card with 40 children this shows up as a steady 3-5 ms of style recalculation per frame in a performance profile.',
    'Assuming the animation is compositor-driven and reaching for `will-change: transform`. It is not: animating a registered property repaints the element background on the main thread every frame. That is cheap on a button and expensive on a full-width hero — scale the element, not the hint.',
    'Using a semi-transparent interior fill. The conic layer extends under the whole border box, so anything less than opaque lets the gradient bleed through the middle of the card.',
  ],

  notes: [
    '`@property` needs Safari 16.4+, Chrome 85+, Firefox 128+. Where it is unsupported the `@property` rule is dropped, the keyframe cannot animate the custom property, and `from var(--kx-conic-angle)` falls back to the guaranteed-invalid initial value — the conic gradient still paints from 0deg. The degradation is a static two-highlight ring, which is an acceptable border on its own.',
    'The CSS ships inside the component as a `<style href precedence>` element. React 19 hoists it into `<head>` and de-duplicates by `href`, so any number of instances contribute one rule set and one `@property` registration.',
    'The class name is prefixed `kx-` rather than scoped per instance on purpose: `@property` registration is document-global, so per-instance scoping would buy nothing and cost a style element per mount.',
  ],

  apiSignature:
    'function ConicBorder(props: { children: ReactNode; durationMs?: number; thickness?: string; radius?: string; glow?: string; rest?: string; fill?: string; paused?: boolean; className?: string }): JSX.Element',

  props: [
    { name: 'children', type: 'ReactNode', description: 'Content rendered inside the ring. The element is `inline-flex`, centred.' },
    { name: 'durationMs', type: 'number', default: '4000', description: 'Milliseconds for one full revolution.' },
    { name: 'thickness', type: 'string', default: "'1.5px'", description: 'Ring thickness. Becomes the transparent border width.' },
    { name: 'radius', type: 'string', default: "'9999px'", description: 'Corner radius. The gradient follows it, unlike `border-image`.' },
    { name: 'glow', type: 'string', description: 'Colour of the two travelling highlights. Defaults to `currentColor`.' },
    { name: 'rest', type: 'string', description: 'Colour of the dim ring between highlights. Defaults to `currentColor` at 10%.' },
    { name: 'fill', type: 'string', description: 'Interior fill. Must be opaque or the gradient shows through the middle.' },
    { name: 'paused', type: 'boolean', default: 'false', description: 'Sets `animation-play-state: paused`, freezing the ring at its current angle.' },
    { name: 'className', type: 'string', description: 'Merged onto the ring element via `cn`. Use it for padding and typography.' },
  ],

  reducedMotion:
    'A `@media (prefers-reduced-motion: reduce)` block sets `animation: none` and pins `--kx-conic-angle` to 132deg. The gradient border stays — same colours, same thickness — it simply does not revolve. Nothing is removed from the layout and no size changes.',

  cleanup:
    'Nothing to clean up. There is no listener, no timer and no animation frame; unmounting the element removes the only thing that was running. The hoisted `<style>` is reference-counted by React and removed when the last instance unmounts.',

  acceptance:
    'Two bright arcs travel continuously around the border and pass the corners without pausing or jumping — in particular, nothing snaps at the halfway point of the cycle. The interior stays fully opaque. Set `paused` and the arcs freeze where they are. Enable reduced motion at the OS level and the ring is still coloured but completely still.',

  criticalRegion: 'critical',
};

export default meta;
