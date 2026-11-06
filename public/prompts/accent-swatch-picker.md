# Build: Accent Swatch Picker

The colour row under a composer preview: round, glossy swatches with an iridescent first option, chosen like radio buttons. `AccentScope` is the other half: it writes the chosen colour to one custom property, `--accent`, derives the kit's whole accent ramp from it with color-mix, and re-declares the tokens that read that ramp, so primary buttons, switches, focus rings and the swatch outline inside it all change colour together. The demo wires it to the kit Composer Loader, whose light band follows the swatch.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Glossy colour spheres in one keyboard radio group; the pick becomes one --accent property that re-tints kit controls in its scope.

- Category: form
- Runtime cost: css
- Dependencies: react-aria-components@^1.22.1

## How it works

1. Render a react-aria `RadioGroup` (`orientation="horizontal"`) whose `Radio`s are the swatches: one Tab stop, arrow keys move and select, `aria-label` names each colour. Each radio sets `--swatch` to its colour in inline style.
2. Paint the sphere as a stacked background: a white radial highlight at 32% 26% fading out by 42%, over a radial body that runs from the colour mixed 70% with white, to the colour at 52%, to the colour mixed 72% with black at the rim. A swatch with `fill` (the iridescent one) swaps the body for its own conic gradient. An inset shadow made from the colour darkens the bottom edge.
3. Show state on the sphere itself: a 2px outline at 2px offset is transparent until `data-selected`, then takes `var(--swatch)`; focus-visible switches it to `text-primary` so keyboard focus is never the same colour as the selection; hover scales to 1.05 and press to 0.95 over 150ms.
4. `AccentScope` puts `--accent: <colour>` on a div and, through arbitrary-property classes, sets `--color-accent-50…400` as color-mix toward white (8, 16, 32, 52, 78%), `500` to the accent, and `600…950` toward black (86, 70, 56, 42, 28%).
5. Because the kit's semantic tokens (`--gradient-button-primary-*`, `--color-border-focus-ring`, `--color-switch-on-chip-*`, `--color-button-ghost-*`, `--color-badge-new-*`) are resolved at :root, the scope re-declares each one with the same formula as the theme, with `dark:` variants where dark mode maps the ramp differently.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `sphere sizes = sm 24px · md 36px · lg 36px, 48px from 640px`
  The compact pill matches the floating 24px row; lg drops to 36px on phones so seven spheres still fit one line at 360px.
- `ramp mixes = 50→400: 8/16/32/52/78% accent in white; 600→950: 86/70/56/42/28% accent in black`
  Roughly tracks Tailwind's blue ramp lightness, so swapping the hue keeps the kit's contrast (ghost text on ghost fill, white on the button gradient).
- `selection outline = 2px at 2px offset (1px offset at sm)`
  A gap between sphere and ring reads as "selected" on any colour, including the iridescent one, without a check mark.

## API

```ts
function AccentSwatchPicker(props: { swatches?: AccentSwatch[]; value?: string; defaultValue?: string; onChange?: (id: string) => void; size?: "sm" | "md" | "lg"; variant?: "plain" | "pill"; label?: string; isDisabled?: boolean; className?: string }): JSX.Element
function AccentScope(props: { color: string; children?: ReactNode; className?: string }): JSX.Element
type AccentSwatch = { id: string; label: string; color: string; fill?: string }
```

- `swatches: AccentSwatch[]` — default `DEFAULT_ACCENT_SWATCHES`
  Iridescent, blue, violet, pink, red, green, orange: id, label, CSS colour and optional sphere fill.
- `value: string`
  Controlled selected swatch id.
- `defaultValue: string` — default `swatches[0].id`
  Initial id when uncontrolled.
- `onChange: (id: string) => void`
  Called with the newly selected id.
- `size: "sm" | "md" | "lg"` — default `"md"`
  Sphere size: 24px, 36px, or 36px rising to 48px from the sm breakpoint.
- `variant: "plain" | "pill"` — default `"plain"`
  `pill` places the row on a floating rounded surface with a border and shadow.
- `label: string` — default `"Accent colour"`
  Accessible name of the radio group.
- `isDisabled: boolean`
  Disables every swatch.
- `className: string`
  Merged onto the group.
- `AccentScope.color: string`
  Any CSS colour; written to `--accent` and expanded into the accent ramp for the subtree.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/**
 * The ramp: 50–400 mix the accent toward white, 600–950 toward black, 500 is
 * the accent itself. Then every semantic token that reads the ramp is
 * re-declared here so it resolves against the scoped ramp (dark mode keeps
 * the kit's own dark mapping for the ghost button and NEW badge).
 */
export const accentScopeClassName = [
  "[--color-accent-50:color-mix(in_oklab,var(--accent)_8%,white)]",
  "[--color-accent-100:color-mix(in_oklab,var(--accent)_16%,white)]",
  "[--color-accent-200:color-mix(in_oklab,var(--accent)_32%,white)]",
  "[--color-accent-300:color-mix(in_oklab,var(--accent)_52%,white)]",
  "[--color-accent-400:color-mix(in_oklab,var(--accent)_78%,white)]",
  "[--color-accent-500:var(--accent)]",
  "[--color-accent-600:color-mix(in_oklab,var(--accent)_86%,black)]",
  "[--color-accent-700:color-mix(in_oklab,var(--accent)_70%,black)]",
  "[--color-accent-800:color-mix(in_oklab,var(--accent)_56%,black)]",
  "[--color-accent-900:color-mix(in_oklab,var(--accent)_42%,black)]",
  "[--color-accent-950:color-mix(in_oklab,var(--accent)_28%,black)]",
  "[--color-border-focus-ring:var(--color-accent-500)]",
  "[--gradient-button-primary-default:linear-gradient(180deg,var(--color-accent-500)_0%,var(--color-accent-600)_100%)]",
  "[--gradient-button-primary-hover:linear-gradient(180deg,var(--color-accent-400)_0%,var(--color-accent-500)_100%)]",
  "[--gradient-button-primary-active:linear-gradient(180deg,var(--color-accent-600)_0%,var(--color-accent-700)_100%)]",
  "[--color-switch-on-chip-start:color-mix(in_oklab,var(--color-accent-500)_63%,var(--color-accent-600))]",
  "[--color-switch-on-chip-end:color-mix(in_oklab,var(--color-accent-600)_16%,var(--color-accent-700))]",
  "[--color-button-ghost-background:var(--color-accent-100)] dark:[--color-button-ghost-background:var(--color-accent-900)]",
  "[--color-button-ghost-hover:var(--color-accent-200)] dark:[--color-button-ghost-hover:var(--color-accent-800)]",
  "[--color-button-ghost-active:var(--color-accent-300)] dark:[--color-button-ghost-active:var(--color-accent-700)]",
  "[--color-button-ghost-foreground:var(--color-accent-700)] dark:[--color-button-ghost-foreground:var(--color-accent-300)]",
  "[--color-badge-new-background:var(--color-accent-100)] dark:[--color-badge-new-background:color-mix(in_srgb,var(--color-accent-950)_50%,transparent)]",
  "[--color-badge-new-text:var(--color-accent-600)] dark:[--color-badge-new-text:var(--color-accent-400)]",
].join(" ");

export interface AccentScopeProps {
  /** Any CSS colour: a palette variable, hex, oklch()… */
  color: string;
  children?: ReactNode;
  className?: string;
}

/** Re-tints every kit control inside it from one `--accent` value. */
export function AccentScope({ color, children, className }: AccentScopeProps) {
  return (
    <div style={{ "--accent": color } as CSSProperties} className={cx(accentScopeClassName, className)}>
      {children}
    </div>
  );
}

/** Glossy sphere: a light spot up-left, the colour, a darker rim. */
function sphereBackground(s: AccentSwatch) {
  const gloss =
    "radial-gradient(circle at 32% 26%, color-mix(in oklab, white 85%, transparent) 0%, color-mix(in oklab, white 0%, transparent) 42%)";
  if (s.fill) return `${gloss}, ${s.fill}`;
  return `${gloss}, radial-gradient(circle at 40% 35%, color-mix(in oklab, var(--swatch) 70%, white) 0%, var(--swatch) 52%, color-mix(in oklab, var(--swatch) 72%, black) 100%)`;
}

export function AccentSwatchPicker({
  swatches = DEFAULT_ACCENT_SWATCHES,
  value,
  defaultValue,
  onChange,
  size = "md",
  variant = "plain",
  label = "Accent colour",
  isDisabled,
  className,
}: AccentSwatchPickerProps) {
  return (
    <RadioGroup
      aria-label={label}
      orientation="horizontal"
      value={value}
      defaultValue={value === undefined ? (defaultValue ?? swatches[0]?.id) : undefined}
      onChange={onChange}
      isDisabled={isDisabled}
      className={cx(
        "flex w-fit flex-wrap items-center justify-center",
        GAP[size],
        variant === "pill" &&
          "rounded-full border border-border-button-default bg-background-primary-default p-1.5 shadow-md",
        className,
      )}
    >
      {swatches.map((s) => (
        <Radio
          key={s.id}
          value={s.id}
          aria-label={s.label}
          style={{ "--swatch": s.color } as CSSProperties}
          className={cx(
            "group relative shrink-0 cursor-pointer rounded-full outline-none",
            "data-disabled:cursor-not-allowed data-disabled:opacity-50",
          )}
        >
          <span
            aria-hidden
            style={{ background: sphereBackground(s) }}
            className={cx(
              "block rounded-full",
              SPHERE[size],
              "shadow-[inset_0_-2px_4px_color-mix(in_oklab,var(--swatch)_55%,black),0_1px_2px_color-mix(in_oklab,var(--swatch)_30%,transparent)]",
              "outline-2 outline-offset-2 outline-transparent",
              "transition-[scale,outline-color] duration-150 ease-out motion-reduce:transition-none",
              "group-data-hovered:scale-105 group-data-pressed:scale-95",
              "group-data-selected:outline-(--swatch)",
              "group-data-focus-visible:outline-text-primary",
              size === "sm" && "outline-offset-1",
            )}
          />
        </Radio>
      ))}
    </RadioGroup>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing to clean up: no timers, listeners or observers; state is the selected id.

**Reduced motion.** The only motion is the 150ms hover/press scale and outline colour change on each sphere; it carries `motion-reduce:transition-none`, so selection snaps. The re-tint itself is instant.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Overriding only `--color-accent-500` on a wrapper. Tokens like the primary-button gradient were already resolved from the root ramp, so nothing inside changes until they are re-declared in the scope.
- Using the focus-ring token for the swatch focus state inside a scope: it now equals the selected colour, so focus becomes invisible. Use a neutral (text-primary) outline for focus.
- Making each swatch its own button with aria-pressed. A single choice is a radio group; that gives roving focus and arrow keys for free.

## Notes

- Swatch colours default to kit palette variables (`var(--color-violet-500)`…), so they follow the theme file; any CSS colour works.
- Composer Loader takes hex stops for its SVG band, so the demo keeps a four-stop band per swatch next to the picker.
- Two pickers can share one state, as the demo's big row and compact pill do.

## Definition of done

The iridescent sphere starts selected with an outline. Clicking "Violet" outlines it, turns the send button gradient and the "Agent working" switch violet, and the caption reads "Violet · --accent: var(--color-violet-500)"; the compact pill shows the same selection. With focus on the group, ArrowRight selects the next sphere. Toggling the switch off fades the composer light and swaps the Stop button for Send.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
