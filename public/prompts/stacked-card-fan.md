# Build: Stacked Card Fan

Cards stacked on top of each other with a slight fan: the front card sits upright in the middle and the others peek out to its left and right, each tilted, lowered, shrunk and dimmed a little more the further back it is. Hovering or keyboard-focusing the stack spreads the fan so more of each card shows; clicking the front card, or pressing an arrow key, sends it round the back and brings the next one forward, and clicking a card behind brings that card forward directly. A "See all" pill under the stack spreads the cards almost flat for a full view.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A fanned stack of tilted cards: hover spreads the fan, clicking or arrow keys bring the next card forward, and a pill lays them all out.

- Category: display
- Runtime cost: css
- Dependencies: @remixicon/react@^4.9.0, react-aria@^3.53.1

## How it works

1. Slots: each card gets a signed circular distance `d` from the front card, `((i − active + ⌊n/2⌋) mod n) − ⌊n/2⌋`, so five cards are ordered 0, +1, +2, −2, −1 around the front. Cycling shifts every `d` by one; the card leaving one end wraps to the other end at the back of the pile, where the higher cards hide the crossing.
2. One transform per card, written once as CSS variables: `translateX(-50%) translateX(d·gap) translateY(|d|·drop) rotate(d·tilt) scale(1 − |d|·shrink)`. `--d` and `--ad` are set per card; `--spread`, `--tilt`, `--drop`, `--shrink` come from `data-state` (rest, peek, expanded) on the stage. Changing either recomputes the transform and a single 500ms `transform` transition animates it, so hover, cycle and expand share one path with no JS animation loop.
3. Fit: the wrapper is a size container. Card width is `min(cardWidth, 80cqi)` and height keeps the aspect ratio. The gap is `max(12px, min(cardW · spread, (100cqi − cardW) / (2·⌊n/2⌋)))`, so the outermost card never passes the container edge, however wide the state asks it to spread. Expanded lays the cards in a row instead, which also needs them smaller: the container width from the kit `useResizeObserver` gives `scale = width / (card · (1 + (n − 1) · 0.86))` and a gap of `0.86 · card · scale`, passed in as `--base` and `--gap`. Scale is a plain number, and CSS cannot yet divide lengths into one in every browser.
4. Depth: `z-index` is `n − |d|`, and a token-coloured veil inside each card (`bg-background-primary-default` at `0.24·|d|` opacity, capped at 0.6) dims cards behind. A veil rather than card opacity keeps cards behind from showing through each other in dark mode.
5. Input: the stage is a focusable `role="group"` with `aria-roledescription="card stack"`. Arrow keys, Enter and Space cycle; Home and End jump. react-aria `useHover` (mouse only, so touch never sticks in peek) and `useFocusRing` (keyboard focus only) drive the peek state. Cards behind are `aria-hidden`, and a polite live region announces the new front card ("Tokens, 1 of 5").

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `rest / peek spread = 0.30 / 0.46 × card width`
  Rest shows a sliver of each card; peek shows their headings.
- `expanded step = 0.86 × scaled card width`
  Cards sit in a row with 14% overlap, scaled so the whole row fits the container.
- `tilt = 5° / 8° / 1.5° per slot`
  The fan opens wider on hover; flat-ish when expanded so content reads.
- `drop, shrink = 10px / 16px / 4px per slot; 4% per slot (0 expanded)`
  Cards behind sit lower and smaller, which reads as depth without a 3D perspective.
- `transition = 500ms cubic-bezier(0.22, 1, 0.36, 1)`
  A fast start and long settle makes the cycle feel like a flick.
- `card size = 300 × 260px, 80cqi max`
  Default shown in the reference; shrinks together with the aspect ratio below about 400px.

## API

```ts
function StackedCardFan(props: { items: { id: string; label: string; content: ReactNode }[]; activeIndex?: number; defaultActiveIndex?: number; onActiveChange?: (index: number) => void; expanded?: boolean; defaultExpanded?: boolean; onExpandedChange?: (expanded: boolean) => void; showToggle?: boolean; expandLabel?: string; collapseLabel?: string; cardWidth?: number; cardHeight?: number; fade?: boolean; "aria-label"?: string; className?: string }): JSX.Element
```

- `items: StackedCardFanItem[]`
  `{ id, label, content }`; `label` is announced when the card comes forward.
- `activeIndex: number`
  Controlled front card.
- `defaultActiveIndex: number` — default `0`
  Initial front card.
- `onActiveChange: (index: number) => void`
  Called when the front card changes.
- `expanded: boolean`
  Controlled expanded state.
- `defaultExpanded: boolean` — default `false`
  Initial expanded state.
- `showToggle: boolean` — default `true`
  Show the See all / Stack pill.
- `expandLabel: string` — default `"See all {n}"`
  Pill label while stacked.
- `collapseLabel: string` — default `"Stack cards"`
  Pill label while expanded.
- `cardWidth: number` — default `300`
  Card width in px.
- `cardHeight: number` — default `260`
  Card height in px.
- `fade: boolean` — default `false`
  Mask the bottom of the stack into the page.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/**
 * Signed circular distance from the front card: for five cards and front 0,
 * the order is 0, 1, 2, -2, -1. The front card sits at 0, the rest alternate
 * to its right (+) and left (-), and cycling the front card makes the one
 * leaving the far end slip round behind the stack to the other end.
 */
function slotOf(index: number, active: number, count: number) {
  const half = Math.floor(count / 2);
  return ((((index - active + half) % count) + count) % count) - half;
}

/**
 * Every card has one transform made of CSS variables: `--d` (its slot) and
 * `--ad` (|slot|) are set per card, while `--spread`, `--tilt`, `--drop`,
 * `--shrink` are set by the stack state (rest, peek on hover/focus, expanded). A change of
 * either re-computes the transform and a single CSS transition animates it, so
 * hover, cycling and expanding all share one code path with no JS animation.
 * The horizontal gap is capped by the container so the outer cards never
 * leave it: half * gap + card / 2 <= 50cqi.
 */
const CARD_TRANSFORM =
  "translateX(-50%) translateX(calc(var(--d) * var(--gap))) translateY(calc(var(--ad) * var(--drop))) rotate(calc(var(--d) * var(--tilt))) scale(calc(var(--base) * (1 - var(--ad) * var(--shrink))))";

const GAP = "max(12px, min(calc(var(--card-w) * var(--spread)), calc((100cqi - var(--card-w)) / var(--span))))";

/** Each expanded card advances this fraction of a card width past the one before (14% overlap). */
const EXPANDED_STEP = 0.86;

/**
 * Expanded lays every card out in a row, so cards must also shrink: the scale
 * that makes card + (n - 1) * step * card fit the measured width. Scale is a
 * plain number, which CSS cannot derive from lengths everywhere yet, so it is
 * computed here from the container's layout width.
 */
function expandedLayout(width: number, cardWidth: number, count: number) {
  const card = Math.min(cardWidth, width * 0.8);
  const scale = Math.min(1, width / (card * (1 + (count - 1) * EXPANDED_STEP)));
  return { scale, gap: card * scale * EXPANDED_STEP };
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Motion is a CSS transition with no loop to stop. The shared ResizeObserver unobserves the wrapper on unmount, and react-aria removes its hover and focus listeners itself.

**Reduced motion.** Card transforms and the dimming veil change instantly (`motion-reduce:transition-none`); hover, cycling and expanding still work. The step spinner in the sample faces stops.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Using `inert` on the cards behind: inert elements are skipped by hit testing, so clicks on them fall through and they cannot be brought forward. Use `aria-hidden` and keep the card faces non-interactive.
- Declaring `--gap` on an element above the stage: unregistered custom properties substitute their `var()` references where they are declared, so a `--gap` that reads `--spread` must sit on the element that sets `--spread`.
- Fading cards behind with `opacity` on the whole card: they become see-through and stack into a muddle in dark mode. Dim with an opaque-coloured veil instead.
- Driving peek from `onMouseEnter`: a tap on touch devices fires it and never the leave, leaving the fan open. react-aria `useHover` ignores emulated mouse events.

## Notes

- `stacked-card-fan-cards.tsx` holds five agent-dashboard card faces (tokens chart, activity calendar, requests bars, usage meters, step list) and `AGENT_DASHBOARD_CARDS`, the array the demo and the CTA Section use.
- With `fade` the lower part of the stack is masked into the page, as in a hero visual.
- Active card and expanded state are both controllable (`activeIndex`/`onActiveChange`, `expanded`/`onExpandedChange`).

## Definition of done

Five cards rest in a slight fan with the Tokens chart upright in front. Hovering spreads them and shows each heading; clicking the front card sends it round the back and brings September forward; clicking a card behind brings it forward; the arrow keys do the same with a visible focus ring. See all five lays the cards out nearly flat and Stack cards gathers them. At 360px the cards shrink and the fan stays inside the frame. Light and dark both read.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
