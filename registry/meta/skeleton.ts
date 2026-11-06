import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'skeleton',
  title: 'Skeleton',
  category: 'display',
  kit: 'boardui',
  tags: ['skeleton', 'loading', 'placeholder', 'shimmer', 'boardui'],
  blurb: 'Content-shaped placeholders with a layered light sheen that size themselves to real content and blur it in once loaded.',
  cost: 'css',
  motif: 'trail',

  files: [
    {
      path: 'registry/ui/skeleton.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: [],

  summary:
    'Placeholders in the shape of the content on its way: rectangles, text lines and circles tinted from the text colour at 8%, so they show on any surface in both themes. A sheen sweeps each block in three layers (a crisp 2px line, a 72px glow and a 240px bloom). Given children, a Skeleton lays the real content out invisibly to take its exact size, then cross-fades the block away while the content sharpens in from a 4px blur.',

  mechanism: [
    'Paint every block with `bui-skeleton block bg-text-primary/8` plus a radius per shape: `rounded-xl` (rect), `rounded-md` (text) or `rounded-full` (circle). The 8% text-colour tint is what keeps the block visible on light and dark cards alike.',
    'Draw the sheen in CSS on `.bui-skeleton::after` (in the kit theme sheet): three right-anchored `linear-gradient(90deg, transparent, <colour>)` layers sized 2px, 72px and 240px, so nothing soft runs ahead of the crisp leading line. `.bui-skeleton` sets `overflow: hidden; isolation: isolate` and leaves positioning to the component\'s `relative` / `absolute` classes.',
    'Animate the pseudo-element with `bui-skeleton-sheen`: `translate` from -100% to 100% over the first 60% of a 2.2s `cubic-bezier(0.4, 0, 0.2, 1)` cycle, then rest off-block until the loop restarts. `:dir(rtl)` flips it with `scale: -1 1` and `animation-direction: reverse`. Dark mode lowers the three layer alphas from 0.9 / 0.55 / 0.35 to 0.2 / 0.08 / 0.04.',
    'Without children, render one `<span aria-hidden>` block sized by the caller\'s `className` (`h-4 w-40`, `size-10`).',
    'With children, render a `relative block` wrapper holding two layers: the real content in a `<span>` that is `opacity-0 motion-safe:blur-[4px]`, `inert` and `aria-hidden` until `isLoaded`, and an `absolute inset-0` skeleton block on top. When `isLoaded` flips, the content goes to `opacity-100 blur-[0px]` and the block to `opacity-0`, both via `transition-[opacity,filter] duration-300 ease-out`.',
    '`SkeletonText` maps `lines` to `text`-shaped Skeletons in a `flex flex-col gap-2.5` column, each `lineClassName` tall (default `h-3.5`), with the last line at `w-3/5` when there is more than one line.',
  ],

  constants: [
    {
      name: 'block tint',
      value: 'bg-text-primary/8',
      why: 'Derived from the text colour rather than a fixed grey, so the placeholder sits at the same contrast on white and dark cards and flips with the theme for free.',
    },
    {
      name: 'sheen layers',
      value: '2px line, 72px glow, 240px bloom; light alpha 0.9 / 0.55 / 0.35, dark 0.2 / 0.08 / 0.04',
      why: 'A sharp leading edge with a soft tail reads as light passing over the surface. On dark surfaces the same alphas would flash, so they drop sharply.',
    },
    {
      name: 'sweep timing',
      value: '2.2s cycle, sweep occupies 0 to 60%, cubic-bezier(0.4, 0, 0.2, 1)',
      why: 'The rest period between sweeps is what keeps a page full of skeletons calm instead of a constant shimmer.',
    },
    {
      name: 'reveal',
      value: '300ms ease-out on opacity and filter; content enters from blur(4px)',
      why: 'Long enough to read as a cross-fade, short enough that loaded data is not held back. The blur hides the layout snap of text replacing a flat block.',
    },
    {
      name: 'SkeletonText',
      value: 'gap-2.5 (10px), h-3.5 lines, last line w-3/5',
      why: 'A 14px bar with 10px gaps approximates Body 1 text at a 24px rhythm; the short last line is what makes a block read as a paragraph.',
    },
  ],

  pitfalls: [
    'Do not give the `.bui-skeleton` class its own `position` in unlayered CSS. It would beat Tailwind\'s layered `relative` / `absolute` utilities and break the overlay form.',
    'Do not render the loaded content outside the Skeleton and swap it in. The children form measures the placeholder from the real content, which is what prevents layout shift.',
    'Do not forget `aria-busy` on the region that is loading. Skeletons are `aria-hidden`, so without it assistive tech gets no loading signal at all.',
    'Do not tint the block with a fixed grey such as `bg-neutral-200`. It vanishes on dark cards; the 8% text tint does not.',
    'Do not leave hidden content focusable. The component sets `inert` on it until `isLoaded`; a custom version must too, or Tab lands on invisible buttons.',
  ],

  notes: [
    'The sheen and its keyframes live in the theme sheet (`.bui-skeleton`), not in the component, so it needs the kit stylesheet to animate.',
    'With children, size and placement classes go on the wrapper; the overlay block inherits the wrapper\'s box.',
  ],

  apiSignature:
    'type SkeletonShape = "rect" | "text" | "circle"\ninterface SkeletonProps { shape?: SkeletonShape; isLoaded?: boolean; className?: string; style?: CSSProperties; children?: ReactNode }\nfunction Skeleton(props: SkeletonProps): JSX.Element\ninterface SkeletonTextProps { lines?: number; lineClassName?: string; className?: string }\nfunction SkeletonText(props: SkeletonTextProps): JSX.Element',

  props: [
    { name: 'shape', type: '"rect" | "text" | "circle"', default: '"rect"', description: 'Corner radius: 12px, 6px or fully round.' },
    { name: 'isLoaded', type: 'boolean', default: 'false', description: 'With children: fade the block out and blur the content in.' },
    { name: 'className', type: 'string', description: 'Size and placement, e.g. `h-4 w-40` or `size-10`.' },
    { name: 'children', type: 'ReactNode', description: 'Real content to size the placeholder from and reveal when loaded.' },
    { name: 'lines (SkeletonText)', type: 'number', default: '3', description: 'Number of lines; the last runs 60% wide.' },
    { name: 'lineClassName (SkeletonText)', type: 'string', default: '"h-3.5"', description: 'Line height, matched to the text it stands in for.' },
  ],

  reducedMotion:
    'The sweep is removed (`::after { display: none }`) and each block instead breathes with `bui-skeleton-pulse`, a 2s ease-in-out opacity dip to 0.55. The reveal drops its transition and skips the blur (`motion-reduce:transition-none`, `motion-safe:blur-[4px]`), so loaded content simply appears.',

  cleanup:
    'Nothing to clean up. All motion is CSS animation on a pseudo-element and CSS transitions; there are no listeners, timers or effects.',

  acceptance:
    'A card of skeletons (a 36px circle, two text bars, two text lines and a 64px rect) shows a soft sheen crossing each block left to right roughly every 2.2s, with a pause between sweeps, in both light and dark mode. Wrapping real content in `<Skeleton isLoaded={false}>` gives a block exactly the size of that content; switching to `isLoaded` cross-fades the block out over 300ms while the content un-blurs, with no layout shift. Under reduced motion the blocks pulse instead of sweeping.',

  criticalRegion: 'critical',
};

export default meta;
