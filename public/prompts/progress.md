# Build: Progress

How far along a task is, as a rounded rail or a small ring. Both are React Aria `ProgressBar`s, so they are announced with their label and a locale-formatted value. The bar's fill moves by `translate` and eases to each new value over 500ms; the indeterminate bar sweeps a band of light (crisp core, tight glow, wide bloom) along the rail, and the indeterminate ring is the Spinner's orbiting light.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Progress bar and ring, determinate or indeterminate, with an eased translate fill and a layered light sweep, on React Aria.

- Category: display
- Runtime cost: css
- Dependencies: react-aria-components@^1.22.1

## How it works

1. `ProgressTrack` draws the rail: `relative w-full rounded-full bg-border-button-default text-accent-500` at `h-1`, `h-1.5` or `h-2` for sm / md / lg. The fill colour is `currentColor`, so a text class recolours it.
2. Determinate: inside an `overflow-hidden rounded-full` clip, a full-width `bg-current` span is shifted by `translate: -(100 - p)% 0` (positive in RTL, read from `useDirection()`), with `p` clamped to 0..100. `transition-[translate] duration-500` with `cubic-bezier(0.22,1,0.36,1)` eases each change on the compositor instead of animating `width`.
3. Indeterminate (`Sweep`): a wrapper clipped with `[clip-path:inset(-8px_0_round_9999px)]` keeps the light inside the rail's length but lets it bleed 8px past its thickness. A `w-2/5` band runs `bui-progress-sweep` (translate -100% to 250%) over 1.6s `cubic-bezier(0.65,0,0.35,1)`, reversed in RTL.
4. The band holds three right-anchored `bg-linear-to-r from-transparent to-current` layers: a bloom (`-inset-y-[5px] right-[10px]`, opacity 30%, `blur-[5px]`), a glow (`-inset-y-[1.5px] right-[4px] left-[25%]`, opacity 60%, `blur-[2px]`) and a crisp core (`right-0 left-[35%]`). Pulling the soft layers back from the right edge is what keeps the sharp head in front.
5. `ProgressBar` wraps `AriaProgressBar` and uses its render props `{ percentage, valueText }`: a label row (the kit `Label`, truncated, and `valueText` in `tabular-nums`), the track, and an optional caption description. The value label shows by default only when there is a label and the bar is determinate.
6. `ProgressCircle` maps sm / md / lg to box 16 / 24 / 32 and line 2 / 2.5 / 3. It draws a `-rotate-90` SVG with a `stroke-border-button-default` track circle and a `currentColor` arc whose `strokeDashoffset = circumference × (1 - p/100)`, transitioned over 500ms. Indeterminate, it renders `SpinnerGlyph` at sm / lg / xl.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `track heights = sm h-1 (4px), md h-1.5 (6px), lg h-2 (8px)`
  Md is the default rail of the agent-limits card; sm fits inside dense rows and lg reads as a primary step indicator.
- `fill easing = 500ms cubic-bezier(0.22, 1, 0.36, 1) on translate`
  A strong ease-out lands each new value softly. Moving by `translate` keeps the change on the compositor; animating `width` relayouts every frame.
- `sweep = band w-2/5, 1.6s cubic-bezier(0.65,0,0.35,1), translate -100% to 250%; 4s under reduced motion`
  250% of a 40% band carries it fully past the rail's end, so the band leaves before it re-enters on the left.
- `sweep bleed = clip-path inset(-8px 0 round 9999px); bloom -5px, glow -1.5px`
  The glow and bloom are taller than the 6px rail. Clipping only horizontally lets the light halo above and below while it still stops at the rail ends.
- `ring sizes = sm 16/2, md 24/2.5, lg 32/3 (box/line px); indeterminate uses SpinnerGlyph sm / lg / xl`
  Ring and spinner share box sizes, so a ring can swap between determinate and indeterminate in place without moving its neighbours.

## API

```ts
type ProgressSize = "sm" | "md" | "lg"
interface ProgressBarProps extends Omit<AriaProgressBarProps, "children" | "className"> { label?: ReactNode; showValueLabel?: boolean; description?: ReactNode; size?: ProgressSize; className?: string }
function ProgressBar(props: ProgressBarProps): JSX.Element
interface ProgressTrackProps { percentage: number; size?: ProgressSize; isIndeterminate?: boolean; className?: string }
function ProgressTrack(props: ProgressTrackProps): JSX.Element
interface ProgressCircleProps extends Omit<AriaProgressBarProps, "children" | "className"> { size?: ProgressSize; className?: string }
function ProgressCircle(props: ProgressCircleProps): JSX.Element
```

- `value: number` — default `0`
  Current value between `minValue` and `maxValue` (React Aria).
- `isIndeterminate: boolean` — default `false`
  Show the light sweep (bar) or the orbiting spinner (ring) instead of a value.
- `label: ReactNode`
  Bar only. Label above the rail; also turns the value label on by default.
- `showValueLabel: boolean`
  Bar only. Show the formatted value at the end of the label row. Defaults to on when there is a label and a value.
- `description: ReactNode`
  Bar only. Helper text under the rail.
- `size: "sm" | "md" | "lg"` — default `"md"`
  Bar: 4 / 6 / 8px rail. Ring: 16 / 24 / 32px box.
- `className: string`
  Bar: classes on the root. Ring: arc colour via a text class (default accent).

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/** The sweeping band of light for an indeterminate bar. */
function Sweep() {
  return (
    // The clip keeps the light inside the rail's length but lets the glow
    // and bloom bleed past its thickness.
    <span aria-hidden className="absolute inset-0 [clip-path:inset(-8px_0_round_9999px)]">
      <span
        className={cx(
          "absolute inset-y-0 left-0 w-2/5",
          "animate-[bui-progress-sweep_1.6s_cubic-bezier(0.65,0,0.35,1)_infinite]",
          "rtl:[animation-direction:reverse] motion-reduce:[animation-duration:4s]",
        )}
      >
        <span className="absolute inset-0 rtl:-scale-x-100">
          <span className="absolute -inset-y-[5px] right-[10px] left-0 rounded-full bg-linear-to-r from-transparent to-current opacity-30 blur-[5px]" />
          <span className="absolute -inset-y-[1.5px] right-[4px] left-[25%] rounded-full bg-linear-to-r from-transparent to-current opacity-60 blur-[2px]" />
          <span className="absolute inset-y-0 right-0 left-[35%] rounded-full bg-linear-to-r from-transparent to-current" />
        </span>
      </span>
    </span>
  );
}

export interface ProgressTrackProps {
  /** 0 to 100. */
  percentage: number;
  size?: ProgressSize;
  /** Draw the indeterminate sweep instead of a fill. */
  isIndeterminate?: boolean;
  /** Colour of the fill, from the text colour. Default accent. */
  className?: string;
}

/** The rail and its fill, shared by ProgressBar and Meter. */
export function ProgressTrack({ percentage, size = "md", isIndeterminate = false, className }: ProgressTrackProps) {
  const direction = useDirection();
  return (
    // The rail is File Upload's ring track colour, which keeps an edge on
    // every surface in both themes (chart-track matches dark cards).
    <div className={cx("relative w-full rounded-full bg-border-button-default text-accent-500", styles.track[size], className)}>
      {isIndeterminate ? (
        <Sweep />
      ) : (
        <span className="absolute inset-0 overflow-hidden rounded-full">
          <span
            className={cx("absolute inset-0 rounded-full bg-current transition-[translate] duration-500 motion-reduce:transition-none", EASE)}
            style={{ translate: `${(direction === "rtl" ? 1 : -1) * (100 - Math.min(100, Math.max(0, percentage)))}% 0` }}
          />
        </span>
      )}
    </div>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing to clean up. Motion is CSS transitions and keyframes; there are no listeners, timers or effects.

**Reduced motion.** Fill and ring transitions are removed (`motion-reduce:transition-none`), so values jump straight to their new position. The indeterminate sweep keeps running but slows from 1.6s to 4s, and the indeterminate ring inherits Spinner's slower 2.4s orbit, because a stopped loader reads as a hang.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Do not animate the fill's `width`. The component translates a full-width span inside an `overflow-hidden` clip; width transitions cause layout on every frame.
- Do not forget RTL. The fill offset flips sign with `useDirection()` and the sweep reverses; a hard-coded negative translate fills from the wrong edge in Arabic or Hebrew.
- Do not replace the sweep's `clip-path` with `overflow: hidden`. It would cut the glow off at the rail's 6px thickness.
- Do not render a ring or an unlabelled bar without `aria-label`. React Aria warns and screen readers announce an unnamed progress bar.

## Notes

- `ProgressTrack` is exported and shared with Meter, which reuses the same rail and fill.
- Values are React Aria's: `value`, `minValue` (0), `maxValue` (100) and `formatOptions`; `valueText` is formatted for the locale.

## Definition of done

`<ProgressBar label="Uploading" value={64} />` shows "Uploading" with "64%" on the right and a 6px rail filled 64% in the accent colour; raising the value to 90 slides the fill smoothly over half a second. An indeterminate bar shows a glowing band crossing the rail left to right every 1.6s, with its glow spilling slightly above and below the rail but never past its ends. Rings show a clockwise arc from 12 o'clock proportional to the value, and an indeterminate ring shows the spinner. Each exposes `role="progressbar"` with its name.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
