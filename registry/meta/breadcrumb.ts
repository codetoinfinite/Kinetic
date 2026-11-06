import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'breadcrumb',
  title: 'Breadcrumb',
  category: 'navigation',
  kit: 'boardui',
  tags: ['breadcrumb', 'trail', 'navigation', 'icon', 'boardui'],
  blurb:
    'Ancestor-page trail with auto-inserted chevrons; each item is a link, a button or the current page, with optional 16px icons.',
  cost: 'css',
  motif: 'trail',

  files: [
    {
      path: 'registry/ui/breadcrumb.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: [],

  summary:
    'A `<nav>` holding an ordered list of ancestor pages, with a small chevron placed between items automatically. Each `BreadcrumbItem` decides its own element: a Next `Link` when it has `href`, a `<button>` when it has `onClick`, and a non-interactive `aria-current="page"` label when it is `current`. Ancestors are quiet tertiary text that lifts to secondary on a soft hover pill; the current page sits one step darker and never reacts.',

  mechanism: [
    '`Breadcrumb` runs `Children.toArray(children).filter(isValidElement)`, which drops `null`, `false` and stray strings, so conditional items can be written inline. It maps the survivors into a `<Fragment key={item.key ?? index}>` and prepends a `ChevronRightSmall` (`size-3 shrink-0 text-text-tertiary`, `aria-hidden`) before every item except the first. Consumers never place separators by hand.',
    'The wrapper is `<nav aria-label="Breadcrumb">` (override with `aria-label`) set to `flex w-full items-center overflow-x-auto` with the scrollbar hidden (`[scrollbar-width:none]` plus `[&::-webkit-scrollbar]:hidden`). Inside, an `<ol>` lays items out with `gap-2.5` and `px-1`. A long trail scrolls sideways instead of wrapping, and every item is `whitespace-nowrap`.',
    '`BreadcrumbItem` builds one `content` fragment: an optional `icon` component at `size-4 shrink-0` with `aria-hidden`, then `children`. The icon inherits the item colour.',
    'With `current`, the item is an `<li aria-current="page">` in `text-caption-1-medium text-text-secondary`, with no hover or focus styles.',
    'Otherwise the `<li>` wraps a Next `Link` (when `href` is set) or a `<button type="button">` (when it is not) sharing one class string: `-mx-1 rounded-md px-1 py-0.5`, `text-caption-1-medium text-text-tertiary`, `hover:bg-background-primary-hover hover:text-text-secondary`, a 150ms colour transition and a `focus-visible:ring-2` focus ring. The `-mx-1` cancels the `px-1`, so the hover pill grows outward and the text stays exactly on the 10px rhythm.',
    'The chevron gets `rtl:rotate-180` from the shared chevron helper, so the trail reads right-to-left with arrows pointing the right way without any prop.',
  ],

  constants: [
    {
      name: 'item gap',
      value: 'gap-2.5 (10px)',
      why: 'The Figma breadcrumb (node 3731:3011) spaces chevrons 10px from each label. The interactive items use `-mx-1 px-1` so their hover pill does not change this spacing.',
    },
    {
      name: 'chevron',
      value: 'size-3 (12px), 12×12 viewBox, 1.5px stroke',
      why: 'Small enough to read as punctuation rather than a control at the 12px caption type size. It uses `currentColor`, so `text-text-tertiary` sets its colour.',
    },
    {
      name: 'type style',
      value: 'text-caption-1-medium',
      why: 'Caption 1 Medium (12/16) is the Figma spec. A breadcrumb sits above a page title and must stay visually subordinate to it.',
    },
    {
      name: 'hover transition',
      value: '150ms transition-colors',
      why: 'Matches the kit\'s other ghost surfaces, so moving the pointer along the trail feels like the rest of the UI.',
    },
  ],

  pitfalls: [
    'Do not put separators in the children. `Breadcrumb` inserts a chevron before every item after the first, so a hand-written "/" would show up as an extra crumb with a chevron in front of it.',
    'Do not mark the current page with an `href`. When `current` is true the item ignores `href` and `onClick`. That is intentional: a link to the page you are on is noise for screen-reader users.',
    'Do not wrap the trail to a second line. It is designed to scroll horizontally with a hidden scrollbar, so keep the `whitespace-nowrap` on items when restyling them.',
    'Do not pass an icon element (`icon={<RiHome5Line />}`). The prop takes the component so the item can size it to 16px.',
  ],

  notes: [
    'An item with neither `href` nor `onClick` and without `current` still renders a `<button>` that does nothing. Use `current` for the active page.',
    'The file imports `next/link`. Outside Next, swap it for a plain `<a>` or your router\'s link.',
  ],

  apiSignature:
    'function Breadcrumb(props: { children: ReactNode; "aria-label"?: string; className?: string; ref?: Ref<HTMLElement> }): JSX.Element\nfunction BreadcrumbItem(props: { children?: ReactNode; icon?: IconComponent; href?: string; onClick?: () => void; current?: boolean; className?: string }): JSX.Element',

  props: [
    { name: 'Breadcrumb.aria-label', type: 'string', default: '"Breadcrumb"', description: 'Accessible name of the `<nav>` landmark.' },
    { name: 'BreadcrumbItem.href', type: 'string', description: 'Renders the item as a Next `Link`.' },
    { name: 'BreadcrumbItem.onClick', type: '() => void', description: 'Used when there is no `href`: the item renders as a `<button type="button">`.' },
    { name: 'BreadcrumbItem.current', type: 'boolean', default: 'false', description: 'Marks the active page with `aria-current="page"`. Not interactive, darker text.' },
    { name: 'BreadcrumbItem.icon', type: 'ComponentType<{ className?: string }>', description: '16px leading icon component that inherits the item colour.' },
  ],

  reducedMotion:
    'Nothing moves. The only animation is a 150ms colour transition on hover, which is not motion and is left as is.',

  cleanup:
    'Nothing to clean up. The component is stateless markup with no listeners, timers or effects.',

  acceptance:
    'Three items render on one line with a chevron between each pair and none before the first. Hovering an ancestor darkens its text and shows a rounded tinted background without moving any text. The last item is darker, has `aria-current="page"` and does not react to hover or clicks. Tab reaches only the ancestor items, each showing a focus ring. In an RTL container the chevrons point left. A trail wider than its container scrolls sideways with no visible scrollbar.',

  criticalRegion: 'critical',
};

export default meta;
