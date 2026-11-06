# Build: Agent Detail Panel

The side panel of a multi-agent workspace for the agent you picked: avatar and name, a live status pill, the task it is working on, a progress rail with "n of m" steps, optional stat tiles and a vertical step log. The footer drives the run: Pause turns into Resume, Stop asks for confirmation, and a finished, failed or stopped run offers Run again. The step log re-reads itself from the run status, so a paused run shows a paused step and a stopped run strikes out what will never happen.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Selected-agent panel: status pill, task, progress, step log and Pause / Resume / Stop actions that change the run state.

- Category: display
- Runtime cost: dom
- Dependencies: @remixicon/react@^4.9.0

## How it works

1. useAgentRunStatus keeps the run status controlled (status) or uncontrolled (defaultStatus) and returns a dispatcher: pause → paused, resume and restart → running, stop → stopped; every change calls onStatusChange(next, action), and restart also calls onRestart so the owner can reset its steps.
2. stepLook(stepState, runStatus) folds the run status into each step: the active step renders a spinner while running, a pause chip when paused, a question chip when waiting, a stop chip when stopped and an error chip when failed; pending steps become "Skipped" (struck through, detail hidden) once the run is stopped or failed.
3. The progress rail is the kit ProgressTrack at doneCount / steps.length, recoloured through its text colour: accent while running, orange paused, neutral stopped, red failed, green done.
4. The footer swaps between three layouts: Pause or Resume plus Stop while live, an inline "Stop this run?" group with Keep running / Stop run when confirmStop is on, and a status line with Run again once the run is terminal.
5. When the active step id changes and followActive is on, an effect measures that row inside the scrolling body (offsetTop against the relative body) and, only if it is out of view, scrolls the body so its bottom sits 16px above the fold; the page itself never scrolls.
6. The status pill has role="status" so the new label ("Paused", "Stopped") is announced; every step carries an sr-only state word next to its title.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `step chip = 20px circle, 12px icon`
  Wide enough for the 16px kit spinner glyph so the working step does not shift when it turns into a check.
- `connector = 1px at start-2.5, from top-6 to bottom-1`
  Centres the rail under the 20px chip and leaves a gap above the next chip.
- `follow margin = 16px`
  Leaves a sliver of the next pending step visible under the live one, so the log reads as continuing.
- `stats grid = 3 columns`
  Three short metrics (elapsed, files, tokens) fit a 360px-wide panel without wrapping.

## API

```ts
function AgentDetailPanel(props: { name: string; subtitle?: string; avatar?: ReactNode; task?: ReactNode; steps: AgentStep[]; stats?: AgentDetailStat[]; status?: AgentRunStatus; defaultStatus?: AgentRunStatus; onStatusChange?: (status: AgentRunStatus, action: AgentRunAction) => void; onRestart?: () => void; onClose?: () => void; confirmStop?: boolean; followActive?: boolean; className?: string }): JSX.Element
```

- `name: string`
  Agent name in the header.
- `subtitle: string`
  Role or label under the name.
- `avatar: ReactNode`
  40px avatar; defaults to a seeded monogram.
- `task: ReactNode`
  The instruction the agent is working on.
- `steps: AgentStep[]`
  { id, title, detail?, time?, state: "done" | "active" | "pending" | "failed" }.
- `stats: { label: string; value: ReactNode }[]`
  Optional stat tiles under the progress rail.
- `status: "running" | "waiting" | "paused" | "done" | "stopped" | "error"`
  Controlled run status.
- `defaultStatus: AgentRunStatus` — default `"running"`
  Initial status when uncontrolled.
- `onStatusChange: (status, action: "pause" | "resume" | "stop" | "restart") => void`
  Called by every footer action.
- `onRestart: () => void`
  Shows Run again on terminal runs; reset your steps here.
- `onClose: () => void`
  Shows the header close button.
- `confirmStop: boolean` — default `true`
  Ask before stopping.
- `followActive: boolean` — default `true`
  Scroll the panel body to keep the active step in view.
- `className: string`
  Classes for the panel surface (width, height).

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function stepLook(step: AgentStepState, run: AgentRunStatus): StepLook {
  if (step === "done") return "done";
  if (step === "failed") return "failed";
  if (step === "active") {
    if (run === "running") return "working";
    if (run === "waiting") return "waiting";
    if (run === "paused") return "paused";
    if (run === "error") return "failed";
    if (run === "done") return "done";
    return "stopped";
  }
  return run === "stopped" || run === "error" ? "skipped" : "pending";
}

export function nextRunStatus(action: AgentRunAction): AgentRunStatus {
  if (action === "pause") return "paused";
  if (action === "stop") return "stopped";
  return "running";
}

/** Controlled-or-uncontrolled run status plus the action dispatcher behind the footer buttons. */
export function useAgentRunStatus({
  status,
  defaultStatus = "running",
  onStatusChange,
  onRestart,
}: Pick<AgentDetailPanelProps, "status" | "defaultStatus" | "onStatusChange" | "onRestart">) {
  const [innerStatus, setInnerStatus] = useState<AgentRunStatus>(defaultStatus);
  const run = status ?? innerStatus;
  const act = (action: AgentRunAction) => {
    const next = nextRunStatus(action);
    if (status === undefined) setInnerStatus(next);
    onStatusChange?.(next, action);
    if (action === "restart") onRestart?.();
  };
  return [run, act] as const;
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The panel owns no timers or listeners; the demo clears its step-advance interval whenever the run leaves running and on unmount.

**Reduced motion.** The running ping on the status dot is hidden, colour and confirm-row transitions use motion-reduce:transition-none, and the kit spinner slows to a 2.4s turn instead of stopping, and following the active step jumps (behavior auto) instead of smooth-scrolling; state changes are instant.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Do not mutate steps when the run stops: the panel derives Stopped and Skipped from the run status, and the owner keeps the real step states for a later resume.
- Restart only resets the status; reset your steps in onRestart or the log still shows the old run as finished.
- In controlled mode the panel never changes its own status: update status from onStatusChange or the buttons appear dead.

## Notes

- Pass onClose to show a close button in the header; pass avatar to replace the seeded monogram (for example with a blob avatar).
- Set the panel height through className; the body scrolls while the header and footer stay put.
- The panel is a size container: below 22rem wide the status pill collapses to its coloured dot and keeps the label for screen readers, so the name has room.

## Definition of done

With a running run, Pause sets the pill to "Paused" and shows Resume; Resume returns to "Running"; Stop shows "Stop this run?" and Stop run sets "Stopped", turns pending steps into "Skipped" and shows Run again, which calls onRestart and sets "Running"; the "n of m" count equals the done steps.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
