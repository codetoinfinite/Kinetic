# Build: Image Generating Loader

The placeholder an image model leaves in a chat thread while it paints. A 17 by 17 field of dots forms a ring that ripples outward from the centre, a frosted pill in the middle shows the percentage and the current stage, and the footer pairs a shimmering "Generating image" label with a seconds countdown. Past 40% the finished picture develops through a halftone mask whose dots swell until they merge, so the image grows in rather than fading. It runs on its own timer or takes a controlled `progress`.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A chat tile for an image still being generated: a rippling halftone ring, a % and stage pill, a seconds countdown and a halftone reveal.

- Category: display
- Runtime cost: dom
- Dependencies: @remixicon/react@^4.9.0

## How it works

1. The dot field is computed once at module load from fixed constants. Each grid cell gets a normalised distance from the centre, a Gaussian ring weight `exp(-((d - 0.7) / 0.22)²)` and, outside the ring, a floor of 0.18. Cells under 0.08 or beyond d 1.04 are skipped, so the middle stays empty. The result is rendered by a memoised `DotField` SVG with `fill="currentColor"`, so it follows `text-text-primary` in both themes.
2. One `@keyframes kx-igl-ripple` rule is injected through a React 19 `<style href precedence>`, which hoists it to `<head>` once per document. Each circle carries its own `--kx-igl-a` (its ring alpha) and an animation delay of `d * 1.1s - 1.8s`. The keyframes read the variable per element, so every dot pulses from 20% to 100% of its own alpha and the negative, outward-growing delay turns the field into an expanding wave.
3. Without a `progress` prop, a requestAnimationFrame loop adds each frame's delta to an `elapsed` ref, capped at `duration`, and stores progress rounded to 0.1%. Pausing cancels the loop and leaves the ref alone, so resuming continues where it stopped. `animation-play-state: paused` freezes the ripple at the same time.
4. The result layer sits over the dots with a two-layer CSS mask. The first layer is a 6px repeating radial dot whose radius grows from 0 to 4.5px as `t` goes from 0 at 40% to 1 at 100%. The second is a centred disc that ends at `t² * 100%` with a 22% feather. Their union lets the image show first as a fine halftone and then as a solid disc spreading from the centre. At 100% the mask is removed and the dot field fades out over 500ms.
5. The stage name is `stages[floor(progress / 100 * stages.length)]`, so four stages each cover a quarter of the run. The countdown is `ceil((100 - progress) / 100 * duration / 1000)` in its own chip, keyed by its value so `.animate-number-fade` replays on each tick, with an sr-only "N seconds remaining" beside it.
6. The square is `role="progressbar"` with `aria-valuenow` and an `aria-valuetext` of "38%, Sketching". A polite live region announces `doneLabel` once, and `onComplete` fires from an effect keyed on the done flag through a ref, so a new callback every render does not refire it.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `grid = 17 × 17 dots, 10-unit pitch, r 1.7`
  Fine enough to read as a halftone at 176px, coarse enough that each dot is still a distinct mark. An odd count puts a cell exactly on the centre so the ring is symmetric.
- `ring = peak at 0.7 of the half-width, spread 0.22, outer floor 0.18`
  Leaves room in the middle for the percentage pill and keeps a faint halo out to the corners of the circle, the way a printed halftone fades.
- `ripple = 1.8s cycle, centre-to-edge lag 1.1s, opacity 20%→100%, scale 0.5→1.2`
  Slow enough to feel like work in progress and not an alert. The lag is shorter than the cycle, so a new wave starts before the last one reaches the rim.
- `reveal = starts at 40%, 6px halftone cell, dot radius up to 0.75 of the cell, core disc t² with a 22% feather`
  The first 40% stays abstract, as a real model's early steps are noise. At 0.75 of the cell neighbouring dots overlap, so the halftone closes into a solid picture just before the disc covers it.
- `tile = 200px wide, rounded-2xl, p-3, square media with rounded-xl`
  The size of a single image card in a chat thread. It leaves room for the footer label and the countdown on one line.

## API

```ts
function ImageGeneratingLoader(props: ImageGeneratingLoaderProps): JSX.Element
interface ImageGeneratingLoaderProps { progress?: number; duration?: number; paused?: boolean; remainingSeconds?: number; result?: ReactNode; label?: string; doneLabel?: string; stages?: readonly string[]; onComplete?: () => void; className?: string }
```

- `progress: number`
  Controlled progress from 0 to 100. Leave it out to run on the internal timer.
- `duration: number` — default `6000`
  Length of the internal run in ms. Ignored when `progress` is set.
- `paused: boolean` — default `false`
  Freezes the internal timer and the ripple.
- `remainingSeconds: number`
  Seconds shown in the countdown chip. Derived from `duration` when uncontrolled.
- `result: ReactNode`
  The finished image. It develops through the halftone mask from 40% and is fully shown at 100%.
- `label: string` — default `"Generating image"`
  Footer label while working, and the progress bar's accessible name.
- `doneLabel: string` — default `"Image ready"`
  Footer label and live announcement at 100%.
- `stages: readonly string[]` — default `["Composing", "Sketching", "Painting", "Refining"]`
  Stage names under the percentage, spread evenly across the run.
- `onComplete: () => void`
  Called once when progress reaches 100.
- `className: string`
  Merged onto the tile, for example to change its width.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function ImageGeneratingLoader({
  progress: progressProp,
  duration = 6000,
  paused = false,
  remainingSeconds,
  result,
  label = "Generating image",
  doneLabel = "Image ready",
  stages = DEFAULT_STAGES,
  onComplete,
  className,
}: ImageGeneratingLoaderProps) {
  const reduced = useReducedMotion();
  const controlled = progressProp !== undefined;
  const [autoProgress, setAutoProgress] = useState(0);
  const elapsed = useRef(0);

  // Uncontrolled run: accumulate elapsed time frame by frame, so pausing and
  // resuming continues from where it stopped instead of jumping ahead.
  useEffect(() => {
    if (controlled || paused) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      elapsed.current = Math.min(duration, elapsed.current + (now - last));
      last = now;
      setAutoProgress(Math.round((elapsed.current / duration) * 1000) / 10);
      if (elapsed.current < duration) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [controlled, paused, duration]);

  const progress = clamp(controlled ? progressProp : autoProgress, 0, 100);
  const done = progress >= 100;
  const percent = Math.floor(progress);

  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  });
  useEffect(() => {
    if (done) onCompleteRef.current?.();
  }, [done]);

  const stage = stages.length
    ? stages[Math.min(stages.length - 1, Math.floor((progress / 100) * stages.length))]
    : undefined;
  const secondsLeft =
    remainingSeconds ?? (controlled ? undefined : Math.ceil((((100 - progress) / 100) * duration) / 1000));

  // Halftone + feathered-disc reveal. `t` runs 0→1 from REVEAL_START to 100%.
  const t = clamp((progress - REVEAL_START) / (100 - REVEAL_START), 0, 1);
  const dotRadius = round3(t * MASK_CELL * 0.75);
  const core = round3(t * t * 100);
  const revealStyle: CSSProperties | undefined =
    done || reduced
      ? undefined
      : {
          maskImage: `radial-gradient(circle, black ${dotRadius}px, transparent ${round3(dotRadius + 0.75)}px), radial-gradient(circle closest-side, black ${core}%, transparent ${round3(core + FEATHER)}%)`,
          maskSize: `${MASK_CELL}px ${MASK_CELL}px, 100% 100%`,
          maskRepeat: "repeat, no-repeat",
          maskPosition: "center, center",
        };
  // Reduced motion: no developing halftone, the image simply appears at 100%.
  const resultVisible = done || (!reduced && t > 0);

  return (
    <div
      className={cx(
        "flex w-[200px] flex-col gap-2 rounded-2xl bg-background-primary-default p-3 shadow-2xs",
        className,
      )}
    >
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={done ? doneLabel : `${percent}%${stage ? `, ${stage}` : ""}`}
        className="relative aspect-square w-full overflow-hidden rounded-xl"
      >
        <style href="kinetic-image-generating-loader" precedence="medium">
          {RIPPLE_CSS}
        </style>
        <div
          className={cx(
            "absolute inset-0 transition-opacity duration-500 ease-out motion-reduce:transition-none",
            done && result ? "opacity-0" : "opacity-100",
          )}
        >
          <DotField animated={!reduced && !done} paused={paused} />
        </div>

        {result ? (
          <div
            aria-hidden={!done}
            className={cx("absolute inset-0 [&>*]:size-full", resultVisible ? "opacity-100" : "opacity-0")}
            style={revealStyle}
          >
            {result}
          </div>
        ) : null}

        {!done ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
            <div className="flex flex-col items-center rounded-lg bg-background-primary-default/80 px-2 py-1 backdrop-blur-sm">
              <span className="text-body-medium text-text-primary tabular-nums">{percent}%</span>
              {stage ? <span className="text-caption-2-medium text-text-tertiary">{stage}</span> : null}
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-2 px-1 pb-0.5">
        <span
          className={cx(
            "truncate text-body-regular",
            done ? "text-text-primary" : paused ? "text-text-secondary" : "agent-progress-loading-text",
          )}
        >
          {done ? doneLabel : label}
        </span>
        {done ? (
          <RiCheckLine className="size-4 shrink-0 text-status-lime-text" aria-hidden />
        ) : secondsLeft !== undefined ? (
          <span className="flex shrink-0 items-center gap-0.5 text-body-regular text-text-tertiary tabular-nums">
            <span
              key={secondsLeft}
              className="animate-number-fade rounded bg-background-tertiary-default px-1 text-text-secondary dark:bg-background-quaternary-default motion-reduce:animate-none"
              aria-hidden
            >
              {secondsLeft}
            </span>
            <span aria-hidden>s</span>
            <span className="sr-only">
              {secondsLeft} {secondsLeft === 1 ? "second" : "seconds"} remaining
            </span>
          </span>
        ) : null}
      </div>
      <span className="sr-only" aria-live="polite">
        {done ? doneLabel : ""}
      </span>
    </div>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The timer effect cancels its pending animation frame on pause, on unmount and when `duration` or controlled mode changes. The ripple is pure CSS, and the hoisted `<style>` is shared and removed by React when no loader is left. There are no listeners or observers.

**Reduced motion.** With prefers-reduced-motion the dots drop their animation and sit at a fixed 70% of their ring alpha, the halftone reveal is skipped (the result stays hidden until 100%, then appears at once), the dot field does not fade out, and the countdown chip does not fade between values. The percentage, stage and countdown still update, since they carry information.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Animating the dots with React state. Two hundred circles re-rendering every frame would cost far more than the ripple is worth. The field is memoised and only its `animated` and `paused` flags ever change; the motion lives in CSS.
- Using a positive animation delay for the outward wave. Every dot would sit still until its delay passed and the field would start blank. A negative delay `d * lag - period` starts each dot mid-cycle, so the wave is already running on the first frame.
- Writing `mask-image` without `mask-size` and `mask-repeat` per layer. The dot layer has to repeat at 6px and the disc layer must not repeat, so both lists need two comma-separated values in the same order as the images.
- Setting the `animation` shorthand and `animationPlayState` on the same inline style. React warns on every re-render that toggles one of them, once per dot. The circles use the animation longhands only.
- Rounding progress to whole percent inside the timer. The mask would then step visibly. The loop keeps one decimal and only the label floors it.

## Notes

- Pass any node as `result`; direct children are stretched to fill the square, so an `<svg>` or `<img>` with `object-cover` works as is.
- Restart a run by changing the component's `key`, as the demo does. Changing `duration` mid-run rescales the remaining time without resetting it.
- With `progress` controlled, pass `remainingSeconds` yourself if you want the countdown chip; there is no duration to derive it from.

## Definition of done

A 200px white tile on a grey thread shows a ring of dark dots rippling outward around a frosted "0% Composing" pill, with "Generating image" shimmering in the footer and a "7 s" countdown. The percentage climbs through Sketching, Painting and Refining. From about 40% a blue poster shows through as fine dots that thicken and merge from the centre. At 100% the dots fade, the footer reads "Image ready" with a lime check, and the demo status reads "Done". Pause freezes the count and the ripple; Restart starts again from 0%.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
