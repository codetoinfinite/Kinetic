# Build: Sankey Chart Card

A Sankey diagram in the BoardUI chart card shell. The layout is computed in the component: columns by link depth, nodes stacked to one shared scale, ribbons ordered so they only cross where the data does. Each ribbon takes its source node's colour, sources are labelled with name and value on the left, sinks with their share on the right. Hovering or focusing a node, or hovering a ribbon, lights the whole path through it, dims everything else and swaps the headline for that node or flow.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Source-to-sink flows as tinted SVG ribbons in a dashboard card: hover a node or ribbon to isolate its path while the headline follows.

- Category: display
- Runtime cost: dom
- Dependencies: none beyond React

## How it works

1. Links reference nodes by name or index. Unknown references, self-links and non-positive values are dropped. Depths are relaxed across the links (a node sits one column right of its deepest source), with the passes capped at the node count so a cycle cannot loop forever.
2. A node's value is the larger of its inflow and outflow. Each column needs `(height - 14px * (n - 1)) / sum` px per unit; the smallest of those is used for every column, so equal hours are equal heights everywhere. Each column is then centred vertically.
3. Ribbons leave a source stacked in the vertical order of their targets and arrive at a target stacked in the order of their sources. Each is a filled path: two cubic Béziers whose control points sit at the horizontal midpoint, so the band keeps its thickness at both ends and eases between them.
4. The chart width comes from `useResizeObserver`. The label gutters are `clamp(14% of width, 72, 96)` on the left and `clamp(26%, 104, 168)` on the right. Below 440px the labels drop to 12px names and the sink labels stack the share under the name.
5. Hover is `{ kind: "node" | "link", index }`. `litPath` walks upstream and downstream from the node (or from the ribbon's two ends), collecting links and nodes. Lit ribbons go to 0.65 fill-opacity, the rest to 0.1 (0.4 at rest), and unlit nodes and labels fade over 200ms.
6. The labels are absolutely positioned `<button>`s carrying a full description ("Focus: 32h, 37% of total. to Browsing 9h, …"), so keyboard and screen-reader users get every flow. Focus lights the same path as hover.
7. A clipPath rect sweeps from the first column to the right edge over 800ms (ease-out cubic) on mount and on every period change. `useSweep` resets to 0 during render when the key changes, so no frame shows the old ribbons at full width.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `NODE_W = 12px, rx 3`
  Wide enough to read as a bar and to hover, narrow enough that the ribbons carry the picture.
- `NODE_GAP = 14px`
  At the default 340px height with seven sinks, this leaves 256px for 86h (about 3px per hour) and room for a two-line label beside a 7h node.
- `RIBBON = rest 0.4, lit 0.65, dim 0.1 fill-opacity`
  At rest overlaps stay readable; on hover the lit path stands out and the rest almost disappears without vanishing.
- `SWEEP_MS = 800ms ease-out cubic`
  The sweep reads as flow from sources to sinks. A new period redraws instead of morphing, because node order and counts can change between ranges.
- `COMPACT_W = 440px`
  Below it, "Everything else · 13%" no longer fits the right gutter on one line, so the share moves under a 12px name.
- `chartHeight = 340px`
  Matches the preview's proportion with seven sinks.

## API

```ts
function SankeyChartCard(props: { title?: string; ranges?: FlowRange[]; nodes?: FlowNode[]; links?: FlowLink[]; delta?: number; range?: string; defaultRange?: string; onRangeChange?: (id: string) => void; formatValue?: (value: number) => string; sourceCaption?: string; targetCaption?: string; chartHeight?: number; className?: string }): JSX.Element
type FlowNode = { name: string; color?: ChartColor }
type FlowLink = { source: string | number; target: string | number; value: number }
```

- `title: string` — default `"Tracked time"`
  Header label while nothing is hovered; also the card's accessible name.
- `ranges: FlowRange[]` — default `TRACKED_TIME_RANGES`
  Periods with their own nodes, links and optional delta/headline. Two or more show the period select.
- `nodes: FlowNode[]`
  Static nodes; used with `links` instead of `ranges`.
- `links: FlowLink[]`
  Static links `{ source, target, value }`, by node name or index.
- `delta: number`
  Headline chip percentage for static data.
- `range: string`
  Controlled period id.
- `defaultRange: string` — default `first range id`
  Initial period when uncontrolled.
- `onRangeChange: (id: string) => void`
  Called when the period select changes.
- `formatValue: (value: number) => string` — default `whole hours, e.g. "86h"`
  Formats the headline, the source labels and the screen-reader descriptions.
- `sourceCaption: string` — default `"Tracked time"`
  Caption under the left column.
- `targetCaption: string` — default `"Share of tracked time"`
  Caption under the right column.
- `chartHeight: number` — default `340`
  Chart height in px.
- `className: string`
  Merged onto the card section.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/**
 * Columns come from link depth (a node sits one column right of its deepest
 * source). Every column is stacked to the same px-per-unit scale, the
 * tightest one any column allows, then centred. Ribbons leave a node in the
 * vertical order of their targets and arrive in the order of their sources,
 * so they only cross where the data makes them.
 */
function layoutSankey(
  nodesIn: readonly FlowNode[],
  linksIn: readonly FlowLink[],
  box: { width: number; height: number; left: number; right: number },
): Layout {
  const byName = new Map(nodesIn.map((node, index) => [node.name, index] as const));
  const resolve = (ref: string | number) =>
    typeof ref === "number" ? (ref >= 0 && ref < nodesIn.length ? ref : -1) : (byName.get(ref) ?? -1);
  const links = linksIn
    .map((link) => ({ source: resolve(link.source), target: resolve(link.target), value: link.value }))
    .filter((link) => link.source >= 0 && link.target >= 0 && link.source !== link.target && link.value > 0);

  const count = nodesIn.length;
  const depth = new Array<number>(count).fill(0);
  // Relax depths; capping the passes at the node count keeps a cycle from looping forever.
  for (let pass = 0; pass < count; pass++) {
    let changed = false;
    for (const link of links) {
      const next = (depth[link.source] ?? 0) + 1;
      if (next > (depth[link.target] ?? 0) && next < count) {
        depth[link.target] = next;
        changed = true;
      }
    }
    if (!changed) break;
  }
  const maxDepth = Math.max(0, ...depth);

  const inSum = new Array<number>(count).fill(0);
  const outSum = new Array<number>(count).fill(0);
  for (const link of links) {
    outSum[link.source] = (outSum[link.source] ?? 0) + link.value;
    inSum[link.target] = (inSum[link.target] ?? 0) + link.value;
  }
  const values = nodesIn.map((_, i) => Math.max(inSum[i] ?? 0, outSum[i] ?? 0));

  const columns: number[][] = Array.from({ length: maxDepth + 1 }, () => []);
  depth.forEach((d, i) => columns[d]?.push(i));

  let scale = Infinity;
  for (const column of columns) {
    const sum = column.reduce((acc, i) => acc + (values[i] ?? 0), 0);
    if (sum > 0) scale = Math.min(scale, (box.height - NODE_GAP * (column.length - 1)) / sum);
  }
  if (!Number.isFinite(scale) || scale < 0) scale = 0;

  const span = Math.max(0, box.width - box.left - box.right - NODE_W);
  let firstOrdinal = 0;
  const nodes: LaidNode[] = nodesIn.map((node, index) => {
    const d = depth[index] ?? 0;
    const colorKey = node.color ?? (d === 0 ? chartColorAt(firstOrdinal++) : null);
    return {
      index,
      name: node.name,
      colorKey,
      fill: colorKey ? CHART_COLORS[colorKey].fill : NEUTRAL_FILL,
      depth: d,
      value: values[index] ?? 0,
      x: box.left + (maxDepth > 0 ? (d / maxDepth) * span : 0),
      y0: 0,
      y1: 0,
    };
  });

  for (const column of columns) {
    const used =
      column.reduce((acc, i) => acc + (values[i] ?? 0) * scale, 0) + NODE_GAP * Math.max(0, column.length - 1);
    let y = (box.height - used) / 2;
    for (const i of column) {
      const node = nodes[i];
      if (!node) continue;
      node.y0 = y;
      node.y1 = y + node.value * scale;
      y = node.y1 + NODE_GAP;
    }
  }

  const top = (i: number) => nodes[i]?.y0 ?? 0;
  const outOffset = nodes.map((node) => node.y0);
  const inOffset = nodes.map((node) => node.y0);
  const sy = new Array<number>(links.length).fill(0);
  const ty = new Array<number>(links.length).fill(0);
  const order = links.map((_, i) => i);
  for (const i of [...order].sort((a, b) => top(links[a]!.target) - top(links[b]!.target) || a - b)) {
    const link = links[i]!;
    sy[i] = outOffset[link.source] ?? 0;
    outOffset[link.source] = sy[i]! + link.value * scale;
  }
  for (const i of [...order].sort((a, b) => top(links[a]!.source) - top(links[b]!.source) || a - b)) {
    const link = links[i]!;
    ty[i] = inOffset[link.target] ?? 0;
    inOffset[link.target] = ty[i]! + link.value * scale;
  }

  const laidLinks: LaidLink[] = links.map((link, index) => {
    const from = nodes[link.source]!;
    const to = nodes[link.target]!;
    const h = link.value * scale;
    const x0 = r2(from.x + NODE_W);
    const x1 = r2(to.x);
    const xm = r2((x0 + x1) / 2);
    const s0 = r2(sy[index] ?? 0);
    const s1 = r2((sy[index] ?? 0) + h);
    const t0 = r2(ty[index] ?? 0);
    const t1 = r2((ty[index] ?? 0) + h);
    return {
      index,
      source: link.source,
      target: link.target,
      value: link.value,
      fill: from.fill,
      d: `M${x0} ${s0}C${xm} ${s0} ${xm} ${t0} ${x1} ${t0}V${t1}C${xm} ${t1} ${xm} ${s1} ${x0} ${s1}Z`,
    };
  });

  const total = nodes.filter((node) => node.depth === 0).reduce((acc, node) => acc + node.value, 0);
  return { nodes, links: laidLinks, maxDepth, total };
}

/** Everything upstream and downstream of the hovered node, or of the hovered ribbon's ends. */
function litPath(hover: Hover, layout: Layout) {
  if (!hover) return null;
  const nodes = new Set<number>();
  const links = new Set<number>();
  const walk = (start: number, dir: "up" | "down") => {
    const queue = [start];
    while (queue.length) {
      const at = queue.shift()!;
      for (const link of layout.links) {
        const from = dir === "down" ? link.source : link.target;
        const to = dir === "down" ? link.target : link.source;
        if (from !== at || links.has(link.index)) continue;
        links.add(link.index);
        nodes.add(to);
        queue.push(to);
      }
    }
  };
  if (hover.kind === "node") {
    nodes.add(hover.index);
    walk(hover.index, "up");
    walk(hover.index, "down");
  } else {
    const link = layout.links[hover.index];
    if (!link) return null;
    links.add(link.index);
    nodes.add(link.source).add(link.target);
    walk(link.source, "up");
    walk(link.target, "down");
  }
  return { nodes, links };
}

/** 0 to 1 eased progress that restarts whenever `key` changes; 1 throughout when disabled. */
function useSweep(key: string, disabled: boolean) {
  const [progress, setProgress] = useState(0);
  const [lastKey, setLastKey] = useState(key);
  if (lastKey !== key) {
    setLastKey(key);
    setProgress(0);
  }
  useEffect(() => {
    if (disabled) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      // rAF's timestamp is the frame's start, which can precede the effect's
      // performance.now() after a long commit; unclamped, t < 0 gives a
      // negative clip width.
      const t = Math.min(1, Math.max(0, (now - start) / SWEEP_MS));
      setProgress(easeOutCubic(t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [key, disabled]);
  return disabled ? 1 : progress;
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The sweep's and the count-up's animation frames are cancelled on every restart and on unmount. `useResizeObserver` unobserves the chart box on unmount.

**Reduced motion.** `useSweep` is disabled, so the ribbons are drawn in full at once on mount and on a period change. The headline count runs over 1ms, and the opacity transitions and number fade are removed with `motion-reduce:` variants.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Stroking a centre line with `stroke-width` for ribbons. The stroke keeps its width perpendicular to the curve, so on a slope the band visibly thins and the ends no longer match the node slices. Filled ribbons keep exact heights at both ends.
- Scaling each column to fill the height on its own. A column with fewer nodes would get a bigger px-per-unit than its neighbours, and ribbons would change thickness between columns.
- Sorting a node's outgoing ribbons by value instead of by target position. Ribbons then cross right next to the node and the diagram turns to noise.
- Leaving the old ribbons visible for a frame when the period changes. `useSweep` resets its progress during render, not in an effect.

## Notes

- Pass `nodes` and `links` for one static data set (no period select), or `ranges` for a select. `TRACKED_TIME_RANGES`, `FlowNode`, `FlowLink` and `FlowRange` are exported.
- More than two columns work: middle nodes are labelled on their right with their share of the total. Labels of very small neighbouring nodes can overlap; raise `chartHeight` for dense columns.
- The frame, header and period select come from `funnel-chart-card-shell`.

## Definition of done

The card reads "Tracked time" and "86h" with a "This week" select. Sources Focus 32h (emerald), Meetings 18h (purple), Breaks 12h (yellow), Admin 14h (blue) and Learning 10h (pink) sit on the left. On the right are grey sinks Browsing · 22%, Writing · 18%, Messaging · 13%, Productivity · 12%, Email · 8%, Video calls · 14% and Everything else · 13%. Hovering Focus dims the other sources' ribbons and the header shows "Focus", "32h" and "37% of total". Hovering a ribbon shows e.g. "Focus → Browsing". Choosing "Last week" redraws the ribbons with a sweep, and the headline becomes 79h.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
