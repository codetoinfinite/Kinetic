# Build: Eased Number Counter

A number tweens from one value to another on `power2.inOut` rather than linearly, so it reads as loading rather than as a progress meter — slow to commit, quick through the middle, easing onto the final figure. The thing being tweened is a plain numeric object; the string on screen is formatted from it on every update and written with `textContent`, so React never re-renders while the count runs. A transparent sizer reserves the width of the wider endpoint, so nothing after the counter moves as digits are added.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A statistic that counts up on an eased curve and settles on its exact final figure without shifting the layout.

- Category: text
- Runtime cost: dom
- Dependencies: gsap@^3.15.0

## How it works

1. A local object `{ v: from }` is the tween target. `gsap.to(counter, { v: to, duration, ease })` interpolates the number; the DOM is not the tween target at all.
2. `onUpdate` calls a `write()` closure that does `el.textContent = prefix + format.format(counter.v) + suffix`. Writing `textContent` rather than React children means the tween never touches the reconciler.
3. The `Intl.NumberFormat` is built once in a `useMemo` keyed on `[locale, decimals, grouping]` — three primitives, so the memo actually holds. `minimumFractionDigits === maximumFractionDigits` also performs the rounding, so no `Math.round` or `toFixed` is needed in the tick.
4. `onComplete` assigns `counter.v = to` and writes once more. Tween interpolation lands on values like 99.999999997, and a headline number stopping one unit short of itself is a real bug report.
5. Before the tween starts, `write()` runs once with `v = from`, so the live node is never empty on the first frame and the element does not pop into existence when the tween begins.
6. The width reservation compares `format.format(to).length` against `format.format(from).length` and renders the longer of the two as a `text-transparent` cell stacked under the live node in an `inline-grid`, both at `col-start-1 row-start-1`.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `DURATION = 1.6`
  Seconds. Under ~1s the eye cannot track the digits and the effect is just a flicker before the answer; past ~2.5s the reader has finished the sentence around it and is waiting on a number that has stopped being interesting.
- `EASE = 'power2.inOut'`
  The in-out pair is what separates a counter from a progress bar. `none` reads as a machine metering out a value; `power2.out` starts at full speed and looks like it began before you looked. The slow start is the part that reads as "committing".
- `VIEW_THRESHOLD = 0.6`
  60% of the element visible before counting. A stat that starts at 1% visibility has finished before it clears the fold, so the reader arrives at a static number and never sees the effect.
- `decimals = 0`
  Also the rounding rule, via matched `minimumFractionDigits`/`maximumFractionDigits`. Leaving them unmatched lets `Intl` vary the digit count between frames, so the string length oscillates and the number jitters horizontally.

## API

```ts
function EasedNumberCounter(props: { to: number; from?: number; duration?: number; ease?: string; delay?: number; locale?: string; decimals?: number; grouping?: boolean; prefix?: string; suffix?: string; startOnView?: boolean; className?: string; onComplete?: () => void }): JSX.Element
```

- `to: number`
  The value to land on.
- `from: number` — default `0`
  The value to start from.
- `duration: number` — default `1.6`
  Seconds of counting.
- `ease: string` — default `'power2.inOut'`
  Any GSAP ease string. `none` makes it read as a meter.
- `delay: number` — default `0`
  Seconds to wait after the trigger before counting.
- `locale: string`
  BCP 47 tag. Omitted uses the runtime default locale.
- `decimals: number` — default `0`
  Fixed fraction digits. Also the rounding.
- `grouping: boolean` — default `true`
  Thousands separators.
- `prefix: string` — default `''`
  Literal text before the number, e.g. a currency sign.
- `suffix: string` — default `''`
  Literal text after the number, e.g. a percent sign.
- `startOnView: boolean` — default `true`
  Count when scrolled into view rather than on mount.
- `className: string`
  Merged onto the outer span via `cn`.
- `onComplete: () => void`
  Fired once the final figure is written.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
const DURATION = 1.6;
const EASE = 'power2.inOut';
const VIEW_THRESHOLD = 0.6;

export function EasedNumberCounter({
  to,
  from = 0,
  duration = DURATION,
  ease = EASE,
  delay = 0,
  locale,
  decimals = 0,
  grouping = true,
  prefix = '',
  suffix = '',
  startOnView = true,
  className,
  onComplete,
}: EasedNumberCounterProps) {
  const root = useRef<HTMLSpanElement>(null);
  const live = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const { inView } = useInView(root, { threshold: VIEW_THRESHOLD, once: true });

  // Held in a ref so an inline arrow from the caller does not restart the
  // count on every parent render.
  const complete = useRef(onComplete);
  complete.current = onComplete;

  // One formatter for the whole tween, keyed only on the primitives that
  // change it. An options *object* prop would be a new reference every render
  // and would rebuild the formatter — and restart the tween — continuously.
  const format = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
        useGrouping: grouping,
      }),
    [locale, decimals, grouping],
  );

  useEffect(() => {
    const el = live.current;
    if (!el) return;

    const counter = { v: from };
    const write = () => {
      el.textContent = `${prefix}${format.format(counter.v)}${suffix}`;
    };

    // Reduced motion is the final figure, immediately — not a blank slot and
    // not a 0.01s tween that still flickers through every intermediate value.
    if (reduced) {
      counter.v = to;
      write();
      complete.current?.();
      return;
    }

    write();
    if (startOnView && !inView) return;

    const tween = gsap.to(counter, {
      v: to,
      duration,
      ease,
      delay,
      overwrite: true,
      onUpdate: write,
      onComplete: () => {
        // Snap to the exact target. Floating-point tweens land on
        // 99.99999999 often enough that a counter visibly stopping one short
        // of its own headline number is a real bug report.
        counter.v = to;
        write();
        complete.current?.();
      },
    });

    return () => {
      tween.kill();
    };
  }, [
    from,
    to,
    duration,
    ease,
    delay,
    prefix,
    suffix,
    format,
    reduced,
    inView,
    startOnView,
  ]);
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The effect returns `tween.kill()`. Because the tween target is a local object rather than a DOM node, nothing is left written to the element beyond the final string, and there are no inline styles to clear.

**Reduced motion.** Writes the final formatted figure immediately and fires `onComplete`, with no tween created at all. It is never left blank and never runs a shortened tween that still flickers through intermediate values.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Constructing `new Intl.NumberFormat()` inside `onUpdate`. It costs tens of microseconds and it is being built 60-120 times a second per counter; a page of eight stats spends milliseconds a frame building formatters it throws away.
- Tweening the string, or holding the value in `useState`. A `setState` per frame re-renders the subtree at display refresh rate, and worse, any unrelated parent render snaps the number back to the last committed value mid-count.
- Rendering the live value as React children. React will diff and overwrite whatever the tween wrote, so the count freezes on the first parent re-render.
- Not snapping to the exact target in `onComplete`. Floating-point interpolation lands near, not on, the target — the counter finishes at 99,999 instead of 100,000.
- Letting the box size itself from the current text. Every added digit widens the element and shoves the following copy sideways; the count ends up looking like a layout bug.
- Using `visibility: hidden` for the sizer. That removes it from the accessibility tree as well, and the transparent copy is the only readable text on the element — the live node is `aria-hidden` because it is mid-count garbage.

## Notes

- The `onComplete` callback is held in a ref that is reassigned on every render, so passing an inline arrow from the caller does not restart the count on every parent render.
- A number formatting *options object* prop was deliberately not exposed: an object literal is a new reference every render, which would rebuild the formatter, invalidate the effect, and restart the tween continuously.

## Definition of done

Scroll the stat into view: the number counts from its start value, decelerates, and stops on exactly the stated figure — check the last digit. Nothing to the right of the number moves while it counts. Enable reduced motion, reload, and the final figure is present on first paint. Force a parent re-render mid-count and the number keeps counting rather than snapping backwards.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
