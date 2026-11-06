# Build: Link Button

An inline text action sized on the same scale as `Button` but without a fill, border or shadow: just the label and optional icons. Passing `href` renders an `<a>`; leaving it out renders a `<button type="button">`, so the same visual works for "Learn more" copy links and for handler-driven actions like "Resend code". The props type is a discriminated union, so anchor-only and button-only attributes are checked against the element actually rendered.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Container-less text action that renders an anchor with href or a button without, with an underline as its only hover cue.

- Category: action
- Runtime cost: css
- Dependencies: none beyond React

## How it works

1. `LinkButtonProps` is `LinkButtonAnchorProps | LinkButtonButtonProps`, discriminated on `href` (a string versus `undefined`). At runtime the component checks `props.href !== undefined` and destructures the matching attribute set, so `ref` is typed to `HTMLAnchorElement` or `HTMLButtonElement` correctly.
2. Hover never changes colour. `hover:underline` with `underline-offset-3` is the whole hover state; only `:active` darkens (accent 600 to 800 for primary, secondary to primary text for secondary). A link that changes colour and gains an underline at once reads as two states flickering.
3. Disabled is handled per element. A `<button>` gets the native `disabled` attribute. An `<a>` cannot be disabled natively, so the component drops its `href` (an anchor without `href` is not focusable and not clickable) and sets `aria-disabled`. Both paths style to `text-text-tertiary` with no underline.
4. Sizes only change type and icon size, never padding: medium and small are Body 1 Medium with 20 or 18px icons, xs is Caption 1 Semibold with 14px icons. `rounded-sm` exists only so the 2px offset focus ring has soft corners around the text.
5. Icons are component props drawn at the tier's size with `aria-hidden`; arrows get `rtl:rotate-180` via `directionalIconClass`, so a trailing "→" points the reading direction in RTL.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `underline offset = 3px (underline-offset-3)`
  Clears descenders on the 14px body style so "g" and "y" do not collide with the line, while keeping the underline visually attached to the word.
- `icon sizes = 20 / 18 / 14 px (medium / small / xs)`
  Same steps as `Button`, so a link button and a button with the same label and size have matching glyphs.
- `transition = colors 150ms ease`
  Only the press colour animates. The underline toggles instantly, which is how text links behave everywhere else.

## API

```ts
type LinkButtonProps = LinkButtonAnchorProps | LinkButtonButtonProps
function LinkButton(props: LinkButtonProps): JSX.Element
// shared: { variant?: "primary" | "secondary"; size?: "medium" | "small" | "xs"; leadingIcon?: IconComponent; trailingIcon?: IconComponent; children?: ReactNode; className?: string; disabled?: boolean }
// anchor: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children" | "className"> & { href: string; ref?: Ref<HTMLAnchorElement> }
// button: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className"> & { href?: undefined; ref?: Ref<HTMLButtonElement> }
const linkButtonStyles: { base: string; size: Record<Size, string>; icon: Record<Size, string>; variant: Record<Variant, string> }
```

- `href: string`
  When set, renders an `<a>`. When omitted, renders a `<button type="button">`.
- `variant: "primary" | "secondary"` — default `"primary"`
  Accent text (primary) or secondary text colour (secondary).
- `size: "medium" | "small" | "xs"` — default `"medium"`
  Type style and icon size: 14px Body Medium with 20 or 18px icons, or 12px Caption Semibold with 14px icons.
- `leadingIcon: ComponentType<{ className?: string }>`
  Icon component drawn before the label.
- `trailingIcon: ComponentType<{ className?: string }>`
  Icon component drawn after the label, typically an arrow.
- `disabled: boolean` — default `false`
  Native `disabled` on the button form. On the anchor form, removes `href` and sets `aria-disabled`.
- `className: string`
  Merged through `tailwind-merge`.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function LinkButton({
  variant = "primary",
  size = "medium",
  leadingIcon: Leading,
  trailingIcon: Trailing,
  children,
  className,
  disabled = false,
  ...props
}: LinkButtonProps) {
  const classes = cx(styles.base, styles.size[size], styles.variant[variant], className);
  const content = (
    <>
      {Leading ? <Leading className={cx(styles.icon[size], directionalIconClass(Leading))} aria-hidden /> : null}
      {children !== undefined && children !== null && <span>{children}</span>}
      {Trailing ? <Trailing className={cx(styles.icon[size], directionalIconClass(Trailing))} aria-hidden /> : null}
    </>
  );

  if (props.href !== undefined) {
    const { ref, href, ...anchorProps } = props as LinkButtonAnchorProps;
    return (
      <a
        ref={ref}
        href={disabled ? undefined : href}
        aria-disabled={disabled || undefined}
        className={classes}
        {...anchorProps}
      >
        {content}
      </a>
    );
  }

  const { ref, type = "button", ...buttonProps } = props as LinkButtonButtonProps;
  return (
    <button ref={ref} type={type} disabled={disabled} className={classes} {...buttonProps}>
      {content}
    </button>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing to clean up. The component is stateless markup with no listeners, timers or effects.

**Reduced motion.** Nothing moves. The only transition is a 150ms colour change on press.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Passing `disabled` and expecting an anchor to keep its `href`. The component removes it on purpose; if the link must stay discoverable, render it enabled and explain the restriction nearby.
- Using the button form (no `href`) for navigation. Middle-click, "open in new tab" and the hover URL preview only work on a real anchor.
- Adding `hover:text-…` from outside. The design relies on the underline as the only hover cue, and a colour change on top makes inline links in paragraphs look like they are flashing.
- Wrapping it in another `<a>` or `<button>`. It already renders an interactive element, and nested interactive content is invalid HTML.

## Notes

- `linkButtonStyles` is exported so a router link component can share the exact classes, for example `<Link className={cx(linkButtonStyles.base, linkButtonStyles.variant.primary)}>`.

## Definition of done

Primary links render in the accent colour and secondary ones in secondary text, with no box around them. Hovering underlines the label without changing its colour, and pressing darkens it. The trailing arrow sits 4px after the label and, in RTL, points left. The disabled link is grey, shows no underline on hover, cannot be clicked and is skipped by Tab. Tabbing to an enabled one shows a ring with slightly rounded corners around the text.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
