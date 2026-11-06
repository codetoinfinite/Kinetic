/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Code Diff Viewer" (boardui.com/).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'code-diff-viewer',
  title: 'Code Diff Viewer',
  category: 'display',
  kit: 'boardui',
  tags: ['boardui', 'diff', 'code', 'git', 'review', 'agents'],
  blurb: 'Before / after line diff with old and new line numbers, hunk headers, a unified or split layout and folded unchanged lines.',
  cost: 'dom',
  motif: 'split',
  files: [
    {
      path: 'registry/ui/code-diff-viewer.tsx',
      type: 'registry:ui',
      role: 'CodeDiffViewer, diffLines, layoutDiff',
    },
  ],
  dependencies: ['react-aria-components@^1.22.1', '@remixicon/react@^4.9.0'],
  summary:
    'Give it the file before and after a change and it shows the difference the way a code review does: removed lines on red, added lines on green, each with its old and new line number, grouped into hunks with "@@ -a,b +c,d @@" headers. Long runs of unchanged code fold into a "Show N unchanged lines" bar; open one, or every one from the toolbar, to read the whole file. A Unified / Split switch moves between one column and old and new side by side. Long lines wrap instead of scrolling sideways.',
  mechanism: [
    'diffLines splits both texts into lines, trims the lines they share at the start and end, and fills a longest-common-subsequence table for the changed middle only. Walking the table gives unchanged, removed and added lines in order, each numbered against the old file, the new file or both. On a tie a removal goes first, so a replaced block reads "- old" then "+ new".',
    'findFolds looks at every run of unchanged lines and keeps `context` lines (3 by default) next to each change. What is left becomes a fold if it hides at least 3 lines; runs at the very top or bottom keep no context on their outer side.',
    'layoutDiff turns the closed folds into hunks: each visible stretch between closed folds gets a header with its old and new start and length, read from running line counts. A closed fold and the header of the hunk after it share one row; an opened fold keeps a slim "Hide N lines" row where it was, and the header of the surrounding hunk widens to include the lines it revealed.',
    'Fold ids are the index where their unchanged run starts, which does not depend on `context`. Opened ids are stored together with the diff they belong to, so passing new code starts folded again without an effect.',
    'The fold button keeps the same React key whether open or closed, so keyboard focus stays on it after you press it.',
    'Split view pairs the rows of a change: the n-th removal sits beside the n-th addition, and a side with nothing to pair shows an empty grey cell. Unchanged lines show on both sides with their own numbers.',
    'The table uses fixed layout with set gutter widths, so code cells wrap long lines (overflow-wrap anywhere) instead of widening the table. Below 28rem the gutters narrow, and below 32rem the folder part of the path hides.',
  ],
  constants: [
    { name: 'context', value: '3 lines', why: 'The same amount git shows by default; enough to see which block a change sits in.' },
    { name: 'MIN_HIDDEN', value: '3 lines', why: 'Folding one or two lines behind a bar that takes a row itself saves nothing.' },
    { name: 'gutter width', value: '2.75rem (2rem under 28rem)', why: 'Room for four-digit line numbers at caption size; narrower on phones so code keeps most of the width.' },
    { name: 'line tones', value: 'notification success / error background tokens', why: 'The same soft lime and rose fills as the Changes Diff Panel, readable in both themes.' },
  ],
  pitfalls: [
    'The line diff fills an old × new table for the changed middle, so it is meant for source files up to a few thousand lines. For whole generated files or huge diffs, compute the diff on a server or in a worker.',
    'Lines are compared exactly: a change in indentation or line endings counts as a change. Normalise "\\r\\n" to "\\n" before passing text from Windows files.',
    'Code is plain text in a monospace table; add your own highlighter per line if you need token colours.',
  ],
  notes: [
    'Uses DiffCounts from Changes Diff Panel for the +/− totals in the toolbar, so both read the same.',
    'diffLines and layoutDiff are exported for building other views, such as a commit summary or a minimap of changed lines.',
    'An unchanged file still renders: the whole file sits behind one "Show N unchanged lines" bar and the totals read +0 −0.',
  ],
  apiSignature:
    'function CodeDiffViewer(props: { oldCode: string; newCode: string; fileName?: string; view?: "unified" | "split"; defaultView?: "unified" | "split"; onViewChange?: (view: "unified" | "split") => void; context?: number; className?: string }): JSX.Element',
  props: [
    { name: 'oldCode', type: 'string', description: 'The file before the change.' },
    { name: 'newCode', type: 'string', description: 'The file after the change.' },
    { name: 'fileName', type: 'string', description: 'Path shown in the toolbar and in the accessible name.' },
    { name: 'view', type: '"unified" | "split"', description: 'Controlled layout.' },
    { name: 'defaultView', type: '"unified" | "split"', default: '"unified"', description: 'Initial layout when uncontrolled.' },
    { name: 'onViewChange', type: '(view: "unified" | "split") => void', description: 'Called when the Unified / Split switch changes.' },
    { name: 'context', type: 'number', default: '3', description: 'Unchanged lines kept beside each change before the rest folds.' },
    { name: 'className', type: 'string', description: 'Classes for the viewer surface (height, width).' },
  ],
  reducedMotion:
    'Only the hover and selected colours of the layout switch and fold buttons transition, and they use motion-reduce:transition-none; folds open and close instantly in every mode.',
  cleanup: 'No timers, listeners or observers. The diff and layout are memoised React values.',
  acceptance:
    'The demo opens unified with three hunks and three "Show N unchanged lines" bars; the toolbar reads +7 −4. Pressing a bar reveals its lines and turns it into "Hide N lines" with focus still on it; "Show all lines" opens every fold and its label becomes "Fold unchanged". Split puts each removed line beside its replacement with old numbers on the left and new on the right. At 360px wide lines wrap and nothing scrolls sideways.',
  criticalRegion: 'critical',
};

export default meta;
