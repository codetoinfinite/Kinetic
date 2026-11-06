# Build: CTA Section

The last section of a landing page. A fanned stack of product cards (the Stacked Card Fan, with its lower edge masked into the page and a "See all" pill) sits above a large two-line headline, a short paragraph and a row of actions, all centred on a full-width surface. The first time a quarter of the section scrolls into view, the visual, headline, copy and actions rise, unblur and fade in one after another. The cards stay live: hovering spreads them, clicking cycles them and the pill lays them all out.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Closing call-to-action: a faded stack of product cards, a large headline, copy and buttons that rise in one after another on scroll.

- Category: block
- Runtime cost: css
- Dependencies: none beyond React

## How it works

1. Reveal flag: the kit `useInView` hook (shared IntersectionObserver, `once`, threshold 0.25) sets `data-shown` on the section. Each part carries the same transition class and is hidden by `group-data-[shown=false]/cta:` variants (16px lower, `opacity-0`, `blur-sm`). Flipping the one flag starts every transition.
2. Stagger: parts are numbered in render order, skipping any that are not passed, and each gets an inline `transition-delay` of `order × 90ms`. A text-only CTA therefore starts with the headline and has no gap where the visual would be.
3. Visual: `cards` are passed to `StackedCardFan` with `fade` (a `mask-b-from-55%` gradient mask) at 320×280px inside a 680px column. `fanProps` overrides any of its props, such as the pill label or the controlled front card.
4. Fit: the section is a size container (`@container/cta`). Below `@2xl` the headline steps down from display-2 to display-4 and the copy from 16px to 14px, so it reads the same in a narrow preview as on a phone. `text-balance` keeps the headline lines even and `max-w-[18ch]` breaks it in two.
5. Semantics: a `section` labelled by its `h2` through `useId`, so it appears as a named region; the action row takes any buttons or links.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `stagger = 90ms per part`
  Close enough that the four parts read as one movement, far enough apart that the order shows.
- `entrance = 700ms, 16px rise, blur-sm, cubic-bezier(0.22, 1, 0.36, 1)`
  A soft settle, matching the card fan transition, without a bounce on a closing section.
- `trigger = 25% visible, once`
  Starts when the section is clearly arriving, and does not replay when it is scrolled past again.
- `visual = 320 × 280px cards in a 680px column`
  Large enough that the front card reads, narrow enough that the fan stays above the headline width.

## API

```ts
function CtaSection(props: { title: ReactNode; description?: ReactNode; actions?: ReactNode; cards?: StackedCardFanItem[]; fanProps?: Omit<StackedCardFanProps, "items">; className?: string }): JSX.Element
```

- `title: ReactNode`
  Headline; rendered as the `h2` that labels the section.
- `description: ReactNode`
  Supporting copy under the headline.
- `actions: ReactNode`
  Buttons or links, in a centred wrapping row.
- `cards: StackedCardFanItem[]`
  Cards for the faded stack above the headline; omit for text only.
- `fanProps: Omit<StackedCardFanProps, "items">`
  Overrides for the card stack (pill label, size, controlled state).
- `className: string`
  Classes for the section.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/**
 * Entrance: the visual, headline, copy and actions rise 16px, unblur and fade
 * in one after another the first time a quarter of the section is on screen.
 * Each part waits `order * STAGGER_MS` before starting, so one shared flag on
 * the root (`data-shown`) drives the whole sequence with CSS transitions only.
 * Hidden styles are keyed to `data-shown="false"`, so a reduced-motion visitor,
 * for whom the flag starts true, never sees a hidden frame.
 */
const STAGGER_MS = 90;

const REVEAL =
  "transition-[opacity,translate,filter] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none " +
  "group-data-[shown=false]/cta:translate-y-4 group-data-[shown=false]/cta:opacity-0 group-data-[shown=false]/cta:blur-sm";

function revealDelay(order: number): CSSProperties {
  return { transitionDelay: `${order * STAGGER_MS}ms` };
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The shared IntersectionObserver stops watching the section after the first reveal (`once`) and on unmount. The entrance is CSS transitions with nothing to cancel.

**Reduced motion.** The reveal flag starts true and the transitions are off (`motion-reduce:transition-none`), so everything is visible at once. The card fan changes state instantly under the same preference.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Hiding parts with an `opacity-0` class that a reveal removes: reduced-motion visitors and anything rendered before the observer fires get a blank section. Key the hidden state to the flag being false and start it true under reduced motion.
- Animating `transform` while the cards inside also animate theirs: the entrance uses the standalone `translate` property and filter, so it composes with the fan transforms without overriding them.
- Using `md:` breakpoints for the headline size: in a scaled preview or a narrow column they follow the window. Use container queries on the section.

## Notes

- Imports Stacked Card Fan and is shown with its `AGENT_DASHBOARD_CARDS` faces; any `StackedCardFanItem[]` works.
- Omit `cards` for a text-only CTA; the stagger starts at the headline.
- The demo actions are kit `ButtonLink`s with hash links.

## Definition of done

Scrolling the section in shows the card stack, then the headline, copy and two buttons rising and unblurring in that order. The stack fades into the page at the bottom with the See all five pill over the fade; hovering spreads it and the pill lays the cards out. At 360px the headline is smaller and wraps, the buttons wrap onto two lines and nothing overflows. Light and dark both read.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
