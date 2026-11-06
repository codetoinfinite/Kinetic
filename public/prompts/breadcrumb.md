# Build: Breadcrumb

A `<nav>` holding an ordered list of ancestor pages, with a small chevron placed between items automatically. Each `BreadcrumbItem` decides its own element: a Next `Link` when it has `href`, a `<button>` when it has `onClick`, and a non-interactive `aria-current="page"` label when it is `current`. Ancestors are quiet tertiary text that lifts to secondary on a soft hover pill; the current page sits one step darker and never reacts.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Ancestor-page trail with auto-inserted chevrons; each item is a link, a button or the current page, with optional 16px icons.

- Category: navigation
- Runtime cost: css
- Dependencies: none beyond React

## How it works

1. `Breadcrumb` runs `Children.toArray(children).filter(isValidElement)`, which drops `null`, `false` and stray strings, so conditional items can be written inline. It maps the survivors into a `<Fragment key={item.key ?? index}>` and prepends a `ChevronRightSmall` (`size-3 shrink-0 text-text-tertiary`, `aria-hidden`) before every item except the first. Consumers never place separators by hand.
2. The wrapper is `<nav aria-label="Breadcrumb">` (override with `aria-label`) set to `flex w-full items-center overflow-x-auto` with the scrollbar hidden (`[scrollbar-width:none]` plus `[&::-webkit-scrollbar]:hidden`). Inside, an `<ol>` lays items out with `gap-2.5` and `px-1`. A long trail scrolls sideways instead of wrapping, and every item is `whitespace-nowrap`.
3. `BreadcrumbItem` builds one `content` fragment: an optional `icon` component at `size-4 shrink-0` with `aria-hidden`, then `children`. The icon inherits the item colour.
4. With `current`, the item is an `<li aria-current="page">` in `text-caption-1-medium text-text-secondary`, with no hover or focus styles.
5. Otherwise the `<li>` wraps a Next `Link` (when `href` is set) or a `<button type="button">` (when it is not) sharing one class string: `-mx-1 rounded-md px-1 py-0.5`, `text-caption-1-medium text-text-tertiary`, `hover:bg-background-primary-hover hover:text-text-secondary`, a 150ms colour transition and a `focus-visible:ring-2` focus ring. The `-mx-1` cancels the `px-1`, so the hover pill grows outward and the text stays exactly on the 10px rhythm.
6. The chevron gets `rtl:rotate-180` from the shared chevron helper, so the trail reads right-to-left with arrows pointing the right way without any prop.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `item gap = gap-2.5 (10px)`
  The Figma breadcrumb (node 3731:3011) spaces chevrons 10px from each label. The interactive items use `-mx-1 px-1` so their hover pill does not change this spacing.
- `chevron = size-3 (12px), 12×12 viewBox, 1.5px stroke`
  Small enough to read as punctuation rather than a control at the 12px caption type size. It uses `currentColor`, so `text-text-tertiary` sets its colour.
- `type style = text-caption-1-medium`
  Caption 1 Medium (12/16) is the Figma spec. A breadcrumb sits above a page title and must stay visually subordinate to it.
- `hover transition = 150ms transition-colors`
  Matches the kit's other ghost surfaces, so moving the pointer along the trail feels like the rest of the UI.

## API

```ts
function Breadcrumb(props: { children: ReactNode; "aria-label"?: string; className?: string; ref?: Ref<HTMLElement> }): JSX.Element
function BreadcrumbItem(props: { children?: ReactNode; icon?: IconComponent; href?: string; onClick?: () => void; current?: boolean; className?: string }): JSX.Element
```

- `Breadcrumb.aria-label: string` — default `"Breadcrumb"`
  Accessible name of the `<nav>` landmark.
- `BreadcrumbItem.href: string`
  Renders the item as a Next `Link`.
- `BreadcrumbItem.onClick: () => void`
  Used when there is no `href`: the item renders as a `<button type="button">`.
- `BreadcrumbItem.current: boolean` — default `false`
  Marks the active page with `aria-current="page"`. Not interactive, darker text.
- `BreadcrumbItem.icon: ComponentType<{ className?: string }>`
  16px leading icon component that inherits the item colour.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function Breadcrumb({
  children,
  "aria-label": ariaLabel = "Breadcrumb",
  className,
  ref,
}: BreadcrumbProps) {
  const items = Children.toArray(children).filter(isValidElement);

  return (
    <nav
      ref={ref}
      aria-label={ariaLabel}
      className={cx(
        "flex w-full items-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      <ol className="flex items-center gap-2.5 px-1">
        {items.map((item, index) => (
          <Fragment key={item.key ?? index}>
            {/* An <ol> may only hold <li>s; aria-hidden keeps the separator out of
                the item count screen readers announce. */}
            {index > 0 && (
              <li aria-hidden className="flex shrink-0">
                <ChevronRightSmall className="size-3 text-text-tertiary" />
              </li>
            )}
            {item}
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing to clean up. The component is stateless markup with no listeners, timers or effects.

**Reduced motion.** Nothing moves. The only animation is a 150ms colour transition on hover, which is not motion and is left as is.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Do not put separators in the children. `Breadcrumb` inserts a chevron before every item after the first, so a hand-written "/" would show up as an extra crumb with a chevron in front of it.
- Do not mark the current page with an `href`. When `current` is true the item ignores `href` and `onClick`. That is intentional: a link to the page you are on is noise for screen-reader users.
- Do not wrap the trail to a second line. It is designed to scroll horizontally with a hidden scrollbar, so keep the `whitespace-nowrap` on items when restyling them.
- Do not pass an icon element (`icon={<RiHome5Line />}`). The prop takes the component so the item can size it to 16px.

## Notes

- An item with neither `href` nor `onClick` and without `current` still renders a `<button>` that does nothing. Use `current` for the active page.
- The file imports `next/link`. Outside Next, swap it for a plain `<a>` or your router's link.

## Definition of done

Three items render on one line with a chevron between each pair and none before the first. Hovering an ancestor darkens its text and shows a rounded tinted background without moving any text. The last item is darker, has `aria-current="page"` and does not react to hover or clicks. Tab reaches only the ancestor items, each showing a focus ring. In an RTL container the chevrons point left. A trail wider than its container scrolls sideways with no visible scrollbar.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
