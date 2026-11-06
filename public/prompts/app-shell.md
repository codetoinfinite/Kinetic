# Build: App Shell

The page standard every BoardUI template follows: a full-height frame with the dashboard sidebar on large screens (an overlay drawer below `lg`), and a main column of at most 1300px holding a breadcrumb trail, the page heading with its actions, and the page content sitting directly on the page background. The starter's navigation is generated from one base path read off the URL, so the sidebar only links to pages the app has. The default header actions are a notification bell with an unread badge that opens the notification center in a popover, plus Filters and Create ticket buttons.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Page frame for the chat starter: sidebar, phone drawer, breadcrumb and heading over a 1300px column, with a notification bell.

- Category: block
- Runtime cost: dom
- Dependencies: @remixicon/react@^4.9.0, react-aria-components@^1.22.1

## How it works

1. `AppShell` renders a `relative flex h-dvh w-full gap-4 overflow-hidden bg-background-full p-3` row: `DashboardSidebar` (hidden below `lg`) and a `<main>` that is the only scroller (`flex-1 overflow-y-auto overflow-x-hidden`, `sm:pt-3`) centring a `max-w-[1300px] flex-col gap-2.5` column. `columnClassName` overrides the column width.
2. Navigation comes from `starterNav(base)`: Chat, Dashboard, Components and Blocks, Sign in, Sign up, each `href` prefixed with `base`. `useStarterBase()` returns a pinned base from `StarterBaseContext` when a host provides one, else matches `pathname` against `/templates/chat-starter` (with an optional language prefix) and falls back to "" in a deployed copy. `useStarterSelected()` maps the rest of the path to "dashboard", "components" or "chat".
3. Below `lg`, an `IconButton` beside the heading toggles `navOpen`; when true a `fixed inset-0 z-50 lg:hidden` layer renders a full-bleed `<button aria-label="Close navigation">` backdrop (`bg-black/40`) and the sidebar in `mobile` mode with `onClose`. The toggle swaps its glyph between `RiMenuLine` and `RiCloseLine`.
4. The header is a `Breadcrumb` (team avatar, member avatar, then the current page with `icon`) over a wrapping row: the `h1` (`text-title-2-medium`, `heading` defaulting to `title`) on the left and the actions on the right. `actions` undefined renders the defaults; `null` renders none.
5. `NotificationBell` owns `isOpen` and two refs: an `IconButton` trigger with `aria-expanded` / `aria-haspopup="dialog"` and a React Aria `Popover` (`placement="bottom end"`, `offset={8}`, `isNonModal`, `w-[440px] max-w-[calc(100vw-24px)]`) holding a `Dialog` with `NotificationCenter`. Outside presses close it via `useDismissOnOutsidePress`. The unread count (items with `unread`) shows in a 16px red badge at `top-0.5 start-[18px]` that loses its 1.5px ring on hover and press.
6. Both the shell and the bell run their JSX through `useTemplateCopy()`'s `localize`, so localized templates translate the fixed copy without the components taking strings as props.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `content column = max-w-[1300px]`
  The width every BoardUI template page uses, so cards and tables line up across pages; the catalogue overrides it (e.g. `max-w-[964px]`) through `columnClassName`.
- `sidebar breakpoint = lg (1024px)`
  Below it the sidebar would squeeze the content column, so it becomes an overlay drawer opened from the header.
- `notification popover = 440px wide, max-w-[calc(100vw-24px)], bottom end, offset 8`
  Wide enough for a notification row with inline actions; end alignment keeps it under the bell at the right of the header.
- `STARTER_SITE_PREFIX = "/templates/chat-starter"`
  Where the starter lives on the hosted site; reading it off the URL lets the same files run hosted or deployed at the root untouched.

## API

```ts
function AppShell(props: { title: string; heading?: string; icon?: IconComponent; actions?: ReactNode; children: ReactNode; className?: string; columnClassName?: string }): JSX.Element
const StarterBaseContext: Context<string | null>
const STARTER_SITE_PREFIX = "/templates/chat-starter"
function useStarterBase(): string
function starterNav(base: string): DashboardNavItem[]
function useStarterSelected(): string
function NotificationBell(props?: { notifications?: NotificationCenterItem[] }): JSX.Element
const STARTER_NOTIFICATIONS: NotificationCenterItem[]
```

- `title: string`
  The page's name, shown as the current breadcrumb item.
- `heading: string` — default `title`
  The `h1` over the content.
- `icon: IconComponent` — default `RiDashboardLine`
  Icon on the current breadcrumb item.
- `actions: ReactNode` — default `bell + Filters + Create ticket`
  Header actions on the right; `null` for none.
- `className: string`
  Classes on the outer frame, e.g. `h-full` instead of `h-dvh` inside a host.
- `columnClassName: string`
  Overrides the 1300px content column.
- `NotificationBell.notifications: NotificationCenterItem[]` — default `STARTER_NOTIFICATIONS`
  The inbox shown in the popover; unread items drive the badge.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/**
 * The page standard every BoardUI template follows, free or Pro: content sits
 * directly on the page background inside a 1300px column, so cards and tables
 * carry their own surfaces; above it a breadcrumb trail (team, member, page)
 * and the page heading. Pages pass what differs and get the rest.
 */
export function AppShell({
  title,
  heading = title,
  icon: Icon = RiDashboardLine,
  actions,
  children,
  className,
  columnClassName,
}: {
  /** The page's name, shown as the current breadcrumb item. */
  title: string;
  /** The heading over the content. Defaults to the title. */
  heading?: string;
  /** Icon on the current breadcrumb item. */
  icon?: IconComponent;
  /** Header actions on the right; the Pro dashboard's set by default, `null` for none. */
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Overrides the 1300px content column, e.g. `max-w-[964px]` for the catalogue's grids. */
  columnClassName?: string;
}) {
  const localize = useTemplateCopy();
  const [navOpen, setNavOpen] = useState(false);
  const items = starterNav(useStarterBase());
  const selected = useStarterSelected();

  return localize((
    <div
      className={cx(
        "relative flex h-dvh w-full gap-4 overflow-hidden bg-background-full p-3",
        className,
      )}
    >
      <DashboardSidebar items={items} selected={selected} className="hidden lg:flex" />

      {/* Below lg the sidebar rides in as an overlay drawer. */}
      {navOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setNavOpen(false)}
            className="absolute inset-0 cursor-pointer bg-black/40"
          />
          <div className="relative flex h-full p-3">
            <DashboardSidebar
              mobile
              items={items}
              selected={selected}
              onClose={() => setNavOpen(false)}
              className="flex"
            />
          </div>
        </div>
      )}

      <main className="relative flex min-h-0 min-w-0 flex-1 justify-center overflow-x-hidden overflow-y-auto bg-background-full sm:pt-3">
        <div className={cx("flex w-full max-w-[1300px] flex-col gap-2.5", columnClassName)}>
          <header className="flex w-full flex-col gap-2">
            <Breadcrumb>
              <BreadcrumbItem href="#">
                <Avatar size="xs" color="blue" initials="A" />
                Acme team
              </BreadcrumbItem>
              <BreadcrumbItem href="#">
                <Avatar size="xs" color="neutral" initials="J" />
                Jordan
              </BreadcrumbItem>
              <BreadcrumbItem current icon={Icon}>
                {title}
              </BreadcrumbItem>
            </Breadcrumb>
            <div className="flex w-full flex-wrap items-end justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1.5">
                <IconButton
                  icon={navOpen ? RiCloseLine : RiMenuLine}
                  size="medium"
                  aria-label="Open navigation"
                  onClick={() => setNavOpen((open) => !open)}
                  className="lg:hidden"
                />
                <h1 className="px-1 text-title-2-medium whitespace-nowrap text-text-primary">
                  {heading}
                </h1>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2.5">
                {actions !== undefined ? actions : (
                  <>
                    <NotificationBell />
                    <Button variant="secondary" size="medium" leadingIcon={RiFilter3Fill}>
                      Filters
                    </Button>
                    <Button variant="primary" size="medium" leadingIcon={RiAddFill}>
                      Create ticket
                    </Button>
                  </>
                )}
              </div>
            </div>
          </header>
          <div className="flex w-full flex-col gap-4 pb-4">{children}</div>
        </div>
      </main>
    </div>
  ));
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The bell's capture-phase outside-press listener exists only while its popover is open and is removed on close or unmount. The shell holds only `navOpen` state; nothing else to release.

**Reduced motion.** The shell itself has no motion: the phone drawer appears and disappears without a transition. Motion inside it (the notification center, buttons) follows those components' own reduced-motion rules.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Do not configure the base path in two places. It is read off the URL (or pinned with `StarterBaseContext` by a host whose path has no prefix), so the sidebar never links to a page the app lacks.
- Do not let the whole frame scroll. The outer row is `h-dvh overflow-hidden` and only `<main>` scrolls, so the sidebar stays put.
- Do not make the bell popover modal to get outside dismissal; it is `isNonModal` and closed by `useDismissOnOutsidePress`, so opening it does not lock page scroll.
- Do not pass `actions={undefined}` expecting no actions. `undefined` means "use the defaults"; pass `null` to render none.

## Notes

- `STARTER_NOTIFICATIONS` is the sample inbox: five items over Today and Yesterday, three unread, matching the sidebar badge and the bell. `STARTER_UNREAD_COUNT` is derived from it.
- The shell's sample breadcrumb (Acme team, Jordan) is fixed copy; real apps replace it with their own trail.

## Definition of done

At 1280px wide the sidebar sits on the left with "Dashboard" selected, and the main column shows the breadcrumb, the heading and the bell, Filters and Create ticket buttons. The bell shows a red 3; pressing it opens the notification list below it, and pressing outside closes it. Only the main column scrolls. Below 1024px the sidebar is gone and a menu button beside the heading opens it as an overlay drawer; pressing the dimmed backdrop closes it.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
