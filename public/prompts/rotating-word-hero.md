# Build: Rotating Word Hero

The landing page opener: an announcement pill, a two-line headline whose key word cycles through a list ("for Finance / Healthcare / Agentic Interface"), a subcopy paragraph, a CTA row and a "built with" badges row. Each swap slides the old word up through a blur while the next rises from below, and the word slot animates its width so the centred line re-balances smoothly. A dotted rule under the word signals that it changes. `RotatingWord` is exported on its own for headlines laid out differently.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Landing hero whose key word slides and blurs through a list while the line glides to each new width, with CTAs and a stack badges row.

- Category: block
- Runtime cost: dom
- Dependencies: motion@^12.43.0

## How it works

1. Slot sizing: inside the word slot sits an in-flow, invisible `inline-block` copy of the current word. It gives the slot its line height and baseline, and a ResizeObserver on it reports its border-box inline size. That number becomes the slot's explicit `width`, which has `transition-[width] duration-500 ease-out`, so the rest of the centred line glides instead of jumping. The first measurement replaces `auto` and therefore does not animate.
2. Word swap: the visible word is a `motion.span` keyed by index inside `AnimatePresence initial={false}`, absolutely positioned at the slot's top-left. Enter is `y 45% → 0, opacity 0 → 1, blur 8px → 0`; exit is `y 0 → -45%` with the same fade and blur, 550ms on `cubic-bezier(0.22, 1, 0.36, 1)`. Both run at once, so the words cross mid-slot.
3. Rotation clock: one `setInterval` advances the index every `interval` ms (2600 by default). The effect only runs while `running` is true: more than one word, not `paused`, no reduced-motion preference, not hovered, tab visible (`useVisibility`) and slot on screen (`useInView`). Any of these flipping clears the interval, so a hidden tab never queues swaps.
4. Measurement uses ResizeObserver layout sizes, never `getBoundingClientRect`, because the hero is often rendered inside a CSS-scaled preview and a rect would report the scaled width.
5. Accessibility: the animated layers are `aria-hidden`; a `sr-only` span holds the first word, so assistive tech reads one stable headline ("React Design System for Finance Interface") rather than a sentence that mutates every few seconds. Hovering the word pauses it for reading.
6. Layout: the `<section>` is an `@container/hero`; the headline steps from display-4 to display-2 at `@xl` and to the 64px large title at `@4xl`, so a narrow column gets a smaller heading even on a wide window. The optional glow is four blurred token-coloured bars behind the headline, masked off toward the bottom.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `interval = 2600ms`
  Long enough to read a word and the line it completes, short enough that a visitor sees at least two swaps before scrolling.
- `swap = 550ms, y ±45%, blur 8px`
  Under half the slot height keeps both words partly in the slot while they cross, and the blur hides the overlap.
- `width transition = 500ms ease-out`
  Slightly shorter than the swap so the line settles before the incoming word fully sharpens.
- `dot rule = 0.15em × 0.1em tiles, 0.032em dots`
  Em units scale the dotted underline with every headline size step.

## API

```ts
function RotatingWordHero(props: { words: string[]; before?: ReactNode; after?: ReactNode; announcement?: ReactNode; description?: ReactNode; actions?: ReactNode; badges?: { label: string; version?: string; icon?: ComponentType }[]; interval?: number; paused?: boolean; glow?: boolean; children?: ReactNode; className?: string }): JSX.Element
function RotatingWord(props: { words: string[]; interval?: number; paused?: boolean; underline?: boolean; className?: string }): JSX.Element
function HeroAnnouncement(props: { tag?: string; href?: string; onClick?: MouseEventHandler; children: ReactNode }): JSX.Element
```

- `words: string[]`
  Words cycled in the headline slot. One word renders static.
- `before / after: ReactNode`
  Headline text around the rotating word.
- `interval: number` — default `2600`
  Milliseconds per word.
- `paused: boolean` — default `false`
  Holds the current word.
- `announcement: ReactNode`
  Pill above the headline, usually a `HeroAnnouncement`.
- `description: ReactNode`
  Subcopy under the headline (max 620px).
- `actions: ReactNode`
  CTA row, e.g. a primary and a secondary kit Button.
- `badges: HeroBadgeItem[]` — default `[]`
  `{ label, version?, icon? }` items separated by dots.
- `glow: boolean` — default `true`
  Soft accent light bars behind the headline.
- `children: ReactNode`
  Content below the badges row, e.g. a product shot.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/**
 * A word that swaps in place: the outgoing word slides up and blurs out while
 * the next rises from below. An in-flow invisible copy of the current word
 * gives the slot its height and baseline; a ResizeObserver on that copy feeds
 * an explicit width, so the surrounding line glides to the new length instead
 * of jumping. The rotation stops under reduced motion, while hovered, off
 * screen and in a hidden tab.
 */
export function RotatingWord({ words, interval = 2600, paused = false, underline = true, className }: RotatingWordProps) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const sizerRef = useRef<HTMLSpanElement>(null);
  const [index, setIndex] = useState(0);
  const [width, setWidth] = useState<number | undefined>(undefined);
  const [hovered, setHovered] = useState(false);
  const reduced = useReducedMotion();
  const visible = useVisibility();
  const { inView } = useInView(rootRef);

  const count = words.length;
  const word = words[index % Math.max(count, 1)] ?? "";
  const running = count > 1 && !paused && !reduced && !hovered && visible && inView;

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), interval);
    return () => window.clearInterval(id);
  }, [running, interval, count]);

  useEffect(() => {
    const sizer = sizerRef.current;
    if (!sizer || typeof ResizeObserver === "undefined") return;
    // Layout size, not getBoundingClientRect: the hero may sit inside a scaled preview.
    const ro = new ResizeObserver((entries) => {
      const box = entries[0]?.borderBoxSize?.[0];
      setWidth(box ? box.inlineSize : sizer.offsetWidth);
    });
    ro.observe(sizer);
    return () => ro.disconnect();
  }, []);

  return (
    <span
      ref={rootRef}
      data-word={word}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      className={cx(
        "relative inline-block whitespace-nowrap",
        !reduced && "transition-[width] duration-500 ease-out",
        className,
      )}
      style={width === undefined ? undefined : { width }}
    >
      <span className="sr-only">{words[0]}</span>
      <span ref={sizerRef} aria-hidden="true" className="invisible inline-block">
        {word}
      </span>
      <span aria-hidden="true" className="absolute inset-0">
        <AnimatePresence initial={false}>
          <motion.span
            key={`${index}-${word}`}
            className="absolute top-0 left-0 inline-block"
            initial={reduced ? false : { y: "45%", opacity: 0, filter: "blur(8px)" }}
            animate={{ y: "0%", opacity: 1, filter: "blur(0px)" }}
            exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { y: "-45%", opacity: 0, filter: "blur(8px)" }}
            transition={{ duration: 0.55, ease: EASE_OUT }}
          >
            {word}
          </motion.span>
        </AnimatePresence>
      </span>
      {underline ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -bottom-[0.08em] h-[0.1em] bg-[radial-gradient(circle,currentColor_0.032em,transparent_0.042em)] bg-size-[0.15em_0.1em] bg-repeat-x text-text-placeholder opacity-70"
        />
      ) : null}
    </span>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The interval is cleared whenever the rotation stops or the hero unmounts; the ResizeObserver is disconnected on unmount. useInView and useVisibility unsubscribe their shared observers.

**Reduced motion.** The rotation stops entirely and the headline shows its current word. The width transition is removed, and the word renders without enter/exit motion.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Measuring an inline `<span>`: ResizeObserver reports 0x0 for non-replaced inline elements. The sizer must be `inline-block`.
- Letting the slot width follow its content: CSS cannot transition `width: auto`, so the line snaps. Feed a measured pixel width instead.
- Leaving the interval running in a background tab: when the tab returns, the browser fires the backlog and the word flickers through several swaps.
- Putting `aria-live` on the word. Screen readers then announce a new word every 2.6 seconds; keep the animated part hidden and expose one stable word.

## Notes

- Pass `paused` to hold the word, e.g. while a modal is open over the hero.
- The `before` slot accepts any node; the demo wraps "React Design System" in a block span to force the two-line split.
- `HeroAnnouncement` renders an anchor when given `href`, otherwise a static pill.

## Definition of done

The headline reads "React Design System / for Finance Interface" with a dotted rule under Finance. About every 2.6s the word slides up and blurs out while the next (Healthcare, Agentic, …) rises in, and "Interface" glides to its new position. Hovering the word pauses it. With reduced motion the word never changes. Light and dark both show the pill, CTAs and four badges.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
