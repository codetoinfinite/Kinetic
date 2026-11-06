/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Changes Diff Panel" (boardui.com/).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'changes-diff-panel',
  title: 'Changes Diff Panel',
  category: 'display',
  kit: 'boardui',
  tags: ['boardui', 'diff', 'git', 'review', 'agents', 'code'],
  blurb: 'Uncommitted-changes list with +/− counts, an inline diff per file and accept / reject per file or for all; totals update live.',
  cost: 'dom',
  motif: 'split',
  files: [
    {
      path: 'registry/ui/changes-diff-panel.tsx',
      type: 'registry:ui',
      role: 'ChangesDiffPanel, DiffCounts, parsePatch',
    },
  ],
  dependencies: ['react-aria-components@^1.22.1', '@remixicon/react@^4.9.0'],
  summary:
    'The review side of an agent that edits code: a header with the number of uncommitted changes and their total added and removed lines, then one row per changed file with its path, +/− counts and a New or Deleted tag. Each row opens to an inline unified diff with line numbers and green or red line backgrounds. Accept or reject a file from its row, or every pending file from the header; decided files show an Accepted or Rejected tag with an undo, and the header totals only count what is still pending.',
  mechanism: [
    'parsePatch reads each file as a unified diff body: an "@@ -a,b +c,d @@" header resets the old and new line counters, "+" lines take the next new number, "-" lines the next old number, context lines advance both, and "\\ No newline" markers are skipped. The same pass counts additions and removals, so counts never drift from the diff.',
    'Decisions are a map from path to "accepted" or "rejected"; a missing key means pending. They can be controlled (decisions + onDecisionsChange) or left to the panel (defaultDecisions). applyDecision writes one decision, or deletes it for undo, across a list of paths, so a single file and Accept all share one code path.',
    'The header derives everything from that map on each render: pending files, their summed +/− lines, and the accepted and rejected counts. When nothing is pending it switches to "All changes reviewed" and the bulk buttons disable.',
    'Rows are React Aria Disclosures inside a DisclosureGroup with allowsMultipleExpanded. The trigger button sits inside a heading and the accept / reject buttons are its siblings, so no button is nested in another.',
    'Expansion is held by the panel (defaultExpanded seeds it); with collapseOnDecide a decided file folds its diff, so the list shortens as you review.',
    'Below 28rem wide the panel hides the folder part of each path and the New / Deleted tag (the file icon still shows the status), so file names stay readable.',
    'Rejected files strike through their path and dim their diff instead of hiding it, so the reviewer can still read what was turned down and undo it.',
  ],
  constants: [
    { name: 'diff max height', value: '18rem (max-h-72)', why: 'Long files scroll inside their own box, so one big diff does not push every other file off the panel.' },
    { name: 'line tones', value: 'notification success / error background tokens', why: 'Soft lime and rose fills that keep code readable in both themes; the +/− signs and counts use the matching foreground tokens.' },
    { name: 'rejected dim', value: 'opacity 0.6', why: 'Clearly secondary while staying legible, unlike hiding the diff, which would make undo a blind action.' },
  ],
  pitfalls: [
    'Paths are the keys for decisions and expansion; two entries with the same path will share one decision.',
    'In controlled mode, update decisions from onDecisionsChange or the buttons appear dead.',
    'Pass only the diff body (hunks and lines). File headers such as "diff --git" or "+++ b/file" would be read as added lines.',
  ],
  notes: [
    'DiffCounts and parsePatch are exported for summaries elsewhere, for example a commit bar that reads "3 files, +24 −7".',
    'The status tag is optional: status "added" shows New, "deleted" shows Deleted, anything else shows only the counts.',
    'Line text is rendered as plain text in a monospace table; plug in your own highlighter if you need colours per token.',
  ],
  apiSignature:
    'function ChangesDiffPanel(props: { files: { path: string; patch: string; status?: "added" | "modified" | "deleted" }[]; decisions?: Record<string, "accepted" | "rejected">; defaultDecisions?: Record<string, "accepted" | "rejected">; onDecisionsChange?: (next, change: { paths: string[]; decision: "accepted" | "rejected" | null }) => void; defaultExpanded?: string[]; collapseOnDecide?: boolean; title?: string; className?: string }): JSX.Element',
  props: [
    { name: 'files', type: '{ path: string; patch: string; status?: "added" | "modified" | "deleted" }[]', description: 'Changed files with a unified diff body each.' },
    { name: 'decisions', type: 'Record<string, "accepted" | "rejected">', description: 'Controlled decisions keyed by path; missing means pending.' },
    { name: 'defaultDecisions', type: 'Record<string, "accepted" | "rejected">', description: 'Initial decisions when uncontrolled.' },
    { name: 'onDecisionsChange', type: '(next, change: { paths, decision }) => void', description: 'Called by every accept, reject and undo, single or bulk.' },
    { name: 'defaultExpanded', type: 'string[]', default: '[]', description: 'Paths whose diff starts open.' },
    { name: 'collapseOnDecide', type: 'boolean', default: 'true', description: 'Fold a file once it is accepted or rejected.' },
    { name: 'title', type: 'string', default: '"Changes"', description: 'Accessible name of the panel.' },
    { name: 'className', type: 'string', description: 'Classes for the panel surface (height, width).' },
  ],
  reducedMotion:
    'Only the chevron turn, row hover and the rejected dim fade animate, and all use motion-reduce:transition-none; diffs open and close instantly in every mode.',
  cleanup: 'No timers, listeners or observers; all state is plain React state.',
  acceptance:
    'With five pending files the header reads "5 uncommitted changes" with the summed +/− lines; accepting one file drops it from the totals, shows Accepted and folds its diff; Reject all marks every remaining file Rejected and the header reads "All changes reviewed"; undo returns a file to pending and restores the totals; clicking a row toggles its inline diff with old or new line numbers.',
  criticalRegion: 'critical',
};

export default meta;
