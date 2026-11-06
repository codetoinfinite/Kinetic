# Build: Preview Code Tabs

The two-tab frame that sits at the top of a component docs page. A grey pill track holds "Preview" and "Code" tabs, with a white thumb that slides to the selected tab. Below it, a bordered stage renders the live example centred, or a code block shows the example source with line numbers and copy. The preview stays mounted while the code tab is open, so whatever the reader did to the example survives a look at the code.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Docs Preview / Code switcher: a pill tab track with a sliding thumb over a bordered live stage and a highlighted, copyable source.

- Category: display
- Runtime cost: dom
- Dependencies: @remixicon/react@^4.9.0, react-aria-components@^1.22.1

## How it works

1. React Aria `Tabs`, `TabList`, `Tab` and `TabPanel` supply the roles, `aria-controls` wiring, roving focus and arrow, Home and End keys. Selection is controlled through `selectedTab` or uncontrolled through `defaultSelectedTab`, and only the two known keys reach `onSelectedTabChange`.
2. A collection can only contain `Tab` children, so the thumb is a sibling of the `TabList` inside a positioned track. A layout effect reads the selected tab's `offsetLeft`, `offsetTop`, `offsetWidth` and `offsetHeight` and applies them as a translate plus width and height, which a 200ms `ease-out` transition animates.
3. A `MutationObserver` filtered to `data-selected` re-measures on every selection change, controlled or not. A `ResizeObserver` on the track and each tab re-measures when fonts load or labels change. The state setter returns the previous object when nothing moved, so the observers never cause a render loop.
4. The preview `TabPanel` uses `shouldForceMount`. While the code tab is selected, React Aria marks it `inert` and the render-prop class adds `hidden`, so it leaves focus order and layout but keeps its React state.
5. The code tab renders the kit `CodeBlock` (TSX tokenizer, line numbers, wrap toggle, copy) with the `filename` chip and a `codeMaxHeight` cap. The `actions` slot at the end of the tab row takes extra controls such as a copy or open-in-new-tab button.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `thumb transition = 200 ms ease-out on transform, width, height`
  Fast enough to keep up with arrow-key presses, and slow enough that the eye can follow the thumb between two tabs of different widths.
- `track / thumb radii = rounded-xl track, p-1, rounded-lg thumb`
  The thumb sits 4px inside the track, so a 12px outer and 8px inner radius stay concentric.
- `stage = rounded-[20px], border-button-default, background-full, p-6 to p-10, minHeight 320 (code panel too)`
  The code panel shares the floor so the page does not jump between tabs. A calm, slightly rounder frame than the cards it shows, with room on every side so a centred example never touches the edge.
- `codeMaxHeight = 420 px`
  Long sources scroll inside the panel rather than pushing the rest of the page down when the reader switches tabs.

## API

```ts
type PreviewCodeTab = "preview" | "code";
function PreviewCodeTabs(props: { children: ReactNode; code: string; filename?: string; language?: "tsx" | "plain"; selectedTab?: PreviewCodeTab; defaultSelectedTab?: PreviewCodeTab; onSelectedTabChange?: (tab: PreviewCodeTab) => void; actions?: ReactNode; previewLabel?: string; codeLabel?: string; "aria-label"?: string; minHeight?: number; codeMaxHeight?: number; onCopied?: (code: string) => void; previewClassName?: string; className?: string; ref?: Ref<HTMLDivElement> }): JSX.Element
```

- `children: ReactNode`
  The live example, centred in the preview stage.
- `code: string`
  Source shown on the Code tab and copied by its copy button.
- `filename: string`
  Chip label above the code, such as `usage` or `line-chart-card.tsx`.
- `language: "tsx" | "plain"` — default `"tsx"`
  Highlight as TSX or print as is.
- `selectedTab / defaultSelectedTab / onSelectedTabChange: "preview" | "code"` — default `uncontrolled, "preview"`
  Controlled or uncontrolled tab selection.
- `actions: ReactNode`
  Controls at the end of the tab row.
- `previewLabel / codeLabel: string` — default `"Preview" / "Code"`
  Tab labels.
- `minHeight: number` — default `320`
  Minimum height of the preview stage, in px.
- `codeMaxHeight: number` — default `420`
  Height cap of the code panel, in px.
- `onCopied: (code: string) => void`
  Called after the code panel copies.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
// The thumb is a sibling of the TabList (a collection can only hold Tabs), so
// it is positioned from the selected tab's offset box inside the track. A
// ResizeObserver catches font loading and label changes; a MutationObserver
// on `data-selected` catches selection, controlled or not.
useIsomorphicLayoutEffect(() => {
  const track = trackRef.current;
  if (!track) return;
  const measure = () => {
    const selected = track.querySelector<HTMLElement>('[role="tab"][data-selected]');
    if (!selected) return;
    setThumb((prev) => {
      const next = {
        left: selected.offsetLeft,
        top: selected.offsetTop,
        width: selected.offsetWidth,
        height: selected.offsetHeight,
      };
      return prev &&
        prev.left === next.left &&
        prev.top === next.top &&
        prev.width === next.width &&
        prev.height === next.height
        ? prev
        : next;
    });
  };
  measure();
  const ro = new ResizeObserver(measure);
  ro.observe(track);
  track.querySelectorAll('[role="tab"]').forEach((tab) => ro.observe(tab));
  const mo = new MutationObserver(measure);
  mo.observe(track, { attributes: true, subtree: true, attributeFilter: ["data-selected"] });
  return () => {
    mo.disconnect();
    ro.disconnect();
  };
}, []);
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The layout effect disconnects its `ResizeObserver` and `MutationObserver` on unmount. There are no timers. The code panel copy timer belongs to `CodeBlock` and is cleared there.

**Reduced motion.** The only movement is the thumb slide. With `prefers-reduced-motion: reduce` the thumb has `motion-reduce:transition-none` and jumps straight to the selected tab. The tab text colour change stays because it is not motion.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Putting the thumb inside `TabList`. React Aria builds the tab collection from its children, and anything that is not a `Tab` breaks the collection. The thumb lives next to the list, in the positioned track.
- Unmounting the preview on tab change. Any state the reader built up in the example (a toggled option, a typed value) would reset every time they glanced at the code. `shouldForceMount` together with `hidden` on `isInert` avoids this.
- Measuring with `getBoundingClientRect` relative to the viewport. Page scroll and transforms on ancestors would leak into the thumb position. Offsets relative to the track do not have that problem.

## Notes

- Labels are props (`previewLabel`, `codeLabel`), and the list name defaults to "Example view".
- Pass `language="plain"` for examples that are not TSX, such as CSS or shell output.

## Definition of done

The Preview tab is selected on load and the white thumb sits under it. Clicking Code, or pressing the Right arrow with the list focused, slides the thumb under Code (200ms, instant with reduced motion), shows the highlighted source and sets `aria-selected="true"` on the Code tab. Returning to Preview shows the example with its state intact. The code panel copy button puts the exact `code` string on the clipboard.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
