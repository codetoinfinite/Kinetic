# Build: Char Stagger Then Scale-Up

The headline is on screen from the first frame — small and ghosted, reading as a label. Characters resolve one at a time from left to right, and just before the last one lands the whole word scales to full size with a `back.out` overshoot. It assembles itself, then it asserts itself. Supporting copy fades up a quarter of a second into the scale, so the page is never doing only one thing at a time.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Characters resolve left to right, then the whole word scales up with an overshoot as the last one lands.

- Category: text
- Runtime cost: dom
- Dependencies: gsap@^3.15.0

## How it works

1. The text is split in JSX, not in the DOM: `text.split(" ")` gives word boxes, `Array.from(word)` gives one `inline-block` span per character. React owns every node, so no library mutates the tree and no `revert()` is needed to restore it.
2. The idle state — `opacity: dimOpacity` per character and `transform: scale(scaleFrom)` on the word — is written as inline JSX styles, not by GSAP. That makes the server-rendered markup and the no-JS render identical to the pre-animation frame, and it means a parent re-render cannot wipe out what GSAP wrote, because React only ever diffs props against props.
3. A `gsap.timeline` first tweens `[data-char]` to `opacity: 1` with `stagger: 0.07` and `duration: 0.28` on `power1.out`.
4. The word scale is appended at position `">-0.05"` — 50 ms *before* the character stagger ends. The overlap is what fuses two phases into one gesture; at `">"` they read as two separate animations queued back to back.
5. Supporting copy (`[data-fade]`) is appended at `"<0.25"` — 250 ms after the *scale started*, not after it finished. Relative-to-previous-start positioning is what keeps the choreography overlapping rather than sequential.
6. `transformOrigin: "50% 50%"` is set explicitly on the scale tween even though it is the default: a heading inside a flex column can inherit an origin from an earlier transform on an ancestor, and the word then grows out of one corner.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `SCALE_FROM = 0.42`
  Starting scale of the word. Around 0.4 the text reads as a caption; past ~0.65 the growth is not large enough to register as a change of role, and below ~0.3 the characters are illegible while they stagger, so the first half of the animation is wasted.
- `DIM_OPACITY = 0.24`
  Resting strength of an unresolved character, as opacity on `currentColor`. Zero would make the reveal a pop-in and lose the ghosted-label reading; above ~0.4 there is not enough contrast between resolved and unresolved for the sweep to be visible.
- `CHAR_STAGGER = 0.07`
  Seconds between adjacent characters. A ten-character word takes 0.7s to sweep. Below ~0.04 the characters resolve as a block; above ~0.12 a long headline outlasts the reader's patience.
- `CHAR_DURATION = 0.28`
  Seconds for one character. Deliberately four times the stagger, so several characters are always mid-resolve — that overlap is what makes it a sweep rather than a sequence of individual pops.
- `SCALE_DURATION = 0.9`
  Seconds for the scale-up. `back.out` spends most of its curve on the settle, so a shorter duration compresses the overshoot into something that reads as a bounce artefact.
- `OVERSHOOT = 1.3`
  The `back.out(n)` parameter. Around 1.3 the word passes a few percent beyond full size and returns. At 1.7 (GSAP's default) the overshoot on large type is tens of pixels and reads as a wobble.
- `FADE_STAGGER / FADE_DURATION / FADE_Y = 0.12 / 0.7 / 18`
  Supporting copy rises 18px over 0.7s, 0.12s apart. The travel is small on purpose — body copy that moves as far as the headline competes with it.
- `VIEW_THRESHOLD = 0.35`
  Fraction visible before the timeline runs. A headline is tall; requiring more than about a third means it has to be nearly centred before anything happens, and requiring less starts it while it is still a sliver at the bottom edge.

## API

```ts
function CharStaggerScaleUp(props: { text: string; children?: ReactNode; scaleFrom?: number; dimOpacity?: number; charStagger?: number; charDuration?: number; scaleDuration?: number; overshoot?: number; delay?: number; startOnView?: boolean; className?: string; textClassName?: string }): JSX.Element
```

- `text: string`
  The headline. Split per word and per character in JSX.
- `children: ReactNode`
  Supporting copy. Fades up after the scale has begun.
- `scaleFrom: number` — default `0.42`
  Starting scale of the whole word.
- `dimOpacity: number` — default `0.24`
  Starting opacity of each character.
- `charStagger: number` — default `0.07`
  Seconds between character reveals.
- `charDuration: number` — default `0.28`
  Seconds for one character to resolve.
- `scaleDuration: number` — default `0.9`
  Seconds for the scale-up.
- `overshoot: number` — default `1.3`
  The `back.out(n)` parameter — how far past 100% the word travels.
- `delay: number` — default `0`
  Seconds before the timeline starts.
- `startOnView: boolean` — default `true`
  Run when scrolled into view rather than on mount.
- `className: string`
  Merged onto the wrapper via `cn`.
- `textClassName: string`
  Merged onto the headline span — this is where type size and tracking go.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
const SCALE_FROM = 0.42;
const DIM_OPACITY = 0.24;
const CHAR_STAGGER = 0.07;
const CHAR_DURATION = 0.28;
const SCALE_DURATION = 0.9;
const OVERSHOOT = 1.3;
const FADE_DURATION = 0.7;
const FADE_STAGGER = 0.12;
const FADE_Y = 18;
const VIEW_THRESHOLD = 0.35;

export function CharStaggerScaleUp({
  text,
  children,
  scaleFrom = SCALE_FROM,
  dimOpacity = DIM_OPACITY,
  charStagger = CHAR_STAGGER,
  charDuration = CHAR_DURATION,
  scaleDuration = SCALE_DURATION,
  overshoot = OVERSHOOT,
  delay = 0,
  startOnView = true,
  className,
  textClassName,
}: CharStaggerScaleUpProps) {
  const root = useRef<HTMLDivElement>(null);
  const word = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const { inView } = useInView(root, { threshold: VIEW_THRESHOLD, once: true });

  useEffect(() => {
    const el = root.current;
    const wordEl = word.current;
    // Reduced motion needs no branch here: the idle state written into the
    // JSX below is already the finished state, so doing nothing is correct.
    if (!el || !wordEl || reduced) return;
    if (startOnView && !inView) return;

    const chars = Array.from(el.querySelectorAll<HTMLElement>('[data-char]'));
    const fades = Array.from(el.querySelectorAll<HTMLElement>('[data-fade]'));

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay });

      tl.to(chars, {
        opacity: 1,
        duration: charDuration,
        ease: 'power1.out',
        stagger: charStagger,
      }).to(
        wordEl,
        {
          scale: 1,
          duration: scaleDuration,
          ease: `back.out(${overshoot})`,
          // Set explicitly even though it is the default: a block-level
          // heading inside a flex column can inherit an origin from an
          // earlier transform, and the word then grows out of one corner.
          transformOrigin: '50% 50%',
        },
        '>-0.05',
      );

      if (fades.length > 0) {
        tl.to(
          fades,
          {
            opacity: 1,
            y: 0,
            duration: FADE_DURATION,
            ease: 'power3.out',
            stagger: FADE_STAGGER,
          },
          '<0.25',
        );
      }
    }, el);

    // revert(), not kill(): it also strips the inline transform and opacity
    // GSAP wrote, handing the nodes back in exactly the state React rendered.
    return () => ctx.revert();
  }, [
    text,
    reduced,
    inView,
    startOnView,
    delay,
    charDuration,
    charStagger,
    scaleDuration,
    overshoot,
  ]);
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The timeline is built inside a `gsap.context` scoped to the root, and teardown calls `ctx.revert()`. That kills the tweens and strips the inline `transform` and `opacity` GSAP wrote, handing the nodes back in exactly the state React rendered — which matters under React 19 StrictMode, where the effect runs twice on mount.

**Reduced motion.** The idle inline styles collapse to the finished state (`scale(1)`, `opacity: 1`, no translate) and the effect returns before building a timeline. The headline and its supporting copy are fully rendered at full size on first paint — nothing is hidden and nothing waits for a trigger.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Splitting text before the webfont has loaded. Character and word boxes are measured against the fallback face, so widths and line breaks are wrong and never re-flow once the real font arrives — see `font-safe-text-split` for the gating and re-split lifecycle this class of component needs.
- Letting a splitting library mutate the DOM under React. React has no record of the injected spans, so the next parent render replaces the whole subtree and the animation targets nodes that are no longer in the document. Splitting in JSX avoids the problem entirely.
- Writing the idle state with `gsap.set` in the effect. The first paint then shows the finished headline at full size before the effect runs, and it visibly snaps down before animating up.
- Splitting straight to characters without word boxes. A line break can then land between two letters of the same word.
- Hardcoding the dim colour as a hex value. `#3d3d3d` is invisible on a light background; opacity on `currentColor` composites correctly against any theme.
- Queuing the scale at `">"` instead of `">-0.05"`. The two phases stop overlapping and the headline reads as "characters appear… then a separate thing happens".
- Cleaning up with `kill()` rather than `revert()`. `kill()` stops the tweens but leaves GSAP's inline `transform` and `opacity` on the nodes, so a remount starts from the finished state.

## Notes

- No text-splitting dependency: the split is declarative JSX. GSAP `SplitText` is reserved for the two components whose subject *is* SplitText (`nested-splittext-restore`, `font-safe-text-split`); everything else here splits in React so consumers are not forced to adopt a DOM-mutating splitter for a per-character stagger.
- Each word is one `inline-block whitespace-nowrap` box with a real text node for the space between words, so lines still wrap normally between words.

## Definition of done

On entering the viewport the characters brighten one at a time from left to right, and the word begins growing before the last character has finished. The word overshoots full size once and settles. Supporting copy starts rising while the word is still growing, not after. Unmount mid-animation and the nodes carry no inline `transform` or `opacity`. With reduced motion enabled the finished headline is present on first paint.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
