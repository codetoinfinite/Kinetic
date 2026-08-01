# Build: CSS Variable Clip-Path Tween

A panel reveal that tweens a CSS custom property instead of a CSS property. The stage clips itself with `inset(var(--kx-clip))`, and because custom properties inherit, any descendant carrying `.kx-clip-follow` clips with the same value in its own box — one tween, several clip boxes, no possible drift. The media pushes from 1.4 to 1 over half again the clip duration and the lines slide up on a stagger; the exit is the same timeline reversed, which turns the positive stagger into a last-line-first peel and the scale-down back into a push.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

One tweened custom property drives every clip-path on the panel, and reversing the timeline is the exit.

- Category: transition
- Runtime cost: dom
- Dependencies: gsap@^3.15.0

## How it works

1. GSAP's CSSPlugin special-cases any property whose name starts with `--`: it reads the start value with `getComputedStyle(target).getPropertyValue(prop)` and writes with `style.setProperty(prop, value)`. Because neither end is a plain number, the tween routes through the complex-string interpolator, which walks both strings and interpolates every number it finds pairwise — `100% 0% 0% 0%` to `0% 0% 0% 0%` is four independent number tweens in one string.
2. The tweened value feeds `clip-path: inset(var(--kx-clip))` on the stage. `inset()` takes `top right bottom left`, so a top inset of 100% collapses the box to nothing and 0% leaves it whole: the reveal is the top edge travelling down.
3. The reason to tween a variable rather than `clipPath` itself is inheritance. `.kx-clip-follow` on any descendant re-uses the same inherited value against its own border box, so a caption reveals in proportion with the panel without a second tween. Tweening `clipPath` on each element instead means N tweens that agree only until someone edits one.
4. The initial `--kx-clip` is declared in the injected stylesheet, not in React's inline style. GSAP writes the tweened value inline, and a React re-render owning that same inline property would reset it mid-tween. It also has to be declared somewhere: an undeclared custom property computes to the empty string, and a tween with no readable start value snaps to its end.
5. One paused timeline is built and then `play()`ed or `reverse()`d. Reversing is not a shortcut — it is the exit the source had: a reversed positive stagger runs last-element-first, and a reversed `scale: 1.4 -> 1` runs `1 -> 1.4`, so the panel leaves with its lines peeling off in reverse while the media is still pushing in.
6. The timeline is built inside `gsap.context()` with `open` deliberately absent from its dependencies. Rebuilding per state change would call `context.revert()`, which strips the inline value GSAP wrote — the closing tween would then read the stylesheet default, fully shut, as its start and animate from nowhere to nowhere.
7. Media and line timings are ratios of the clip duration (1.5x, 0.6x, offset 0.35x) rather than independent numbers, so retuning the reveal cannot desynchronise the three groups.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `duration = 1.2`
  Seconds for the clip. The source ran 2 s, but that timeline was scrubbed against scroll where duration is only a proportion of the scroll range. Played back at real time, 2 s is a panel you wait for; below ~0.8 s the `power3.inOut` has no room for its slow start and the edge appears to jump.
- `mediaScale = 1.4`
  Start scale of the media. Big enough that the settle is legible for the full duration, small enough that a 1x asset is not visibly softened. Also the reason the media needs an `overflow: hidden` wrapper: at 1.4 it is 40% wider than its box.
- `lineStagger = 0.125`
  Seconds between lines. Exactly the source value. At 0 the block arrives as one slab; past ~0.2 s the last line is still climbing after the clip has finished and the reveal appears to have two endings.
- `MEDIA_DURATION_RATIO = 1.5`
  The push outlives the clip by half again. The clip is the event; the scale still resolving after it is what stops the panel feeling like it stopped dead on arrival.
- `LINE_OFFSET_RATIO = 0.35`
  Fraction of the clip before the lines start. Any earlier and they climb inside a box that is still mostly clipped, so the first thing the eye catches is text being cut in half.
- `CLIP_SHUT = '100% 0% 0% 0%'`
  Four percentages, matching the four in `CLIP_OPEN`. The complex-string interpolator pairs numbers positionally, so `inset(100%)` against `inset(0% 0% 0% 0%)` would interpolate one number and leave the other three as literal text.

## API

```ts
function ClipPathVariableTween(props: { open: boolean; children: ReactNode; duration?: number; mediaScale?: number; lineStagger?: number; className?: string }): JSX.Element
```

- `open: boolean`
  `true` plays the reveal, `false` reverses it. Every change re-drives the same timeline.
- `children: ReactNode`
  Content. `[data-clip-media]` is pushed from `mediaScale` to 1; `[data-clip-line]` slides up from 120%.
- `duration: number` — default `1.2`
  Seconds for the clip. Media and line timings are ratios of it.
- `mediaScale: number` — default `1.4`
  Scale the media starts at. 1 disables the push.
- `lineStagger: number` — default `0.125`
  Seconds between lines. Reversed on exit, so the last line leaves first.
- `className: string`
  Merged onto the stage, which is the element that carries the clip.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/** `inset(top right bottom left)`. Top at 100% collapses the box entirely. */
const CLIP_SHUT = '100% 0% 0% 0%';
const CLIP_OPEN = '0% 0% 0% 0%';

/**
 * Media scale outlives the clip by half again. The clip is the event; the push
 * continuing past it is what stops the panel feeling like it stopped dead.
 */
const MEDIA_DURATION_RATIO = 1.5;
const LINE_DURATION_RATIO = 0.6;
/** Lines start when the clip is a third open — before that they are hidden. */
const LINE_OFFSET_RATIO = 0.35;

const CLIP_CSS = `
.kx-clip-stage {
  /* Declared in CSS, never in React's inline style: GSAP writes the tweened
     value to the inline style, and a React re-render would reset it mid-tween.
     It also has to be declared SOMEWHERE — an undeclared custom property
     computes to the empty string, and a tween with no start value snaps. */
  --kx-clip: ${CLIP_SHUT};
  clip-path: inset(var(--kx-clip));
}
/* Any descendant clipped by the same inherited variable. */
.kx-clip-follow {
  clip-path: inset(var(--kx-clip));
}
`;

export interface ClipPathVariableTweenProps {
  /** `true` reveals, `false` clips away. Every change plays or reverses. */
  open: boolean;
  /**
   * Content. Two opt-in hooks:
   * `[data-clip-media]` is pushed from `mediaScale` to 1, and
   * `[data-clip-line]` slides up from 120% with a stagger.
   */
  children: ReactNode;
  /** Seconds for the clip itself. Media and lines are derived ratios of it. */
  duration?: number;
  /** Scale the media starts at. 1 disables the push. */
  mediaScale?: number;
  /** Seconds between lines. Reversed on exit, so the last line leaves first. */
  lineStagger?: number;
  className?: string;
}

export function ClipPathVariableTween({
  open,
  children,
  duration = 1.2,
  mediaScale = 1.4,
  lineStagger = 0.125,
  className,
}: ClipPathVariableTweenProps) {
  const root = useRef<HTMLDivElement>(null);
  const timeline = useRef<ReturnType<typeof gsap.timeline> | null>(null);
  const reduced = useReducedMotion();

  // Built once and held paused. Rebuilding it per `open` change would be
  // wrong twice over: `gsap.context().revert()` strips the inline value GSAP
  // wrote, so a closing tween would read the CSS default — fully shut — as its
  // start and animate from nowhere to nowhere.
  useGsap(
    gsap,
    () => {
      const el = root.current;
      if (!el) return;

      const media = el.querySelectorAll<HTMLElement>('[data-clip-media]');
      const lines = el.querySelectorAll<HTMLElement>('[data-clip-line]');

      const tl = gsap.timeline({ paused: true });

      tl.fromTo(
        el,
        { '--kx-clip': CLIP_SHUT },
        { '--kx-clip': CLIP_OPEN, duration, ease: 'power3.inOut' },
        0,
      );

      if (media.length > 0) {
        tl.fromTo(
          media,
          { scale: mediaScale },
          {
            scale: 1,
            duration: duration * MEDIA_DURATION_RATIO,
            ease: 'power2.out',
          },
          0,
        );
      }

      if (lines.length > 0) {
        tl.fromTo(
          lines,
          { yPercent: 120 },
          {
            yPercent: 0,
            duration: duration * LINE_DURATION_RATIO,
            ease: 'power3.out',
            stagger: lineStagger,
          },
          duration * LINE_OFFSET_RATIO,
        );
      }

      timeline.current = tl;
      return () => {
        timeline.current = null;
      };
    },
    root,
    [duration, mediaScale, lineStagger],
  );

  // Same dependency list plus `open`, so this always runs after the effect
  // above has rebuilt the timeline rather than driving a stale one.
  useEffect(() => {
    const tl = timeline.current;
    if (!tl) return;

    if (reduced) {
      // A jump, not a zero-duration tween: the timeline is seeked to the
      // correct end state and stays paused there. Clip, scale and line offsets
      // all land correctly because they are all on this one timeline.
      tl.progress(open ? 1 : 0).pause();
      return;
    }

    if (open) tl.play();
    else tl.reverse();
  }, [open, reduced, duration, mediaScale, lineStagger]);

  return (
    <div ref={root} className={cn('kx-clip-stage', className)}>
      <style href="kinetic-clip-path-variable-tween" precedence="medium">
        {CLIP_CSS}
      </style>
      {children}
    </div>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** `useGsap` runs everything inside `gsap.context()` and calls `revert()` on unmount, which kills the timeline and removes the inline `--kx-clip`, `transform` and `scale` GSAP wrote so React never inherits a stray style. The context callback also nulls the timeline ref, so the effect that plays it cannot touch a reverted timeline.

**Reduced motion.** The timeline is seeked with `tl.progress(open ? 1 : 0).pause()` — a jump to the correct end state, not a zero-duration tween. Because the clip, the media scale and every line offset all live on that one timeline, one seek lands all of them correctly, which is the practical argument for putting them there in the first place.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Writing the custom property through React's inline `style` as well. React owns that attribute and GSAP writes to it; the first re-render during a tween resets the value and the clip snaps back.
- Never declaring the custom property. An undeclared custom property computes to the empty string, so GSAP has nothing to parse as a start value and the tween jumps straight to its end on the first frame.
- Mismatching the number count between the two clip strings. The interpolator pairs numbers positionally, so `inset(100%)` to `inset(0% 0% 0% 0%)` animates the first number and carries the rest through as text.
- Rebuilding the timeline whenever the open state changes. `gsap.context().revert()` removes the inline value GSAP wrote, so the reverse tween reads the stylesheet default as its start and animates from the closed state to the closed state — the exit silently does nothing.
- Tweening `clipPath` on each element instead of one shared variable. It works on the day you write it and drifts the first time one of the durations is tuned, because nothing structural keeps them equal.
- Forgetting `overflow: hidden` on the media wrapper and on each line. A 1.4x scale overflows its box by 40%, and a line entering from `yPercent: 120` is visible below its own box the entire way up.
- Assuming a clipped-away panel is inert. `clip-path` does clip hit-testing, but anything positioned outside the clip region — a fixed-position child, a focusable control — can still be reached by the keyboard, so the panel also needs its interactive state driven from the same flag.
- Tweening `--kx-clip` with a scrubbed ScrollTrigger and expecting sub-pixel smoothness. Custom property writes invalidate style for the whole inheritance subtree, so a stage with hundreds of descendants pays for it on every frame. The technique earns its keep with a handful of followers, not hundreds.

## Notes

- The `open` flag is the API surface, so a faked route change, a real router, an `IntersectionObserver` or a click all drive it identically. Nothing here imports a router.
- Registering the property with `@property { syntax: "<percentage>+" }` is not needed: GSAP interpolates the string itself and never asks the browser to. Register it only if you also want CSS transitions or keyframes to animate the same variable.
- `inset()` is the only basic shape whose numbers interpolate this cleanly. `polygon()` works the same way as long as both sides have the same vertex count, which is the same constraint stated differently.
- For a full-page version, put the stage on the layout wrapper and the follower class on the header rule and the footer — one tween, three clip boxes, and the whole chrome resolves together.

## Definition of done

Click an index row: the panel's top edge travels down over 1.2 s, the media resolves from a 1.4x push, the three lines climb into place 0.125 s apart, and the meta rule at the bottom clips itself in step without a tween of its own. Click Close: the panel clips back up, the last line leaves first, and the media pushes in again — the index underneath is revealed, not covered by a second animation. With reduced motion the panel is simply present or absent with the media at 1x and the lines in place.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
