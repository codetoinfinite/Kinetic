import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'dotted-notepad-surface',
  title: 'Dotted Notepad Surface',
  category: 'primitive',
  tags: ['css', 'background', 'radial-gradient', 'mask', 'texture'],
  blurb: 'A tiled dot grid that dissolves at the panel edges, with a hard-stopped folded corner.',
  cost: 'css',
  motif: 'grid',

  files: [
    {
      path: 'registry/ui/dotted-notepad-surface.tsx',
      target: 'components/motion/dotted-notepad-surface.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: [],
  registryDependencies: [],

  summary:
    'A panel textured with a dot grid drawn by a single tiled radial gradient, masked so the pattern dissolves toward the edges instead of ending on a rectangle. An optional turned-down corner is one hard-stopped linear gradient. Nothing is an image, nothing animates, and the whole surface costs one background layer.',

  mechanism: [
    'One `radial-gradient(circle, dot 1.1px, transparent 1.3px)` is tiled by `background-size: 26px 26px`, so `background-size` alone controls the pitch of the grid and the gradient controls the dot. Changing pitch never requires touching the gradient.',
    'The 0.2px between the coloured stop and the transparent stop is the antialiasing ramp. With both stops at the same offset the dot edge quantises to the device pixel grid and the dots render as squares at fractional zoom; wider than about 0.4px and they visibly blur.',
    '`background-position: center` rather than `0 0` keeps the lattice symmetric about the panel as it resizes. Pinned to the top-left, a resize crops the pattern on one side only and the grid appears to slide.',
    '`mask-image` takes two axis gradients — one vertical, one horizontal — each opaque in the middle and transparent for `--kx-pad-fade` at both ends, combined with `mask-composite: intersect`. Intersecting two linear masks fades all four edges while keeping the interior perfectly flat; a single radial mask would instead darken the corners more than the edges and make a rectangular panel read as a lens.',
    '`background-attachment` decides what the tile origin is anchored to, and only matters once the dotted element is itself a scroll container. `scroll` anchors to the element border box so the grid holds still while content slides over it; `local` anchors to the scrolled content so the grid travels with the text and the panel reads as one continuous sheet.',
    'The fold is a single absolutely-positioned square carrying `linear-gradient(225deg, void 0 43%, crease 43% 48%, under 48% 100%)`. Hard stops (a stop pair at the same offset) mean no interpolation, so the boundary is a crease and not a shadow. The 225deg gradient line points down-left, which puts the void band at the top-right corner where the paper is turned back.',
  ],

  constants: [
    {
      name: 'pitch',
      value: '26px',
      why: 'Tile size, therefore dot spacing. Below ~18px the grid starts to read as a flat tone rather than a texture and interferes with body text; above ~34px the dots read as individual objects on the page and compete with content.',
    },
    {
      name: 'dotSize',
      value: '1.1px',
      why: 'Dot radius. At exactly 1px the dot lands on a whole device pixel and hardens; the fractional value is what keeps it soft on 1x displays. Above ~1.6px the surface reads as polka dots rather than paper grain.',
    },
    {
      name: 'antialias gap',
      value: '0.2px',
      why: 'Distance from the colour stop to the transparent stop. This is the only softening the dot gets. At 0 the edge quantises and the dots go square at fractional zoom levels; at 0.5px and above the dot loses its centre and the grid looks smudged.',
    },
    {
      name: 'fade',
      value: '10%',
      why: 'How far the edge mask reaches in. Below ~6% the dissolve is too abrupt to read as intentional and looks like a clipping bug; above ~18% the usable flat area of a small panel disappears and content near the edge visibly ghosts.',
    },
    {
      name: 'fold stop positions',
      value: '43% / 48%',
      why: 'The crease is a 5% sliver. Thinner than ~3% and it drops below a pixel on a small fold and disappears; wider than ~8% and it stops reading as a lit edge and becomes a grey stripe. The 43% start places the crease off-centre so the flap looks lifted rather than symmetrically folded.',
    },
    {
      name: 'shadow',
      value: '0 34px 70px -34px',
      why: 'Negative spread equal to the Y offset. It shrinks the shadow box by exactly the amount the offset moved it, so the blur only escapes below the panel. Without the negative spread a 70px blur haloes all four sides and the sheet looks lit from nowhere.',
    },
  ],

  pitfalls: [
    'Putting the mask on the panel and expecting only the dots to fade. A mask applies to everything the element paints, children included, so text within `--kx-pad-fade` of an edge ghosts out. Content padding must exceed the fade inset — that is why the component has a separate content wrapper for padding rather than padding the panel.',
    'Reaching for `background-attachment: fixed` to get a parallax grid. The tile origin becomes the viewport, but any ancestor with a `transform`, `filter`, `backdrop-filter` or `will-change` becomes the containing block instead, so the effect silently changes meaning as soon as someone animates a parent. It also repaints the element across its full area on every scroll frame, and iOS Safari has never implemented it usefully.',
    'Setting `background-attachment: local` on a panel that does not scroll and expecting a difference. `local` and `scroll` are identical until the element itself has overflow — the value is inert, so the "fix" appears to do nothing and gets removed.',
    'Coincident gradient stops on the dot (`radial-gradient(circle, c 1.1px, transparent 1.1px)`). It looks correct in a screenshot at 100% zoom and turns into a field of tiny squares on a 1.25x or 1.5x display.',
    'Using the `background` shorthand after setting `background-size`. The shorthand resets `background-size` to `auto`, the tile collapses to the gradient default, and the grid becomes one enormous dot.',
    'Assuming the fold reads as a hole without matching `--kx-pad-void` to what is actually behind the panel. The first band of the fold gradient is a flat colour pretending to be the page; against a different background it reads as a grey triangle stuck on the corner.',
  ],

  notes: [
    '`mask-composite: intersect` needs Safari 15.4+, Chrome 120+ and Firefox 53+. Where it is unsupported only the first mask layer applies, so the grid fades top and bottom but not left and right — a degradation, not a break.',
    'The dot layer is a real background rather than a pseudo-element so that `background-attachment` has a scroll container to refer to. A decorative absolutely-positioned overlay could not express the `local` behaviour at all.',
    'The CSS ships inside the component as a `<style href precedence>` element; React 19 hoists it into `<head>` and de-duplicates by `href`, so any number of panels contribute one rule set.',
  ],

  apiSignature:
    "function DottedNotepadSurface(props: { children?: ReactNode; pitch?: number; dotSize?: number; fade?: string; scrollable?: boolean; attachment?: 'scroll' | 'local' | 'fixed'; fold?: boolean; radius?: string; className?: string; contentClassName?: string }): JSX.Element",

  props: [
    { name: 'children', type: 'ReactNode', description: 'Panel content. Rendered above the dot layer.' },
    { name: 'pitch', type: 'number', default: '26', description: 'Grid pitch in pixels. Becomes `background-size`.' },
    { name: 'dotSize', type: 'number', default: '1.1', description: 'Dot radius in pixels. The transparent stop lands 0.2px further out.' },
    { name: 'fade', type: 'string', default: "'10%'", description: 'How far the edge mask reaches in from each side.' },
    { name: 'scrollable', type: 'boolean', default: 'false', description: 'Makes the dotted layer the scroll container, which is what gives `attachment` meaning.' },
    { name: 'attachment', type: "'scroll' | 'local' | 'fixed'", default: "'scroll'", description: 'Tile origin. `scroll` holds the grid still under scrolling content; `local` scrolls the grid with it.' },
    { name: 'fold', type: 'boolean', default: 'false', description: 'Draws the turned-down top-right corner.' },
    { name: 'radius', type: 'string', default: "'20px'", description: 'Panel corner radius. The fold inherits it on its own corner.' },
    { name: 'className', type: 'string', description: 'Merged onto the panel. Use for sizing and border.' },
    { name: 'contentClassName', type: 'string', description: 'Merged onto the content wrapper. Put padding here so text clears the mask.' },
  ],

  reducedMotion:
    'Nothing in this component moves in either state — there is no animation, transition or timer to disable. The surface renders identically with `prefers-reduced-motion: reduce` set, including the fold and the edge fade.',

  cleanup:
    'Nothing to clean up. No listeners, no timers, no animation frames. The hoisted `<style>` is reference-counted by React and removed when the last instance unmounts.',

  acceptance:
    'The dot grid is crisp at 100% and at 150% browser zoom — individual dots stay round, not square. All four edges dissolve rather than ending on a line, and the interior is perfectly even. With `scrollable` and `attachment="local"`, scrolling the panel moves the dots with the text; with `attachment="scroll"` the dots stay put while the text slides over them. With `fold`, the corner reads as turned paper with a single sharp crease and no blur.',

  criticalRegion: 'critical',
};

export default meta;
