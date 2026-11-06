# Build: Tabs

Two tab styles from one kit. The underline tabs wrap React Aria `Tabs`, so arrow keys, roving focus and tab/panel wiring come for free, and a single absolutely positioned 2px bar glides to whichever tab is selected. The pill switcher is a plain row of toggle buttons for local view state, with a shared rounded thumb that slides under the active pill and overshoots slightly before it settles.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

React Aria underline tabs with a measured 2px indicator that slides between tabs, plus a pill switcher whose thumb settles with a spring.

- Category: navigation
- Runtime cost: dom
- Dependencies: react-aria-components@^1.22.1

## How it works

1. `Tabs`, `TabList`, `Tab` and `TabPanel` spread their props onto the React Aria primitives, which handle roving tabindex, arrow-key navigation, automatic activation and the `aria-controls` link between a tab and its panel. Every `className` accepts a string or React Aria's state function and is merged through `cx`. `Tabs` is a `flex-col gap-4` stack that flips to `flex-row` when `orientation` is vertical.
2. `TabList` wraps the Aria list in a `relative w-full` div. The list itself is `flex items-center gap-1 border-b border-separator-border`, the 1px baseline every tab sits on. The selected tab is not underlined by its own border: an `aria-hidden` span (`absolute bottom-0 left-0 h-0.5 bg-accent-600`) is drawn once and moved.
3. A layout effect (`useLayoutEffect` on the client, `useEffect` on the server to avoid the SSR warning) queries `[role='tab'][data-selected]` and stores its `offsetLeft` and `offsetWidth`. The bar is rendered with `transform: translateX(left px)` and `width`, and `transition-[transform,width] duration-200` animates both, so it slides and resizes in one motion between tabs of different widths.
4. Measurement re-runs on three triggers: a `ResizeObserver` on the strip and on every tab (labels and web fonts change tab widths without resizing the strip), and a `MutationObserver` on the subtree filtered to `data-selected`, which fires when React Aria moves the selection. The MutationObserver also re-observes tabs when children change. The effect depends on `useDirection()`, so switching between LTR and RTL re-measures from the new layout.
5. `Tab` renders the label in `text-body-medium text-accent-600` when selected and `text-body-regular text-text-primary` otherwise, with an optional 16px leading `icon` that inherits the colour. A `count` badge (`rounded-sm px-1 py-px text-caption-1-medium`) uses `bg-tab-count-selected-background text-accent-600` when selected, and `bg-black/10 text-text-primary opacity-50` when not.
6. `PillTabList` is a `role="group"` row (`relative inline-flex gap-1`). It finds the `[data-pill-selected]` button and stores its `left`, `top`, `width`, `height` and variant (read from `data-pill-variant`), then paints one thumb with `translate(left, top)` plus width and height, transitioned over 300ms on `cubic-bezier(0.34,1.2,0.64,1)`. The same Resize/Mutation observer pair keeps it aligned.
7. `PillTab` is a `<button type="button" aria-pressed>` at `z-10` above the thumb. Variant `blue` is `rounded-full` with an accent-50 thumb and `text-accent-500` label. Variant `gray` is `rounded-2lg` with `bg-background-tertiary-default`. An unselected pill fades in its own hover layer (`opacity-0` to `group-hover:opacity-100`, 200ms), so hover never moves the shared thumb.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `underline = h-0.5 (2px), 200ms, transform + width`
  Figma draws a 2px blue rule over the 1px baseline. Transitioning only `transform` and `width` keeps the slide on the compositor-friendly path, and 200ms is short enough that rapid arrow-key presses never leave the bar lagging two tabs behind.
- `pill thumb easing = 300ms cubic-bezier(0.34, 1.2, 0.64, 1)`
  The second control point at 1.2 overshoots by a few percent, which reads as a small spring settle without a JS spring. It is longer than the underline because the thumb moves a filled surface and the overshoot needs time to read.
- `tab padding = px-2.5 py-2, gap-2.5 label to count`
  10px by 8px and the 10px label-to-count gap are the Figma tab spec (node 3793:2942). The indicator width is measured from the tab box, so changing padding also changes how wide the underline is.
- `pill padding = px-2 py-[5px], icon size-5`
  8px by 5px around a 20px icon and 20px line height gives a 30px pill, the height of the AI chat panel switcher it came from.

## API

```ts
function Tabs(props: AriaTabsProps & { ref?: Ref<HTMLDivElement> }): JSX.Element
function TabList<T extends object>(props: AriaTabListProps<T> & { ref?: Ref<HTMLDivElement> }): JSX.Element
function Tab(props: Omit<AriaTabProps, "children"> & { children?: ReactNode; icon?: IconComponent; count?: ReactNode; ref?: Ref<HTMLDivElement> }): JSX.Element
function TabPanel(props: AriaTabPanelProps & { ref?: Ref<HTMLDivElement> }): JSX.Element
function PillTabList(props: HTMLAttributes<HTMLDivElement> & { ref?: Ref<HTMLDivElement> }): JSX.Element
function PillTab(props: { variant?: "blue" | "gray"; icon?: IconComponent; isSelected: boolean; onSelect: () => void; children: ReactNode; className?: string }): JSX.Element
```

- `Tabs.selectedKey / defaultSelectedKey: Key`
  Controlled or uncontrolled selection, straight from React Aria. Pair with `onSelectionChange`.
- `Tabs.orientation: "horizontal" | "vertical"` — default `"horizontal"`
  Vertical switches the outer stack to `flex-row`. The underline measures `offsetLeft` only, so it is designed for horizontal strips.
- `TabList.aria-label: string`
  Accessible name for the tab list. Required when there is no visible heading.
- `Tab.id: Key`
  Key that matches the `id` of the `TabPanel` it controls.
- `Tab.icon: ComponentType<{ className?: string }>`
  16px leading icon component. Inherits the label colour.
- `Tab.count: ReactNode`
  Trailing badge, accent-tinted when the tab is selected and muted otherwise. Omitted when null.
- `PillTab.variant: "blue" | "gray"` — default `"blue"`
  Blue is fully rounded with an accent thumb; gray is a 10px radius with a neutral thumb.
- `PillTab.isSelected / onSelect: boolean / () => void`
  Controlled selection. The selected pill carries `data-pill-selected`, which the list measures.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
type Underline = { left: number; width: number };

export function TabList<T extends object>({ className, ref, ...props }: TabListProps<T>) {
  const direction = useDirection();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [underline, setUnderline] = useState<Underline | null>(null);

  useIsomorphicLayoutEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const measure = () => {
      const selected = el.querySelector<HTMLElement>("[role='tab'][data-selected]");
      if (selected) {
        setUnderline({ left: selected.offsetLeft, width: selected.offsetWidth });
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    // Labels and fonts can change width without resizing the full tab strip.
    const observeTabs = () => el.querySelectorAll("[role='tab']").forEach(tab => ro.observe(tab));
    observeTabs();
    const mo = new MutationObserver(() => { observeTabs(); measure(); });
    mo.observe(el, { attributes: true, childList: true, characterData: true, subtree: true, attributeFilter: ["data-selected"] });
    return () => {
      mo.disconnect();
      ro.disconnect();
    };
  }, [direction]);

  return (
    <div ref={wrapperRef} className="relative w-full">
      <AriaTabList
        ref={ref}
        {...props}
        className={(state) =>
          cx(
            "flex w-full items-center gap-1 border-b border-separator-border",
            typeof className === "function" ? className(state) : className,
          )
        }
      />
      {underline && (
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-0 h-0.5 bg-accent-600 transition-[transform,width] duration-200 ease"
          style={{
            transform: `translateX(${underline.left}px)`,
            width: underline.width,
          }}
        />
      )}
    </div>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Each list disconnects its `ResizeObserver` and `MutationObserver` in the layout effect cleanup, on unmount and whenever the direction changes. There are no timers or animation frames.

**Reduced motion.** The component does not check `prefers-reduced-motion` itself. The underline (200ms) and pill thumb (300ms) slides and the colour fades are plain CSS transitions, so a global reduced-motion rule that zeroes transition durations makes them jump straight to the new tab.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Do not draw the active underline with a border on each `Tab`. It cannot animate between tabs, and it doubles up with the strip's own `border-b`. The single measured span is what slides.
- Do not measure in a plain `useEffect`. The first paint would show the bar at its old position, or missing, for one frame. The isomorphic layout effect measures before paint.
- Do not drop the `ResizeObserver` on the individual tabs. A web font that loads after mount widens the labels without resizing the strip, and the underline is then left short of the text.
- Do not use `PillTab` for routed content panels. It is a toggle button with `aria-pressed`, not a `role="tab"`, so it has no arrow-key navigation and no panel association. Use the React Aria `Tabs` for that.
- Do not forget `aria-label` on `TabList`. React Aria warns at runtime when a tab list has no accessible name.

## Notes

- `PillTab` is controlled only: it takes `isSelected` and `onSelect`, and the parent owns which one is active. Several pills can be selected at once, but the thumb only follows the first `[data-pill-selected]` it finds.
- The thumb picks up the variant of the selected pill, so a row can mix blue and gray pills and the surface colour and radius switch as the selection moves.

## Definition of done

An underline strip with three tabs shows a 2px accent bar under the selected tab only. Click or arrow-key to another tab and the bar slides and resizes to the new tab in about 200ms, while the label turns accent and medium weight. Count badges are tinted on the selected tab and faded on the others. In a pill row, selecting another pill slides one shared thumb under it with a small overshoot, and hovering an unselected pill tints only that pill.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
