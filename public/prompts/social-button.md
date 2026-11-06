# Build: Social Button

A "Continue with …" button where the brand is named rather than passed as artwork: `brand="github"` pulls the glyph, the brand colour and the label from one table, so a stack of providers cannot drift out of sync. Three appearances share one shape: `colorful` fills with a gradient derived from the brand colour, `black` is solid high-contrast, and `white` is the outlined secondary surface that shows each provider's real multi-colour mark. Passing `href` renders an anchor, because starting OAuth is a navigation.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Sign-in button for 24 named providers: one brand prop supplies logo, colour and label, in colourful, black or outlined styles.

- Category: action
- Runtime cost: css
- Dependencies: none beyond React

## How it works

1. `SOCIAL_PROVIDERS` maps 24 providers to `{ label, brand, viewBox, path }`. The glyphs are monochrome single paths painted with `currentColor` (Simple Icons, CC0, on a 24 grid; Bootstrap Icons, MIT, on a 16 grid for LinkedIn, Slack, Microsoft and Amazon). Each keeps its own `viewBox`, and the button scales whichever grid it gets into the same 18 or 16px box.
2. For `appearance="white"` the button looks up `SOCIAL_COLOR_LOGOS` instead: real multi-path marks with their own fills (gilbarbara/logos, CC0), injected with `dangerouslySetInnerHTML` from a build-time constant. Amazon has no plain mark upstream, so it falls back to the monochrome glyph tinted with its brand colour. Apple, GitHub and X are drawn near-black, so in dark mode `dark:[&_path]:fill-white` repaints them white.
3. `colorful` builds its gradient inline per brand: `linear-gradient(180deg, fill, oklch(from fill calc(l − 0.04) calc(c + 0.01) h))`. The second stop is the brand colour 4% darker and slightly more saturated, which is the same step the kit's primary button takes from blue-500 to blue-600. Hover and press adjust `brightness` (1.06 and 0.95) instead of swapping gradients.
4. A brand whose colour is a CSS variable (Google is `var(--color-accent-500)`) skips the inline gradient and takes `bg-button-primary`, so it is exactly the kit's primary button, including its hover gradient layer, rather than an approximation of it.
5. Sizes copy `Button` to the pixel (36px with a 10px radius, 32px with 8px) and add a fixed width (300 or 250px) so a column of providers lines up without a wrapper; `fullWidth` swaps that for `w-full`. With `iconOnly` the label is hidden and the element receives `aria-label="Continue with <Label>"` so it is never announced unlabelled.
6. `brand="custom"` takes `config: { icon, label, color }` for anything not built in. The label defaults to "SSO" and the colour to black.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `gradient end stop = oklch(from fill calc(l - 0.04) calc(c + 0.01) h)`
  Darkening in OKLCH keeps the hue stable. Mixing toward black in sRGB would wash out saturated brands such as Spotify green or Twitch purple and turn them muddy at the bottom edge.
- `hover and press brightness = 1.06 / 0.95`
  A per-brand hover gradient would need 24 more colours. A brightness filter gives every brand a consistent, subtle lift and dip from the one colour it already has.
- `fixed widths = 300px (medium) / 250px (small)`
  "Continue with Microsoft" is the longest built-in label and fits at both sizes. A fixed width lets a stack of providers align without each caller adding a wrapper.
- `glyph sizes = 18px / 16px`
  One step below Button's 20 / 18px icons. A filled brand mark is denser than a line icon and reads heavier at the same size.

## API

```ts
function SocialButton(props: SocialButtonProps | SocialButtonLinkProps): JSX.Element
// shared: { brand: SocialProvider | "custom"; config?: { icon: ReactNode; label?: string; color?: string }; size?: "medium" | "small"; appearance?: "colorful" | "black" | "white"; iconOnly?: boolean; fullWidth?: boolean; children?: ReactNode; className?: string }
// SocialButtonProps: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "color"> & { href?: never; ref?: Ref<HTMLButtonElement> }
// SocialButtonLinkProps: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children" | "color"> & { href: string; ref?: Ref<HTMLAnchorElement> }
const SOCIAL_PROVIDERS: Record<SocialProvider, { label: string; brand: string; viewBox: string; path: string }>
```

- `brand: SocialProvider | "custom"`
  Required. One of 24 providers (google, apple, github, gitlab, microsoft, x, facebook, linkedin, discord, slack, figma, notion, dropbox, spotify, twitch, reddit, tiktok, instagram, telegram, whatsapp, amazon, bitbucket, auth0, okta) or `custom`.
- `appearance: "colorful" | "black" | "white"` — default `"colorful"`
  Brand-colour gradient with a white glyph, solid black, or the outlined surface with the full-colour mark.
- `size: "medium" | "small"` — default `"medium"`
  36px tall and 300px wide, or 32px and 250px.
- `iconOnly: boolean` — default `false`
  Square logo-only button. The label moves to `aria-label`.
- `fullWidth: boolean` — default `false`
  Fill the container instead of the fixed width.
- `config: { icon: ReactNode; label?: string; color?: string }`
  Required for `brand="custom"`, ignored otherwise.
- `href: string`
  Renders an `<a>` instead of a `<button>`, for OAuth redirects.
- `children: ReactNode` — default `"Continue with <Label>"`
  Overrides the visible label.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function SocialButton({ href, ...props }: SocialButtonProps | SocialButtonLinkProps) {
  const {
    brand,
    config,
    size = "medium",
    appearance = "colorful",
    iconOnly = false,
    fullWidth = false,
    children,
    className,
    ref,
    ...rest
  } = props as SocialButtonBaseProps & {
    ref?: Ref<HTMLButtonElement & HTMLAnchorElement>;
  } & Record<string, unknown>;

  const custom = brand === "custom";
  const meta = custom ? undefined : SOCIAL_PROVIDERS[brand as SocialProvider];
  const label = custom ? (config?.label ?? "SSO") : meta!.label;
  const fill = custom ? (config?.color ?? "#000000") : meta!.brand;

  // The outlined treatment is where the real multi-colour mark belongs: on a
  // brand or black fill it would fight the background. Not every provider has
  // one upstream (see social-color-logos.ts), so a missing mark falls back to
  // the monochrome glyph tinted with the brand colour.
  const colorLogo =
    appearance === "white" && !custom
      ? SOCIAL_COLOR_LOGOS[brand as SocialProvider]
      : undefined;

  const glyph = custom ? (
    <span className={cx(styles.glyph[size], "inline-flex items-center justify-center")}>
      {config?.icon}
    </span>
  ) : colorLogo ? (
    <svg
      viewBox={colorLogo.viewBox}
      aria-hidden
      className={cx(
        styles.glyph[size],
        DARK_INVERTED_BRANDS.has(brand) && "dark:[&_path]:fill-white",
      )}
      // The mark carries its own fills, so it goes in as markup. This is a
      // build-time constant from this repo, never caller- or user-supplied.
      dangerouslySetInnerHTML={{ __html: colorLogo.body }}
    />
  ) : (
    <svg
      viewBox={meta!.viewBox}
      aria-hidden
      className={styles.glyph[size]}
      // On the filled appearances the glyph rides the white label; outlined
      // falls back to the brand colour so it is not a grey smudge.
      style={appearance === "white" ? { color: meta!.brand } : undefined}
    >
      <path d={meta!.path} fill="currentColor" />
    </svg>
  );

  const content = (
    <>
      {glyph}
      {iconOnly ? null : <span className="truncate">{children ?? `Continue with ${label}`}</span>}
    </>
  );

  // A brand whose colour is a system token (Google) hands the fill straight
  // to `bg-button-primary`, so it is the primary button, gradient, hover and
  // active included, rather than an approximation of it. Every other brand
  // gets that gradient's shape derived from its own colour: down in
  // lightness and up slightly in chroma, which is what blue-500 → blue-600
  // does. Mixing toward black instead would wash the second stop out.
  const systemFill = appearance === "colorful" && fill.startsWith("var(");

  const classes = cx(
    styles.base,
    iconOnly ? styles.iconOnlySize[size] : styles.size[size],
    styles.appearance[appearance],
    // `bg-button-primary` carries its own hover and active gradients; the
    // derived brands need the brightness shift instead.
    systemFill
      ? "bg-button-primary"
      : appearance === "colorful" && "hover:brightness-[1.06] active:brightness-95",
    fullWidth && !iconOnly && "w-full",
    className,
  );

  // The visible label already names the brand; when it is hidden the element
  // needs that name back, or the control announces as unlabelled.
  const accessibleName = iconOnly ? `Continue with ${label}` : undefined;

  const inlineStyle =
    appearance === "colorful" && !systemFill
      ? {
          backgroundImage: `linear-gradient(180deg, ${fill} 0%, oklch(from ${fill} calc(l - 0.04) calc(c + 0.01) h) 100%)`,
        }
      : undefined;

  if (href !== undefined) {
    return (
      <a
        ref={ref as Ref<HTMLAnchorElement>}
        href={href}
        aria-label={accessibleName}
        className={classes}
        style={inlineStyle}
        {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      ref={ref as Ref<HTMLButtonElement>}
      type="button"
      aria-label={accessibleName}
      className={classes}
      style={inlineStyle}
      {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {content}
    </button>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing to clean up. The component is stateless markup with no listeners, timers or effects.

**Reduced motion.** The press scale from `button-press-motion` is removed under `prefers-reduced-motion: reduce`. Hover still brightens or changes the fill, because that colour feedback carries meaning and does not move anything.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Passing a `style` prop. It is spread after the computed inline style, so it replaces the brand gradient and the colourful button turns transparent with white text.
- Relying on the colourful gradient in older browsers. Relative colour syntax (`oklch(from …)`) is invalid where unsupported, which drops the whole `background-image`. Use `appearance="white"` or `black` if you must support those engines.
- Writing the label yourself as "Sign in with Google" in only some buttons. Leave `children` empty and every provider gets the same "Continue with <Label>" wording.
- Using `brand="custom"` without `config`. The button then renders "Continue with SSO" on a black fill with no logo.
- Shipping without checking each provider's brand guidelines. Google and Apple in particular publish rules on wording, colour and clear space for sign-in buttons.

## Notes

- The outlined `white` appearance with full-colour marks is what most sign-in screens use. `colorful` suits a single prominent provider; `black` suits monochrome layouts.
- `SOCIAL_PROVIDERS` and the `SocialProvider` type are re-exported, so a settings page can list connected accounts with the same glyphs and labels.

## Definition of done

The outlined stack shows Google's four-colour G, Apple and GitHub marks that turn white in dark mode, and three equal-width rows reading "Continue with …". The filled column shows Google in the kit's exact primary-button blue, Discord in its own purple, slightly darker at the bottom edge, and Apple in solid black. Hover brightens Discord without a colour jump. Icon-only buttons are 36px squares, and a screen reader announces "Continue with GitHub". At 360px wide nothing overflows the frame.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
