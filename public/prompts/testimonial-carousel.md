# Build: Testimonial Carousel

A landing-page testimonial strip: a pill label, then a horizontal track where the active quote sits centred and its neighbours peek in at the edges, faded out by a mask. Each slide shows an initials avatar, the name, "role at company" with an optional link and handle, and a large quote. Below sit previous / next buttons, a row of dots whose active dot widens into a pill that fills as the autoplay timer runs, and a button to stop autoplay.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A centred quote carousel with faded neighbours, initials avatars, prev / next, progress dots and autoplay that pauses on hover and focus.

- Category: block
- Runtime cost: dom
- Dependencies: @remixicon/react@^4.9.0

## How it works

1. Slides sit in one flex track, each `flex-basis: var(--slide)`. The section is a size container and sets `--slide` to 86% below `@2xl` and 60% from it. The track is translated by `calc((100% - var(--slide)) / 2 - var(--slide) * index)`, which centres the active slide and leaves the neighbours peeking in on both sides. Percentages resolve against the track, which is exactly as wide as the viewport.
2. The viewport clips with `overflow-hidden` and fades both edges with Tailwind `mask-x-from-80% mask-x-to-100%` (92% when narrow), so neighbours dissolve rather than end at a hard edge. Inactive slides also drop to 40% opacity and get `inert` plus `aria-hidden`, which keeps their links out of the tab order.
3. The autoplay timer is the active dot itself: a Web Animation grows the dot fill from `scale: 0 1` to `scale: 1 1` over `interval` ms, and its `onfinish` advances to the next slide. Pausing calls `animation.pause()`, so the remaining time is kept and the fill visibly stops.
4. Hover (`pointerenter` / `pointerleave` on the section) and focus inside the section (`focus`, and `blur` whose `relatedTarget` falls outside) both pause it. The stop button turns autoplay off entirely; `prefers-reduced-motion` turns it off and hides that button.
5. Navigation wraps with `((next % count) + count) % count`. Each change calls `onIndexChange`. The track uses `aria-live="off"` while autoplay is running and `"polite"` otherwise, so manual changes are announced and timed ones are not.
6. The section carries `aria-roledescription="carousel"`; each slide is a `figure` with `role="group"`, `aria-roledescription="slide"` and an "n of N" label. Dots are buttons labelled "Show testimonial n" with `aria-current` on the active one.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `--slide = 60% from @2xl, 86% below`
  Wide: 20% of each neighbour shows, enough to read as a carousel without competing with the active quote. Narrow: the quote needs nearly the full width, so only a sliver peeks in.
- `SLIDE_MS = 520`
  Long enough for the eye to follow a full-width slide, with an ease-out-expo curve `cubic-bezier(0.22, 1, 0.36, 1)` so it settles quickly.
- `interval = 6000`
  Roughly the time needed to read a two-line quote twice. WCAG 2.2.2 asks for a way to pause anything that moves for over 5 seconds, which the hover, focus and stop controls provide.
- `edge mask = mask-x-from-80% (92% narrow)`
  The fade spans the neighbour peek exactly, so neighbour text fades out towards the edge and the active slide stays fully opaque.

## API

```ts
function TestimonialCarousel(props: { items: Testimonial[]; label?: ReactNode; "aria-label"?: string; interval?: number; defaultIndex?: number; onIndexChange?: (index: number) => void; className?: string }): JSX.Element
interface Testimonial { id: string; quote: ReactNode; name: string; role: string; company?: string; companyHref?: string; handle?: string; initials?: string; avatarColor?: "neutral" | "blue" | "lime" | "pink" }
```

- `items: Testimonial[]`
  Quotes in order.
- `label: ReactNode`
  Pill text above the track.
- `aria-label: string` — default `"Testimonials"`
  Accessible name of the carousel section.
- `interval: number` — default `6000`
  Autoplay time per quote in ms; 0 disables autoplay.
- `defaultIndex: number` — default `0`
  Initially active quote (clamped to the item range).
- `onIndexChange: (index: number) => void`
  Fires on every change, manual or timed.
- `className: string`
  Merged onto the section.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function TestimonialCarousel({
  items,
  label,
  "aria-label": ariaLabel = "Testimonials",
  interval = 6000,
  defaultIndex = 0,
  onIndexChange,
  className,
}: TestimonialCarouselProps) {
  const uid = useId();
  const count = items.length;
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(() => Math.min(Math.max(defaultIndex, 0), Math.max(count - 1, 0)));
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [stopped, setStopped] = useState(false);
  const fillRef = useRef<HTMLSpanElement>(null);
  const animRef = useRef<Animation | null>(null);

  const go = useCallback(
    (next: number) => {
      if (count === 0) return;
      const wrapped = ((next % count) + count) % count;
      setIndex(wrapped);
      onIndexChange?.(wrapped);
    },
    [count, onIndexChange],
  );

  // Autoplay is never on under reduced motion, with one item, or after the user stops it.
  const autoplay = interval > 0 && count > 1 && !reduced && !stopped;
  const paused = hovered || focused;

  // The active dot's fill IS the timer: a Web Animation that grows across `interval`
  // and advances the slide when it finishes. Pausing the animation pauses the timer
  // with its remaining time intact, so hover never resets the countdown.
  useEffect(() => {
    const fill = fillRef.current;
    if (!autoplay || !fill || typeof fill.animate !== "function") return;
    const anim = fill.animate([{ scale: "0 1" }, { scale: "1 1" }], {
      duration: interval,
      easing: "linear",
      fill: "forwards",
    });
    anim.onfinish = () => go(index + 1);
    animRef.current = anim;
    return () => {
      anim.onfinish = null;
      anim.cancel();
      animRef.current = null;
    };
  }, [autoplay, interval, index, go]);

  useEffect(() => {
    const anim = animRef.current;
    if (!anim) return;
    if (paused) anim.pause();
    else if (anim.playState === "paused") anim.play();
  }, [paused, index, autoplay]);

  const onBlur = (event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
  };

  return (
    <section
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={onBlur}
      className={cx("@container flex w-full flex-col items-center", className)}
    >
      {label && (
        <span className="rounded-full bg-background-primary-default px-3.5 py-1.5 text-body-2-medium text-text-secondary shadow-xs ring-1 ring-separator-border">
          {label}
        </span>
      )}

      <div className={cx("mt-8 w-full overflow-hidden mask-x-from-92% mask-x-to-100% @2xl:mask-x-from-80%", SLIDE_WIDTH)}>
        <div
          aria-live={autoplay && !paused ? "off" : "polite"}
          className="flex w-full transition-transform ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
          style={{
            // Percentages resolve against the track, which is exactly as wide as the viewport.
            transform: `translateX(calc((100% - var(--slide)) / 2 - var(--slide) * ${index}))`,
            transitionDuration: `${SLIDE_MS}ms`,
          }}
        >
          {items.map((item, i) => {
            const active = i === index;
            return (
              <figure
                key={item.id}
                id={`${uid}-slide-${i}`}
                role="group"
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${count}`}
                aria-hidden={!active}
                inert={!active}
                className={cx(
                  "flex shrink-0 basis-(--slide) flex-col items-center px-4 text-center transition-opacity duration-500 ease-out motion-reduce:transition-none @container",
                  active ? "opacity-100" : "opacity-40",
                )}
              >
                <figcaption className="flex items-center gap-3 text-left">
                  <Avatar
                    size="lg"
                    color={item.avatarColor ?? "neutral"}
                    initials={item.initials ?? initialsOf(item.name)}
                    className="size-11 text-headline-semibold"
                  />
                  <span className="flex flex-col">
                    <span className="text-body-semibold text-text-primary">{item.name}</span>
                    <span className="text-body-2-regular text-text-tertiary">
                      {item.role}
                      {item.company && (
                        <>
                          {" at "}
                          {item.companyHref ? (
                            <a
                              href={item.companyHref}
                              className="text-text-secondary underline decoration-separator-border-strong underline-offset-2 hover:text-text-primary"
                            >
                              {item.company}
                            </a>
                          ) : (
                            <span className="text-text-secondary">{item.company}</span>
                          )}
                        </>
                      )}
                      {item.handle && <span className="text-text-tertiary">{` · ${item.handle}`}</span>}
                    </span>
                  </span>
                </figcaption>
                <blockquote className="mt-6 max-w-3xl text-title-2-medium tracking-tight text-balance text-text-primary @lg:text-title-1-medium">
                  <p>{item.quote}</p>
                </blockquote>
              </figure>
            );
          })}
        </div>
      </div>

      {count > 1 && (
        <div className="mt-8 flex items-center gap-3">
          <IconButton size="small" icon={RiArrowLeftSLine} aria-label="Previous testimonial" onClick={() => go(index - 1)} className="rounded-full" />
          <div className="flex items-center gap-1.5">
            {items.map((item, i) => {
              const active = i === index;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-label={`Show testimonial ${i + 1}`}
                  aria-controls={`${uid}-slide-${i}`}
                  aria-current={active ? "true" : undefined}
                  onClick={() => go(i)}
                  className="group grid h-6 cursor-pointer place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
                >
                  <span
                    className={cx(
                      "relative block h-1.5 overflow-hidden rounded-full transition-[width,background-color] duration-300 ease-out motion-reduce:transition-none",
                      active ? "w-8 bg-background-quaternary-default" : "w-1.5 bg-background-tertiary-hover group-hover:bg-foreground-icon-quaternary",
                    )}
                  >
                    {active && (
                      <span
                        ref={fillRef}
                        aria-hidden
                        className={cx("absolute inset-0 origin-left rounded-full bg-text-primary", autoplay && "scale-x-0")}
                      />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
          <IconButton size="small" icon={RiArrowRightSLine} aria-label="Next testimonial" onClick={() => go(index + 1)} className="rounded-full" />
          {interval > 0 && !reduced && (
            <IconButton
              size="small"
              icon={stopped ? RiPlayLine : RiPauseLine}
              aria-label={stopped ? "Start autoplay" : "Stop autoplay"}
              onClick={() => setStopped((s) => !s)}
              className="ml-1 rounded-full"
            />
          )}
        </div>
      )}
    </section>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The dot-fill Web Animation is cancelled and its `onfinish` cleared whenever the slide, interval or autoplay state changes and on unmount, so no timer survives the component.

**Reduced motion.** Under `prefers-reduced-motion: reduce` autoplay never starts and the stop button is not rendered. The track slide, slide fade and dot width changes use `motion-reduce:transition-none`, so prev / next and dots switch instantly.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Restarting a `setTimeout` on every hover leave. The countdown resets and a reader who keeps nudging the mouse never sees the next quote; pausing the animation keeps the remaining time.
- Animating `transform` on an element that also has a Tailwind v4 `scale-x-*` class. v4 writes the separate `scale` property, which multiplies with `transform`, so the fill would stay at 0; the animation targets `scale` instead.
- Leaving off-screen slides focusable. Tabbing would land on a hidden company link and scroll the track; `inert` removes them.
- Announcing every timed slide change. `aria-live` stays `off` while autoplay runs.

## Notes

- Pass `interval={0}` for a manual-only carousel; the dots then show a solid active pill.
- Quotes are `ReactNode`, so a highlighted phrase can be wrapped in `<strong>`.

## Definition of done

Four quotes load with the first centred and the next one faded at the right edge. The first dot is a wide pill that fills over six seconds, then the track slides to quote two. Hovering the section stops the fill where it is and no slide change happens until the pointer leaves. Next / previous wrap around the ends; clicking dot 3 jumps to quote 3 and sets `aria-current` on it. The stop button freezes autoplay and turns into a play button. With reduced motion nothing advances on its own.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
