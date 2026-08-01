# Build: Analytic Disc Picking

A slow ring of camera-facing discs that answers "what is under the pointer" without a raycaster. Because every disc is parallel to the image plane, the pick reduces to intersecting the pointer ray with one plane per disc and comparing the hit against the radius — four arithmetic operations, no traversal, no allocation, and exact rather than approximate. It is also the only correct answer here: the billboard happens in the vertex shader, so `Raycaster` intersects a square that is not on screen.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Hit-test camera-facing discs by intersecting the pointer ray with their plane. Exact, allocation-free, and correct for shader billboards.

- Category: primitive
- Runtime cost: webgl
- Dependencies: three@^0.185.1

## How it works

1. The vertex shader billboards in view space: `vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0); mv.xy += position.xy * uScale;` takes only the translation out of the model-view matrix and adds the quad offset afterwards. The mesh's rotation and scale never reach a vertex, so the disc is always exactly parallel to the image plane and its view-space radius is exactly `uRadius * uScale`.
2. Because the disc is parallel to the image plane, its plane normal is the camera's view direction for every disc in the scene. `camera.getWorldDirection(viewDir)` is called once per frame and `plane.setFromNormalAndCoplanarPoint(viewDir, disc.position)` then differs only in its constant.
3. `raycaster.setFromCamera(ndc, camera)` builds the pointer ray and nothing else is used from the Raycaster — `intersectObjects` is never called. Constructing the ray is the cheap half of raycasting; the traversal, the per-object matrix inverse, and the per-triangle intersection are the half being skipped.
4. `ray.intersectPlane(plane, hit)` returns `Vector3 | null`, and the null case is a free depth rejection: `Ray.distanceToPlane` returns null for `t < 0`, so anything behind the camera drops out before any distance work.
5. The winner is the nearest hit along the ray whose distance from the disc centre is within the radius, both compared squared. Depth is tested FIRST — `if (along >= bestAlong) continue;` — so a disc that cannot beat the incumbent never runs its own radius test.
6. The pick radius is `uRadius * uScale`, the same two numbers the vertex shader multiplies. Hover eases `uScale` from 1 to 1.14, and the pick reads the eased value in the same frame, so a disc is never clickable over area it has not grown into and never stops being clickable over area it still occupies.
7. Every scratch object — ray, plane, hit vector, view direction, NDC vector — is allocated once into the stage object and reused. A pick loop that allocates a `Vector3` per disc per frame produces 780 garbage vectors a second at 60 Hz on a ring of thirteen.
8. Rendering is gated on a dirty flag. The flag is set by the spin, by pointer movement, by a hover easing that is still in flight, and by resize. Under `prefers-reduced-motion` the spin never sets it, so the renderer idles at zero draw calls until the pointer moves.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `FOV = 42`
  Camera vertical field of view in degrees. Wide enough that the near discs are visibly larger than the far ones — which is what makes an analytic test worth having — and narrow enough that the ring does not distort into an oval at preview aspect ratios.
- `CAM_Z / ringRadius = 5.6 / 2.15`
  A ratio of about 2.6. Closer and the front disc overruns the frame at preview width; further and the perspective flattens until a cheap screen-space approximation would have been good enough, which defeats the demonstration.
- `discRadius = 0.46`
  World units, and simultaneously the pick radius. A single source for both is the entire point: two constants that mean "how big is this disc" is how a hit region drifts away from the pixels it is supposed to cover.
- `WAVE = 0.34`
  Vertical amplitude of the sin(2a) offset. Enough that the ring reads as a ribbon rather than a flat carousel; past ~0.6 the discs at the crossings overlap and the nearest-along-the-ray tie-break starts doing visible work the user has no way to predict.
- `HOVER_SMOOTHING = 0.0006`
  Fraction of the hover gap remaining after one second, as `damp` defines it — about 12% of the gap per frame at 60 Hz, settling in roughly 0.2 s. A per-frame constant instead would converge twice as fast on a 120 Hz display and the growth would feel like a different component.
- `HOVER_GROWTH = 0.14`
  A hovered disc grows 14%. Large enough to read at the back of the ring where a disc is a third of its front size, small enough that the grown disc does not swallow its neighbours and make the pick ambiguous.
- `FEATHER = 0.035`
  Rim gradient width in units of the radius — roughly 1.5 px at preview scale. This is why the renderer is built with `antialias: false`: MSAA would pay for an entire extra sample buffer to solve a problem one smoothstep already solved.

## API

```ts
function AnalyticDiscPicking(props: { count?: number; period?: number; discRadius?: number; ringRadius?: number; color?: string; accent?: string; seed?: number | string; compare?: boolean; onPick?: (index: number) => void; className?: string }): JSX.Element
```

- `count: number` — default `13`
  Discs around the ring.
- `period: number` — default `30`
  Seconds for one revolution.
- `discRadius: number` — default `0.46`
  Disc radius in world units. Also the pick radius — the two cannot drift apart.
- `ringRadius: number` — default `2.15`
  Ring radius in world units.
- `color: string` — default `'#7d848e'`
  Base plate colour. Any value `THREE.Color` accepts.
- `accent: string` — default `'#e8e4dc'`
  Colour of the picked disc.
- `seed: number | string` — default `'analytic-disc-picking'`
  Seeds the per-disc plate pattern. Same seed, same ring every reload.
- `compare: boolean` — default `false`
  Also run a real `Raycaster` each frame and report what it thinks was hit.
- `onPick: (index: number) => void`
  Fired when a disc is clicked, with its index.
- `className: string`
  Merged onto the host element via `cn`.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
useRaf((dt) => {
  const s = stage.current;
  if (!s) return;

  // The ring phase is integrated from dt, not read from a wall clock, so
  // freezing it for reduced motion is a matter of not adding anything.
  if (!reduced) {
    spin.current = (spin.current + (TAU / period) * dt) % TAU;
    dirty.current = true;
  }

  // -- place the discs -----------------------------------------------------
  for (const disc of s.discs) {
    const a = disc.phase + spin.current;
    disc.mesh.position.set(
      Math.sin(a) * ringRadius,
      Math.sin(a * 2) * WAVE,
      Math.cos(a) * ringRadius,
    );
    // `cos(a)` is +1 at the front of the ring and -1 at the back. Remapped
    // to 0..1 it is the depth fade, and it costs nothing extra here.
    disc.uniforms.uDepth.value = Math.cos(a) * 0.5 + 0.5;
  }
  // No `updateMatrixWorld` here on purpose. The discs are direct children of
  // the scene at identity, so `mesh.position` IS the world position, and the
  // camera's matrix was made current in `resize`. The only consumer of the
  // full matrix graph is `render`, which updates it itself.

  // -- the analytic pick ---------------------------------------------------
  let best = -1;
  const p = pointer.current;
  if (p) {
    s.ndc.set(p.x, p.y);
    // The Raycaster is used for its RAY and nothing else. Building an
    // NDC-to-world ray by hand means duplicating `unproject`; the expensive
    // half of raycasting is `intersectObjects`, which is never called.
    s.raycaster.setFromCamera(s.ndc, s.camera);
    const ray = s.raycaster.ray;
    // Every disc is parallel to the image plane, so they all share one
    // normal — the camera's view direction, already unit length. Only the
    // plane's constant differs from disc to disc.
    s.camera.getWorldDirection(s.viewDir);

    let bestAlong = Infinity;
    for (let i = 0; i < s.discs.length; i += 1) {
      const disc = s.discs[i];
      if (!disc) continue;

      s.plane.setFromNormalAndCoplanarPoint(s.viewDir, disc.mesh.position);
      // `intersectPlane` returns null when the plane is behind the ray
      // origin, which rejects anything behind the camera for free. Note that
      // `Ray.distanceToPlane` returns null too but is TYPED `number` in
      // @types/three — the honest signature is on this method.
      if (ray.intersectPlane(s.plane, s.hit) === null) continue;

      // Nearest along the ray wins. Checked first so a disc that cannot
      // beat the incumbent skips its own radius test.
      const along = s.hit.distanceToSquared(ray.origin);
      if (along >= bestAlong) continue;

      // The drawn radius, hover growth included. `uScale` was eased last
      // frame and is applied by the vertex shader this frame, so the region
      // tested is the region rasterised.
      const r = disc.uniforms.uRadius.value * disc.uniforms.uScale.value;
      if (s.hit.distanceToSquared(disc.mesh.position) > r * r) continue;

      bestAlong = along;
      best = i;
    }
  }

  // -- ease the hover, which the next frame's pick will read ---------------
  for (let i = 0; i < s.discs.length; i += 1) {
    const disc = s.discs[i];
    if (!disc) continue;
    const target = i === best ? 1 : 0;
    const next = damp(disc.hover, target, HOVER_SMOOTHING, dt);
    if (Math.abs(next - disc.hover) > 0.0005) dirty.current = true;
    disc.hover = next;
    disc.uniforms.uHover.value = next;
    disc.uniforms.uScale.value = 1 + HOVER_GROWTH * next;
    disc.uniforms.uPicked.value = i === pickedRef.current ? 1 : 0;
  }

  if (best !== hovered.current) {
    hovered.current = best;
    setHover(best);
    dirty.current = true;
  }

  // -- what a real raycaster would have said -------------------------------
  if (compare) {
    let g = -1;
    if (p) {
      // The raycaster reads `matrixWorld`, which `render` would not refresh
      // until the end of this frame. The analytic path needed no such call —
      // it reads `position` directly — so this traversal is a cost the
      // comparison introduces, not one it inherits.
      s.scene.updateMatrixWorld();
      // Reused array, cleared by hand: `intersectObjects` pushes into the
      // target and sorts it, but never empties it.
      s.intersects.length = 0;
      s.raycaster.intersectObjects(s.meshes, false, s.intersects);
      const first = s.intersects[0];
      if (first) g = s.meshes.indexOf(first.object as THREE.Mesh);
    }
    if (g !== ghost) setGhost(g);
  }

  if (dirty.current) {
    dirty.current = false;
    s.renderer.render(s.scene, s.camera);
  }
}, ready && !unsupported);
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The effect removes every disc from the scene and disposes its `ShaderMaterial`, disposes the one shared `PlaneGeometry`, then calls `disposeRenderer` — which stops the animation loop, disposes the renderer, calls `forceContextLoss()`, and zeroes the drawing buffer — and finally removes the canvas it appended. The canvas is created by the renderer inside the effect and never handed to React, so a StrictMode double-invoke rebuilds a fresh context rather than reusing a killed one. The frame loop unsubscribes with `useRaf`; the shared rAF parks once nothing is subscribed. The `ResizeObserver` unobserves with its hook.

**Reduced motion.** The ring holds still: the phase is integrated from delta time, so freezing it is a matter of adding nothing. The dirty flag is then only set by the pointer, which means the renderer draws zero frames until the pointer moves. Picking, hover growth and selection are unaffected — the technique is about where things are, not about them moving.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Reaching for `THREE.Raycaster` against a shader billboard. The vertex shader runs on the GPU; the `BufferGeometry` in main memory is an unrotated square lying in world XY. The raycast intersects that square and reports hits on a shape nobody can see — turn on `compare` and the two readouts disagree the moment the camera is not staring down the world Z axis.
- Using `Ray.distanceToPlane` and testing its result for null. It does return null at runtime for a plane behind the ray origin, but `@types/three` declares it as `number`, so the null check is a type error and removing the null check is a crash. `intersectPlane` has the honest `Vector3 | null` signature; use it.
- Approximating the disc as a screen-space circle whose NDC radius is `halfDiagonal / (tanHalfFov * camDist)`. That is only correct for a sphere. For a flat disc it over-reports near the edges of frame, where perspective stretches the footprint, so the hover boundary is visibly not the disc boundary. The plane intersection is exact for the same cost.
- Deriving the pick radius from a second constant. Hover growth then applies to the pixels but not the hit region, and the disc becomes clickable on a ring of its own body it has already grown past.
- Leaving `frustumCulled` on. The culler tests the geometry bounding sphere at the mesh transform, but the vertices are moved by the shader, so a disc vanishes the instant the untransformed square leaves the frustum.
- Allocating in the pick loop. `new THREE.Vector3()` per disc per frame is invisible in a profile and unmistakable in a GC trace; reuse a scratch object on the stage.
- Enabling depth test on the discs. They are square quads with the corners discarded, so the depth buffer records the quad, not the disc, and neighbouring rims punch holes in each other. Painter's-algorithm sorting is correct here because the billboard leaves the object position — the key three sorts on — untouched.
- Handing three's renderer a React-rendered `<canvas ref>`. StrictMode double-invokes the effect, the first cleanup calls `forceContextLoss()`, and the second run is given the same permanently dead element. Let the renderer make its own canvas inside the effect and remove it in cleanup.

## Notes

- The same reduction works for any primitive with a closed-form ray test: a sphere is `ray.intersectSphere`, an axis-aligned card is `ray.intersectBox`, a ground plane is one `intersectPlane`. Raycasting against triangles is the fallback for arbitrary meshes, not the default for known shapes.
- A square quad plus `discard` beats a `CircleGeometry` fan on both counts — two triangles instead of thirty-two, and a rim anti-aliased by a smoothstep instead of a polygon approximated by segments.
- The `compare` prop exists to be switched on once. Leave it on in production and you pay for the traversal you set out to avoid, plus an `intersectObjects` call whose result you throw away.

## Definition of done

Hover a disc at the front of the ring and it brightens and grows, and the readout says `plane hit NN`. Follow one disc as it travels to the back: it stays pickable over exactly its drawn silhouette, smaller but never offset. Set `compare` and hover a disc anywhere off the centre of frame — the `raycast` readout says something different, usually nothing, because it is testing an unrotated square in world XY. Click and the disc under the pointer takes the accent colour. With reduced motion the ring is static and every one of those behaviours still works.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
