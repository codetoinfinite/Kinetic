# Build: Slab Page Transition

The outgoing page slides one screen height up and out while a solid slab rises from below to take its place. The route commits under the slab, the slab holds for a beat with the destination name on it, then the slab keeps travelling up and out while the new page follows it in from below. Nothing reverses direction at any point, which is the whole difference between a slab and a curtain: a curtain that drops and lifts reads as an interruption, a slab that passes through reads as travel.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

An opaque slab rises through the frame, the route changes under it, and it keeps going — nothing ever reverses.

- Category: transition
- Runtime cost: dom
- Dependencies: gsap@^3.15.0

## How it works

1. One paused GSAP timeline, played from zero on every navigation, covers the whole gesture. `to(content, { y: -H })` and `fromTo(slab, { y: +H }, { y: 0 })` both start at 0 and run for `duration`; a `.call()` at `duration` fires the caller's commit; `set(content, { y: +H })` on that same frame teleports the page below the frame; then `to(slab, { y: -H })` and `to(content, { y: 0 })` both start at `duration + hold`. Total length is `2 * duration + hold`.
2. The midpoint commit and the content teleport happen while the slab is exactly covering the frame, so neither is ever visible. That is the only reason the page can jump from -H to +H without a flash: there is an opaque surface in front of it for the whole of that frame.
3. Each half eases `power3.inOut` on its own rather than one tween covering the full 2H. An `inOut` across the whole travel is at its FASTEST in the middle — precisely where the slab has to look like it stopped. Two `inOut` halves meet at zero velocity, so the slab lands, holds, and leaves.
4. Travel is measured in pixels per run — `window.innerHeight` when `position="fixed"`, `root.getBoundingClientRect().height` when `"absolute"` — through GSAP function-based values. `yPercent: -100` would be 100% of the CONTENT element's own height, which on a long page is the whole document, so the page would fly thousands of pixels instead of one screen.
5. `tl.invalidate().play(0)` starts each run. `invalidate()` re-evaluates every function-based value, so a resized container or a flipped direction is picked up without rebuilding the timeline; without it the slab travels whatever height the box had when the component mounted.
6. Direction is a sign read from a ref inside those function values, and the ref is written in `run()` before `play(0)` rather than during render. `play(0)` renders the timeline synchronously, so a direction that only landed on the next React commit would be read one frame late and the two halves would disagree about which way is out.
7. The slab's parked position — `transform: translateY(100%)` — is declared in an injected stylesheet, not set from an effect. Effects run after the first paint, so a slab parked from JS is one frame of full-frame colour on mount. GSAP's inline transform outranks the rule while a transition runs, and when `useGsap` reverts it strips that inline value, which re-parks the slab with no extra code.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `SLAB_DURATION = 0.8`
  Seconds for ONE half; the full gesture is twice this plus the hold. The source ran 1 s per half and 0.8 keeps the weight while taking 0.4 s off the round trip. Under ~0.5 s the slab stops reading as a physical object and becomes a colour flash; over ~1.1 s the hold in the middle turns into a wait and people click a second nav item.
- `SLAB_HOLD = 0.12`
  Seconds the slab sits still at full cover. Two jobs: it is the beat in which the label is legible, and it is the margin in which React commits the destination — the commit fires at the start of the hold, so a page whose first layout costs two or three frames still finishes laying out before the slab moves off it. At 0 a heavy destination visibly settles while it is sliding in.
- `SLAB_EASE = 'power3.inOut'`
  Applied to each half separately. `inOut` is the only family that starts and ends at zero velocity, which is what makes the midpoint a stop rather than a peak. `power3` specifically: `power2` does not hold still long enough at the ends for the hold to read as deliberate, and `power4` spends so long near stationary that the 0.8 s feels like 1.2 s.
- `zIndex = 190`
  Above a custom cursor (150) and a scroll progress bar (120), both of which must be hidden during a transition, and below a preloader (200), which has to be able to sit over a slab on first load.

## API

```ts
function SlabPageTransition(props: { controller: SlabNavigation; children: ReactNode; duration?: number; hold?: number; direction?: "up" | "down"; color?: string; labelClassName?: string; position?: "fixed" | "absolute"; zIndex?: number; className?: string }): JSX.Element
function useSlabNavigation(): { host: RefObject<SlabRunner | null>; navigate: (commit: () => void, options?: { label?: string; direction?: "up" | "down" }) => void }
```

- `controller: SlabNavigation`
  From `useSlabNavigation()`. The component registers its runner on it.
- `children: ReactNode`
  The current page. Swapped by the `commit` you hand to `navigate`.
- `duration: number` — default `0.8`
  Seconds for ONE half. The full gesture is `2 * duration + hold`.
- `hold: number` — default `0.12`
  Seconds the slab holds at full cover, between the halves.
- `direction: "up" | "down"` — default `"up"`
  Default travel. Overridable per navigation via the options argument.
- `color: string` — default `'#000'`
  Any CSS colour. Must be opaque, or the swap shows through the slab.
- `labelClassName: string`
  Applied to the label span, so the caller owns its typography.
- `position: "fixed" | "absolute"` — default `"fixed"`
  `absolute` inside a bounded container; `fixed` for a real page transition.
- `zIndex: number` — default `190`
  Above the site and any custom cursor, below a preloader.
- `className: string`
  Merged onto the root via `cn`.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/**
 * Seconds for one half. The source ran 1 s per half; 0.8 keeps the weight and
 * takes 0.4 s off the round trip. Under ~0.5 s the slab stops reading as a
 * physical object and becomes a colour flash; over ~1.1 s the hold in the
 * middle turns into a wait, and people click a second nav item.
 */
export const SLAB_DURATION = 0.8;

/**
 * Seconds the slab sits still at full cover, between the two halves. Two jobs:
 * it is the beat in which the slab's label is legible, and it is the margin in
 * which React commits the destination. The commit fires at the start of the
 * hold, so a destination whose first layout costs two or three frames still
 * finishes laying out before the slab starts moving off it. At 0 a heavy page
 * visibly settles while it is sliding in.
 */
export const SLAB_HOLD = 0.12;

/** Both halves. `inOut` on each is what makes the midpoint a stop, not a peak. */
const SLAB_EASE = 'power3.inOut';

const SLAB_CSS = `
.kx-slab-panel {
  /* An opaque full-frame surface must never eat a click, not even while it is
     covering. Mid-transition the pointer is usually already aimed at the next
     nav item. */
  pointer-events: none;
  z-index: var(--kx-slab-z, 190);
  background: var(--kx-slab-color, #000);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
/* The parked position lives in CSS, not in an inline style and not in a
   'gsap.set' inside an effect. Effects run after the first paint, so a slab
   parked from JS is one frame of full-frame colour on mount. GSAP's inline
   'transform' outranks these rules while a transition runs, and when
   'useGsap' reverts it strips that inline value — which parks the slab again
   with no extra code. */
.kx-slab-park-up { transform: translateY(100%); }
.kx-slab-park-down { transform: translateY(-100%); }
`;

export interface SlabNavigateOptions {
  /** Written into the slab, legible during the hold. */
  label?: string;
  /** Overrides the component's `direction` for this one navigation. */
  direction?: 'up' | 'down';
}

/** What the component registers on the controller. Internal. */
export interface SlabRunner {
  run: (commit: () => void, options?: SlabNavigateOptions) => void;
}

export interface SlabNavigation {
  /** Pass straight to `<SlabPageTransition controller>`. Do not read it. */
  host: RefObject<SlabRunner | null>;
  /**
   * Raise the slab, run `commit` — your navigation — under it, then lower the
   * page in behind it.
   */
  navigate: (commit: () => void, options?: SlabNavigateOptions) => void;
}

/**
 * The caller's half. `commit` is a callback rather than a router call, so
 * nothing here depends on a routing library.
 */
export function useSlabNavigation(): SlabNavigation {
  const host = useRef<SlabRunner | null>(null);

  const navigate = useCallback(
    (commit: () => void, options?: SlabNavigateOptions) => {
      const runner = host.current;
      // No mounted component — the caller wired the hook up but rendered the
      // transition conditionally, or this fired during the first commit.
      // Navigate anyway. A transition that swallows navigations is worse than
      // no transition.
      if (!runner) {
        commit();
        return;
      }
      runner.run(commit, options);
    },
    [],
  );

  return useMemo(() => ({ host, navigate }), [navigate]);
}

export interface SlabPageTransitionProps {
  /** From `useSlabNavigation()`. */
  controller: SlabNavigation;
  /** The current page. Swapped by the `commit` you hand to `navigate`. */
  children: ReactNode;
  /** Seconds for ONE half. The full gesture is `2 * duration + hold`. */
  duration?: number;
  /** Seconds the slab holds at full cover between the halves. */
  hold?: number;
  /**
   * Default travel. `up` sends everything upward; `down` mirrors it, which is
   * what a back navigation wants. Overridable per navigation.
   */
  direction?: 'up' | 'down';
  /** Any CSS colour. Must be opaque, or the swap shows through the slab. */
  color?: string;
  /** Applied to the label span so the caller owns its type. */
  labelClassName?: string;
  /** `absolute` to demo inside a bounded box; `fixed` for a real page. */
  position?: 'fixed' | 'absolute';
  /** Above the site, below a preloader. */
  zIndex?: number;
  className?: string;
}

export function SlabPageTransition({
  controller,
  children,
  duration = SLAB_DURATION,
  hold = SLAB_HOLD,
  direction = 'up',
  color = '#000',
  labelClassName,
  position = 'fixed',
  zIndex = 190,
  className,
}: SlabPageTransitionProps) {
  const root = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const slab = useRef<HTMLDivElement>(null);
  const labelEl = useRef<HTMLSpanElement>(null);

  const timeline = useRef<ReturnType<typeof gsap.timeline> | null>(null);
  const pending = useRef<(() => void) | null>(null);
  const reduced = useReducedMotion();

  // Read inside the tweens' function-based values, so flipping direction
  // between navigations needs no rebuild — and therefore no `revert()`, which
  // would strip the transform GSAP is mid-way through writing. Set in `run`,
  // never during render: `play(0)` renders the timeline synchronously, so a
  // value that only lands on the next React commit would be read one frame
  // too late and the two halves would disagree about which way is out.
  const dir = useRef<'up' | 'down'>(direction);
  const defaultDir = useRef(direction);
  defaultDir.current = direction;

  // Built once and held paused. `direction` is deliberately NOT a dependency:
  // `useGsap` reverts on every dependency change, and revert removes the
  // inline transform, so a rebuild during a transition drops the slab back to
  // its CSS park mid-cover and the swap is visible.
  useGsap(
    gsap,
    () => {
      const rootEl = root.current;
      const contentEl = content.current;
      const slabEl = slab.current;
      if (!rootEl || !contentEl || !slabEl) return;

      // Travel in pixels, measured per run. `yPercent: -100` would be 100% of
      // the CONTENT's own height — on a long page that is the whole document,
      // so the page would fly thousands of pixels instead of one screen. The
      // original wrote `y: '-100vh'` for exactly this reason; measuring the
      // real box also gets the bounded case right, where one screen is the
      // container and not the viewport.
      const travel = () =>
        position === 'fixed'
          ? window.innerHeight
          : rootEl.getBoundingClientRect().height;
      const sign = () => (dir.current === 'down' ? -1 : 1);

      const tl = gsap.timeline({ paused: true });

      tl.to(contentEl, { y: () => -travel() * sign(), duration, ease: SLAB_EASE }, 0)
        .fromTo(
          slabEl,
          { y: () => travel() * sign() },
          { y: 0, duration, ease: SLAB_EASE },
          0,
        )
        // Midpoint. The slab is exactly covering the frame for the whole of
        // this and the `set` below, so neither is ever seen.
        .add(() => {
          const commit = pending.current;
          pending.current = null;
          commit?.();
        })
        .set(contentEl, { y: () => travel() * sign() })
        .to(
          slabEl,
          { y: () => -travel() * sign(), duration, ease: SLAB_EASE },
          duration + hold,
        )
        .to(contentEl, { y: 0, duration, ease: SLAB_EASE }, duration + hold)
        // Re-park the slab below the frame at the very end, so `progress(0)`
        // and `progress(1)` describe the same rest state and a second run
        // starts from a known place rather than from wherever it stopped.
        .set(slabEl, { y: () => travel() * sign() });

      timeline.current = tl;

      return () => {
        timeline.current = null;
        // A dependency change reverts and kills this timeline. If it happened
        // mid-transition the commit had not fired yet, so fire it here: the
        // visitor clicked a link and must end up on that page whatever the
        // animation did.
        const commit = pending.current;
        pending.current = null;
        commit?.();
      };
    },
    root,
    [duration, hold, position],
  );

  const run = useCallback(
    (commit: () => void, options?: SlabNavigateOptions) => {
      const tl = timeline.current;
      const span = labelEl.current;
      if (span) span.textContent = options?.label ?? '';
      dir.current = options?.direction ?? defaultDir.current;

      // Reduced motion: no slab and a synchronous commit. Not a zero-duration
      // slab — that is still one frame of full-frame colour, which is the
      // single most unpleasant thing to show someone who asked for less
      // motion. `pause(0)` suppresses callbacks, so the midpoint `.call()`
      // cannot fire a second commit.
      if (!tl || reduced) {
        tl?.pause(0);
        commit();
        return;
      }
      // A second click while the slab is in flight would queue a second commit
      // and land the visitor one page past where they aimed.
      if (tl.isActive()) return;

      pending.current = commit;
      // `invalidate()` before replaying re-evaluates every function-based
      // value: the box may have been resized, and `direction` may have
      // flipped, since the timeline was built. Without it the slab travels the
      // height the container had on mount.
      tl.invalidate().play(0);
    },
    [reduced],
  );

  useEffect(() => {
    const host = controller.host;
    host.current = { run };
    return () => {
      if (host.current?.run === run) host.current = null;
    };
  }, [controller, run]);
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** `useGsap` reverts the `gsap.context`, which kills the timeline and strips every inline transform it wrote — restoring the slab to the parked position its stylesheet rule specifies and the page to `y: 0`. The cleanup also flushes any commit that had not fired yet, so a prop change mid-transition cannot lose a navigation. The runner registration is removed from the controller on unmount, and it is removed only if it is still the current one, so a remount cannot null out the live handle.

**Reduced motion.** The timeline is never played. `navigate()` calls the commit synchronously and `tl.pause(0)` resets the slab to its rest position — deliberately not a zero-duration slab, which is still one frame of full-frame colour. `pause()` suppresses callbacks, so the midpoint `.call()` cannot fire a second commit. Navigation is a hard cut straight to the destination in both directions.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Using `yPercent: -100` on the page wrapper. Percentage transforms resolve against the element's OWN height, so on a 6000 px page the wrapper travels 6000 px in 0.8 s and the screen just goes blank a frame in. The travel has to be one screen — measured in pixels, or written as the original did with an explicit `vh` unit.
- Reversing the slab instead of driving it through. `tl.reverse()` after the commit sends the slab back down the way it came, and the eye reads the whole thing as a mistake being undone rather than as a move. The second half is a separate forward tween to `-H`.
- One `power3.inOut` across the full 2H travel. That ease is at maximum speed at its own midpoint, which is exactly the frame the route changes on, so the slab appears to accelerate straight through the cover and the label is unreadable.
- Putting the direction flag in the `useGsap` dependency list. Every dependency change reverts the context, and `revert()` strips the inline transform GSAP is mid-way through writing — so flipping direction during a transition drops the slab back to its CSS park while it is meant to be covering, and the content swap is visible. Direction is read from a ref by function-based values instead.
- Parking the slab with `gsap.set` in an effect. Effects run after the first paint, so the first frame of the page is a full-frame slab. The rest position belongs in a stylesheet; GSAP overrides it from the inline style the moment it is needed.
- Setting the slab label through state. `setLabel()` inside the navigate handler re-renders the subtree React is about to hand to GSAP on the exact frame the timeline starts. The label is one `textContent` write on a ref, and the slab is off-frame when it happens.
- Letting a second click start a second run. Without the `tl.isActive()` guard a double click queues two commits and the visitor lands one page past where they aimed.
- Dropping the commit when the timeline is destroyed. If a prop change reverts the context mid-transition, the `.call()` never fires and the route never changes — the visitor clicked a link and stayed put. The `useGsap` cleanup flushes any pending commit.
- Leaving the slab clickable. A full-frame opaque div swallows the pointer for the length of the transition, and mid-transition the pointer is usually already aimed at the next nav item. It carries `pointer-events: none` and `aria-hidden`.

## Notes

- In Next.js App Router: mount once in `app/layout.tsx` with `position="fixed"`, then replace nav `<Link>` elements with buttons calling `navigate(() => router.push(href), { label })`. Nothing in this file imports `next/navigation` — the commit is a callback, so the same component works under React Router or a plain `useState` page switch.
- The content wrapper stays in normal flow. A transform moves an element without taking it out of flow, so the page keeps its own height and the document still scrolls — which an `absolute inset-0` wrapper would break on any real page.
- The colour must be opaque. A translucent slab shows the content teleport at the midpoint, which is the single artefact this technique exists to hide.
- Browser back and forward change the route without going through `navigate()`, so they get no slab. That is correct: by the time your code hears about a history navigation it has already happened, and there is nothing left to cover.
- Set `direction: "down"` per navigation for anything that reads as going back — an up-nav click, a breadcrumb, a close button — and the site acquires a sense of which way the visitor is travelling for the cost of one ternary.

## Definition of done

Click a nav item: the page slides up out of frame while a coloured slab rises from below, the slab pauses at full cover with the destination name on it, then continues up and out while the new page follows it in from below. The slab never travels downward on a forward navigation, and there is no frame in which old and new content are both visible. Click a nav item to the left of the current one and the whole gesture mirrors — everything travels down. Click two items in quick succession and you land on the first one you clicked, not past it. Resize the preview and navigate again: the slab still travels exactly one frame height. With reduced motion the content swaps instantly with no coloured frame in either direction.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
