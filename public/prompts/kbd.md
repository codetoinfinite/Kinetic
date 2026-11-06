# Build: Kbd

A one-element component: a native `<kbd>` styled as a small neutral pill with 12px semibold type. It is the shortcut hint the kit puts on the sidebar's Quick Search row (`⌘L`) and on command-palette rows, and it takes any `<kbd>` attribute through, so the caller decides the label and the accessible text.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A fully rounded keyboard-shortcut pill on a semantic <kbd>, 20px tall, for search triggers, menus and command rows.

- Category: display
- Runtime cost: css
- Dependencies: none beyond React

## How it works

1. Render a native `<kbd>` element, not a `<span>`, so assistive tech and copy-paste both know the text is a key. All `HTMLAttributes<HTMLElement>` spread onto it and React 19's `ref` arrives as an ordinary prop.
2. Shape it with `inline-flex items-center justify-center rounded-full px-1 py-0.5`: 4px side padding, 2px top and bottom, and a full radius so a one-glyph key reads as a lozenge and a chord such as `⌘K` stretches into a pill.
3. Set type with the kit's `text-caption-1-semibold` (12px, 16px line height, weight 600) plus `font-sans`, `tracking-normal` and `whitespace-nowrap`, so the pill is 20px tall and a chord never wraps between its keys.
4. Colour it with two semantic tokens, `bg-kbd-background` and `text-kbd-foreground`. Light maps them to neutral-300 / neutral-500, dark to neutral-700 / neutral-400, so the hint stays quiet on either theme without a `dark:` class.
5. Merge the caller's `className` last through `cx` (the kit's `tailwind-merge` instance), so a consumer `px-1.5` replaces `px-1` instead of both landing in the class list.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `padding = px-1 py-0.5 (4px / 2px)`
  From the Figma quick-search shortcut (node 3731:2955). With the 16px line height this gives a 20px pill, short enough to sit inside a 36px search row or a 32px menu item without stretching it.
- `type style = text-caption-1-semibold: 12px / 16px, weight 600`
  Semibold keeps glyphs such as ⌘ and ⇧ legible at 12px on a low-contrast fill; regular weight blurs into the background.
- `colours = light neutral-300 on neutral-500 text; dark neutral-700 on neutral-400 text`
  A hint must sit below the label it annotates. Both pairs are deliberately low contrast against the surface so the shortcut reads as secondary information.

## API

```ts
interface KbdProps extends HTMLAttributes<HTMLElement> { ref?: Ref<HTMLElement> }
function Kbd(props: KbdProps): JSX.Element
```

- `children: ReactNode`
  The key or chord to show, e.g. `⌘K` or `Esc`.
- `className: string`
  Merged through `tailwind-merge`, so conflicting utilities replace the defaults.
- `ref: Ref<HTMLElement>`
  Forwarded to the `<kbd>` element (React 19 ref-as-prop).

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function Kbd({ className, ref, ...props }: KbdProps) {
  return (
    <kbd
      ref={ref}
      className={cx(
        "inline-flex items-center justify-center rounded-full bg-kbd-background px-1 py-0.5 font-sans text-caption-1-semibold tracking-normal whitespace-nowrap text-kbd-foreground",
        className,
      )}
      {...props}
    />
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing to clean up. The component is stateless markup with no listeners, timers or effects.

**Reduced motion.** Nothing animates. The pill is static markup, so it renders identically under `prefers-reduced-motion: reduce`.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Do not swap `<kbd>` for a `<span>`. The element is the semantics: screen readers and reader modes treat it as keyboard input.
- Do not hard-code neutral colours on the pill. Use `bg-kbd-background` / `text-kbd-foreground`, or the dark theme gets a light chip on a dark row.
- Do not drop `whitespace-nowrap`. In a narrow sidebar a chord like `⌘ ⇧ P` would wrap one key per line.
- Do not rely on a bare symbol for meaning when it matters. `⌘` is announced inconsistently, so add `aria-label` (as the command palette does with "Enter") where the key name must be spoken.

## Notes

- Used inside the kit by `dashboard-sidebar` (the `⌘L` Quick Search hint) and `command-palette` (the Enter key and per-row shortcuts).
- One `Kbd` per chord is the kit's convention (`<Kbd>⌘L</Kbd>`). Render several pills side by side only for sequences such as G then I.

## Definition of done

A `<Kbd>⌘K</Kbd>` renders as a `<kbd>` element 20px tall with 4px side padding, a full radius and 12px semibold text, using neutral-300 fill and neutral-500 text in light mode and neutral-700 / neutral-400 in dark mode. A long chord stays on one line, and a `className` such as `px-2` replaces the default horizontal padding.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
