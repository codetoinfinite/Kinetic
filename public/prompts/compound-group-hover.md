# Build: Compound Group Hover Card

A content card that answers a hover with a short sequence rather than a single state flip: it lifts, its icon tilts and overshoots its scale, a corner blob brightens, and the affordance arrow slides in — each on its own duration and delay. The trigger is `:hover, :has(:focus-visible)`, so a keyboard user tabbing to the link inside gets exactly the same four changes.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

One hover drives four changes on three elements, each with its own duration and curve. Keyboard gets all four.

- Category: primitive
- Runtime cost: css
- Dependencies: none beyond React

## How it works

1. The card owns `translate` and `border-color` on a 260ms `cubic-bezier(0.22, 1, 0.36, 1)`. It is the fastest change in the set because it is the one that acknowledges the pointer — anything slower and the card feels like it is deciding whether to respond.
2. The icon animates `rotate` over 320ms on the same ease and `scale` over 420ms on `cubic-bezier(0.34, 1.56, 0.64, 1)`, both delayed 40ms. Two curves on one element is only possible because `rotate` and `scale` are independent properties; packed into `transform` they would share a single duration and a single easing, and the overshoot would drag the rotation with it.
3. The corner blob is a radial gradient that is blurred once at paint time (`filter: blur(2rem)`) and thereafter only changes `opacity` 0.12 to 0.4 over 500ms and `scale` 1 to 1.15 over 700ms. It is the slowest element in the group, which is what makes it read as lighting rather than as a moving object.
4. `z-index: -1` on the blob places it above the card background and below the card content with no extra wrapper, and `isolation: isolate` on the card stops that negative index from escaping into the page stacking context and sliding behind an ancestor background.
5. The arrow translates 4px and goes from 0.4 to 1 opacity after an 80ms delay — last in the sequence, so the eye arrives at the call to action after the card has already committed to the hover.
6. The whole card is clickable through a stretched pseudo-element on the anchor (`::after { position: absolute; inset: 0 }`), so there is exactly one focusable, screen-reader-announced target. The card responds to that anchor's focus through `:has(:focus-visible)`, which is what gives keyboard parity without a single line of JavaScript.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `lift = -6px`
  Card travel on hover. Under 3px it is not distinguishable from a rendering shift; over about 10px the card visibly overlaps its neighbour in a tight grid and the shadow it does not have becomes conspicuous.
- `durations = 260 / 320 / 420 / 500 / 700 ms`
  Ascending by element weight: card, icon rotation, icon scale, blob opacity, blob scale. Equal durations collapse the sequence into a single snap; the spread is the entire effect. The 260ms floor is roughly the shortest a positional change can be and still be perceived as movement rather than a jump.
- `delays = 40ms icon, 80ms arrow`
  Small enough to feel like consequence rather than queueing. Past about 120ms the arrow reads as a second, separate event and a fast pointer pass leaves it half-animated.
- `icon scale = 1.1 with cubic-bezier(0.34, 1.56, 0.64, 1)`
  The 1.56 control point overshoots to roughly 1.13 before settling. Overshoot on a small element reads as physical; on the card itself it would read as a bug, which is why only the icon gets it.
- `blob opacity range = 0.12 to 0.40`
  It must be visible at rest — a blob that appears only on hover reads as a new object arriving, not as a light coming up. 0.12 is enough to establish it; past about 0.5 the accent starts tinting the body copy.
- `icon rotation = -6deg`
  Anticlockwise, because the arrow moves right and the two would otherwise both push the same direction and read as a shear. Past about 10deg a glyph-based icon starts to look misaligned rather than tilted.

## API

```ts
function CompoundGroupHover(props: { title: string; description: string; eyebrow?: string; icon?: ReactNode; href?: string; accent?: string; action?: string; className?: string }): JSX.Element
```

- `title: string`
  Card heading, rendered as an `h3`.
- `description: string`
  Body copy under the heading.
- `eyebrow: string`
  Small uppercase label above the title.
- `icon: ReactNode`
  Rendered inside the tilting badge. An inline SVG or a single character.
- `href: string`
  Renders the affordance link and stretches it over the whole card.
- `accent: string` — default `'var(--color-accent, currentColor)'`
  Drives the blob, the icon border and the link colour.
- `action: string` — default `'Read more'`
  Text of the affordance link.
- `className: string`
  Merged onto the card via `cn`. Use it for sizing inside a grid.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
const HOVER_CARD_CSS = `
.kx-hcard {
  --kx-hcard-ease: cubic-bezier(0.22, 1, 0.36, 1);
  --kx-hcard-overshoot: cubic-bezier(0.34, 1.56, 0.64, 1);

  position: relative;
  isolation: isolate;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  border: 1px solid var(--color-line, currentColor);
  border-radius: 12px;
  background-color: var(--color-surface, transparent);

  translate: 0 0;
  transition:
    translate 260ms var(--kx-hcard-ease),
    border-color 260ms linear;
}

.kx-hcard:hover,
.kx-hcard:has(:focus-visible) {
  translate: 0 var(--kx-hcard-lift, -6px);
  border-color: var(--color-line-strong, currentColor);
}

/* Icon: two properties, two curves. The rotation settles cleanly; the scale
   overshoots slightly and comes back, which is what reads as "picked up". */
.kx-hcard-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 9px;
  border: 1px solid var(--color-line, currentColor);
  color: var(--kx-hcard-accent);
  rotate: 0deg;
  scale: 1;
  transition:
    rotate 320ms var(--kx-hcard-ease) 40ms,
    scale 420ms var(--kx-hcard-overshoot) 40ms,
    border-color 260ms linear;
}

.kx-hcard:hover .kx-hcard-icon,
.kx-hcard:has(:focus-visible) .kx-hcard-icon {
  rotate: -6deg;
  scale: 1.1;
  border-color: var(--kx-hcard-accent);
}

/* The blob is blurred ONCE, at paint. Only opacity and scale animate, so the
   hover never re-runs a 2rem blur. Negative z-index puts it above the card
   background and below the card content without a wrapper. */
.kx-hcard-blob {
  position: absolute;
  right: -4rem;
  bottom: -4rem;
  width: 14rem;
  height: 14rem;
  border-radius: 9999px;
  background: radial-gradient(circle, var(--kx-hcard-accent) 0%, transparent 70%);
  filter: blur(2rem);
  opacity: 0.12;
  scale: 1;
  pointer-events: none;
  z-index: -1;
  transition:
    opacity 500ms var(--kx-hcard-ease),
    scale 700ms var(--kx-hcard-ease);
}

.kx-hcard:hover .kx-hcard-blob,
.kx-hcard:has(:focus-visible) .kx-hcard-blob {
  opacity: 0.4;
  scale: 1.15;
}

.kx-hcard-arrow {
  display: inline-block;
  translate: 0 0;
  opacity: 0.4;
  transition:
    translate 300ms var(--kx-hcard-ease) 80ms,
    opacity 220ms linear 80ms;
}

.kx-hcard:hover .kx-hcard-arrow,
.kx-hcard:has(:focus-visible) .kx-hcard-arrow {
  translate: 4px 0;
  opacity: 1;
}

/* Stretched link: the anchor stays the only focusable, screen-reader-visible
   target, and its pseudo-element makes the whole card the hit area. */
.kx-hcard-link {
  color: var(--kx-hcard-accent);
}

.kx-hcard-link::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
}

/* No motion: keep every change that carries meaning — the border and icon
   brighten, the blob comes up, the arrow reaches full opacity — and drop the
   three that are purely positional. Hover still visibly does something. */
@media (prefers-reduced-motion: reduce) {
  .kx-hcard:hover,
  .kx-hcard:has(:focus-visible) {
    translate: 0 0;
  }
  .kx-hcard:hover .kx-hcard-icon,
  .kx-hcard:has(:focus-visible) .kx-hcard-icon {
    rotate: 0deg;
    scale: 1;
  }
  .kx-hcard:hover .kx-hcard-arrow,
  .kx-hcard:has(:focus-visible) .kx-hcard-arrow {
    translate: 0 0;
  }
  .kx-hcard:hover .kx-hcard-blob,
  .kx-hcard:has(:focus-visible) .kx-hcard-blob {
    scale: 1;
  }
}
`;

export function CompoundGroupHover({
  title,
  description,
  eyebrow,
  icon,
  href,
  accent = 'var(--color-accent, currentColor)',
  action = 'Read more',
  className,
}: CompoundGroupHoverProps) {
  const style: StyleWithVars = { '--kx-hcard-accent': accent };

  return (
    <>
      <style href="kinetic-compound-group-hover" precedence="medium">
        {HOVER_CARD_CSS}
      </style>
      <article className={cn('kx-hcard p-6', className)} style={style}>
        <span className="kx-hcard-blob" aria-hidden="true" />

        {icon ? (
          <span className="kx-hcard-icon" aria-hidden="true">
            {icon}
          </span>
        ) : null}

        {eyebrow ? <span className="meta">{eyebrow}</span> : null}

        <h3 className="text-base tracking-tight text-fg">{title}</h3>
        <p className="text-[13px] leading-relaxed text-muted">{description}</p>

        {href ? (
          <a href={href} className="kx-hcard-link mt-auto pt-2 text-xs tracking-tight">
            {action}
            <span className="kx-hcard-arrow ml-1.5" aria-hidden="true">
              &rarr;
            </span>
          </a>
        ) : null}
      </article>
    </>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing to clean up. No listeners, no timers, no animation frames; the hover state lives entirely in the cascade. React removes the hoisted `<style>` when the last card unmounts.

**Reduced motion.** A `@media (prefers-reduced-motion: reduce)` block cancels the three positional changes — the card no longer lifts, the icon no longer tilts or scales, the arrow no longer slides — while keeping every non-positional one. The border still brightens, the blob still comes up from 0.12 to 0.4 opacity, and the arrow still reaches full opacity, so hover and keyboard focus remain visibly acknowledged.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Packing the icon lift into `transform: rotate(-6deg) scale(1.1)`. It works, but both halves are now one property with one duration — the moment you want the scale to overshoot and the rotation not to, you have to split them, and splitting `transform` mid-project means rewriting every rule that touches it.
- Transitioning `filter: blur()` on the blob instead of `opacity`. Every frame re-runs a 2rem blur over a 14rem box; on a grid of six cards a single pointer sweep drops the page into the teens.
- Making the card itself a `<div role="link" tabindex="0">` to get a focus state. It is not announced as a link, it does not middle-click, it does not open in a new tab, and it needs a keydown handler. The stretched `::after` on a real anchor gives all of that for one pseudo-element.
- Using `:focus-within` instead of `:has(:focus-visible)`. `:focus-within` fires on mouse clicks too, so the card sticks in its hover state after every click and only releases when something else is focused.
- Omitting `isolation: isolate` on the card. The blob's `z-index: -1` then resolves against whichever ancestor last created a stacking context and the blob disappears behind a section background — intermittently, depending on what else is on the page.
- Leaving all four changes in place under reduced motion. Lift, tilt and slide are motion; the border, the blob and the arrow opacity are not. Disabling the whole hover state is over-correction and leaves the card with no feedback at all.
- Forgetting `overflow: hidden` on the card. The blob is positioned 4rem outside the card on two sides and paints over the neighbouring card in a grid.

## Notes

- `:has()` needs Safari 15.4+, Chrome 105+ and Firefox 121+. Where it is unsupported the pointer hover still works exactly as written and the keyboard path degrades to the browser's own focus ring on the link.
- Independent `translate` / `rotate` / `scale` need Chrome 104+, Safari 14.1+, Firefox 72+. In older engines the properties are dropped and the card still changes colour and opacity on hover.
- The accent is one custom property, `--kx-hcard-accent`, read by the blob, the icon and the link. A grid of these differs only by that value.

## Definition of done

Hover the card and four things change on four different timings — you can see the arrow arrive after the card has already lifted. Tab to the link with the keyboard and the identical four changes happen. Click the card anywhere, including on the description text, and the link activates. Turn reduced motion on: nothing moves, but the border, blob and arrow still respond.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
