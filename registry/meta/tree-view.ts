import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'tree-view',
  title: 'Tree View',
  category: 'navigation',
  kit: 'boardui',
  tags: ['tree', 'file-tree', 'react-aria', 'motion', 'navigation', 'boardui'],
  blurb:
    'React Aria file tree with curved guide lines, folder icons that open, and rows that unfold and blur in as branches expand.',
  cost: 'dom',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/tree-view.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['@remixicon/react@^4.9.0', 'motion@^12.43.0', 'react-aria-components@^1.22.1'],

  summary:
    'A nested folder tree on React Aria `Tree`, which supplies the treegrid roles, expansion and selection state, typeahead and locale-aware arrow keys. On top of it the kit draws connected trunk lines with a rounded elbow into each child, swaps the folder icon to an open folder when a branch is expanded, and replaces the collection renderer so rows unfold with a height, fade and blur animation instead of popping in.',

  mechanism: [
    '`TreeView` renders `AriaTree` with `selectionMode` defaulting to `"single"`, a `data-size` and `data-show-guides` attribute, and a bordered `rounded-3xl p-2` card. It also provides a custom renderer through `CollectionRendererContext`: `TREE_VIEW_RENDERER` is `DefaultCollectionRenderer` with `CollectionRoot` swapped for `AnimatedTreeCollection`. The swap only happens when the parent renderer is the default and the tree has no `dragAndDropHooks`, so virtualizers and drag-and-drop keep working.',
    '`AnimatedTreeCollection` reads `TreeStateContext` and maps the flattened collection (skipping `content` nodes) into `AnimatedTreeRow`s inside `<AnimatePresence initial={false}>`, keyed by node key. Each row is a `motion.div` that animates from `height: 0, opacity: 0, y: -4, blur(4px)` to `height: auto`, 1px vertical padding, `opacity: 1, y: 0, blur(0)` over 0.28s with ease `[0.22, 1, 0.36, 1]`, and reverses on exit. Because of `initial={false}`, rows present on first render do not animate.',
    'An exiting row has already left React Aria\'s collection, so `AnimatedTreeRow` keeps the last `state` it saw while `useIsPresent()` was true and re-provides it through `TreeStateContext`. That lets the row keep rendering its label and guides while it collapses. It is marked `inert`, `aria-hidden` and `data-tree-view-exiting`, so it cannot be focused or announced.',
    '`TreeViewItem` indents with `paddingInlineStart: calc(0.5rem + (level − 1) × 1.25rem)` and uses `min-h-9` rows (`min-h-8` and `text-body-2-regular` when the tree is `size="sm"`). Hover, press, keyboard focus and selection all paint `MENU_ITEM_ACTIVE` (`bg-dropdown-item-hover-background`), and focus adds an inset 2px ring. Branches get a `slot="chevron"` Aria button whose `RiArrowRightSLine` rotates 90° when open over 150ms. Leaves get a spacer (`w-5` at the root, `w-2` when nested).',
    'The icon defaults to `RiFolder3Line` / `RiFolderOpenLine` for branches and `RiFileLine` for leaves, at `size-4 opacity-50`. `icon={null}` hides it, `expandedIcon` overrides the open state and `iconClassName` tints it.',
    '`TreeGuides` draws the lines in an `aria-hidden` absolute layer. It walks up `parentKey` and adds a full-height 1px trunk for every ancestor level that still has a `nextKey` sibling, so lines run unbroken through expanded subtrees. A nested row then draws its own elbow: a vertical stub to 6px above centre, then an SVG `M0.5 0 Q0.5 6 6.5 6 H…` quadratic curve into the row (12px wide for branches, 16px for leaves). It adds a tail below when the row has a next sibling, and a bridge down from the icon when the row itself is expanded. Each axis sits at `calc(1.125rem + depth × 1.25rem)`.',
    'A capture-phase `onKeyDownCapture` on a `display: contents` wrapper completes Right Arrow (Left Arrow in RTL) on an already-expanded row: it finds the next row in DOM order with a deeper `aria-level`, skips disabled and exiting rows, and focuses it. React Aria handles expanding closed branches and every other key.',
  ],

  constants: [
    {
      name: 'indent step',
      value: '1.25rem (20px) per level, from a 0.5rem base',
      why: 'The guide axes use the same 1.25rem step offset by 1.125rem, which centres each trunk under its parent\'s chevron. Change one and the lines stop lining up with the icons.',
    },
    {
      name: 'row animation',
      value: '0.28s, ease [0.22, 1, 0.36, 1], y −4px, blur 4px',
      why: 'A strong ease-out lets the height open quickly and settle softly. The small upward offset and blur make children look as if they slide out from under the parent rather than being inserted.',
    },
    {
      name: 'row heights',
      value: 'min-h-9 (36px) md, min-h-8 (32px) sm',
      why: 'Matches the kit\'s menu item heights, so a tree in a sidebar lines up with menus and nav items next to it.',
    },
    {
      name: 'elbow',
      value: 'quadratic curve, 6px radius; branch 12px wide, leaf 16px',
      why: 'Branches have a 20px chevron button before the icon and leaves only a spacer, so the elbow length differs to land right at each icon.',
    },
  ],

  pitfalls: [
    'Do not animate rows with CSS `height` transitions on the Aria items. A collapsed child is removed from the collection immediately, so there is nothing left to animate. The exit only works because `AnimatePresence` keeps the motion wrapper and the row keeps its last tree state.',
    'Do not leave exiting rows focusable. Without `inert` and `aria-hidden`, arrow keys and screen readers would land on rows that are already gone from the tree.',
    'Do not reuse ids across the tree. React Aria keys expansion, selection and the guide walk on `id`, so duplicates confuse all three.',
    'Do not forget `aria-label` or `aria-labelledby` on `TreeView`. React Aria warns when a tree has no accessible name.',
    'Do not force the custom renderer when using drag and drop or a virtualizer. The component already falls back to the parent renderer in those cases.',
  ],

  notes: [
    'For data-driven trees, pass `items` and render recursively with the re-exported `TreeViewCollection` (React Aria `Collection`).',
    'Set `showGuides={false}` to hide every line with one `group-data-[show-guides=false]` rule, leaving plain indentation.',
    'The tree grows with its content and does not scroll itself. Wrap it in a scroll container if it lives in a fixed-height sidebar.',
  ],

  apiSignature:
    'function TreeView<T extends object>(props: AriaTreeProps<T> & { size?: "sm" | "md"; showGuides?: boolean; onKeyDownCapture?: KeyboardEventHandler<HTMLDivElement>; ref?: Ref<HTMLDivElement> }): JSX.Element\nfunction TreeViewItem<T extends object = object>(props: Omit<AriaTreeItemProps<T>, "textValue" | "children"> & { label: string; textValue?: string; icon?: IconComponent | null; expandedIcon?: IconComponent; iconClassName?: string; trailingContent?: ReactNode; children?: ReactNode; ref?: Ref<HTMLDivElement> }): JSX.Element\nexport { Collection as TreeViewCollection } from "react-aria-components"',

  props: [
    { name: 'size', type: '"sm" | "md"', default: '"md"', description: '36px or 32px rows. Small also drops the label to the 13px body-2 style.' },
    { name: 'showGuides', type: 'boolean', default: 'true', description: 'Draws trunk lines and curved branches beside nested rows.' },
    { name: 'selectionMode', type: '"none" | "single" | "multiple"', default: '"single"', description: 'React Aria selection mode. Selected rows use the same tint as hover.' },
    { name: 'defaultExpandedKeys / expandedKeys', type: 'Iterable<Key>', description: 'Uncontrolled or controlled set of open branches.' },
    { name: 'TreeViewItem.label', type: 'string', description: 'Visible label, also the default `textValue` for typeahead and accessible naming.' },
    { name: 'TreeViewItem.icon', type: 'IconComponent | null', description: 'Defaults to folder for branches and file for leaves. `null` hides it.' },
    { name: 'TreeViewItem.iconClassName', type: 'string', description: 'Extra classes for the icon, typically a colour such as `text-accent-700`.' },
    { name: 'TreeViewItem.trailingContent', type: 'ReactNode', description: 'Metadata at the end of the row in caption type, such as a size or count.' },
  ],

  reducedMotion:
    'With `useReducedMotion()` true the rows skip the entry animation (`initial={false}`), exit with no offset or blur, and the transition duration becomes 0, so branches open and close instantly. The chevron rotation and colour transitions have `motion-reduce:transition-none`.',

  cleanup:
    'Nothing to release manually. `AnimatePresence` unmounts exiting rows when their exit animation finishes, and motion stops any running animation when the tree unmounts. There are no listeners outside React.',

  acceptance:
    'With `src` and `components` expanded, nested rows are indented 20px per level and joined to their parent by thin lines with rounded elbows. The last child\'s elbow closes its level with no tail. Collapsing a folder makes its children shrink, fade and blur out over about 0.3s while the open-folder icon switches back to a closed folder and the chevron rotates back. Expanding animates them in. Clicking a row selects it with a tinted background. Arrow keys move between rows, Right on a closed folder opens it and Right on an open folder moves to its first child.',

  criticalRegion: 'critical',
};

export default meta;
