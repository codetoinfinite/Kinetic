import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'agent-chat',
  title: 'Agent Chat',
  category: 'block',
  kit: 'boardui',
  tags: ['chat', 'ai', 'streaming', 'ai-sdk', 'composer', 'history', 'starter', 'boardui'],
  blurb:
    'A full AI chat screen on the AI SDK: sidebar, a chat card whose replies blur in line by line, and a local thread history rail.',
  cost: 'dom',
  motif: 'stack',

  files: [
    { path: 'registry/ui/agent-chat.tsx', type: 'registry:ui', role: 'component' },
    { path: 'registry/ui/agent-chat-actions.tsx', type: 'registry:ui', role: 'share button and chat menu' },
    { path: 'registry/ui/agent-chat-history.tsx', type: 'registry:ui', role: 'thread history rail' },
    { path: 'registry/ui/agent-chat-message.tsx', type: 'registry:ui', role: 'message bubble and streamed text' },
    { path: 'registry/ui/agent-composer.tsx', type: 'registry:ui', role: 'composer pill and status row' },
    { path: 'registry/ui/agent-chat-demo-answers.ts', type: 'registry:ui', role: 'scripted demo replies' },
    { path: 'registry/ui/agent-chat-demo-transport.ts', type: 'registry:ui', role: 'offline and switching transports' },
  ],
  dependencies: ['@ai-sdk/react@^4.0.166', '@remixicon/react@^4.9.0', 'ai@^7.0.162', 'motion@^12.43.0'],

  summary:
    'The chat starter\'s home screen: the dashboard sidebar, a rounded chat card with an overlaid header, a streaming transcript and a pill composer, and a 260px rail of past chats. Messages go through the AI SDK\'s `useChat` to `/api/chat`, or to a scripted `DemoTransport` when the runtime has no key or `offline` is set. Assistant replies soften in a paragraph at a time, and threads are kept in localStorage, so history survives a reload without a database.',

  mechanism: [
    'A single transport is created in a `useState` initializer so its identity never changes: `new SwitchingTransport(new DefaultChatTransport({ api: "/api/chat" }), new DemoTransport())`. `useChat({ transport })` drives `messages`, `status`, `sendMessage`, `stop` and `setMessages`. `submit` trims the input, stamps `activeUpdatedAt` with `Date.now()` and calls `sendMessage({ text }, { body: { demo: demoActive } })`. `SwitchingTransport.sendMessages` reads `body.demo` and hands the call to the canned transport when it is true, otherwise to the live one; `reconnectToStream` always goes live.',
    'On mount the screen probes the runtime with `fetch("/api/chat", { method: "GET" })`. Only an explicit `configured: false` marks it "unconfigured"; a failed or unreadable probe counts as "ready" so a network fault never hides the composer. The probe\'s `providerLabel` and `model` feed the composer\'s status row. With no key, no messages and no demo flag, `SetupNotice` replaces the transcript with the AI_API_KEY steps and a "Skip, show me the demo" button that sets `demo` and stores `"on"` under `kinetic:agent-chat-demo`. `offline` skips the probe entirely and forces `demoActive`, so nothing touches the network.',
    '`DemoTransport.sendMessages` picks a reply with `pickDemoAnswer` (five regex-matched answers and a fallback) and returns a `ReadableStream<UIMessageChunk>`. It enqueues `start` and `start-step`, waits 700ms, sends `text-start`, splits the reply with `/(?<=\\s)/` so each word keeps its trailing space, and enqueues one `text-delta` every 28ms before `text-end`, `finish-step` and `finish`. The waits listen to the `AbortSignal`, so `stop()` clears the pending timer and the stream ends with an `abort` chunk.',
    '`busy` is `status === "submitted" || status === "streaming"`. `AgentThinking variant="wave"` shows while `busy` and the last assistant message has no text yet, rather than only while `submitted`, because reasoning models flip the status to `streaming` on their first non-text chunk.',
    '`AgentMessage` renders the user turn as a right-aligned `max-w-[75%] rounded-2xl` bubble. The assistant turn goes through `StreamedText`, which splits on `"\\n"` and renders each line as a memoised `motion.p` that animates once from `{ opacity: 0, filter: "blur(5px)", y: 4 }` to `{ opacity: 1, filter: "blur(0px)", y: 0 }` over 0.42s with ease `[0.22, 0.61, 0.36, 1]`. Lines are keyed by index, so a line mounts once and then only grows. Copy, read-aloud (`speechSynthesis`) and a relative timestamp sit under the reply and stay hidden while it streams.',
    'Threads live in component state and localStorage under `kinetic:agent-chat-threads`. A mount effect assigns a fresh thread id (`crypto.randomUUID()` with a fallback) and restores up to 30 stored threads. The open thread is derived with `useMemo` (its title is the first user message cut at 48 characters plus "..."), merged into the list and sorted by `updatedAt`. The list is written back only once `restored` is true and the stream is idle. `messageAt` records when each message id first appeared, for the hover timestamps.',
    'The header is `absolute` and 48px tall (`h-12`) over the scroll area, and the column starts at `pt-[72px]`. A `ResizeObserver` on the scroller checks whether `title.right + 16 > column.left`. Only when the transcript is scrolled and the title would clash does the header show its border and frost to `bg-white/20 backdrop-blur-[20px]` (`dark:bg-black/20`). Each change to `messages` or `busy` scrolls the transcript to `scrollHeight` with `behavior: "smooth"`.',
    'The root is `flex gap-4 p-3 bg-background-full`, `h-dvh` by default or `h-[var(--template-preview-height)]` when `contained`. `DashboardSidebar` with `starterNav(useStarterBase())` is `hidden lg:flex`; below `lg` a menu button opens it as an overlay drawer (`absolute` when contained, else `fixed`). `AgentChatHistory` is a 260px card, `hidden xl:flex`, with "New chat", rename, mark-unread and delete on each row, an account menu and a JSON export.',
  ],

  constants: [
    {
      name: 'THINK_MS / WORD_MS',
      value: '700ms, then 28ms per word',
      why: 'The demo stream pauses long enough for the thinking indicator to read as a real wait, then releases whole words on a steady tick so the line-level blur-in looks like a live model rather than a paste.',
    },
    {
      name: 'LINE_TRANSITION',
      value: '{ duration: 0.42, ease: [0.22, 0.61, 0.36, 1] }, from blur(5px), opacity 0, y 4',
      why: 'Animating once per line instead of per token avoids the stutter of a fragment blurring in and then mutating into a finished word. The objects sit at module scope so Motion gets a stable target on every token re-render.',
    },
    {
      name: 'MAX_THREADS',
      value: '30',
      why: 'Enough history to be useful without letting localStorage grow unbounded. `orderThreads` sorts newest first and slices to this count on every merge.',
    },
    {
      name: 'header and column offset',
      value: 'header h-12 (48px) absolute, column pt-[72px]',
      why: 'The header overlays the transcript instead of stacking above it, so text runs up to the card\'s rounded top. The 72px top padding (48px header plus 24px) clears the title when nothing is scrolled.',
    },
    {
      name: 'clash buffer',
      value: '16px (title.right + 16 > column.left)',
      why: 'On a wide screen the centred column never reaches a short title, so the border and frost only appear when the measured geometry says the text would actually run under the title.',
    },
    {
      name: 'title cut',
      value: '48 characters plus "..."',
      why: 'A derived title has to fit the header and a 260px rail row. Renaming sets `activeTitle`, so the derived title cannot overwrite a chosen name.',
    },
    {
      name: 'composer pill',
      value: 'h-[52px] rounded-full p-2 gap-2.5, 36px (size-9) controls',
      why: 'Matches the Pro composer\'s geometry, so 8px padding seats the 36px circles flush inside a 52px pill and the starter reads as the same product.',
    },
    {
      name: 'feedback reset',
      value: '1600ms',
      why: 'How long the share and copy buttons show their check before reverting. Both timers are cleared if the state changes or the button unmounts.',
    },
  ],

  pitfalls: [
    'Generating the thread id during render. It would differ between server and client and break hydration, which is why `activeId` starts as "" and the mount effect assigns it.',
    'Persisting before the restore has run. On the first render `threads` is empty, and writing that would erase stored history on every load. The writer waits for `restored` and for the stream to go idle.',
    'Constructing the transport inline. A new `SwitchingTransport` per render hands `useChat` a new transport each time. Keep it in a `useState` initializer.',
    'Treating a failed probe as "no key". Only an explicit `configured: false` shows the setup notice. Anything else lets the send attempt surface the real error.',
    'Gating the thinking indicator on `status === "submitted"` alone. Reasoning models switch to `streaming` before any text arrives, which leaves an empty transcript for seconds.',
    'Animating each word of the reply. Tokens arrive as fragments and the blur-in plays on a fragment that then changes, which reads as a stutter. Animate whole lines and memoise them.',
    'Revoking the export blob URL in the same turn as `click()`. The browser may not have read it yet; the URL is revoked on a `setTimeout(..., 0)`.',
  ],

  notes: [
    'The route handlers live in `registry/lib/agent-chat-route.ts` and no file of this item imports them. A host must re-export them from `app/api/chat/route.ts` and declare `export const maxDuration = 30` there, because Next reads route config only from the route file.',
    '`offline` is a Kinetic addition for previews. It skips the GET probe and routes every send to `DemoTransport`, so the status row reads "Demo mode" and the empty state says the answers are scripted.',
    'Sidebar links come from `starterNav(useStarterBase())` in `app-shell`. Wrap the screen in `StarterBaseContext.Provider value={STARTER_SITE_PREFIX}` to point them into the hosted starter.',
    'Every subcomponent returns its JSX through `useTemplateCopy()`, which is the identity without a `TemplateCopyProvider`.',
  ],

  apiSignature:
    'function AgentChat({ className, contained = false, offline = false }: { className?: string; contained?: boolean; offline?: boolean })\nclass DemoTransport implements ChatTransport<UIMessage>\nclass SwitchingTransport implements ChatTransport<UIMessage> { constructor(live: ChatTransport<UIMessage>, canned: ChatTransport<UIMessage>) }\nfunction pickDemoAnswer(prompt: string): string',

  props: [
    { name: 'className', type: 'string', description: 'Merged onto the root with tailwind-merge. Pass `h-full` to fill a host instead of the viewport.' },
    { name: 'contained', type: 'boolean', default: 'false', description: 'Fill `--template-preview-height` instead of `h-dvh`, and keep the phone nav drawer `absolute` inside the frame.' },
    { name: 'offline', type: 'boolean', default: 'false', description: 'Skip the `/api/chat` probe and answer every message from the scripted `DemoTransport`. No network requests.' },
  ],

  reducedMotion:
    'Under `prefers-reduced-motion: reduce`, `StreamedText` passes `initial={false}`, so each line appears settled with no blur, fade or rise. `AgentThinking` falls back to static rendering on its own. The smooth auto-scroll to the newest message is not gated.',

  cleanup:
    'The probe effect sets a `cancelled` flag so a late response never sets state. The header `ResizeObserver` is disconnected. The 1600ms copy and share timers are cleared, and `speechSynthesis.cancel()` runs when a message unmounts. Calling `stop()` aborts the demo stream\'s pending wait. The export blob URL is revoked a tick after the download starts, and the React Aria menus remove their portals when they close.',

  acceptance:
    'The screen shows the sidebar, a chat card reading "What can I help with?" with three suggestion chips, and the history rail. Clicking "Explain what this starter does" adds a right-aligned user bubble, shows the wave "Thinking" indicator for about 700ms, then streams a scripted reply word by word with each paragraph blurring in. The header title becomes the prompt, the composer row reads "Demo mode" and "2 messages", and the thread appears under "Recent" in the rail.',

  criticalRegion: 'critical',
};

export default meta;
