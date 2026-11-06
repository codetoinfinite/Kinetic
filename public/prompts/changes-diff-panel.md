# Build: Changes Diff Panel

The review side of an agent that edits code: a header with the number of uncommitted changes and their total added and removed lines, then one row per changed file with its path, +/− counts and a New or Deleted tag. Each row opens to an inline unified diff with line numbers and green or red line backgrounds. Accept or reject a file from its row, or every pending file from the header; decided files show an Accepted or Rejected tag with an undo, and the header totals only count what is still pending.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Uncommitted-changes list with +/− counts, an inline diff per file and accept / reject per file or for all; totals update live.

- Category: display
- Runtime cost: dom
- Dependencies: react-aria-components@^1.22.1, @remixicon/react@^4.9.0

## How it works

1. parsePatch reads each file as a unified diff body: an "@@ -a,b +c,d @@" header resets the old and new line counters, "+" lines take the next new number, "-" lines the next old number, context lines advance both, and "\ No newline" markers are skipped. The same pass counts additions and removals, so counts never drift from the diff.
2. Decisions are a map from path to "accepted" or "rejected"; a missing key means pending. They can be controlled (decisions + onDecisionsChange) or left to the panel (defaultDecisions). applyDecision writes one decision, or deletes it for undo, across a list of paths, so a single file and Accept all share one code path.
3. The header derives everything from that map on each render: pending files, their summed +/− lines, and the accepted and rejected counts. When nothing is pending it switches to "All changes reviewed" and the bulk buttons disable.
4. Rows are React Aria Disclosures inside a DisclosureGroup with allowsMultipleExpanded. The trigger button sits inside a heading and the accept / reject buttons are its siblings, so no button is nested in another.
5. Expansion is held by the panel (defaultExpanded seeds it); with collapseOnDecide a decided file folds its diff, so the list shortens as you review.
6. Below 28rem wide the panel hides the folder part of each path and the New / Deleted tag (the file icon still shows the status), so file names stay readable.
7. Rejected files strike through their path and dim their diff instead of hiding it, so the reviewer can still read what was turned down and undo it.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `diff max height = 18rem (max-h-72)`
  Long files scroll inside their own box, so one big diff does not push every other file off the panel.
- `line tones = notification success / error background tokens`
  Soft lime and rose fills that keep code readable in both themes; the +/− signs and counts use the matching foreground tokens.
- `rejected dim = opacity 0.6`
  Clearly secondary while staying legible, unlike hiding the diff, which would make undo a blind action.

## API

```ts
function ChangesDiffPanel(props: { files: { path: string; patch: string; status?: "added" | "modified" | "deleted" }[]; decisions?: Record<string, "accepted" | "rejected">; defaultDecisions?: Record<string, "accepted" | "rejected">; onDecisionsChange?: (next, change: { paths: string[]; decision: "accepted" | "rejected" | null }) => void; defaultExpanded?: string[]; collapseOnDecide?: boolean; title?: string; className?: string }): JSX.Element
```

- `files: { path: string; patch: string; status?: "added" | "modified" | "deleted" }[]`
  Changed files with a unified diff body each.
- `decisions: Record<string, "accepted" | "rejected">`
  Controlled decisions keyed by path; missing means pending.
- `defaultDecisions: Record<string, "accepted" | "rejected">`
  Initial decisions when uncontrolled.
- `onDecisionsChange: (next, change: { paths, decision }) => void`
  Called by every accept, reject and undo, single or bulk.
- `defaultExpanded: string[]` — default `[]`
  Paths whose diff starts open.
- `collapseOnDecide: boolean` — default `true`
  Fold a file once it is accepted or rejected.
- `title: string` — default `"Changes"`
  Accessible name of the panel.
- `className: string`
  Classes for the panel surface (height, width).

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
const HUNK_HEADER = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/;

/** Turns a unified diff body into rows with old and new line numbers, and counts its additions and removals. */
export function parsePatch(patch: string): ParsedPatch {
  const rows: DiffRow[] = [];
  let oldNo = 1;
  let newNo = 1;
  let added = 0;
  let removed = 0;
  for (const raw of patch.replace(/\n+$/, "").split("\n")) {
    const hunk = HUNK_HEADER.exec(raw);
    if (hunk) {
      oldNo = Math.max(1, Number(hunk[1]));
      newNo = Math.max(1, Number(hunk[2]));
      rows.push({ kind: "hunk", text: raw });
      continue;
    }
    if (raw.startsWith("\\")) continue;
    const sign = raw.charAt(0);
    if (sign === "+") {
      rows.push({ kind: "add", text: raw.slice(1), oldNo: null, newNo: newNo++ });
      added += 1;
    } else if (sign === "-") {
      rows.push({ kind: "del", text: raw.slice(1), oldNo: oldNo++, newNo: null });
      removed += 1;
    } else {
      rows.push({ kind: "ctx", text: sign === " " ? raw.slice(1) : raw, oldNo: oldNo++, newNo: newNo++ });
    }
  }
  return { rows, added, removed };
}

/** Applies one decision (or null to undo) to several paths and returns a new map. */
function applyDecision(prev: ChangeDecisions, paths: string[], decision: ChangeDecision | null): ChangeDecisions {
  const next = { ...prev };
  for (const path of paths) {
    if (decision) next[path] = decision;
    else delete next[path];
  }
  return next;
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** No timers, listeners or observers; all state is plain React state.

**Reduced motion.** Only the chevron turn, row hover and the rejected dim fade animate, and all use motion-reduce:transition-none; diffs open and close instantly in every mode.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Paths are the keys for decisions and expansion; two entries with the same path will share one decision.
- In controlled mode, update decisions from onDecisionsChange or the buttons appear dead.
- Pass only the diff body (hunks and lines). File headers such as "diff --git" or "+++ b/file" would be read as added lines.

## Notes

- DiffCounts and parsePatch are exported for summaries elsewhere, for example a commit bar that reads "3 files, +24 −7".
- The status tag is optional: status "added" shows New, "deleted" shows Deleted, anything else shows only the counts.
- Line text is rendered as plain text in a monospace table; plug in your own highlighter if you need colours per token.

## Definition of done

With five pending files the header reads "5 uncommitted changes" with the summed +/− lines; accepting one file drops it from the totals, shows Accepted and folds its diff; Reject all marks every remaining file Rejected and the header reads "All changes reviewed"; undo returns a file to pending and restores the totals; clicking a row toggles its inline diff with old or new line numbers.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
