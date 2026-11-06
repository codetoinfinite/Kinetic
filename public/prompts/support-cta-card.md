# Build: Support CTA Card

The contact strip that closes a FAQ. It shows the people who answer as overlapping kit `Avatar`s, then a title and one line of copy, then a single secondary action that is a link when given `href` and a button when given `onAction`. A short accent beam drifts back and forth along the top border. The row stacks below 36rem of container width.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A "Still have a question?" card: stacked initials avatars, a line of copy, one contact action and an accent beam on the top border.

- Category: display
- Runtime cost: css
- Dependencies: none beyond React

## How it works

1. The first `maxAvatars` people render as `size="md"` (32px) kit Avatars with 12px initials in a `-space-x-1.5` row. Each has a `ring-2 ring-background-primary-default`, so every circle is cut out of the one behind it in the card colour. Anyone past the limit becomes one neutral "+N" avatar. Neutral avatars use `bg-background-quaternary-default`, because in dark mode the kit neutral avatar is the same colour as the card. The row is a single `role="img"` with an accessible label such as "Answered by Ada Park, Lin Okafor, Sam Ruiz and 2 more", and the individual avatars are `aria-hidden`.
2. The action branches on `href`. With a link it renders the kit `ButtonLink`, targets `_blank` by default and adds `rel="noopener noreferrer"` when it does. Without one it renders the kit `Button` wired to `onAction`. Both use the secondary variant and take the optional `actionIcon` as `leadingIcon`.
3. The beam is an `aria-hidden` layer at `-inset-px`: it covers the border box and clips to the card radius through `rounded-[inherit]`. Inside, a track a quarter of the card wide holds a 1px `via-accent-500` gradient line and a blurred `via-accent-400/25` glow under it. A hoisted `<style href precedence>` keyframe moves the track from `translateX(-100%)` to `translateX(400%)`, from just past the left edge to just past the right, over 7s, `infinite alternate`.
4. The root is an `@container`, so the row follows the card width: `flex-col items-start` below `@xl` (36rem) and `flex-row items-center` from it. That is why the same component works as a full-width strip and in a 360px sidebar.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `beam sweep = 7s cubic-bezier(0.45, 0, 0.55, 1), infinite alternate`
  A symmetric ease-in-out with `alternate` makes the beam slow down at each end and drift back instead of jumping to the start. 7s keeps it ambient rather than attention-seeking.
- `beam track = w-1/4, translateX(-100%) → translateX(400%)`
  Percent translations are relative to the track, so -100% to 400% of a quarter-width track starts just outside the left edge and ends just outside the right edge.
- `avatar overlap = -space-x-1.5 (6px) on 32px circles, 12px initials, ring-2 in the card colour`
  A 6px overlap with 12px initials leaves the ring just clear of each pair of letters, so no initial is cut. The ring has to match the card surface (`background-primary-default`) in both themes, or the cut-outs show as outlines.
- `stack breakpoint = @xl (36rem of container width)`
  Below about 576px the action button squeezes the copy into three lines, so it moves under the copy instead.

## API

```ts
function SupportCtaCard(props: { title?: ReactNode; description?: ReactNode; people?: { name: string; initials: string; color?: "neutral" | "blue" | "lime" | "pink" }[]; maxAvatars?: number; actionLabel?: ReactNode; actionIcon?: ComponentType<{ className?: string }>; href?: string; target?: string; onAction?: () => void; beam?: boolean; headingLevel?: 2 | 3 | 4; className?: string }): JSX.Element
```

- `title: ReactNode` — default `"Still have a question?"`
  Card heading.
- `description: ReactNode` — default `"We answer in the open, usually the same day."`
  One line under the title.
- `people: SupportPerson[]` — default `[]`
  `{ name, initials, color? }` for each person who answers. With an empty list there is no avatar row.
- `maxAvatars: number` — default `3`
  How many avatars to show before collapsing the rest into "+N".
- `actionLabel: ReactNode` — default `"Get in touch"`
  Action text.
- `actionIcon: ComponentType`
  Leading icon component for the action, e.g. `RiDiscordFill`.
- `href: string`
  Renders the action as a link.
- `target: string` — default `"_blank"`
  Link target when `href` is set. `_blank` adds `rel="noopener noreferrer"`.
- `onAction: () => void`
  Click handler when the action is a button (no `href`).
- `beam: boolean` — default `true`
  Show the drifting accent beam on the top border.
- `headingLevel: 2 | 3 | 4` — default `3`
  Heading level of the title.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function SupportCtaCard({
  title = "Still have a question?",
  description = "We answer in the open, usually the same day.",
  people = [],
  maxAvatars = 3,
  actionLabel = "Get in touch",
  actionIcon,
  href,
  target,
  onAction,
  beam = true,
  headingLevel = 3,
  className,
}: SupportCtaCardProps) {
  const shown = people.slice(0, Math.max(0, maxAvatars));
  const extra = people.length - shown.length;
  const Heading = HEADINGS[headingLevel];
  const linkTarget = target ?? "_blank";

  return (
    <div className={cx(styles.card, className)}>
      {beam ? (
        <>
          <style href="kinetic-support-cta-card" precedence="medium">
            {BEAM_CSS}
          </style>
          <div aria-hidden className={styles.beamLayer}>
            <div className={styles.beamTrack}>
              <span className={styles.beamGlow} />
              <span className={styles.beamLine} />
            </div>
          </div>
        </>
      ) : null}

      <div className={styles.row}>
        {shown.length > 0 ? (
          <div role="img" aria-label={listNames(shown.map((p) => p.name), extra)} className={styles.avatars}>
            {shown.map((person) => (
              <Avatar
                key={person.name}
                size="md"
                color={person.color ?? "neutral"}
                initials={person.initials}
                aria-hidden
                className={cx(styles.avatar, (person.color ?? "neutral") === "neutral" && styles.neutral)}
              />
            ))}
            {extra > 0 ? <Avatar size="md" initials={`+${extra}`} aria-hidden className={cx(styles.avatar, styles.neutral)} /> : null}
          </div>
        ) : null}

        <div className={styles.copy}>
          <Heading className={styles.title}>{title}</Heading>
          {description ? <p className={styles.description}>{description}</p> : null}
        </div>

        {href ? (
          <ButtonLink
            href={href}
            target={linkTarget}
            rel={linkTarget === "_blank" ? "noopener noreferrer" : undefined}
            variant="secondary"
            leadingIcon={actionIcon}
            className="shrink-0"
          >
            {actionLabel}
          </ButtonLink>
        ) : (
          <Button variant="secondary" leadingIcon={actionIcon} onClick={onAction} className="shrink-0">
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing to clean up. The beam is a CSS animation, and there are no effects, timers or listeners. The hoisted `<style>` is deduplicated by its `href`, so many cards share one stylesheet.

**Reduced motion.** A `prefers-reduced-motion: reduce` rule in the hoisted stylesheet removes the beam animation and parks the track at `translateX(150%)`, its centred position. The beam stays as a still highlight on the border.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Clipping the beam with `overflow-hidden` on the card itself. That clips at the padding box, so the beam sits one pixel under the border and any focus ring that reaches past the card is cut off. A separate `-inset-px` layer with `rounded-[inherit]` puts the beam on the border without clipping the content.
- Giving every avatar its own label. A screen reader then reads five separate images. One `role="img"` with a combined name says it once.
- Opening `_blank` links without `rel="noopener"`. The opened page gets `window.opener` and can navigate the original tab.

## Notes

- Set `beam={false}` when several cards sit together and only one should draw the eye, as the demo does for its second card.
- Initials are passed in rather than derived from names, so names with particles or non-Latin scripts get the initials you choose.

## Definition of done

At full width the avatars, the copy and the action sit in one row, and a short blue beam drifts along the top border and back. In a 360px container the action drops under the copy. Five people with `maxAvatars` 3 show three initials and "+2". Clicking the action calls `onAction`. With `href` it is a link opening in a new tab. With reduced motion the beam sits still in the middle of the border.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
