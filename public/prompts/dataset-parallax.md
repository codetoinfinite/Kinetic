# Build: Dataset-Driven Parallax

Depth is declared in the markup: any descendant carrying `data-parallax="0.3"` drifts at that rate. One effect walks the container, parses the attribute and builds a scrubbed tween per layer, so adding a new plane to a hero is an attribute rather than a code change. Travel is expressed as a percentage of the element's own height, which keeps the effect proportional at every breakpoint.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Layers drift at a rate written on the element itself, over the widest possible scroll window.

- Category: scroll
- Runtime cost: dom
- Dependencies: gsap@^3.15.0

## How it works

1. The container is walked once for `[data-parallax]` descendants. The depth is read with a double fallback — `parseFloat(el.getAttribute(attr) ?? "") || fallback` — so a missing value, an empty value and a non-numeric value all land on the same default.
2. Each layer gets `gsap.to(layer, { yPercent: -(100 * depth), ease: "none" })`. `yPercent` is a percentage of the element's own height, so a 2000px hero and a 400px mobile hero travel proportionally with no media query.
3. `ease: "none"` is required, not stylistic. Any easing on a scrubbed tween means the layer accelerates and decelerates independently of the wheel, so two layers at different depths drift out of sync mid-scroll and snap back at the ends.
4. The trigger window is `start: "top bottom"` to `end: "bottom top"` — the full travel range, from the instant the element enters the scroller to the instant it leaves. That is the widest window available, which spreads the same travel across the most scroll distance.
5. `invalidateOnRefresh: true` makes ScrollTrigger recompute start and end on resize; percentage-based travel is derived from element height and a stale measurement leaves every layer offset.
6. Under reduced motion the effect returns before creating anything, so the layers render at their authored positions.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `DEFAULT_DEPTH = 0.15`
  Fallback drift: 15% of the element's height across the whole window. Below ~0.05 the layer looks static next to its neighbours; above ~0.4 it visibly separates from the content it belongs to and reads as a rendering fault.
- `start / end = 'top bottom' / 'bottom top'`
  The maximum-length window. Narrowing it (say `top 80%` to `bottom 20%`) forces the same travel through less scroll, which is the difference between drift and the page appearing to come apart.
- `yPercent multiplier = -100`
  Negative so layers move against the scroll — the direction that reads as distance. A positive multiplier moves them with the scroll, which reads as the layer being dragged.
- `scrub = true`
  Locked to scroll position with no lag. Parallax is a spatial relationship: a numeric scrub adds lag, and lagging layers cross each other during a fast flick.

## API

```ts
function DatasetParallax(props: { children: ReactNode; attribute?: string; fallback?: number; scrub?: boolean | number; scrollerRef?: RefObject<HTMLElement | null>; className?: string }): JSX.Element
```

- `children: ReactNode`
  Section content. Any descendant with the depth attribute becomes a layer.
- `attribute: string` — default `'data-parallax'`
  Attribute carrying the depth. Its value is parsed as a float.
- `fallback: number` — default `0.15`
  Depth used when the attribute is missing, empty or not a number.
- `scrub: boolean | number` — default `true`
  ScrollTrigger scrub. A number adds that many seconds of lag.
- `scrollerRef: RefObject<HTMLElement | null>`
  The scroll container that owns the scroll position. Omit for the document.
- `className: string`
  Merged onto the container via `cn`.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
const DEFAULT_DEPTH = 0.15;

export function DatasetParallax({
  children,
  attribute = 'data-parallax',
  fallback = DEFAULT_DEPTH,
  scrub = true,
  scrollerRef,
  className,
}: DatasetParallaxProps) {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useGsap(
    gsap,
    () => {
      const el = root.current;
      if (!el || reduced) return;

      const scroller = scrollerRef?.current ?? undefined;

      for (const layer of Array.from(el.querySelectorAll<HTMLElement>(`[${attribute}]`))) {
        // `?? ''` handles a bare `data-parallax` with no value, and the finite
        // check handles `parseFloat` returning NaN on anything non-numeric. A
        // NaN reaching `yPercent` does not throw — it silently pins the layer
        // at its untransformed position, which looks like the effect simply
        // not working on that one element.
        //
        // Tested with `Number.isFinite`, not `||`. `data-parallax="0"` is the
        // documented way to hold a layer still against the scroll, and zero is
        // falsy: `|| fallback` read that as "no value given" and moved the one
        // layer the author had explicitly asked not to move.
        const raw = layer.getAttribute(attribute) ?? '';
        const parsed = parseFloat(raw);
        const depth = Number.isFinite(parsed) ? parsed : fallback;

        gsap.to(layer, {
          yPercent: -(100 * depth),
          ease: 'none',
          scrollTrigger: {
            trigger: layer,
            scroller,
            // The widest possible window: begins the instant the layer's top
            // touches the bottom of the scroller and ends when its bottom
            // leaves the top. Any narrower range concentrates the same travel
            // into less scroll, which is what makes cheap parallax feel like
            // the page is sliding apart.
            start: 'top bottom',
            end: 'bottom top',
            scrub,
            // Percent-based travel is recomputed from element height; without
            // this a resize leaves every layer measured against the old one.
            invalidateOnRefresh: true,
          },
        });
      }
    },
    root,
    [attribute, fallback, scrub, reduced],
  );
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** `useGsap` wraps the whole walk in a `gsap.context`; `ctx.revert()` on unmount kills every tween and its ScrollTrigger and strips the inline `transform` GSAP wrote. Without the revert the triggers survive the unmount and keep scrubbing detached nodes on the next page.

**Reduced motion.** The effect returns before creating any tween, so every layer stays exactly where the stylesheet put it. The layout is authored to be correct at rest, so nothing is missing — the planes simply do not separate.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Using `y` in pixels instead of `yPercent`. It looks correct at the breakpoint you tuned and wrong at every other one — on a short viewport a fixed 300px offset can push the layer entirely out of its own container.
- A single `|| 0.15` fallback. `el.dataset.parallax || "0.15"` covers the missing attribute, but `parseFloat("fast")` returns `NaN` and `NaN` reaching `yPercent` does not throw — the layer just silently stops moving, which is a bug you find by eye weeks later.
- Adding an ease to a scrubbed tween. The layer then accelerates on its own schedule rather than the wheel's, so layers at different depths drift out of relative order and snap at each end of the range.
- Omitting `invalidateOnRefresh`. Rotating a phone or opening a sidebar changes element height; the tween keeps using the height measured on mount and every layer sits at the wrong offset until reload.
- Leaving the scroller as the document when the content lives in an `overflow-y-auto` container. Every start and end is then measured against the window, so nothing moves at the right time — or at all.
- Building one giant timeline for all layers. Independent triggers per layer are correct here: a layer must respond to its own position in the scroller, not to a shared progress value.

## Notes

- The attribute name is configurable so the component can coexist with an existing convention rather than forcing `data-parallax` onto a codebase that already has one.
- Depths above 1 are legal and useful for a single foreground element that should outrun everything, but two such layers next to each other stop reading as depth.

## Definition of done

Scroll the section: layers with a larger `data-parallax` value visibly outrun the ones with smaller values, and every layer is back in its authored position when it leaves the scroller. Change an attribute value in devtools and reload — the rate changes with no code edit. Resize the window mid-scroll and the layers stay aligned with their content.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
