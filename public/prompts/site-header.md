# Build: Site Header

The landing page's top bar: a brand lockup, a row of nav links where any link with `items` becomes a menu button, and an action cluster of search pill, social icons, GitHub star count, a free slot and the kit ThemeToggle. It responds to its own width through a container query, so the same header collapses to a menu button that opens the kit Drawer whenever its container is under 896px, whatever the window size.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Marketing header with a menu link, a ⌘K search pill, a GitHub star pill and the theme toggle, folding into a drawer in narrow containers.

- Category: block
- Runtime cost: css
- Dependencies: @remixicon/react@^4.9.0

## How it works

1. The `<header>` is an `@container/site-header`. Every responsive switch is a container variant (`@4xl/site-header:` = 56rem = 896px): the desktop `<nav>`, the socials/GitHub/actions/theme cluster and the full search pill appear at that width, and the menu IconButton hides at it. Media queries are never used, so a header placed in a narrow column or a scaled preview still picks the right layout.
2. Links with an `items` array render through `NavMenu`, which wraps the kit `Dropdown`. Open state lives in the header (`openMenu` holds the label of the one open menu), so opening a second menu closes the first. The trigger is a React Aria button (Enter, Space and Escape for free); its chevron rotates 180deg on open; the panel holds plain `<a>` rows, so destinations keep native link behaviour, and picking a row calls `onNavigate` then closes the panel.
3. Current page: `isCurrentLink` marks a link current when its `href`, or any row of its menu, equals `currentHref`. Current anchors get `aria-current="page"`, which the shared link class styles as primary text, and current menu rows take the dropdown hover fill.
4. The search trigger is a `<button>` that calls `onSearch`. The shortcut chip is display only (it sets `aria-keyshortcuts="Meta+K"` for the default label); the key binding belongs to whatever the search opens, e.g. the kit CommandPalette, whose `shortcut="k"` already toggles it. Below 896px the pill shrinks to a 40px icon button.
5. The narrow layout puts the same data in a `DrawerTrigger` + `Drawer placement="end" size="sm"`: plain links become full-width menu rows, each menu becomes a labelled group of its rows, and the GitHub pill, actions and a ThemeToggle sit under a divider. Every row calls `close()` from the Drawer render prop after `onNavigate`, so navigating dismisses the sheet.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `bar height = h-[72px]`
  Matches the reference: a 40px control row (search pill, GitHub pill, theme toggle) with 16px of air above and below.
- `collapse width = @4xl (896px container)`
  Below it the four links plus a 220px search pill, two socials, the GitHub pill, Get Pro and the toggle no longer fit on one line at 1280px max width.
- `search pill = w-[220px] h-10 rounded-full`
  Wide enough for "Quick Search" plus the ⌘K chip without truncation; 40px matches the toggle and GitHub pill so the cluster shares one baseline.
- `menu panel = w-[320px]`
  Room for a 32px icon tile plus a one-line description; the default 266px menu width wraps the descriptions.

## API

```ts
function SiteHeader(props: { brand?: ReactNode; brandHref?: string; links?: SiteHeaderLink[]; currentHref?: string; onNavigate?: (href: string, event: MouseEvent<HTMLAnchorElement>) => void; onSearch?: () => void; searchLabel?: string; searchShortcut?: string; socials?: SiteHeaderSocial[]; githubHref?: string; githubStars?: number; actions?: ReactNode; showThemeToggle?: boolean; sticky?: boolean; menuLabel?: string; className?: string }): JSX.Element
function SiteHeaderLogo(props: { name?: string }): JSX.Element
```

- `links: SiteHeaderLink[]` — default `[]`
  `{ label, href?, items? }`. A link with `items` (`{ label, href, description?, icon? }`) becomes a menu button.
- `currentHref: string`
  Marks the matching link or menu row with `aria-current="page"`.
- `onNavigate: (href, event) => void`
  Called for every link and row; prevent the default for client routing.
- `onSearch: () => void`
  Search trigger press. Omit it to hide the trigger.
- `searchLabel: string` — default `"Quick Search"`
  Pill text and the trigger's accessible name.
- `searchShortcut: string` — default `"⌘K"`
  Shortcut chip in the pill. Display only.
- `socials: SiteHeaderSocial[]` — default `[]`
  Icon links (`{ label, href, icon }`) before the GitHub pill.
- `githubHref / githubStars: string / number`
  GitHub pill target and compact-formatted star count.
- `actions: ReactNode`
  Extra controls before the theme toggle; repeated in the drawer.
- `showThemeToggle: boolean` — default `true`
  Renders the kit ThemeToggle (segmented) on the end edge and in the drawer.
- `sticky: boolean` — default `false`
  Pins the bar to the top of its scroll container.
- `brand / brandHref: ReactNode / string` — default `SiteHeaderLogo / "/"`
  Lockup on the start edge and its link.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/** A link counts as current when it, or any row of its menu, matches the page. */
function isCurrentLink(link: SiteHeaderLink, currentHref: string | undefined) {
  if (currentHref === undefined) return false;
  return link.href === currentHref || (link.items ?? []).some((item) => item.href === currentHref);
}

/**
 * A nav link with rows: a real menu button (Enter, Space, Escape, outside
 * press all handled by the kit Dropdown) whose panel holds plain anchors, so
 * middle-click and "open in new tab" still work on every destination. The
 * chevron flips with the open state; picking a row closes the panel.
 */
function NavMenu({
  link,
  items,
  currentHref,
  isOpen,
  onOpenChange,
  onNavigate,
}: {
  link: SiteHeaderLink;
  items: SiteHeaderMenuItem[];
  currentHref: string | undefined;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: SiteHeaderProps["onNavigate"];
}) {
  return (
    <Dropdown isOpen={isOpen} onOpenChange={onOpenChange}>
      <DropdownTrigger className={cx(linkClass, "cursor-pointer", isCurrentLink(link, currentHref) && "text-text-primary")}>
        {link.label}
        <RiArrowDownSLine
          aria-hidden
          className={cx(
            "size-4 transition-transform duration-200 ease-out motion-reduce:transition-none",
            isOpen && "rotate-180",
          )}
        />
      </DropdownTrigger>
      <DropdownPopover aria-label={link.label} className="w-[320px]">
        {items.map((item) => (
          <MenuRow
            key={item.href}
            item={item}
            current={item.href === currentHref}
            onClick={(event) => {
              onNavigate?.(item.href, event);
              onOpenChange(false);
            }}
          />
        ))}
      </DropdownPopover>
    </Dropdown>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing of its own: no listeners, timers or effects. The Dropdown and Drawer clean up their overlays and outside-press listeners when they close or unmount.

**Reduced motion.** The menu chevron's rotation transition is removed with `motion-reduce:transition-none`; the kit Dropdown and Drawer apply their own reduced-motion fades. Colour hover transitions stay because they do not move anything.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Using `md:` / `lg:` media variants for the collapse. The header then follows the window, not its container, and shows the desktop row inside a narrow column (or the mobile row in a scaled preview).
- Binding ⌘K inside the header as well as in the search it opens. Two listeners on the same key open and immediately close the palette; keep the chip display-only.
- Rendering menu rows as buttons that set `location`. Rows are anchors on purpose, so middle-click, copy link and open-in-new-tab work.
- Forgetting `event.preventDefault()` in `onNavigate` when routing on the client: the anchor then performs a full navigation as well.

## Notes

- The ThemeToggle is the kit's own: it switches the whole document's theme and persists the choice, so two headers on one page stay in sync.
- `SiteHeaderLogo` is exported for reuse in footers; pass any node as `brand` to replace it.

## Definition of done

At 1280px the bar shows the logo, Components with a chevron, Templates, Docs, Blog, a Quick Search pill with ⌘K, two social icons, a GitHub pill reading 963, Get Pro and the theme toggle. Clicking Components opens a panel of three rows; choosing Charts closes it and marks Components current. Escape closes the panel. Clicking the search pill opens the command palette. In a 390px container only the logo, a search icon and a menu button show; the menu button opens an end drawer listing every link, and choosing one closes the drawer.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
