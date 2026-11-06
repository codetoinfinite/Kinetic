# Build: Tree View

A nested folder tree on React Aria `Tree`, which supplies the treegrid roles, expansion and selection state, typeahead and locale-aware arrow keys. On top of it the kit draws connected trunk lines with a rounded elbow into each child, swaps the folder icon to an open folder when a branch is expanded, and replaces the collection renderer so rows unfold with a height, fade and blur animation instead of popping in.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

React Aria file tree with curved guide lines, folder icons that open, and rows that unfold and blur in as branches expand.

- Category: navigation
- Runtime cost: dom
- Dependencies: @remixicon/react@^4.9.0, motion@^12.43.0, react-aria-components@^1.22.1

## How it works

1. `TreeView` renders `AriaTree` with `selectionMode` defaulting to `"single"`, a `data-size` and `data-show-guides` attribute, and a bordered `rounded-3xl p-2` card. It also provides a custom renderer through `CollectionRendererContext`: `TREE_VIEW_RENDERER` is `DefaultCollectionRenderer` with `CollectionRoot` swapped for `AnimatedTreeCollection`. The swap only happens when the parent renderer is the default and the tree has no `dragAndDropHooks`, so virtualizers and drag-and-drop keep working.
2. `AnimatedTreeCollection` reads `TreeStateContext` and maps the flattened collection (skipping `content` nodes) into `AnimatedTreeRow`s inside `<AnimatePresence initial={false}>`, keyed by node key. Each row is a `motion.div` that animates from `height: 0, opacity: 0, y: -4, blur(4px)` to `height: auto`, 1px vertical padding, `opacity: 1, y: 0, blur(0)` over 0.28s with ease `[0.22, 1, 0.36, 1]`, and reverses on exit. Because of `initial={false}`, rows present on first render do not animate.
3. An exiting row has already left React Aria's collection, so `AnimatedTreeRow` keeps the last `state` it saw while `useIsPresent()` was true and re-provides it through `TreeStateContext`. That lets the row keep rendering its label and guides while it collapses. It is marked `inert`, `aria-hidden` and `data-tree-view-exiting`, so it cannot be focused or announced.
4. `TreeViewItem` indents with `paddingInlineStart: calc(0.5rem + (level − 1) × 1.25rem)` and uses `min-h-9` rows (`min-h-8` and `text-body-2-regular` when the tree is `size="sm"`). Hover, press, keyboard focus and selection all paint `MENU_ITEM_ACTIVE` (`bg-dropdown-item-hover-background`), and focus adds an inset 2px ring. Branches get a `slot="chevron"` Aria button whose `RiArrowRightSLine` rotates 90° when open over 150ms. Leaves get a spacer (`w-5` at the root, `w-2` when nested).
5. The icon defaults to `RiFolder3Line` / `RiFolderOpenLine` for branches and `RiFileLine` for leaves, at `size-4 opacity-50`. `icon={null}` hides it, `expandedIcon` overrides the open state and `iconClassName` tints it.
6. `TreeGuides` draws the lines in an `aria-hidden` absolute layer. It walks up `parentKey` and adds a full-height 1px trunk for every ancestor level that still has a `nextKey` sibling, so lines run unbroken through expanded subtrees. A nested row then draws its own elbow: a vertical stub to 6px above centre, then an SVG `M0.5 0 Q0.5 6 6.5 6 H…` quadratic curve into the row (12px wide for branches, 16px for leaves). It adds a tail below when the row has a next sibling, and a bridge down from the icon when the row itself is expanded. Each axis sits at `calc(1.125rem + depth × 1.25rem)`.
7. A capture-phase `onKeyDownCapture` on a `display: contents` wrapper completes Right Arrow (Left Arrow in RTL) on an already-expanded row: it finds the next row in DOM order with a deeper `aria-level`, skips disabled and exiting rows, and focuses it. React Aria handles expanding closed branches and every other key.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `indent step = 1.25rem (20px) per level, from a 0.5rem base`
  The guide axes use the same 1.25rem step offset by 1.125rem, which centres each trunk under its parent's chevron. Change one and the lines stop lining up with the icons.
- `row animation = 0.28s, ease [0.22, 1, 0.36, 1], y −4px, blur 4px`
  A strong ease-out lets the height open quickly and settle softly. The small upward offset and blur make children look as if they slide out from under the parent rather than being inserted.
- `row heights = min-h-9 (36px) md, min-h-8 (32px) sm`
  Matches the kit's menu item heights, so a tree in a sidebar lines up with menus and nav items next to it.
- `elbow = quadratic curve, 6px radius; branch 12px wide, leaf 16px`
  Branches have a 20px chevron button before the icon and leaves only a spacer, so the elbow length differs to land right at each icon.

## API

```ts
function TreeView<T extends object>(props: AriaTreeProps<T> & { size?: "sm" | "md"; showGuides?: boolean; onKeyDownCapture?: KeyboardEventHandler<HTMLDivElement>; ref?: Ref<HTMLDivElement> }): JSX.Element
function TreeViewItem<T extends object = object>(props: Omit<AriaTreeItemProps<T>, "textValue" | "children"> & { label: string; textValue?: string; icon?: IconComponent | null; expandedIcon?: IconComponent; iconClassName?: string; trailingContent?: ReactNode; children?: ReactNode; ref?: Ref<HTMLDivElement> }): JSX.Element
export { Collection as TreeViewCollection } from "react-aria-components"
```

- `size: "sm" | "md"` — default `"md"`
  36px or 32px rows. Small also drops the label to the 13px body-2 style.
- `showGuides: boolean` — default `true`
  Draws trunk lines and curved branches beside nested rows.
- `selectionMode: "none" | "single" | "multiple"` — default `"single"`
  React Aria selection mode. Selected rows use the same tint as hover.
- `defaultExpandedKeys / expandedKeys: Iterable<Key>`
  Uncontrolled or controlled set of open branches.
- `TreeViewItem.label: string`
  Visible label, also the default `textValue` for typeahead and accessible naming.
- `TreeViewItem.icon: IconComponent | null`
  Defaults to folder for branches and file for leaves. `null` hides it.
- `TreeViewItem.iconClassName: string`
  Extra classes for the icon, typically a colour such as `text-accent-700`.
- `TreeViewItem.trailingContent: ReactNode`
  Metadata at the end of the row in caption type, such as a size or count.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
const TREE_VIEW_RENDERER = {
  ...DefaultCollectionRenderer,
  CollectionRoot: AnimatedTreeCollection,
};

function AnimatedTreeCollection({ collection, ...props }: ComponentProps<typeof DefaultCollectionRenderer.CollectionRoot>) {
  const state = useContext(TreeStateContext);
  if (!state) return <DefaultCollectionRenderer.CollectionRoot collection={collection} {...props} />;

  return (
    <AnimatePresence initial={false}>
      {Array.from(collection).filter((node) => node.type !== "content").map((node) => (
        <AnimatedTreeRow key={node.key} state={state}>
          {node.render?.(node)}
        </AnimatedTreeRow>
      ))}
    </AnimatePresence>
  );
}

type TreeState = NonNullable<ContextType<typeof TreeStateContext>>;

function TreeGuides({ state, id, level, expanded, branchWidth, direction }: {
  state: TreeState;
  id: Key;
  level: number;
  expanded: boolean;
  branchWidth: number;
  direction: "ltr" | "rtl";
}) {
  const node = state.collection.getItem(id);
  if (!node) return null;

  // A descendant carries an outer trunk only when its ancestor has a sibling
  // still to come. This keeps the line connected through an expanded subtree,
  // while the final child's elbow closes that level of the tree.
  const continuingLevels: number[] = [];
  let ancestor = node.parentKey != null ? state.collection.getItem(node.parentKey) : null;
  let ancestorLevel = level - 1;
  while (ancestor) {
    if (ancestor.type === "item") {
      if (ancestorLevel > 1 && ancestor.nextKey != null) continuingLevels.push(ancestorLevel - 2);
      ancestorLevel--;
    }
    ancestor = ancestor.parentKey != null ? state.collection.getItem(ancestor.parentKey) : null;
  }

  const axis = (depth: number) => `calc(1.125rem + ${depth} * 1.25rem)`;

  return (
    <span aria-hidden data-tree-view-guides className="pointer-events-none absolute inset-0 text-foreground-icon-quaternary group-data-[show-guides=false]/tree-view:hidden">
      {continuingLevels.map((depth) => (
        <span key={depth} data-tree-view-trunk className="absolute -inset-y-px w-px bg-current" style={{ insetInlineStart: axis(depth) }} />
      ))}
      {level > 1 && (
        <span data-tree-view-branch className="absolute -inset-y-px" style={{ insetInlineStart: axis(level - 2), width: branchWidth }}>
          <span className="absolute start-0 top-0 w-px bg-current" style={{ bottom: "calc(50% + 6px)" }} />
          <svg
            width={branchWidth}
            height="7"
            viewBox={`0 0 ${branchWidth} 7`}
            fill="none"
            className={cx("absolute start-0", direction === "rtl" && "-scale-x-100")}
            style={{ top: "calc(50% - 6px)" }}
          >
            <path d={`M0.5 0 Q0.5 6 6.5 6 H${branchWidth - 0.5}`} stroke="currentColor" strokeWidth="1" />
          </svg>
          {node.nextKey != null && (
            <span data-tree-view-tail className="absolute start-0 bottom-0 w-px bg-current" style={{ top: "calc(50% - 6px)" }} />
          )}
        </span>
      )}
      {expanded && (
        <span data-tree-view-bridge className="absolute -bottom-px w-px bg-current" style={{ insetInlineStart: axis(level - 1), top: "calc(50% + 8px)" }} />
      )}
    </span>
  );
}

function AnimatedTreeRow({ state, children }: { state: TreeState; children: ReactNode }) {
  const isPresent = useIsPresent();
  const reduceMotion = useReducedMotion();
  const [lastPresentState, setLastPresentState] = useState(state);
  if (isPresent && lastPresentState !== state) setLastPresentState(state);

  // Preserve the row's last collection while it fades out. The live tree has
  // already removed it from keyboard navigation; the retained visual is inert.
  return (
    <motion.div
      role="presentation"
      className="relative min-w-0 shrink-0 overflow-hidden"
      data-tree-view-exiting={!isPresent || undefined}
      aria-hidden={!isPresent || undefined}
      inert={!isPresent}
      initial={reduceMotion ? false : { height: 0, paddingTop: 0, paddingBottom: 0, opacity: 0, y: -4, filter: "blur(4px)" }}
      animate={{ height: "auto", paddingTop: 1, paddingBottom: 1, opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ height: 0, paddingTop: 0, paddingBottom: 0, opacity: 0, y: reduceMotion ? 0 : -4, filter: reduceMotion ? "blur(0px)" : "blur(4px)" }}
      transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      <TreeStateContext.Provider value={isPresent ? state : lastPresentState}>
        {children}
      </TreeStateContext.Provider>
    </motion.div>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing to release manually. `AnimatePresence` unmounts exiting rows when their exit animation finishes, and motion stops any running animation when the tree unmounts. There are no listeners outside React.

**Reduced motion.** With `useReducedMotion()` true the rows skip the entry animation (`initial={false}`), exit with no offset or blur, and the transition duration becomes 0, so branches open and close instantly. The chevron rotation and colour transitions have `motion-reduce:transition-none`.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Do not animate rows with CSS `height` transitions on the Aria items. A collapsed child is removed from the collection immediately, so there is nothing left to animate. The exit only works because `AnimatePresence` keeps the motion wrapper and the row keeps its last tree state.
- Do not leave exiting rows focusable. Without `inert` and `aria-hidden`, arrow keys and screen readers would land on rows that are already gone from the tree.
- Do not reuse ids across the tree. React Aria keys expansion, selection and the guide walk on `id`, so duplicates confuse all three.
- Do not forget `aria-label` or `aria-labelledby` on `TreeView`. React Aria warns when a tree has no accessible name.
- Do not force the custom renderer when using drag and drop or a virtualizer. The component already falls back to the parent renderer in those cases.

## Notes

- For data-driven trees, pass `items` and render recursively with the re-exported `TreeViewCollection` (React Aria `Collection`).
- Set `showGuides={false}` to hide every line with one `group-data-[show-guides=false]` rule, leaving plain indentation.
- The tree grows with its content and does not scroll itself. Wrap it in a scroll container if it lives in a fixed-height sidebar.

## Definition of done

With `src` and `components` expanded, nested rows are indented 20px per level and joined to their parent by thin lines with rounded elbows. The last child's elbow closes its level with no tail. Collapsing a folder makes its children shrink, fade and blur out over about 0.3s while the open-folder icon switches back to a closed folder and the chevron rotates back. Expanding animates them in. Clicking a row selects it with a tinted background. Arrow keys move between rows, Right on a closed folder opens it and Right on an open folder moves to its first child.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
