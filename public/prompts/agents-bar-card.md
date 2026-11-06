# Build: Agents Bar Card

The agents card of an AI profile. A grey card shows "Agents", the number of agents that ran this month and a bordered month switcher, then a row of thin purple bars, one per agent. Agents that did not run sit on the baseline as short grey stubs. A readout row above the bars shows an avatar, name and value: the busiest agent by default, the hovered or focused one while you explore.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

One purple bar per agent for a month, grey stubs for idle ones; hover or arrow keys highlight a bar and show its avatar, name and value.

- Category: display
- Runtime cost: dom
- Dependencies: @remixicon/react@^4.9.0

## How it works

1. The bars are plain flex columns, no chart library. Each column fills the 160px chart height as its hit area, and the bar inside is sized as a percentage of the month's maximum with a 6px floor, so small values stay visible. Idle agents render a fixed 3px stub in `chart-neutral`; busy ones use `chart-agents-bar`, and the active one switches to `chart-agents-bar-active`.
2. Height changes are a 300ms CSS transition, so paging months makes the bars grow and shrink in place; the highlight colour follows the pointer in 120ms. `motion-reduce:transition-none` turns both off.
3. The bar row is a single `role="slider"` over the agent index: one tab stop instead of thirty. ArrowLeft and ArrowRight step, Home and End jump, Escape clears; `aria-valuetext` reads "Nova: 1,250 runs". Pointer enter on a column sets the same active index, and leaving the row or blurring it clears it, so mouse and keyboard highlight identically.
4. The readout uses the kit Avatar (24px, tinted by the agent's colour), the name, the value and a rank caption ("#3 of 30"); with nothing active it shows the busiest agent labelled "Most active". It is `aria-hidden` because the slider already announces the same text.
5. The month switcher is a bordered pill of two ghost icon Buttons around the month name, disabled at either end; the name is `aria-live` so a screen reader hears the new month. The card works controlled (`month`) or uncontrolled (`defaultMonth`, the last month by default).

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `chart height = 160px (h-40), bars from a 6px floor to 100% of the month max`
  Tall enough to rank thirty agents by eye; the floor keeps a 1% agent from vanishing into the baseline.
- `gaps = 3px below sm, 6px from sm, 3px top radius`
  Thirty bars still fit a 360px phone at about 7px each, and open up into the reference rhythm on wider cards.
- `idle stub = 3px chart-neutral`
  Shows the agent exists but did nothing, rather than leaving a gap that reads as missing data.
- `transition = 300ms ease-out on height, 120ms on colour`
  Long enough to follow which agents rose or fell between months; the highlight is quicker so it keeps up with a sweeping pointer.

## API

```ts
function AgentsBarCard(props: AgentsBarCardProps): JSX.Element
interface AgentsBarCardProps extends Omit<HTMLAttributes<HTMLElement>, "children"> { title?: string; months: AgentMonth[]; month?: string; defaultMonth?: string; onMonthChange?: (id: string) => void; unit?: string; formatValue?: (value: number) => string; startLabel?: string; endLabel?: string; ref?: Ref<HTMLElement> }
interface AgentMonth { id: string; label: string; agents: AgentUsage[] }
interface AgentUsage { id: string; name: string; initials?: string; color?: "neutral" | "blue" | "lime" | "pink"; value: number }
```

- `title: string` — default `"Agents"`
  Caption above the headline and part of the chart label.
- `months: AgentMonth[]`
  Months in order, each with its label and per-agent values.
- `month: string`
  Controlled month id.
- `defaultMonth: string` — default `last month`
  Initial month when uncontrolled.
- `onMonthChange: (id: string) => void`
  Called when the switcher pages to another month.
- `unit: string` — default `"runs"`
  Word after values.
- `formatValue: (value: number) => string` — default `en-US grouping`
  Formats values in the readout and label.
- `startLabel: string`
  Caption under the first bar.
- `endLabel: string`
  Caption under the last bar.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
const max = agents.reduce((m, a) => Math.max(m, a.value), 0);
const activeCount = agents.filter((a) => a.value > 0).length;
const topIndex = agents.reduce((best, a, i) => (a.value > (agents[best]?.value ?? -1) ? i : best), 0);
const shownIndex = activeIndex ?? topIndex;
const shown = agents[shownIndex];
const rank = shown ? agents.filter((a) => a.value > shown.value).length + 1 : 0;

const goMonth = (step: -1 | 1) => {
  const next = months[monthIndex + step];
  if (!next) return;
  setActiveIndex(null);
  if (month === undefined) setInnerMonth(next.id);
  onMonthChange?.(next.id);
};

// One tab stop for every bar: arrows step, Home/End jump, Escape clears.
const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
  const last = agents.length - 1;
  if (last < 0) return;
  let next: number | null | undefined;
  if (e.key === "ArrowLeft") next = activeIndex === null ? last : Math.max(0, activeIndex - 1);
  else if (e.key === "ArrowRight") next = activeIndex === null ? 0 : Math.min(last, activeIndex + 1);
  else if (e.key === "Home") next = 0;
  else if (e.key === "End") next = last;
  else if (e.key === "Escape") next = null;
  if (next === undefined) return;
  e.preventDefault();
  setActiveIndex(next);
};
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** No timers, observers or global listeners. Pointer and keyboard handlers live on the chart element and go away with it.

**Reduced motion.** With prefers-reduced-motion the bars jump to their new heights and colours without the 300ms and 120ms transitions. Nothing else moves.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Making every bar a button. Thirty tab stops to cross one chart is hostile to keyboard users; one slider with arrow keys is the same information in one stop.
- Highlighting on hover only. Keyboard users then never see the readout; the active index is shared by pointer and keys.
- Scaling bars to a fixed maximum across months. A quiet month then looks empty; each month scales to its own busiest agent, and the readout gives the absolute numbers.
- Dropping idle agents from the row. Bars then shift position between months and the same agent lands in a different place; keep every agent and stub the idle ones.

## Notes

- Order agents by creation date (as the demo does, with "Oldest" and "Newest" captions) so a bar keeps its place month to month.
- Use `unit` and `formatValue` for tokens or minutes instead of runs.

## Definition of done

The card shows "Agents", "22 agents", a "December" switcher and thirty bars with eight grey stubs; the readout shows Cipher, 1,400 runs, "Most active". Hovering a bar turns it the darker purple and the readout shows that agent and its rank. Focusing the chart and pressing Home selects Atlas (620 runs). The previous button goes to November and October and is disabled there. At 360px all thirty bars still fit.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
