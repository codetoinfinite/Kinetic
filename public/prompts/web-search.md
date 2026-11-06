# Build: Web Search

Shows where an agent looked while it researched. Headings open a level and the searches under them land one row at a time on the Agent Log guide; a step with sources branches once more into a Sources row whose site marks overlap like a stack, each with its title and domain on hover. The row expands into a list of titles and domains, past six marks the rest collapse into a count, and per-step dwell makes slow searches hold longer than cached ones.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

The research half of an agent log: each query lands on a curved guide, and a step that found something branches into overlapping site marks.

- Category: display
- Runtime cost: dom
- Dependencies: motion@^12.43.0, @remixicon/react@^4.9.0, react-aria-components@^1.22.1

## How it works

1. Steps flatten into reveal units: one per step plus one for its Sources row. useRevealTicker from agent-log counts them, paced by a delayFor callback: startDelay first, sourceBeat between a step and its Sources row, then that step's dwell (or stepInterval) before the next step.
2. A memoised tree groups plain steps under the heading before them, with each node's unit offset; a node renders once revealed passes its offset, and its Sources row once revealed passes offset + 1.
3. The step the trail is holding on is the one owning unit revealed - 1, and it shimmers through ShimmerText until the next unit lands.
4. Top-level rows mount as motion.li with the shared blur-and-height reveal; nested steps and Sources rows are agent-log LogRow items with their own curved branch, and a GuideBridge drops 6px from each 16px glyph to the nested trunk at ms-2.
5. Site marks reuse the social-button glyph set: the path is drawn in the brand colour, black brands take text-primary so they invert with the theme, and anything else gets a globe. Each mark is a react-aria Focusable trigger for the kit Tooltip, rendered as a link when the source has an href.
6. The Sources list collapses with a grid-template-rows 1fr to 0fr transition and is inert while closed.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `startDelay = 320ms`
  The first row should not land on the same frame as the user turn that started the search.
- `sourceBeat = 450ms`
  Long enough to read the step before its sources branch off, short enough that the two still read as one find.
- `stepInterval = 850ms (demo 800ms)`
  Default hold for a step with no dwell; dwell overrides it per step.
- `maxMarks = 6`
  Six overlapping 20px marks fit beside "Sources" at 360px; the rest become a +N count.
- `mark overlap = 20px bordered tiles, -6px overlap`
  Each tile carries its own border and fill, so the stack reads as separate sites on any surface in either theme.

## API

```ts
<WebSearch key={turnId} steps={[{ label: "Ran 3 searches", icon: RiSearchLine, heading: true }, { label: "Searched Reddit for", query: "design tokens", brand: "reddit", meta: "5 results", dwell: 1400, sources }]} onComplete={() => reply()} />
```

- `steps: readonly WebSearchStep[]`
  Steps with label, optional query, icon or brand, heading, meta, dwell and sources ({ title, domain, brand?, href? }).
- `run: boolean` — default `true`
  Pauses and resumes the internal timer.
- `startDelay: number` — default `320`
  Milliseconds before the first row lands.
- `stepInterval: number` — default `850`
  Hold on a step that has no dwell, in milliseconds.
- `sourceBeat: number` — default `450`
  Milliseconds between a step and its Sources row.
- `revealed: number`
  Rows landed, when driven from real events; disables the timer.
- `maxMarks: number` — default `6`
  Marks drawn before the rest collapse into a count.
- `working: string | false` — default `"Working"`
  Tail indicator label while running; false hides it.
- `onComplete: () => void`
  Fires once when the last row lands.
- `aria-label: string` — default `"Web search"`
  Accessible name of the log.
- `className: string`
  Classes on the root.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
// Reveal order: every step is one row and a step with sources is two, the
// step then its Sources row. Pacing is per row: the Sources row lands a beat
// after its step, and the trail then holds for that step's dwell (or the
// interval) before the next step, so slow searches look slow.
const units = useMemo(() => {
  const out: { step: number; sources: boolean }[] = [];
  steps.forEach((step, i) => {
    out.push({ step: i, sources: false });
    if (searchStepUnits(step) === 2) out.push({ step: i, sources: true });
  });
  return out;
}, [steps]);

const delayFor = useCallback(
  (index: number) => {
    if (index === 0) return startDelay;
    if (units[index]?.sources) return sourceBeat;
    const prev = units[index - 1];
    const step = prev ? steps[prev.step] : undefined;
    return step?.dwell ?? stepInterval;
  },
  [units, steps, startDelay, stepInterval, sourceBeat],
);

// Headings open a level; plain steps after one nest under it, and plain
// steps before any heading sit at the top level.
const tree = useMemo(() => {
  const top: SearchNode[] = [];
  let parent: SearchNode | null = null;
  let offset = 0;
  steps.forEach((step, index) => {
    const node: SearchNode = { index, step, start: offset, children: [] };
    offset += searchStepUnits(step);
    if (step.heading) {
      top.push(node);
      parent = node;
    } else if (parent) {
      parent.children.push(node);
    } else {
      top.push(node);
    }
  });
  return top;
}, [steps]);
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The ticker clears its pending timeout whenever the revealed count, run flag or pacing changes and on unmount; the Working row clears its timer on unmount; tooltips are owned by react-aria and close with their trigger.

**Reduced motion.** Rows appear without the blur, lift or height animation, the guide is drawn at once, the shimmer and star twinkle stop, marks no longer lift on hover, and the Sources list opens and closes instantly. Rows still arrive on the same schedule.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Key the component on the turn: a new question needs a new key, or the reveal count carries over.
- Pass steps as a stable array; the pacing callback depends on it and a new array every render restarts the pending timer.
- A step with sources counts as two units when you drive revealed yourself.
- The marks sit inside the log's clipping edge, so their tooltips portal out through the kit Tooltip rather than rendering inline.

## Notes

- brand accepts any of the 24 social-button providers; pass href on a source to make its mark and list entry links.
- Pass working={false} to hide the tail indicator or a string to relabel it.

## Definition of done

After the user turn, "Ran 3 searches" lands, then the first search shimmers and its Sources row branches off with five marks; the Reddit search shows six marks and +2; the X search lands last, the Working row leaves and the answer appears. Clicking Sources sets aria-expanded to true and lists titles with domains; clicking again folds it; sending the message again replays the trail from the top.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
