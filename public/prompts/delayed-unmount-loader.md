# Build: Delayed-Unmount Loader

An inverted full-cover loading panel that fades out on a plain CSS transition. The mechanism is the timing of its own removal: when `loading` goes false the element sets `data-exit` and starts a 600ms fade, and a matching 600ms timeout is what finally unmounts it. Nothing is animated in JavaScript — one boolean, one timeout, one transition.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A loading overlay that stays mounted 600ms past the signal so its fade can actually play before it leaves.

- Category: transition
- Runtime cost: css
- Dependencies: none beyond React

## How it works

1. Internal `mounted` state starts true so the overlay is present in the very first paint, before any effect has run. Deriving visibility from the `loading` prop alone is what makes the exit impossible to animate.
2. When `loading` flips false, `data-exit="true"` lands on the element and the CSS rule `.k-dul[data-exit="true"] { opacity: 0; pointer-events: none }` takes over the transition declared on `.k-dul`.
3. In the same effect a `setTimeout(() => setMounted(false), exitMs)` is armed. The timeout and the transition read the same `exitMs`, passed to CSS as the custom property `--k-dul-exit`, so they cannot drift apart.
4. If `loading` goes true again — a second route, a refetch — the effect clears the pending timeout and re-arms the overlay. Because the exit is a CSS transition rather than a keyframe, an interruption mid-fade reverses from wherever the opacity had got to instead of jumping to 1.
5. The panel is drawn with the foreground colour as its background and the background colour as its text, so the reveal reads as a tonal inversion rather than a curtain, and a single pulsing dot between two brackets is the only moving part.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `exitMs = 600`
  Drives both the CSS transition and the unmount timeout. Under ~350ms a full-bleed tonal flip reads as a flicker; over ~800ms the page is legible behind a veil that is still technically covering it. Whatever value you pick, the timeout must be >= the transition or the node disappears mid-fade.
- `pulse period = 1s`
  One cycle per second is close to a resting heart rate and reads as "alive, waiting". Faster reads as urgency and makes a slow load feel worse than it is.
- `pulse scale range = 0.86 -> 1`
  Small enough that the dot never appears to change its typographic size between the brackets; a larger range makes the bracket pair look mis-set.

## API

```ts
function DelayedUnmountLoader(props: { loading: boolean; exitMs?: number; label?: string; hint?: string; position?: 'fixed' | 'absolute'; className?: string }): JSX.Element | null
```

- `loading: boolean`
  While true the overlay is opaque. False starts the reveal.
- `exitMs: number` — default `600`
  Fade length and unmount delay. One number drives both.
- `label: string` — default `'Loading experience'`
  Left-hand text.
- `hint: string` — default `'it won’t be long'`
  Right-hand text.
- `position: 'fixed' | 'absolute'` — default `'fixed'`
  Viewport cover, or cover of the nearest positioned ancestor.
- `className: string`
  Merged onto the overlay.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function DelayedUnmountLoader({
  loading,
  exitMs = 600,
  label = 'Loading experience',
  hint = 'it won’t be long',
  position = 'fixed',
  className,
}: DelayedUnmountLoaderProps) {
  // Starts true so the overlay is in the very first paint. Deriving it from
  // `loading` alone is what makes the exit un-animatable.
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    if (loading) {
      // A second load (route change, refetch) re-arms the overlay.
      setMounted(true);
      return;
    }
    const t = setTimeout(() => setMounted(false), exitMs);
    return () => clearTimeout(t);
  }, [loading, exitMs]);

  if (!mounted && !loading) return null;

  return (
    <div
      // `data-exit` is the only thing that changes on the element. The
      // transition is declarative, so an interrupted reveal (loading goes
      // true again mid-fade) reverses from wherever it got to instead of
      // jumping.
      data-exit={!loading}
      aria-hidden={!loading}
      className={cn(
        'k-dul z-50 flex items-center justify-center',
        // Inverted: the loader is the page's negative, so the reveal reads as
        // a tonal flip rather than a curtain being pulled aside.
        'bg-fg text-bg',
        position === 'fixed' ? 'fixed inset-0' : 'absolute inset-0',
        className,
      )}
      style={{ ['--k-dul-exit' as string]: `${exitMs}ms` }}
    >
      <style>{CSS}</style>
      <div className="flex w-full items-center justify-between gap-2 px-4">
        <p className="w-1/3 font-mono text-[0.6875rem] uppercase leading-none tracking-[0.08em]">
          {label}
        </p>
        <p className="flex w-1/3 justify-center font-mono text-2xl leading-none tracking-[0.1em]">
          <span aria-hidden>[</span>
          <span className="k-dul-dot inline-block px-[0.15em]" aria-hidden>
            &middot;
          </span>
          <span aria-hidden>]</span>
        </p>
        <p className="w-1/3 text-right font-mono text-[0.6875rem] uppercase leading-none tracking-[0.08em]">
          {hint}
        </p>
      </div>
    </div>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The single timeout is cleared in the effect's cleanup, so a route change or an unmount during the fade cannot call `setMounted` on a component React has already released.

**Reduced motion.** The dot stops pulsing and sits at a fixed opacity, and the fade collapses to 1ms so the overlay simply disappears. The unmount delay is unchanged, and the exiting overlay is `pointer-events: none` throughout, so nothing is blocked while it waits.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Rendering `{loading && <Loader />}`. React removes the node on the same commit that flips the flag, so the transition has no element to run on and the loader disappears on a cut. The component owns its own removal.
- Using a keyframe animation with `forwards` for the exit. Interrupt it by starting a second load and it snaps to the start; a transition on a class/attribute is interruptible in both directions for free.
- Letting the timeout and the transition duration live in different files. They drift, and either the loader is cut off mid-fade or a fully transparent overlay sits on top of the page eating clicks. One `exitMs` feeds both, and the CSS reads it from a custom property.
- Forgetting `pointer-events: none` in the exit state. For the whole fade the page is visible but not clickable, which reads as the site having frozen just as it finished loading.
- Not clearing the timeout when `loading` goes true again. The stale timer unmounts the re-armed overlay mid-load and the page flashes through underneath.
- Leaving the pulse running under `prefers-reduced-motion`. An indefinitely looping animation is exactly what that preference exists to stop; the media query drops it to a static dot.

## Notes

- App Router wiring: render this in `app/layout.tsx` above `{children}` and drive `loading` from your own readiness state — `document.fonts.ready`, a data promise, or a route-change flag from `usePathname()`. For a first-load preloader that must never hang, use `safe-preloader` instead: this component trusts whoever owns the boolean.
- `position="absolute"` covers the nearest positioned ancestor instead of the viewport, which is what makes it embeddable in a card or a preview frame.
- The delayed-unmount pattern generalises: any exit animation on a conditionally rendered node needs the node to outlive the condition by at least the animation duration.

## Definition of done

Load the page and the inverted panel is in the first paint with its dot pulsing. When loading ends the panel fades over 600ms and the node is gone from the DOM immediately afterwards — not before. Trigger a second load mid-fade and the panel returns from its current opacity rather than snapping to full.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
