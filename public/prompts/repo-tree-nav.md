# Build: Repo Tree Nav

A file tree for agent and code-review sidebars. Nested folders open and close with the pointer, Enter or the arrow keys; files show an icon picked from their extension, green/red added and removed line counts and an A/M/D/R status letter. Only files can be selected. A collapsed folder rolls up the counts of every changed file inside it, so the totals never disappear when a branch is closed.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Repository file tree with folder expand/collapse, file-type icons, single file selection and +/− line counts per file.

- Category: navigation
- Runtime cost: dom
- Dependencies: react-aria-components@^1.22.1, @remixicon/react@^4.9.0

## How it works

1. Rendered on the kit TreeView (React Aria Tree): treegrid semantics, Up/Down/Home/End, typeahead, Right/Left to expand, collapse or jump to the parent, and the animated row height on expand.
2. Folder ids go into disabledKeys with disabledBehavior="selection": folders stay focusable and expandable but can never become the selection, and a press on a folder row runs its onAction, which toggles that id in the expanded set.
3. Files are selected through React Aria single selection (aria-selected), mapped back to a node through an id lookup built in the same memoised pass that collects folder ids.
4. The same pass stores summarizeChanges(children) per folder; a folder shows that roll-up only while collapsed, when its files are hidden.
5. Both selection (selectedId/defaultSelectedId/onSelect) and expansion (expandedIds/defaultExpandedIds/onExpandedChange) are controlled-or-uncontrolled.
6. Counts are drawn aria-hidden and repeated in an sr-only phrase ("3 changed files, 156 additions, 23 deletions"), and the status letter has an sr-only word.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `row height = 32px (size="sm")`
  Matches dense sidebar lists; md (36px) is available for roomier panels.
- `status colours = status-lime / status-orange / status-rose / status-blue`
  Theme tokens with separate dark values, so added, modified, deleted and renamed stay legible on both surfaces.
- `status chip = 16px, caption-2 semibold`
  One letter fits without widening the trailing column, keeping counts aligned.

## API

```ts
function RepoTreeNav(props: { nodes: RepoTreeNode[]; selectedId?: string | null; defaultSelectedId?: string | null; onSelect?: (id: string, node: RepoTreeNode) => void; expandedIds?: Iterable<string>; defaultExpandedIds?: Iterable<string>; onExpandedChange?: (ids: Set<string>) => void; size?: "sm" | "md"; showGuides?: boolean; "aria-label"?: string; className?: string }): JSX.Element
```

- `nodes: RepoTreeNode[]`
  { id, name, children?, additions?, deletions?, status? }; a node with children is a folder.
- `selectedId: string | null`
  Controlled selected file id.
- `defaultSelectedId: string | null` — default `null`
  Initial selected file when uncontrolled.
- `onSelect: (id: string, node: RepoTreeNode) => void`
  Called when a different file is chosen.
- `expandedIds: Iterable<string>`
  Controlled expanded folder ids.
- `defaultExpandedIds: Iterable<string>` — default `[]`
  Initially expanded folders when uncontrolled.
- `onExpandedChange: (ids: Set<string>) => void`
  Called with the full expanded set after any toggle.
- `size: "sm" | "md"` — default `"sm"`
  Row density.
- `showGuides: boolean` — default `true`
  Draw the branch guide lines beside nested rows.
- `aria-label: string` — default `"Files"`
  Accessible name of the tree.
- `className: string`
  Classes for the tree surface.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
// One pass over the tree: folder ids (never selectable, so a press on a
// folder row runs its toggle action instead of selecting it), a lookup for
// onSelect, and rolled-up counts shown on folders while they are collapsed.
const { folderIds, byId, totals } = useMemo(() => {
  const folderIds: string[] = [];
  const byId = new Map<string, RepoTreeNode>();
  const totals = new Map<string, RepoChangeSummary>();
  const visit = (node: RepoTreeNode) => {
    byId.set(node.id, node);
    if (!node.children) return;
    folderIds.push(node.id);
    node.children.forEach(visit);
    totals.set(node.id, summarizeChanges(node.children));
  };
  nodes.forEach(visit);
  return { folderIds, byId, totals };
}, [nodes]);

const setExpanded = (next: Set<string>) => {
  setUncontrolledExpanded(next);
  onExpandedChange?.(next);
};

const toggleFolder = (id: string) => {
  const next = new Set(expanded);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  setExpanded(next);
};

const select = (keys: Selection) => {
  if (keys === "all") return;
  const [key] = Array.from(keys as Set<Key>);
  const node = key == null ? undefined : byId.get(String(key));
  if (!node || isFolder(node) || node.id === selected) return;
  setUncontrolledSelected(node.id);
  onSelect?.(node.id, node);
};
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** No timers or listeners of its own; expansion animations belong to the TreeView rows and stop when they unmount.

**Reduced motion.** The kit TreeView reads prefers-reduced-motion and drops the height/blur expand animation to an instant swap; hover and chevron transitions use motion-reduce:transition-none.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- With selectionMode="single", React Aria turns a row press into selection; without disabledKeys + disabledBehavior="selection" a folder click would select the folder instead of opening it.
- Folder detection uses children !== undefined, so pass children: [] for an empty folder or it renders as a file.
- Ids must be unique across the whole tree, not per folder; full paths are the easy choice.

## Notes

- summarizeChanges(nodes) is exported for headers such as "9 files +156 −23", and fileIconFor(name) for matching icons elsewhere.
- The tree grows with its content; wrap it in an overflow-y-auto container to scroll.
- Inside a sidebar that already has a surface, pass className="rounded-none border-0 bg-transparent p-0" to drop the tree card; row hover and selection still read on a primary background.

## Definition of done

Clicking a folder (or Enter / Right Arrow on it) shows its children and hides its roll-up count; clicking again or Left Arrow collapses it; clicking a file marks it aria-selected and fires onSelect once; folders never become selected; each changed file shows its non-zero +N / −M counts and its status letter.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
