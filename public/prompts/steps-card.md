# Build: Steps Card

A grey dashboard card headed "Steps" with the week total ("31,600 total steps") and a week pill with arrows. Below are seven rounded grey tracks, Monday to Sunday, each filled from the bottom with a teal bar for that day's steps. The bars grow in on mount and glide to new heights when the week changes, while the total counts to the new figure. Hovering or focusing a bar outlines it, deepens its teal and rolls the headline to that day's steps ("6,340 steps on Thu").

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Seven daily step bars with a week switcher, a total that counts up, and an outline on the hovered bar that rolls the headline to that day.

- Category: display
- Runtime cost: css
- Dependencies: @remixicon/react@^4.9.0

## How it works

1. All weeks share one scale: `max`, or by default the busiest day across every week rounded up to the next 1,000 (8,000 for the sample data). A fill's height is `steps / scale` as a percentage of its track, so switching weeks compares like with like instead of re-stretching each week to its own peak.
2. Each fill is an absolutely positioned span at the bottom of its track with an inline `height` percentage and a 600ms expo-out `height` transition, delayed 40ms per bar from Monday so the row grows left to right. On mount every height is 0; two animation frames later the real heights apply, so the transition draws them in. A week change only changes the heights, so the same transition moves them.
3. The headline number is `useCountUp(target, 600)` from the shared hooks. The target is 0 until the bars are drawn, then the hovered day's steps or else the week total; the hook eases from whatever is on screen to the new target, so hovering across bars or changing week mid-roll never jumps. The unit ("total steps" or "steps on Thu") is a keyed span, so `.animate-number-fade` replays when it changes.
4. Bars are buttons in a group with a roving tabindex: Arrow Left and Right move focus, Home and End jump to Monday and Sunday. Pointer enter and focus set the active bar and pointer leave of the row or blur clears it. The active track gets a 2px teal outline, offset 2px and faded in over 150ms, and its fill switches to `chart-1-active`; keyboard focus uses the focus-ring colour instead.
5. The card is a container (`@container`). Under 420px the unit drops below the number so the header never collides with the week pill, and from 480px the bar gap opens from 8px to 30px.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `chartHeight = 200px`
  Tall enough that a 1,000-step difference is 25px, which the eye reads at a glance.
- `GROW_MS / STAGGER = 600ms / 40ms`
  The whole row settles in under a second, and a short stagger reads as a sweep without making Sunday wait.
- `scale rounding = up to the next 1,000`
  The busiest day nearly fills its track but never touches the top, so no bar looks clipped.
- `count-up = 600ms ease-out cubic`
  Same length as the bar growth, so the number and the bars land together.

## API

```ts
function StepsCard(props?: StepsCardProps): JSX.Element
type StepsWeek = { id: string; label: string; days: number[] }
```

- `title: string` — default `"Steps"`
  Header label.
- `totalLabel: string` — default `"total steps"`
  Unit after the week total.
- `weeks: StepsWeek[]` — default `STEPS_WEEKS`
  Weeks the pill steps through, oldest first.
- `weekIndex: number`
  Controlled index into `weeks`.
- `defaultWeekIndex: number` — default `weeks.length - 1`
  Uncontrolled starting week.
- `onWeekIndexChange: (index: number) => void`
  Called when an arrow changes week.
- `max: number` — default `busiest day rounded up to 1,000`
  Top of the shared bar scale.
- `chartHeight: number` — default `200`
  Height of the bar tracks in px.
- `className: string`
  Merged onto the card section.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
// One fixed scale for every week, so switching weeks compares like with like.
const scale = useMemo(() => {
  if (maxProp && maxProp > 0) return maxProp;
  const peak = Math.max(0, ...weeks.flatMap((w) => w.days));
  return Math.max(1000, Math.ceil(peak / 1000) * 1000);
}, [weeks, maxProp]);
const live = drawn || reduced;
const total = days.reduce((sum, n) => sum + n, 0);
const activeSteps = active !== null ? days[active] : undefined;
// The headline rolls to the hovered day's steps, back to the week total, or up from 0 on mount.
const target = live ? (activeSteps ?? total) : 0;
const counted = useCountUp(target, 600);
const shown = reduced ? target : counted;
const pct = (n: number) => (live ? Math.min(100, Math.max(0, (n / scale) * 100)) : 0);
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The mount effect cancels both pending animation frames on unmount, and `useCountUp` cancels its frame whenever the target changes or the card unmounts. Pointer, focus and key handling are React event props.

**Reduced motion.** With `prefers-reduced-motion: reduce`, the bars render at their final heights from the first frame and `motion-reduce:transition-none` makes week changes and hover outlines instant. The headline shows the target value directly instead of counting, and the unit no longer fades.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Scaling each week to its own peak. Every week then looks equally busy; a shared scale is what makes the switcher useful.
- Animating the bars with `scaleY`. It squashes the rounded corners while it grows; transitioning `height` keeps the 10px radius intact, and seven elements are cheap to lay out.
- Rolling the number with a fresh tween that starts from the old target. If the pointer crosses bars mid-roll the number jumps; easing from the value on screen keeps it continuous.

## Notes

- Exports `STEPS_WEEKS` (six sample weeks, oldest first) and the `StepsWeek` type `{ id, label, days }`, where `days` holds seven counts starting on Monday.

## Definition of done

The default card reads "Steps", "31,600 total steps" (counting up from 0 on load) and "29 Jun - 5 Jul", with the next arrow disabled. Seven teal bars grow left to right in grey tracks: Friday is the tallest at about nine tenths of its track and Wednesday the shortest. Hovering Thursday outlines its track in teal and the headline rolls to "6,340 steps on Thu"; leaving the row rolls it back to 31,600. Clicking the previous arrow shows "22 Jun - 28 Jun", the bars move to their new heights and the total counts to 32,010.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
