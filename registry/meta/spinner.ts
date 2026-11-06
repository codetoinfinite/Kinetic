import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'spinner',
  title: 'Spinner',
  category: 'display',
  kit: 'boardui',
  tags: ['spinner', 'loading', 'progress', 'indeterminate', 'boardui'],
  blurb: 'An orbiting light in three layers (crisp arc, tight glow, wide bloom) in five sizes and any text colour, announced as loading.',
  cost: 'css',
  motif: 'orbit',

  files: [
    {
      path: 'registry/ui/spinner.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['react-aria-components@^1.22.1'],

  summary:
    'A spinner for work of unknown length, drawn as a comet of light: the same arc at three scales (a crisp line with a rounded head, a tight glow and a wide bloom), each softer layer shorter and a few degrees behind, over a faint full-circle track. Everything paints in `currentColor`, so a text class sets the colour. `Spinner` is announced as an indeterminate React Aria progress bar labelled "Loading"; `SpinnerGlyph` is the bare visual.',

  mechanism: [
    'Look up the box and line width from `SIZES`: xs 12/1.5, sm 16/2, md 20/2, lg 24/2.5, xl 32/3 px. Render a `relative inline-flex shrink-0 text-accent-500` span at that box size.',
    'If `track` is on, draw the full circle as an `absolute inset-0 rounded-full border-current opacity-15` span with `borderWidth: line`.',
    'Each `Arc` paints `conic-gradient(transparent ${360 - arc}deg, currentColor 360deg)` so the arc ends at 12 o\'clock, then masks it to a ring with a `radial-gradient` that is opaque between `center ± width/2` (with `center = box/2 - line/2`). Its wrapper is grown by `bleed = max(0, outer + blur*2 - box/2)` on every side so the blur never clips, then gets `filter: blur()`, `opacity` and `rotate: -lag deg`.',
    'Stack three arcs inside one `animate-spin [animation-duration:900ms]` layer: bloom (width line×4, blur line×1.6, opacity 0.32, 110°, 22° behind), glow (width line×2, blur line×0.6, opacity 0.6, 200°, 9° behind) and crisp (width line, no blur, opacity 1, 290°, 0°). The shorter, lagging soft layers make the glow gather just behind the sharp head.',
    'Finish the head with a `line × line` `rounded-full bg-current` dot at `left-1/2 top-0` (`translate: -50% 0`), the leading end of the crisp arc.',
    '`Spinner` wraps the glyph in React Aria\'s `<ProgressBar isIndeterminate aria-label="Loading">`, giving it `role="progressbar"`. With `aria-hidden` it returns the bare `SpinnerGlyph`, for when a parent control already announces the wait.',
  ],

  constants: [
    {
      name: 'SIZES',
      value: 'xs 12/1.5, sm 16/2, md 20/2, lg 24/2.5, xl 32/3 (box/line px)',
      why: 'Sm and md match the kit\'s 16px and 20px icon slots, so a spinner can replace a button icon without changing the button height. Line width grows slower than the box so small spinners do not turn into solid discs.',
    },
    {
      name: 'layers',
      value: 'bloom 4×line, blur 1.6×line, 0.32, 110°, lag 22° / glow 2×line, blur 0.6×line, 0.6, 200°, lag 9° / crisp 1×line, 1, 290°, lag 0°',
      why: 'Shorter and later soft layers keep the bright head in front and the glow trailing like a comet\'s tail. Scaling everything by `line` keeps the look identical from 12 to 32px.',
    },
    {
      name: 'orbit',
      value: '900ms per turn; 2400ms under reduced motion',
      why: 'Under a second reads as active work. The reduced-motion orbit slows rather than stops, because a frozen spinner reads as a hang.',
    },
    {
      name: 'track',
      value: 'opacity-15 border in currentColor',
      why: 'Faint enough to sit behind the light, but it completes the circle so the 290° arc never reads as a broken ring.',
    },
  ],

  pitfalls: [
    'Do not rotate each arc separately. All three share one spinning parent; their offsets come from a static `rotate: -lag`, so the comet shape never drifts apart.',
    'Do not set the wrapper to `overflow: hidden` or trim the `bleed` inset. The blurred layers extend past the box and would be cut into a square.',
    'Do not colour it with `fill` or `stroke`. Everything paints in `currentColor`; set a text colour such as `text-white` instead.',
    'Do not leave both a busy button label and the spinner announced. Pass `aria-hidden` to the spinner inside a pending button so screen readers do not hear "Loading" twice.',
  ],

  notes: [
    'The default colour is `text-accent-500`; override it with any `text-*` class.',
    '`SpinnerGlyph` is exported for places that need the visual without the progress-bar role.',
  ],

  apiSignature:
    'type SpinnerSize = "xs" | "sm" | "md" | "lg" | "xl"\ninterface SpinnerProps { size?: SpinnerSize; track?: boolean; "aria-label"?: string; "aria-hidden"?: boolean; className?: string }\nfunction SpinnerGlyph(props: Omit<SpinnerProps, "aria-label" | "aria-hidden">): JSX.Element\nfunction Spinner(props: SpinnerProps): JSX.Element',

  props: [
    { name: 'size', type: '"xs" | "sm" | "md" | "lg" | "xl"', default: '"md"', description: '12, 16, 20, 24 or 32px box with a matching line width.' },
    { name: 'track', type: 'boolean', default: 'true', description: 'Draw the faint full circle under the light.' },
    { name: 'aria-label', type: 'string', default: '"Loading"', description: 'Accessible name of the progress bar.' },
    { name: 'aria-hidden', type: 'boolean', description: 'Render only the glyph, with no progress-bar role, when a parent already announces the wait.' },
    { name: 'className', type: 'string', description: 'Colour via a text class (default `text-accent-500`) and extra layout classes.' },
  ],

  reducedMotion:
    'The orbit keeps turning but slows from 900ms to 2400ms per revolution (`motion-reduce:[animation-duration:2400ms]`), since a stopped spinner would read as a frozen app.',

  cleanup: 'Nothing to clean up. The orbit is a CSS animation; there are no listeners, timers or effects.',

  acceptance:
    'A md spinner renders a 20px accent ring with a bright arc and rounded head turning clockwise about once every 0.9s, with a soft glow trailing behind the head and a faint full circle underneath. `className="text-white"` turns every layer white. The default spinner exposes `role="progressbar"` named "Loading" with no value; with `aria-hidden` no progressbar role is rendered. Nothing is clipped at any of the five sizes.',

  criticalRegion: 'critical',
};

export default meta;
