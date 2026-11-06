# Build: Carousel

A horizontally scrolling track with `scroll-snap-type: x mandatory`, not a transformed strip, so touch swipe, trackpad momentum and keyboard scrolling are the browser's own. JavaScript only answers what the DOM will not: which slide is showing and whether either end has been reached. Positions are read from each slide's bounding box rather than computed from a card width, so mixed widths, responsive widths and right-to-left layouts need no extra maths.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A gallery you slide through on native scroll-snap: swipe, trackpad and arrow keys for free, plus end-aware arrows and a dot indicator.

- Category: display
- Runtime cost: dom
- Dependencies: @remixicon/react@^4.9.0

## How it works

1. The track is a flex row with `overflow-x-auto`, `overscroll-x-contain`, `snap-x snap-mandatory` and the scrollbar hidden inline (`[scrollbar-width:none]` plus `[&::-webkit-scrollbar]:hidden`). `gap` is an inline style from the `gap` prop. `tabIndex={0}` makes the track focusable, so once it has focus the arrow keys scroll it natively, and a `focus-visible` ring shows where focus went.
2. Each `CarouselItem` is a `role="group"` with `aria-roledescription="slide"` and `w-full shrink-0 snap-start`, so by default exactly one slide fills the track. The width lives on the item, which lets a consumer pass `w-[85%]` for a peek of the next slide. With `align="center"` the track adds `[&>*]:snap-center` so every slide rests in the middle instead.
3. `Carousel` walks its children with `Children.map` and clones each valid element with `aria-label` set to "`n` of `count`", where `count` is the number of valid elements. Callers never number their own slides. The outer wrapper is a `role="group"` with `aria-roledescription="carousel"` and takes the required `aria-label`.
4. `measure()` reads the track. `inlineScrollOffset(scrollLeft, direction)` turns the physical `scrollLeft` (negative in RTL) into a distance from the inline start. `atStart` is that offset `<= 1` and `atEnd` is `>= scrollWidth - clientWidth - 1`. The active index is pinned to 0 at the start and to the last slide at the end. Between the ends it is the slide whose `scrollOffsetForItem(trackRect, itemRect, 0, direction, align)` is smallest in absolute value, which means the slide closest to its own snap position.
5. One effect attaches a `ResizeObserver` to the track and a passive `scroll` listener, both calling `measure`. The observer fires once on `observe()`, and that call takes the first measurement, so the effect body never calls `setState` synchronously.
6. `scrollToIndex(i)` clamps `i` to the slide range, computes the target `left` with `scrollOffsetForItem(trackRect, targetRect, track.scrollLeft, direction, align)` and calls `track.scrollTo({ left, behavior })`. `behavior` is `"auto"` when `matchMedia("(prefers-reduced-motion: reduce)")` matches at click time and `"smooth"` otherwise. The prev and next arrows call it with `active - 1` and `active + 1`, and each dot calls it with its own index.
7. The arrows are two small `IconButton`s ("Previous slide", "Next slide") in a right-aligned row above the track, disabled at the matching end. The dots are real `<button>`s below the track with `aria-current` on the active one. The active dot widens from `w-1.5` to `w-4` and switches to `bg-text-primary`, with `transition-all duration-200 ease-out`.
8. The wrapper sets `dir` from `useDirection()` (React Aria's `useLocale().direction`), so inside an RTL `I18nProvider` the track scrolls from the right and the geometry helpers use the right edges.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `edge slack = 1px`
  `scrollLeft` is fractional on hi-DPI displays, so an exact comparison leaves a fully scrolled track one sub-pixel short of the end and the Next arrow stays enabled. One pixel absorbs the rounding without disabling an arrow while a real slide is still hidden.
- `gap = 16 (px)`
  The default space between slides, applied as an inline `gap`. Snap positions come from each slide's measured box, so changing it never desynchronises the arrows or dots.
- `dot sizes = 6px round, 16px × 6px active, 200ms ease-out`
  The active dot is a short pill rather than a colour swap alone, so the position reads without relying on contrast. 200ms is long enough to see the dot grow and short enough to keep up with a fast swipe across several slides.
- `arrow size = IconButton size="small" (32 × 32)`
  Keeps the control row compact above a card. The arrows sit in their own `justify-end` row so they never overlap slide content or cover a swipe target.

## API

```ts
function Carousel(props: Omit<HTMLAttributes<HTMLDivElement>, "children" | "onScroll"> & { children: ReactNode; "aria-label": string; showArrows?: boolean; showDots?: boolean; align?: "start" | "center"; gap?: number; ref?: Ref<HTMLDivElement> }): JSX.Element
function CarouselItem(props: HTMLAttributes<HTMLDivElement> & { children: ReactNode; ref?: Ref<HTMLDivElement> }): JSX.Element
```

- `aria-label: string`
  Required. Names the carousel group for assistive tech.
- `children: ReactNode`
  `CarouselItem` elements, as direct children. Each one is labelled "n of count" automatically.
- `showArrows: boolean` — default `true`
  Previous and next icon buttons in a right-aligned row above the track. Each disables at its end.
- `showDots: boolean` — default `true`
  Clickable position dots below the track. Only rendered when there are at least two slides.
- `align: "start" | "center"` — default `"start"`
  Where a slide comes to rest when it snaps. Also drives which slide counts as active.
- `gap: number` — default `16`
  Space between slides in px, applied as an inline style.
- `className (CarouselItem): string` — default `"w-full"`
  Override the slide width, such as `w-[85%]` for a peek or `w-[220px]` for fixed cards.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function Carousel({
  children,
  showArrows = true,
  showDots = true,
  align = "start",
  gap = 16,
  className,
  ref,
  ...props
}: CarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const direction = useDirection();
  const [active, setActive] = useState(0);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const count = Children.toArray(children).filter(isValidElement).length;

  const items = useCallback(
    () => Array.from(trackRef.current?.children ?? []) as HTMLElement[],
    [],
  );

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;

    // 1px of slack: scrollLeft is fractional on hi-DPI displays, so an exact
    // comparison leaves the end arrow enabled on a fully scrolled track.
    const offset = inlineScrollOffset(track.scrollLeft, direction);
    const start = offset <= 1;
    const end = offset >= track.scrollWidth - track.clientWidth - 1;
    setAtStart(start);
    setAtEnd(end);

    const all = items();
    if (all.length === 0) return;

    // At the far end the last cards share the viewport, so the final card can
    // never reach the start edge and "nearest" would settle on the one before
    // it — leaving the last dot permanently unlit and making a click on it
    // look broken. The ends are therefore pinned rather than measured.
    if (end) {
      setActive(all.length - 1);
      return;
    }
    if (start) {
      setActive(0);
      return;
    }

    let nearest = 0;
    let shortest = Number.POSITIVE_INFINITY;
    all.forEach((item, index) => {
      const distance = Math.abs(scrollOffsetForItem(track.getBoundingClientRect(), item.getBoundingClientRect(), 0, direction, align));
      if (distance < shortest) {
        shortest = distance;
        nearest = index;
      }
    });
    setActive(nearest);
  }, [items, direction, align]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    // ResizeObserver fires once on observe, which is what takes the first
    // measurement — no synchronous setState in the effect body.
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    track.addEventListener("scroll", measure, { passive: true });
    return () => {
      observer.disconnect();
      track.removeEventListener("scroll", measure);
    };
  }, [measure]);

  const scrollToIndex = (index: number) => {
    const track = trackRef.current;
    const target = items()[Math.max(0, Math.min(index, count - 1))];
    if (!track || !target) return;
    // `matchMedia` rather than a hook: this runs on click, so reading the
    // preference at that moment is both current and cheap.
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const left = scrollOffsetForItem(track.getBoundingClientRect(), target.getBoundingClientRect(), track.scrollLeft, direction, align);
    track.scrollTo({ left, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <div
      ref={ref}
      role="group"
      dir={direction}
      aria-roledescription="carousel"
      className={cx("flex w-full flex-col gap-4", className)}
      {...props}
    >
      {showArrows && count > 0 ? (
        <div className="flex items-center justify-end gap-2">
          <IconButton
            icon={RiArrowLeftSLine}
            size="small"
            aria-label="Previous slide"
            disabled={atStart}
            onClick={() => scrollToIndex(active - 1)}
          />
          <IconButton
            icon={RiArrowRightSLine}
            size="small"
            aria-label="Next slide"
            disabled={atEnd}
            onClick={() => scrollToIndex(active + 1)}
          />
        </div>
      ) : null}

      {/* `tabIndex` makes the track focusable so it can be scrolled with the
          arrow keys, which is the browser's own behaviour once it has focus.
          The scrollbar is hidden inline rather than through a global class, so
          the component stays self-contained. */}
      <div
        ref={trackRef}
        tabIndex={0}
        className={cx(
          "relative flex w-full overflow-x-auto overscroll-x-contain outline-none",
          "snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          "focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:ring-offset-2",
          align === "center" && "[&>*]:snap-center",
        )}
        style={{ gap }}
      >
        {/* The position label is applied here so callers never have to
            hand-number their own slides. */}
        {Children.map(children, (child, index) =>
          isValidElement<CarouselItemProps>(child)
            ? cloneElement(child, { "aria-label": `${index + 1} of ${count}` })
            : child,
        )}
      </div>

      {showDots && count > 1 ? (
        <div className="flex items-center justify-center gap-1.5">
          {Array.from({ length: count }, (_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Go to slide ${index + 1}`}
              aria-current={index === active}
              onClick={() => scrollToIndex(index)}
              className={cx(
                "h-1.5 cursor-pointer rounded-full transition-all duration-200 ease-out",
                index === active
                  ? "w-4 bg-text-primary"
                  : "w-1.5 bg-background-tertiary-default hover:bg-border-button-active",
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The single effect disconnects its `ResizeObserver` and removes the passive `scroll` listener from the track on unmount, or when `direction` or `align` change and `measure` is rebuilt. No timers or animation frames are used.

**Reduced motion.** Arrow and dot clicks jump straight to the target slide (`behavior: "auto"`) instead of smooth-scrolling. The check reads `matchMedia` at click time, so a preference changed mid-session applies immediately. Swipe and trackpad scrolling are the user's own input and stay as they are.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Replacing the scroll track with a `translateX` strip. That throws away native swipe, momentum, trackpad and keyboard scrolling, and then all of them have to be rebuilt by hand. The design depends on the browser doing the scrolling.
- Computing positions as `index * cardWidth`. It breaks for mixed widths, a responsive `w-[85%]` peek, a changed gap and RTL. Always measure bounding rects and go through `scrollOffsetForItem`.
- Choosing the "nearest" slide at the far end. When the last slides share the viewport the final one can never reach the start edge, so the last dot would never light and clicking it would look broken. The ends must stay pinned.
- Wrapping slides in fragments or extra elements. The track reads `children` as DOM slides and the labels come from `Children.map`, so a fragment of three slides counts as one and the labels and dots go out of step. Render `CarouselItem`s as direct children.
- Rendering conditional slides as `{flag && <CarouselItem/>}`. `count` ignores the `false`, but `Children.map` still advances its index for it, so labels read "2 of 2" for the only slide. Filter the array before rendering.
- Hard-coding `behavior: "smooth"`. Under reduced motion the jump must be instant. The component reads the media query at click time, so keep that check when adding new ways to move the track.

## Notes

- There is no controlled index API on purpose. To drive the track yourself, scroll the `.overflow-x-auto` element exactly as `scrollToIndex` does. The arrows and dots pick the change up from the `scroll` event.
- `showArrows={false} showDots={false}` gives a bare swipe-only track, for example a logo strip.

## Definition of done

With four full-width slides, the Previous arrow starts disabled and the first dot is the wide one. Clicking Next smooth-scrolls exactly one slide and the second dot widens. Swiping or trackpad-scrolling snaps to a slide and updates the dots. At the last slide Next disables and the last dot lights, even when slides are narrower than the track. Clicking any dot lands on that slide. With reduced motion the arrows jump instantly. In an RTL locale the track starts at the right edge and Next moves leftward.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
