/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Multi Agent Chat" (boardui.com/components/multi-agent-chat).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'multi-agent-chat',
  title: 'Multi Agent Chat',
  category: 'block',
  kit: 'boardui',
  tags: ['template', 'ai', 'agent', 'multi-agent', 'chat', 'composer', 'workspace', 'boardui'],
  blurb:
    'A group chat with a team of agents who reply in turn, plus a workspace switcher and a panel to edit agents and browse files.',
  cost: 'dom',
  motif: 'split',

  files: [
    { path: 'registry/ui/multi-agent-chat.tsx', type: 'registry:ui', role: 'page: all state, the turn-taking reply engine, sidebar wiring, marketplace, support and settings modals' },
    { path: 'registry/ui/multi-agent-chat-conversation.tsx', type: 'registry:ui', role: 'conversation header with rename, share and options, message list with live reply, participant row and composer' },
    { path: 'registry/ui/multi-agent-chat-side.tsx', type: 'registry:ui', role: 'side panel tabs: agent editor and creator, workspace file tree with owners, reply activity' },
    { path: 'registry/ui/multi-agent-chat-data.tsx', type: 'registry:ui', role: 'types, seed agents, workspaces, conversations, files and plugins, the simulated replies and shared icon button and avatar cluster' },
  ],
  dependencies: ['@remixicon/react@^4.9.0', 'react-aria-components@^1.22.1'],

  summary:
    'A full multi-agent chat for a 1280 × 800 frame. The left card lists conversations with stacked agent avatars, a marketplace button, support, settings and a workspace switcher. The middle pane is the open conversation: send one message and every agent in it answers in turn, each thinking for a moment before its reply streams in. The right panel edits any agent with the full agent creator, creates new ones, browses the workspace file tree with who last touched each file, and shows the progress of the current round of replies.',

  mechanism: [
    'All state lives in `MultiAgentChat`: agents, conversations, workspaces, the open conversation, the single active run, the last run per conversation, the side panel tab and the open modal. The conversation view and side panel are controlled components in their own files.',
    'A run is `{ queue, index, phase, full, shown, paused }`. One effect keyed on the run arms one timeout: thinking waits on the agent\'s model (500, 900 or 1600ms, scaled by the composer model), streaming appends a chunk every 24ms scaled by the agent\'s speed, and a finished reply holds 380ms, is committed to the conversation and hands the turn to the next agent. Cleanup clears that timeout, so Stop, Pause, deleting the chat or unmounting never leaves a callback.',
    'The run lives in the page, not the conversation, so it keeps going while another conversation is open. That conversation\'s list row says who is replying and collects unread replies, and other composers stay disabled until the round ends.',
    'Each reply is written by `replyFor` from the agent\'s role label, the prompt and a counter, so the same agent answers differently on each turn. Plan mode in the composer makes every agent say it changed nothing.',
    'The participant row above the composer toggles agents in and out of the open conversation; the next round only queues the agents still in it. Clicking an agent avatar in the thread, or a file owner in the Files tab, opens that agent in the editor.',
    'Edits in the agent editor update the agent everywhere at once, because messages store only the agent id. The editor snapshots the agent on open and remounts after Save so its Reset returns to the saved version.',
    'The Activity tab drives the run through `AgentDetailPanel`: Pause holds the current timer off, Resume re-arms it, Stop keeps the partial reply, and Run again replays the last prompt with the same agents.',
  ],

  constants: [
    { name: 'THINK_MS', value: 'swift 500ms, balanced 900ms, deep 1600ms', why: 'Deeper models visibly think longer, so a mixed team answers at different rhythms instead of in lockstep.' },
    { name: 'MODEL_PACE', value: 'Swift 2 Mini 0.5, Swift 2 1, Deep 1 1.6', why: 'The composer\'s model choice scales every agent\'s thinking so it has a felt effect.' },
    { name: 'stream tick', value: '3 characters every 24ms times the agent speed', why: 'About 125 characters a second at speed 1; a three-agent round finishes in under ten seconds.' },
    { name: 'HAND_OFF_MS', value: '380ms', why: 'A short beat on each finished reply makes the change of speaker readable.' },
    { name: 'side panel width', value: '356px', why: 'Fits the agent creator\'s pickers while leaving about 600px for the conversation next to the 272px list.' },
  ],

  pitfalls: [
    'Running replies inside the conversation component. Switching conversations would unmount it and drop the round; the page owns the run and passes the live reply only to the conversation it belongs to.',
    'Storing agent names or colours on messages. Renaming an agent would leave old messages stale; messages keep the agent id and look the agent up at render.',
    'Passing the live agent as the creator\'s default. Its Reset would revert to whatever was typed last; snapshot on open and remount on Save.',
    'Letting a deleted or cleared conversation keep its run. The timer would commit a reply into a conversation that no longer has it; both actions end the run first.',
  ],

  notes: [
    'Replies are canned and local: nothing is sent anywhere. The share link, support address and workspace data are fictional.',
    'Adding a bot from the marketplace also adds it to the open conversation and opens it in the editor.',
  ],

  apiSignature:
    'function MultiAgentChat(props: MultiAgentChatProps): JSX.Element\ninterface MultiAgentChatProps { agents?: MacAgent[]; conversations?: MacConversation[]; workspaces?: Workspace[]; defaultWorkspaceId?: string; defaultConversationId?: string; className?: string }',

  props: [
    { name: 'agents', type: 'MacAgent[]', default: 'MAC_AGENTS', description: 'The team: each agent is an AgentDraft with an id.' },
    { name: 'conversations', type: 'MacConversation[]', default: 'MAC_CONVERSATIONS', description: 'Seed conversations; each names its workspace, its agents and its messages.' },
    { name: 'workspaces', type: 'Workspace[]', default: 'MAC_WORKSPACES', description: 'Workspaces offered by the switcher.' },
    { name: 'defaultWorkspaceId', type: 'string', default: '"board"', description: 'Workspace selected on first render.' },
    { name: 'defaultConversationId', type: 'string', default: '"group"', description: 'Conversation open on first render.' },
    { name: 'className', type: 'string', description: 'Merged onto the root, which is h-full w-full.' },
  ],

  reducedMotion:
    'Under reduced motion each reply appears whole once its agent has thought, avatars stop floating and blinking, the thinking label drops its shimmer, and hover transitions use motion-reduce:transition-none. Turn-taking and its timing stay so the order of speakers is still readable.',

  cleanup:
    'The single run timeout is cleared on every run change, on pause and on unmount. The share and support copied-state timers clear on unmount.',

  acceptance:
    'At 1280 × 800 a conversation list, a conversation and a side panel fill the frame. Typing a message and pressing Enter adds a bubble, then each agent in the conversation thinks and replies in turn. Toggling an agent in the participant row removes it from the next round. The Files tab shows the workspace tree and who last edited each file; the Activity tab pauses, stops and replays the round. Renaming an agent in the editor renames it in the thread. The workspace switcher swaps the conversation list, and the marketplace adds a bot to the team.',

  criticalRegion: 'critical',
};

export default meta;
