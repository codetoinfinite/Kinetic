import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'composer-loader',
  title: 'Composer Loader',
  category: 'display',
  kit: 'boardui',
  tags: ['agent', 'ai', 'loader', 'composer', 'svg', 'glow', 'boardui'],
  blurb: 'Wraps a chat composer while the agent works: an iridescent band orbits the pill rim with a soft bloom, fading in and out.',
  cost: 'css',
  motif: 'orbit',

  files: [
    {
      path: 'registry/ui/composer-loader.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: [],

  summary:
    'A wrapper that lights up a chat composer while a reply is on its way. It paints the pill surface itself, then runs a band of light around the rim above it: a crisp line, a tight glow and a wide bloom, all dash segments on one SVG rounded-rect stroke. The outer half of each stroke is clipped by the pill, so the glow only bleeds inward. Flipping `active` fades the whole effect in or out over 450ms.',

  mechanism: [
    'A `ResizeObserver` on the clipping layer keeps `box` (default 640×52) in sync with the rendered size, and the SVG uses that as its `viewBox` with `preserveAspectRatio="none"`, so stroke widths and blur radii stay in real pixels.',
    'Each layer is a `<rect>` with `rx = radius ?? h / 2` and `pathLength={100}`, so the dash is measured in percent of the perimeter and travels at constant speed around the end caps. `strokeDasharray` is `len (100 − len)` with `band = arc / 360 × 100`, and the theme\'s `bui-composer-loader-dash` keyframes move `stroke-dashoffset` from 0 to −100 once per `speed` seconds.',
    'Three layers share one horizontal `linearGradient` (c0, c1, the RGB average of c1 and c2, c2, c3): a wide bloom (`bloom × 2` wide, 14px blur, 0.9 × band long), a tight glow (`line × 3.2`, 6px blur, 0.95 × band) and the crisp line (`line`, 0.5px blur, full band).',
    'The softer layers are shorter, and their heads are pulled back behind the tip. The perimeter (`2(w + h) − 8r + 2πr`) converts pixels to path units, and each layer\'s phase becomes its `animation-delay` (at typical sizes a negative one, a head start) to line the heads up: the glow 10px behind the line, the bloom `bloom + 16`px behind.',
    'Blurs are SVG `feGaussianBlur` filters (regions widened to 200%) rather than CSS `filter`, because WebKit ignores CSS filters on individual SVG elements.',
    'With `taper > 0`, each layer is drawn as 14 centred copies, each shorter by `taper / 14` and at 1/14 of the opacity, so the two ends ramp up in steps that the blur (raised to `max(0.5, line × 0.8)` on the crisp line) melts together.',
    '`active` toggles the clipping layer\'s opacity between 1 and 0 with a 450ms ease transition. Children render in a `relative` layer above the light.',
  ],

  constants: [
    {
      name: 'DEFAULT_COLORS',
      value: '#5eead4, #46baec, #e633a4, #00faa7',
      why: 'Teal, sky, magenta and mint spread left to right; the middle stop averages sky and magenta, so the band never washes out to white.',
    },
    {
      name: 'speed / arc',
      value: '4.5s per lap / 120°',
      why: 'A third of the rim lit at once, moving slowly enough to read as ambient rather than as a progress bar.',
    },
    {
      name: 'line / bloom / bloomStrength / intensity',
      value: '2.5px / 16px / 0.3 / 0.7',
      why: 'A thin bright edge with a soft inward wash, held under full opacity so it sits on the surface instead of glaring.',
    },
    {
      name: 'blur radii',
      value: '14, 6, 0.5 (stdDeviation)',
      why: 'One per layer: the wide bloom, the tight glow and a hint of softness on the crisp line.',
    },
    {
      name: 'head pull-back',
      value: 'glow 10px, bloom `bloom + 16`px',
      why: 'The sharp line leads and the soft light trails it, like a highlight sliding along glass.',
    },
    {
      name: 'TAPER_STEPS',
      value: '14',
      why: 'Enough copies that the stepped ramp at each end blurs into a gradient.',
    },
    {
      name: 'fade',
      value: 'opacity 450ms ease',
      why: 'Toggling on send and reply reads as the composer lighting up rather than snapping.',
    },
  ],

  pitfalls: [
    'The wrapped composer must not paint its own background while `active`. Its children render above the light, so an opaque form covers the band completely. Switch it to `bg-transparent` while busy and let `surface` paint the pill.',
    '`colors` must be four `#rrggbb` strings. The middle gradient stop is computed by parsing hex pairs, so CSS variables, `rgb()` or short hex give an invalid stop colour.',
    'Pass `radius` when the composer is not a full pill. Without it the stroke uses `h / 2` and the clipping layer uses 9999px, which only match a pill shape.',
    'Each layer is wrapped in an SVG blur and animates constantly, so the light costs a repaint every frame while it is visible. Set `active={false}` when nothing is pending, rather than leaving it on at low intensity.',
    'The first paint uses a 640×52 box until the `ResizeObserver` reports, so a very different size may show a slightly mis-scaled band for one frame.',
  ],

  notes: [
    '`offset` moves the band forward by a fraction of the lap, so two loaders on one pill can line up: a short beam with `offset` equal to the difference of the two arcs leads a wider glow tip to tip.',
    '`blend` sets `mix-blend-mode` on the light layer, for example `screen` to read as light on a dark surface.',
    'BoardUI\'s free `agent-composer` uses this exactly: `active={busy}` around a 52px form that turns transparent while the agent is busy.',
  ],

  apiSignature:
    'function ComposerLoader(props: { children: ReactNode; active?: boolean; colors?: [string, string, string, string]; speed?: number; intensity?: number; bloom?: number; bloomStrength?: number; arc?: number; reverse?: boolean; radius?: number; line?: number; bloomOnly?: boolean; surface?: boolean; taper?: number; blend?: CSSProperties["mixBlendMode"]; offset?: number; className?: string }): JSX.Element',

  props: [
    { name: 'children', type: 'ReactNode', description: 'The composer. Rendered above the light, so keep it transparent while active.' },
    { name: 'active', type: 'boolean', default: 'true', description: 'Show the light; fades in and out over 450ms.' },
    { name: 'colors', type: '[string, string, string, string]', default: 'teal, sky, magenta, mint', description: 'Four `#rrggbb` colours spread across the pill from left to right.' },
    { name: 'speed', type: 'number', default: '4.5', description: 'Seconds per full lap.' },
    { name: 'arc', type: 'number', default: '120', description: 'Length of the band, in degrees of 360.' },
    { name: 'intensity', type: 'number', default: '0.7', description: 'Overall opacity of the light.' },
    { name: 'line', type: 'number', default: '2.5', description: 'Width of the crisp line in px; the tight glow is 3.2 times this.' },
    { name: 'bloom / bloomStrength', type: 'number', default: '16 / 0.3', description: 'How far the bloom bleeds inward in px, and its opacity.' },
    { name: 'bloomOnly', type: 'boolean', default: 'false', description: 'Draw only the wide bloom, as a soft wash.' },
    { name: 'taper', type: 'number', default: '0', description: 'Fraction of the band that ramps at each end, 0 to 1.' },
    { name: 'reverse', type: 'boolean', default: 'false', description: 'Travel counter-clockwise.' },
    { name: 'radius', type: 'number', description: 'Corner radius in px; omit for a full pill.' },
    { name: 'surface', type: 'boolean', default: 'true', description: 'Paint the pill surface (primary background, xs shadow) behind the light.' },
    { name: 'blend', type: 'CSSProperties["mixBlendMode"]', description: 'How the light composites over what is beneath it.' },
    { name: 'offset', type: 'number', default: '0', description: 'Moves the band forward by a fraction of the perimeter.' },
  ],

  reducedMotion:
    'The theme sets `animation: none !important` on every `.bui-composer-loader-rect` under `prefers-reduced-motion: reduce`, which overrides the inline animation. The band then rests as a static glow at the start of the rect path, the top edge, near the top-left corner. The 450ms opacity fade on `active` still runs, since it is a state change rather than a loop.',

  cleanup:
    'The `ResizeObserver` is disconnected on unmount. The band is a CSS animation and stops with the element. Nothing else is scheduled.',

  acceptance:
    'With `active` on, a band covering about a third of the rim circles the composer pill once every 4.5s, turning smoothly around both rounded ends. The sharp gradient line leads, with a softer glow and a wide wash trailing slightly behind it, and the glow appears only inside the pill. Setting `active` to false fades it out over about 450ms; setting it back fades it in. Resizing the composer keeps the line at the same thickness and the same lap time. Under reduced motion the band holds still.',

  criticalRegion: 'critical',
};

export default meta;
