# Build: Scrub Timeline Spine

A vertical rule that fills with scroll while entries alternate either side of it. Entries rest at 50% opacity rather than 0, so the animation adds emphasis to content that is already readable, and each one reverses as it leaves — so scrolling back up replays the sequence instead of showing a column of finished animations.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A rule that fills as you scroll, with entries alternating either side and reversing on the way back.

- Category: scroll
- Runtime cost: dom
- Dependencies: gsap@^3.15.0

## How it works

1. The rule is two elements: a faint full-height track, and a fill of the same height scaled with `gsap.fromTo(fill, { scaleY: 0 }, { scaleY: 1, ease: "none" })` on a `scrub: 0.6` trigger running `top 55%` → `bottom 75%`.
2. `transformOrigin: "top center"` is passed to the tween, not just set in CSS. GSAP writes its own transform string, and without it the fill grows from the centre and the rule appears to unroll in both directions at once.
3. Every entry gets its own trigger with `toggleActions: "play reverse play reverse"` — the four slots are onEnter, onLeave, onEnterBack, onLeaveBack. Reversing on leave is what makes the column scrubbable upward as well as downward.
4. Entries animate `fromTo({ opacity: 0.5, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.6, ease: "power2.out" })`. The rest state is 0.5, not 0, so nothing is gated behind a scroll event.
5. `transformOrigin` per entry follows the side it hangs off — `left center` on the left column, `right center` on the right — so each card grows outward from the spine. A centre origin makes both columns creep toward the middle and the rule looks squeezed.
6. Alternation is decided from the measured container width. Below `alternateAbove` px, entries stop alternating and stack to the right of a left-hand rule, and every origin becomes `left center`.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `restOpacity = 0.5`
  The resting state of an entry. Zero is the obvious choice and the wrong one: it makes the animation a gate on the content, so a failed script or a skipped trigger leaves a blank column, and a screen reader meets text that is visually absent. At 0.5 the animation is emphasis, not access.
- `restScale = 0.9`
  Paired with the opacity change so the entry gains presence rather than just brightness. Below ~0.85 the text visibly reflows as it scales and becomes hard to read mid-transition.
- `scrub = 0.6`
  Catch-up on the fill only. The rule keeps advancing for about half a second after the wheel stops, which reads as the timeline settling. `true` makes it feel welded to the mouse.
- `fillStart / fillEnd = 'top 55%' / 'bottom 75%'`
  The fill begins once the section is past halfway up the scroller and completes before its bottom clears. Ending at `bottom top` instead would leave the rule still filling while the last entry is already being read, which makes the last item feel unreached.
- `entryDuration = 0.6`
  Not scrubbed — this one plays on its own clock, so it must be short enough to finish before the next entry enters at normal scrolling speed.
- `alternateAbove = 420`
  Container width in px below which a half-width column cannot hold a title and a line of body. Measured from the element, not the window, because the spine is usually inside an article column narrower than the page.

## API

```ts
function ScrubTimelineSpine(props: { entries: { label: string; title: string; body?: string }[]; scrub?: number; restOpacity?: number; restScale?: number; entryDuration?: number; fillStart?: string; fillEnd?: string; entryStart?: string; alternateAbove?: number; scrollerRef?: RefObject<HTMLElement | null>; className?: string }): JSX.Element
```

- `entries: { label: string; title: string; body?: string }[]`
  Ordered entries. Rendered as an `<ol>` either side of the rule.
- `scrub: number` — default `0.6`
  Seconds of catch-up on the fill.
- `restOpacity: number` — default `0.5`
  Resting opacity of an inactive entry. Do not set 0.
- `restScale: number` — default `0.9`
  Resting scale of an inactive entry.
- `entryDuration: number` — default `0.6`
  Seconds for one entry to reach full emphasis.
- `fillStart: string` — default `'top 55%'`
  ScrollTrigger start for the fill.
- `fillEnd: string` — default `'bottom 75%'`
  ScrollTrigger end for the fill.
- `entryStart: string` — default `'top 78%'`
  ScrollTrigger start for each entry.
- `alternateAbove: number` — default `420`
  Container width in px above which entries alternate sides.
- `scrollerRef: RefObject<HTMLElement | null>`
  The scroll container that owns the scroll position. Omit for the document.
- `className: string`
  Merged onto the wrapper via `cn`.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function ScrubTimelineSpine({
  entries,
  scrub = 0.6,
  restOpacity = 0.5,
  restScale = 0.9,
  entryDuration = 0.6,
  fillStart = 'top 55%',
  fillEnd = 'bottom 75%',
  entryStart = 'top 78%',
  alternateAbove = 420,
  scrollerRef,
  className,
}: ScrubTimelineSpineProps) {
  const root = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { width } = useResizeObserver(root);
  const alternate = width >= alternateAbove;

  useGsap(
    gsap,
    () => {
      const container = root.current;
      const line = fill.current;
      if (!container || !line) return;

      const items = Array.from(container.querySelectorAll<HTMLElement>('[data-spine-entry]'));
      const scroller = scrollerRef?.current ?? undefined;

      if (reduced) {
        gsap.set(line, { scaleY: 1 });
        gsap.set(items, { opacity: 1, scale: 1 });
        return;
      }

      gsap.fromTo(
        line,
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: 'none',
          // transformOrigin is set in CSS too, but GSAP writes its own
          // transform string; without stating it here the fill grows from the
          // centre and the rule appears to unroll in both directions.
          transformOrigin: 'top center',
          scrollTrigger: {
            trigger: container,
            scroller,
            // Starts filling once the section is just past halfway up and
            // completes before its bottom leaves — so the rule is never still
            // filling while the last entry is already being read.
            start: fillStart,
            end: fillEnd,
            scrub,
            invalidateOnRefresh: true,
          },
        },
      );

      items.forEach((item, i) => {
        gsap.fromTo(
          item,
          { opacity: restOpacity, scale: restScale },
          {
            opacity: 1,
            scale: 1,
            duration: entryDuration,
            ease: 'power2.out',
            // Scale from the edge the entry hangs off, so it grows outward
            // from the spine. A centre origin pulls both columns toward the
            // middle and the rule looks like it is being squeezed.
            transformOrigin: alternate && i % 2 === 1 ? 'right center' : 'left center',
            scrollTrigger: {
              trigger: item,
              scroller,
              start: entryStart,
              // onEnter, onLeave, onEnterBack, onLeaveBack. Reversing on the
              // way out is what makes the column scrubbable upward as well as
              // downward.
              toggleActions: 'play reverse play reverse',
            },
          },
        );
      });
    },
    root,
    [
      scrub,
      restOpacity,
      restScale,
      entryDuration,
      fillStart,
      fillEnd,
      entryStart,
      alternate,
      reduced,
      entries.length,
    ],
  );
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** `useGsap` reverts the `gsap.context`, killing the fill tween, all per-entry tweens and all of their ScrollTriggers, and restoring the inline transform and opacity. This matters more than usual here because the alternation flip rebuilds every trigger on resize: a surviving trigger would keep writing a right-edge `transform-origin` to a card now laid out on the left.

**Reduced motion.** The fill is set to `scaleY: 1` and every entry to full opacity and scale during the first effect, with no triggers created. The spine renders as a completed timeline — the rule is drawn, every entry is emphasised, and nothing changes with scroll.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- `toggleActions: "play none none none"`. The default-feeling choice, and it means scrolling back up shows a column of already-completed animations with no motion left in them. Reversing on leave is what makes the direction of travel legible.
- Resting entries at `opacity: 0`. The animation becomes a gate: any trigger that fails to fire — a mis-set scroller, a refresh during a resize, a JS error elsewhere — leaves the content permanently invisible while still occupying layout and still being read by assistive technology.
- Setting `transform-origin` only in CSS. GSAP writes a complete transform and its own `transform-origin`, so the CSS value is overwritten and the fill grows from the middle of the rule instead of the top.
- A single centre `transform-origin` for both columns. Cards then scale toward the spine, so the whole layout appears to pinch inward as you scroll instead of each entry growing outward from the rule.
- Scaling the same element that is the track. The fill needs to be a second element; scaling the visible track means the "remaining" portion disappears and the reader loses the sense of how much is left.
- One shared ScrollTrigger for all entries. The emphasis then depends on the section's progress rather than each entry's own position, so on a tall screen three entries brighten at once and none of them reads as current.

## Notes

- The fill uses the accent token, so it inherits the category accent when placed inside a `data-category` subtree.
- Entries are a real `<ol>`, so the sequence is conveyed structurally and not only by the drawn rule.

## Definition of done

Scroll down: the accent rule fills from the top and each entry brightens and grows outward from its own side of the rule as it arrives. Scroll back up and each entry dims again as it leaves the top, and the rule retreats. Stop mid-section and the fill continues for about half a second. Disable JavaScript and every entry is still readable at half opacity. Narrow the container and the entries stack to the right of a left-hand rule.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
