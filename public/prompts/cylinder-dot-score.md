# Build: Dot-Cloud Score Cylinder

A score wrapped around a cylinder and drawn entirely in dots: measure rings, vertical bar dividers, and note clusters that light as a playhead sweeps them. Two cylinders are stacked and turned to different yaws so they never present the same face at once, and both live in one buffer. Nothing uses a depth buffer — every dot is flattened to z = 0 before projection, and solidity comes from alpha and point size falling off with the model-space z.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Two counter-rotating cylinders of dots — rings, bar lines, notes — drawn from one buffer with no depth buffer.

- Category: webgl
- Runtime cost: webgl
- Dependencies: three@^0.185.1

## How it works

1. One `Float32Array` pair is filled in six consecutive passes — both cylinders' measure rings, then both cylinders' dividers, then both cylinders' notes. Buffer order is the draw order, so notes end up on top of everything without a sort and without a second object.
2. Identity travels in `aPointData = vec4(instanceIndex, isNote, pointScale, groupIndex)`, so the two cylinders share a geometry and the vertex shader picks the transform: instance 1 is mirrored with `p.z *= -1.0` and yawed -166°, instance 0 is yawed -90°.
3. Both are then yawed by `uSpin` (degrees, advancing linearly at `spinSpeed` per second) and tilted 8° on X, and instance 0 is pushed up by 0.3 *after* the rotation so the stack separation is a pure screen-space offset that does not tip with the spin.
4. Depth is faked from the transformed z: `depthT = clamp((z + 0.6) / 1.2, 0, 1)` drives alpha from 0.25 to 1.0 and point size from 0.65 to 1.0, so the far wall of the cylinder recedes without a depth test.
5. The playhead is `mod(floor(uElapsed / uNoteInterval), uGroupCount)`, computed in the vertex shader from the clock that is already there. A note group whose index matches gets 2x point size and full alpha, so highlighting a beat costs no React render and no uniform write.
6. Angles within each ring are sorted before being written into the buffer, and `gl_PointSize` gets the same clamp-plus-area-compensated-alpha treatment as every other point field here.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `BASE_SCALE = 1.5`
  Applied in the shader, not baked into the buffer, so re-framing the piece never re-uploads a vertex.
- `TILT = 8.0 degrees`
  X tilt. Below ~4° the cylinder collapses to a straight band and stops reading as a cylinder; past ~15° you look down the tube and the far wall crowds the near one.
- `INSTANCE_B_YAW = -166.0 degrees`
  Not -180. At exactly half a turn the two cylinders present mirror-image faces and the pair looks like one object reflected; 166° keeps them legibly distinct through the whole rotation.
- `STACK_OFFSET = 0.3`
  Vertical separation, applied after `rotateX` so it is screen-space. Applied before, the offset would tilt with the cylinder and the two would drift into each other as they turn.
- `DEPTH_HALF_RANGE = 0.6`
  z is normalised over ±0.6 while the cloud actually spans ±0.75, so the nearest and furthest dots saturate. Normalising over the exact range leaves the middle band looking flat.
- `DEPTH_MIN_SIZE / DEPTH_MAX_SIZE = 0.65 / 1.0`
  Far dots at 65% of near dots. Alpha alone is not enough — without the size falloff the far wall reads as a grey copy of the near one rather than as distance.
- `NOTE_ACTIVE_SCALE = 2.0`
  Point size multiplier for the lit note group. Area goes as the square, so 2x is a 4x brighter mark — visible at a glance without any colour change being required.
- `spinSpeed = 12 degrees/second`
  One revolution every 30s. The original ran at 1°/s, which is right for an ambient full-page object and far too slow to read in a preview card. Linear either way: easing it would make it look like it is arriving somewhere.
- `MEASURE_SCALE / NOTE_SCALE = 0.7 / 1.4`
  Notes are exactly double the measure dots so they survive the depth size falloff on the far wall, where a measure dot is already down to 0.46.

## API

```ts
function CylinderDotScore(props: { ringCount?: number; ringDots?: number; dividerCount?: number; dividerDots?: number; noteGroups?: number; noteDots?: number; spinSpeed?: number; noteInterval?: number; dotScale?: number; viewScale?: number; opacity?: number; color?: string; noteColor?: string; seed?: number | string; className?: string }): JSX.Element
```

- `ringCount: number` — default `10`
  Measure rings per cylinder, split evenly above and below the equator gap.
- `ringDots: number` — default `260`
  Dots in each measure ring.
- `dividerCount: number` — default `8`
  Vertical bar dividers per cylinder.
- `dividerDots: number` — default `34`
  Dots making up each divider.
- `noteGroups: number` — default `6`
  Note clusters per cylinder; the playhead cycles through them.
- `noteDots: number` — default `26`
  Dots per note cluster.
- `spinSpeed: number` — default `12`
  Degrees of yaw per second. Linear.
- `noteInterval: number` — default `1.2`
  Seconds each note group stays lit.
- `dotScale: number` — default `1`
  Global dot radius multiplier in CSS pixels.
- `viewScale: number` — default `0.62`
  Model-to-pixel scale as a fraction of the container short side.
- `opacity: number` — default `1`
  Multiplier applied to every dot.
- `color: string` — default `'#7d838c'`
  Measure and divider dot colour.
- `noteColor: string` — default `'#ffffff'`
  Note dot colour; lit notes go fully to this.
- `seed: number | string` — default `'cylinder-dot-score'`
  Seeds ring angles and note scatter for a stable, hydration-safe layout.
- `className: string`
  Merged onto the host element via `cn`.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function CylinderDotScore({
  ringCount = 10,
  ringDots = 260,
  dividerCount = 8,
  dividerDots = 34,
  noteGroups = 6,
  noteDots = 26,
  spinSpeed = 12,
  noteInterval = 1.2,
  dotScale = 1,
  viewScale = 0.62,
  opacity = 1,
  color = '#7d838c',
  noteColor = '#ffffff',
  seed = 'cylinder-dot-score',
  className,
}: CylinderDotScoreProps) {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage | null>(null);
  const [unsupported, setUnsupported] = useState(false);

  const { width, height } = useResizeObserver(host);
  const size = useRef({ width, height });
  size.current = { width, height };

  const reduced = useReducedMotion();
  const ready = width > 0 && height > 0;

  useEffect(() => {
    const el = host.current;
    if (!el || !ready) return;

    if (!hasWebGL()) {
      setUnsupported(true);
      return;
    }

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    } catch {
      // A context can still be refused between the probe and the construction —
      // the tab may have hit the browser's live-context ceiling in between. three
      // throws rather than returning null, and an uncaught throw here takes the
      // page with it.
      setUnsupported(true);
      return;
    }
    renderer.setPixelRatio(pixelRatio());
    renderer.setClearAlpha(0);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;

    const rng = createRng(seed);

    /* ------------------------------------------------------------------
       Buffer layout IS the draw order. Points are blended in the order they
       appear, with depth testing off, so the six passes below are written
       consecutively into one pair of arrays: both cylinders' measures, then
       both cylinders' dividers, then both cylinders' notes. Notes last means
       notes on top, everywhere, without a sort and without a second object.
       ------------------------------------------------------------------ */
    const perCylinder = ringCount * ringDots + dividerCount * dividerDots + noteGroups * noteDots;
    const total = perCylinder * 2;

    const positions = new Float32Array(total * 3);
    const pointData = new Float32Array(total * 4);
    let cursor = 0;

    const write = (
      x: number,
      y: number,
      z: number,
      instance: number,
      isNote: number,
      scale: number,
      group: number,
    ) => {
      positions[cursor * 3] = x;
      positions[cursor * 3 + 1] = y;
      positions[cursor * 3 + 2] = z;
      pointData[cursor * 4] = instance;
      pointData[cursor * 4 + 1] = isNote;
      pointData[cursor * 4 + 2] = scale;
      pointData[cursor * 4 + 3] = group;
      cursor += 1;
    };

    /** y of measure ring `i`, mirrored around a gap at the equator. */
    const ringY = (i: number) => {
      const half = Math.floor(ringCount / 2);
      const step = i < half ? half - i : i - half + 1;
      return (i < half ? -1 : 1) * (GAP + step * RING_PITCH);
    };

    for (let instance = 0; instance < 2; instance += 1) {
      for (let ring = 0; ring < ringCount; ring += 1) {
        const y = ringY(ring);
        // Sorted angles, not raw ones. Points blend in buffer order, so an
        // unsorted ring interleaves near and far dots and the ring stipples
        // instead of reading as one continuous line of engraving.
        const angles = new Float32Array(ringDots);
        for (let i = 0; i < ringDots; i += 1) angles[i] = rng() * Math.PI * 2;
        angles.sort();
        for (let i = 0; i < ringDots; i += 1) {
          const a = angles[i] ?? 0;
          write(RADIUS * Math.cos(a), y, RADIUS * Math.sin(a), instance, 0, MEASURE_SCALE, 0);
        }
      }
    }

    const bandTop = GAP + Math.ceil(ringCount / 2) * RING_PITCH;
    for (let instance = 0; instance < 2; instance += 1) {
      for (let d = 0; d < dividerCount; d += 1) {
        const a = (d / dividerCount) * Math.PI * 2 + instance * 0.19;
        for (let i = 0; i < dividerDots; i += 1) {
          const t = dividerDots === 1 ? 0.5 : i / (dividerDots - 1);
          const y = -bandTop + t * bandTop * 2;
          write(RADIUS * Math.cos(a), y, RADIUS * Math.sin(a), instance, 0, MEASURE_SCALE, 0);
        }
      }
    }

    for (let instance = 0; instance < 2; instance += 1) {
      for (let g = 0; g < noteGroups; g += 1) {
        const centre = (g / noteGroups) * Math.PI * 2 + instance * 0.4;
        for (let i = 0; i < noteDots; i += 1) {
          const a = centre + (rng() - 0.5) * 0.22;
          const y = (rng() - 0.5) * 2 * bandTop;
          write(RADIUS * Math.cos(a), y, RADIUS * Math.sin(a), instance, 1, NOTE_SCALE, g);
        }
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aPointData', new THREE.BufferAttribute(pointData, 4));

    const uniforms: Uniforms = {
      uSpin: { value: 0 },
      uElapsed: { value: 0 },
      uViewScale: { value: 1 },
      uViewportYOffset: { value: 0 },
      uPixelRatio: { value: renderer.getPixelRatio() },
      uDotScale: { value: dotScale },
      uOpacity: { value: opacity },
      uNoteInterval: { value: noteInterval },
      uGroupCount: { value: noteGroups },
      uColor: { value: new THREE.Color(color) },
      uNoteColor: { value: new THREE.Color(noteColor) },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: CYLINDER_DOT_SCORE_VERT,
      fragmentShader: CYLINDER_DOT_SCORE_FRAG,
      uniforms,
      transparent: true,
      // Both off. With depth testing on, the first dot rasterised at a given
      // pixel would win and the far wall of the cylinder would punch holes in
      // the near one, because every dot is flattened to the same z.
      depthTest: false,
      depthWrite: false,
    });

    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    scene.add(points);

    el.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';

    const resize = (w: number, h: number) => {
      renderer.setSize(w, h, false);
      camera.left = -w / 2;
      camera.right = w / 2;
      camera.top = h / 2;
      camera.bottom = -h / 2;
      camera.updateProjectionMatrix();
      const scale = Math.min(w, h) * viewScale;
      uniforms.uViewScale.value = scale;
      // The stack spans 0 .. STACK_OFFSET in y; pulling the whole thing down
      // by half of that puts the pair's centre on the container's centre.
      uniforms.uViewportYOffset.value = -STACK_OFFSET * 0.5 * scale;
      uniforms.uPixelRatio.value = renderer.getPixelRatio();
    };

    const draw = (elapsed: number) => {
      uniforms.uElapsed.value = elapsed;
      uniforms.uSpin.value = elapsed * spinSpeed;
      renderer.render(scene, camera);
    };

    resize(size.current.width, size.current.height);
    stage.current = { resize, draw };
    draw(STATIC_ELAPSED);

    return () => {
      stage.current = null;
      disposeObject(scene);
      material.dispose();
      disposeRenderer(renderer);
      renderer.domElement.remove();
    };
  }, [
    ready,
    ringCount,
    ringDots,
    dividerCount,
    dividerDots,
    noteGroups,
    noteDots,
    spinSpeed,
    noteInterval,
    dotScale,
    viewScale,
    opacity,
    color,
    noteColor,
    seed,
  ]);

  useEffect(() => {
    stage.current?.resize(width, height);
    if (reduced) stage.current?.draw(STATIC_ELAPSED);
  }, [width, height, reduced]);

  useRaf((_dt, elapsed) => stage.current?.draw(elapsed), ready && !reduced && !unsupported);
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nulls the stage ref so a queued frame cannot touch a dead renderer, disposes the geometry through `disposeObject(scene)`, disposes the material, calls `disposeRenderer` for `dispose` + `forceContextLoss` + a zeroed backing store, and removes the canvas. `useRaf` unsubscribes on unmount.

**Reduced motion.** No frame loop is opened. One frame is drawn at `uElapsed = 0.4`, which shows both cylinders at a legible yaw with the first note group lit, so the structure and the highlight convention are both visible. Neither the rotation nor the playhead advances.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Leaving `depthTest` on. Every dot is projected with z = 0, so the first fragment written at a pixel wins and the far wall of the cylinder punches holes in the near one. The whole design depends on buffer order, not on the depth buffer.
- Sorting note dots into the buffer before measure dots, or drawing them as a second object added earlier. With depth testing off, "on top" means "later in the buffer" — get it wrong and the notes are half-eaten by the rings that surround them.
- Applying the stack offset before `rotateX`. It then rotates with the model, and the two cylinders slowly drift into each other over the course of a revolution instead of staying vertically separated.
- Writing raw random angles into a ring. Blending happens in buffer order, so unsorted angles interleave near and far dots and the ring visibly stipples rather than reading as a continuous engraved line.
- Driving the playhead from React state and an interval. It re-renders the tree once per beat, and the highlight lands one frame after the beat because the uniform write happens in a commit rather than in the frame loop — deriving it from `uElapsed` in the shader avoids both.
- Rebuilding the buffer when the container resizes. Model space is size-independent; only `uViewScale` and `uViewportYOffset` change, so a reflow costs two uniform writes rather than a dropped GL context.
- Setting `frustumCulled` at its default. Positions are unit-scale around the origin and the real placement happens in the shader, so three's bounding sphere does not describe what is on screen.

## Notes

- The two cylinders are "instances" only in the conceptual sense — this is one non-instanced `Points` with an index in an attribute, which is cheaper than instancing for a case where every vertex differs anyway.
- Total dot count is `2 * (ringCount * ringDots + dividerCount * dividerDots + noteGroups * noteDots)`, about 6100 at the defaults, in one draw call.

## Definition of done

Two stacked cylinders of dots turn at a constant rate, showing different faces to the viewer. Dots on the far side are visibly smaller and dimmer than those on the near side, and no dot ever pops in front of one it should be behind. A cluster of larger note dots lights every 1.2 seconds and cycles around the cylinder. Resize the container and the piece rescales without a flicker. With reduced motion it holds a single legible frame.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
