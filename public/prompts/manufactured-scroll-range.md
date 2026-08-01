# Build: Manufactured Scroll Range

Some content has no height. A ring of projects, a canvas scene, a stack of captions — one screen of markup that wants to be a page of interaction. The fix is to manufacture the range: a container sized `count x viewports` screens with a sticky viewport inside it, and `scrolled / scrollable` as the single input. One screen of scroll then means exactly one item, with no per-item measurement to keep in sync.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

An empty box N screens tall turns a one-screen scene into a scrollable sequence, with progress as a CSS variable and the index as state.

- Category: scroll
- Runtime cost: dom
- Dependencies: none beyond React

## How it works

1. The container height is written in the scroller's own pixels — `hostHeight * (1 + count * viewports)` — and the sticky child is written at exactly `hostHeight`, so the difference between them is the scroll range and nothing else. Pixels rather than `vh` because inside a scrollable box, viewport units measure a different element entirely.
2. Progress is `(hostTop - containerTop) / (total - hostHeight)`, read from live rects on the frame it is used. Nothing is cached, so a font swap, an image landing above, or a resize corrects itself on the next frame with no invalidation step.
3. The two outputs are separated by cost. Continuous progress goes out as `--range-progress` and `--range-position` custom properties and to an optional `onFrame` callback — sixty times a second, never through React. The discrete index goes through `useState`, and only on the frame it changes.
4. Progress is quantised to four decimals before writing. Below that nothing downstream can render differently, so a stationary scroller performs zero style writes rather than 60 per second.
5. The index uses `floor`, not `round`, so item `i` owns `[i/count, (i+1)/count)` — equal slots, and the last item owns the end of the range instead of a half-slot.
6. A hysteresis band of 0.04 of a slot guards the index commit. A trackpad resting exactly on a boundary otherwise flips the index every frame, and each flip is a full React re-render of the viewport contents.
7. The render prop receives `{ index, count }`, so the child tree re-renders on item change only — the per-frame value is available to the same tree as an inherited custom property.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `viewports = 1`
  Screens of scroll per item. One is the value that makes the range legible: a full flick moves exactly one item, which is the mapping users infer within two gestures. Below ~0.6 items blur past; above ~2 the sequence feels padded.
- `HYSTERESIS = 0.04`
  Fraction of a slot the position must travel past a boundary before the index commits. Sized above trackpad jitter and sub-pixel rect noise, and far below anything a user could intend as a move.
- `progress quantisation = 4 decimal places`
  One ten-thousandth of the range is below the resolution of any downstream transform or colour mix, so comparing the formatted string lets an idle scroller skip the DOM write entirely.
- `range height = hostHeight * (1 + count * viewports)`
  The extra `1` is the sticky viewport's own screen. Without it the last item is only reachable at the exact bottom of the scroller and can never be centred.

## API

```ts
function ManufacturedScrollRange(props: { count: number; viewports?: number; children: (state: { index: number; count: number }) => ReactNode; onFrame?: (state: { progress: number; position: number; index: number }) => void; scroller?: RefObject<HTMLElement | null>; className?: string }): JSX.Element
```

- `count: number`
  How many items the manufactured range represents.
- `viewports: number` — default `1`
  Screens of scroll per item.
- `children: (state: { index: number; count: number }) => ReactNode`
  Rendered inside the sticky viewport; called again only when the index changes.
- `onFrame: (state: ScrollRangeState) => void`
  Per-frame progress, for work that must not go through React.
- `scroller: RefObject<HTMLElement | null>`
  Scroll container. Omit to auto-detect the nearest scrollable ancestor.
- `className: string`
  Merged onto the outer container.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function ManufacturedScrollRange({
  count,
  viewports = 1,
  children,
  onFrame,
  scroller,
  className,
}: ManufacturedScrollRangeProps) {
  const root = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);

  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const lastHeight = useRef(0);
  const lastProgress = useRef('');

  useRaf((_dt) => {
    const rootEl = root.current;
    const viewportEl = viewport.current;
    if (!rootEl || !viewportEl || count <= 0) return;

    const host = scroller?.current ?? nearestScroller(rootEl);
    const hostIsRoot = host === document.documentElement;
    const hostTop = hostIsRoot ? 0 : host.getBoundingClientRect().top;
    const hostHeight = hostIsRoot ? window.innerHeight : host.clientHeight;
    if (hostHeight === 0) return;

    // The range is measured in the scroller's own pixels, not `vh`. Inside a
    // scrollable box, viewport units describe a completely different element.
    const total = Math.round(hostHeight * (1 + count * viewports));
    if (total !== lastHeight.current) {
      lastHeight.current = total;
      rootEl.style.height = `${total}px`;
      viewportEl.style.height = `${hostHeight}px`;
    }

    const travel = total - hostHeight;
    const progress = travel > 0 ? clamp((hostTop - rootEl.getBoundingClientRect().top) / travel, 0, 1) : 0;
    const position = progress * count;

    // Continuous value: out as a custom property, never as state. Quantised
    // so an idle scroller stops writing to the DOM entirely.
    const text = progress.toFixed(4);
    if (text !== lastProgress.current) {
      lastProgress.current = text;
      rootEl.style.setProperty('--range-progress', text);
      rootEl.style.setProperty('--range-position', position.toFixed(3));
    }

    // Discrete value: equal slots, `floor` not `round`, so item i owns
    // [i/count, (i+1)/count) and the last item owns the end of the range.
    const candidate = clamp(Math.floor(position), 0, count - 1);
    if (candidate !== indexRef.current) {
      // Distance past the boundary being crossed — going forward that is the
      // candidate's own edge, going back it is the current item's edge.
      const boundary = candidate > indexRef.current ? candidate : indexRef.current;
      if (Math.abs(position - boundary) > HYSTERESIS) {
        indexRef.current = candidate;
        setIndex(candidate);
      }
    }

    onFrame?.({ progress, position, index: indexRef.current });
  });
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** `useRaf` unsubscribes from the shared loop on unmount and no other listener, observer or timer is registered. The inline height and the custom properties are written on nodes React owns and disappear with them.

**Reduced motion.** The range is layout, not animation: it is how the sequence is navigated, so collapsing it would remove access to the content rather than remove motion. The component itself animates nothing — it publishes numbers. Consumers should read the discrete `index` under reduced motion and drive cuts, not `--range-progress` and continuous parallax.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Sizing the spacer in `vh` while the component lives inside a scrollable box. The height comes from the window and the progress comes from the box, so the sequence finishes early or never finishes — and it looks correct only when the box happens to be full-height.
- Pushing continuous progress through `setState`. That is a React render per frame for a value that only ever feeds a transform; the tree re-reconciles 60 times a second to move one bar.
- Committing the index with no hysteresis. Resting on a boundary makes the index oscillate, which reads as flicker and, if items fetch anything, as a request storm.
- Using `round` for the index. Items 0 and count-1 get half-width slots, so the first and last feel twice as fast as the middle for no reason the user can see.
- Putting the spacer as a sibling *before* the sticky element. Sticky positioning is bounded by the parent, so the viewport unsticks as soon as the spacer scrolls past and the sequence stops halfway.
- Deriving progress from `scroller.scrollTop / scrollHeight`. That is the whole document's progress, not the section's, so the mapping breaks the moment anything is added above or below.
- Forgetting `overflow: hidden` on the sticky viewport. Content sized to the viewport bleeds over neighbouring sections during the range and paints outside its own box.

## Notes

- The scroll container is auto-detected by walking ancestors for a scrollable `overflow-y`, so the component works unchanged on a normal page; pass `scroller` when the container is created later or ambiguous.
- Custom properties inherit, so anything inside the render prop can read `--range-progress` without prop drilling and without a re-render.
- For a ring rather than a list, replace the `clamp` on the index with `((i % count) + count) % count` and let the position wrap.

## Definition of done

One screen of scroll advances exactly one item. Resting the pointer on a slot boundary does not flip the index back and forth. The progress bar moves continuously while the item title changes in steps. Resizing the scroller keeps the current item on screen. React DevTools shows a render only when the item changes, not per frame.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
