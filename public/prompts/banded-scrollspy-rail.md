# Build: Banded Scrollspy Rail

A section rail that never flickers, because only one section can be "active" at a time by construction. The IntersectionObserver root is shrunk to a 7%-tall band across the middle of the scroller, so a section registers only while it crosses that line. The active tick grows from 16 to 32 pixels — a size change, legible in peripheral vision, rather than a tint change that is not. No animation library: one observer, one CSS width transition.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A tick rail whose active mark widens as a section crosses a 7% band through the middle of the screen.

- Category: scroll
- Runtime cost: css
- Dependencies: none beyond React

## How it works

1. One IntersectionObserver watches every `[data-scrollspy]` element with `rootMargin: "-38% 0px -55% 0px"`. Trimming 38% off the top and 55% off the bottom leaves a 7%-tall detection band (100 − 38 − 55), positioned just below centre so a section becomes active while you are reading it rather than while it is still arriving.
2. Entries maintain a `Set` of ids currently inside the band. The active id is resolved by scanning the authored `sections` order for the first member of that set — not by reading `entries[0]`, whose order depends on how the observer batched the callback and therefore on scroll direction.
3. When the set is empty — a gap between sections, or a header taller than the band — the previous answer is held rather than cleared, so the rail never blanks between sections.
4. A second observer watches the element named by `endId` with `rootMargin: "0px 0px -25% 0px"`, which makes "intersecting" mean exactly "its top has climbed above 75% of the root". That retires the whole rail, so it is not hovering over a footer with nothing left to navigate.
5. The indicator itself is a `<span>` whose inline `width` flips between 16 and 32 px with a 260 ms CSS transition. The only JavaScript per scroll event is a `Set` mutation and at most one `setState`.
6. Section elements are collected into an id → element `Map` by walking the attribute once, rather than running a `[data-scrollspy="id"]` selector per section — that form needs escaping for any id containing punctuation and silently matches nothing when the escaping is wrong.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `bandTop / bandBottom = 38 / 55`
  Leaves a 7% band. Widen it and two sections are inside at once on a tall screen, which is the flicker this design exists to remove. Narrow it below about 4% and a fast flick can jump the band entirely between two observer callbacks, leaving the rail on the previous section. The asymmetry (38 vs 55) puts the band below centre, where the eye is while reading.
- `ACTIVE_WIDTH / IDLE_WIDTH = 32 / 16`
  A 2x length change is detectable without looking directly at it. Equal widths with only a colour change is invisible in peripheral vision, which defeats the point of a rail you are not supposed to be looking at.
- `TRANSITION_MS = 260`
  Long enough that the width change reads as movement and draws the eye, short enough that it has finished before the next section can reach the band during normal scrolling.
- `hideAt = 0.75`
  Fraction of the root the end marker must pass before the rail retires. At 1.0 the rail is still on screen while the footer is being read; below about 0.6 it disappears while the last section is still active.

## API

```ts
function BandedScrollspyRail(props: { sections: { id: string; label: string }[]; rootRef?: RefObject<HTMLElement | null>; bandTop?: number; bandBottom?: number; endId?: string; hideAt?: number; attribute?: string; onActiveChange?: (id: string | null) => void; className?: string }): JSX.Element
```

- `sections: { id: string; label: string }[]`
  Ordered list. Each `id` must match a `data-scrollspy` attribute inside the root.
- `rootRef: RefObject<HTMLElement | null>`
  The scroll container holding the sections. Omit for the document.
- `bandTop: number` — default `38`
  Percent of the root trimmed from the top to form the band.
- `bandBottom: number` — default `55`
  Percent trimmed from the bottom. The two must sum to under 100.
- `endId: string`
  Section after which the rail retires. Usually the footer.
- `hideAt: number` — default `0.75`
  Fraction down the root the end marker must pass before the rail hides.
- `attribute: string` — default `'data-scrollspy'`
  Attribute used to find sections inside the root.
- `onActiveChange: (id: string | null) => void`
  Fires once per active-section change. Held in a ref, so it needs no memo.
- `className: string`
  Merged onto the nav element via `cn`.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
const ACTIVE_WIDTH = 32;
const IDLE_WIDTH = 16;
const TRANSITION_MS = 260;

export function BandedScrollspyRail({
  sections,
  rootRef,
  bandTop = 38,
  bandBottom = 55,
  endId,
  hideAt = 0.75,
  attribute = 'data-scrollspy',
  onActiveChange,
  className,
}: BandedScrollspyRailProps) {
  const [active, setActive] = useState<string | null>(null);
  const [retired, setRetired] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const reduced = useReducedMotion();

  // Held in refs so a new array literal or a fresh callback on every parent
  // render does not tear down and rebuild the observers.
  const sectionsRef = useRef(sections);
  sectionsRef.current = sections;
  const notify = useRef(onActiveChange);
  notify.current = onActiveChange;

  const order = sections.map((s) => s.id).join('|');

  useEffect(() => {
    const root = rootRef?.current ?? null;
    const scope: ParentNode = root ?? document;

    // Build id -> element by walking the attribute once, rather than running a
    // `[attr="id"]` selector per section: that needs escaping for any id with
    // punctuation in it, and silently matches nothing when the escaping is
    // wrong.
    const elements = new Map<string, Element>();
    for (const el of Array.from(scope.querySelectorAll(`[${attribute}]`))) {
      const id = el.getAttribute(attribute);
      if (id) elements.set(id, el);
    }
    if (elements.size === 0) return;

    const inBand = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.getAttribute(attribute);
          if (!id) continue;
          if (entry.isIntersecting) inBand.add(id);
          else inBand.delete(id);
        }

        // Resolve in authored order, not entry order: callbacks arrive in
        // whatever order the observer batched them, so picking `entries[0]`
        // makes the active section depend on scroll direction.
        const next = sectionsRef.current.find((s) => inBand.has(s.id))?.id;

        // Nothing in the band — a gap between sections, or a header taller
        // than the band. Hold the last answer instead of blanking the rail,
        // which would read as the nav breaking.
        if (next === undefined) return;

        setActive((prev) => {
          if (prev === next) return prev;
          notify.current?.(next);
          return next;
        });
      },
      {
        root,
        // The band. 100 - bandTop - bandBottom percent of the root's height,
        // centred low enough that a section is "active" while you are reading
        // it rather than while it is still arriving.
        rootMargin: `-${bandTop}% 0px -${bandBottom}% 0px`,
        threshold: 0,
      },
    );

    for (const el of elements.values()) observer.observe(el);

    // Second observer: retire the rail once the end marker has climbed past
    // `hideAt`, so it is not hovering over a footer with nothing left to
    // navigate. Shrinking the bottom margin by (1 - hideAt) makes
    // "intersecting" mean exactly "its top is above hideAt of the root".
    let endObserver: IntersectionObserver | null = null;
    const endEl = endId === undefined ? undefined : elements.get(endId);
    if (endEl) {
      endObserver = new IntersectionObserver(
        (entries) => {
          const entry = entries[entries.length - 1];
          if (entry) setRetired(entry.isIntersecting);
        },
        { root, rootMargin: `0px 0px -${Math.round((1 - hideAt) * 100)}% 0px`, threshold: 0 },
      );
      endObserver.observe(endEl);
    }

    return () => {
      observer.disconnect();
      endObserver?.disconnect();
    };
  }, [rootRef, attribute, bandTop, bandBottom, endId, hideAt, order]);
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Both IntersectionObservers are disconnected on unmount and on any option change. An observer holds a strong reference to every element it watches, so skipping this pins the unmounted section tree in memory and keeps firing `setState` on a dead component.

**Reduced motion.** The rail still tracks the active section and still changes width — that is state, not decoration. Every `transition` is set to `none`, so the tick snaps between widths and the labels appear instantly, and click-to-navigate uses `behavior: "auto"` rather than a smooth scroll.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Observing with the default full-height root. Three sections intersect at once on a tall screen and the active tick flickers between them on every callback. Debouncing hides the symptom and adds lag; shrinking the root removes the ambiguity.
- Taking the active section from `entries[0]`. The callback batches entries in an order that depends on which boundaries were crossed, so the same scroll direction can yield a different winner between two frames. Resolve against the authored order instead.
- Clearing the active state when nothing is intersecting. Any gap taller than the band — a spacer, a full-bleed image, a header — blanks the rail mid-scroll and it reads as broken.
- Signalling the active section with colour only. On a hairline tick in the corner of the eye a tint change is imperceptible; a width change is not, and it also survives a monochrome or high-contrast rendering.
- Rebuilding the observers on every render. `sections` is usually a fresh array literal from the parent, so keying the effect on it disconnects and reconnects two observers on every keystroke elsewhere in the page. Key on the joined id list and read the array from a ref.
- Forgetting `observer.disconnect()`. IntersectionObserver keeps a strong reference to every observed element, so an undisconnected observer pins the whole unmounted section tree in memory and keeps calling `setState` on a dead component.
- Scrolling with `window.scrollTo` on click when the sections live in a container. `scrollIntoView` walks up and scrolls whichever ancestor actually holds the overflow, which is the only version that works in both cases.

## Notes

- No GSAP and no ScrollTrigger: the whole component is two IntersectionObservers and a CSS transition, which is why it is classed `css` cost and can be used dozens of times on a page.
- The labels are always in the DOM at `opacity: 0` and reveal on hover or keyboard focus, so the rail is operable and readable without a pointer.

## Definition of done

Scroll slowly: the active tick changes exactly once as each section crosses the middle of the screen, with no flicker at the boundary and no blank state in the gaps. The active tick is visibly twice as long as the others. Scroll to the end and the whole rail fades out. Hover it and the labels appear; tab into it and they appear too. With reduced motion on, the tick still moves but snaps rather than eases.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
