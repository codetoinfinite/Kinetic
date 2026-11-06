# Build: Code Diff Viewer

Give it the file before and after a change and it shows the difference the way a code review does: removed lines on red, added lines on green, each with its old and new line number, grouped into hunks with "@@ -a,b +c,d @@" headers. Long runs of unchanged code fold into a "Show N unchanged lines" bar; open one, or every one from the toolbar, to read the whole file. A Unified / Split switch moves between one column and old and new side by side. Long lines wrap instead of scrolling sideways.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Before / after line diff with old and new line numbers, hunk headers, a unified or split layout and folded unchanged lines.

- Category: display
- Runtime cost: dom
- Dependencies: react-aria-components@^1.22.1, @remixicon/react@^4.9.0

## How it works

1. diffLines splits both texts into lines, trims the lines they share at the start and end, and fills a longest-common-subsequence table for the changed middle only. Walking the table gives unchanged, removed and added lines in order, each numbered against the old file, the new file or both. On a tie a removal goes first, so a replaced block reads "- old" then "+ new".
2. findFolds looks at every run of unchanged lines and keeps `context` lines (3 by default) next to each change. What is left becomes a fold if it hides at least 3 lines; runs at the very top or bottom keep no context on their outer side.
3. layoutDiff turns the closed folds into hunks: each visible stretch between closed folds gets a header with its old and new start and length, read from running line counts. A closed fold and the header of the hunk after it share one row; an opened fold keeps a slim "Hide N lines" row where it was, and the header of the surrounding hunk widens to include the lines it revealed.
4. Fold ids are the index where their unchanged run starts, which does not depend on `context`. Opened ids are stored together with the diff they belong to, so passing new code starts folded again without an effect.
5. The fold button keeps the same React key whether open or closed, so keyboard focus stays on it after you press it.
6. Split view pairs the rows of a change: the n-th removal sits beside the n-th addition, and a side with nothing to pair shows an empty grey cell. Unchanged lines show on both sides with their own numbers.
7. The table uses fixed layout with set gutter widths, so code cells wrap long lines (overflow-wrap anywhere) instead of widening the table. Below 28rem the gutters narrow, and below 32rem the folder part of the path hides.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `context = 3 lines`
  The same amount git shows by default; enough to see which block a change sits in.
- `MIN_HIDDEN = 3 lines`
  Folding one or two lines behind a bar that takes a row itself saves nothing.
- `gutter width = 2.75rem (2rem under 28rem)`
  Room for four-digit line numbers at caption size; narrower on phones so code keeps most of the width.
- `line tones = notification success / error background tokens`
  The same soft lime and rose fills as the Changes Diff Panel, readable in both themes.

## API

```ts
function CodeDiffViewer(props: { oldCode: string; newCode: string; fileName?: string; view?: "unified" | "split"; defaultView?: "unified" | "split"; onViewChange?: (view: "unified" | "split") => void; context?: number; className?: string }): JSX.Element
```

- `oldCode: string`
  The file before the change.
- `newCode: string`
  The file after the change.
- `fileName: string`
  Path shown in the toolbar and in the accessible name.
- `view: "unified" | "split"`
  Controlled layout.
- `defaultView: "unified" | "split"` — default `"unified"`
  Initial layout when uncontrolled.
- `onViewChange: (view: "unified" | "split") => void`
  Called when the Unified / Split switch changes.
- `context: number` — default `3`
  Unchanged lines kept beside each change before the rest folds.
- `className: string`
  Classes for the viewer surface (height, width).

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function diffLines(oldCode: string, newCode: string): DiffLine[] {
  const a = splitLines(oldCode);
  const b = splitLines(newCode);
  // Trim the shared head and tail first, so a typical edit only runs the table on the changed middle.
  let pre = 0;
  while (pre < a.length && pre < b.length && a[pre] === b[pre]) pre++;
  let suf = 0;
  while (suf < a.length - pre && suf < b.length - pre && a[a.length - 1 - suf] === b[b.length - 1 - suf]) suf++;
  const n = a.length - pre - suf;
  const m = b.length - pre - suf;
  const w = m + 1;
  // lcs[i * w + j] = longest common run of lines between a[pre + i..] and b[pre + j..]
  const lcs = new Uint32Array((n + 1) * w);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i * w + j] =
        a[pre + i] === b[pre + j]
          ? (lcs[(i + 1) * w + j + 1] ?? 0) + 1
          : Math.max(lcs[(i + 1) * w + j] ?? 0, lcs[i * w + j + 1] ?? 0);
    }
  }
  const out: DiffLine[] = [];
  let oldNo = 1;
  let newNo = 1;
  const same = (text: string) => out.push({ kind: "ctx", text, oldNo: oldNo++, newNo: newNo++ });
  for (let k = 0; k < pre; k++) same(a[k] ?? "");
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    const x = a[pre + i] ?? "";
    const y = b[pre + j] ?? "";
    if (i < n && j < m && x === y) {
      same(x);
      i++;
      j++;
    } else if (i < n && (j >= m || (lcs[(i + 1) * w + j] ?? 0) >= (lcs[i * w + j + 1] ?? 0))) {
      // On a tie, removals go first so a replaced block reads "- old" then "+ new".
      out.push({ kind: "del", text: x, oldNo: oldNo++ });
      i++;
    } else {
      out.push({ kind: "add", text: y, newNo: newNo++ });
      j++;
    }
  }
  for (let k = a.length - suf; k < a.length; k++) same(a[k] ?? "");
  return out;
}

/** Every run of unchanged lines, minus `context` lines next to a change, is a fold candidate. */
function findFolds(lines: DiffLine[], context: number): Fold[] {
  const folds: Fold[] = [];
  let s = 0;
  while (s < lines.length) {
    if (lines[s]?.kind !== "ctx") {
      s++;
      continue;
    }
    let e = s;
    while (e < lines.length && lines[e]?.kind === "ctx") e++;
    const from = s === 0 ? 0 : s + context;
    const to = e === lines.length ? e : e - context;
    if (to - from >= MIN_HIDDEN) folds.push({ id: s, from, to });
    s = e;
  }
  return folds;
}

export function layoutDiff(lines: DiffLine[], context: number, openIds: ReadonlySet<number>) {
  const folds = findFolds(lines, context);
  const oldAt: number[] = [];
  const newAt: number[] = [];
  let o = 0;
  let nw = 0;
  for (const l of lines) {
    oldAt.push(o);
    newAt.push(nw);
    if (l.kind !== "add") o++;
    if (l.kind !== "del") nw++;
  }
  oldAt.push(o);
  newAt.push(nw);
  const span = (at: number[], from: number, to: number) => {
    const start = at[from] ?? 0;
    const len = (at[to] ?? 0) - start;
    return `${len ? start + 1 : start},${len}`;
  };
  const header = (from: number, to: number) => `@@ -${span(oldAt, from, to)} +${span(newAt, from, to)} @@`;
  const openAt = new Map(folds.filter((f) => openIds.has(f.id)).map((f) => [f.from, f]));

  const rows: Row[] = [];
  let cursor = 0;
  let pending: Fold | null = null;
  // A hunk is a visible stretch between closed folds; its header covers any opened folds inside it.
  const emit = (from: number, to: number, before: Fold | null) => {
    rows.push(
      before
        ? { t: "fold", fold: before, open: false, header: header(from, to) }
        : { t: "header", from, header: header(from, to) },
    );
    for (let i = from; i < to; i++) {
      const opened = openAt.get(i);
      if (opened) rows.push({ t: "fold", fold: opened, open: true, header: null });
      const line = lines[i];
      if (line) rows.push({ t: "line", i, line });
    }
  };
  for (const f of folds) {
    if (openIds.has(f.id)) continue;
    if (f.from > cursor) emit(cursor, f.from, pending);
    pending = f;
    cursor = f.to;
  }
  if (cursor < lines.length) emit(cursor, lines.length, pending);
  else if (pending) rows.push({ t: "fold", fold: pending, open: false, header: null });
  return { rows, foldIds: folds.map((f) => f.id) };
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** No timers, listeners or observers. The diff and layout are memoised React values.

**Reduced motion.** Only the hover and selected colours of the layout switch and fold buttons transition, and they use motion-reduce:transition-none; folds open and close instantly in every mode.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- The line diff fills an old × new table for the changed middle, so it is meant for source files up to a few thousand lines. For whole generated files or huge diffs, compute the diff on a server or in a worker.
- Lines are compared exactly: a change in indentation or line endings counts as a change. Normalise "\r\n" to "\n" before passing text from Windows files.
- Code is plain text in a monospace table; add your own highlighter per line if you need token colours.

## Notes

- Uses DiffCounts from Changes Diff Panel for the +/− totals in the toolbar, so both read the same.
- diffLines and layoutDiff are exported for building other views, such as a commit summary or a minimap of changed lines.
- An unchanged file still renders: the whole file sits behind one "Show N unchanged lines" bar and the totals read +0 −0.

## Definition of done

The demo opens unified with three hunks and three "Show N unchanged lines" bars; the toolbar reads +7 −4. Pressing a bar reveals its lines and turns it into "Hide N lines" with focus still on it; "Show all lines" opens every fold and its label becomes "Fold unchanged". Split puts each removed line beside its replacement with old numbers on the left and new on the right. At 360px wide lines wrap and nothing scrolls sideways.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
