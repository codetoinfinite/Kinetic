# Build: Realtime Cube EnvMap

A `CubeCamera` sits inside the reflector and renders the six directions around it every other frame; that cube texture is assigned straight onto the material as its `envMap`. Because the panels supplying the reflection are orbiting, the highlights crawl across the surface instead of being painted on. No HDRI, no loader, no asset — the environment is scene geometry.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A metal knot reflecting panels that are actually orbiting it, captured six faces at a time every other frame.

- Category: webgl
- Runtime cost: webgl
- Dependencies: three@^0.185.1

## How it works

1. A `WebGLCubeRenderTarget(resolution, { generateMipmaps: true, minFilter: LinearMipmapLinearFilter })` backs a `CubeCamera(0.1, 60, target)` positioned at the reflector, and `cubeTarget.texture` is assigned to `material.envMap` once at build time — the texture object never changes identity, only its contents.
2. The environment is built from geometry: an inside-out `SphereGeometry(16)` with `side: BackSide` carrying a vertical gradient `CanvasTexture`, plus `panelCount` `PlaneGeometry` emitters on a ring of radius `panelRadius`, each `lookAt(0,0,0)` and lifted by `sin(i * 2.39996) * 0.9` so the reflection has vertical structure to move through.
3. Panels alternate bright and near-black via `color.setHSL(hue + i*26, i%2 ? 0.4 : 0.66, i%2 ? 0.08 : 0.62)`. The dark ones are load-bearing: a uniformly bright environment gives a mirror nothing to contrast against and the metal reads as matte plastic.
4. Each frame the ring and the reflector are rotated from `elapsed`, then — only on frames where `frames % refreshEvery === 0` — the reflector is set `visible = false`, `cubeCamera.update(renderer, scene)` runs, and it is set visible again before the single visible `renderer.render`.
5. Resize lives in its own effect: it sets renderer size, sets `camera.aspect`, moves the camera to `BASE_DISTANCE / Math.min(1, aspect)` so a portrait container does not clip the panel ring off both sides, and forces one capture plus one redraw so a reflow never leaves a stale or black frame on screen.
6. Teardown disposes the shell texture, both geometries, every panel material, the reflector material, then `cubeTarget.dispose()` — the cube target is not in the scene graph, so `disposeObject` never reaches it — and finally `disposeRenderer`, which is what calls `forceContextLoss()`.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `refreshEvery = 2`
  Cube captures per rendered frame. Six faces is six scene renders against the visible pass's one, so this is 6/7 of the component's cost. An env map is sampled by direction, not position, so at these rotation speeds a one-frame-old capture is not observable; at 4 or more the highlights visibly step.
- `resolution = 256`
  Cube face size. Cost is 6 x resolution² fragments plus a mip chain — about 2 MB of GPU memory. At 128 the panel edges alias into the reflection as jagged bands; above 512 nothing improves because roughness immediately blurs the detail away.
- `roughness = 0.08`
  Not 0. A perfect mirror shows the panels as hard-edged rectangles and every seam in the cube map becomes visible; a slight roughness selects a lower mip and softens exactly those seams. Above ~0.3 the reflection stops being readable as a scene at all.
- `envMapIntensity = 1.4`
  Reflected light multiplier. At 1 a dark environment leaves the object nearly invisible against the shell; above ~2 the bright panels clip to flat white and the curvature information in the highlight is lost.
- `panelRadius = 4.2`
  Ring radius against a ~1.4-unit reflector. Closer and the panels enter the camera frustum and read as walls rather than as light sources; further and they subtend too small an angle to produce a highlight worth reflecting.
- `BASE_DISTANCE = 7.2`
  Camera distance at aspect >= 1, chosen against a 34 degree field of view so the reflector fills about two thirds of the frame height. Divided by `min(1, aspect)` on narrower containers.
- `STATIC_POSE = 0.9`
  The `elapsed` value used for the reduced-motion still and for post-resize redraws. Not 0: at zero the knot is axis-aligned and the panels sit on the cardinal directions, which reads as a technical diagram instead of a lit object.
- `lift stagger = sin(i * 2.39996) * 0.9`
  2.39996 rad is the golden angle, so successive panels never repeat a height for any panel count. A constant height puts every panel in one band and the reflection has nothing to travel through vertically.

## API

```ts
function RealtimeCubeEnvmap(props: { shape?: 'knot' | 'icosahedron'; panelCount?: number; panelRadius?: number; spinSpeed?: number; objectSpin?: number; resolution?: number; refreshEvery?: number; roughness?: number; metalness?: number; envMapIntensity?: number; hue?: number; className?: string }): JSX.Element
```

- `shape: 'knot' | 'icosahedron'` — default `'knot'`
  Reflector silhouette. The knot has more curvature and so more reflection per pixel.
- `panelCount: number` — default `7`
  Emitting panels on the ring. Odd counts keep bright and dark panels from pairing off across the object.
- `panelRadius: number` — default `4.2`
  Ring radius in world units.
- `spinSpeed: number` — default `0.18`
  Panel ring rotation, radians per second. This is what makes the reflection move.
- `objectSpin: number` — default `0.32`
  Reflector rotation about Y, radians per second. X spins at 0.55 of this.
- `resolution: number` — default `256`
  Cube face size in pixels. Cost is six faces plus mips.
- `refreshEvery: number` — default `2`
  Capture the cube map every Nth rendered frame. 1 captures every frame.
- `roughness: number` — default `0.08`
  Surface roughness, which selects the env map mip level.
- `metalness: number` — default `1`
  1 is a mirror; 0 is diffuse and lit only by the env map.
- `envMapIntensity: number` — default `1.4`
  Multiplier on reflected light.
- `hue: number` — default `208`
  Base hue in degrees for the panels and the shell gradient.
- `className: string`
  Merged onto the host element via `cn`.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function RealtimeCubeEnvmap({
  shape = 'knot',
  panelCount = 7,
  panelRadius = 4.2,
  spinSpeed = 0.18,
  objectSpin = 0.32,
  resolution = 256,
  refreshEvery = 2,
  roughness = 0.08,
  metalness = 1,
  envMapIntensity = 1.4,
  hue = 208,
  className,
}: RealtimeCubeEnvmapProps) {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage | null>(null);

  const { width, height } = useResizeObserver(host);
  const { inView } = useInView(host, { threshold: 0 });
  const visible = useVisibility();
  const reduced = useReducedMotion();

  const [supported, setSupported] = useState(true);
  useEffect(() => setSupported(hasWebGL()), []);

  const size = useRef({ width, height });
  size.current = { width, height };

  const ready = width > 1 && height > 1 && supported;

  useEffect(() => {
    const el = host.current;
    if (!el || !ready) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(pixelRatio());
    renderer.setSize(el.clientWidth, el.clientHeight, false);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(FIELD_OF_VIEW, 1, 0.1, 60);
    camera.position.set(0, 0.35, BASE_DISTANCE);
    camera.lookAt(0, 0, 0);

    // The shell is the environment's floor and sky in one object: a sphere
    // turned inside out. It is what the cube camera sees in every direction
    // the panels do not cover, so without it the reflection has large holes of
    // clear-colour black and the object reads as unlit rather than dark.
    const shellTexture = new THREE.CanvasTexture(makeShellTexture(hue));
    shellTexture.colorSpace = THREE.SRGBColorSpace;
    const shellGeometry = new THREE.SphereGeometry(16, 32, 16);
    const shellMaterial = new THREE.MeshBasicMaterial({
      map: shellTexture,
      side: THREE.BackSide,
    });
    scene.add(new THREE.Mesh(shellGeometry, shellMaterial));

    // Panels. Their arrangement is a pure function of the index — there is no
    // random scatter here, so there is no seed to keep in step between the
    // server render and the client one.
    const ring = new THREE.Group();
    const panelGeometry = new THREE.PlaneGeometry(1.5, 3.4);
    const panelMaterials: THREE.MeshBasicMaterial[] = [];
    const count = Math.max(2, Math.round(panelCount));

    for (let i = 0; i < count; i += 1) {
      const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
      // Alternating bright and near-black panels. An environment that is
      // uniformly bright gives a mirror nothing to contrast against and the
      // metal reads as matte plastic; the dark panels are what draw the
      // specular edges.
      const bright = i % 2 === 0;
      material.color.setHSL(
        ((hue + i * 26) % 360) / 360,
        bright ? 0.66 : 0.4,
        bright ? 0.62 : 0.08,
      );
      panelMaterials.push(material);

      const panel = new THREE.Mesh(panelGeometry, material);
      const angle = (i / count) * Math.PI * 2;
      // Golden-angle stagger on the height, so the panels do not sit in a
      // single band and the reflection has vertical structure to move through.
      const lift = Math.sin(i * 2.39996) * 0.9;
      panel.position.set(
        Math.sin(angle) * panelRadius,
        lift,
        Math.cos(angle) * panelRadius,
      );
      panel.lookAt(0, 0, 0);
      ring.add(panel);
    }
    scene.add(ring);

    const reflectorGeometry =
      shape === 'knot'
        ? new THREE.TorusKnotGeometry(0.92, 0.31, 220, 32)
        : new THREE.IcosahedronGeometry(1.35, 2);

    // Mipmaps are not optional here. `roughness` selects a mip level of the
    // env map, so a cube target without them samples level 0 at every
    // roughness and the surface stays a hard mirror no matter what you pass.
    const cubeTarget = new THREE.WebGLCubeRenderTarget(Math.max(16, Math.round(resolution)), {
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
    });
    const cubeCamera = new THREE.CubeCamera(0.1, 60, cubeTarget);
    // Co-located with the reflector: an env map is sampled by direction, so
    // the capture point is the only position information it carries. Offset it
    // and the reflections belong to a different object.
    cubeCamera.position.set(0, 0, 0);
    scene.add(cubeCamera);

    const material = new THREE.MeshPhysicalMaterial({
      metalness,
      roughness,
      envMapIntensity,
      // Assigned to the material rather than `scene.environment` on purpose.
      // A live capture belongs to one object at one point in space; sharing it
      // scene-wide would give every reflector the same viewpoint.
      envMap: cubeTarget.texture,
      color: 0xffffff,
    });
    const reflector = new THREE.Mesh(reflectorGeometry, material);
    scene.add(reflector);

    const throttle = Math.max(1, Math.round(refreshEvery));
    let frames = 0;

    const draw = (elapsed: number, forceCapture: boolean) => {
      ring.rotation.y = elapsed * spinSpeed;
      reflector.rotation.y = elapsed * objectSpin;
      reflector.rotation.x = elapsed * objectSpin * 0.55;

      frames += 1;
      if (forceCapture || frames % throttle === 0) {
        // Hide, capture, show — in that order, inside one frame. Skipping the
        // hide is the classic version of this bug: the object captures itself
        // and within a second the surface is a recursive tunnel.
        reflector.visible = false;
        cubeCamera.update(renderer, scene);
        reflector.visible = true;
      }

      renderer.render(scene, camera);
    };

    const resize = (w: number, h: number) => {
      if (w < 1 || h < 1) return;
      const aspect = w / h;
      renderer.setPixelRatio(pixelRatio());
      renderer.setSize(w, h, false);
      camera.aspect = aspect;
      // Pull the camera back on narrow containers. A fixed distance frames the
      // object on height alone, so a portrait preview clips the panel ring off
      // both sides and the reflections lose their source.
      camera.position.z = BASE_DISTANCE / Math.min(1, aspect);
      camera.updateProjectionMatrix();
    };

    resize(size.current.width, size.current.height);
    stage.current = { renderer, scene, camera, cubeTarget, resize, draw };
    // First frame forces a capture: with an empty cube map a metal surface is
    // pure black, and on a throttled refresh that black would be on screen for
    // `refreshEvery` frames.
    draw(STATIC_POSE, true);

    return () => {
      stage.current = null;
      scene.remove(cubeCamera);
      // Order matters: free the scene graph's GPU objects while the context is
      // still alive, then hand the context itself back.
      disposeObject(scene);
      shellTexture.dispose();
      shellGeometry.dispose();
      shellMaterial.dispose();
      panelGeometry.dispose();
      for (const panelMaterial of panelMaterials) panelMaterial.dispose();
      reflectorGeometry.dispose();
      material.dispose();
      // The cube target is not in the scene graph, so nothing above reaches
      // it. It holds six faces plus their mip chain — at 256px that is about
      // 2 MB of GPU memory per instance.
      cubeTarget.dispose();
      disposeRenderer(renderer);
      renderer.domElement.remove();
    };
  }, [
    ready,
    shape,
    panelCount,
    panelRadius,
    spinSpeed,
    objectSpin,
    resolution,
    refreshEvery,
    roughness,
    metalness,
    envMapIntensity,
    hue,
  ]);

  // Resize in its own effect: a container reflow costs a `setSize` and one
  // redraw rather than a rebuild of the geometry and the cube target.
  useEffect(() => {
    const current = stage.current;
    if (!current) return;
    current.resize(width, height);
    current.draw(STATIC_POSE, true);
  }, [width, height, reduced]);

  useRaf(
    (_dt, elapsed) => stage.current?.draw(elapsed, false),
    ready && inView && visible && !reduced,
  );
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** `disposeObject(scene)` walks the graph, then the shell canvas texture, shell and panel geometries, every panel material and the reflector material are disposed explicitly, then `cubeTarget.dispose()` releases the six faces and their mip chain, then `disposeRenderer(renderer)` calls `dispose()` and `forceContextLoss()` and zeroes the backing store, and the canvas node is removed. The `CubeCamera` is removed from the scene first so nothing holds a reference to a disposed target.

**Reduced motion.** The rAF subscription is never made, and the scene is drawn once at `STATIC_POSE` with a forced cube capture — a fully reflective still with the panels off the cardinal axes. Reflections, gradient shell and material are all exactly as they are in motion; only the rotation is absent. Resizing redraws the same pose rather than resuming.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Capturing with the reflector visible. It photographs its own previous frame, the next capture includes that photograph, and within about a second the surface is a recursive tunnel of dark shells. Hide it, capture, show it — inside the same frame, so it is never absent from the visible render.
- Creating the cube target without mipmaps. `roughness` picks a mip level of the env map; with only level 0 available the surface stays a hard mirror at every roughness value and the prop appears to do nothing.
- Refreshing the cube map every frame because it looks like the honest thing to do. That is seven scene renders per displayed frame, and it is the difference between a preview grid that holds 60fps and one that does not.
- Rendering the first frame without forcing a capture. An unwritten cube map is black, a metal surface reflecting black is black, and on a throttled refresh that black sits on screen for `refreshEvery` frames as a visible flash.
- Building the environment out of bright panels only. Metal is read entirely from the contrast between light and dark in its surroundings; with no dark panels the highlights have no edges and the material looks like painted plastic.
- Letting `disposeObject(scene)` stand in for cube-target cleanup. The target is not a child of anything, so nothing traverses it, and six faces plus mips leak per mount — which under StrictMode double-invocation is two leaks per page load.
- Leaving the camera distance fixed. Framing on height alone means a portrait container crops the panel ring away entirely, and the object loses the thing it is reflecting.

## Notes

- No lights in the scene. `metalness: 1` with `roughness` near 0 is lit purely by its environment, so a light would contribute almost nothing while adding a uniform to every shader compile.
- `transmission` is deliberately not exposed. Three renders a separate full-scene pass per transmissive object, which on top of six cube faces triples the frame cost for an effect the cube map already implies.
- The panel arrangement is a pure function of the index, so there is no RNG and nothing to seed — server and client markup cannot disagree.

## Definition of done

The bright bands on the object crawl across its surface continuously while it turns, and the same colours are visible on the panels orbiting behind it. There is no dark recursive tunnel anywhere on the surface at any moment. Raising `roughness` toward 0.3 progressively blurs the reflection instead of leaving it a hard mirror. Resize the container and the object stays fully in frame in both landscape and portrait. Mount and unmount a dozen instances and none of the earlier ones go black.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
