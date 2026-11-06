# Build: Task List

Renders what an agent did as a list of tasks, each a clickable header with a nested list of steps that can carry file chips. Every header and every step is one reveal unit paced by the Agent Log ticker, so the log grows row by row with a blur-in and a curved tree guide. A running task shimmers its title; once its last step lands it switches to doneTitle and, with collapseOnComplete, folds away while the header stays clickable.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A streaming agent log: task headers and their steps blur in one unit at a time down a curved guide, then each task settles and folds.

- Category: display
- Runtime cost: dom
- Dependencies: motion@^12.43.0, @remixicon/react@^4.9.0

## How it works

1. countTaskUnits sums 1 + steps.length per task; useRevealTicker from agent-log returns how many units have landed, from its own timer (startDelay, then stepInterval) or from the controlled revealed prop.
2. One pass over the tasks hands each its slice: the header is visible once revealed passes its start offset, shown = clamp(revealed - start - 1, 0, steps.length) steps are rendered, and done means all of its units are in.
3. Headers mount as motion.li with the shared UNIT_INITIAL/UNIT_ANIMATE blur-and-height reveal; steps are agent-log LogRow items, each drawing its own curved branch, and a GuideBridge drops 6px from the 16px header glyph to the trunk at ms-2.
4. Open state is overrides[id] ?? !autoClosed, where autoClosed is done (collapseOnComplete true) or the whole run being complete ("all"); the region collapses with a grid-template-rows 1fr to 0fr transition and is inert while closed.
5. Until the last unit lands a WorkingRow (Agent Thinking stars plus elapsed timer) sits at the tail; onComplete fires once through the ticker when revealed reaches the total.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `startDelay = 320ms`
  Keeps the first row from landing on the same frame as the user turn that started the run.
- `stepInterval = 850ms (demo 700ms)`
  One unit per beat reads as work happening; faster reads as a list being printed.
- `GuideBridge height = 6px`
  Header row is 28px (20px line + 4px padding each side) and the 16px glyph ends at 22px, so 6px joins it to the nested trunk.
- `collapse transition = 300ms ease-out`
  Folding a task should finish before the next unit lands at 700-850ms intervals.

## API

```ts
<TaskList key={turnId} tasks={tasks} startDelay={320} stepInterval={850} collapseOnComplete onComplete={() => setPhase("answered")} />
```

- `tasks: readonly TaskItem[]`
  Tasks with id, title, optional doneTitle and icon, and steps ({ label, chips? }).
- `run: boolean` — default `true`
  Pauses and resumes the internal ticker.
- `startDelay: number` — default `320`
  Milliseconds before the first unit lands.
- `stepInterval: number` — default `850`
  Milliseconds between units.
- `revealed: number`
  Units landed, when driven from real events; disables the timer.
- `collapseOnComplete: boolean | "all"` — default `false`
  Fold each task when its steps land, or all tasks when the run completes.
- `working: string | false` — default `"Working"`
  Tail indicator label while running; false hides it.
- `onComplete: () => void`
  Fires once when the final unit lands.
- `aria-label: string` — default `"Agent tasks"`
  Accessible name of the log.
- `className: string`
  Classes on the root.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
// Walk the tasks once, handing each its slice of the revealed units: the
// first unit shows the header, the rest land its steps in order. A task is
// done once all of its units are in, which settles its title and, with
// collapseOnComplete, folds it (or waits for the whole run with "all").
let offset = 0;
const blocks = tasks.map((task) => {
  const start = offset;
  offset += taskUnits(task);
  const visible = revealed > start;
  const shown = Math.max(0, Math.min(task.steps.length, revealed - start - 1));
  const done = revealed >= start + taskUnits(task);
  const autoClosed =
    collapseOnComplete === "all" ? complete : collapseOnComplete ? done : false;
  const open = overrides[task.id] ?? !autoClosed;
  return { task, visible, shown, done, open };
});
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The ticker clears its pending timeout whenever revealed, run or pacing changes and on unmount; the Working row timer interval is cleared on unmount. No other listeners are attached.

**Reduced motion.** Rows and headers appear without the blur, lift or height animation, the guide is drawn immediately, the title shimmer and star twinkle stop, and folding happens instantly. Units still arrive on the same schedule.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Key the list on the turn: changing tasks in place keeps the revealed count, so a fresh run needs a new key.
- Appending tasks to a finished list resumes the ticker and fires onComplete again when the new units land.
- Give every task a stable id; open overrides are stored by id.

## Notes

- Chip icons are ReactNodes sized to 14px by the chip; colour them with theme tokens.
- Pass working={false} to drop the tail indicator, or a string to relabel it.

## Definition of done

The log starts with "Searching project files" shimmering and its steps landing one by one with file chips; when the fourth step lands the title reads "Found project files" and the task folds; after the last task the Working row disappears and onComplete shows the reply. Clicking a folded header sets aria-expanded to true and shows its steps; Add task appends a follow-up that streams in; Replay restarts from the first task.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
