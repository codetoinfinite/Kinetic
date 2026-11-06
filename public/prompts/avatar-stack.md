# Build: Avatar Stack

The assignee cluster from the project board cards: kit avatars overlap by a quarter of their width, each wearing a 2px ring in the surface colour so the stack reads as cut-outs. Past `max`, the remaining people collapse into a "+N" disc whose tooltip lists them. Every disc is a tab stop with a name tooltip, and the group announces everyone in its label.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Overlapping assignee discs with surface-coloured rings, a +N overflow disc and a name tooltip on every avatar.

- Category: display
- Runtime cost: css
- Dependencies: react-aria-components@^1.22.1

## How it works

1. People render left to right as kit `Avatar`s with negative inline-start margins (`-ms-1.5` for xs/sm, `-ms-2` for md, `-ms-2.5` for lg) on every disc after the first. The root is `isolate`, so the hover/focus `z-10` lift stays inside the stack instead of leaking over neighbouring UI.
2. The ring is `ring-2` plus `ringClassName` (default `ring-background-primary-default`). Matching it to the surface underneath is what makes the overlap look like a cut-out rather than a border; pass the column colour when the stack sits on a non-white surface.
3. Overflow rule: with `limit = max(1, max)`, the stack only collapses when `people.length > limit + 1`. Replacing the last avatar with "+1" saves no space and hides a face, so four people at `max = 3` show all four, while five show three discs plus "+2".
4. Each disc is wrapped as `TooltipTrigger` (150ms delay) → RAC `Focusable` → `Avatar` with `role="img"` and `aria-label` set to the name. `Focusable` makes the disc keyboard reachable and wires hover/focus to the kit `Tooltip` (placement top, name plus optional `description` line). `tooltips={false}` drops the triggers, so discs stop being tab stops.
5. The "+N" disc is a `button` when `onOverflowPress` is set (e.g. to expand the list or open a member popover) and a `span role="img"` otherwise. Both carry `aria-label="N more: names"`; its tooltip lists the hidden names one per line.
6. Without an explicit `color`, a person's initial tint comes from a djb2 hash of the name over blue, lime, pink and neutral (`tintOf`), so the same person keeps the same colour on every card. `initialsOf` takes the first letters of the first two words.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `overlap = xs/sm 6px, md 8px, lg 10px`
  About a quarter of the disc width, matched by eye to the board card's 20–24px avatars. More overlap hides initials; less stops reading as one group.
- `ring = 2px, surface colour`
  Wide enough to separate two discs of the same tint, thin enough that the initials stay centred in the visible area.
- `collapse threshold = people.length > max + 1`
  Never shows "+1": a counter that hides one person takes the same room as that person's avatar.
- `tooltip delay = 150ms`
  Fast enough to scrub across the stack and read names, slow enough not to flash when the pointer crosses a card.
- `hover lift = -translate-y-0.5 over 150ms ease-out`
  A 2px nudge plus `z-10` brings the hovered face above its neighbour so its full disc is visible while its tooltip shows.

## API

```ts
function AvatarStack(props: Omit<HTMLAttributes<HTMLDivElement>, "children"> & { people: readonly AvatarStackPerson[]; max?: number; size?: "xs" | "sm" | "md" | "lg"; tooltips?: boolean; ringClassName?: string; label?: string; onOverflowPress?: () => void; ref?: Ref<HTMLDivElement> }): JSX.Element
interface AvatarStackPerson { id?: string; name: string; initials?: string; color?: AvatarProps["color"]; src?: string; description?: string }
function initialsOf(name: string): string
function tintOf(name: string): AvatarProps["color"]
```

- `people: readonly AvatarStackPerson[]`
  Who to show, in order. `id` is the key (falls back to `name`).
- `max: number` — default `3`
  Discs shown before the rest collapse into "+N". Collapses only when two or more would hide.
- `size: "xs" | "sm" | "md" | "lg"` — default `"sm"`
  Kit avatar size; overlap and the "+N" disc scale with it.
- `tooltips: boolean` — default `true`
  Name tooltips on hover and focus. Off removes the tab stops too.
- `ringClassName: string` — default `"ring-background-primary-default"`
  Ring colour; set it to the surface the stack sits on.
- `label: string` — default `"Assignees"`
  Prefix of the group's accessible name, followed by every name.
- `onOverflowPress: () => void`
  Turns the "+N" disc into a button.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function AvatarStack({
  people,
  max = 3,
  size = "sm",
  tooltips = true,
  ringClassName = "ring-background-primary-default",
  label = "Assignees",
  onOverflowPress,
  className,
  ref,
  ...props
}: AvatarStackProps) {
  // Showing "+1" in place of the last avatar saves no room, so only collapse
  // when at least two people would hide.
  const limit = Math.max(1, max);
  const visibleCount = people.length > limit + 1 ? limit : people.length;
  const shown = people.slice(0, visibleCount);
  const hidden = people.slice(visibleCount);
  const names = people.map((p) => p.name);

  const discClass = (index: number) => cx(styles.disc, ringClassName, index > 0 && styles.overlap[size]);

  const overflowDisc = hidden.length > 0 && (
    <OverflowDisc
      count={hidden.length}
      names={hidden.map((p) => p.name)}
      className={cx(
        discClass(shown.length),
        styles.overflow[size],
        "inline-flex shrink-0 select-none items-center justify-center rounded-full bg-background-tertiary-default text-text-secondary",
      )}
      tooltips={tooltips}
      onPress={onOverflowPress}
    />
  );

  return (
    <div
      ref={ref}
      role="group"
      aria-label={people.length ? `${label}: ${names.join(", ")}` : `${label}: none`}
      className={cx("inline-flex shrink-0 items-center isolate", className)}
      {...props}
    >
      {shown.map((person, i) => {
        const disc = (
          <Avatar
            key={person.id ?? person.name}
            size={size}
            color={person.color ?? tintOf(person.name)}
            src={person.src}
            alt=""
            initials={person.initials ?? initialsOf(person.name)}
            role="img"
            aria-label={person.name}
            className={discClass(i)}
          />
        );
        if (!tooltips) return disc;
        return (
          <TooltipTrigger key={person.id ?? person.name} delay={150}>
            <Focusable>{disc}</Focusable>
            <Tooltip placement="top">
              <span className="block">{person.name}</span>
              {person.description && <span className="block text-text-secondary">{person.description}</span>}
            </Tooltip>
          </TooltipTrigger>
        );
      })}
      {overflowDisc}
    </div>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** No effects, timers or listeners of its own. Tooltip open/close timers belong to the kit Tooltip (React Aria) and are released when a trigger unmounts.

**Reduced motion.** The 2px hover lift and its transform transition are removed with `motion-reduce:transition-none` and `motion-reduce:hover:translate-y-0`; the z-index raise and tooltips still work.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Leaving the ring on its white default when the stack sits on a grey column or a dark tinted surface: the rings then read as white outlines. Pass `ringClassName` for that surface.
- Dropping `isolate` from the root. The raised `z-10` disc can then paint over sticky headers or popovers that share the stacking context.
- Using array indexes as keys. People join and leave cards; keys come from `id` and fall back to `name`.
- Hiding names behind colour only. Each disc keeps `role="img"` and its name as `aria-label`, and the group label lists everyone, so screen readers do not depend on the tooltip.

## Notes

- Kanban Card uses this for the top-right assignee cluster at `size="xs"` with `max={3}`.
- Photos work through `src`, but the demo uses initials only so it ships without remote images.
- Below 640px the demo shows only the ticket and its assignee list so it fits a phone screen; the Sizes panel joins it from `sm` up.

## Definition of done

Five assignees at max 3 render three overlapping discs plus "+2"; four render all four with no counter. Hovering or tabbing to a disc raises it and shows a tooltip with the name and role. In the demo, unchecking teammates shrinks the stack and updates "N assigned"; pressing "+N" expands the stack to show everyone and "Collapse" folds it back. Rings match the card in both light and dark themes.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
