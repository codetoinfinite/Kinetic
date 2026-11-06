import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'stroke-to-fill-hover',
  title: 'Stroke-To-Fill Hover Rows',
  category: 'text',
  tags: ['css', 'hover', 'text-stroke', 'color-mix', 'index'],
  blurb:
    'An index of outlined type where the hovered row fills in solid, drops its stroke, and steps sideways.',
  cost: 'css',
  motif: 'split',

  files: [
    {
      path: 'registry/ui/stroke-to-fill-hover.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: [],

  summary:
    'A list of large type where every row is an outline with a ghost of fill, and the hovered row materialises: the stroke drops to zero width, the fill goes to full `currentColor`, and the row steps 12px to the right while its siblings recede. The row does not light up, it becomes solid. Everything is CSS, so nothing but the compositor runs on hover.',

  mechanism: [
    'Two properties carry the effect, and they are separate on purpose: `-webkit-text-stroke-width` goes 1px to 0, and `-webkit-text-fill-color` goes from a ghost of `currentColor` to `currentColor` itself.',
    '`-webkit-text-fill-color` overrides `color` for the glyph interior only, which is what lets the outline stay at `currentColor` while the inside is nearly transparent. Doing this with `color` alone is impossible — `color` is also what `currentColor` resolves to, so fading the fill fades the stroke with it and the row just dims.',
    'The ghost is `color-mix(in oklch, currentColor var(--kx-sf-ghost, 16%), transparent)` rather than a literal `rgba`. It inherits the surrounding text colour, so one component is correct on a dark page and a light one, and mixing in oklch keeps the 16% step perceptually even instead of clumping toward black the way sRGB alpha does.',
    'The three tunables are custom properties set on the `<ul>` from props (`--kx-sf-stroke`, `--kx-sf-ghost`, `--kx-sf-nudge`), so per-instance configuration needs no extra class and no extra rule.',
    'Sibling dimming is scoped to the list\'s own hover: `.kinetic-sf-list:hover .kinetic-sf-row:not(:hover) { opacity: 0.45 }`. Scoping to the list is what makes the resting state "all rows equal" rather than "all rows dimmed".',
    'Every hover rule is duplicated for `:focus-visible`. Each row is a real `<a>` or `<button>` inside an `<li>`, so keyboard traversal produces the same state change — without it a keyboard user tabbing ten identical outlines has no idea where they are.',
    'The stylesheet is emitted once through React 19\'s `<style href precedence>` hoisting, so any number of lists on a page share one rule set.',
  ],

  constants: [
    {
      name: 'STROKE_WIDTH',
      value: '1',
      why: 'Pixels of outline at rest. At the 28-72px type this component targets, 1px is a hairline that still reads as a complete letterform; 2px starts to close up counters in tighter faces and the row looks bold rather than outlined.',
    },
    {
      name: 'GHOST',
      value: '16',
      why: 'Percent of `currentColor` mixed into the resting fill. At 0 the glyph interiors are fully transparent and the type dissolves into whatever is behind it; past ~30% the resting and hovered states are too close for the transition to register.',
    },
    {
      name: 'NUDGE',
      value: '12',
      why: 'Pixels the hovered row steps right. Enough to be unmistakable next to a static neighbour; past ~24px the row visibly leaves the left margin of the list and the alignment looks broken.',
    },
    {
      name: 'transition duration / curve',
      value: '380ms cubic-bezier(0.16, 1, 0.3, 1)',
      why: 'A strong ease-out. The row arrives quickly and settles, which matches the pointer having already stopped. A symmetric ease at this duration lags the cursor noticeably on a fast pass down a ten-row list.',
    },
    {
      name: 'sibling opacity',
      value: '0.45',
      why: 'Enough separation that the hovered row is unambiguous, while the others stay legible — dimming to 0.2 turns a browsable index into a spotlight and hides the thing the user is scanning for.',
    },
  ],

  pitfalls: [
    'Trying to build this with `color` alone. Fading the fill fades the stroke with it because `currentColor` resolves to the same value, so the row dims instead of filling.',
    'Transitioning the `-webkit-text-stroke` shorthand. Shorthands are not independently interpolable here; transition `-webkit-text-stroke-width` explicitly or the stroke snaps off in one frame while the fill glides.',
    'Hardcoding the resting fill as `rgba(255,255,255,0.16)`. The component is then wrong the moment it lands on a light background, and wrong again in an inverted section of the same page.',
    'Mixing the ghost in sRGB. The intermediate steps clump toward black, so the resting fill on a mid-tone accent looks muddy rather than faint.',
    'Dimming siblings without scoping to `.kinetic-sf-list:hover`. Every row is then permanently at 0.45 and the "recede" has nothing to recede from.',
    'Styling `:hover` and forgetting `:focus-visible`. Keyboard users get ten identical outlines and no indication of the current row, which is a genuine accessibility failure and not just a polish gap.',
    'Animating `left` or `margin-left` for the nudge. Both trigger layout on every row of a large-type index; `translate3d` stays on the compositor.',
  ],

  notes: [
    'No text splitting and no motion library: this is a state change on a whole row, so imposing a splitter or GSAP on the consumer for a CSS-cost effect would be pure overhead.',
    '`-webkit-text-stroke` is unprefixed-less by history but supported in every current engine including Firefox and Safari. There is no standards-track alternative that composites the same way.',
    'Rows render as `<a>` when `href` is given and as `<button>` otherwise, so the list is keyboard-traversable either way without a `tabIndex` hack.',
  ],

  apiSignature:
    'function StrokeToFillRows(props: { items: StrokeToFillItem[]; strokeWidth?: number; ghost?: number; nudge?: number; className?: string; onSelect?: (item: StrokeToFillItem, index: number) => void }): JSX.Element',

  props: [
    { name: 'items', type: 'StrokeToFillItem[]', description: 'Rows. Each has a `label`, an optional `meta` node for right-hand metadata, and an optional `href`.' },
    { name: 'strokeWidth', type: 'number', default: '1', description: 'Outline thickness in px at rest.' },
    { name: 'ghost', type: 'number', default: '16', description: 'Resting fill as a percentage of `currentColor`.' },
    { name: 'nudge', type: 'number', default: '12', description: 'Pixels the hovered row steps right.' },
    { name: 'className', type: 'string', description: 'Merged onto the `<ul>` via `cn`.' },
    { name: 'onSelect', type: '(item: StrokeToFillItem, index: number) => void', description: 'Called when a row without an `href` is activated.' },
  ],

  reducedMotion:
    'The stroke-to-fill swap is a state change, not motion, so it is kept in full — the hovered row still fills solid and its siblings still recede. Only the 12px lateral travel is removed, via `transform: none` in a `prefers-reduced-motion: reduce` block. The rows are never left unreadable.',

  cleanup:
    'Nothing to clean up: no effect, no listener, no timer. Unmounting removes the list; React\'s `<style precedence>` hoisting owns the shared rule set.',

  acceptance:
    'Hover a row: the outline thins to nothing as the glyph interiors fill to full colour, and the row slides 12px right while the others fade back. Tab through with a keyboard and the same state appears on the focused row. Flip the page between light and dark themes and the resting ghost fill is still faintly visible in both, without editing the component. With reduced motion enabled the fill still happens and the row does not move.',

  criticalRegion: 'critical',
};

export default meta;
