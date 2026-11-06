# Build: Site Footer

The footer that closes a marketing site. The brand mark and tagline sit on the left, with social buttons and one call to action on the right. Up to six link columns follow, each with an optional "View all (N) →" link. The bottom bar holds the Language Select, the kit theme toggle, a centre slot (the demo uses the accent swatches companion) and the copyright and legal links. Every link reports through `onLinkClick`, so a client router can take over.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Marketing footer: logo, tagline and socials, six link columns with View all counts, then a language, theme, swatch and legal bar.

- Category: block
- Runtime cost: css
- Dependencies: @remixicon/react@^4.9.0

## How it works

1. The root is an `@container` `<footer>` with a top border. Inside, a `max-w-[1152px]` column has three bands: the brand row, a `<nav aria-label="Footer">` grid, and the bottom bar. Layout follows the footer's own width, not the viewport: the brand row splits left and right from `@3xl`, and the grid goes from 2 columns to 3 at `@xl` and 6 at `@5xl`.
2. Socials branch on `count`. Without one, a social renders the kit `IconLinkButton` (36px square) named by `label`. With one, it renders a secondary `ButtonLink` with the icon and the count as visible text, named "GitHub stars, 2.4k". All socials open in a new tab with `rel="noopener noreferrer"`.
3. Each column is an uppercase caption `h2` over a `ul` of links. A `badge` renders a status-blue pill after the label. `viewAll` adds a medium-weight link with a tertiary "(N)" and an arrow that nudges 2px on hover and flips under RTL.
4. The bottom bar is a one-column grid that becomes `grid-cols-[1fr_auto_1fr]` from `@3xl`. That keeps the centre slot centred whatever the widths of the language and theme controls on the left and the legal text on the right. `language` takes `LanguageSelect` props (or `false`) and `themeToggle` renders the kit `ThemeToggle` as a small segmented control.
5. `AccentSwatches` (companion) is a `role="radiogroup"` of `role="radio"` buttons with a roving tab stop. Only the checked dot has `tabIndex=0`. Arrow keys (mirrored under RTL), Home and End move focus and select. Each dot is SVG artwork: a linear gradient through its stops, a white radial highlight at (35%, 30%) and a 12% black hairline.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `content width = max-w-[1152px], px-0 from a 1200px container`
  This matches the landing page grid, so the footer columns line up with the sections above. Below 1200px, 16 or 24px gutters return.
- `grid breakpoints = 2 cols, @xl (36rem) 3 cols, @5xl (64rem) 6 cols`
  Six columns of about 170px need 64rem before "Marketing Dashboard" fits on one line. Three columns keep two rows readable on tablets.
- `link rhythm = gap-3 between Body 1 links, mt-4 under the heading`
  A roughly 33px row pitch makes a 9-link column about 300px tall, so all six columns end on the same baseline band.
- `swatch = 24px dot, gap-1.5, ring-2 + ring-offset-1 when checked, hover scale 1.1 over 150ms`
  The ring offset leaves a gap in the bar colour between the dot and the ring, so the checked state reads on every hue, including the pale spectrum dot.

## API

```ts
function SiteFooter(props: { logo?: ReactNode; brandLabel?: string; brandHref?: string; tagline?: ReactNode; socials?: FooterSocial[]; cta?: ReactNode; columns: FooterColumn[]; language?: false | LanguageSelectProps; themeToggle?: boolean; bottomCenter?: ReactNode; copyright?: ReactNode; legal?: FooterLink[]; onLinkClick?: (href: string, event: MouseEvent<HTMLAnchorElement>) => void; className?: string }): JSX.Element
```

- `columns: FooterColumn[]`
  `{ title, links: { label, href, badge?, external? }[], viewAll?: { href, count?, label? } }` per column.
- `logo: ReactNode`
  Brand mark, wrapped in a link to `brandHref`.
- `brandLabel: string` — default `"Home"`
  Accessible name of the logo link.
- `brandHref: string` — default `"/"`
  Logo link target.
- `tagline: ReactNode`
  Paragraph under the logo, at most 430px wide.
- `socials: FooterSocial[]` — default `[]`
  `{ label, href, icon, count? }`. With `count` it renders a labelled button, otherwise an icon button.
- `cta: ReactNode`
  Action after the socials, e.g. a "Get Pro" `ButtonLink`.
- `language: false | LanguageSelectProps` — default `{}`
  Props for the bottom-bar Language Select, or false to hide it.
- `themeToggle: boolean` — default `true`
  Show the kit segmented ThemeToggle.
- `bottomCenter: ReactNode`
  Centre slot of the bottom bar, e.g. `<AccentSwatches />`.
- `copyright: ReactNode`
  Leading text of the legal line.
- `legal: FooterLink[]` — default `[]`
  Links after the copyright, separated by middle dots.
- `onLinkClick: (href, event) => void`
  Called for every footer link. `preventDefault()` there to route client-side.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function SiteFooter({
  logo,
  brandLabel = "Home",
  brandHref = "/",
  tagline,
  socials = [],
  cta,
  columns,
  language = {},
  themeToggle = true,
  bottomCenter,
  copyright,
  legal = [],
  onLinkClick,
  className,
}: SiteFooterProps) {
  const click = (href: string) => (event: MouseEvent<HTMLAnchorElement>) => onLinkClick?.(href, event);

  return (
    <footer className={cx(styles.root, className)}>
      <div className={styles.inner}>
        <div className={styles.top}>
          <div className="min-w-0">
            {logo ? (
              <a
                href={brandHref}
                aria-label={brandLabel}
                onClick={click(brandHref)}
                className={cx(styles.link, "inline-flex")}
              >
                {logo}
              </a>
            ) : null}
            {tagline ? <p className={styles.tagline}>{tagline}</p> : null}
          </div>

          {socials.length > 0 || cta ? (
            <div className={styles.actions}>
              {socials.map((social) =>
                social.count !== undefined ? (
                  <ButtonLink
                    key={social.label}
                    href={social.href}
                    variant="secondary"
                    leadingIcon={social.icon}
                    aria-label={countLabel(social)}
                    onClick={click(social.href)}
                    {...externalProps(true)}
                  >
                    {social.count}
                  </ButtonLink>
                ) : (
                  <IconLinkButton
                    key={social.label}
                    href={social.href}
                    icon={social.icon}
                    aria-label={social.label}
                    onClick={click(social.href)}
                    {...externalProps(true)}
                  />
                ),
              )}
              {cta}
            </div>
          ) : null}
        </div>

        <nav aria-label="Footer" className={styles.grid}>
          {columns.map((column) => (
            <div key={column.title} className="min-w-0">
              <h2 className={styles.heading}>{column.title}</h2>
              <ul className={styles.list}>
                {column.links.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      onClick={click(link.href)}
                      className={styles.link}
                      {...externalProps(link.external)}
                    >
                      {link.label}
                      {link.badge ? <span className={styles.badge}>{link.badge}</span> : null}
                    </a>
                  </li>
                ))}
                {column.viewAll ? (
                  <li>
                    <a
                      href={column.viewAll.href}
                      onClick={click(column.viewAll.href)}
                      className={cx(styles.link, styles.viewAll)}
                    >
                      {column.viewAll.label ?? "View all"}
                      {column.viewAll.count !== undefined ? (
                        <span className="text-body-regular text-text-tertiary">({column.viewAll.count})</span>
                      ) : null}
                      <RiArrowRightLine
                        aria-hidden
                        className="size-4 transition-transform duration-150 ease-out group-hover/view:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover/view:translate-x-0 rtl:-scale-x-100"
                      />
                    </a>
                  </li>
                ) : null}
              </ul>
            </div>
          ))}
        </nav>

        <div className={styles.bottom}>
          <div className={styles.bottomStart}>
            {language !== false ? <LanguageSelect {...language} /> : null}
            {themeToggle ? <ThemeToggle appearance="segmented" size="small" /> : null}
          </div>
          <div className={styles.bottomCenter}>{bottomCenter}</div>
          {copyright || legal.length > 0 ? (
            <p className={styles.legal}>
              {copyright ? <span>{copyright}</span> : null}
              {legal.map((link, i) => (
                <span key={link.href} className="inline-flex items-center gap-2">
                  {copyright || i > 0 ? <span aria-hidden>·</span> : null}
                  <a
                    href={link.href}
                    onClick={click(link.href)}
                    className={styles.legalLink}
                    {...externalProps(link.external)}
                  >
                    {link.label}
                  </a>
                </span>
              ))}
            </p>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** There are no effects, timers or listeners. The swatch keyboard handler is a React prop on the radio group. The Language Select and ThemeToggle own and clean up their own listeners.

**Reduced motion.** All motion is hover feedback: link colour fades, the View all arrow nudge and the swatch scale. They are CSS transitions with `motion-reduce:` variants that remove the transition and the transform. The theme toggle keeps the kit behaviour.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Using viewport breakpoints. A footer placed in a narrower shell, such as a docs layout with a sidebar, would still get six columns and overflow. Container queries size it by its own width.
- Repeating the same SVG gradient `id` in two marks or swatches. Browsers resolve `url(#id)` to the first match, so a later swatch can paint with another's gradient. Ids come from `useId()`.
- Giving every swatch `tabIndex=0`. Tab would then stop seven times in the bottom bar. A radio group has one tab stop and uses the arrow keys inside.

## Notes

- Pass `onLinkClick={(href, e) => { e.preventDefault(); router.push(href) }}` for client-side routing. External links (`external: true`) can be skipped in that handler.
- The theme toggle is the kit `ThemeToggle`. It writes the document theme and persists it, so set `themeToggle={false}` when the host page already has one.

## Definition of done

At 1280px the footer shows the logo and tagline on the left and X, Discord, a "2.4k" GitHub button and Get Pro on the right. Six columns follow, Components and Charts ending in "View all (96) →" and "View all (18) →", and Affiliate carries an "Earn 40%" pill. The bottom bar reads, left to right: the English select and the sun/moon toggle, seven centred colour dots, then "© 2026 Tessera Labs · Privacy · Terms · License". Clicking a link calls `onLinkClick` with its href. Tabbing reaches the swatches once, and ArrowRight checks the next dot. At 360px the columns become two and the bottom bar stacks.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
