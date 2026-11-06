# Build: Agent Chat

The chat starter's home screen: the dashboard sidebar, a rounded chat card with an overlaid header, a streaming transcript and a pill composer, and a 260px rail of past chats. Messages go through the AI SDK's `useChat` to `/api/chat`, or to a scripted `DemoTransport` when the runtime has no key or `offline` is set. Assistant replies soften in a paragraph at a time, and threads are kept in localStorage, so history survives a reload without a database.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A full AI chat screen on the AI SDK: sidebar, a chat card whose replies blur in line by line, and a local thread history rail.

- Category: block
- Runtime cost: dom
- Dependencies: @ai-sdk/react@^4.0.166, @remixicon/react@^4.9.0, ai@^7.0.162, motion@^12.43.0

## How it works

1. A single transport is created in a `useState` initializer so its identity never changes: `new SwitchingTransport(new DefaultChatTransport({ api: "/api/chat" }), new DemoTransport())`. `useChat({ transport })` drives `messages`, `status`, `sendMessage`, `stop` and `setMessages`. `submit` trims the input, stamps `activeUpdatedAt` with `Date.now()` and calls `sendMessage({ text }, { body: { demo: demoActive } })`. `SwitchingTransport.sendMessages` reads `body.demo` and hands the call to the canned transport when it is true, otherwise to the live one; `reconnectToStream` always goes live.
2. On mount the screen probes the runtime with `fetch("/api/chat", { method: "GET" })`. Only an explicit `configured: false` marks it "unconfigured"; a failed or unreadable probe counts as "ready" so a network fault never hides the composer. The probe's `providerLabel` and `model` feed the composer's status row. With no key, no messages and no demo flag, `SetupNotice` replaces the transcript with the AI_API_KEY steps and a "Skip, show me the demo" button that sets `demo` and stores `"on"` under `kinetic:agent-chat-demo`. `offline` skips the probe entirely and forces `demoActive`, so nothing touches the network.
3. `DemoTransport.sendMessages` picks a reply with `pickDemoAnswer` (five regex-matched answers and a fallback) and returns a `ReadableStream<UIMessageChunk>`. It enqueues `start` and `start-step`, waits 700ms, sends `text-start`, splits the reply with `/(?<=\s)/` so each word keeps its trailing space, and enqueues one `text-delta` every 28ms before `text-end`, `finish-step` and `finish`. The waits listen to the `AbortSignal`, so `stop()` clears the pending timer and the stream ends with an `abort` chunk.
4. `busy` is `status === "submitted" || status === "streaming"`. `AgentThinking variant="wave"` shows while `busy` and the last assistant message has no text yet, rather than only while `submitted`, because reasoning models flip the status to `streaming` on their first non-text chunk.
5. `AgentMessage` renders the user turn as a right-aligned `max-w-[75%] rounded-2xl` bubble. The assistant turn goes through `StreamedText`, which splits on `"\n"` and renders each line as a memoised `motion.p` that animates once from `{ opacity: 0, filter: "blur(5px)", y: 4 }` to `{ opacity: 1, filter: "blur(0px)", y: 0 }` over 0.42s with ease `[0.22, 0.61, 0.36, 1]`. Lines are keyed by index, so a line mounts once and then only grows. Copy, read-aloud (`speechSynthesis`) and a relative timestamp sit under the reply and stay hidden while it streams.
6. Threads live in component state and localStorage under `kinetic:agent-chat-threads`. A mount effect assigns a fresh thread id (`crypto.randomUUID()` with a fallback) and restores up to 30 stored threads. The open thread is derived with `useMemo` (its title is the first user message cut at 48 characters plus "..."), merged into the list and sorted by `updatedAt`. The list is written back only once `restored` is true and the stream is idle. `messageAt` records when each message id first appeared, for the hover timestamps.
7. The header is `absolute` and 48px tall (`h-12`) over the scroll area, and the column starts at `pt-[72px]`. A `ResizeObserver` on the scroller checks whether `title.right + 16 > column.left`. Only when the transcript is scrolled and the title would clash does the header show its border and frost to `bg-white/20 backdrop-blur-[20px]` (`dark:bg-black/20`). Each change to `messages` or `busy` scrolls the transcript to `scrollHeight` with `behavior: "smooth"`.
8. The root is `flex gap-4 p-3 bg-background-full`, `h-dvh` by default or `h-[var(--template-preview-height)]` when `contained`. `DashboardSidebar` with `starterNav(useStarterBase())` is `hidden lg:flex`; below `lg` a menu button opens it as an overlay drawer (`absolute` when contained, else `fixed`). `AgentChatHistory` is a 260px card, `hidden xl:flex`, with "New chat", rename, mark-unread and delete on each row, an account menu and a JSON export.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `THINK_MS / WORD_MS = 700ms, then 28ms per word`
  The demo stream pauses long enough for the thinking indicator to read as a real wait, then releases whole words on a steady tick so the line-level blur-in looks like a live model rather than a paste.
- `LINE_TRANSITION = { duration: 0.42, ease: [0.22, 0.61, 0.36, 1] }, from blur(5px), opacity 0, y 4`
  Animating once per line instead of per token avoids the stutter of a fragment blurring in and then mutating into a finished word. The objects sit at module scope so Motion gets a stable target on every token re-render.
- `MAX_THREADS = 30`
  Enough history to be useful without letting localStorage grow unbounded. `orderThreads` sorts newest first and slices to this count on every merge.
- `header and column offset = header h-12 (48px) absolute, column pt-[72px]`
  The header overlays the transcript instead of stacking above it, so text runs up to the card's rounded top. The 72px top padding (48px header plus 24px) clears the title when nothing is scrolled.
- `clash buffer = 16px (title.right + 16 > column.left)`
  On a wide screen the centred column never reaches a short title, so the border and frost only appear when the measured geometry says the text would actually run under the title.
- `title cut = 48 characters plus "..."`
  A derived title has to fit the header and a 260px rail row. Renaming sets `activeTitle`, so the derived title cannot overwrite a chosen name.
- `composer pill = h-[52px] rounded-full p-2 gap-2.5, 36px (size-9) controls`
  Matches the Pro composer's geometry, so 8px padding seats the 36px circles flush inside a 52px pill and the starter reads as the same product.
- `feedback reset = 1600ms`
  How long the share and copy buttons show their check before reverting. Both timers are cleared if the state changes or the button unmounts.

## API

```ts
function AgentChat({ className, contained = false, offline = false }: { className?: string; contained?: boolean; offline?: boolean })
class DemoTransport implements ChatTransport<UIMessage>
class SwitchingTransport implements ChatTransport<UIMessage> { constructor(live: ChatTransport<UIMessage>, canned: ChatTransport<UIMessage>) }
function pickDemoAnswer(prompt: string): string
```

- `className: string`
  Merged onto the root with tailwind-merge. Pass `h-full` to fill a host instead of the viewport.
- `contained: boolean` — default `false`
  Fill `--template-preview-height` instead of `h-dvh`, and keep the phone nav drawer `absolute` inside the frame.
- `offline: boolean` — default `false`
  Skip the `/api/chat` probe and answer every message from the scripted `DemoTransport`. No network requests.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
// Demo mode: the visitor skipped the key notice. Only meaningful while the
// runtime reports no key; the moment a key exists, the real route answers.
const [demo, setDemo] = useState(false);
const demoActive = offline || (demo && probe.status === "unconfigured");
const [transport] = useState(
  () => new SwitchingTransport(new DefaultChatTransport({ api: ENDPOINT }), new DemoTransport()),
);
useEffect(() => {
  try {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring from localStorage after mount; there is no render-time source for it
    setDemo(window.localStorage.getItem(DEMO_KEY) === "on");
  } catch {
    // Storage can be blocked; the notice simply shows again.
  }
}, []);
const enterDemo = () => {
  setDemo(true);
  try {
    window.localStorage.setItem(DEMO_KEY, "on");
  } catch {
    // Nothing to remember without storage.
  }
};

const { messages, sendMessage, setMessages, status, stop, error } = useChat({
  transport,
});

const busy = status === "submitted" || status === "streaming";

// Reasoning models stream their thinking before any text, and the SDK flips
// status to "streaming" on that first non-text chunk. Gating the indicator on
// "submitted" alone therefore hides it seconds before a word appears, leaving
// an empty transcript. It stays up until real text exists.
const streamedText = useMemo(() => {
  const last = messages[messages.length - 1];
  if (!last || last.role !== "assistant") return "";
  return last.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}, [messages]);
const showThinking = busy && streamedText.length === 0;

/** The open chat as plain text, for the share control. */
const transcript = useMemo(
  () =>
    messages
      .map((message) => `${message.role === "user" ? "You" : "Assistant"}: ${messageText(message)}`)
      .filter((line) => !line.endsWith(": "))
      .join("\n\n"),
  [messages],
);

// Ask the runtime what it has before the first message, so a deployment with
// no key renders setup steps instead of letting someone type into a dead box.
useEffect(() => {
  if (offline) return;
  let cancelled = false;
  fetch(ENDPOINT, { method: "GET" })
    .then((res) => (res.ok ? res.json() : null))
    .then((data: { configured?: boolean; provider?: string; providerLabel?: string; model?: string } | null) => {
      if (cancelled) return;
      // Only an explicit `configured: false` means "no key". A failed or
      // unreadable probe says nothing about the key, and treating it as
      // missing would hide the composer behind setup steps for a fault that
      // has nothing to do with configuration.
      setProbe({
        status: data && data.configured === false ? "unconfigured" : "ready",
        provider: data?.provider ?? null,
        label: data?.providerLabel ?? null,
        model: data?.model ?? null,
      });
    })
    .catch(() => {
      // A failed probe shouldn't lock the composer — let the send attempt
      // surface the real error rather than guessing the cause here.
      if (!cancelled) setProbe({ status: "ready", provider: null, label: null, model: null });
    });
  return () => {
    cancelled = true;
  };
}, [offline]);
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The probe effect sets a `cancelled` flag so a late response never sets state. The header `ResizeObserver` is disconnected. The 1600ms copy and share timers are cleared, and `speechSynthesis.cancel()` runs when a message unmounts. Calling `stop()` aborts the demo stream's pending wait. The export blob URL is revoked a tick after the download starts, and the React Aria menus remove their portals when they close.

**Reduced motion.** Under `prefers-reduced-motion: reduce`, `StreamedText` passes `initial={false}`, so each line appears settled with no blur, fade or rise. `AgentThinking` falls back to static rendering on its own. The smooth auto-scroll to the newest message is not gated.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Generating the thread id during render. It would differ between server and client and break hydration, which is why `activeId` starts as "" and the mount effect assigns it.
- Persisting before the restore has run. On the first render `threads` is empty, and writing that would erase stored history on every load. The writer waits for `restored` and for the stream to go idle.
- Constructing the transport inline. A new `SwitchingTransport` per render hands `useChat` a new transport each time. Keep it in a `useState` initializer.
- Treating a failed probe as "no key". Only an explicit `configured: false` shows the setup notice. Anything else lets the send attempt surface the real error.
- Gating the thinking indicator on `status === "submitted"` alone. Reasoning models switch to `streaming` before any text arrives, which leaves an empty transcript for seconds.
- Animating each word of the reply. Tokens arrive as fragments and the blur-in plays on a fragment that then changes, which reads as a stutter. Animate whole lines and memoise them.
- Revoking the export blob URL in the same turn as `click()`. The browser may not have read it yet; the URL is revoked on a `setTimeout(..., 0)`.

## Notes

- The route handlers live in `registry/lib/agent-chat-route.ts` and no file of this item imports them. A host must re-export them from `app/api/chat/route.ts` and declare `export const maxDuration = 30` there, because Next reads route config only from the route file.
- `offline` is a Kinetic addition for previews. It skips the GET probe and routes every send to `DemoTransport`, so the status row reads "Demo mode" and the empty state says the answers are scripted.
- Sidebar links come from `starterNav(useStarterBase())` in `app-shell`. Wrap the screen in `StarterBaseContext.Provider value={STARTER_SITE_PREFIX}` to point them into the hosted starter.
- Every subcomponent returns its JSX through `useTemplateCopy()`, which is the identity without a `TemplateCopyProvider`.

## Definition of done

The screen shows the sidebar, a chat card reading "What can I help with?" with three suggestion chips, and the history rail. Clicking "Explain what this starter does" adds a right-aligned user bubble, shows the wave "Thinking" indicator for about 700ms, then streams a scripted reply word by word with each paragraph blurring in. The header title becomes the prompt, the composer row reads "Demo mode" and "2 messages", and the thread appears under "Recent" in the rail.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
