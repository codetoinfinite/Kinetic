# Build: Feature Card Grid

The "what is in the box" section of a component-kit landing page: a centred header (eyebrow, title, copy, CTAs) over a responsive grid of rounded cards. Each card shows a cropped, fading illustration on top and a title with a two-line description below. The illustration can be a render function that receives `{ active }`, so a picture assembled from real kit components (ProgressTrack, Switch, Checkbox, Chip, Avatar, Kbd) can flip a switch, fill a bar or complete a step while the card is hovered or focused.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Landing grid of feature cards, each topped by a small illustration built from kit parts that plays a state change on hover or focus.

- Category: block
- Runtime cost: css
- Dependencies: none beyond React

## How it works

1. Active state: `FeatureCard` keeps `hovered` (pointerenter/leave) and `focused` (focus, and blur only when focus leaves the card, checked with `relatedTarget`) and ORs them into `active`. It writes `data-active` on the card and calls the illustration with `{ active }` when it is a function, so the artwork changes props on real components and their own transitions animate the change.
2. Artwork frame: the top area is a fixed 196px, `overflow-hidden`, with `mask-b-from-75%` so artwork that runs past the bottom fades out instead of being cut, and wider artwork is simply cropped at the card edge. While active the artwork lifts 4px on a 500ms ease-out curve.
3. The artwork is `aria-hidden` and `inert`: it is made of interactive kit components (checkboxes, switches, buttons) shown read-only, and inert keeps them out of the tab order and the accessibility tree, so the card is one stop with one name.
4. Card element: with `href` the whole card is an `<a>`, otherwise an `<article>`; both get the hover border and shadow lift and a focus-visible ring offset from the page background.
5. Grid: the `<section>` is an `@container/features`; columns step 1 → 2 (@xl) → 3 (@4xl) → 4 (@6xl) with the gap opening from 16 to 24px at four columns. `span={2}` widens a card from two columns up, for bento layouts.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `artwork height = 196px`
  About two thirds of a 300px-wide card, leaving room for a title and two lines of copy at a near-square card.
- `fade = mask-b-from-75%`
  Artwork can be taller than the frame and trail off; the last quarter fades into the card.
- `lift = -4px, 500ms cubic-bezier(0.22,1,0.36,1)`
  Enough to read as a response, small enough that cropped artwork never reveals its top edge.
- `columns = 1 / 2 @xl / 3 @4xl / 4 @6xl`
  Keeps each card between roughly 260 and 340px wide at every container size.

## API

```ts
function FeatureCardGrid(props: { eyebrow?: ReactNode; title?: ReactNode; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }): JSX.Element
function FeatureCard(props: { title: ReactNode; description?: ReactNode; illustration?: ReactNode | ((state: { active: boolean }) => ReactNode); href?: string; onClick?: MouseEventHandler; span?: 1 | 2; className?: string }): JSX.Element
```

- `title: ReactNode`
  Card heading (rendered as h3).
- `description: ReactNode`
  Up to two lines of supporting copy.
- `illustration: ReactNode | ({ active }) => ReactNode`
  Artwork for the top frame; the function form reacts to hover and focus.
- `href: string`
  Makes the card a link.
- `span: 1 | 2` — default `1`
  Columns spanned from the two-column breakpoint up.
- `eyebrow / title / description / actions: ReactNode`
  FeatureCardGrid header slots; all optional.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/**
 * One tile of the grid. Hover and focus-within raise an `active` flag that is
 * handed to the illustration, so artwork built from kit parts can play a
 * small state change (a bar fills, a switch flips, a step completes) instead
 * of the whole card merely brightening. The artwork is `inert` and hidden from
 * assistive tech: it is a picture of a component, not a working one.
 */
export function FeatureCard({ title, description, illustration, href, onClick, span = 1, className }: FeatureCardProps) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const active = hovered || focused;
  const art = typeof illustration === "function" ? illustration({ active }) : illustration;

  const onBlur = (event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
  };

  const body = (
    <>
      <div
        aria-hidden="true"
        inert
        className="relative h-[196px] overflow-hidden mask-b-from-75% mask-b-to-100%"
      >
        <div
          className={cx(
            "h-full w-full transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
            active && "-translate-y-1 motion-reduce:translate-y-0",
          )}
        >
          {art}
        </div>
      </div>
      <div className="flex flex-col gap-1 px-5 pt-3 pb-5">
        <h3 className="text-headline-medium text-text-primary">{title}</h3>
        {description ? (
          <p className="line-clamp-2 text-body-regular text-text-tertiary">{description}</p>
        ) : null}
      </div>
    </>
  );

  const shared = {
    "data-active": active ? "true" : "false",
    onPointerEnter: () => setHovered(true),
    onPointerLeave: () => setHovered(false),
    onFocus: () => setFocused(true),
    onBlur,
    onClick,
    className: cx(
      "group/feature relative flex flex-col overflow-hidden rounded-3xl border bg-background-primary-default text-start",
      "border-border-button-default shadow-xs transition-[border-color,box-shadow] duration-200 ease-out",
      "hover:border-border-button-hover hover:shadow-md",
      "outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background-full",
      span === 2 && "@xl/features:col-span-2",
      className,
    ),
  };

  return href ? (
    <a href={href} {...shared}>
      {body}
    </a>
  ) : (
    <article {...shared}>{body}</article>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** No listeners, timers or effects; hover and focus state are plain React handlers on the card.

**Reduced motion.** The artwork lift and its transition are removed with `motion-reduce:` variants. State changes still happen on hover, they just snap; kit components drop their own transitions under the same preference.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Leaving the illustration interactive. Kit checkboxes and switches inside a card link nest focusable controls in a link and add a dozen tab stops; mark the frame `inert` and `aria-hidden`.
- Clearing focus state on every `blur`. Focus moving between elements inside the card fires blur; check `relatedTarget` against the card first.
- Using `md:`/`lg:` for the column count. The grid often sits in a narrower column than the window; container queries keep cards a sane width.
- Animating the illustration with its own timers. Reacting to `active` keeps every card still until a visitor points at it, which also costs nothing off screen.

## Notes

- The demo builds eight illustrations entirely from kit components and tokens: ProgressTrack bars that fill further, a Switch that flips, Checkboxes that select, a sidebar selection that moves.
- Pass a plain node as `illustration` for static artwork.

## Definition of done

At 1280px the section shows the install line, title, copy and two CTAs above four columns of cards. Hovering "Agent limits" raises the card and its context bar moves from 82% to 91%; hovering "Notification settings" flips the Mentions switch on; leaving restores both. Tab skips everything inside the artwork. In a narrow container the grid drops to two and then one column.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
