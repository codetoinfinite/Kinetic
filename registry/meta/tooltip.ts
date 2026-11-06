import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'tooltip',
  title: 'Tooltip',
  category: 'overlay',
  kit: 'boardui',
  tags: ['tooltip', 'overlay', 'hint', 'arrow', 'react-aria', 'boardui'],
  blurb:
    'Light-surface tooltip built on React Aria, with a hand-drawn caret per side and a quick blur-and-scale in and out.',
  cost: 'css',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/tooltip.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['react-aria-components@^1.22.1'],

  summary:
    'A small white card that names or explains its trigger, dressed like the kit\'s cards and dropdowns: 1px button border, 8px radius, dropdown shadow and primary text. Behaviour is React Aria\'s `TooltipTrigger` and `Tooltip` (hover and focus open it, Escape closes it, it flips on collision and wires `aria-describedby`), and the surface blurs and scales in over 200ms. The caret is one hand-drawn SVG path per side, not a rotated triangle, so it always meets the body with no gap.',

  mechanism: [
    '`TooltipTrigger` is React Aria\'s `TooltipTrigger` with `delay` and `closeDelay` both defaulting to 0, so the tooltip opens and starts closing immediately. Its single child must be focusable (a React Aria `Button`, or a plain button wrapped in `Focusable`).',
    '`Tooltip` renders `AriaTooltip` with `offset` 10 and `dir` from `useDirection()`. Its className is a function of state so a consumer function className is still honoured, and the surface is `pointer-events-none z-120 max-w-[240px] select-none rounded-lg border border-border-button-default bg-background-primary-default text-text-primary shadow-dropdown`. `pointer-events-none` means moving off the trigger always closes it and the copy cannot be selected by accident.',
    'Two size tiers: `sm` is `px-2.5 py-1.5 text-caption-1-medium` (12px), `md` is `px-3 py-2 text-body-medium rounded-2lg` (14px, 10px radius).',
    'Motion is one `transition duration-200 ease-out` on scale, filter and opacity, switched off by `motion-reduce:transition-none`. React Aria stamps `data-entering` on mount and removes it, and holds the element while `data-exiting` is set, so `data-[entering]:scale-90 opacity-0 blur-[4px]` and the matching `data-[exiting]` classes play the same transition in and out.',
    'With `showArrow` (default true), `OverlayArrow`\'s render prop gives the resolved `placement`, which picks an entry in `TOOLTIP_CARETS`: top and bottom are 12x7, left and right are 7x12, each with its own path left open on the edge touching the body (no `Z`) so only the two outer edges are stroked. The SVG is filled `fill-background-primary-default`, stroked `stroke-border-button-default`, and given a `drop-shadow(... rgb(0 0 0 / 0.05))` that falls downward (or past the tip for bottom) to match the body\'s shadow.',
  ],

  constants: [
    {
      name: 'caret boxes',
      value: '12x7 (top, bottom) / 7x12 (left, right)',
      why: 'Rotating one 12x7 SVG with CSS changes its visual footprint but not its layout box, so `OverlayArrow` would leave a ~2.5px gap on the left and right sides. A per-side path with the true width and height has no gap.',
    },
    {
      name: 'offset',
      value: '10px',
      why: 'Room for the 7px caret plus a small gap between its tip and the trigger.',
    },
    {
      name: 'motion',
      value: '200ms ease-out, scale 0.9, blur 4px, opacity 0',
      why: 'Fast enough not to delay reading, with the blur hiding the scaled first frames; the same values reverse on exit because React Aria waits on the transition.',
    },
    {
      name: 'delay / closeDelay',
      value: '0 / 0',
      why: 'BoardUI opens and begins closing immediately. A consumer can raise `delay` (the demo toolbar uses 300ms) where tooltips should not fire on a quick sweep.',
    },
    {
      name: 'max width',
      value: '240px',
      why: 'Tooltips hold a label or a short sentence; a cap forces long copy to wrap into a readable block rather than a wide strip.',
    },
  ],

  pitfalls: [
    'Do not rotate a single caret SVG with `transform` for the left and right sides. Transforms do not affect layout, so the arrow\'s box stays 12x7 and leaves a visible gap against the body.',
    'Do not make the tooltip interactive (links, buttons). It is `pointer-events-none` by design; use a Popover for content the reader must click.',
    'Do not pass a non-focusable trigger. A plain `<button>` must be wrapped in React Aria\'s `Focusable` (or be a React Aria `Button`) for hover and focus to reach the trigger.',
    'Do not close the caret path with `Z`. The edge touching the body would get a stroke and draw a line across the join.',
  ],

  notes: [
    '`TOOLTIP_CARETS` is exported and reused by Popover so both overlays draw identical arrows.',
    'The `placement` from `OverlayArrow` can be React Aria\'s "center" for other overlay types; the lookup falls back to the top caret.',
  ],

  apiSignature:
    'function Tooltip(props: Omit<AriaTooltipProps, "children"> & { children?: ReactNode; size?: "sm" | "md"; showArrow?: boolean }): JSX.Element\nfunction TooltipTrigger(props: ComponentProps<typeof AriaTooltipTrigger>): JSX.Element\nconst TOOLTIP_CARETS: Record<"top" | "bottom" | "left" | "right", { width: number; height: number; path: string; shadow: string }>',

  props: [
    { name: 'size', type: '"sm" | "md"', default: '"sm"', description: 'sm is 12px Caption 1 with 10x6 padding; md is 14px Body 1 with 12x8 padding and a 10px radius.' },
    { name: 'showArrow', type: 'boolean', default: 'true', description: 'Draw the caret pointing at the trigger.' },
    { name: 'placement', type: 'Placement', default: '"top" (React Aria)', description: 'Preferred side; flips on collision and the caret follows.' },
    { name: 'offset', type: 'number', default: '10', description: 'Distance from the trigger in pixels.' },
    { name: 'TooltipTrigger.delay', type: 'number', default: '0', description: 'Milliseconds of hover before the tooltip opens.' },
    { name: 'TooltipTrigger.closeDelay', type: 'number', default: '0', description: 'Milliseconds before it starts closing after the pointer leaves.' },
  ],

  reducedMotion:
    'Under `prefers-reduced-motion: reduce`, `motion-reduce:transition-none` removes the 200ms scale, blur and fade: the tooltip appears and leaves at once, and react-aria unmounts it straight away because no animation is running.',

  cleanup:
    'Nothing of its own. React Aria removes the tooltip after its exit transition and clears its hover and focus timers when the trigger unmounts.',

  acceptance:
    'Hovering or tabbing to "Left" shows a white tooltip to the left of the button with a caret that touches the body with no gap; moving the pointer off closes it with a quick blur-out, and Escape closes it while focused. Each of the four buttons shows its caret pointing back at it. In the toolbar, hovering an icon button for 300ms shows its label in the larger size.',

  criticalRegion: 'critical',
};

export default meta;
