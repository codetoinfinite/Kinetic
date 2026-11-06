# Build: GitHub Star Button

A compact pill button in the style of a repository star control, without any logo: a star glyph, a "Star" label and a count in an inset pill. Pressing it toggles starred: the outline star swaps to a filled amber one with a small springy pop, the label reads "Starred" and the count rolls up by one; pressing again rolls it back down.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A star toggle with a glyph, a Star label and a count pill. Starring pops the star and rolls the en-US formatted count by one.

- Category: action
- Runtime cost: dom
- Dependencies: react-aria-components@^1.22.1, motion@^12.43.0, @remixicon/react@^4.9.0

## How it works

1. React Aria `ToggleButton` owns the state semantics: it renders a native button with `aria-pressed`, handles pointer, keyboard and touch presses, and exposes `data-selected`, `data-hovered`, `data-pressed` and `data-focus-visible` for styling.
2. The shown total is `count + starred - defaultStarred`, so `count` is the number as loaded (including the viewer when they had already starred) and toggling moves it by exactly one in either direction.
3. The count is keyed by its value inside `AnimatePresence mode="popLayout"`. Each toggle stores a direction (+1 up, -1 down) and passes it as `custom`, so the old number exits upward while the new one enters from below on a star, and the reverse on an unstar. `popLayout` takes the exiting number out of flow so the two never stack.
4. The star glyph is a `motion.span` keyed by the starred state: starring remounts it from `scale 0.4, rotate -40deg` with a bouncy spring, unstarring from `scale 0.8` with no bounce.
5. All numbers use one `Intl.NumberFormat("en-US")`, so 999 to 1,000 gets its comma and the server and client strings always agree.
6. The accessible name is fixed text plus the current total ("Star kinetic, 12,481 stars"); the visible label and pill are `aria-hidden`, so the Star / Starred swap does not rename the control and `aria-pressed` carries the state.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `count roll = spring, 0.35s, bounce 0.2`
  Quick enough to feel like a counter tick, with a hint of overshoot so the new digit lands.
- `star pop = spring, 0.45s, bounce 0.55 from scale 0.4 / -40deg`
  Starring is the rewarding action and gets the expressive motion; unstarring settles without bounce.
- `press scale = 0.97`
  Tactile press feedback on `data-pressed` without shifting surrounding layout.

## API

```ts
function GithubStarButton(props: { count: number; defaultStarred?: boolean; onStarredChange?: (starred: boolean) => void; label?: string; starredLabel?: string; "aria-label"?: string; className?: string }): JSX.Element
```

- `count: number`
  Star total as loaded, including the viewer when `defaultStarred` is true.
- `defaultStarred: boolean` — default `false`
  Initial starred state.
- `onStarredChange: (starred: boolean) => void`
  Fires on every toggle.
- `label: string` — default `"Star"`
  Visible label when not starred.
- `starredLabel: string` — default `"Starred"`
  Visible label when starred.
- `aria-label: string`
  Accessible name; defaults to `label`. ", N stars" is appended.
- `className: string`
  Merged onto the button.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function GithubStarButton({
  count,
  defaultStarred = false,
  onStarredChange,
  label = "Star",
  starredLabel = "Starred",
  "aria-label": ariaLabel,
  className,
}: GithubStarButtonProps) {
  const reduce = useReducedMotion();
  const [starred, setStarred] = useState(defaultStarred);
  // +1 for "count went up", -1 for "went down"; drives which way the digits roll.
  const [dir, setDir] = useState(1);
  const total = count + Number(starred) - Number(defaultStarred);
  const formatted = numberFormat.format(total);

  const toggle = (next: boolean) => {
    setDir(next ? 1 : -1);
    setStarred(next);
    onStarredChange?.(next);
  };

  const Icon = starred ? RiStarFill : RiStarLine;

  return (
    <ToggleButton
      isSelected={starred}
      onChange={toggle}
      aria-label={`${ariaLabel ?? label}, ${formatted} stars`}
      className={cx(
        "group inline-flex h-9 items-center gap-2 rounded-xl bg-background-primary-default pr-1.5 pl-3 text-body-2-medium text-text-primary shadow-xs ring-1 ring-separator-border outline-none select-none",
        "cursor-pointer transition-[background-color,box-shadow,scale] duration-150 ease-out motion-reduce:transition-none",
        "data-hovered:bg-background-secondary-hover data-pressed:scale-[0.97] data-focus-visible:ring-2 data-focus-visible:ring-border-focus-ring",
        className,
      )}
    >
      <span className="relative grid size-4 place-items-center">
        {reduce ? (
          <Icon aria-hidden className={cx("size-4", starred ? "text-status-yellow-text" : "text-foreground-icon-secondary")} />
        ) : (
          <motion.span
            key={String(starred)}
            initial={{ scale: starred ? 0.4 : 0.8, rotate: starred ? -40 : 0 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", duration: 0.45, bounce: starred ? 0.55 : 0 }}
            className="grid place-items-center"
          >
            <Icon aria-hidden className={cx("size-4", starred ? "text-status-yellow-text" : "text-foreground-icon-secondary")} />
          </motion.span>
        )}
      </span>
      <span aria-hidden>{starred ? starredLabel : label}</span>
      <span
        aria-hidden
        data-count
        className="relative inline-flex h-6 items-center overflow-hidden rounded-lg bg-background-secondary-default px-2 text-caption-1-semibold text-text-secondary tabular-nums ring-1 ring-separator-border group-data-selected:text-text-primary"
      >
        {reduce ? (
          formatted
        ) : (
          <AnimatePresence mode="popLayout" initial={false} custom={dir}>
            <motion.span
              key={total}
              custom={dir}
              variants={roll}
              initial="enter"
              animate="center"
              exit="exit"
              transition={ROLL}
              className="inline-block"
            >
              {formatted}
            </motion.span>
          </AnimatePresence>
        )}
      </span>
    </ToggleButton>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** No timers or listeners. Motion stops any running spring when its element unmounts, and AnimatePresence removes the exiting number when its exit finishes.

**Reduced motion.** With `prefers-reduced-motion: reduce` (via `useReducedMotion`) the star and count render as plain elements without motion wrappers, so the glyph and number swap instantly; the press scale and colour transitions are removed with `motion-reduce:transition-none`.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Formatting with `toLocaleString()` and no locale. A German visitor sees "12.480" on the client after "12,480" from the server, which is a hydration mismatch; the locale is fixed to en-US.
- Computing the roll direction from the new value in the exit animation. The exiting element keeps its own props, so without `AnimatePresence custom` it exits using the previous toggle's direction.
- Changing the accessible name between "Star" and "Starred". A toggle button should keep its name and report state through `aria-pressed`.

## Notes

- Call your API in `onStarredChange`; the button updates optimistically and does not roll back on its own.
- For a real repo, link the surrounding card to GitHub and keep this control for in-app starring only.

## Definition of done

The first button reads "Star" with an outline star and 12,480. Clicking it sets aria-pressed="true", fills the star amber with a pop, changes the label to "Starred" and rolls the pill to 12,481 from below. Clicking again rolls back to 12,480 from above. The second button starts starred at 1,000 and unstarring rolls it to 999. Space and Enter toggle it from the keyboard with a visible focus ring. With reduced motion every change is instant.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
