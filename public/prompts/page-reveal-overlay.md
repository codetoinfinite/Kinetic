# Build: Key-Replayed Page Reveal

Two opaque layers and one CSS keyframe do the whole job of a route transition. The inbound layer carries `key={revealKey}`, so a route change unmounts it and mounts a new one — and a freshly mounted element runs its animation from frame zero, which replays the fade with no state, no library and nothing to reset. The outbound layer fades up to opaque and the navigation commits at 80% of that, while the screen is already covered, so the two halves hand off invisibly without ever referring to each other.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

An opaque overlay that fades away on every route change, replayed by nothing more than a changed React key.

- Category: transition
- Runtime cost: css
- Dependencies: none beyond React

## How it works

1. The inbound layer is `<div key={revealKey} className="kinetic-reveal-in" />`. Its animation runs `from { opacity: 1 }` to `to { opacity: 0; visibility: hidden }` over 0.55 s on `cubic-bezier(0.4, 0, 0.2, 1)` with `forwards`. Changing `revealKey` is the entire replay mechanism: React sees a different key, discards the node, mounts a new one, and the new node starts its animation at frame zero.
2. `visibility: hidden` in the `to` frame, held by `forwards`, is what retires the layer. At `opacity: 0` alone a full-viewport opaque surface stays composited for the rest of the page's life; `visibility` removes it from the compositor without unmounting anything.
3. `usePageCover(coverDuration)` returns `{ covering, cover }`. `cover(commit)` sets `covering` true — which flips `data-covering` on the outbound layer and runs `opacity: 0 -> 1` over `coverDuration` on `cubic-bezier(0.4, 0, 1, 1)` — then, after `coverDuration * 0.8` seconds, calls `setCovering(false)` and `commit()` in the same tick.
4. Both calls in one tick matters: React batches them into a single commit, so the cover drops to transparent on the exact frame the re-keyed inbound layer mounts at opacity 1. Split them across two ticks and there is one frame of bare destination content visible between the two halves.
5. The transition property is declared on the `[data-covering="true"]` rule only, never on the base rule, so release is a hard cut rather than a fade. The inbound layer is opaque and stacked above the cover at that instant, so the cut is invisible — and a symmetric fade there would compound two opacities and hold the screen dark past the end of the reveal.
6. The stylesheet is emitted through React 19's `<style href precedence>` hoisting, which dedupes by `href`. Per-instance values — durations, colour, z-index — ride in CSS custom properties set on the root, because there is only ever one copy of the rule block.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `revealDuration = 0.55`
  Seconds for the inbound fade. Under ~0.35 s the reveal reads as a flicker of the wrong colour rather than a curtain lifting; over ~0.8 s the destination is legible through a haze for long enough that people start clicking through it.
- `PAGE_COVER_DURATION = 0.32`
  Seconds for the outbound cover. Deliberately about half the reveal: leaving should feel decisive and arriving should feel gradual. Exported as a constant so the hook that times the commit and the layer that runs the transition cannot be handed two different numbers.
- `COMMIT_FRACTION = 0.8`
  Fraction of the cover the commit waits for. On `cubic-bezier(0.4, 0, 1, 1)` the layer is roughly 96% opaque at 80% of the way through, so the step to fully covered is imperceptible while a fifth of the perceived navigation latency disappears. At 1.0 every click pays a full 0.32 s of dead time; below ~0.6 the destination is visibly swapped behind a translucent sheet.
- `cover ease = cubic-bezier(0.4, 0, 1, 1)`
  Ease-in, no ease-out. The cover must be at its steepest as it approaches opaque, which is what makes 80% look like 100%. An ease-out cover crawls through its last 20% and the early commit becomes visible.
- `zIndex = 195`
  Above a custom cursor (150) and a scroll progress bar (120) — both of which must be hidden during a transition — and below a preloader (200), which must be able to sit over a reveal on first load.

## API

```ts
function PageRevealOverlay(props: { revealKey: string; revealDuration?: number; coverDuration?: number; covering?: boolean; color?: string; zIndex?: number; position?: "fixed" | "absolute"; className?: string }): JSX.Element
function usePageCover(coverDuration?: number): { covering: boolean; cover: (commit: () => void) => void }
```

- `revealKey: string`
  Identity of the current page. A change replays the reveal. `usePathname()` in Next.js.
- `revealDuration: number` — default `0.55`
  Seconds the inbound cover takes to fade away.
- `coverDuration: number` — default `0.32`
  Seconds the outbound cover takes to reach opaque. Pass the same value to `usePageCover`.
- `covering: boolean` — default `false`
  Drive from `usePageCover().covering`.
- `color: string` — default `'#000'`
  Any CSS colour. Must be opaque, or the page shows through the handoff.
- `zIndex: number` — default `195`
  Above the site and any custom cursor, below a preloader.
- `position: "fixed" | "absolute"` — default `"fixed"`
  `absolute` inside a bounded container; `fixed` for a real page transition.
- `className: string`
  Merged onto the root via `cn`.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/**
 * Seconds the outbound cover takes to reach opaque. Shared default so the hook
 * that times the commit and the layer that runs the transition cannot be given
 * two different numbers.
 */
export const PAGE_COVER_DURATION = 0.32;

/**
 * Fraction of the cover the commit waits for. On the `cubic-bezier(0.4, 0, 1,
 * 1)` cover, 80% of the way through the screen is about 96% opaque, so the
 * step to fully covered is imperceptible — and a fifth of the perceived
 * navigation latency is gone. Waiting for 100% is a fifth of a second of dead
 * time on every single click.
 */
const COMMIT_FRACTION = 0.8;

const REVEAL_CSS = `
@keyframes kinetic-page-reveal {
  from { opacity: 1; }
  to   { opacity: 0; visibility: hidden; }
}
.kinetic-reveal-root {
  /* Never eats a click, not even mid-fade. The layer is opaque and covers the
     whole viewport; one swallowed click on a nav item is a dead site. */
  pointer-events: none;
  z-index: var(--kx-reveal-z, 195);
}
.kinetic-reveal-layer {
  position: absolute;
  inset: 0;
  background: var(--kx-reveal-color, #000);
}
/* Inbound. Starts opaque because it is mounted at the moment the destination
   is mounted, and holds the end frame with 'forwards' so 'visibility: hidden'
   retires the layer from compositing instead of leaving an invisible
   full-screen surface alive for the rest of the page's life. */
.kinetic-reveal-in {
  opacity: 1;
  animation: var(--kx-reveal-duration, 0.55s) cubic-bezier(0.4, 0, 0.2, 1)
    forwards kinetic-page-reveal;
}
/* Outbound. Idle is hidden as well as transparent, for the same reason. */
.kinetic-reveal-cover {
  opacity: 0;
  visibility: hidden;
}
/* The transition is declared on the covering state ONLY, so release is a cut.
   That is deliberate: at release the re-keyed inbound layer is already sitting
   at opacity 1 directly above this one, so a second fade here would compound
   two opacities and hold the screen dark past the end of the reveal. */
.kinetic-reveal-cover[data-covering='true'] {
  opacity: 1;
  visibility: visible;
  transition: opacity var(--kx-cover-duration, 0.32s)
    cubic-bezier(0.4, 0, 1, 1);
}
@media (prefers-reduced-motion: reduce) {
  /* Not 'animation: none' — that would leave the inbound layer parked at its
     opaque from-frame, permanently covering the site. The layers are removed
     entirely, and 'usePageCover' commits synchronously, so navigation is a
     hard cut to the destination with no flash of overlay in either direction. */
  .kinetic-reveal-layer { display: none; }
}
`;

export interface PageRevealOverlayProps {
  /**
   * Identity of the current page. A change replays the reveal. In Next.js App
   * Router this is `usePathname()`; in the demo it is a local state value.
   */
  revealKey: string;
  /** Seconds the inbound cover takes to fade away. */
  revealDuration?: number;
  /** Seconds the outbound cover takes to reach opaque. */
  coverDuration?: number;
  /** Drive from `usePageCover().covering`. */
  covering?: boolean;
  /** Any CSS colour. Must be opaque, or the page shows through the handoff. */
  color?: string;
  /** Above the site, below a preloader. */
  zIndex?: number;
  /** `absolute` to demo inside a bounded box; `fixed` for a real page. */
  position?: 'fixed' | 'absolute';
  className?: string;
}

export function PageRevealOverlay({
  revealKey,
  revealDuration = 0.55,
  coverDuration = PAGE_COVER_DURATION,
  covering = false,
  color = '#000',
  zIndex = 195,
  position = 'fixed',
  className,
}: PageRevealOverlayProps) {
  return (
    <>
      {/* React 19 hoists and dedupes by `href`, so a hundred navigations and
          any number of instances still emit exactly one rule block. Per
          instance values ride in custom properties for that reason. */}
      <style href="kinetic-page-reveal-overlay" precedence="medium">
        {REVEAL_CSS}
      </style>

      <div
        aria-hidden
        className={cn(
          'kinetic-reveal-root',
          position === 'fixed' ? 'fixed inset-0' : 'absolute inset-0',
          className,
        )}
        style={
          {
            '--kx-reveal-duration': `${revealDuration}s`,
            '--kx-cover-duration': `${coverDuration}s`,
            '--kx-reveal-color': color,
            '--kx-reveal-z': zIndex,
          } as CSSProperties
        }
      >
        {/* Cover first, reveal second: later in the DOM paints on top, and the
            inbound layer's opaque first frame is what hides the cover's cut. */}
        <div
          className="kinetic-reveal-layer kinetic-reveal-cover"
          data-covering={covering ? 'true' : 'false'}
        />
        <div key={revealKey} className="kinetic-reveal-layer kinetic-reveal-in" />
      </div>
    </>
  );
}

export interface PageCover {
  /** Feed to `PageRevealOverlay`. */
  covering: boolean;
  /** Raise the cover, then run `commit` — your navigation — under it. */
  cover: (commit: () => void) => void;
}

/**
 * The outbound half. `commit` is a callback rather than a router call so
 * nothing here depends on a routing library.
 */
export function usePageCover(coverDuration = PAGE_COVER_DURATION): PageCover {
  const [covering, setCovering] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduced = useReducedMotion();

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
      timer.current = null;
    },
    [],
  );

  const cover = useCallback(
    (commit: () => void) => {
      // Reduced motion: no cover at all, and the commit is synchronous. A
      // zero-duration cover would still be one frame of opaque colour, which
      // is a flash — the single most unpleasant thing to show someone who has
      // asked for less motion.
      if (reduced) {
        commit();
        return;
      }
      // A second click while a cover is already up would schedule a second
      // commit and navigate twice. The live timer is the lock.
      if (timer.current !== null) return;

      setCovering(true);
      timer.current = setTimeout(
        () => {
          timer.current = null;
          // Both in one tick, so React batches them into a single commit: the
          // cover drops to transparent on the exact frame the re-keyed reveal
          // layer mounts at opacity 1. Split across two ticks and there is one
          // frame of bare destination content between them.
          setCovering(false);
          commit();
        },
        coverDuration * COMMIT_FRACTION * 1000,
      );
    },
    [coverDuration, reduced],
  );

  return { covering, cover };
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The only resource is the commit timer, cleared in an unmount effect and nulled so the lock cannot survive a remount. There are no listeners, no rAF and no tweens; the animations are CSS and die with the nodes React removes.

**Reduced motion.** Both layers get `display: none`, and `usePageCover` calls the commit synchronously rather than starting a timer. Navigation is a hard cut straight to the destination — no cover, no reveal, and crucially not a zero-duration overlay, which would still be one frame of opaque colour.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Animating the overlay with a tween and a timeline. There is nothing to tween: the whole reason this is bulletproof is that a remount restarts a CSS animation, so there is no in-flight animation to kill, no state to reset, and a double navigation cannot leave the overlay half-faded.
- Using `animation: none` for reduced motion. That leaves the inbound layer parked on its opaque `from` frame, permanently covering the site — the failure looks like a blank page. The layers get `display: none` and `usePageCover` commits synchronously instead.
- Committing the navigation after the cover finishes. A fifth of a second of nothing happening after a click is exactly where a visitor decides the link is broken and clicks again.
- Omitting `pointer-events: none`. A full-viewport opaque div swallows the click on whatever the visitor aims at next, and mid-transition that is usually another nav item.
- Letting `cover()` run while a cover is already up. Without the live-timer lock a fast double click schedules two commits and navigates twice, so the visitor lands one page past where they aimed.
- Leaving the finished inbound layer at `opacity: 0` without `visibility: hidden`. It is still a composited full-viewport surface, and on a page that also runs a WebGL hero it costs a measurable slice of fill rate for the rest of the session.
- Fading the cover back out symmetrically. Two opaque layers both mid-fade multiply, not add: the screen stays darker for longer and the reveal appears to stall before it starts.

## Notes

- In Next.js App Router: mount once in `app/layout.tsx` with `revealKey={usePathname()}` and `position="fixed"`, then replace nav `<Link>` elements with buttons calling `cover(() => router.push(href))`. Nothing in this file imports `next/navigation` — the commit is a callback so the same component works under React Router or a plain state switch.
- The overlay colour must be opaque. A translucent colour makes both halves show the wrong page through the handoff, which is the one artefact this technique exists to prevent.
- The root carries `aria-hidden`: it is a purely decorative surface, and a screen reader announcing it on every navigation would be worse than no transition at all.
- Browser back and forward change the key without going through `cover()`, so they get the reveal but not the cover. That is correct — a history navigation has already happened by the time your code hears about it, so there is nothing left to cover.

## Definition of done

Click a nav item: the panel fades to the overlay colour, the destination content swaps while it is covered, and the overlay fades away over roughly half a second. The heading is never visible in an intermediate state, and there is no frame where old and new content are both on screen. Click two nav items in quick succession and you land on the second one, not past it. With reduced motion the content swaps instantly with no coloured frame in either direction.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
