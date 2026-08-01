# Build: Scrubbed Character Colour Reveal

A paragraph sits at 16% strength and resolves character by character as it crosses the viewport, with the reveal position pinned to the scrollbar rather than to a clock. Scroll back up and the characters ghost out again in reverse, because a scrubbed timeline is a function of position, not a playback. The stagger and durations are ratios of the scroll range rather than seconds, so the pacing per character is unchanged whether the paragraph is thirty words or three hundred.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A dim paragraph resolves character by character as it crosses the viewport, tied to scroll position not a clock.

- Category: text
- Runtime cost: dom
- Dependencies: gsap@^3.15.0

## How it works

1. The text is split in JSX — `text.split(" ")` for word boxes, `Array.from(word)` for one `inline-block` span per character — so React owns every node and nothing mutates the tree behind its back.
2. One `gsap.to(chars, { opacity: 1, stagger, duration, ease: "power1.out", scrollTrigger: {...} })` does the whole reveal. GSAP builds the stagger internally as a single tween whose total length is `duration + (n - 1) * stagger`.
3. ScrollTrigger maps that total length onto the distance between `start` and `end`, which is why `stagger: 0.1` and `duration: 0.35` are ratios, not seconds: each character begins 0.1/total of the way through the scroll range and takes 0.35/total to resolve. Change the paragraph length and the pacing per character is identical; change the scroll range and everything rescales together.
4. The resting opacity is written as a JSX inline style on each character, so the pre-scroll frame — including the server render and the no-JS render — is already the dim state, and GSAP has a real DOM value to tween away from.
5. The paragraph carries `aria-label={text}` and the character spans are inside an `aria-hidden` wrapper, so assistive technology reads one paragraph rather than two hundred single letters.
6. `ease: "power1.out"` applies *within* each character's own resolve, not across the stagger. The stagger itself remains linear against scroll, which is what keeps the sweep pinned to the scrollbar.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `DIM = 0.16`
  Resting strength as opacity on `currentColor`. Below ~0.1 the unread text is illegible and the block reads as a loading skeleton; above ~0.3 the contrast between resolved and unresolved is too weak for the sweep to be visible while scrolling.
- `STAGGER = 0.1`
  Timeline units between adjacent characters. Combined with `CHAR_DURATION` it sets the width of the resolve front: roughly 3-4 characters are mid-transition at any moment. Larger and the front narrows to one character at a time, which reads as a typewriter rather than a wash.
- `CHAR_DURATION = 0.35`
  3.5x the stagger, so several characters are always resolving together. Equal to the stagger it becomes a hard edge sweeping the paragraph; much larger and the front is so soft the reveal has no direction.
- `SCRUB = 0.75`
  Seconds of catch-up. `scrub: true` welds the reveal to the scrollbar exactly, which on a trackpad exposes every jitter in the input. Three quarters of a second smooths it without ever feeling like the text is animating on its own.
- `START / END = 'top 78%' / 'bottom 55%'`
  The reveal begins when the paragraph top is a little above the fold and completes when its bottom passes just past the middle. Ending at `bottom top` means the last characters only resolve as the paragraph leaves the screen, so the reader never sees the finished text.

## API

```ts
function ScrubCharColorReveal(props: { text: string; dim?: number; stagger?: number; charDuration?: number; scrub?: number; start?: string; end?: string; scroller?: Element | null; className?: string }): JSX.Element
```

- `text: string`
  Body copy. Split to words then characters in JSX.
- `dim: number` — default `0.16`
  Resting strength of an unrevealed character, 0-1.
- `stagger: number` — default `0.1`
  Timeline units between adjacent characters.
- `charDuration: number` — default `0.35`
  Timeline units for one character to resolve.
- `scrub: number` — default `0.75`
  Seconds of catch-up between the scrollbar and the reveal.
- `start: string` — default `'top 78%'`
  ScrollTrigger `start`.
- `end: string` — default `'bottom 55%'`
  ScrollTrigger `end`.
- `scroller: Element | null` — default `null`
  Scroll container, when the text is not in the document scroller.
- `className: string`
  Merged onto the paragraph via `cn`.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
const DIM = 0.16;
const STAGGER = 0.1;
const CHAR_DURATION = 0.35;
const SCRUB = 0.75;
const START = 'top 78%';
const END = 'bottom 55%';

export function ScrubCharColorReveal({
  text,
  dim = DIM,
  stagger = STAGGER,
  charDuration = CHAR_DURATION,
  scrub = SCRUB,
  start = START,
  end = END,
  scroller = null,
  className,
}: ScrubCharColorRevealProps) {
  const root = useRef<HTMLParagraphElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = root.current;
    if (!el || reduced) return;

    gsap.registerPlugin(ScrollTrigger);

    const chars = Array.from(el.querySelectorAll<HTMLElement>('[data-char]'));
    if (chars.length === 0) return;

    const ctx = gsap.context(() => {
      gsap.to(chars, {
        opacity: 1,
        duration: charDuration,
        ease: 'power1.out',
        stagger,
        scrollTrigger: {
          trigger: el,
          scroller: scroller ?? undefined,
          start,
          end,
          scrub,
        },
      });
    }, el);

    return () => ctx.revert();
  }, [text, dim, stagger, charDuration, scrub, start, end, scroller, reduced]);
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** `ctx.revert()` on the `gsap.context` scoped to the paragraph. That kills the staggered tween, disposes the ScrollTrigger instance so it stops measuring a detached node, and strips the inline `opacity` GSAP wrote — leaving React's own inline dim value intact.

**Reduced motion.** The resting opacity collapses to 1 in the JSX, so the paragraph renders fully resolved, and the effect returns before registering ScrollTrigger. The text is never left dim waiting for a scroll that will not drive it.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Splitting text before the webfont has loaded. Character boxes are measured against the fallback face, so widths and line breaks are wrong and never re-flow when the real font arrives — see `font-safe-text-split` for the `document.fonts.ready` gate and the debounced re-split this needs at scale.
- Treating `stagger` and `duration` as seconds. Under `scrub` they are proportions of the scroll range; a value tuned as "0.35 seconds" behaves completely differently the moment the trigger distance changes.
- Building a separate tween per character. That is one ScrollTrigger per character on a paragraph of two hundred, and refresh cost becomes visible on resize. A single staggered tween is one trigger.
- Leaving the character spans exposed to assistive technology. A screen reader announces every letter individually — `aria-label` on the paragraph plus `aria-hidden` on the spans is not optional here.
- Setting the resting opacity from `gsap.set` in the effect. The first paint then shows the paragraph at full strength before dimming it, which is a visible flash on every load.
- Splitting straight to characters with no word boxes. Line breaks land inside words and the paragraph becomes unreadable at narrow widths.
- Forgetting `scroller` when the paragraph lives in an `overflow-y-auto` panel. ScrollTrigger measures the window instead and the reveal fires at the wrong scroll position or not at all.

## Notes

- The split is declarative JSX, deliberately: GSAP `SplitText` is reserved for the two components whose subject *is* SplitText (`nested-splittext-restore`, `font-safe-text-split`). Here a React split gives the same per-character targets with no DOM mutation and no extra dependency for the consumer.
- Opacity on `currentColor` rather than a literal colour tween, so the component is correct in any theme without a per-context variant.

## Definition of done

Scroll the paragraph up through the viewport: characters brighten in a soft front sweeping left to right and top to bottom, and the front position tracks the scrollbar rather than a clock. Scroll back up and it reverses. Turn on a screen reader and the paragraph is announced once as whole sentences, not letter by letter. With reduced motion enabled the paragraph is at full strength on first paint.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
