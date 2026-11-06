import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'site-header',
  title: 'Site Header',
  category: 'block',
  kit: 'boardui',
  tags: ['header', 'navigation', 'marketing', 'landing', 'boardui'],
  blurb:
    'Marketing header with a menu link, a ⌘K search pill, a GitHub star pill and the theme toggle, folding into a drawer in narrow containers.',
  cost: 'css',
  motif: 'split',

  files: [
    { path: 'registry/ui/site-header.tsx', type: 'registry:ui', role: 'component' },
  ],
  dependencies: ['@remixicon/react@^4.9.0'],

  summary:
    'The landing page\'s top bar: a brand lockup, a row of nav links where any link with `items` becomes a menu button, and an action cluster of search pill, social icons, GitHub star count, a free slot and the kit ThemeToggle. It responds to its own width through a container query, so the same header collapses to a menu button that opens the kit Drawer whenever its container is under 896px, whatever the window size.',

  mechanism: [
    'The `<header>` is an `@container/site-header`. Every responsive switch is a container variant (`@4xl/site-header:` = 56rem = 896px): the desktop `<nav>`, the socials/GitHub/actions/theme cluster and the full search pill appear at that width, and the menu IconButton hides at it. Media queries are never used, so a header placed in a narrow column or a scaled preview still picks the right layout.',
    'Links with an `items` array render through `NavMenu`, which wraps the kit `Dropdown`. Open state lives in the header (`openMenu` holds the label of the one open menu), so opening a second menu closes the first. The trigger is a React Aria button (Enter, Space and Escape for free); its chevron rotates 180deg on open; the panel holds plain `<a>` rows, so destinations keep native link behaviour, and picking a row calls `onNavigate` then closes the panel.',
    'Current page: `isCurrentLink` marks a link current when its `href`, or any row of its menu, equals `currentHref`. Current anchors get `aria-current="page"`, which the shared link class styles as primary text, and current menu rows take the dropdown hover fill.',
    'The search trigger is a `<button>` that calls `onSearch`. The shortcut chip is display only (it sets `aria-keyshortcuts="Meta+K"` for the default label); the key binding belongs to whatever the search opens, e.g. the kit CommandPalette, whose `shortcut="k"` already toggles it. Below 896px the pill shrinks to a 40px icon button.',
    'The narrow layout puts the same data in a `DrawerTrigger` + `Drawer placement="end" size="sm"`: plain links become full-width menu rows, each menu becomes a labelled group of its rows, and the GitHub pill, actions and a ThemeToggle sit under a divider. Every row calls `close()` from the Drawer render prop after `onNavigate`, so navigating dismisses the sheet.',
  ],

  constants: [
    { name: 'bar height', value: 'h-[72px]', why: 'Matches the reference: a 40px control row (search pill, GitHub pill, theme toggle) with 16px of air above and below.' },
    { name: 'collapse width', value: '@4xl (896px container)', why: 'Below it the four links plus a 220px search pill, two socials, the GitHub pill, Get Pro and the toggle no longer fit on one line at 1280px max width.' },
    { name: 'search pill', value: 'w-[220px] h-10 rounded-full', why: 'Wide enough for "Quick Search" plus the ⌘K chip without truncation; 40px matches the toggle and GitHub pill so the cluster shares one baseline.' },
    { name: 'menu panel', value: 'w-[320px]', why: 'Room for a 32px icon tile plus a one-line description; the default 266px menu width wraps the descriptions.' },
  ],

  pitfalls: [
    'Using `md:` / `lg:` media variants for the collapse. The header then follows the window, not its container, and shows the desktop row inside a narrow column (or the mobile row in a scaled preview).',
    'Binding ⌘K inside the header as well as in the search it opens. Two listeners on the same key open and immediately close the palette; keep the chip display-only.',
    'Rendering menu rows as buttons that set `location`. Rows are anchors on purpose, so middle-click, copy link and open-in-new-tab work.',
    'Forgetting `event.preventDefault()` in `onNavigate` when routing on the client: the anchor then performs a full navigation as well.',
  ],

  notes: [
    'The ThemeToggle is the kit\'s own: it switches the whole document\'s theme and persists the choice, so two headers on one page stay in sync.',
    '`SiteHeaderLogo` is exported for reuse in footers; pass any node as `brand` to replace it.',
  ],

  apiSignature:
    'function SiteHeader(props: { brand?: ReactNode; brandHref?: string; links?: SiteHeaderLink[]; currentHref?: string; onNavigate?: (href: string, event: MouseEvent<HTMLAnchorElement>) => void; onSearch?: () => void; searchLabel?: string; searchShortcut?: string; socials?: SiteHeaderSocial[]; githubHref?: string; githubStars?: number; actions?: ReactNode; showThemeToggle?: boolean; sticky?: boolean; menuLabel?: string; className?: string }): JSX.Element\nfunction SiteHeaderLogo(props: { name?: string }): JSX.Element',

  props: [
    { name: 'links', type: 'SiteHeaderLink[]', default: '[]', description: '`{ label, href?, items? }`. A link with `items` (`{ label, href, description?, icon? }`) becomes a menu button.' },
    { name: 'currentHref', type: 'string', description: 'Marks the matching link or menu row with `aria-current="page"`.' },
    { name: 'onNavigate', type: '(href, event) => void', description: 'Called for every link and row; prevent the default for client routing.' },
    { name: 'onSearch', type: '() => void', description: 'Search trigger press. Omit it to hide the trigger.' },
    { name: 'searchLabel', type: 'string', default: '"Quick Search"', description: 'Pill text and the trigger\'s accessible name.' },
    { name: 'searchShortcut', type: 'string', default: '"⌘K"', description: 'Shortcut chip in the pill. Display only.' },
    { name: 'socials', type: 'SiteHeaderSocial[]', default: '[]', description: 'Icon links (`{ label, href, icon }`) before the GitHub pill.' },
    { name: 'githubHref / githubStars', type: 'string / number', description: 'GitHub pill target and compact-formatted star count.' },
    { name: 'actions', type: 'ReactNode', description: 'Extra controls before the theme toggle; repeated in the drawer.' },
    { name: 'showThemeToggle', type: 'boolean', default: 'true', description: 'Renders the kit ThemeToggle (segmented) on the end edge and in the drawer.' },
    { name: 'sticky', type: 'boolean', default: 'false', description: 'Pins the bar to the top of its scroll container.' },
    { name: 'brand / brandHref', type: 'ReactNode / string', default: 'SiteHeaderLogo / "/"', description: 'Lockup on the start edge and its link.' },
  ],

  reducedMotion:
    'The menu chevron\'s rotation transition is removed with `motion-reduce:transition-none`; the kit Dropdown and Drawer apply their own reduced-motion fades. Colour hover transitions stay because they do not move anything.',

  cleanup:
    'Nothing of its own: no listeners, timers or effects. The Dropdown and Drawer clean up their overlays and outside-press listeners when they close or unmount.',

  acceptance:
    'At 1280px the bar shows the logo, Components with a chevron, Templates, Docs, Blog, a Quick Search pill with ⌘K, two social icons, a GitHub pill reading 963, Get Pro and the theme toggle. Clicking Components opens a panel of three rows; choosing Charts closes it and marks Components current. Escape closes the panel. Clicking the search pill opens the command palette. In a 390px container only the logo, a search icon and a menu button show; the menu button opens an end drawer listing every link, and choosing one closes the drawer.',

  criticalRegion: 'critical',
};

export default meta;
