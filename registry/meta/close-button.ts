import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'close-button',
  title: 'Close Button',
  category: 'action',
  kit: 'boardui',
  tags: ['button', 'dismiss', 'close', 'icon', 'boardui'],
  blurb:
    'Circular dismiss button in four sizes whose X is redrawn per size, so the stroke is a true 1.6 to 2.5px at every scale.',
  cost: 'css',
  motif: 'rings',

  files: [
    {
      path: 'registry/ui/close-button.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: [],

  summary:
    'The small round "X" that dismisses announcements, toasts, modals and drawers. It ships its own glyph instead of taking an icon: each size draws its X as two round-capped lines in an SVG whose viewBox equals its pixel size, so `strokeWidth` is a literal CSS pixel value instead of a scaled approximation. The circle is a tertiary fill, and hover darkens only the glyph.',

  mechanism: [
    'Three lookup tables keyed by size drive the glyph: `GLYPH_SIZE` (the X\'s bounding square in px), `STROKE_WIDTH` (line weight in px) and `GLYPH_INSET` (how far the line ends sit in from the square\'s corners).',
    'The SVG is `width = height = glyph` with `viewBox="0 0 glyph glyph"`, so one user unit is one CSS pixel. The two diagonals go from `(inset, inset)` to `(glyph − inset, glyph − inset)` and mirrored, with `strokeLinecap="round"` so the caps add half a stroke beyond each end.',
    'Scaling one shared icon would scale its stroke with it: a 2px line drawn for 20px becomes about 3.2px at 32px. Redrawing per size keeps 2px at xs and sm and lets md deliberately step up to 2.5px so it holds its own in a modal header.',
    'The container is a `rounded-full` square (`size-4/5/6/8`) on `background-tertiary-default`. The glyph uses `currentColor`, so `hover:text-text-primary` darkens the X while the circle stays put, transitioning colour over 150ms.',
    '`aria-label` is required by the props type and the SVG is `aria-hidden`. `type` defaults to `"button"` so a close button inside a form dialog does not submit it.',
  ],

  constants: [
    {
      name: 'GLYPH_SIZE',
      value: '2xs 6.8 / xs 10.8 / sm 12.6 / md 16.2 px',
      why: 'xs, sm and md are 90% of the natural 12 / 14 / 18px glyphs for 20, 24 and 32px circles; at full size the X crowds the circle edge, and 10% smaller reads as centred with breathing room. 2xs takes its 6.8px straight from the compact Figma variant.',
    },
    {
      name: 'STROKE_WIDTH',
      value: '2xs 1.6 / xs 2 / sm 2 / md 2.5 px',
      why: 'Literal pixel weights from Figma. md is bolder on purpose: a 2px X inside a 32px circle looks spindly next to a modal title.',
    },
    {
      name: 'GLYPH_INSET',
      value: '2xs 0.57 / others 2 px',
      why: 'Room for the round caps to stay inside the glyph box. The 2xs value comes from Figma\'s 8px bars rotated 45° inside a 6.8px square, which leaves about 0.57px at each corner when projected onto the diagonal.',
    },
    {
      name: 'container sizes',
      value: '16 / 20 / 24 / 32 px',
      why: '2xs for compact floating chips, xs for the announcement corner, sm for toasts, md for modal and drawer headers.',
    },
  ],

  pitfalls: [
    'Replacing the hand-drawn SVG with an icon font or a single scaled icon. The stroke weight then drifts with size and the md X looks either hairline or blobby.',
    'Removing `aria-label`. The glyph is hidden from assistive tech, so the button announces as just "button" and nobody knows it closes something.',
    'Rounding the computed coordinates, for example `Math.round(glyph − inset)`. The sub-pixel values are what keep both diagonals the same length and the X optically centred.',
    'Placing it on a background that matches `background-tertiary-default`. The circle disappears and only the X remains, which reads as a smaller, unanchored target.',
  ],

  notes: [
    'Label it after what it closes ("Dismiss announcement", "Close dialog") rather than a generic "Close" when several dismissible surfaces can be on screen at once.',
  ],

  apiSignature:
    'function CloseButton(props: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & { size?: "2xs" | "xs" | "sm" | "md"; "aria-label": string; ref?: Ref<HTMLButtonElement> }): JSX.Element',

  props: [
    { name: 'size', type: '"2xs" | "xs" | "sm" | "md"', default: '"xs"', description: '16, 20, 24 or 32px circle, each with its own glyph size and stroke weight.' },
    { name: 'aria-label', type: 'string', description: 'Required. Names what the button dismisses.' },
    { name: 'type', type: '"button" | "submit" | "reset"', default: '"button"', description: 'Defaults to `button` so it never submits a surrounding form.' },
    { name: 'className', type: 'string', description: 'Merged through `tailwind-merge`, for example to absolutely position it in a corner.' },
  ],

  reducedMotion:
    'Nothing moves. Hover only darkens the glyph colour over 150ms.',

  cleanup:
    'Nothing to clean up. The component is stateless markup with no listeners, timers or effects.',

  acceptance:
    'Four circles render at 16, 20, 24 and 32px, each with a centred X whose lines look equally crisp, and the 32px X is visibly a touch bolder. Hovering darkens the X but not the circle. Tabbing shows an offset focus ring around the circle. Inside the announcement card, clicking the xs button hides the card and a restore button brings it back.',

  criticalRegion: 'critical',
};

export default meta;
