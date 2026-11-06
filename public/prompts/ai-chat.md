# Build: AI Chat

A full AI coding chat for a 1280 × 800 frame. The left card holds the account menu, quick search and chats grouped by repository; the middle pane is the open chat with a glowing composer and a status bar for branch, project, mode and context; the right pane lists uncommitted changes with their code. Sending a message runs a simulated agent with timers only: a step checklist ticks through, a thinking indicator counts up, then the reply streams in and the run leaves a new file in the changes panel.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A coding-agent workspace: chat history sidebar, a thread with a live step checklist and streamed replies, and a changes panel with diffs.

- Category: block
- Runtime cost: dom
- Dependencies: @remixicon/react@^4.9.0, react-aria-components@^1.22.1

## How it works

1. All state lives in `AiChat`: chats, the open chat, the view, files, terminal lines, mode, branch, project, context use and the single active run. The sidebar, thread and changes panel are controlled components in their own files.
2. A run is `{ steps, step, phase, full, shown }`. One effect keyed on the run arms one timeout: in the working phase it advances `step` every 1300ms, holds 600ms on the finished list, then switches to streaming; in streaming it appends three characters every 24ms. Cleanup clears the timeout, so Stop, deleting the chat or unmounting never leaves a callback.
3. The run lives in the page, not the thread, so it keeps going while another chat is open. The sidebar shows a working dot on that chat and the composer of other chats will not send until it ends.
4. `AgentProgress` gets the parent's `step` as a controlled prop with no `onStepChange`, so its own clock only animates the bar between steps while the page decides when a step is done.
5. Mode changes the run: Agent runs three steps and writes a file, Ask skips the checklist and only thinks, Plan returns a plan without touching files. Turning off "Run lint and a production build" in Customize drops the lint step and its terminal lines.
6. The changes panel is real: selecting a file shows its tokenised code, Revert removes one file, Discard all asks first, and Commit empties the list and reports the commit. The Browser tab keeps a back and forward history over three local routes.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `STEP_MS = 1300ms`
  Long enough to read each checklist line as it completes; the reference's five steps take about seven seconds.
- `stream tick = 3 characters every 24ms`
  About 125 characters a second reads as typing without making a two-sentence reply wait long.
- `CONTEXT_LIMIT = 200,000 tokens, opening at 114,000`
  Opens at 57% like the reference ring and climbs with each finished run.
- `panel width = 400px, 560px when widened`
  At 1280px the narrow panel leaves about 600px for the chat column next to the 248px sidebar.

## API

```ts
function AiChat(props: AiChatProps): JSX.Element
interface AiChatProps { folders?: AiChatFolder[]; threads?: AiChatThread[]; files?: AiChatFile[]; defaultThreadId?: string; autoStart?: boolean; className?: string }
```

- `folders: AiChatFolder[]` — default `AI_CHAT_FOLDERS`
  Repositories shown as folders in the sidebar.
- `threads: AiChatThread[]` — default `AI_CHAT_THREADS`
  Seed chats; each names its folder and holds its turns.
- `files: AiChatFile[]` — default `AI_CHAT_FILES`
  Uncommitted files listed in the changes panel at load.
- `defaultThreadId: string` — default `"coding"`
  Chat open on first render.
- `autoStart: boolean` — default `true`
  If the opening chat ends with a user message, run the agent on it at load.
- `className: string`
  Merged onto the root, which is h-full w-full.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
// The agent timeline: one timer at a time walks the steps, holds on the
// finished checklist, then streams the reply a few characters per tick.
// Every state change re-arms the effect, and cleanup clears the old timer,
// so stopping, deleting or unmounting never leaves a callback behind.
useEffect(() => {
  if (!run) return;
  let timer: ReturnType<typeof setTimeout>;
  if (run.phase === "working") {
    const total = run.steps.length;
    const done = run.step >= total;
    timer = setTimeout(
      () => {
        if (done) {
          setRun({ ...run, phase: "streaming" });
          return;
        }
        log(`✓ ${run.steps[run.step] ?? ""}`);
        setRun({ ...run, step: run.step + 1 });
      },
      total === 0 ? THINK_MS : done ? DONE_HOLD_MS : STEP_MS,
    );
  } else {
    timer = setTimeout(
      () => {
        const shown = reduced ? run.full : run.full.slice(0, run.shown.length + CHUNK);
        if (shown.length >= run.full.length) finish(run);
        else setRun({ ...run, shown });
      },
      reduced ? 0 : TICK_MS,
    );
  }
  return () => clearTimeout(timer);
  // finish/log only call state setters, so the run and motion setting are the real inputs.
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [run, reduced]);
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The run timeout is cleared on every run change and on unmount. The dictation timer, the share copied-state timer and the browser loading timer each clear on unmount.

**Reduced motion.** Under reduced motion the reply appears at once instead of streaming, the composer glow stops pulsing, the thinking label drops its shimmer, and hover and panel-width transitions use motion-reduce:transition-none. The step checklist still advances so the run stays readable.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Running the timeline in the thread component. Switching chats would unmount it and lose the run; the page owns it and passes it down only to the chat it belongs to.
- Letting `AgentProgress` advance itself while the page also advances. Two clocks drift apart; pass a controlled `step` and leave `onStepChange` unset.
- Sending on Enter during IME composition. The composer checks `isComposing` so confirming a Japanese or Chinese candidate does not send a half-typed message.

## Notes

- The "coding scenario" chat opens mid-run with the reference's five steps, so the first reply streams in about eight seconds after load.
- Support and Upgrade are local stand-ins: Support copies an address and Upgrade switches the plan name on the sidebar card.

## Definition of done

At 1280 × 800 a sidebar, a chat and a changes panel fill the frame. The coding scenario chat ticks through five steps, then a reply streams in and a fourth file appears under Uncommitted changes. Typing a message and pressing Enter adds a bubble and starts a new run; Stop ends it. Selecting another chat, Automations or Customize switches the middle pane. The sidebar collapses to a rail, the panel hides, widens and switches to Browser.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
