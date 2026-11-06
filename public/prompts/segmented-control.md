# Build: Segmented Control

A single-select segmented control on React Aria's ToggleButtonGroup, so arrow keys move focus, Space or Enter selects, and the selection can never be emptied. Instead of each segment painting its own background, one absolutely positioned thumb is measured off the selected button and slides between segments over 200ms. A `plain` variant drops the track and the thumb and marks the selection with text weight and colour alone.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A pill switcher for Weekly / Monthly / Yearly choices: one white thumb, measured from the DOM, slides under the selected segment.

- Category: form
- Runtime cost: dom
- Dependencies: react-aria-components@^1.22.1

## How it works

1. `SegmentedControl` renders an `AriaToggleButtonGroup` with `selectionMode="single"` and `disallowEmptySelection` fixed, then spreads the caller's props (`selectedKeys`, `defaultSelectedKeys`, `onSelectionChange`, `aria-label`, ...). The `solid` track is `inline-flex gap-0.5 rounded-2lg p-1` on `bg-segmented-control-background`.
2. In a layout effect (a plain effect on the server) it queries the group for the `[data-selected]` button that React Aria marks and stores its `offsetLeft`, `offsetTop`, `offsetWidth` and `offsetHeight`. A 0px width (the control is hidden or not laid out yet) or no selection stores no thumb, and equal measurements keep the previous state so observer callbacks cannot re-render in a loop. Offsets are relative to the group because the group is `relative`, so the thumb needs no `getBoundingClientRect` arithmetic.
3. The thumb is a single `aria-hidden` span at `left-0 top-0`, placed with `transform: translate(left, top)` and sized with explicit `width` / `height`, with `transition-[transform,width,height] duration-200`. Moving between segments of different widths therefore slides and resizes in one motion.
4. Re-measuring is event driven, never polled: a ResizeObserver watches the group and every button (labels can change width when fonts load or text changes), and a MutationObserver on the subtree re-observes new buttons and re-measures when `data-selected` or the children change. Both disconnect on cleanup; the effect re-runs when the document direction flips.
5. Each `SegmentedControlItem` is a `relative z-10` React Aria `ToggleButton` above the thumb: `px-2.5 py-1 rounded-md`, `text-body-medium text-text-primary` when selected and `text-body-regular text-text-secondary` otherwise, with a 200ms colour transition, a focus-visible ring and 50% opacity when disabled. Until the thumb exists (the server render, or a hidden control) a context flag gives the selected segment the thumb's own `bg-segmented-control-selected-background shadow-2xs`, so first paint already shows the white pill; once the thumb is measured the segment drops it and the thumb takes over and slides.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `thumb transition = 200ms on transform, width and height`
  Long enough to read as one object moving to the new choice, short enough that rapid clicking never lags behind the selection.
- `track = p-1, gap-0.5, rounded-2lg (10px); segments rounded-md (6px)`
  From the Figma switch (node 3731:3096). A 4px inset with a 6px inner radius keeps the thumb's corners concentric with the 10px track.
- `segment padding = px-2.5 py-1`
  Compact enough to sit in a card header next to a title without dominating it.
- `thumb shadow = shadow-2xs: 0 1px rgb(0 0 0 / 0.16)`
  A single-pixel bottom edge lifts the white thumb off the light-grey track without a blurred shadow.

## API

```ts
function SegmentedControl(props: Omit<ToggleButtonGroupProps, "selectionMode" | "disallowEmptySelection"> & { variant?: "solid" | "plain"; children?: ReactNode; ref?: Ref<HTMLDivElement> }): JSX.Element
function SegmentedControlItem(props: Omit<ToggleButtonProps, "children"> & { children?: ReactNode; ref?: Ref<HTMLButtonElement> }): JSX.Element
```

- `selectedKeys / defaultSelectedKeys: Iterable<Key>`
  Controlled or initial selection; holds exactly one item id.
- `onSelectionChange: (keys: Set<Key>) => void`
  Fires with the new one-key set.
- `variant: "solid" | "plain"` — default `"solid"`
  `plain` drops the track background and the thumb.
- `aria-label: string`
  Names the group for assistive technology.
- `isDisabled: boolean`
  On the group or a single `SegmentedControlItem`; disabled items drop to 50% opacity.
- `id: Key`
  SegmentedControlItem only. The key reported in the selection set.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function SegmentedControl({ className, children, variant = "solid", ref, ...props }: SegmentedControlProps) {
  const direction = useDirection();
  const innerRef = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<Thumb | null>(null);

  useIsomorphicLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const measure = () => {
      const selected = el.querySelector<HTMLElement>("[data-selected]");
      // Nothing selected, or a 0px box (display: none, not laid out yet):
      // drop the thumb so the segment's own fill shows. The ResizeObserver
      // measures again once the segment has a size.
      const next =
        selected && selected.offsetWidth > 0
          ? {
              left: selected.offsetLeft,
              top: selected.offsetTop,
              width: selected.offsetWidth,
              height: selected.offsetHeight,
            }
          : null;
      // Skip equal values so observer callbacks never re-render in a loop.
      setThumb((prev) =>
        prev && next && prev.left === next.left && prev.top === next.top && prev.width === next.width && prev.height === next.height
          ? prev
          : next,
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    const observeItems = () => el.querySelectorAll("button").forEach(item => ro.observe(item));
    observeItems();
    const mo = new MutationObserver(() => { observeItems(); measure(); });
    mo.observe(el, { attributes: true, childList: true, characterData: true, subtree: true, attributeFilter: ["data-selected"] });
    return () => {
      mo.disconnect();
      ro.disconnect();
    };
  }, [direction]);

  const setRefs = (node: HTMLDivElement | null) => {
    innerRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) (ref as { current: HTMLDivElement | null }).current = node;
  };

  return (
    <AriaToggleButtonGroup
      ref={setRefs}
      selectionMode="single"
      disallowEmptySelection
      {...props}
      className={(state) =>
        cx(
          "relative inline-flex items-start gap-0.5 rounded-2lg",
          variant === "solid" && "bg-segmented-control-background p-1",
          typeof className === "function" ? className(state) : className,
        )
      }
    >
      {variant === "solid" && thumb && (
        <span
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 rounded-md bg-segmented-control-selected-background shadow-2xs transition-[transform,width,height] duration-200 ease"
          style={{
            transform: `translate(${thumb.left}px, ${thumb.top}px)`,
            width: thumb.width,
            height: thumb.height,
          }}
        />
      )}
      <SelectedFillContext.Provider value={variant === "solid" && !thumb}>{children}</SelectedFillContext.Provider>
    </AriaToggleButtonGroup>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The layout effect disconnects its ResizeObserver and MutationObserver when the control unmounts or the direction changes. No timers or window listeners.

**Reduced motion.** The component does not branch on `prefers-reduced-motion`. The only motion is the 200ms thumb slide plus colour fades on the labels, and the selected state is also carried by text weight and colour, so turning transitions off loses nothing.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Do not give each selected segment its own background once the thumb is measured. The point is a single thumb that travels; per-segment backgrounds jump with no motion. The segment fill is only the stand-in before the first measurement.
- Do not measure with `getBoundingClientRect` against the viewport. The thumb is positioned inside the `relative` group, so `offsetLeft` / `offsetTop` are already in the right space and survive page scroll.
- Do not measure only once on mount. Web fonts, translated labels and a direction flip all change segment widths; without the ResizeObserver and MutationObserver the thumb drifts off its segment.
- Do not pass `selectionMode` or `disallowEmptySelection`. Both are fixed by the component and omitted from its props; a segmented control that can be emptied leaves the thumb parked on nothing.

## Notes

- Selection uses React Aria's key sets: `selectedKeys={new Set(["monthly"])}` with `onSelectionChange={(keys) => ...}`, where each item's `id` is its key.
- Give the group an `aria-label` ("Period", "View"); React Aria renders it as `role="radiogroup"` with radio items in single-selection mode.
- The thumb renders only after the first measurement. Before that (on the server, or while the control is hidden) the selected segment paints the same white fill itself, so server HTML and first paint match the measured look.

## Definition of done

A grey pill track holds Weekly, Monthly and Yearly with a white thumb under the selected one. Clicking another segment slides and resizes the thumb to it in about 200ms while its label turns medium weight and primary colour. Arrow keys move focus between segments and Space selects; clicking the selected segment keeps it selected. The `plain` variant shows no track or thumb, only the weight and colour change, and a disabled item is dimmed and cannot be chosen.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
