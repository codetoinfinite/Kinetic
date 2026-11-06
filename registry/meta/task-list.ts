/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Task List" (boardui.com/components/task-list).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'task-list',
  title: 'Task List',
  category: 'display',
  kit: 'boardui',
  tags: ['agent', 'log', 'tasks', 'streaming', 'ai', 'boardui'],
  blurb:
    'A streaming agent log: task headers and their steps blur in one unit at a time down a curved guide, then each task settles and folds.',
  cost: 'dom',
  motif: 'trail',
  files: [{ path: 'registry/ui/task-list.tsx', type: 'registry:ui', role: 'component' }],
  dependencies: ['motion@^12.43.0', '@remixicon/react@^4.9.0'],
  summary:
    'Renders what an agent did as a list of tasks, each a clickable header with a nested list of steps that can carry file chips. Every header and every step is one reveal unit paced by the Agent Log ticker, so the log grows row by row with a blur-in and a curved tree guide. A running task shimmers its title; once its last step lands it switches to doneTitle and, with collapseOnComplete, folds away while the header stays clickable.',
  mechanism: [
    'countTaskUnits sums 1 + steps.length per task; useRevealTicker from agent-log returns how many units have landed, from its own timer (startDelay, then stepInterval) or from the controlled revealed prop.',
    'One pass over the tasks hands each its slice: the header is visible once revealed passes its start offset, shown = clamp(revealed - start - 1, 0, steps.length) steps are rendered, and done means all of its units are in.',
    'Headers mount as motion.li with the shared UNIT_INITIAL/UNIT_ANIMATE blur-and-height reveal; steps are agent-log LogRow items, each drawing its own curved branch, and a GuideBridge drops 6px from the 16px header glyph to the trunk at ms-2.',
    'Open state is overrides[id] ?? !autoClosed, where autoClosed is done (collapseOnComplete true) or the whole run being complete ("all"); the region collapses with a grid-template-rows 1fr to 0fr transition and is inert while closed.',
    'Until the last unit lands a WorkingRow (Agent Thinking stars plus elapsed timer) sits at the tail; onComplete fires once through the ticker when revealed reaches the total.',
  ],
  constants: [
    { name: 'startDelay', value: '320ms', why: 'Keeps the first row from landing on the same frame as the user turn that started the run.' },
    { name: 'stepInterval', value: '850ms (demo 700ms)', why: 'One unit per beat reads as work happening; faster reads as a list being printed.' },
    { name: 'GuideBridge height', value: '6px', why: 'Header row is 28px (20px line + 4px padding each side) and the 16px glyph ends at 22px, so 6px joins it to the nested trunk.' },
    { name: 'collapse transition', value: '300ms ease-out', why: 'Folding a task should finish before the next unit lands at 700-850ms intervals.' },
  ],
  pitfalls: [
    'Key the list on the turn: changing tasks in place keeps the revealed count, so a fresh run needs a new key.',
    'Appending tasks to a finished list resumes the ticker and fires onComplete again when the new units land.',
    'Give every task a stable id; open overrides are stored by id.',
  ],
  notes: [
    'Chip icons are ReactNodes sized to 14px by the chip; colour them with theme tokens.',
    'Pass working={false} to drop the tail indicator, or a string to relabel it.',
  ],
  apiSignature:
    '<TaskList key={turnId} tasks={tasks} startDelay={320} stepInterval={850} collapseOnComplete onComplete={() => setPhase("answered")} />',
  props: [
    { name: 'tasks', type: 'readonly TaskItem[]', description: 'Tasks with id, title, optional doneTitle and icon, and steps ({ label, chips? }).' },
    { name: 'run', type: 'boolean', default: 'true', description: 'Pauses and resumes the internal ticker.' },
    { name: 'startDelay', type: 'number', default: '320', description: 'Milliseconds before the first unit lands.' },
    { name: 'stepInterval', type: 'number', default: '850', description: 'Milliseconds between units.' },
    { name: 'revealed', type: 'number', description: 'Units landed, when driven from real events; disables the timer.' },
    { name: 'collapseOnComplete', type: 'boolean | "all"', default: 'false', description: 'Fold each task when its steps land, or all tasks when the run completes.' },
    { name: 'working', type: 'string | false', default: '"Working"', description: 'Tail indicator label while running; false hides it.' },
    { name: 'onComplete', type: '() => void', description: 'Fires once when the final unit lands.' },
    { name: 'aria-label', type: 'string', default: '"Agent tasks"', description: 'Accessible name of the log.' },
    { name: 'className', type: 'string', description: 'Classes on the root.' },
  ],
  reducedMotion:
    'Rows and headers appear without the blur, lift or height animation, the guide is drawn immediately, the title shimmer and star twinkle stop, and folding happens instantly. Units still arrive on the same schedule.',
  cleanup:
    'The ticker clears its pending timeout whenever revealed, run or pacing changes and on unmount; the Working row timer interval is cleared on unmount. No other listeners are attached.',
  acceptance:
    'The log starts with "Searching project files" shimmering and its steps landing one by one with file chips; when the fourth step lands the title reads "Found project files" and the task folds; after the last task the Working row disappears and onComplete shows the reply. Clicking a folded header sets aria-expanded to true and shows its steps; Add task appends a follow-up that streams in; Replay restarts from the first task.',
  criticalRegion: 'critical',
};

export default meta;
