import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'carousel',
  title: 'Carousel',
  category: 'display',
  kit: 'boardui',
  tags: ['carousel', 'gallery', 'scroll-snap', 'slides', 'rtl', 'boardui'],
  blurb:
    'A gallery you slide through on native scroll-snap: swipe, trackpad and arrow keys for free, plus end-aware arrows and a dot indicator.',
  cost: 'dom',
  motif: 'trail',

  files: [
    {
      path: 'registry/ui/carousel.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['@remixicon/react@^4.9.0'],

  summary:
    'A horizontally scrolling track with `scroll-snap-type: x mandatory`, not a transformed strip, so touch swipe, trackpad momentum and keyboard scrolling are the browser\'s own. JavaScript only answers what the DOM will not: which slide is showing and whether either end has been reached. Positions are read from each slide\'s bounding box rather than computed from a card width, so mixed widths, responsive widths and right-to-left layouts need no extra maths.',

  mechanism: [
    'The track is a flex row with `overflow-x-auto`, `overscroll-x-contain`, `snap-x snap-mandatory` and the scrollbar hidden inline (`[scrollbar-width:none]` plus `[&::-webkit-scrollbar]:hidden`). `gap` is an inline style from the `gap` prop. `tabIndex={0}` makes the track focusable, so once it has focus the arrow keys scroll it natively, and a `focus-visible` ring shows where focus went.',
    'Each `CarouselItem` is a `role="group"` with `aria-roledescription="slide"` and `w-full shrink-0 snap-start`, so by default exactly one slide fills the track. The width lives on the item, which lets a consumer pass `w-[85%]` for a peek of the next slide. With `align="center"` the track adds `[&>*]:snap-center` so every slide rests in the middle instead.',
    '`Carousel` walks its children with `Children.map` and clones each valid element with `aria-label` set to "`n` of `count`", where `count` is the number of valid elements. Callers never number their own slides. The outer wrapper is a `role="group"` with `aria-roledescription="carousel"` and takes the required `aria-label`.',
    '`measure()` reads the track. `inlineScrollOffset(scrollLeft, direction)` turns the physical `scrollLeft` (negative in RTL) into a distance from the inline start. `atStart` is that offset `<= 1` and `atEnd` is `>= scrollWidth - clientWidth - 1`. The active index is pinned to 0 at the start and to the last slide at the end. Between the ends it is the slide whose `scrollOffsetForItem(trackRect, itemRect, 0, direction, align)` is smallest in absolute value, which means the slide closest to its own snap position.',
    'One effect attaches a `ResizeObserver` to the track and a passive `scroll` listener, both calling `measure`. The observer fires once on `observe()`, and that call takes the first measurement, so the effect body never calls `setState` synchronously.',
    '`scrollToIndex(i)` clamps `i` to the slide range, computes the target `left` with `scrollOffsetForItem(trackRect, targetRect, track.scrollLeft, direction, align)` and calls `track.scrollTo({ left, behavior })`. `behavior` is `"auto"` when `matchMedia("(prefers-reduced-motion: reduce)")` matches at click time and `"smooth"` otherwise. The prev and next arrows call it with `active - 1` and `active + 1`, and each dot calls it with its own index.',
    'The arrows are two small `IconButton`s ("Previous slide", "Next slide") in a right-aligned row above the track, disabled at the matching end. The dots are real `<button>`s below the track with `aria-current` on the active one. The active dot widens from `w-1.5` to `w-4` and switches to `bg-text-primary`, with `transition-all duration-200 ease-out`.',
    'The wrapper sets `dir` from `useDirection()` (React Aria\'s `useLocale().direction`), so inside an RTL `I18nProvider` the track scrolls from the right and the geometry helpers use the right edges.',
  ],

  constants: [
    {
      name: 'edge slack',
      value: '1px',
      why: '`scrollLeft` is fractional on hi-DPI displays, so an exact comparison leaves a fully scrolled track one sub-pixel short of the end and the Next arrow stays enabled. One pixel absorbs the rounding without disabling an arrow while a real slide is still hidden.',
    },
    {
      name: 'gap',
      value: '16 (px)',
      why: 'The default space between slides, applied as an inline `gap`. Snap positions come from each slide\'s measured box, so changing it never desynchronises the arrows or dots.',
    },
    {
      name: 'dot sizes',
      value: '6px round, 16px × 6px active, 200ms ease-out',
      why: 'The active dot is a short pill rather than a colour swap alone, so the position reads without relying on contrast. 200ms is long enough to see the dot grow and short enough to keep up with a fast swipe across several slides.',
    },
    {
      name: 'arrow size',
      value: 'IconButton size="small" (32 × 32)',
      why: 'Keeps the control row compact above a card. The arrows sit in their own `justify-end` row so they never overlap slide content or cover a swipe target.',
    },
  ],

  pitfalls: [
    'Replacing the scroll track with a `translateX` strip. That throws away native swipe, momentum, trackpad and keyboard scrolling, and then all of them have to be rebuilt by hand. The design depends on the browser doing the scrolling.',
    'Computing positions as `index * cardWidth`. It breaks for mixed widths, a responsive `w-[85%]` peek, a changed gap and RTL. Always measure bounding rects and go through `scrollOffsetForItem`.',
    'Choosing the "nearest" slide at the far end. When the last slides share the viewport the final one can never reach the start edge, so the last dot would never light and clicking it would look broken. The ends must stay pinned.',
    'Wrapping slides in fragments or extra elements. The track reads `children` as DOM slides and the labels come from `Children.map`, so a fragment of three slides counts as one and the labels and dots go out of step. Render `CarouselItem`s as direct children.',
    'Rendering conditional slides as `{flag && <CarouselItem/>}`. `count` ignores the `false`, but `Children.map` still advances its index for it, so labels read "2 of 2" for the only slide. Filter the array before rendering.',
    'Hard-coding `behavior: "smooth"`. Under reduced motion the jump must be instant. The component reads the media query at click time, so keep that check when adding new ways to move the track.',
  ],

  notes: [
    'There is no controlled index API on purpose. To drive the track yourself, scroll the `.overflow-x-auto` element exactly as `scrollToIndex` does. The arrows and dots pick the change up from the `scroll` event.',
    '`showArrows={false} showDots={false}` gives a bare swipe-only track, for example a logo strip.',
  ],

  apiSignature:
    'function Carousel(props: Omit<HTMLAttributes<HTMLDivElement>, "children" | "onScroll"> & { children: ReactNode; "aria-label": string; showArrows?: boolean; showDots?: boolean; align?: "start" | "center"; gap?: number; ref?: Ref<HTMLDivElement> }): JSX.Element\nfunction CarouselItem(props: HTMLAttributes<HTMLDivElement> & { children: ReactNode; ref?: Ref<HTMLDivElement> }): JSX.Element',

  props: [
    { name: 'aria-label', type: 'string', description: 'Required. Names the carousel group for assistive tech.' },
    { name: 'children', type: 'ReactNode', description: '`CarouselItem` elements, as direct children. Each one is labelled "n of count" automatically.' },
    { name: 'showArrows', type: 'boolean', default: 'true', description: 'Previous and next icon buttons in a right-aligned row above the track. Each disables at its end.' },
    { name: 'showDots', type: 'boolean', default: 'true', description: 'Clickable position dots below the track. Only rendered when there are at least two slides.' },
    { name: 'align', type: '"start" | "center"', default: '"start"', description: 'Where a slide comes to rest when it snaps. Also drives which slide counts as active.' },
    { name: 'gap', type: 'number', default: '16', description: 'Space between slides in px, applied as an inline style.' },
    { name: 'className (CarouselItem)', type: 'string', default: '"w-full"', description: 'Override the slide width, such as `w-[85%]` for a peek or `w-[220px]` for fixed cards.' },
  ],

  reducedMotion:
    'Arrow and dot clicks jump straight to the target slide (`behavior: "auto"`) instead of smooth-scrolling. The check reads `matchMedia` at click time, so a preference changed mid-session applies immediately. Swipe and trackpad scrolling are the user\'s own input and stay as they are.',

  cleanup:
    'The single effect disconnects its `ResizeObserver` and removes the passive `scroll` listener from the track on unmount, or when `direction` or `align` change and `measure` is rebuilt. No timers or animation frames are used.',

  acceptance:
    'With four full-width slides, the Previous arrow starts disabled and the first dot is the wide one. Clicking Next smooth-scrolls exactly one slide and the second dot widens. Swiping or trackpad-scrolling snaps to a slide and updates the dots. At the last slide Next disables and the last dot lights, even when slides are narrower than the track. Clicking any dot lands on that slide. With reduced motion the arrows jump instantly. In an RTL locale the track starts at the right edge and Next moves leftward.',

  criticalRegion: 'critical',
};

export default meta;
