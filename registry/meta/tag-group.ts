import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'tag-group',
  title: 'Tag Group',
  category: 'display',
  kit: 'boardui',
  tags: ['tags', 'tag-group', 'filter', 'selection', 'react-aria', 'boardui'],
  blurb: 'Selectable or removable tags in Chip\'s colours, with grid keyboard navigation and an empty state, on React Aria\'s TagGroup.',
  cost: 'css',
  motif: 'grid',

  files: [
    {
      path: 'registry/ui/tag-group.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['@remixicon/react@^4.9.0', 'react-aria-components@^1.22.1'],

  summary:
    'A set of tags to filter by, pick from or prune: topics, labels on a ticket, recipients. `TagGroup` wraps React Aria\'s `TagGroup` and `TagList` with the kit Label, hint text and an optional empty state; `Tag` wraps React Aria\'s `Tag` in Chip\'s colour pairs at 28px, or 24px with `size="small"`. Give the group a `selectionMode` and tags toggle, a selected tag filling with the accent colour; give it `onRemove` and every tag grows a small close button, while Backspace or Delete removes the focused tag. Because it is a React Aria grid, Tab enters once and the arrow keys move between tags.',

  mechanism: [
    '`TagGroup` renders `AriaTagGroup` (`flex flex-col items-start gap-1.5`) with every React Aria prop passed through, then the kit `Label`, an `AriaTagList` (`flex flex-wrap gap-1.5`) and an optional `HintText`.',
    'The list takes `items` for data-driven tags, and `renderEmptyState` is set only when `emptyState` is given, rendering it as `text-body-regular text-text-tertiary`.',
    'The group\'s `size` goes into a `SizeContext`, so each `Tag` reads it without a prop: medium is `h-7 px-2 text-body-medium`, small is `h-6 px-1.5 text-caption-1-medium`.',
    '`Tag` styles itself from React Aria\'s render props. `isSelected` swaps the Chip colour for `bg-accent-500 text-white`; a selectable, unselected tag on hover darkens (`bg-background-tertiary-hover` for neutral, `brightness-95` for the colours); `isFocusVisible` adds a 2px focus ring; `isDisabled` drops to 50%.',
    'When `allowsRemoving` is true (the group has `onRemove`), the tag trims its end padding and renders an `AriaButton slot="remove"` with `RiCloseLine` at 60% opacity, lifting to 100% with a `bg-current/15` wash on hover.',
    '`textValue` defaults to the children when they are a plain string, so typeahead and screen readers get a label without extra props.',
  ],

  constants: [
    {
      name: 'tag height',
      value: 'medium h-7 (28px) px-2; small h-6 (24px) px-1.5',
      why: 'Matches Chip, so a tag and a static chip in the same row line up.',
    },
    {
      name: 'selected fill',
      value: 'bg-accent-500 text-white',
      why: 'One accent fill for every selected tag, whatever its resting colour, so selection reads the same across a coloured set.',
    },
    {
      name: 'transition',
      value: 'background-color, color, box-shadow, filter over 150ms ease-out',
      why: 'Covers the selection fill, the hover brightness and the focus ring without animating layout.',
    },
    {
      name: 'remove button',
      value: 'size-5 (size-4 small), opacity 0.6 → 1 on hover',
      why: 'Quiet until pointed at, so a row of removable tags still reads as labels first.',
    },
  ],

  pitfalls: [
    'Give the group a `label` or an `aria-label`. React Aria\'s TagGroup is a grid and needs an accessible name.',
    'When tags are not plain strings (an icon plus text in a fragment, a formatted value), pass `textValue` so typeahead and screen readers have text.',
    'Removing is your state change. `onRemove` hands you the keys; filter them out of your list, or nothing disappears.',
    'With `items`, give each item an `id` (or a `key`) so React Aria can track it.',
    'Do not nest your own buttons or links in a tag. The only control inside is the remove button React Aria wires up.',
  ],

  notes: [
    'Colours come straight from Chip\'s exported `CHIP_COLORS`, so tags and chips stay one palette.',
    'Selection is React Aria\'s: `selectionMode` "single" or "multiple" with `selectedKeys` / `defaultSelectedKeys` and `onSelectionChange`.',
  ],

  apiSignature:
    'type TagSize = "medium" | "small"\ninterface TagGroupProps<T extends object> extends Omit<AriaTagGroupProps, "className" | "children"> { label?: ReactNode; hint?: ReactNode; emptyState?: ReactNode; size?: TagSize; items?: Iterable<T>; children: ReactNode | ((item: T) => ReactNode); className?: string }\ninterface TagProps extends Omit<AriaTagProps, "className" | "children"> { color?: ChipColor; icon?: ComponentType<{ className?: string }>; className?: string; children: ReactNode }\nfunction TagGroup<T extends object>(props: TagGroupProps<T>): JSX.Element\nfunction Tag(props: TagProps): JSX.Element',

  props: [
    { name: 'label', type: 'ReactNode', description: 'TagGroup: visible label above the tags.' },
    { name: 'hint', type: 'ReactNode', description: 'TagGroup: helper text under the tags.' },
    { name: 'emptyState', type: 'ReactNode', description: 'TagGroup: shown in place of the tags when the list is empty.' },
    { name: 'size', type: '"medium" | "small"', default: '"medium"', description: 'TagGroup: 28px or 24px tags.' },
    { name: 'items', type: 'Iterable<T>', description: 'TagGroup: data for a children render function.' },
    { name: 'selectionMode', type: '"none" | "single" | "multiple"', default: '"none"', description: 'TagGroup: lets tags toggle (React Aria).' },
    { name: 'selectedKeys / defaultSelectedKeys', type: 'Iterable<Key> | "all"', description: 'TagGroup: controlled or uncontrolled selection (React Aria).' },
    { name: 'onRemove', type: '(keys: Set<Key>) => void', description: 'TagGroup: turns on remove buttons and Backspace/Delete (React Aria).' },
    { name: 'color', type: 'ChipColor', default: '"neutral"', description: 'Tag: one of Chip\'s colour pairs.' },
    { name: 'icon', type: 'ComponentType', description: 'Tag: Remix Icon before the label.' },
    { name: 'id', type: 'Key', description: 'Tag: key used for selection and removal.' },
  ],

  reducedMotion:
    'Only colour, shadow and filter transition, over 150ms, and nothing moves. There is no reduced-motion branch because there is no spatial motion to remove.',

  cleanup: 'Nothing to clean up. React Aria owns focus, selection and keyboard handling; the component adds no listeners or timers.',

  acceptance:
    'A "Topics" group with `selectionMode="multiple"` and Design and Engineering selected shows two accent-filled tags among neutral ones. Clicking Marketing fills it; Tab focuses the group once and the arrow keys walk the tags with a visible ring. A group with `onRemove` shows a faint close icon in each tag that brightens on hover; clicking it, or pressing Delete on a focused tag, calls `onRemove` with that key. When the last tag is removed the empty state text appears in its place. `size="small"` renders 24px tags.',

  criticalRegion: 'critical',
};

export default meta;
