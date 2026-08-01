# Build: Single Param Object Timeline

A scroll-driven scene written as data instead of as tweens. One mutable object holds every animated quantity, GSAP tweens the object rather than the DOM, and a single onUpdate writes one transform string and two opacities. The story is then an array of rows — section id, point through the section, params to move to — each anchored to where its section actually sits after layout.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

One plain object holds every animated value; the scroll story is a table of keyframes anchored to real sections.

- Category: scroll
- Runtime cost: dom
- Dependencies: gsap@^3.15.0

## How it works

1. Every animated quantity lives in one object: `{ scale, spin, driftX, driftY, glow, dissolve }`. No element is a tween target; GSAP tweens the plain object and one `onUpdate` renders it, so the number of tweens is the number of story beats rather than the number of moving parts.
2. Each keyframe is anchored to a real section: `anchor = clamp(0, 1, (el.offsetTop + el.offsetHeight * t - view / 2) / total)`, where `total = container.offsetHeight - view` is the scroll distance the trigger covers.
3. That expression reads as "when the point `t` through this section reaches the middle of the viewport". `t = 0.5` is the section's own middle, so the beat fires when the reader is looking at the copy it belongs to, at any column width.
4. Rows are sorted by anchor and each is given `duration = nextAnchor - thisAnchor`, so the scene is continuously in motion between beats instead of arriving early and sitting still until the next anchor.
5. `ease: "none"` on every row. Under a scrub the ease warps timeline time, not screen time, so an eased row reaches its params before or after the section it is anchored to — which defeats the anchoring.
6. A `useResizeObserver` on the container re-runs the whole build when its height changes, because every anchor is a function of `offsetTop` and `offsetTop` moves whenever a line wraps.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `scrub = 0.8`
  Just under a second of catch-up. Enough that the scene continues to resolve after the wheel stops, which is what makes it read as a film rather than a slider; `true` welds it to the wheel and every scroll jitter shows up in the mark.
- `at = 0.5`
  Default point through a section at which its keyframe lands. 0.5 puts the beat on the section's midpoint crossing the middle of the scroller. Values near 0 fire while the section is still entering, which reads as the scene reacting to copy the reader has not got to yet.
- `REST.glow = 0.35`
  The scene's idle state, not zero. The stage has to be worth looking at before the first keyframe and after the last one; starting at 0 means the reader's first impression of the component is an empty box.
- `total floor = 1`
  Guards `container.offsetHeight - view` against 0 or negative, which happens for one frame during layout and on a short container. Without it every anchor divides by zero, becomes Infinity, clamps to 1, and the whole story collapses onto the last frame.
- `span floor = 0.001`
  Two keyframes anchored to the same point would otherwise get duration 0. GSAP accepts it, but the row then applies as an instant jump, so a carefully anchored beat becomes a snap.
- `section gap = 45vh`
  Spacing between story sections, in scroller heights. Below about 30vh two anchors land close enough that their spans overlap heavily and the beats blur together; well above it the scene is static for long stretches.

## API

```ts
function KeyframeParamObject(props: { sections: { id: string; label: string; title: string; body?: string; at?: number; to: Partial<StageParams> }[]; scrub?: number; scrollerRef?: RefObject<HTMLElement | null>; className?: string }): JSX.Element
```

- `sections: KeyframeSection[]`
  The story. Each row names a section, an optional point through it, and the params to move to.
- `sections[].at: number` — default `0.5`
  Point through the section, 0-1, at which its keyframe lands.
- `sections[].to: Partial<StageParams>`
  Params this beat moves to. Anything omitted holds its current value.
- `scrub: number` — default `0.8`
  Seconds of catch-up behind the scroll position.
- `scrollerRef: RefObject<HTMLElement | null>`
  The scroll container that owns the scroll position. Omit for the document.
- `className: string`
  Merged onto the container via `cn`.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function KeyframeParamObject({
  sections,
  scrub = 0.8,
  scrollerRef,
  className,
}: KeyframeParamObjectProps) {
  const root = useRef<HTMLDivElement>(null);
  const mark = useRef<HTMLDivElement>(null);
  const halo = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  // Rebuild the anchor table whenever the column reflows: every anchor is a
  // function of offsetTop, and offsetTop changes when a line wraps.
  const { height } = useResizeObserver(root);

  useGsap(
    gsap,
    () => {
      const container = root.current;
      const markEl = mark.current;
      const haloEl = halo.current;
      if (!container || !markEl || !haloEl) return;

      // The one mutable object. Cloned per build so a rebuild starts clean
      // rather than inheriting wherever the last scrub left it.
      const params: StageParams = { ...REST };

      const render = () => {
        markEl.style.transform =
          `translate3d(${params.driftX}%, ${params.driftY}%, 0) ` +
          `rotate(${params.spin * 360}deg) scale(${params.scale})`;
        markEl.style.opacity = String(Math.max(0, 1 - params.dissolve));
        haloEl.style.opacity = String(params.glow);
        haloEl.style.transform = `scale(${1 + params.glow * 0.6})`;
      };

      if (reduced) {
        // Land on the last keyframe: the end of the story, statically.
        for (const section of sections) Object.assign(params, section.to);
        render();
        return;
      }

      const scroller = scrollerRef?.current ?? null;
      const view = scroller ? scroller.clientHeight : window.innerHeight;
      // Scroll distance the trigger actually covers. Guarded against 0, which
      // would make every anchor Infinity and stack the whole story on frame 1.
      const total = Math.max(1, container.offsetHeight - view);

      const anchor = (el: HTMLElement, t: number) =>
        gsap.utils.clamp(0, 1, (el.offsetTop + el.offsetHeight * t - view / 2) / total);

      const rows = sections
        .map((section) => {
          const el = container.querySelector<HTMLElement>(`[data-keyframe="${section.id}"]`);
          return el ? { at: anchor(el, section.at ?? 0.5), to: section.to } : null;
        })
        .filter((row): row is { at: number; to: Partial<StageParams> } => row !== null)
        // Authoring order is document order, but a custom `at` can reorder
        // them; the timeline needs them sorted to compute each row's span.
        .sort((a, b) => a.at - b.at);

      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          scroller: scroller ?? undefined,
          start: 'top top',
          end: 'bottom bottom',
          scrub,
          invalidateOnRefresh: true,
        },
        onUpdate: render,
      });

      rows.forEach((row, i) => {
        const next = rows[i + 1];
        // Each row travels until the next one begins, so the scene is always
        // in motion between beats and never sits finished waiting for the
        // next anchor.
        const span = Math.max(0.001, (next ? next.at : 1) - row.at);
        // `ease: 'none'` — under a scrub the ease warps timeline time, so an
        // eased row arrives at its params before or after its own section.
        timeline.to(params, { ...row.to, duration: span, ease: 'none' }, row.at);
      });

      render();
    },
    root,
    [sections, scrub, scrollerRef, reduced, height],
  );
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** `useGsap` reverts the `gsap.context`, which kills the timeline and its ScrollTrigger and drops the reference to the params object. This runs on every reflow as well as on unmount: a surviving trigger would keep scrubbing a timeline built against stale `offsetTop` values while a new one runs alongside it, and the two would write conflicting transforms to the same element on the same frame.

**Reduced motion.** No timeline and no ScrollTrigger are created. Every keyframe is folded into the params object in order and rendered once, so the stage shows the end of the story and the copy is fully readable and correctly laid out.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Hand-tuning keyframe positions as raw timeline fractions. A single line wrap moves every section below it, so the beat that was on the right paragraph at 1440px is a paragraph early at 1280px. Anchoring to `offsetTop` is the fix and is the reason for the whole `anchor` expression.
- Not rebuilding when the container reflows. The anchors are computed once from measurements taken at build time; a font swap, an image load or an orientation change moves the sections and the timeline keeps using the old numbers.
- Tweening the DOM directly instead of the object. With six properties across three elements you get a tween per property per beat, they fight over the same transform string, and the last one to write wins non-deterministically.
- Easing the rows under a scrub. The ease is applied to timeline time, so the params reach their target at a different scroll position than the anchor says — the beat visibly detaches from its heading.
- Reusing one module-level params object across builds. On rebuild the tweens start from wherever the previous scrub left the object rather than from the resting state, so the scene is subtly different after every resize.
- Letting `total` be zero. It happens on the first layout pass and on any container shorter than the viewport; every anchor becomes Infinity, clamps to 1, and the entire story plays in the last pixel of scroll.

## Notes

- The stage is `position: sticky`, not fixed, so it is bounded by the component rather than by the page and works inside any scroll container.
- Pass `sections` as a stable reference (module scope or memoised) — it is a dependency of the build effect.

## Definition of done

Scroll through the column: the mark scales, spins, drifts and dims, and each change lines up with the heading that names it reaching the middle of the panel. Resize the panel so the copy rewraps and scroll again — the beats still land on their headings. Stop mid-scroll and the scene keeps resolving for around a second. With reduced motion on, the stage shows the final state and nothing moves.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
