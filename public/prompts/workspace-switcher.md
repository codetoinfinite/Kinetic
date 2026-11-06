# Build: Workspace Switcher

A workspace switcher for the head of a sidebar. The trigger is a full-width row showing the current workspace mark, name and plan with an up/down chevron. It opens a non-modal menu listing every workspace (mark, name, plan · detail) with a check on the current one, plus an optional "Create workspace" action in its own section. Choosing a workspace closes the menu and the trigger contents cross in with a short starting-style entrance.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Sidebar-top workspace menu: mark, name and plan on the trigger, a checked list of workspaces and a create-workspace row.

- Category: navigation
- Runtime cost: css
- Dependencies: react-aria-components@^1.22.1, @remixicon/react@^4.9.0

## How it works

1. React Aria MenuTrigger + Menu supply the menu semantics: arrow keys, Home/End, typeahead, Enter/Space to choose and Escape to close with focus back on the trigger.
2. The workspace rows live in a MenuSection with selectionMode="single", disallowEmptySelection and selectedKeys=[current], so they render as menuitemradio with aria-checked and the check icon reads isSelected from the item render props.
3. The create row sits in a second MenuSection with no selection mode and uses onAction, so it can never become the selected workspace.
4. The Popover is isNonModal so the page never scroll-locks; useDismissOnOutsidePress restores close-on-outside-press and useTriggerToggle swallows the spurious reopen when the open trigger is pressed again.
5. Value and open state are each controlled-or-uncontrolled: value/defaultValue/onChange and isOpen/onOpenChange.
6. The trigger mark and label are keyed by workspace id, so a switch remounts them and their @starting-style classes (starting:opacity-0, starting:translate-y-1, starting:scale-75) play a 200ms entrance.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `popover width = 280px`
  Room for a 32px mark plus a name and "plan · members" line without truncating typical names.
- `offset = 6px`
  Clears the trigger hover fill so the menu reads as attached, not overlapping.
- `entrance = 200ms ease-out, translate-y 4px / scale 0.75`
  Long enough to notice the switch, short enough not to delay reading the new name.

## API

```ts
function WorkspaceSwitcher(props: { workspaces: Workspace[]; value?: string; defaultValue?: string; onChange?: (id: string) => void; onCreateWorkspace?: () => void; createLabel?: string; sectionLabel?: string; isOpen?: boolean; onOpenChange?: (open: boolean) => void; "aria-label"?: string; className?: string }): JSX.Element | null
```

- `workspaces: Workspace[]`
  { id, name, plan, detail?, initials?, tone? } for every workspace; tone is the kit Avatar colour.
- `value: string`
  Controlled selected workspace id.
- `defaultValue: string` — default `workspaces[0].id`
  Initial id when uncontrolled.
- `onChange: (id: string) => void`
  Called with the newly chosen id (not when re-choosing the current one).
- `onCreateWorkspace: () => void`
  Shows the create row and runs when it is chosen.
- `createLabel: string` — default `"Create workspace"`
  Label of the create row.
- `sectionLabel: string` — default `"Workspaces"`
  Heading above the list, also the menu aria-label.
- `isOpen: boolean`
  Controlled open state.
- `onOpenChange: (open: boolean) => void`
  Open state change callback.
- `aria-label: string` — default `"Switch workspace"`
  Trigger name prefix; the current workspace name is appended.
- `className: string`
  Extra classes for the trigger.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
// The popover is non-modal (no scroll lock on <html>), which also turns off
// React Aria's outside-press dismissal: restore it, and make a press on the
// trigger while open close the menu instead of reopening it.
useDismissOnOutsidePress(isOpen, () => setOpen(false), [triggerRef, popoverRef]);
const allowOpenChange = useTriggerToggle(isOpen, triggerRef);

const select = (keys: Selection) => {
  if (keys === "all") return;
  const [next] = Array.from(keys as Set<Key>);
  if (next == null || String(next) === selectedId) return;
  setUncontrolledValue(String(next));
  onChange?.(String(next));
};
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The outside-press and trigger-toggle hooks add document pointerdown listeners only while open and remove them on close or unmount; there are no timers.

**Reduced motion.** The popover keeps its opacity fade from the kit surface but drops nothing else that moves; the trigger entrance, hover fills and check fade all use motion-reduce:transition-none, so a switch swaps contents instantly.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Put selection on the MenuSection, not the Menu: a Menu-level selectionMode would turn the create row into a selectable radio.
- isNonModal popovers lose React Aria outside-press dismissal; without useDismissOnOutsidePress the menu stays open when clicking the page.
- Key the trigger contents by id, not by name, or two workspaces with equal names will not replay the entrance.

## Notes

- The trigger accessible name is "<aria-label>: <current name>", so screen readers announce the current workspace before opening.
- Pass onCreateWorkspace to show the create row; omit it for a pick-only switcher.

## Definition of done

Clicking the trigger opens a menu of workspaces with exactly one checked; choosing another closes the menu and the trigger shows the new name and plan; Escape closes with focus on the trigger; arrow keys move between rows; "Create workspace" runs the callback and is never checked.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
