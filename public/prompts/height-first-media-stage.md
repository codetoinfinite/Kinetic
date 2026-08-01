# Build: Height-First Media Stage

Almost every media stage on the web is sized width-first: a full-width box with an aspect ratio and whatever height falls out of it. On a short laptop that makes a 3:2 hero taller than the viewport, so the piece built to be seen at a glance has to be scrolled. This inverts the constraint — the height is authored, the width is derived from it through `aspect-ratio`, and `max-width: 100%` is the only escape hatch. The stage always fits vertically, and on a narrow screen it gives up size rather than overflowing. Layers cross-fade on opacity alone; the only JavaScript is the index.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A media stage sized from its height, with the width derived from the ratio, cross-fading layers and a caption that replays per index.

- Category: layout
- Runtime cost: css
- Dependencies: none beyond React

## How it works

1. The figure gets exactly three sizing declarations: `height` (authored, e.g. `min(80dvh, 100%)`), `aspect-ratio` (which derives the width from that height), and `max-width: 100%`. No width is ever set — setting one would over-constrain the box and `aspect-ratio` would be ignored.
2. When the derived width would exceed the container, `max-width: 100%` clamps it and the ratio then pulls the *height* down to match. That single line is what turns "always fits vertically" into "always fits", with no media query and no measurement.
3. The default height is `min(80dvh, 100%)`: `dvh` so a collapsing mobile URL bar cannot make the stage overflow, and the `100%` term so the same component also behaves inside a bounded parent instead of insisting on a fraction of the viewport.
4. Every layer stays mounted, absolutely positioned in the same stacking context, and only `opacity` changes — from 0 to 1 on the incoming layer and back on the outgoing one, with `pointer-events: none` on the hidden ones so an invisible layer cannot swallow clicks meant for the visible one.
5. The cross-fade transition is `linear`, not eased. Two layers whose opacities are each eased sum to less than 1 halfway through, and the stage visibly dips darker mid-transition; linear keeps the sum at exactly 1 throughout.
6. The caption wrapper carries `key={current}`, so changing index unmounts it and mounts a fresh node. A CSS entrance animation that has never run on a node plays from 0%, which is how the caption re-enters on every change without any JavaScript replay logic.
7. The keyframes live in a scoped `<style href="..." precedence="medium">`. React 19 hoists it into the head and deduplicates by `href`, so ten mounted stages inject one copy and nothing has to be added to a global sheet.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `height = 'min(80dvh, 100%)'`
  80% of the *dynamic* viewport height leaves room for a header and the top of the next section, so the stage reads as part of a page rather than as a takeover. `dvh` rather than `vh` because on iOS Safari `vh` is the URL-bar-collapsed height, so `80vh` overflows the actually visible area at rest. The `min(..., 100%)` term keeps it correct inside a bounded parent.
- `aspectRatio = '3 / 2'`
  Wider than the 80dvh height on any landscape display, so the width clamp is the binding constraint on desktop and the height clamp binds on a phone — both paths are exercised by the default. A ratio taller than the height would make the stage narrower than its own caption row.
- `duration = 500`
  Milliseconds of cross-fade. Under ~250ms the two layers read as a cut and the point of stacking them is lost; past ~800ms both layers are legible at once for long enough to look like a rendering fault.
- `caption entrance = 500ms cubic-bezier(0.22, 1, 0.36, 1), translateY(14px)`
  Matched to the cross-fade duration so caption and image resolve together. 14px is roughly one line of the caption type — enough travel to read as arrival, small enough that the text is never legible in the wrong place.
- `cross-fade easing = linear`
  Not a stylistic choice. Any easing applied to both layers makes their opacities sum to less than 1 in the middle of the transition, and the stage flashes darker halfway through every change.

## API

```ts
function HeightFirstMediaStage(props: { children: ReactNode; height?: string; aspectRatio?: string; duration?: number; caption?: (index: number) => ReactNode; index?: number; defaultIndex?: number; onIndexChange?: (index: number) => void; className?: string; 'aria-label'?: string }): JSX.Element
```

- `children: ReactNode`
  One media layer per child. All layers stay mounted and stacked.
- `height: string` — default `'min(80dvh, 100%)'`
  Authored height as a CSS length. The width is derived from it — never set a width here.
- `aspectRatio: string` — default `'3 / 2'`
  Ratio the derived width follows, as a CSS `aspect-ratio` value.
- `duration: number` — default `500`
  Cross-fade duration in milliseconds.
- `caption: (index: number) => ReactNode`
  Rendered into a node re-keyed on every index change, so its entrance keyframe replays.
- `index: number`
  Controlled index. Omit for uncontrolled behaviour.
- `defaultIndex: number` — default `0`
  Starting index when uncontrolled.
- `onIndexChange: (index: number) => void`
  Called with the wrapped index after either control is used.
- `className: string`
  Merged onto the centring wrapper via `cn`.
- `aria-label: string` — default `'Media stage'`
  Accessible name for the figure group.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/**
 * Scoped stylesheet. React 19 hoists and deduplicates it by `href`, so the
 * keyframe exists once no matter how many stages are mounted and nothing has
 * to be added to a global sheet.
 *
 * The class exists only so a `key` change can restart it: React unmounts the
 * old caption node and mounts a new one, the animation has never run on that
 * node, so it plays from 0%. Toggling a class on a persistent node would not
 * work — the animation would have to be removed for a frame first.
 */
const STAGE_CSS = `
@keyframes k-hfms-in {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}

.k-hfms-in {
  animation: k-hfms-in 500ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

/* The caption's content is the information; its arrival is decoration. */
@media (prefers-reduced-motion: reduce) {
  .k-hfms-in { animation: none; }
}
`;
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing to release. There are no listeners, no rAF, no timers and no observers: the cross-fade and the caption entrance are both CSS on the elements themselves, so they die with the nodes. React 19 reference-counts the hoisted `<style>` and removes it when the last stage unmounts.

**Reduced motion.** The layer transition is set to `none`, so an index change is an instant cut between two fully opaque layers rather than a zero-length fade. The caption entrance is disabled by a `prefers-reduced-motion` block inside the scoped stylesheet, so the caption appears immediately at its final position and full opacity — the information still arrives, only its arrival is dropped. Sizing behaviour is identical either way.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Sizing width-first — `w-full` plus `aspect-ratio` — which is the common shape. On a 13" laptop the derived height exceeds the viewport, so the hero has to be scrolled to be seen and the layout silently breaks on exactly the machines designers use.
- Setting a width as well as the height. The box is then over-constrained, `aspect-ratio` is discarded, and the stage quietly stops being the ratio you asked for while still looking plausible in your own window.
- Using `vh` instead of `dvh`. On mobile Safari `100vh` is the tall viewport with the browser chrome hidden, so a stage sized against it overflows the visible area until the user scrolls — which is the exact failure this layout exists to prevent.
- Easing the opacity transition. Both layers dim toward the middle, their sum drops below 1, and the stage visibly darkens on every change. It looks like a dropped frame and is very hard to attribute to the easing curve.
- Mounting only the current layer. Each change then pays a fresh decode and paint, so the first frame of the incoming layer is empty and the transition starts from blank instead of from the outgoing image.
- Replaying the caption entrance by toggling a class on a persistent node. The animation is already applied, so re-adding the class does nothing — you would have to remove it, force a reflow, then re-add. Changing `key` remounts the node instead, and the animation runs because on that node it never has.
- Wrapping the index with `%`. In JavaScript `-1 % 5` is `-1`, so pressing Previous on the first item indexes past the start and the stage goes blank. `wrapIndex` uses a true modulo.
- Leaving hidden layers hittable. At `opacity: 0` a layer still receives pointer events and sits on top of the visible one, so links and buttons in the current layer stop responding.
- Putting the keyframes in a plain inline `<style>` with no `href`. Every mounted stage then injects its own copy of the same rule into the document.

## Notes

- Uncontrolled by default via `defaultIndex`, controlled when `index` is passed — in controlled mode the internal state is never written, so the parent stays the single source of truth.
- The figure is marked `role="group"` with `aria-roledescription="carousel"`, and non-current layers are `aria-hidden`, so a screen reader is offered one media layer at a time rather than all of them stacked.
- The only content this component draws itself is the counter and the controls; the layers are children, so it composes with a canvas, a video, a CSS gradient, or a Lottie without knowing which.

## Definition of done

Shorten the viewport to about 600px tall and the stage shrinks with it — no vertical scrollbar appears and no part of the media is cut off. Narrow the window until the derived width would exceed the container and the stage gives up height instead of clipping sideways. Press Next and the layers cross-fade with no dark dip halfway through, and the caption rises 14px into place on every change including the wrap from the last item back to the first. Press Previous on the first item and it lands on the last, not on a blank stage. Enable reduced motion and the change becomes an instant cut with the caption already in place.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
