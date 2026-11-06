/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Site Footer" (boardui.com/).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'site-footer',
  title: 'Site Footer',
  category: 'block',
  kit: 'boardui',
  tags: ['footer', 'marketing', 'navigation', 'landing', 'boardui'],
  blurb:
    'Marketing footer: logo, tagline and socials, six link columns with View all counts, then a language, theme, swatch and legal bar.',
  cost: 'css',
  motif: 'grid',

  files: [
    {
      path: 'registry/ui/site-footer.tsx',
      type: 'registry:ui',
      role: 'component',
    },
    {
      path: 'registry/ui/site-footer-swatches.tsx',
      type: 'registry:ui',
      role: 'accent swatch radio group for the bottom bar',
    },
  ],
  dependencies: ['@remixicon/react@^4.9.0'],

  summary:
    'The footer that closes a marketing site. The brand mark and tagline sit on the left, with social buttons and one call to action on the right. Up to six link columns follow, each with an optional "View all (N) →" link. The bottom bar holds the Language Select, the kit theme toggle, a centre slot (the demo uses the accent swatches companion) and the copyright and legal links. Every link reports through `onLinkClick`, so a client router can take over.',

  mechanism: [
    'The root is an `@container` `<footer>` with a top border. Inside, a `max-w-[1152px]` column has three bands: the brand row, a `<nav aria-label="Footer">` grid, and the bottom bar. Layout follows the footer\'s own width, not the viewport: the brand row splits left and right from `@3xl`, and the grid goes from 2 columns to 3 at `@xl` and 6 at `@5xl`.',
    'Socials branch on `count`. Without one, a social renders the kit `IconLinkButton` (36px square) named by `label`. With one, it renders a secondary `ButtonLink` with the icon and the count as visible text, named "GitHub stars, 2.4k". All socials open in a new tab with `rel="noopener noreferrer"`.',
    'Each column is an uppercase caption `h2` over a `ul` of links. A `badge` renders a status-blue pill after the label. `viewAll` adds a medium-weight link with a tertiary "(N)" and an arrow that nudges 2px on hover and flips under RTL.',
    'The bottom bar is a one-column grid that becomes `grid-cols-[1fr_auto_1fr]` from `@3xl`. That keeps the centre slot centred whatever the widths of the language and theme controls on the left and the legal text on the right. `language` takes `LanguageSelect` props (or `false`) and `themeToggle` renders the kit `ThemeToggle` as a small segmented control.',
    '`AccentSwatches` (companion) is a `role="radiogroup"` of `role="radio"` buttons with a roving tab stop. Only the checked dot has `tabIndex=0`. Arrow keys (mirrored under RTL), Home and End move focus and select. Each dot is SVG artwork: a linear gradient through its stops, a white radial highlight at (35%, 30%) and a 12% black hairline.',
  ],

  constants: [
    {
      name: 'content width',
      value: 'max-w-[1152px], px-0 from a 1200px container',
      why: 'This matches the landing page grid, so the footer columns line up with the sections above. Below 1200px, 16 or 24px gutters return.',
    },
    {
      name: 'grid breakpoints',
      value: '2 cols, @xl (36rem) 3 cols, @5xl (64rem) 6 cols',
      why: 'Six columns of about 170px need 64rem before "Marketing Dashboard" fits on one line. Three columns keep two rows readable on tablets.',
    },
    {
      name: 'link rhythm',
      value: 'gap-3 between Body 1 links, mt-4 under the heading',
      why: 'A roughly 33px row pitch makes a 9-link column about 300px tall, so all six columns end on the same baseline band.',
    },
    {
      name: 'swatch',
      value: '24px dot, gap-1.5, ring-2 + ring-offset-1 when checked, hover scale 1.1 over 150ms',
      why: 'The ring offset leaves a gap in the bar colour between the dot and the ring, so the checked state reads on every hue, including the pale spectrum dot.',
    },
  ],

  pitfalls: [
    'Using viewport breakpoints. A footer placed in a narrower shell, such as a docs layout with a sidebar, would still get six columns and overflow. Container queries size it by its own width.',
    'Repeating the same SVG gradient `id` in two marks or swatches. Browsers resolve `url(#id)` to the first match, so a later swatch can paint with another\'s gradient. Ids come from `useId()`.',
    'Giving every swatch `tabIndex=0`. Tab would then stop seven times in the bottom bar. A radio group has one tab stop and uses the arrow keys inside.',
  ],

  notes: [
    'Pass `onLinkClick={(href, e) => { e.preventDefault(); router.push(href) }}` for client-side routing. External links (`external: true`) can be skipped in that handler.',
    'The theme toggle is the kit `ThemeToggle`. It writes the document theme and persists it, so set `themeToggle={false}` when the host page already has one.',
  ],

  apiSignature:
    'function SiteFooter(props: { logo?: ReactNode; brandLabel?: string; brandHref?: string; tagline?: ReactNode; socials?: FooterSocial[]; cta?: ReactNode; columns: FooterColumn[]; language?: false | LanguageSelectProps; themeToggle?: boolean; bottomCenter?: ReactNode; copyright?: ReactNode; legal?: FooterLink[]; onLinkClick?: (href: string, event: MouseEvent<HTMLAnchorElement>) => void; className?: string }): JSX.Element',

  props: [
    { name: 'columns', type: 'FooterColumn[]', description: '`{ title, links: { label, href, badge?, external? }[], viewAll?: { href, count?, label? } }` per column.' },
    { name: 'logo', type: 'ReactNode', description: 'Brand mark, wrapped in a link to `brandHref`.' },
    { name: 'brandLabel', type: 'string', default: '"Home"', description: 'Accessible name of the logo link.' },
    { name: 'brandHref', type: 'string', default: '"/"', description: 'Logo link target.' },
    { name: 'tagline', type: 'ReactNode', description: 'Paragraph under the logo, at most 430px wide.' },
    { name: 'socials', type: 'FooterSocial[]', default: '[]', description: '`{ label, href, icon, count? }`. With `count` it renders a labelled button, otherwise an icon button.' },
    { name: 'cta', type: 'ReactNode', description: 'Action after the socials, e.g. a "Get Pro" `ButtonLink`.' },
    { name: 'language', type: 'false | LanguageSelectProps', default: '{}', description: 'Props for the bottom-bar Language Select, or false to hide it.' },
    { name: 'themeToggle', type: 'boolean', default: 'true', description: 'Show the kit segmented ThemeToggle.' },
    { name: 'bottomCenter', type: 'ReactNode', description: 'Centre slot of the bottom bar, e.g. `<AccentSwatches />`.' },
    { name: 'copyright', type: 'ReactNode', description: 'Leading text of the legal line.' },
    { name: 'legal', type: 'FooterLink[]', default: '[]', description: 'Links after the copyright, separated by middle dots.' },
    { name: 'onLinkClick', type: '(href, event) => void', description: 'Called for every footer link. `preventDefault()` there to route client-side.' },
  ],

  reducedMotion:
    'All motion is hover feedback: link colour fades, the View all arrow nudge and the swatch scale. They are CSS transitions with `motion-reduce:` variants that remove the transition and the transform. The theme toggle keeps the kit behaviour.',

  cleanup:
    'There are no effects, timers or listeners. The swatch keyboard handler is a React prop on the radio group. The Language Select and ThemeToggle own and clean up their own listeners.',

  acceptance:
    'At 1280px the footer shows the logo and tagline on the left and X, Discord, a "2.4k" GitHub button and Get Pro on the right. Six columns follow, Components and Charts ending in "View all (96) →" and "View all (18) →", and Affiliate carries an "Earn 40%" pill. The bottom bar reads, left to right: the English select and the sun/moon toggle, seven centred colour dots, then "© 2026 Tessera Labs · Privacy · Terms · License". Clicking a link calls `onLinkClick` with its href. Tabbing reaches the swatches once, and ArrowRight checks the next dot. At 360px the columns become two and the bottom bar stacks.',

  criticalRegion: 'critical',
};

export default meta;
