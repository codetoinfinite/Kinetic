/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Code Diff Viewer" (boardui.com/).
 * No BoardUI source was used.
 */
"use client";

import { useMemo, useState } from "react";
import { ToggleButton, ToggleButtonGroup, type Key } from "react-aria-components";
import {
  RiContractUpDownLine,
  RiExpandUpDownLine,
  RiExpandVerticalLine,
  RiFileCodeLine,
  RiLayoutColumnLine,
  RiLayoutRowLine,
} from "@remixicon/react";

import { Button } from "@/registry/ui/button";
import { DiffCounts } from "@/registry/ui/changes-diff-panel";
import { cx } from "@/registry/lib/cx";

export type DiffLineKind = "ctx" | "add" | "del";

export type DiffLine =
  | { kind: "ctx"; text: string; oldNo: number; newNo: number }
  | { kind: "del"; text: string; oldNo: number; newNo?: undefined }
  | { kind: "add"; text: string; newNo: number; oldNo?: undefined };

export type DiffView = "unified" | "split";

type Fold = { id: number; from: number; to: number };

type Row =
  | { t: "fold"; fold: Fold; open: boolean; header: string | null }
  | { t: "header"; from: number; header: string }
  | { t: "line"; i: number; line: DiffLine };

type SplitRow =
  | Exclude<Row, { t: "line" }>
  | { t: "pair"; key: string; left: DiffLine | null; right: DiffLine | null };

export type CodeDiffViewerProps = {
  /** The file before the change. */
  oldCode: string;
  /** The file after the change. */
  newCode: string;
  /** Path shown in the toolbar. */
  fileName?: string;
  /** Controlled layout. */
  view?: DiffView;
  /** Initial layout when uncontrolled. */
  defaultView?: DiffView;
  onViewChange?: (view: DiffView) => void;
  /** Unchanged lines kept around each change before the rest folds. */
  context?: number;
  className?: string;
};

/** A gap folds only when it would hide at least this many lines. */
const MIN_HIDDEN = 3;
const EMPTY: ReadonlySet<number> = new Set();

function splitLines(text: string): string[] {
  if (text === "") return [];
  const lines = text.split("\n");
  if (lines[lines.length - 1] === "") lines.pop();
  return lines;
}

// #region critical
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
// #endregion

/** Side-by-side: unchanged lines sit on both sides; removals and additions in one change pair up row by row. */
function pairRows(rows: Row[]): SplitRow[] {
  const out: SplitRow[] = [];
  let dels: DiffLine[] = [];
  let adds: DiffLine[] = [];
  const flush = () => {
    for (let k = 0; k < Math.max(dels.length, adds.length); k++) {
      const left = dels[k] ?? null;
      const right = adds[k] ?? null;
      out.push({ t: "pair", key: `c${left?.oldNo ?? "-"}:${right?.newNo ?? "-"}`, left, right });
    }
    dels = [];
    adds = [];
  };
  for (const r of rows) {
    if (r.t === "line" && r.line.kind === "del") dels.push(r.line);
    else if (r.t === "line" && r.line.kind === "add") adds.push(r.line);
    else {
      flush();
      out.push(r.t === "line" ? { t: "pair", key: `s${r.i}`, left: r.line, right: r.line } : r);
    }
  }
  flush();
  return out;
}

const TONE: Record<DiffLineKind, string> = {
  add: "bg-notification-success-background dark:bg-status-lime-background",
  del: "bg-notification-error-background dark:bg-status-rose-background",
  ctx: "",
};
const SIGN: Record<DiffLineKind, string> = { add: "+", del: "−", ctx: "" };
const SIGN_TONE: Record<DiffLineKind, string> = {
  add: "text-notification-success-foreground",
  del: "text-notification-error-foreground",
  ctx: "",
};
const SPOKEN: Record<DiffLineKind, string> = { add: "added", del: "removed", ctx: "" };

const NUM = "px-2 py-0.5 text-right align-top tabular-nums text-text-tertiary select-none";
const CODE = "h-6 py-0.5 pr-3 align-top whitespace-pre-wrap wrap-anywhere text-text-primary [tab-size:2]";

function Num({ n, tone, className }: { n: number | undefined; tone: DiffLineKind; className?: string }) {
  return <td className={cx(NUM, TONE[tone], className)}>{n ?? ""}</td>;
}

function Sign({ kind }: { kind: DiffLineKind }) {
  return (
    <td className={cx("py-0.5 text-center align-top select-none", TONE[kind], SIGN_TONE[kind])}>
      <span aria-hidden>{SIGN[kind]}</span>
      {kind !== "ctx" && <span className="sr-only">{SPOKEN[kind]}</span>}
    </td>
  );
}

function Code({ line }: { line: DiffLine }) {
  return <td className={cx(CODE, TONE[line.kind])}>{line.text}</td>;
}

function FoldRow({
  fold,
  open,
  header,
  cols,
  onToggle,
}: {
  fold: Fold;
  open: boolean;
  header: string | null;
  cols: number;
  onToggle: (id: number) => void;
}) {
  const count = fold.to - fold.from;
  return (
    <tr data-kind="fold">
      <td colSpan={cols} className="bg-background-secondary-default px-1 py-1">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            data-fold={open ? "open" : "closed"}
            aria-expanded={open}
            onClick={() => onToggle(fold.id)}
            className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-lg px-2 font-sans text-caption-1-medium text-text-secondary transition-colors duration-150 ease-out outline-none hover:bg-background-tertiary-default hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring motion-reduce:transition-none"
          >
            {open ? (
              <RiContractUpDownLine aria-hidden className="size-3.5" />
            ) : (
              <RiExpandVerticalLine aria-hidden className="size-3.5" />
            )}
            {open ? `Hide ${count} lines` : `Show ${count} unchanged lines`}
          </button>
          {header && <span className="min-w-0 truncate text-notification-information-foreground">{header}</span>}
        </div>
      </td>
    </tr>
  );
}

function HeaderRow({ header, cols }: { header: string; cols: number }) {
  return (
    <tr data-kind="hunk">
      <td colSpan={cols} className="truncate bg-background-secondary-default px-3 py-1.5 text-notification-information-foreground">
        {header}
      </td>
    </tr>
  );
}

const segment = ({ isSelected, isFocusVisible }: { isSelected: boolean; isFocusVisible: boolean }) =>
  cx(
    "inline-flex h-7 items-center gap-1.5 rounded-[10px] px-2.5 text-caption-1-medium outline-none transition-colors duration-150 ease-out motion-reduce:transition-none",
    isSelected
      ? "bg-background-primary-default text-text-primary shadow-xs"
      : "text-text-secondary hover:text-text-primary",
    isFocusVisible && "ring-2 ring-border-focus-ring",
  );

export function CodeDiffViewer({
  oldCode,
  newCode,
  fileName,
  view: viewProp,
  defaultView = "unified",
  onViewChange,
  context = 3,
  className,
}: CodeDiffViewerProps) {
  const lines = useMemo(() => diffLines(oldCode, newCode), [oldCode, newCode]);
  const [ownView, setOwnView] = useState<DiffView>(defaultView);
  const view = viewProp ?? ownView;
  // Opened folds belong to one diff: new code starts folded again without an effect.
  const [open, setOpen] = useState<{ lines: DiffLine[]; ids: ReadonlySet<number> }>({ lines, ids: EMPTY });
  const openIds = open.lines === lines ? open.ids : EMPTY;
  const { rows, foldIds } = useMemo(() => layoutDiff(lines, context, openIds), [lines, context, openIds]);
  const splitRows = useMemo(() => (view === "split" ? pairRows(rows) : null), [rows, view]);

  const added = lines.filter((l) => l.kind === "add").length;
  const removed = lines.filter((l) => l.kind === "del").length;
  const allOpen = foldIds.length > 0 && foldIds.every((id) => openIds.has(id));

  const toggleFold = (id: number) =>
    setOpen((prev) => {
      const next = new Set(prev.lines === lines ? prev.ids : EMPTY);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { lines, ids: next };
    });

  const changeView = (keys: Set<Key>) => {
    const [k] = keys;
    if (k !== "unified" && k !== "split") return;
    setOwnView(k);
    onViewChange?.(k);
  };

  const slash = fileName ? fileName.lastIndexOf("/") + 1 : 0;
  const cols = view === "split" ? 6 : 4;

  return (
    <section
      aria-label={fileName ? `Diff of ${fileName}` : "Code diff"}
      data-view={view}
      className={cx(
        "@container flex min-h-0 flex-col overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default",
        className,
      )}
    >
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border-button-default px-4 py-3">
        <div className="flex min-w-[10rem] flex-1 items-center gap-2">
          <RiFileCodeLine aria-hidden className="size-4 shrink-0 text-foreground-icon-secondary" />
          {fileName && (
            <span className="min-w-0 truncate text-body-2-medium text-text-primary" title={fileName}>
              <span className="text-text-tertiary @max-[32rem]:sr-only">{fileName.slice(0, slash)}</span>
              {fileName.slice(slash)}
            </span>
          )}
          <DiffCounts added={added} removed={removed} className="shrink-0" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ToggleButtonGroup
            aria-label="Diff layout"
            selectionMode="single"
            disallowEmptySelection
            selectedKeys={[view]}
            onSelectionChange={changeView}
            className="flex rounded-xl bg-background-secondary-default p-0.5"
          >
            <ToggleButton id="unified" className={segment}>
              <RiLayoutRowLine aria-hidden className="size-3.5" />
              Unified
            </ToggleButton>
            <ToggleButton id="split" className={segment}>
              <RiLayoutColumnLine aria-hidden className="size-3.5" />
              Split
            </ToggleButton>
          </ToggleButtonGroup>
          <Button
            size="xs"
            variant="secondary"
            leadingIcon={allOpen ? RiContractUpDownLine : RiExpandUpDownLine}
            disabled={foldIds.length === 0}
            onClick={() => setOpen({ lines, ids: allOpen ? EMPTY : new Set(foldIds) })}
          >
            <span className="@max-[28rem]:sr-only">{allOpen ? "Fold unchanged" : "Show all lines"}</span>
          </Button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {lines.length === 0 ? (
          <p className="p-6 text-center text-body-2-regular text-text-tertiary">Both versions are empty.</p>
        ) : (
          <table className="w-full table-fixed border-collapse font-mono text-caption-1-regular">
            <colgroup>
              {view === "split" ? (
                <>
                  <col className="w-11 @max-[28rem]:w-8" />
                  <col className="w-5" />
                  <col />
                  <col className="w-11 @max-[28rem]:w-8" />
                  <col className="w-5" />
                  <col />
                </>
              ) : (
                <>
                  <col className="w-11 @max-[28rem]:w-8" />
                  <col className="w-11 @max-[28rem]:w-8" />
                  <col className="w-5" />
                  <col />
                </>
              )}
            </colgroup>
            <thead className="sr-only">
              {view === "split" ? (
                <tr>
                  <th scope="col">Old line</th>
                  <th scope="col">Change</th>
                  <th scope="col">Old code</th>
                  <th scope="col">New line</th>
                  <th scope="col">Change</th>
                  <th scope="col">New code</th>
                </tr>
              ) : (
                <tr>
                  <th scope="col">Old line</th>
                  <th scope="col">New line</th>
                  <th scope="col">Change</th>
                  <th scope="col">Code</th>
                </tr>
              )}
            </thead>
            <tbody>
              {(splitRows ?? rows).map((r) => {
                if (r.t === "fold")
                  return (
                    <FoldRow
                      key={`f${r.fold.id}`}
                      fold={r.fold}
                      open={r.open}
                      header={r.header}
                      cols={cols}
                      onToggle={toggleFold}
                    />
                  );
                if (r.t === "header") return <HeaderRow key={`h${r.from}`} header={r.header} cols={cols} />;
                if (r.t === "line")
                  return (
                    <tr key={`l${r.i}`} data-kind={r.line.kind}>
                      <Num n={r.line.oldNo} tone={r.line.kind} />
                      <Num n={r.line.newNo} tone={r.line.kind} />
                      <Sign kind={r.line.kind} />
                      <Code line={r.line} />
                    </tr>
                  );
                const { left, right } = r;
                return (
                  <tr key={r.key} data-kind={left?.kind === "ctx" ? "ctx" : "change"}>
                    {left ? (
                      <>
                        <Num n={left.oldNo} tone={left.kind} />
                        <Sign kind={left.kind} />
                        <Code line={left} />
                      </>
                    ) : (
                      <td colSpan={3} className="bg-background-secondary-default" />
                    )}
                    {right ? (
                      <>
                        <Num n={right.newNo} tone={right.kind} className="border-l border-border-button-default" />
                        <Sign kind={right.kind} />
                        <Code line={right} />
                      </>
                    ) : (
                      <td colSpan={3} className="border-l border-border-button-default bg-background-secondary-default" />
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
