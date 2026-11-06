/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Agent Detail Panel" (boardui.com/components/multi-agent-chat).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'agent-detail-panel',
  title: 'Agent Detail Panel',
  category: 'display',
  kit: 'boardui',
  tags: ['boardui', 'agents', 'panel', 'steps', 'status'],
  blurb: 'Selected-agent panel: status pill, task, progress, step log and Pause / Resume / Stop actions that change the run state.',
  cost: 'dom',
  motif: 'stack',
  files: [
    {
      path: 'registry/ui/agent-detail-panel.tsx',
      type: 'registry:ui',
      role: 'AgentDetailPanel, useAgentRunStatus, stepLook, AGENT_RUN_STATUS_META',
    },
  ],
  dependencies: ['@remixicon/react@^4.9.0'],
  summary:
    'The side panel of a multi-agent workspace for the agent you picked: avatar and name, a live status pill, the task it is working on, a progress rail with "n of m" steps, optional stat tiles and a vertical step log. The footer drives the run: Pause turns into Resume, Stop asks for confirmation, and a finished, failed or stopped run offers Run again. The step log re-reads itself from the run status, so a paused run shows a paused step and a stopped run strikes out what will never happen.',
  mechanism: [
    'useAgentRunStatus keeps the run status controlled (status) or uncontrolled (defaultStatus) and returns a dispatcher: pause → paused, resume and restart → running, stop → stopped; every change calls onStatusChange(next, action), and restart also calls onRestart so the owner can reset its steps.',
    'stepLook(stepState, runStatus) folds the run status into each step: the active step renders a spinner while running, a pause chip when paused, a question chip when waiting, a stop chip when stopped and an error chip when failed; pending steps become "Skipped" (struck through, detail hidden) once the run is stopped or failed.',
    'The progress rail is the kit ProgressTrack at doneCount / steps.length, recoloured through its text colour: accent while running, orange paused, neutral stopped, red failed, green done.',
    'The footer swaps between three layouts: Pause or Resume plus Stop while live, an inline "Stop this run?" group with Keep running / Stop run when confirmStop is on, and a status line with Run again once the run is terminal.',
    'When the active step id changes and followActive is on, an effect measures that row inside the scrolling body (offsetTop against the relative body) and, only if it is out of view, scrolls the body so its bottom sits 16px above the fold; the page itself never scrolls.',
    'The status pill has role="status" so the new label ("Paused", "Stopped") is announced; every step carries an sr-only state word next to its title.',
  ],
  constants: [
    { name: 'step chip', value: '20px circle, 12px icon', why: 'Wide enough for the 16px kit spinner glyph so the working step does not shift when it turns into a check.' },
    { name: 'connector', value: '1px at start-2.5, from top-6 to bottom-1', why: 'Centres the rail under the 20px chip and leaves a gap above the next chip.' },
    { name: 'follow margin', value: '16px', why: 'Leaves a sliver of the next pending step visible under the live one, so the log reads as continuing.' },
    { name: 'stats grid', value: '3 columns', why: 'Three short metrics (elapsed, files, tokens) fit a 360px-wide panel without wrapping.' },
  ],
  pitfalls: [
    'Do not mutate steps when the run stops: the panel derives Stopped and Skipped from the run status, and the owner keeps the real step states for a later resume.',
    'Restart only resets the status; reset your steps in onRestart or the log still shows the old run as finished.',
    'In controlled mode the panel never changes its own status: update status from onStatusChange or the buttons appear dead.',
  ],
  notes: [
    'Pass onClose to show a close button in the header; pass avatar to replace the seeded monogram (for example with a blob avatar).',
    'Set the panel height through className; the body scrolls while the header and footer stay put.',
    'The panel is a size container: below 22rem wide the status pill collapses to its coloured dot and keeps the label for screen readers, so the name has room.',
  ],
  apiSignature:
    'function AgentDetailPanel(props: { name: string; subtitle?: string; avatar?: ReactNode; task?: ReactNode; steps: AgentStep[]; stats?: AgentDetailStat[]; status?: AgentRunStatus; defaultStatus?: AgentRunStatus; onStatusChange?: (status: AgentRunStatus, action: AgentRunAction) => void; onRestart?: () => void; onClose?: () => void; confirmStop?: boolean; followActive?: boolean; className?: string }): JSX.Element',
  props: [
    { name: 'name', type: 'string', description: 'Agent name in the header.' },
    { name: 'subtitle', type: 'string', description: 'Role or label under the name.' },
    { name: 'avatar', type: 'ReactNode', description: '40px avatar; defaults to a seeded monogram.' },
    { name: 'task', type: 'ReactNode', description: 'The instruction the agent is working on.' },
    { name: 'steps', type: 'AgentStep[]', description: '{ id, title, detail?, time?, state: "done" | "active" | "pending" | "failed" }.' },
    { name: 'stats', type: '{ label: string; value: ReactNode }[]', description: 'Optional stat tiles under the progress rail.' },
    { name: 'status', type: '"running" | "waiting" | "paused" | "done" | "stopped" | "error"', description: 'Controlled run status.' },
    { name: 'defaultStatus', type: 'AgentRunStatus', default: '"running"', description: 'Initial status when uncontrolled.' },
    { name: 'onStatusChange', type: '(status, action: "pause" | "resume" | "stop" | "restart") => void', description: 'Called by every footer action.' },
    { name: 'onRestart', type: '() => void', description: 'Shows Run again on terminal runs; reset your steps here.' },
    { name: 'onClose', type: '() => void', description: 'Shows the header close button.' },
    { name: 'confirmStop', type: 'boolean', default: 'true', description: 'Ask before stopping.' },
    { name: 'followActive', type: 'boolean', default: 'true', description: 'Scroll the panel body to keep the active step in view.' },
    { name: 'className', type: 'string', description: 'Classes for the panel surface (width, height).' },
  ],
  reducedMotion:
    'The running ping on the status dot is hidden, colour and confirm-row transitions use motion-reduce:transition-none, and the kit spinner slows to a 2.4s turn instead of stopping, and following the active step jumps (behavior auto) instead of smooth-scrolling; state changes are instant.',
  cleanup: 'The panel owns no timers or listeners; the demo clears its step-advance interval whenever the run leaves running and on unmount.',
  acceptance:
    'With a running run, Pause sets the pill to "Paused" and shows Resume; Resume returns to "Running"; Stop shows "Stop this run?" and Stop run sets "Stopped", turns pending steps into "Skipped" and shows Run again, which calls onRestart and sets "Running"; the "n of m" count equals the done steps.',
  criticalRegion: 'critical',
};

export default meta;
