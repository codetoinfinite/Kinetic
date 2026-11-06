/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Repo Tree Nav" (boardui.com/components/multi-agent-chat).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'repo-tree-nav',
  title: 'Repo Tree Nav',
  category: 'navigation',
  kit: 'boardui',
  tags: ['boardui', 'tree', 'files', 'git', 'sidebar', 'react-aria'],
  blurb: 'Repository file tree with folder expand/collapse, file-type icons, single file selection and +/− line counts per file.',
  cost: 'dom',
  motif: 'stack',
  files: [
    { path: 'registry/ui/repo-tree-nav.tsx', type: 'registry:ui', role: 'RepoTreeNav, summarizeChanges, fileIconFor' },
  ],
  dependencies: ['react-aria-components@^1.22.1', '@remixicon/react@^4.9.0'],
  summary:
    'A file tree for agent and code-review sidebars. Nested folders open and close with the pointer, Enter or the arrow keys; files show an icon picked from their extension, green/red added and removed line counts and an A/M/D/R status letter. Only files can be selected. A collapsed folder rolls up the counts of every changed file inside it, so the totals never disappear when a branch is closed.',
  mechanism: [
    'Rendered on the kit TreeView (React Aria Tree): treegrid semantics, Up/Down/Home/End, typeahead, Right/Left to expand, collapse or jump to the parent, and the animated row height on expand.',
    'Folder ids go into disabledKeys with disabledBehavior="selection": folders stay focusable and expandable but can never become the selection, and a press on a folder row runs its onAction, which toggles that id in the expanded set.',
    'Files are selected through React Aria single selection (aria-selected), mapped back to a node through an id lookup built in the same memoised pass that collects folder ids.',
    'The same pass stores summarizeChanges(children) per folder; a folder shows that roll-up only while collapsed, when its files are hidden.',
    'Both selection (selectedId/defaultSelectedId/onSelect) and expansion (expandedIds/defaultExpandedIds/onExpandedChange) are controlled-or-uncontrolled.',
    'Counts are drawn aria-hidden and repeated in an sr-only phrase ("3 changed files, 156 additions, 23 deletions"), and the status letter has an sr-only word.',
  ],
  constants: [
    { name: 'row height', value: '32px (size="sm")', why: 'Matches dense sidebar lists; md (36px) is available for roomier panels.' },
    { name: 'status colours', value: 'status-lime / status-orange / status-rose / status-blue', why: 'Theme tokens with separate dark values, so added, modified, deleted and renamed stay legible on both surfaces.' },
    { name: 'status chip', value: '16px, caption-2 semibold', why: 'One letter fits without widening the trailing column, keeping counts aligned.' },
  ],
  pitfalls: [
    'With selectionMode="single", React Aria turns a row press into selection; without disabledKeys + disabledBehavior="selection" a folder click would select the folder instead of opening it.',
    'Folder detection uses children !== undefined, so pass children: [] for an empty folder or it renders as a file.',
    'Ids must be unique across the whole tree, not per folder; full paths are the easy choice.',
  ],
  notes: [
    'summarizeChanges(nodes) is exported for headers such as "9 files +156 −23", and fileIconFor(name) for matching icons elsewhere.',
    'The tree grows with its content; wrap it in an overflow-y-auto container to scroll.',
    'Inside a sidebar that already has a surface, pass className="rounded-none border-0 bg-transparent p-0" to drop the tree card; row hover and selection still read on a primary background.',
  ],
  apiSignature:
    'function RepoTreeNav(props: { nodes: RepoTreeNode[]; selectedId?: string | null; defaultSelectedId?: string | null; onSelect?: (id: string, node: RepoTreeNode) => void; expandedIds?: Iterable<string>; defaultExpandedIds?: Iterable<string>; onExpandedChange?: (ids: Set<string>) => void; size?: "sm" | "md"; showGuides?: boolean; "aria-label"?: string; className?: string }): JSX.Element',
  props: [
    { name: 'nodes', type: 'RepoTreeNode[]', description: '{ id, name, children?, additions?, deletions?, status? }; a node with children is a folder.' },
    { name: 'selectedId', type: 'string | null', description: 'Controlled selected file id.' },
    { name: 'defaultSelectedId', type: 'string | null', default: 'null', description: 'Initial selected file when uncontrolled.' },
    { name: 'onSelect', type: '(id: string, node: RepoTreeNode) => void', description: 'Called when a different file is chosen.' },
    { name: 'expandedIds', type: 'Iterable<string>', description: 'Controlled expanded folder ids.' },
    { name: 'defaultExpandedIds', type: 'Iterable<string>', default: '[]', description: 'Initially expanded folders when uncontrolled.' },
    { name: 'onExpandedChange', type: '(ids: Set<string>) => void', description: 'Called with the full expanded set after any toggle.' },
    { name: 'size', type: '"sm" | "md"', default: '"sm"', description: 'Row density.' },
    { name: 'showGuides', type: 'boolean', default: 'true', description: 'Draw the branch guide lines beside nested rows.' },
    { name: 'aria-label', type: 'string', default: '"Files"', description: 'Accessible name of the tree.' },
    { name: 'className', type: 'string', description: 'Classes for the tree surface.' },
  ],
  reducedMotion:
    'The kit TreeView reads prefers-reduced-motion and drops the height/blur expand animation to an instant swap; hover and chevron transitions use motion-reduce:transition-none.',
  cleanup:
    'No timers or listeners of its own; expansion animations belong to the TreeView rows and stop when they unmount.',
  acceptance:
    'Clicking a folder (or Enter / Right Arrow on it) shows its children and hides its roll-up count; clicking again or Left Arrow collapses it; clicking a file marks it aria-selected and fires onSelect once; folders never become selected; each changed file shows its non-zero +N / −M counts and its status letter.',
  criticalRegion: 'critical',
};

export default meta;
