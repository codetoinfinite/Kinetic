# Build: Template Showcase Tabs

The "templates" section of a product landing page: a centred header (Pro pill, title, copy, CTA) over a rounded card. The card holds a horizontally scrollable row of icon tabs with an action slot on the right (e.g. "Live preview"), and a large preview well where each tab shows a miniature app layout drawn with plain divs. A soft blue pill slides under the selected tab and the previews crossfade instead of popping.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Landing section with a framed card of template tabs: a pill slides to the chosen tab and miniature app layouts crossfade below it.

- Category: block
- Runtime cost: css
- Dependencies: react-aria-components@^1.22.1

## How it works

1. Tabs: react-aria-components `Tabs` / `TabList` / `Tab` / `TabPanel`, so arrow keys, Home/End, roving focus and the tab/tabpanel wiring come for free. Selection is controlled internally (or by `selectedKey`) so the component always knows which tab to measure.
2. Sliding pill: after every selection change a layout effect finds `[role=tab][data-selected]` and stores its `offsetLeft` / `offsetWidth`. The pill is an absolutely positioned span inside the scrolling strip, placed with `translate` and `width` and transitioned over 300ms. Offset metrics are layout values, so the pill stays aligned inside CSS-scaled previews where `getBoundingClientRect` would not. A ResizeObserver on the strip and on each tab re-measures when fonts load or labels change.
3. Crossfade: every `TabPanel` uses `shouldForceMount`, and all panels share one grid cell (`col-start-1 row-start-1`). react-aria marks unselected panels `inert` and `data-inert`; `data-inert:` turns them `invisible`, `opacity-0` and `scale-[0.985]` with a 300ms transition on opacity, scale and visibility. The outgoing preview fades while the incoming one fades in on top of it, and the inert ones are out of the tab order and the accessibility tree.
4. Overflow: the strip scrolls sideways with its scrollbar hidden. A scroll listener records whether there is content before or after the viewport and adds `mask-l-from` / `mask-r-from` edge fades only on those sides. When selection moves to a tab that is clipped, the strip scrolls just enough (24px margin) to reveal it with `scrollTo`, never `scrollIntoView`, so the page itself does not jump.
5. Previews are wrapped in `role="img"` with an `aria-label` of "<label> template preview": they are pictures of an app, not working UI.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `pill transition = 300ms cubic-bezier(0.22,1,0.36,1)`
  Fast start, long settle: the pill arrives before the crossfade finishes, which reads as cause then effect.
- `crossfade = 300ms ease-out, scale 0.985 → 1`
  A tiny scale keeps the change noticeable when two previews share a similar layout.
- `edge fade = mask from calc(100% − 3rem)`
  Signals more tabs offscreen without hiding the label under the action button.
- `preview height = 460px / 540px @3xl`
  Tall enough for a sidebar app layout to read; all panels share it so the card never changes height on switch.

## API

```ts
function TemplateShowcaseTabs(props: { items: { id: string; label: string; icon?: ComponentType<{ className?: string }>; preview: ReactNode }[]; selectedKey?: string; defaultSelectedKey?: string; onSelectionChange?: (id: string) => void; action?: ReactNode | ((item) => ReactNode); "aria-label"?: string; className?: string }): JSX.Element
function TemplateShowcase(props: { eyebrow?: ReactNode; title?: ReactNode; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }): JSX.Element
```

- `items: TemplateShowcaseItem[]`
  `{ id, label, icon?, preview }` per tab; `preview` is the miniature layout.
- `selectedKey: string`
  Controlled selected tab id.
- `defaultSelectedKey: string` — default `items[0].id`
  Initial tab when uncontrolled.
- `onSelectionChange: (id: string) => void`
  Called when the tab changes.
- `action: ReactNode | (item) => ReactNode`
  Right side of the tab bar.
- `aria-label: string` — default `"Templates"`
  Label for the tab list.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/**
 * A framed card: a scrollable row of tabs over a preview area. The selected tab
 * sits on a pill that slides between tabs (measured with offsetLeft/offsetWidth,
 * which ignore CSS transforms, so it stays correct inside scaled previews).
 * Every panel stays mounted in one grid cell; unselected ones carry `inert`
 * from react-aria, and `data-inert` fades them out, so switching is a crossfade.
 */
export function TemplateShowcaseTabs({
  items,
  selectedKey,
  defaultSelectedKey,
  onSelectionChange,
  action,
  "aria-label": ariaLabel = "Templates",
  className,
}: TemplateShowcaseTabsProps) {
  const reduced = useReducedMotion();
  const [internal, setInternal] = useState<string | undefined>(defaultSelectedKey ?? items[0]?.id);
  const selected = selectedKey ?? internal;
  const current = items.find((item) => item.id === selected) ?? items[0];

  const scrollerRef = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState<Pill | null>(null);
  const [edges, setEdges] = useState({ start: false, end: false });
  const firstRun = useRef(true);

  useIsoLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const measure = () => {
      const tab = scroller.querySelector<HTMLElement>("[role='tab'][data-selected]");
      if (tab) setPill({ left: tab.offsetLeft, width: tab.offsetWidth });
      const max = scroller.scrollWidth - scroller.clientWidth;
      const at = Math.abs(scroller.scrollLeft);
      setEdges({ start: at > 1, end: max - at > 1 });
    };
    measure();

    // Bring the newly selected tab fully into view without touching the page scroll.
    const tab = scroller.querySelector<HTMLElement>("[role='tab'][data-selected]");
    if (tab && !firstRun.current) {
      const pad = 24;
      const left = tab.offsetLeft;
      const right = left + tab.offsetWidth;
      let next: number | null = null;
      if (left - pad < scroller.scrollLeft) next = left - pad;
      else if (right + pad > scroller.scrollLeft + scroller.clientWidth) next = right + pad - scroller.clientWidth;
      if (next !== null) scroller.scrollTo({ left: next, behavior: reduced ? "auto" : "smooth" });
    }
    firstRun.current = false;

    const ro = new ResizeObserver(measure);
    ro.observe(scroller);
    scroller.querySelectorAll("[role='tab']").forEach((el) => ro.observe(el));
    scroller.addEventListener("scroll", measure, { passive: true });
    return () => {
      ro.disconnect();
      scroller.removeEventListener("scroll", measure);
    };
  }, [selected, items.length, reduced]);

  const handleChange = (key: Key) => {
    const id = String(key);
    if (selectedKey === undefined) setInternal(id);
    onSelectionChange?.(id);
  };

  const actionNode = typeof action === "function" ? (current ? action(current) : null) : action;

  return (
    <Tabs
      selectedKey={selected}
      onSelectionChange={handleChange}
      className={cx(
        "@container/showcase flex w-full flex-col gap-2 rounded-[28px] border border-border-button-default bg-background-primary-default p-2 shadow-xs",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <div
          ref={scrollerRef}
          className={cx(
            "relative min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            edges.start && "mask-l-from-[calc(100%-3rem)]",
            edges.end && "mask-r-from-[calc(100%-3rem)]",
          )}
        >
          {pill ? (
            <span
              aria-hidden="true"
              className={cx(
                "pointer-events-none absolute inset-y-0 left-0 rounded-2xl bg-pill-tab-blue-selected-background",
                !reduced && "transition-[translate,width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
              )}
              style={{ width: pill.width, translate: `${pill.left}px 0` }}
            />
          ) : null}
          <TabList aria-label={ariaLabel} className="relative flex w-max items-center gap-0.5">
            {items.map(({ id, label, icon: Icon }) => (
              <Tab
                key={id}
                id={id}
                className={cx(
                  "group/tab relative flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-2xl px-3.5 text-headline-regular whitespace-nowrap outline-none",
                  "text-text-secondary transition-colors duration-150 ease-out",
                  "data-hovered:text-text-primary not-data-selected:data-hovered:bg-pill-tab-blue-hover-background",
                  "data-selected:text-accent-500",
                  "data-focus-visible:ring-2 data-focus-visible:ring-border-focus-ring data-focus-visible:ring-inset",
                )}
              >
                {Icon ? (
                  <Icon className="size-[18px] shrink-0 text-foreground-icon-secondary group-data-selected/tab:text-accent-500" />
                ) : null}
                {label}
              </Tab>
            ))}
          </TabList>
        </div>
        {actionNode ? <div className="flex shrink-0 items-center pe-1">{actionNode}</div> : null}
      </div>

      <div className="@container/preview grid overflow-hidden rounded-[20px] border border-border-button-default bg-background-secondary-default">
        {items.map((item) => (
          <TabPanel
            key={item.id}
            id={item.id}
            shouldForceMount
            className={cx(
              "col-start-1 row-start-1 h-[460px] outline-none @3xl/showcase:h-[540px]",
              "data-inert:invisible data-inert:opacity-0 data-inert:scale-[0.985]",
              !reduced && "transition-[opacity,scale,visibility] duration-300 ease-out",
              "data-focus-visible:ring-2 data-focus-visible:ring-border-focus-ring data-focus-visible:ring-inset",
            )}
          >
            <div role="img" aria-label={`${item.label} template preview`} className="h-full w-full">
              {item.preview}
            </div>
          </TabPanel>
        ))}
      </div>
    </Tabs>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The layout effect disconnects its ResizeObserver and removes the strip scroll listener on every re-run and on unmount.

**Reduced motion.** The pill jumps to the selected tab and panels switch without the fade or scale (both transitions are omitted); the tab strip scrolls with `behavior: "auto"`.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Measuring tabs with `getBoundingClientRect` inside a scaled preview: the pill lands in the wrong place by the scale factor. Use offset metrics.
- Rendering only the selected panel: nothing exists to fade out, so the swap pops. Force-mount the panels and fade by `data-inert`.
- Fading with opacity alone: invisible panels are still on top for hit testing and still measured as "visible" by tests. Transition `visibility` with the opacity.
- Calling `scrollIntoView` on the selected tab also scrolls the page vertically when the card is partly offscreen; set the strip's `scrollLeft` instead.

## Notes

- The demo draws seven template previews (agentic chat, image generation, kanban board, marketing, contributor profile, healthcare, analytics) from divs, tokens and a few kit parts (Avatar, Chip). Inside the preview, `@container/preview` queries hide the sidebar and aside on narrow screens.
- `action` accepts a function of the selected item, so a "Live preview" button can label or link itself per template.
- `TemplateShowcase` is the optional centred header wrapper; the tabs card works on its own.

## Definition of done

At 1280px the card shows seven tabs with Agentic chat on the blue pill and a chat app preview below. Clicking Project board slides the pill there and crossfades to a four-column kanban; arrow keys move between tabs the same way. The Live preview button label follows the tab. At 390px the strip scrolls sideways with an edge fade, selecting a clipped tab scrolls it into view, and the previews drop their sidebars.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
