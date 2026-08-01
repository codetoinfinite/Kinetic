# Build: Converging Flow Steps

A process diagram that assembles itself as you scroll. The two outer cards converge toward the middle from opposite ends while the connectors between them pop in at 35% through the timeline — after the cards are already moving. That ordering is the entire effect: connectors that arrive first read as "boxes with arrows", connectors that arrive during the movement read as "these things connect".

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A process diagram that closes from both ends while the connectors pop in a third of the way through.

- Category: scroll
- Runtime cost: dom
- Dependencies: gsap@^3.15.0

## How it works

1. One `gsap.timeline` on a `scrollTrigger` with `start: "top 92%"`, `end: "center 52%"` and `scrub: 1.2` — deliberately the slowest scrub in the set, because a diagram should settle rather than track the wheel.
2. The first and last cards get `fromTo` tweens at position 0 with `±14` on the layout axis, so they close toward the centre from opposite ends. Cards in between have nowhere to converge from and only fade; giving them a direction too makes the row look shuffled rather than closing.
3. The connectors get `fromTo({ autoAlpha: 0, scale: 0.6 }, { autoAlpha: 1, scale: 1, stagger: 0.2 })` placed at absolute timeline position `0.35`. The card tweens run 0 → 1, so 0.35 is a third of the way into their travel.
4. The convergence axis is chosen from the measured container width, not the viewport: under `stackBelow` px the row becomes a column and the tweens switch from `xPercent` to `yPercent`. A stacked column with horizontal convergence has cards sliding past each other sideways.
5. The single-step case is handled explicitly — `first === last` would otherwise mean two `fromTo` tweens fighting over one element, one pulling it from -14 and one from +14.
6. `ease: "none"` throughout. Under a scrub the ease applies to timeline time, so easing here desynchronises the two converging cards from each other.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `scrub = 1.2`
  Over a second of catch-up — very slow. Right for a diagram, which you want to see settle; wrong for a hero, which would feel unresponsive. Below ~0.6 the diagram snaps together as fast as you scroll and the assembly reads as a jump.
- `connectorAt = 0.35`
  Absolute timeline position, in seconds, where the connectors start. The cards run 0 → 1, so this is a third of the way into their travel. At 0 the arrows are present before there is anything to connect; past ~0.6 they arrive after everything has stopped and read as an afterthought.
- `converge = 14`
  Percent of the card's own size. Small on purpose: this is a settling gesture, not an entrance. Past ~25% the outer cards start visibly outside the tinted wrapper and the diagram looks broken at the start of the scrub.
- `CONNECTOR_SCALE = 0.6`
  Starting scale for the pop. Below ~0.4 the arrow is a dot for the first half of its tween; above ~0.8 there is no pop left to see.
- `connectorStagger = 0.2`
  Seconds between connectors. Long enough that a three-step flow reads left to right rather than all at once, which is what tells the reader the diagram has a direction.
- `stackBelow = 420`
  Container width in px below which three cards in a row are too narrow to hold a title and a line of body. Measured from the element, not the window, because this component is usually inside a column that is narrow while the window is wide.

## API

```ts
function ConvergingFlowSteps(props: { steps: { title: string; body?: string; kicker?: string }[]; converge?: number; scrub?: number; connectorAt?: number; connectorStagger?: number; stackBelow?: number; start?: string; end?: string; scrollerRef?: RefObject<HTMLElement | null>; className?: string }): JSX.Element
```

- `steps: { title: string; body?: string; kicker?: string }[]`
  Ordered steps. Connectors are inserted between consecutive pairs.
- `converge: number` — default `14`
  Outer-card travel as a percentage of its own size, along the layout axis.
- `scrub: number` — default `1.2`
  Seconds of catch-up behind the scroll position.
- `connectorAt: number` — default `0.35`
  Timeline position, in seconds, at which the connectors begin.
- `connectorStagger: number` — default `0.2`
  Seconds between connectors.
- `stackBelow: number` — default `420`
  Container width in px below which the row becomes a column and the axis flips.
- `start: string` — default `'top 92%'`
  ScrollTrigger start.
- `end: string` — default `'center 52%'`
  ScrollTrigger end.
- `scrollerRef: RefObject<HTMLElement | null>`
  The scroll container that owns the scroll position. Omit for the document.
- `className: string`
  Merged onto the wrapper via `cn`.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
const CONNECTOR_SCALE = 0.6;

export function ConvergingFlowSteps({
  steps,
  converge = 14,
  scrub = 1.2,
  connectorAt = 0.35,
  connectorStagger = 0.2,
  stackBelow = 420,
  start = 'top 92%',
  end = 'center 52%',
  scrollerRef,
  className,
}: ConvergingFlowStepsProps) {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { width } = useResizeObserver(root);

  // The convergence axis has to follow the layout axis, or a stacked column
  // gets cards sliding in sideways past each other. Measured from the element
  // rather than the viewport: this component is often inside a panel that is
  // narrow while the window is wide.
  const stacked = width > 0 && width < stackBelow;

  useGsap(
    gsap,
    () => {
      const container = root.current;
      if (!container || reduced) return;

      const cards = Array.from(container.querySelectorAll<HTMLElement>('[data-flow-card]'));
      const connectors = Array.from(
        container.querySelectorAll<HTMLElement>('[data-flow-connector]'),
      );
      const first = cards[0];
      const last = cards[cards.length - 1];
      if (!first || !last) return;

      const axis = stacked ? 'yPercent' : 'xPercent';
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          scroller: scrollerRef?.current ?? undefined,
          start,
          end,
          scrub,
          invalidateOnRefresh: true,
        },
      });

      // Outer cards travel toward the centre from opposite ends. When there is
      // only one card, `first === last` and the two tweens would fight over
      // the same target, so it takes the middle treatment instead.
      if (first === last) {
        tl.fromTo(first, { autoAlpha: 0 }, { autoAlpha: 1, ease: 'none', duration: 1 }, 0);
      } else {
        tl.fromTo(
          first,
          { autoAlpha: 0, [axis]: -converge },
          { autoAlpha: 1, [axis]: 0, ease: 'none', duration: 1 },
          0,
        );
        tl.fromTo(
          last,
          { autoAlpha: 0, [axis]: converge },
          { autoAlpha: 1, [axis]: 0, ease: 'none', duration: 1 },
          0,
        );
      }

      // Everything between the ends has nowhere to converge from, so it only
      // fades. Giving it a direction too would make the row look like it was
      // being shuffled rather than closing.
      const middle = cards.slice(1, -1);
      if (middle.length > 0) {
        tl.fromTo(middle, { autoAlpha: 0 }, { autoAlpha: 1, ease: 'none', duration: 1 }, 0);
      }

      if (connectors.length > 0) {
        tl.fromTo(
          connectors,
          { autoAlpha: 0, scale: CONNECTOR_SCALE },
          {
            autoAlpha: 1,
            scale: 1,
            ease: 'none',
            duration: 1 - connectorAt,
            stagger: connectorStagger,
          },
          // Absolute timeline position in seconds. The cards occupy 0 -> 1, so
          // 0.35 puts the first connector a third of the way into their
          // travel: they are already moving when the link appears.
          connectorAt,
        );
      }
    },
    root,
    [converge, scrub, connectorAt, connectorStagger, start, end, stacked, reduced, steps.length],
  );
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** `useGsap` reverts the `gsap.context` on unmount and whenever the layout axis or any timing prop changes. That kills the ScrollTrigger and strips the inline transform and opacity from every card and connector, which matters here because the axis flip rebuilds the whole timeline on resize and a stale trigger would keep writing `xPercent` to elements now laid out in a column.

**Reduced motion.** No timeline is built, so the diagram renders assembled: cards at their layout positions, connectors at full opacity and scale. The layout still responds to container width, because that is layout rather than motion.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Animating the connectors at position 0 alongside the cards. Everything arriving together reads as a set of boxes that happen to have arrows between them; the whole point is that the link appears while the boxes are still closing.
- Giving the middle cards a convergence direction too. With every card sliding, the row reads as being reshuffled rather than closing, and the two outer cards stop being the subject.
- Not handling the one-step case. `cards[0]` and `cards[cards.length - 1]` are the same element, so it receives two `fromTo` tweens with opposite start values and ends up wherever the second one decided.
- Choosing the layout axis from `window.innerWidth`. The component is usually inside a content column; a wide window with a narrow column stacks the cards visually while the tweens still converge horizontally, so they cross each other on the way in.
- Using `opacity` rather than `autoAlpha` on the connectors. An invisible SVG still takes hit-testing area between two cards, which quietly swallows clicks aimed at the card edges.
- Assuming `stagger` inside a scrubbed timeline behaves like duration. Each connector's start is offset in timeline seconds, so a large stagger pushes the timeline total past the card tweens and the cards finish before the scroll range ends — which is intended here, but is a surprise if you assumed the total was 1.

## Notes

- The wrapper tint is derived from the accent token rather than a second hard-coded colour, so re-theming the accent moves the panel with it.
- Connectors are inline SVG paths, so they inherit `currentColor` and need no asset.

## Definition of done

Scroll the diagram into view: the leftmost and rightmost cards slide toward the middle, and only once they are moving do the arrows between them scale up one after the other. Stop scrolling mid-way and the diagram keeps settling for more than a second. Narrow the container below 420px and the same sequence plays vertically with the arrows rotated. With reduced motion on, the diagram is complete before it scrolls into view.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
