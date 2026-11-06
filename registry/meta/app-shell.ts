import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'app-shell',
  title: 'App Shell',
  category: 'block',
  kit: 'boardui',
  tags: ['app-shell', 'layout', 'sidebar', 'page-frame', 'notifications', 'boardui'],
  blurb:
    'Page frame for the chat starter: sidebar, phone drawer, breadcrumb and heading over a 1300px column, with a notification bell.',
  cost: 'dom',
  motif: 'split',

  files: [
    {
      path: 'registry/ui/app-shell.tsx',
      type: 'registry:ui',
      role: 'page frame',
    },
    {
      path: 'registry/ui/notification-bell.tsx',
      type: 'registry:ui',
      role: 'header bell with notification popover',
    },
    {
      path: 'registry/ui/starter-notifications.ts',
      type: 'registry:ui',
      role: 'sample inbox data',
    },
  ],
  dependencies: ['@remixicon/react@^4.9.0', 'react-aria-components@^1.22.1'],

  summary:
    'The page standard every BoardUI template follows: a full-height frame with the dashboard sidebar on large screens (an overlay drawer below `lg`), and a main column of at most 1300px holding a breadcrumb trail, the page heading with its actions, and the page content sitting directly on the page background. The starter\'s navigation is generated from one base path read off the URL, so the sidebar only links to pages the app has. The default header actions are a notification bell with an unread badge that opens the notification center in a popover, plus Filters and Create ticket buttons.',

  mechanism: [
    '`AppShell` renders a `relative flex h-dvh w-full gap-4 overflow-hidden bg-background-full p-3` row: `DashboardSidebar` (hidden below `lg`) and a `<main>` that is the only scroller (`flex-1 overflow-y-auto overflow-x-hidden`, `sm:pt-3`) centring a `max-w-[1300px] flex-col gap-2.5` column. `columnClassName` overrides the column width.',
    'Navigation comes from `starterNav(base)`: Chat, Dashboard, Components and Blocks, Sign in, Sign up, each `href` prefixed with `base`. `useStarterBase()` returns a pinned base from `StarterBaseContext` when a host provides one, else matches `pathname` against `/templates/chat-starter` (with an optional language prefix) and falls back to "" in a deployed copy. `useStarterSelected()` maps the rest of the path to "dashboard", "components" or "chat".',
    'Below `lg`, an `IconButton` beside the heading toggles `navOpen`; when true a `fixed inset-0 z-50 lg:hidden` layer renders a full-bleed `<button aria-label="Close navigation">` backdrop (`bg-black/40`) and the sidebar in `mobile` mode with `onClose`. The toggle swaps its glyph between `RiMenuLine` and `RiCloseLine`.',
    'The header is a `Breadcrumb` (team avatar, member avatar, then the current page with `icon`) over a wrapping row: the `h1` (`text-title-2-medium`, `heading` defaulting to `title`) on the left and the actions on the right. `actions` undefined renders the defaults; `null` renders none.',
    '`NotificationBell` owns `isOpen` and two refs: an `IconButton` trigger with `aria-expanded` / `aria-haspopup="dialog"` and a React Aria `Popover` (`placement="bottom end"`, `offset={8}`, `isNonModal`, `w-[440px] max-w-[calc(100vw-24px)]`) holding a `Dialog` with `NotificationCenter`. Outside presses close it via `useDismissOnOutsidePress`. The unread count (items with `unread`) shows in a 16px red badge at `top-0.5 start-[18px]` that loses its 1.5px ring on hover and press.',
    'Both the shell and the bell run their JSX through `useTemplateCopy()`\'s `localize`, so localized templates translate the fixed copy without the components taking strings as props.',
  ],

  constants: [
    {
      name: 'content column',
      value: 'max-w-[1300px]',
      why: 'The width every BoardUI template page uses, so cards and tables line up across pages; the catalogue overrides it (e.g. `max-w-[964px]`) through `columnClassName`.',
    },
    {
      name: 'sidebar breakpoint',
      value: 'lg (1024px)',
      why: 'Below it the sidebar would squeeze the content column, so it becomes an overlay drawer opened from the header.',
    },
    {
      name: 'notification popover',
      value: '440px wide, max-w-[calc(100vw-24px)], bottom end, offset 8',
      why: 'Wide enough for a notification row with inline actions; end alignment keeps it under the bell at the right of the header.',
    },
    {
      name: 'STARTER_SITE_PREFIX',
      value: '"/templates/chat-starter"',
      why: 'Where the starter lives on the hosted site; reading it off the URL lets the same files run hosted or deployed at the root untouched.',
    },
  ],

  pitfalls: [
    'Do not configure the base path in two places. It is read off the URL (or pinned with `StarterBaseContext` by a host whose path has no prefix), so the sidebar never links to a page the app lacks.',
    'Do not let the whole frame scroll. The outer row is `h-dvh overflow-hidden` and only `<main>` scrolls, so the sidebar stays put.',
    'Do not make the bell popover modal to get outside dismissal; it is `isNonModal` and closed by `useDismissOnOutsidePress`, so opening it does not lock page scroll.',
    'Do not pass `actions={undefined}` expecting no actions. `undefined` means "use the defaults"; pass `null` to render none.',
  ],

  notes: [
    '`STARTER_NOTIFICATIONS` is the sample inbox: five items over Today and Yesterday, three unread, matching the sidebar badge and the bell. `STARTER_UNREAD_COUNT` is derived from it.',
    'The shell\'s sample breadcrumb (Acme team, Jordan) is fixed copy; real apps replace it with their own trail.',
  ],

  apiSignature:
    'function AppShell(props: { title: string; heading?: string; icon?: IconComponent; actions?: ReactNode; children: ReactNode; className?: string; columnClassName?: string }): JSX.Element\nconst StarterBaseContext: Context<string | null>\nconst STARTER_SITE_PREFIX = "/templates/chat-starter"\nfunction useStarterBase(): string\nfunction starterNav(base: string): DashboardNavItem[]\nfunction useStarterSelected(): string\nfunction NotificationBell(props?: { notifications?: NotificationCenterItem[] }): JSX.Element\nconst STARTER_NOTIFICATIONS: NotificationCenterItem[]',

  props: [
    { name: 'title', type: 'string', description: 'The page\'s name, shown as the current breadcrumb item.' },
    { name: 'heading', type: 'string', default: 'title', description: 'The `h1` over the content.' },
    { name: 'icon', type: 'IconComponent', default: 'RiDashboardLine', description: 'Icon on the current breadcrumb item.' },
    { name: 'actions', type: 'ReactNode', default: 'bell + Filters + Create ticket', description: 'Header actions on the right; `null` for none.' },
    { name: 'className', type: 'string', description: 'Classes on the outer frame, e.g. `h-full` instead of `h-dvh` inside a host.' },
    { name: 'columnClassName', type: 'string', description: 'Overrides the 1300px content column.' },
    { name: 'NotificationBell.notifications', type: 'NotificationCenterItem[]', default: 'STARTER_NOTIFICATIONS', description: 'The inbox shown in the popover; unread items drive the badge.' },
  ],

  reducedMotion:
    'The shell itself has no motion: the phone drawer appears and disappears without a transition. Motion inside it (the notification center, buttons) follows those components\' own reduced-motion rules.',

  cleanup:
    'The bell\'s capture-phase outside-press listener exists only while its popover is open and is removed on close or unmount. The shell holds only `navOpen` state; nothing else to release.',

  acceptance:
    'At 1280px wide the sidebar sits on the left with "Dashboard" selected, and the main column shows the breadcrumb, the heading and the bell, Filters and Create ticket buttons. The bell shows a red 3; pressing it opens the notification list below it, and pressing outside closes it. Only the main column scrolls. Below 1024px the sidebar is gone and a menu button beside the heading opens it as an overlay drawer; pressing the dimmed backdrop closes it.',

  criticalRegion: 'critical',
};

export default meta;
