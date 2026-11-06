# Build: Asymmetric In/Out Staggers

A list whose entrance and exit are deliberately different animations. In: 24px up, 0.5s each, 0.06s apart, after a 0.25s hold that lets the outgoing view clear. Out: 16px up, 0.3s each, 0.03s apart, running from the last item back to the first. The exit is roughly half the total time of the entrance, which is what makes a view swap feel responsive without making the arrival feel rushed.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A list that arrives item by item after a hold and leaves twice as fast, from the last row backwards.

- Category: transition
- Runtime cost: dom
- Dependencies: gsap@^3.15.0

## How it works

1. Every direct child is wrapped in a `[data-stagger-item]` div, so the caller writes ordinary list markup and the component owns the animated node — no cloneElement, no required ref forwarding.
2. Entering runs `gsap.fromTo(items, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: "power2.out", stagger: 0.06, delay: 0.25 })`. The delay is not decoration: it is the window in which whatever this list replaces finishes leaving.
3. Leaving runs `gsap.to(items, { autoAlpha: 0, y: -16, duration: 0.3, ease: "power2.in", stagger: { each: 0.03, from: "end" } })`. Halving the stagger and reversing its origin is what stops the exit from reading as the entrance rewound.
4. `autoAlpha` rather than `opacity`: at zero it also writes `visibility: hidden`, so a faded row cannot swallow a click aimed at the view underneath it.
5. Both tweens carry `overwrite: "auto"`, and the whole thing lives in a `useGsap` context keyed on `show`, so toggling twice in quick succession cancels the in-flight direction instead of layering two opposing tweens on the same nodes.
6. A layout effect hides the items before first paint when the component mounts closed, and an internal `hasShown` flag makes sure `onExited` can only fire after a real entrance.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `inStagger = 0.06`
  Seconds between arriving items. Below ~0.04 a five-item list reads as one block; above ~0.1 the last row lands well after the eye has moved on and the list feels slow to load.
- `outStagger = 0.03`
  Half the entrance value. Exits are acknowledgement, not presentation — the wave still reads as a direction, but the whole list is gone in under 200ms.
- `inDelay = 0.25`
  Seconds of hold before the first item arrives. Sized to the outgoing view's own fade (~0.3-0.4s) so the two never overlap; at 0 both views are half-opaque at the same time and the frame looks like a rendering bug.
- `inDuration / outDuration = 0.5 / 0.3`
  Per-item. The exit is shorter for the same reason its stagger is: nobody is reading rows that are leaving.
- `inDistance / outDistance = 24 / 16`
  Pixels. The entrance comes up from below (from where the content is arriving); the exit continues upward and travels less, because a long exit path is time spent watching nothing.
- `stagger.from = 'end'`
  Reverses the exit wave. Same-direction staggers make the exit look like a backwards entrance; from the end it looks like the list is being pulled off the screen.

## API

```ts
function AsymmetricStagger(props: { children: ReactNode; show: boolean; inStagger?: number; outStagger?: number; inDelay?: number; inDuration?: number; outDuration?: number; inDistance?: number; outDistance?: number; onExited?: () => void; className?: string; itemClassName?: string }): JSX.Element
```

- `children: ReactNode`
  List items. Each direct child is wrapped and animated on its own.
- `show: boolean`
  True enters, false exits. The component stays mounted through both.
- `inStagger: number` — default `0.06`
  Seconds between entering items.
- `outStagger: number` — default `0.03`
  Seconds between leaving items.
- `inDelay: number` — default `0.25`
  Hold before the entrance, sized to the outgoing view.
- `inDuration: number` — default `0.5`
  Per-item entrance length in seconds.
- `outDuration: number` — default `0.3`
  Per-item exit length in seconds.
- `inDistance: number` — default `24`
  Pixels travelled on the way in.
- `outDistance: number` — default `16`
  Pixels travelled on the way out.
- `onExited: () => void`
  Called once the last item has left. Safe place to unmount the data.
- `className: string`
  Merged onto the flex column wrapper.
- `itemClassName: string`
  Merged onto every generated item wrapper.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function AsymmetricStagger({
  children,
  show,
  inStagger = 0.06,
  outStagger = 0.03,
  inDelay = 0.25,
  inDuration = 0.5,
  outDuration = 0.3,
  inDistance = 24,
  outDistance = 16,
  onExited,
  className,
  itemClassName,
}: AsymmetricStaggerProps) {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const exited = useRef(onExited);
  exited.current = onExited;

  const startedHidden = useRef(!show);
  /* An exit only makes sense after an entrance. Without this, mounting with
     `show={false}` plays an invisible exit and fires `onExited` — and under
     StrictMode the double-invoked effect fires it a second time. */
  const hasShown = useRef(show);
  /* One exit per hide. `reduced` is in the effect's dep list because the OS
     setting is live, so flipping it while the list is already hidden re-entered
     the exit branch and fired `onExited` a second time — at which point a
     parent that unmounts its data on that callback unmounts it twice. */
  const exitPlayed = useRef(false);

  // Before paint, not after. A passive effect can land on the far side of the
  // first frame, so a list that starts closed would flash its items once.
  useLayoutEffect(() => {
    const el = root.current;
    if (!el || !startedHidden.current) return;
    gsap.set(el.querySelectorAll('[data-stagger-item]'), { autoAlpha: 0 });
  }, []);

  useGsap(
    gsap,
    () => {
      const el = root.current;
      if (!el) return;
      const items = Array.from(el.querySelectorAll<HTMLElement>('[data-stagger-item]'));
      if (items.length === 0) return;

      if (!show && !hasShown.current) return;

      // Re-entering the exit branch for a list that has already gone. The
      // `revert()` this hook runs before every re-execution has just undone the
      // exit tween's styles, so the list is visible again and has to be put
      // back — but it must not animate and must not report a second exit.
      if (!show && exitPlayed.current) {
        gsap.set(items, { autoAlpha: 0 });
        return;
      }

      if (reduced) {
        // No travel and no stagger, but the state change still has to happen
        // or the list is stuck in whichever position it was left in.
        gsap.set(items, { autoAlpha: show ? 1 : 0, y: 0 });
        if (show) {
          hasShown.current = true;
          exitPlayed.current = false;
        } else {
          exitPlayed.current = true;
          exited.current?.();
        }
        return;
      }

      if (show) {
        hasShown.current = true;
        exitPlayed.current = false;
        // autoAlpha, not opacity: at 0 it also sets visibility:hidden, so a
        // faded-out row cannot still swallow a click meant for what is
        // underneath it.
        gsap.fromTo(
          items,
          { autoAlpha: 0, y: inDistance },
          {
            autoAlpha: 1,
            y: 0,
            duration: inDuration,
            ease: 'power2.out',
            stagger: inStagger,
            delay: inDelay,
            overwrite: 'auto',
          },
        );
        return;
      }

      exitPlayed.current = true;
      // `fromTo`, not `to`, and the start state is stated rather than read off
      // the element. This hook reverts its context before every re-run, and
      // revert restores the inline styles that were on the node BEFORE the
      // entrance tween — which, for a list that mounted with `show={false}`,
      // are the `visibility: hidden; opacity: 0` written by the pre-paint set
      // above. A `to()` therefore tweened a list that was already invisible:
      // it vanished on the frame the hide was requested and `onExited` still
      // arrived `outDuration` later. Reaching here at all means the entrance
      // has run, so fully visible is the honest place to leave from.
      gsap.fromTo(
        items,
        { autoAlpha: 1, y: 0 },
        {
          autoAlpha: 0,
          y: -outDistance,
          duration: outDuration,
          ease: 'power2.in',
          // `from: 'end'` reverses the wave. Same-direction staggers on the way
          // out read as the list re-entering backwards.
          stagger: { each: outStagger, from: 'end' },
          overwrite: 'auto',
          onComplete: () => exited.current?.(),
        },
      );
    },
    root,
    [show, reduced],
  );
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** `useGsap` reverts the context on unmount and on every `show` change, killing both tweens and restoring the inline styles GSAP wrote. `onExited` is held in a ref so a completion callback cannot reach a stale closure after the parent has re-rendered.

**Reduced motion.** No travel and no stagger. Items are set to their visible or hidden state in one `gsap.set`, and `onExited` still fires, so the surrounding state machine behaves identically — only the choreography is dropped.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Reusing the entrance timeline with `reverse()`. That gives you power2.out played backwards (so it decelerates into nothing), the entrance delay stranded at the end, and the same stagger direction — three separate reasons the exit feels heavy.
- Unmounting the list when `show` flips false. React removes the nodes on the same frame, so the exit never runs; the component stays mounted and reports completion through `onExited`.
- Animating `opacity` alone. A finished row sits at opacity 0 with full hit area and eats clicks intended for the view underneath. `autoAlpha` writes `visibility: hidden` at zero.
- Omitting `overwrite: "auto"`. Toggling twice inside 300ms leaves the entrance tween running under the exit tween, and the rows settle at whatever opacity the two happen to agree on.
- Setting the initial hidden state in a passive effect. Mounting with `show={false}` paints the list once, then hides it — a visible flash of content that was never meant to be seen. It is set in `useLayoutEffect` instead.
- Firing `onExited` on mount. With `show={false}` at mount there is nothing to exit, and under StrictMode the double-invoked effect would call it twice; a `hasShown` flag gates it.

## Notes

- The same numbers apply outside lists — modals, drawers, route content. Any pair of entrance/exit values that are equal is worth questioning.
- App Router wiring: drive `show` from a pathname comparison in a layout, and do the actual `router.push` from `onExited` if you want the route to change only once the list has gone.

## Definition of done

Switch to the list: the previous view fades, a quarter-second of nothing, then rows arrive top to bottom. Switch back: the bottom row leaves first and the whole list is gone in about half the time it took to arrive. Toggle rapidly and rows never settle at a partial opacity.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
