/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "AI Chat" (boardui.com/templates/ai-chat).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'ai-chat',
  title: 'AI Chat',
  category: 'block',
  kit: 'boardui',
  tags: ['template', 'ai', 'agent', 'chat', 'composer', 'diff', 'sidebar', 'boardui'],
  blurb:
    'A coding-agent workspace: chat history sidebar, a thread with a live step checklist and streamed replies, and a changes panel with diffs.',
  cost: 'dom',
  motif: 'split',

  files: [
    { path: 'registry/ui/ai-chat.tsx', type: 'registry:ui', role: 'page: all state, the agent run timeline, Automations and Customize views, modals' },
    { path: 'registry/ui/ai-chat-sidebar.tsx', type: 'registry:ui', role: 'account menu, quick search, nav, repository folders with chats, theme and plan card' },
    { path: 'registry/ui/ai-chat-thread.tsx', type: 'registry:ui', role: 'thread header with rename, share and options, message list, run progress and composer' },
    { path: 'registry/ui/ai-chat-changes.tsx', type: 'registry:ui', role: 'changes and browser tabs, file diffs with commit form, terminal drawer' },
    { path: 'registry/ui/ai-chat-data.tsx', type: 'registry:ui', role: 'types, seed folders, chats and files, the simulated agent replies and the shared icon button' },
  ],
  dependencies: ['@remixicon/react@^4.9.0', 'react-aria-components@^1.22.1'],

  summary:
    'A full AI coding chat for a 1280 × 800 frame. The left card holds the account menu, quick search and chats grouped by repository; the middle pane is the open chat with a glowing composer and a status bar for branch, project, mode and context; the right pane lists uncommitted changes with their code. Sending a message runs a simulated agent with timers only: a step checklist ticks through, a thinking indicator counts up, then the reply streams in and the run leaves a new file in the changes panel.',

  mechanism: [
    'All state lives in `AiChat`: chats, the open chat, the view, files, terminal lines, mode, branch, project, context use and the single active run. The sidebar, thread and changes panel are controlled components in their own files.',
    'A run is `{ steps, step, phase, full, shown }`. One effect keyed on the run arms one timeout: in the working phase it advances `step` every 1300ms, holds 600ms on the finished list, then switches to streaming; in streaming it appends three characters every 24ms. Cleanup clears the timeout, so Stop, deleting the chat or unmounting never leaves a callback.',
    'The run lives in the page, not the thread, so it keeps going while another chat is open. The sidebar shows a working dot on that chat and the composer of other chats will not send until it ends.',
    '`AgentProgress` gets the parent\'s `step` as a controlled prop with no `onStepChange`, so its own clock only animates the bar between steps while the page decides when a step is done.',
    'Mode changes the run: Agent runs three steps and writes a file, Ask skips the checklist and only thinks, Plan returns a plan without touching files. Turning off "Run lint and a production build" in Customize drops the lint step and its terminal lines.',
    'The changes panel is real: selecting a file shows its tokenised code, Revert removes one file, Discard all asks first, and Commit empties the list and reports the commit. The Browser tab keeps a back and forward history over three local routes.',
  ],

  constants: [
    { name: 'STEP_MS', value: '1300ms', why: 'Long enough to read each checklist line as it completes; the reference\'s five steps take about seven seconds.' },
    { name: 'stream tick', value: '3 characters every 24ms', why: 'About 125 characters a second reads as typing without making a two-sentence reply wait long.' },
    { name: 'CONTEXT_LIMIT', value: '200,000 tokens, opening at 114,000', why: 'Opens at 57% like the reference ring and climbs with each finished run.' },
    { name: 'panel width', value: '400px, 560px when widened', why: 'At 1280px the narrow panel leaves about 600px for the chat column next to the 248px sidebar.' },
  ],

  pitfalls: [
    'Running the timeline in the thread component. Switching chats would unmount it and lose the run; the page owns it and passes it down only to the chat it belongs to.',
    'Letting `AgentProgress` advance itself while the page also advances. Two clocks drift apart; pass a controlled `step` and leave `onStepChange` unset.',
    'Sending on Enter during IME composition. The composer checks `isComposing` so confirming a Japanese or Chinese candidate does not send a half-typed message.',
  ],

  notes: [
    'The "coding scenario" chat opens mid-run with the reference\'s five steps, so the first reply streams in about eight seconds after load.',
    'Support and Upgrade are local stand-ins: Support copies an address and Upgrade switches the plan name on the sidebar card.',
  ],

  apiSignature:
    'function AiChat(props: AiChatProps): JSX.Element\ninterface AiChatProps { folders?: AiChatFolder[]; threads?: AiChatThread[]; files?: AiChatFile[]; defaultThreadId?: string; autoStart?: boolean; className?: string }',

  props: [
    { name: 'folders', type: 'AiChatFolder[]', default: 'AI_CHAT_FOLDERS', description: 'Repositories shown as folders in the sidebar.' },
    { name: 'threads', type: 'AiChatThread[]', default: 'AI_CHAT_THREADS', description: 'Seed chats; each names its folder and holds its turns.' },
    { name: 'files', type: 'AiChatFile[]', default: 'AI_CHAT_FILES', description: 'Uncommitted files listed in the changes panel at load.' },
    { name: 'defaultThreadId', type: 'string', default: '"coding"', description: 'Chat open on first render.' },
    { name: 'autoStart', type: 'boolean', default: 'true', description: 'If the opening chat ends with a user message, run the agent on it at load.' },
    { name: 'className', type: 'string', description: 'Merged onto the root, which is h-full w-full.' },
  ],

  reducedMotion:
    'Under reduced motion the reply appears at once instead of streaming, the composer glow stops pulsing, the thinking label drops its shimmer, and hover and panel-width transitions use motion-reduce:transition-none. The step checklist still advances so the run stays readable.',

  cleanup:
    'The run timeout is cleared on every run change and on unmount. The dictation timer, the share copied-state timer and the browser loading timer each clear on unmount.',

  acceptance:
    'At 1280 × 800 a sidebar, a chat and a changes panel fill the frame. The coding scenario chat ticks through five steps, then a reply streams in and a fourth file appears under Uncommitted changes. Typing a message and pressing Enter adds a bubble and starts a new run; Stop ends it. Selecting another chat, Automations or Customize switches the middle pane. The sidebar collapses to a rail, the panel hides, widens and switches to Browser.',

  criticalRegion: 'critical',
};

export default meta;
