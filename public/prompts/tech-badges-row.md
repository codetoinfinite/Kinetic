# Build: Tech Badges Row

The row of technologies under a landing-page hero: a small glyph tile, the name and a muted version per entry, separated by dots. Glyphs are simple monogram tiles drawn inline (a rounded square and one or two letters in a tone), never brand logos, so any stack can be listed. Hovering or tabbing onto a badge lifts it onto a bordered surface and opens the kit Tooltip with the name, version and a one-line description. An `icon` variant drops the labels for tight spaces and lets the tooltip carry the name.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A "built with" strip of monogram glyphs, names and versions; each badge lifts on hover or focus and names itself in a tooltip.

- Category: display
- Runtime cost: css
- Dependencies: react-aria-components@^1.22.1

## How it works

1. Render a `ul` (`aria-label` "Built with") of `li`s that wrap and centre; in the `label` variant a dot separator precedes every badge after the first, hidden below 640px where the row wraps.
2. Each badge is a `span role="img"` with `aria-label` "<name> <version>" inside react-aria `Focusable`, which gives it a tab stop and lets the kit `TooltipTrigger` attach hover, focus and `aria-describedby` to a non-button element.
3. Draw the glyph as a 20×20 SVG: a tile in the badge `tone` (rx 5.5), a 1px white inner stroke at 18% so dark tiles still read on a dark page, and the monogram centred with `dy="0.36em"` — 11px for one letter, 8.5px with tighter tracking for two.
4. The lift is CSS: on `hover:` and `focus-visible:` the badge translates up 2px (4px for icon tiles) and gains `bg-background-primary-default`, a `border-button-default` border and `shadow-md`, over 200ms ease-out. `motion-reduce` keeps the surface change and cancels the translate and transition.
5. The kit `Tooltip` (placement top, 8px offset, no delay) shows the name and version in semibold caption type, with the description on a second, secondary line.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `lift = -2px label · -4px icon, 200ms ease-out`
  Enough to read as picked up without the row looking jumpy when the pointer sweeps across it.
- `glyph = 16px in the label row, 20px on a 40px tile`
  The label glyph matches the cap height of 13px body-2 text; the icon tile stays a comfortable 40px pointer target.
- `monogram size = 11px (1 letter) · 8.5px, -0.3 tracking (2 letters)`
  Two-letter monograms must fit the 20-unit tile with side bearing to spare.

## API

```ts
function TechBadgesRow(props: { badges?: TechBadge[]; variant?: "label" | "icon"; label?: string; className?: string }): JSX.Element
type TechBadge = { id: string; name: string; version?: string; monogram: string; tone: string; description?: string }
```

- `badges: TechBadge[]` — default `DEFAULT_TECH_BADGES`
  Entries: id, name, optional version, a 1–2 letter monogram, a tile tone and an optional tooltip description.
- `variant: "label" | "icon"` — default `"label"`
  `label` shows glyph, name and version with dot separators; `icon` shows 40px glyph tiles only.
- `label: string` — default `"Built with"`
  Accessible name of the list.
- `className: string`
  Merged onto the list.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/** A rounded tile with a 1px inner highlight and the monogram centred on it. */
function MonogramGlyph({ monogram, tone, className }: { monogram: string; tone: string; className?: string }) {
  const small = monogram.length > 1;
  return (
    <svg viewBox="0 0 20 20" aria-hidden className={cx("shrink-0", className)}>
      <rect width="20" height="20" rx="5.5" fill={tone} />
      <rect x="0.5" y="0.5" width="19" height="19" rx="5" fill="none" stroke="#ffffff" strokeOpacity="0.18" />
      <text
        x="10"
        y="10"
        dy="0.36em"
        textAnchor="middle"
        fill="#ffffff"
        fontSize={small ? 8.5 : 11}
        fontWeight={700}
        letterSpacing={small ? -0.3 : 0}
        style={{ fontFamily: "inherit" }}
      >
        {monogram}
      </text>
    </svg>
  );
}

/*
 * The lift: on hover or focus-visible the badge rises 2px (4px for icon
 * tiles) and picks up a surface, border and shadow, over 200ms ease-out.
 * Under reduced motion the surface still appears but nothing moves.
 */
const LIFT =
  "transition-[translate,background-color,border-color,box-shadow] duration-200 ease-out motion-reduce:transition-none " +
  "hover:shadow-md hover:bg-background-primary-default hover:border-border-button-default " +
  "focus-visible:shadow-md focus-visible:bg-background-primary-default focus-visible:border-border-button-default " +
  "outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring";

function Badge({ badge, variant }: { badge: TechBadge; variant: "label" | "icon" }) {
  const full = badge.version ? `${badge.name} ${badge.version}` : badge.name;
  return (
    <TooltipTrigger>
      <Focusable>
        <span
          role="img"
          aria-label={full}
          className={cx(
            "inline-flex cursor-default items-center border select-none",
            LIFT,
            variant === "label"
              ? "gap-1.5 rounded-full border-transparent px-2.5 py-1 hover:-translate-y-0.5 focus-visible:-translate-y-0.5 motion-reduce:hover:translate-y-0 motion-reduce:focus-visible:translate-y-0"
              : "size-10 justify-center rounded-xl border-border-button-default bg-background-primary-default shadow-xs hover:-translate-y-1 focus-visible:-translate-y-1 motion-reduce:hover:translate-y-0 motion-reduce:focus-visible:translate-y-0",
          )}
        >
          <MonogramGlyph monogram={badge.monogram} tone={badge.tone} className={variant === "label" ? "size-4" : "size-5"} />
          {variant === "label" && (
            <>
              <span className="text-body-2-medium whitespace-nowrap text-text-primary">{badge.name}</span>
              {badge.version && (
                <span className="text-caption-1-regular whitespace-nowrap text-text-tertiary">v{badge.version}</span>
              )}
            </>
          )}
        </span>
      </Focusable>
      <Tooltip placement="top" offset={8}>
        <span className="text-caption-1-semibold">{full}</span>
        {badge.description && <span className="block text-caption-2-regular text-text-secondary">{badge.description}</span>}
      </Tooltip>
    </TooltipTrigger>
  );
}

export function TechBadgesRow({
  badges = DEFAULT_TECH_BADGES,
  variant = "label",
  label = "Built with",
  className,
}: TechBadgesRowProps) {
  return (
    <ul
      aria-label={label}
      className={cx(
        "flex flex-wrap items-center justify-center",
        variant === "label" ? "gap-x-1 gap-y-2" : "gap-2",
        className,
      )}
    >
      {badges.map((b, i) => (
        <li key={b.id} className="flex items-center gap-1">
          {variant === "label" && i > 0 && (
            <span aria-hidden className="hidden px-1 text-text-disabled sm:inline">
              ·
            </span>
          )}
          <Badge badge={b} variant={variant} />
        </li>
      ))}
    </ul>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing to clean up: hover lift is CSS and react-aria owns the tooltip timers and listeners.

**Reduced motion.** Badges still gain their surface, border and shadow on hover and focus, but `motion-reduce` cancels the translate and the transition, so nothing moves; the kit Tooltip appears without its scale and blur.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Shipping traced brand logos as glyphs: they carry trademark rules and break the row's visual rhythm. Monogram tiles in a tone are neutral and extensible.
- Putting tooltips on plain non-focusable spans: keyboard and screen-reader users never get them. `Focusable` plus an `img` role makes each badge reachable and described.
- Relying on the tooltip for the name in the `icon` variant without an `aria-label`: tooltips are descriptions, the badge itself still needs a name.

## Notes

- `DEFAULT_TECH_BADGES` covers Next.js, React, Tailwind CSS, TypeScript, Motion and React Aria; pass `badges` to add or replace entries.
- Tones are SVG fills, so any CSS colour works; the white inner stroke keeps near-black tiles visible in dark mode.

## Definition of done

The row reads "Next.js v16 · React v19.2 · Tailwind CSS v4 · TypeScript v5.9 · Motion v12 · React Aria v1.17", each with a monogram tile. Hovering "React" lifts that badge 2px and opens a tooltip reading "React 19.2 / UI runtime". Tabbing onto a badge does the same. In the icon card, hovering the "TT" tile shows "TanStack Table 8.21".

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
