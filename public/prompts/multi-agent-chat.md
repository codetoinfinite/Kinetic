# Build: Multi Agent Chat

A full multi-agent chat for a 1280 × 800 frame. The left card lists conversations with stacked agent avatars, a marketplace button, support, settings and a workspace switcher. The middle pane is the open conversation: send one message and every agent in it answers in turn, each thinking for a moment before its reply streams in. The right panel edits any agent with the full agent creator, creates new ones, browses the workspace file tree with who last touched each file, and shows the progress of the current round of replies.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A group chat with a team of agents who reply in turn, plus a workspace switcher and a panel to edit agents and browse files.

- Category: block
- Runtime cost: dom
- Dependencies: @remixicon/react@^4.9.0, react-aria-components@^1.22.1

## How it works

1. All state lives in `MultiAgentChat`: agents, conversations, workspaces, the open conversation, the single active run, the last run per conversation, the side panel tab and the open modal. The conversation view and side panel are controlled components in their own files.
2. A run is `{ queue, index, phase, full, shown, paused }`. One effect keyed on the run arms one timeout: thinking waits on the agent's model (500, 900 or 1600ms, scaled by the composer model), streaming appends a chunk every 24ms scaled by the agent's speed, and a finished reply holds 380ms, is committed to the conversation and hands the turn to the next agent. Cleanup clears that timeout, so Stop, Pause, deleting the chat or unmounting never leaves a callback.
3. The run lives in the page, not the conversation, so it keeps going while another conversation is open. That conversation's list row says who is replying and collects unread replies, and other composers stay disabled until the round ends.
4. Each reply is written by `replyFor` from the agent's role label, the prompt and a counter, so the same agent answers differently on each turn. Plan mode in the composer makes every agent say it changed nothing.
5. The participant row above the composer toggles agents in and out of the open conversation; the next round only queues the agents still in it. Clicking an agent avatar in the thread, or a file owner in the Files tab, opens that agent in the editor.
6. Edits in the agent editor update the agent everywhere at once, because messages store only the agent id. The editor snapshots the agent on open and remounts after Save so its Reset returns to the saved version.
7. The Activity tab drives the run through `AgentDetailPanel`: Pause holds the current timer off, Resume re-arms it, Stop keeps the partial reply, and Run again replays the last prompt with the same agents.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `THINK_MS = swift 500ms, balanced 900ms, deep 1600ms`
  Deeper models visibly think longer, so a mixed team answers at different rhythms instead of in lockstep.
- `MODEL_PACE = Swift 2 Mini 0.5, Swift 2 1, Deep 1 1.6`
  The composer's model choice scales every agent's thinking so it has a felt effect.
- `stream tick = 3 characters every 24ms times the agent speed`
  About 125 characters a second at speed 1; a three-agent round finishes in under ten seconds.
- `HAND_OFF_MS = 380ms`
  A short beat on each finished reply makes the change of speaker readable.
- `side panel width = 356px`
  Fits the agent creator's pickers while leaving about 600px for the conversation next to the 272px list.

## API

```ts
function MultiAgentChat(props: MultiAgentChatProps): JSX.Element
interface MultiAgentChatProps { agents?: MacAgent[]; conversations?: MacConversation[]; workspaces?: Workspace[]; defaultWorkspaceId?: string; defaultConversationId?: string; className?: string }
```

- `agents: MacAgent[]` — default `MAC_AGENTS`
  The team: each agent is an AgentDraft with an id.
- `conversations: MacConversation[]` — default `MAC_CONVERSATIONS`
  Seed conversations; each names its workspace, its agents and its messages.
- `workspaces: Workspace[]` — default `MAC_WORKSPACES`
  Workspaces offered by the switcher.
- `defaultWorkspaceId: string` — default `"board"`
  Workspace selected on first render.
- `defaultConversationId: string` — default `"group"`
  Conversation open on first render.
- `className: string`
  Merged onto the root, which is h-full w-full.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
// One timeout at a time drives the run. Thinking waits on the agent's model,
// streaming appends a chunk per tick, and a finished reply is committed to
// the conversation before the next agent in the queue starts thinking.
// Every change to the run re-arms the effect, so cleanup always clears the
// only pending timer: Stop, Pause, deleting the chat or unmounting is safe.
useEffect(() => {
  if (!run || run.paused) return;
  const agent = agents.find((a) => a.id === run.queue[run.index]);
  const advance = () => {
    const index = run.index + 1;
    if (index < run.queue.length) {
      record(run, index, "running");
      setRun({ ...run, index, phase: "thinking", full: "", shown: 0 });
    } else {
      record(run, run.queue.length, "done");
      setRun(null);
    }
  };
  let timer: ReturnType<typeof setTimeout>;
  if (!agent) {
    timer = setTimeout(advance, 0);
  } else if (run.phase === "thinking") {
    timer = setTimeout(() => {
      const full = replyFor(agent, run.prompt, run.id + run.index, run.plan);
      setRun({ ...run, phase: "streaming", full, shown: reduced ? full.length : 0 });
    }, (THINK_MS[agent.model] ?? 900) * run.pace);
  } else if (run.shown < run.full.length) {
    const step = Math.max(1, Math.round(CHUNK * Number(agent.speed || 1)));
    timer = setTimeout(() => setRun({ ...run, shown: Math.min(run.full.length, run.shown + step) }), TICK_MS);
  } else {
    timer = setTimeout(() => {
      commit(run, run.full);
      advance();
    }, HAND_OFF_MS);
  }
  return () => clearTimeout(timer);
  // record and commit only read state through setters and refs.
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [run, agents, reduced]);
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The single run timeout is cleared on every run change, on pause and on unmount. The share and support copied-state timers clear on unmount.

**Reduced motion.** Under reduced motion each reply appears whole once its agent has thought, avatars stop floating and blinking, the thinking label drops its shimmer, and hover transitions use motion-reduce:transition-none. Turn-taking and its timing stay so the order of speakers is still readable.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Running replies inside the conversation component. Switching conversations would unmount it and drop the round; the page owns the run and passes the live reply only to the conversation it belongs to.
- Storing agent names or colours on messages. Renaming an agent would leave old messages stale; messages keep the agent id and look the agent up at render.
- Passing the live agent as the creator's default. Its Reset would revert to whatever was typed last; snapshot on open and remount on Save.
- Letting a deleted or cleared conversation keep its run. The timer would commit a reply into a conversation that no longer has it; both actions end the run first.

## Notes

- Replies are canned and local: nothing is sent anywhere. The share link, support address and workspace data are fictional.
- Adding a bot from the marketplace also adds it to the open conversation and opens it in the editor.

## Definition of done

At 1280 × 800 a conversation list, a conversation and a side panel fill the frame. Typing a message and pressing Enter adds a bubble, then each agent in the conversation thinks and replies in turn. Toggling an agent in the participant row removes it from the next round. The Files tab shows the workspace tree and who last edited each file; the Activity tab pauses, stops and replays the round. Renaming an agent in the editor renames it in the thread. The workspace switcher swaps the conversation list, and the marketplace adds a bot to the team.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
