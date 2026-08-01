# Build: Layout Lerp Scalar

One function places every card from seven scalars — radius, spacing, rowSpread, turns, depth, focus, scale — and each named layout is only a set of values for them. Morphing is therefore `gsap.to(params, preset)`: a tween over an object literal, with no per-item choreography anywhere. Crucially it interpolates the *inputs*, `f(lerp(a, b, s))`, not the outputs, so every intermediate frame is a valid member of the same family instead of a set of cards sliding along straight lines through each other.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Row, stack, drum and fan are one placement function of seven numbers. Switching layout is a tween over an object.

- Category: layout
- Runtime cost: webgl
- Dependencies: three@^0.185.1, gsap@^3.15.0

## How it works

1. Placement is `offset = wrappedOffset(i, position, n)`, then `angle = (offset / n) * 2PI * turns` and `p = (radius * sin(angle) + offset * rowSpread * step, -offset * spacing, radius * (cos(angle) - 1) - depth * |offset|)`, with `rotation.y = angle`. Setting `radius` and `turns` to 0 leaves a straight line; adding `spacing` makes it a column; adding `turns` and `radius` wraps that column into a drum. There is no branch anywhere in it.
2. Because the parameters are what get tweened, the shape passes through the family rather than across it. `f` is nonlinear in `radius` and `turns`, so `f(lerp(a, b, s))` and `lerp(f(a), f(b), s)` are different animations: the first keeps the cards on a well-formed helix at every `s`, the second sends each card down a chord that cuts through the middle of the drum and through its neighbours.
3. `cos(angle) - 1` rather than `cos(angle)` puts the focused card at z = 0 for any radius. Growing the drum then pushes the far side away instead of pulling the near card into the camera, which is what makes `radius` safe to tween through large values.
4. The `depth` term gives the flat layouts a strictly monotonic z in `|offset|`. That is not a look — it is what lets three's painter sort order the transparent cards correctly. With every card at z = 0 the sort has nothing to rank and the overlap order in a stack is whatever the traversal happened to produce.
5. The row step is derived from the camera: `visibleHeight = 2 * cameraZ * tan(fov / 2)`, `visibleWidth = visibleHeight * aspect`, and `step = visibleWidth * fill / (n - 1)`. Card size comes from the same `visibleHeight`, so the whole layout is defined in fractions of the frustum and holds its proportions at any viewport.
6. Focus is `1 - focus * (1 - exp(-offset^2))` — 1.000 at the centre, 0.368 one step out, 0.018 two — driving both the card scale and a single `uFocus` uniform that desaturates and dims in the fragment shader. `focus` is itself one of the tweened parameters, so a layout can decide how much of a selection it is.
7. The vertex shader is the default transform and nothing else. Everything that moves is a CPU write to `position`, `rotation` and `scale`, which means the bounding sphere three culls against and the view depth it sorts by both describe where the card actually is. A drum that bends its planes in the vertex shader has to disable culling and reconstruct `renderOrder` by hand; this one gets both for free.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `PRESETS.drum = { radius: 2.55, spacing: 0.74, turns: 2, focus: 1, scale: 1 }`
  Two turns across twelve cards puts adjacent cards 60° apart, so the ring reads as a ring rather than as a coil. Below about 1.5 turns the far side is barely behind the near side and the drum flattens into a wheel; above 3 the cards on the back face are edge-on for most of a lap and the set looks half empty.
- `PRESETS.row.scale = 0.42`
  Matched to the derived row step so twelve cards just touch at the reference aspect. Larger and the row overlaps into a fan; smaller and it becomes a sparse dotted line. It is a scalar for exactly this reason — the row layout gets to pick its own card size.
- `depth = 0.35 (column) / 0.1 (row) / 0 (drum, fan)`
  World units of recession per index step. The drum and fan get their z from the radius, so they need none. The flat layouts need a non-zero value or their transparent cards have identical view depth and the sort order is arbitrary — the symptom is a stack whose overlap flickers as the ring drifts.
- `CARD_HEIGHT_RATIO = 0.4`
  Card height as a fraction of the frustum height at z = 0. Above ~0.55 the drum's vertical spacing has to grow to match or the cards intersect; below ~0.25 the whole formation floats in the middle of the frame with nothing at the edges.
- `CAMERA_FOV / CAMERA_Z = 42 / 7.2`
  A matched pair: they set the visible height, and everything else is a fraction of it. A wider FOV exaggerates the perspective divide so the far side of the drum shrinks dramatically — dramatic, but it also makes the row visibly bow. Change one and the layout is unchanged only if the other keeps `z * tan(fov / 2)` the same.
- `ROW_FILL = 0.92`
  Fraction of the visible width the flat row spans. At 1.0 the outermost cards are cut exactly by the frustum edge and their antialiased rims flicker as they cross it; much below 0.85 the row no longer reads as spanning the frame.
- `SCALE_FLOOR = 0.72`
  The scale an entirely out-of-focus card keeps. At 1.0 the focus falloff is only a dimming and the arrangement loses its centre; below ~0.5 the outer cards shrink so fast the drum looks like it is receding into a tunnel.
- `duration / MORPH_EASE = 1.25 / power3.inOut`
  Long enough to read the shape changing rather than snapping, short enough not to feel like a loading state. `inOut` because the morph has no impulse behind it — an `out` ease implies the shape was thrown, and the sudden start looks like a dropped frame.
- `drift = 0.16`
  Index steps per second of idle travel. About six seconds per card: slow enough to read a caption, fast enough that the wrap is visible within a few seconds of arriving. At 0 the ticker still runs but nothing moves, which is the right default for a layout driven by scroll instead.
- `CARD_CORNER = 0.055`
  Corner radius in units of card height, evaluated as an SDF in the fragment shader. Because the mask is drawn rather than sampled it stays crisp at any scale, and one number gives the same physical radius on both axes since the SDF works in height units and multiplies x by the aspect.

## API

```ts
function LayoutLerpScalar(props: { count?: number; layout?: 'row' | 'column' | 'drum' | 'fan'; params?: Partial<LayoutParams>; duration?: number; drift?: number; hueStart?: number; hueStep?: number; opacity?: number; onFocusChange?: (index: number) => void; className?: string }): JSX.Element
```

- `count: number` — default `12`
  How many cards. They wrap, so this is also the ring's period.
- `layout: 'row' | 'column' | 'drum' | 'fan'` — default `'drum'`
  Which preset the parameter vector is tweened toward.
- `params: Partial<LayoutParams>`
  Overrides individual scalars on top of the preset — radius, spacing, rowSpread, turns, depth, focus, scale. Compared by value.
- `duration: number` — default `1.25`
  Seconds of the morph between presets.
- `drift: number` — default `0.16`
  Index steps per second of idle travel. 0 parks the ring.
- `hueStart: number` — default `232`
  First card's hue, 0-360.
- `hueStep: number` — default `17`
  Degrees of hue between adjacent cards.
- `opacity: number` — default `1`
  Alpha multiplier applied before the focus falloff.
- `onFocusChange: (index: number) => void`
  Fires when a different card takes the focus position.
- `className: string`
  Merged onto the wrapper. The canvas fills it absolutely.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/* ---- the morph: one tween over an object literal ------------------------ */

useEffect(() => {
  const target: LayoutParams = { ...PRESETS[layout], ...params };
  const current = live.current;

  if (reduced) {
    Object.assign(current, target);
    return;
  }

  // Every parameter eases together, so the shape passes through a continuous
  // family of shapes rather than each card taking its own path. `overwrite`
  // matters: switch layout twice quickly and the second tween must take the
  // parameters from wherever the first one had got to, not fight it.
  const tween = gsap.to(current, { ...target, duration, ease: MORPH_EASE, overwrite: true });
  return () => {
    tween.kill();
  };
  // `params` is compared by value through `overrideKey`; the object literal
  // most callers pass is a new reference on every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [layout, overrideKey, duration, reduced]);

useEffect(() => {
  const current = live.current;
  return () => {
    gsap.killTweensOf(current);
  };
}, []);

/* ---- the frame ---------------------------------------------------------- */

useRaf(
  (dt) => {
    const current = stage.current;
    if (!current) return;
    const n = current.cards.length;
    if (n === 0) return;

    const p = live.current;
    const speed = reduced ? 0 : drift;
    // Wrapped rather than left to grow: at 0.16 steps/s an unwrapped
    // accumulator is fine for days, but the modulo costs nothing and keeps
    // float precision constant no matter how long the tab stays open.
    position.current = mod(position.current + dt * speed, n);
    const pos = position.current;

    // The one place the camera and the layout meet. `visibleHeight` is the
    // frustum's height at z = 0 — `2 * z * tan(fov/2)` — and the width is
    // that times the aspect. Deriving the row step from it is why the row
    // spans the frame at any viewport instead of being a guessed constant.
    const visibleHeight = 2 * Math.tan((CAMERA_FOV * DEG_TO_RAD) / 2) * CAMERA_Z;
    const visibleWidth = visibleHeight * current.camera.aspect;
    const step = (visibleWidth * ROW_FILL) / Math.max(n - 1, 1);
    const cardHeight = visibleHeight * CARD_HEIGHT_RATIO;
    const cardWidth = cardHeight * CARD_ASPECT;

    for (let i = 0; i < n; i++) {
      const card = current.cards[i];
      if (!card) continue;

      // The call that makes a finite array behave like an endless ring:
      // card 0 is one step BEFORE card 11, not eleven steps after it.
      const offset = wrappedOffset(i, pos, n);
      const angle = (offset / n) * TWO_PI * p.turns;

      // The placement function. Seven scalars in, one transform out, and
      // every layout this component has is somewhere in here.
      card.mesh.position.set(
        p.radius * Math.sin(angle) + offset * p.rowSpread * step,
        -offset * p.spacing,
        // cos(angle) - 1 keeps the focused card at z = 0 whatever the
        // radius, so growing the drum pushes the ring back rather than
        // pulling the front card into the camera. The depth term is what
        // gives the flat layouts a strictly monotonic z, which is what lets
        // three sort them back-to-front without any renderOrder fixing.
        p.radius * (Math.cos(angle) - 1) - p.depth * Math.abs(offset),
      );
      card.mesh.rotation.y = angle;

      // exp(-d^2): 1.000 at the focus, 0.368 one step out, 0.018 two,
      // 0.0001 three. Continuous and branchless, and `focus` scales how much
      // of it applies — at 0 every card is lit equally, which is what makes
      // the flat row read as an index rather than as a selection.
      const f = 1 - p.focus * (1 - gaussian(offset));
      const s = p.scale * (SCALE_FLOOR + (1 - SCALE_FLOOR) * f);
      card.mesh.scale.set(cardWidth * s, cardHeight * s, 1);
      card.uniforms.uFocus.value = f;
      card.uniforms.uOpacity.value = opacity;
    }

    const nextFocus = wrapIndex(Math.round(pos), n);
    if (nextFocus !== focusedRef.current) {
      focusedRef.current = nextFocus;
      notify.current?.(nextFocus);
    }

    current.renderer.render(current.scene, current.camera);
  },
  ready && inView && visible,
);
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Kills the parameter tween (and any tween of the same object) so GSAP cannot write into a vector nothing reads; removes every mesh from the scene, then `disposeObject` for the materials, `geometry.dispose()`, `prototype.dispose()`, and `disposeRenderer` — which stops the animation loop, disposes, calls `forceContextLoss()` and zeroes the backing store — before removing the canvas from the DOM. The shared rAF unsubscribes, and the shared resize, intersection and visibility observers all unregister. No textures are allocated, so there are none to leak.

**Reduced motion.** The idle drift is set to zero, so the ring holds still and the same card stays in focus. Layout changes still happen — refusing them would leave the component unable to answer its own prop — but the parameters are assigned rather than tweened, so the new arrangement is simply there on the next frame with nothing travelling across the screen. The frame loop keeps running only because it is what draws; with no drift and no tween it writes the same transforms every frame.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Cross-fading two layouts instead of blending their parameters. `lerp(f(a), f(b), s)` moves every card along the straight line between its two homes, so the drum passes through its own axis and the cards slide through one another. Interpolate the inputs and the shape is always a real member of the family.
- Reaching for `if (layout === "drum")` in the frame loop. Branching per layout means each new arrangement is new code and no pair of them can be shown halfway. Every parameter here is a number precisely so it can be tweened, and the presets are data.
- Multiplying a whole layout to zero and calling that a morph. Scaling `radius` to 0 does not produce a flat row — it produces every card stacked on the axis. A second term (`rowSpread * step`) has to take over as the first one leaves, which is why the row and the ring are separate parameters rather than one.
- Letting the transparent cards share a z. three ranks transparent meshes by view depth; with a flat layout at z = 0 the ranking is arbitrary and the overlap in a stack flips as the ring drifts. The `depth` parameter exists to keep the ordering strict.
- Copying the bend-in-the-vertex-shader approach and keeping frustum culling on. That combination blanks planes that are plainly on screen, because the bounding sphere describes the flat geometry at the CPU position. This component avoids the whole class of problem by keeping the layout on the CPU — but the two approaches cannot be mixed carelessly.
- Guessing the row step in world units. Hard-code it and the row overflows a narrow viewport and floats in the middle of a wide one. It has to come from the frustum: `2 * cameraZ * tan(fov / 2) * aspect`, divided across the set.
- Calling `renderer.dispose()` and stopping there. It frees GPU objects but leaves the WebGL context alive, and Chromium kills the oldest context once about sixteen exist — so an unrelated canvas elsewhere on the page goes black. `disposeRenderer` calls `forceContextLoss()`, which is the call that actually hands it back.
- Building the colours with `new THREE.Color(...)` from a hex string and expecting them to match the CSS beside them. Colours have to enter the linear working space (`setHSL(..., THREE.SRGBColorSpace)`) and the fragment shader has to end with `#include <colorspace_fragment>`, because three injects that chunk only into its own materials, never into a `ShaderMaterial`.
- Passing `params` as an inline object literal and putting it straight in the effect deps. It is a new reference every render, so the morph tween is killed and rebuilt on each one and the parameters never arrive. The override is compared by value through a serialised key.
- Rendering every frame regardless. The loop is gated on the element being in view and the tab being visible; a scrolled-past WebGL canvas that keeps drawing is one of the easier ways to halve a page's battery life for nothing.

## Notes

- The four presets are ordinary data — add a fifth by adding seven numbers, with no new code and no new branch. Any two of them can also be blended by hand at a fixed `s` by passing `params`.
- Each card owns a cloned `ShaderMaterial` so it can hold its own colours, but three keys its program cache on the shader source, so all twelve still share one compiled program and the clone costs a uniform bag.
- Nothing is fetched and no image ships: the card face — rounded rectangle, gradient, hairlines, rim — is a signed distance field in the fragment shader, and the shading of a card turning edge-on is one dot product against the transformed normal.

## Definition of done

The cards turn slowly and endlessly — watch one leave the bottom of the drum and come back at the top, at the same spacing. Switch layout: the whole formation unwinds into a row, or collapses into a stack, in one continuous motion, and at every instant it looks like a formation rather than cards travelling to new addresses. Nothing passes through the centre of the drum on the way. Switch layout twice quickly and the second morph starts from wherever the first had reached, with no jump. In the stack, the overlap order is stable while it drifts — nothing flickers in front of its neighbour. Resize the window from narrow to wide: the row still spans the frame and the cards keep their proportions. Scroll the canvas out of view and the GPU goes quiet.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
