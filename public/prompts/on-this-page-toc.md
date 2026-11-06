# Build: On This Page TOC

The table of contents that sits to the right of a docs article. A thin rail runs down the list and a 2px bar slides to the section currently in view, which also turns its label from tertiary to primary. Clicking a label scrolls the article to that section and moves focus there. It watches any scroll container, not only the window, so it works inside panels and previews.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Right-hand "On this page" list that tracks the section you are reading with an IntersectionObserver and a sliding active bar.

- Category: navigation
- Runtime cost: dom
- Dependencies: @remixicon/react@^4.9.0

## How it works

1. Items are `{ id, label, depth? }`, where `id` is the id of a section element. One IntersectionObserver is created with `root` set to the `scrollRoot` element (or the viewport when omitted) and observes every section.
2. The observer's `rootMargin` shrinks the root to an activation band: `-offset px` from the top and `-(1 - activationRatio)` from the bottom (by default the top 30%). Callbacks add or remove ids from an in-band set, and the active item is the last id in TOC order that is in the band, which is the section whose heading most recently scrolled into it. When nothing is in the band, the last active id is kept.
3. A passive scroll listener on the same root only checks for reaching the end: once `scrollTop + clientHeight` hits `scrollHeight`, the last item wins, because a short final section can never reach the band.
4. Clicking an item prevents the hash jump, computes the target offset relative to the root with `getBoundingClientRect`, and calls `root.scrollTo` (smooth unless reduced motion). The clicked id is committed at once and observer updates are locked until `scrollend` or a 900ms fallback, so the bar does not stutter through the sections the scroll passes.
5. The indicator is one absolutely positioned span whose `translateY` and height are copied from the active link's `offsetTop` / `offsetHeight` in a layout effect. A ResizeObserver on the list re-measures when wrapping changes, and the first placement skips the transition so it does not slide in from the top.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `activation band = top 30% of the root (activationRatio 0.3)`
  A section counts as "being read" once its top crosses into the upper part of the view; a band that is too low flips the TOC before the heading is visible.
- `offset = 16px`
  Used for both the observer's top margin and the scroll target, so a clicked section lands where the observer already treats it as active.
- `click lock = until scrollend, max 900ms`
  Long enough for a smooth scroll across the article; the timeout covers browsers without `scrollend` and clicks on the section already in place.
- `indicator = 2px bar on a 1px rail, 300ms ease-out`
  Matches the reference: a light rail with a darker bar beside the active label.
- `end tolerance = 2px`
  Fractional scroll positions on high-DPI screens can stop a pixel short of `scrollHeight`.

## API

```ts
function OnThisPageToc(props: { items: TocItem[]; scrollRoot?: RefObject<HTMLElement | null>; activeId?: string | null; defaultActiveId?: string | null; onActiveChange?: (id: string) => void; title?: ReactNode; offset?: number; activationRatio?: number; focusTarget?: boolean; "aria-label"?: string; className?: string }): JSX.Element
type TocItem = { id: string; label: string; depth?: 0 | 1 | 2 }
```

- `items: TocItem[]`
  Entries in document order; `id` is the section element id and `depth` indents sub-sections.
- `scrollRoot: RefObject<HTMLElement | null>` — default `window`
  Scroll container holding the sections. Becomes the observer root and the element scrolled on click.
- `activeId / defaultActiveId: string | null` — default `first item`
  Active section, controlled or initial.
- `onActiveChange: (id: string) => void`
  Called when scrolling or a click changes the active section.
- `title: ReactNode` — default `"On this page"`
  Heading above the list; pass null to hide it.
- `offset: number` — default `16`
  Px between the root top and a section after a jump; also the top of the activation band.
- `activationRatio: number` — default `0.3`
  Fraction of the root height, from the top, in which a section counts as active.
- `focusTarget: boolean` — default `true`
  Moves focus to the section after a jump (adds `tabindex="-1"` if needed).
- `className: string`
  Merged onto the nav.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
// Scrollspy: the active section is the last one (in TOC order) inside a band
// from `offset` px below the root's top down to `activationRatio` of its
// height, i.e. the section whose heading most recently entered the band.
// Scrolled to the very end, the last section wins even when it is too short
// to ever reach the band.
useEffect(() => {
  const root = scrollRoot?.current ?? null;
  const order = ids.split("|").filter(Boolean);
  const targets = order
    .map((id) => document.getElementById(id))
    .filter((el): el is HTMLElement => el !== null);
  if (targets.length === 0 || typeof IntersectionObserver === "undefined") return;

  const inBand = new Set<string>();
  const atEnd = () =>
    root
      ? root.scrollTop + root.clientHeight >= root.scrollHeight - 2
      : window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
  const pick = () => {
    if (lockRef.current) return;
    const last = order[order.length - 1];
    const scrolled = (root ? root.scrollTop : window.scrollY) > 0;
    if (last && scrolled && atEnd()) return commit(last);
    let current: string | undefined;
    for (const id of order) if (inBand.has(id)) current = id;
    if (current) commit(current);
  };

  const bottomInset = Math.round((1 - activationRatio) * 100);
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) inBand.add(entry.target.id);
        else inBand.delete(entry.target.id);
      }
      pick();
    },
    { root, rootMargin: `-${offset}px 0px -${bottomInset}% 0px`, threshold: 0 },
  );
  for (const target of targets) observer.observe(target);

  let wasAtEnd = atEnd();
  const scroller: HTMLElement | Window = root ?? window;
  const onScroll = () => {
    const end = atEnd();
    if (end !== wasAtEnd) {
      wasAtEnd = end;
      pick();
    }
  };
  scroller.addEventListener("scroll", onScroll, { passive: true });

  return () => {
    observer.disconnect();
    scroller.removeEventListener("scroll", onScroll);
  };
}, [ids, scrollRoot, offset, activationRatio, commit]);

const jumpTo = (event: ReactMouseEvent<HTMLAnchorElement>, id: string) => {
  const target = document.getElementById(id);
  if (!target) return;
  event.preventDefault();
  const root = scrollRoot?.current ?? null;
  const behavior: ScrollBehavior = reduced ? "auto" : "smooth";

  // Hold the clicked item while the smooth scroll passes other sections.
  releaseRef.current?.();
  lockRef.current = id;
  commit(id);
  const scroller: HTMLElement | Window = root ?? window;
  const release = () => {
    lockRef.current = null;
    scroller.removeEventListener("scrollend", release);
    window.clearTimeout(timer);
    releaseRef.current = null;
  };
  const timer = window.setTimeout(release, 900);
  scroller.addEventListener("scrollend", release);
  releaseRef.current = release;

  if (root) {
    const top = root.scrollTop + target.getBoundingClientRect().top - root.getBoundingClientRect().top - offset;
    root.scrollTo({ top, behavior });
  } else {
    window.scrollTo({ top: window.scrollY + target.getBoundingClientRect().top - offset, behavior });
  }
  if (focusTarget) {
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
  }
};
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The IntersectionObserver is disconnected and the scroll listener removed when the component unmounts or its items, root, offset or ratio change. A pending click lock removes its `scrollend` listener and clears its timeout on release and on unmount. The ResizeObserver lives in `useResizeObserver` and disconnects itself.

**Reduced motion.** With reduced motion the click jump uses `behavior: "auto"` (an instant scroll) and the bar and label colour transitions carry `motion-reduce:transition-none`, so the indicator moves without sliding.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Observing with the default viewport root while the sections live in an inner scroll container. The sections never leave the viewport, so the TOC never changes; pass the container as `root`.
- Picking the entry with the largest `intersectionRatio`. Tall sections have tiny ratios, so the TOC jumps to short neighbours; track which ids are in the band and choose the last one in document order instead.
- Letting the observer drive the TOC during a click-initiated smooth scroll. The bar runs through every section in between; lock it to the clicked id until the scroll ends.
- Using `scrollIntoView` for the jump. It scrolls every ancestor, so the page under an embedded article moves too.
- Forgetting the end-of-scroll rule. A final section shorter than the band never becomes active and the last TOC item is unreachable by scrolling.

## Notes

- Section ids in the demo are prefixed with `useId` so two copies on one page do not share targets.
- Prefer the section wrapper as the target over its heading: the wrapper stays intersecting while its body is read.

## Definition of done

Preview is active on load with the bar beside it. Scrolling the article moves the bar to Installation, Usage and so on; scrolling to the bottom activates Accessibility. Clicking Tokens scrolls the article so Tokens sits near the top, the Tokens link gets `aria-current="location"`, and the page around the demo does not move.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
