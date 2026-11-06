# Build: Tag Group

A set of tags to filter by, pick from or prune: topics, labels on a ticket, recipients. `TagGroup` wraps React Aria's `TagGroup` and `TagList` with the kit Label, hint text and an optional empty state; `Tag` wraps React Aria's `Tag` in Chip's colour pairs at 28px, or 24px with `size="small"`. Give the group a `selectionMode` and tags toggle, a selected tag filling with the accent colour; give it `onRemove` and every tag grows a small close button, while Backspace or Delete removes the focused tag. Because it is a React Aria grid, Tab enters once and the arrow keys move between tags.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Selectable or removable tags in Chip's colours, with grid keyboard navigation and an empty state, on React Aria's TagGroup.

- Category: display
- Runtime cost: css
- Dependencies: @remixicon/react@^4.9.0, react-aria-components@^1.22.1

## How it works

1. `TagGroup` renders `AriaTagGroup` (`flex flex-col items-start gap-1.5`) with every React Aria prop passed through, then the kit `Label`, an `AriaTagList` (`flex flex-wrap gap-1.5`) and an optional `HintText`.
2. The list takes `items` for data-driven tags, and `renderEmptyState` is set only when `emptyState` is given, rendering it as `text-body-regular text-text-tertiary`.
3. The group's `size` goes into a `SizeContext`, so each `Tag` reads it without a prop: medium is `h-7 px-2 text-body-medium`, small is `h-6 px-1.5 text-caption-1-medium`.
4. `Tag` styles itself from React Aria's render props. `isSelected` swaps the Chip colour for `bg-accent-500 text-white`; a selectable, unselected tag on hover darkens (`bg-background-tertiary-hover` for neutral, `brightness-95` for the colours); `isFocusVisible` adds a 2px focus ring; `isDisabled` drops to 50%.
5. When `allowsRemoving` is true (the group has `onRemove`), the tag trims its end padding and renders an `AriaButton slot="remove"` with `RiCloseLine` at 60% opacity, lifting to 100% with a `bg-current/15` wash on hover.
6. `textValue` defaults to the children when they are a plain string, so typeahead and screen readers get a label without extra props.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `tag height = medium h-7 (28px) px-2; small h-6 (24px) px-1.5`
  Matches Chip, so a tag and a static chip in the same row line up.
- `selected fill = bg-accent-500 text-white`
  One accent fill for every selected tag, whatever its resting colour, so selection reads the same across a coloured set.
- `transition = background-color, color, box-shadow, filter over 150ms ease-out`
  Covers the selection fill, the hover brightness and the focus ring without animating layout.
- `remove button = size-5 (size-4 small), opacity 0.6 → 1 on hover`
  Quiet until pointed at, so a row of removable tags still reads as labels first.

## API

```ts
type TagSize = "medium" | "small"
interface TagGroupProps<T extends object> extends Omit<AriaTagGroupProps, "className" | "children"> { label?: ReactNode; hint?: ReactNode; emptyState?: ReactNode; size?: TagSize; items?: Iterable<T>; children: ReactNode | ((item: T) => ReactNode); className?: string }
interface TagProps extends Omit<AriaTagProps, "className" | "children"> { color?: ChipColor; icon?: ComponentType<{ className?: string }>; className?: string; children: ReactNode }
function TagGroup<T extends object>(props: TagGroupProps<T>): JSX.Element
function Tag(props: TagProps): JSX.Element
```

- `label: ReactNode`
  TagGroup: visible label above the tags.
- `hint: ReactNode`
  TagGroup: helper text under the tags.
- `emptyState: ReactNode`
  TagGroup: shown in place of the tags when the list is empty.
- `size: "medium" | "small"` — default `"medium"`
  TagGroup: 28px or 24px tags.
- `items: Iterable<T>`
  TagGroup: data for a children render function.
- `selectionMode: "none" | "single" | "multiple"` — default `"none"`
  TagGroup: lets tags toggle (React Aria).
- `selectedKeys / defaultSelectedKeys: Iterable<Key> | "all"`
  TagGroup: controlled or uncontrolled selection (React Aria).
- `onRemove: (keys: Set<Key>) => void`
  TagGroup: turns on remove buttons and Backspace/Delete (React Aria).
- `color: ChipColor` — default `"neutral"`
  Tag: one of Chip's colour pairs.
- `icon: ComponentType`
  Tag: Remix Icon before the label.
- `id: Key`
  Tag: key used for selection and removal.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function Tag({ color = "neutral", icon: Icon, className, children, ...props }: TagProps) {
  const size = useContext(SizeContext);

  return (
    <AriaTag
      {...props}
      textValue={props.textValue ?? (typeof children === "string" ? children : undefined)}
      className={({ isSelected, selectionMode, allowsRemoving, isHovered, isFocusVisible, isDisabled }) => {
        const allowsSelection = selectionMode !== "none";
        return cx(
          "inline-flex max-w-full items-center gap-1 rounded-lg outline-none",
          "transition-[background-color,color,box-shadow,filter] duration-150 ease-out",
          size === "small" ? "h-6 px-1.5 text-caption-1-medium" : "h-7 px-2 text-body-medium",
          allowsRemoving && (size === "small" ? "pe-0.5" : "pe-1"),
          isSelected ? "bg-accent-500 text-white" : CHIP_COLORS[color],
          allowsSelection ? "cursor-pointer" : "cursor-default",
          allowsSelection && !isSelected && isHovered && (color === "neutral" ? "bg-background-tertiary-hover" : "brightness-95"),
          isFocusVisible && "ring-2 ring-border-focus-ring",
          isDisabled && "cursor-not-allowed opacity-50",
          className,
        );
      }}
    >
      {({ allowsRemoving }) => (
        <>
          {Icon ? <Icon aria-hidden className={cx("shrink-0", size === "small" ? "size-3.5" : "size-4")} /> : null}
          <span className="truncate">{children}</span>
          {allowsRemoving ? (
            <AriaButton
              slot="remove"
              className={cx(
                "flex shrink-0 cursor-pointer items-center justify-center rounded-md opacity-60 outline-none",
                "transition-[opacity,background-color] duration-150 ease-out hover:bg-current/15 hover:opacity-100",
                size === "small" ? "size-4" : "size-5",
              )}
            >
              <RiCloseLine aria-hidden className={size === "small" ? "size-3" : "size-3.5"} />
            </AriaButton>
          ) : null}
        </>
      )}
    </AriaTag>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing to clean up. React Aria owns focus, selection and keyboard handling; the component adds no listeners or timers.

**Reduced motion.** Only colour, shadow and filter transition, over 150ms, and nothing moves. There is no reduced-motion branch because there is no spatial motion to remove.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Give the group a `label` or an `aria-label`. React Aria's TagGroup is a grid and needs an accessible name.
- When tags are not plain strings (an icon plus text in a fragment, a formatted value), pass `textValue` so typeahead and screen readers have text.
- Removing is your state change. `onRemove` hands you the keys; filter them out of your list, or nothing disappears.
- With `items`, give each item an `id` (or a `key`) so React Aria can track it.
- Do not nest your own buttons or links in a tag. The only control inside is the remove button React Aria wires up.

## Notes

- Colours come straight from Chip's exported `CHIP_COLORS`, so tags and chips stay one palette.
- Selection is React Aria's: `selectionMode` "single" or "multiple" with `selectedKeys` / `defaultSelectedKeys` and `onSelectionChange`.

## Definition of done

A "Topics" group with `selectionMode="multiple"` and Design and Engineering selected shows two accent-filled tags among neutral ones. Clicking Marketing fills it; Tab focuses the group once and the arrow keys walk the tags with a visible ring. A group with `onRemove` shows a faint close icon in each tag that brightens on hover; clicking it, or pressing Delete on a focused tag, calls `onRemove` with that key. When the last tag is removed the empty state text appears in its place. `size="small"` renders 24px tags.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
