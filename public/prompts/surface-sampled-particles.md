# Build: Area-Weighted Surface Particles

Turns any object — one primitive or a whole loaded model — into a particle shell whose density is uniform over the surface rather than over the mesh list. One cumulative distribution is built over the world-space area of every triangle in the object and sampled by binary search, so a face a thousand times larger than its neighbour is picked a thousand times more often. The shell then assembles bottom-up on a per-particle window, breathes along its own sampled normals, and is ringed by orbit lines whose radii are measured from the cloud instead of hard-coded.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Any mesh becomes a particle shell of even density, assembling bottom-up, with orbit rings measured off the sampled silhouette.

- Category: webgl
- Runtime cost: webgl
- Dependencies: three@^0.185.1

## How it works

1. Every mesh under the source object is traversed and each triangle is read in WORLD space via `matrixWorld`. `n = (b - a) × (c - a)` gives area as `|n| / 2` and the face normal as `n / |n|` in one operation; the running area total is written into a `Float64Array` cumulative table, one entry per triangle.
2. To place a particle, `rng() * totalArea` is looked up in that table by binary search. This is inverse-transform sampling over area, which is where per-mesh weighting comes from for free — the alternative, `count / meshCount` points per mesh, gives a dense speckle on the small parts and a sparse haze on the large ones, and no tuning fixes it because the error is structural.
3. The point inside the chosen triangle uses barycentric coordinates by reflection: draw `u, v` in the unit square and if `u + v > 1` replace them with `1 - u, 1 - v`, folding the far half back across the diagonal. `p = a + (b - a) * u + (c - a) * v` is then exactly uniform over the triangle.
4. The cloud is centred on its bounding-box centre and divided by its farthest sample, so the shell always has bounding-sphere radius 1. Camera distance follows from the frustum rather than from taste: `d = 1 / sin(min(vFovHalf, atan(tan(vFovHalf) * aspect))) * 1.14` fits the sphere in whichever axis is tighter.
5. Assembly order is the particle's own normalised target height, so `form = smoothstep(order * 0.45, order * 0.45 + 0.55, uForm)` builds the shell bottom-up — the object is constructed rather than faded in. `uForm` is damped toward 1 with `damp(form, 1, 0.05, dt)`, so the build takes about the same two seconds at 60 and at 120 Hz.
6. `eff = uScatter * (1 - form)` collapses the pre-assembly cloud into the arrival: each particle is pushed out along `normalize(aRand.xyz - 0.5 + 0.0001)` by `(0.6 + aRand.x * 2.2)` radii plus a slow per-axis sinusoid, and both fade to nothing exactly as that particle's own window closes.
7. Point size is perspective-corrected in the vertex shader: `uSize * jitter * uSizeScale / max(0.1, -mv.z)`, where `uSizeScale` is `pixelRatio * cameraDistance`. That makes `uSize` a literal CSS-pixel diameter for a particle at the centre of the shell, rather than the tuned constant this term usually is.
8. Orbit rings are measured, not authored: the cloud is cut into `ringCount` horizontal bands, the radii `sqrt(x² + z²)` within each band are sorted, and the 92nd percentile times 1.06 is the ring radius. Bands with fewer than 12 samples are skipped. All rings go into one buffer as `LineSegments`, so the set is one draw call.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `count = 9000`
  Particles, one buffer, one draw call. Enough that the silhouette of a torus knot reads as a solid surface at preview size; the cost is fill rather than vertex count, and doubling it doubles the blended pixel area rather than the detail.
- `size / maxSize = 2.4 / 22 CSS px`
  Diameter at the centre of the shell, and the ceiling after 1/z growth. The clamp is not cosmetic: a particle that drifts close to the near plane would otherwise ask for a point size in the thousands, which drivers answer by silently capping — or by dropping the draw call.
- `size jitter = 0.55 + aRand.w * 1.35`
  A 3.4x spread. With every particle the same size the cloud reads as a halftone screen; much wider and the largest sprites stop looking like members of the same population.
- `STAGGER / WINDOW = 0.45 / 0.55`
  They sum to exactly 1.0, so the last particle to start is also the one that finishes as `uForm` reaches 1 — no dead time at either end of the build. Raising STAGGER past ~0.6 leaves the base fully assembled while the top has not begun, which reads as two separate animations.
- `FORM_SMOOTHING = 0.05`
  Fraction of the assembly gap remaining after one second, which with the stagger gives a build of roughly two seconds. This is a `damp` smoothing value, not a per-frame lerp — the per-frame form of the same curve converges twice as fast at 120 Hz.
- `FORM_EPSILON = 0.9995`
  `damp` is asymptotic and never arrives, but the last stagger window needs `uForm` to reach exactly 1.0 or the topmost particles stay a hair short of their target forever. Past this threshold it snaps.
- `puff = 0.02 of the shell radius`
  Breathing amplitude along the sampled normal. At 2% the surface undulates while staying a surface; past roughly 6% the shell loses its silhouette and reads as a cloud that happens to be shaped like the object.
- `scatter = 0.9`
  Pre-assembly spread in shell radii, giving a cloud extending to about 2.6 radii. Small enough that the unformed state is still recognisably centred on the object; much larger and the particles start their travel off-screen, so the build begins with an empty frame.
- `RING_PERCENTILE = 0.92`
  Which measured radius in a band becomes the ring. The maximum is dragged outward by a single stray sample on a spike; the mean sinks inside the silhouette and the ring cuts through the shell.
- `MIN_BAND_SAMPLES / MIN_RING_RADIUS = 12 / 0.08`
  A band with almost nothing in it is a gap in the model, and a ring there would hang in empty air; a measured radius near zero is a dot rather than a ring. Both are skipped, which is why the ring count is a maximum and not a promise.
- `FIT_PADDING = 1.14`
  Slack between the unit sphere and the frustum. It has to cover the breathing, the ring margin and the fact that a sprite is drawn centred on its vertex, so a particle exactly on the silhouette still needs half its own width of room.
- `TILT = 0.2 rad`
  Static tilt applied on a parent group. Without it the measured rings project to straight lines and read as scan lines rather than orbits; much past 0.4 the top band occludes the shell.
- `RING_SEGMENTS = 128`
  Vertices per ring. Roughly where a hairline circle stops showing flats at 600px wide, and cheap enough that four rings are still 1024 line vertices in a single buffer.

## API

```ts
function SurfaceSampledParticles(props: { source?: () => THREE.Object3D | null; count?: number; size?: number; maxSize?: number; spin?: number; puff?: number; scatter?: number; ringCount?: number; ringOpacity?: number; opacity?: number; colorBase?: string; colorTip?: string; ringColor?: string; fov?: number; seed?: number | string; className?: string }): JSX.Element
```

- `source: () => THREE.Object3D | null`
  Builds the object to sample. Measured on the CPU, never added to the scene, disposed once sampling finishes. Held in a ref, so changing it does not itself trigger a rebuild.
- `count: number` — default `9000`
  Particle count. One buffer, one draw call; cost is linear in fill.
- `size: number` — default `2.4`
  Particle diameter in CSS pixels for a particle at the centre of the shell.
- `maxSize: number` — default `22`
  Ceiling in CSS pixels on the perspective-grown size.
- `spin: number` — default `0.16`
  Turntable speed in radians per second.
- `puff: number` — default `0.02`
  Breathing amplitude along the sampled normal, as a fraction of the shell radius.
- `scatter: number` — default `0.9`
  How far the pre-assembly cloud spreads, in shell radii.
- `ringCount: number` — default `4`
  Horizontal bands to measure orbit rings from. Bands that are too empty are skipped, so this is a maximum. 0 disables the rings.
- `ringOpacity: number` — default `0.3`
  Ring opacity once the shell has assembled; it ramps with the build.
- `opacity: number` — default `0.9`
  Overall alpha multiplier applied in the vertex shader.
- `colorBase: string` — default `'#6b7783'`
  Tint at the base of the shell.
- `colorTip: string` — default `'#ffffff'`
  Tint at the top of the shell.
- `ringColor: string` — default `'#8d9aa6'`
  Ring colour.
- `fov: number` — default `32`
  Vertical field of view in degrees. Camera distance and the perspective size term are both derived from it.
- `seed: number | string` — default `'surface-sampled-particles'`
  Seeds the sampling and the per-particle randoms, so the same shell is produced on the server and on every reload.
- `className: string`
  Merged onto the host element via `cn`.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/**
 * Sample `count` points over the total world-space surface area of everything
 * under `root`, then centre and scale the result so its bounding sphere has
 * radius 1.
 */
function sampleSurface(root: THREE.Object3D, count: number, rng: Rng): Shell | null {
  // World matrices, not local ones: a mesh scaled 10x has 100x the area, and
  // sampling in local space would weight it as though it did not.
  root.updateMatrixWorld(true);

  const meshes: THREE.Mesh[] = [];
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh && mesh.geometry) meshes.push(mesh);
  });

  let capacity = 0;
  for (const mesh of meshes) {
    const position = mesh.geometry.getAttribute('position');
    if (!position) continue;
    const index = mesh.geometry.getIndex();
    capacity += Math.floor((index ? index.count : position.count) / 3);
  }
  if (capacity === 0) return null;

  const tri = new Float32Array(capacity * 9);
  const triNormal = new Float32Array(capacity * 3);
  // Float64 for the running total. At tens of thousands of triangles a Float32
  // accumulator loses the smallest ones entirely — they land inside the
  // rounding error of the sum and become unreachable by any sample.
  const cumulative = new Float64Array(capacity);

  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const n = new THREE.Vector3();

  let triCount = 0;
  let total = 0;

  for (const mesh of meshes) {
    const position = mesh.geometry.getAttribute('position');
    if (!position) continue;
    const index = mesh.geometry.getIndex();
    const faces = Math.floor((index ? index.count : position.count) / 3);

    for (let f = 0; f < faces; f += 1) {
      const i0 = index ? index.getX(f * 3) : f * 3;
      const i1 = index ? index.getX(f * 3 + 1) : f * 3 + 1;
      const i2 = index ? index.getX(f * 3 + 2) : f * 3 + 2;

      a.fromBufferAttribute(position, i0).applyMatrix4(mesh.matrixWorld);
      b.fromBufferAttribute(position, i1).applyMatrix4(mesh.matrixWorld);
      c.fromBufferAttribute(position, i2).applyMatrix4(mesh.matrixWorld);

      ab.subVectors(b, a);
      ac.subVectors(c, a);
      n.crossVectors(ab, ac);
      // Half the cross product's magnitude is the triangle's area, and the
      // cross product's direction is its normal — one operation for both.
      const area = n.length() * 0.5;
      // Degenerate triangles are common in generated and exported geometry.
      // Keeping them would put zero-width steps in the distribution and, worse,
      // normalising a zero-length normal yields NaN.
      if (!(area > 0)) continue;
      n.divideScalar(area * 2);

      const t9 = triCount * 9;
      tri[t9] = a.x;
      tri[t9 + 1] = a.y;
      tri[t9 + 2] = a.z;
      tri[t9 + 3] = ab.x;
      tri[t9 + 4] = ab.y;
      tri[t9 + 5] = ab.z;
      tri[t9 + 6] = ac.x;
      tri[t9 + 7] = ac.y;
      tri[t9 + 8] = ac.z;

      const t3 = triCount * 3;
      triNormal[t3] = n.x;
      triNormal[t3 + 1] = n.y;
      triNormal[t3 + 2] = n.z;

      total += area;
      cumulative[triCount] = total;
      triCount += 1;
    }
  }

  if (triCount === 0 || total <= 0) return null;

  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const rands = new Float32Array(count * 4);
  const orders = new Float32Array(count);

  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;

  for (let i = 0; i < count; i += 1) {
    // Inverse-transform sampling: a uniform draw across the cumulative area
    // picks each triangle in proportion to its own area, which is exactly the
    // per-mesh weighting the naive loop gets wrong.
    const t = lowerBound(cumulative, triCount, rng() * total);
    const t9 = t * 9;
    const t3 = t * 3;

    // Uniform barycentric coordinates by reflection: draw a point in the unit
    // square and fold the far half back across the diagonal. Cheaper than the
    // sqrt form and exactly uniform, where using u and v raw would pile
    // samples into one corner of every triangle.
    let u = rng();
    let v = rng();
    if (u + v > 1) {
      u = 1 - u;
      v = 1 - v;
    }

    const px = (tri[t9] ?? 0) + (tri[t9 + 3] ?? 0) * u + (tri[t9 + 6] ?? 0) * v;
    const py = (tri[t9 + 1] ?? 0) + (tri[t9 + 4] ?? 0) * u + (tri[t9 + 7] ?? 0) * v;
    const pz = (tri[t9 + 2] ?? 0) + (tri[t9 + 5] ?? 0) * u + (tri[t9 + 8] ?? 0) * v;

    positions[i * 3] = px;
    positions[i * 3 + 1] = py;
    positions[i * 3 + 2] = pz;

    normals[i * 3] = triNormal[t3] ?? 0;
    normals[i * 3 + 1] = triNormal[t3 + 1] ?? 0;
    normals[i * 3 + 2] = triNormal[t3 + 2] ?? 1;

    rands[i * 4] = rng();
    rands[i * 4 + 1] = rng();
    rands[i * 4 + 2] = rng();
    rands[i * 4 + 3] = rng();

    if (px < minX) minX = px;
    if (py < minY) minY = py;
    if (pz < minZ) minZ = pz;
    if (px > maxX) maxX = px;
    if (py > maxY) maxY = py;
    if (pz > maxZ) maxZ = pz;
  }

  // Fit to a unit bounding sphere around the box centre. Normalising here is
  // what lets `puff`, `scatter` and the camera distance be authored once and
  // stay correct for a source of any scale — including a model in metres.
  const cx = (minX + maxX) * 0.5;
  const cy = (minY + maxY) * 0.5;
  const cz = (minZ + maxZ) * 0.5;

  let maxDist = 0;
  for (let i = 0; i < count; i += 1) {
    const dx = (positions[i * 3] ?? 0) - cx;
    const dy = (positions[i * 3 + 1] ?? 0) - cy;
    const dz = (positions[i * 3 + 2] ?? 0) - cz;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (d > maxDist) maxDist = d;
  }
  const scale = maxDist > 0 ? SHELL_RADIUS / maxDist : 1;

  let shellMinY = Infinity;
  let shellMaxY = -Infinity;
  for (let i = 0; i < count; i += 1) {
    const x = ((positions[i * 3] ?? 0) - cx) * scale;
    const y = ((positions[i * 3 + 1] ?? 0) - cy) * scale;
    const z = ((positions[i * 3 + 2] ?? 0) - cz) * scale;
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    if (y < shellMinY) shellMinY = y;
    if (y > shellMaxY) shellMaxY = y;
  }

  // Assembly order is the particle's own target height, so the shell builds
  // bottom-up. Deriving order from the destination rather than from the buffer
  // index is what makes the build read as construction instead of as noise
  // resolving.
  const span = Math.max(1e-6, shellMaxY - shellMinY);
  for (let i = 0; i < count; i += 1) {
    orders[i] = ((positions[i * 3 + 1] ?? 0) - shellMinY) / span;
  }

  return { positions, normals, rands, orders, minY: shellMinY, maxY: shellMaxY };
}

/**
 * Measure the cloud's silhouette radius in `bands` horizontal slices. The ring
 * radii come out of the geometry that was actually sampled, so swapping the
 * source does not need a new set of hand-tuned numbers.
 */
function measureRings(shell: Shell, bands: number, count: number): Ring[] {
  if (bands <= 0) return [];
  const span = shell.maxY - shell.minY;
  if (!(span > 0)) return [];

  const rings: Ring[] = [];
  for (let band = 0; band < bands; band += 1) {
    const y0 = shell.minY + (span * band) / bands;
    const y1 = shell.minY + (span * (band + 1)) / bands;

    const radii: number[] = [];
    for (let i = 0; i < count; i += 1) {
      const y = shell.positions[i * 3 + 1] ?? 0;
      if (y < y0 || y >= y1) continue;
      const x = shell.positions[i * 3] ?? 0;
      const z = shell.positions[i * 3 + 2] ?? 0;
      radii.push(Math.sqrt(x * x + z * z));
    }
    if (radii.length < MIN_BAND_SAMPLES) continue;

    radii.sort((p, q) => p - q);
    const at = Math.min(radii.length - 1, Math.floor(RING_PERCENTILE * (radii.length - 1)));
    const radius = (radii[at] ?? 0) * RING_MARGIN;
    if (radius < MIN_RING_RADIUS) continue;

    rings.push({ y: (y0 + y1) * 0.5, radius });
  }
  return rings;
}

/** All rings in one buffer, so the whole set is one draw call. */
function buildRingGeometry(rings: Ring[]): THREE.BufferGeometry {
  const vertices = new Float32Array(rings.length * RING_SEGMENTS * 2 * 3);
  let at = 0;
  for (const ring of rings) {
    for (let s = 0; s < RING_SEGMENTS; s += 1) {
      const a0 = (s / RING_SEGMENTS) * Math.PI * 2;
      const a1 = ((s + 1) / RING_SEGMENTS) * Math.PI * 2;
      vertices[at] = Math.cos(a0) * ring.radius;
      vertices[at + 1] = ring.y;
      vertices[at + 2] = Math.sin(a0) * ring.radius;
      vertices[at + 3] = Math.cos(a1) * ring.radius;
      vertices[at + 4] = ring.y;
      vertices[at + 5] = Math.sin(a1) * ring.radius;
      at += 6;
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  return geometry;
}

export function SurfaceSampledParticles({
  source,
  count = 9000,
  size = 2.4,
  maxSize = 22,
  spin = 0.16,
  puff = 0.02,
  scatter = 0.9,
  ringCount = 4,
  ringOpacity = 0.3,
  opacity = 0.9,
  colorBase = '#6b7783',
  colorTip = '#ffffff',
  ringColor = '#8d9aa6',
  fov = 32,
  seed = 'surface-sampled-particles',
  className,
}: SurfaceSampledParticlesProps) {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage | null>(null);
  const [unsupported, setUnsupported] = useState(false);

  const sourceRef = useRef(source);
  sourceRef.current = source;

  const { width, height } = useResizeObserver(host);
  const box = useRef({ width, height });
  box.current = { width, height };

  const reduced = useReducedMotion();
  const visible = useVisibility();
  const { inView } = useInView(host, { rootMargin: '10%' });
  const ready = width > 0 && height > 0;

  useEffect(() => {
    const el = host.current;
    if (!el || !ready) return;

    if (!hasWebGL()) {
      setUnsupported(true);
      return;
    }

    // The source object exists only to be measured. It is never added to the
    // scene, so nothing about it is ever uploaded to the GPU, and it is
    // disposed the moment sampling is done.
    const specimen = sourceRef.current?.() ?? buildDefaultSpecimen();
    const rng = createRng(seed);
    const total = Math.max(1, Math.round(count));
    const shell = sampleSurface(specimen, total, rng);
    disposeObject(specimen);
    if (!shell) {
      setUnsupported(true);
      return;
    }

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    renderer.setPixelRatio(pixelRatio());
    renderer.setClearAlpha(0);
    const dpr = renderer.getPixelRatio();

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 100);

    // Tilt outside, turntable inside: composing both on one Euler makes the
    // spin axis tilt with the object, which wobbles instead of turning.
    const tilt = new THREE.Group();
    tilt.rotation.x = TILT;
    const turntable = new THREE.Group();
    tilt.add(turntable);
    scene.add(tilt);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(shell.positions, 3));
    geometry.setAttribute('aNormal', new THREE.BufferAttribute(shell.normals, 3));
    geometry.setAttribute('aRand', new THREE.BufferAttribute(shell.rands, 4));
    geometry.setAttribute('aOrder', new THREE.BufferAttribute(shell.orders, 1));

    const uniforms: Uniforms = {
      uElapsed: { value: 0 },
      uForm: { value: 0 },
      uScatter: { value: scatter },
      uPuff: { value: puff },
      uSize: { value: size },
      uMaxSize: { value: maxSize * dpr },
      uSizeScale: { value: dpr },
      uOpacity: { value: opacity },
      uColorBase: { value: new THREE.Color(colorBase) },
      uColorTip: { value: new THREE.Color(colorTip) },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: SURFACE_SAMPLED_PARTICLES_VERT,
      fragmentShader: SURFACE_SAMPLED_PARTICLES_FRAG,
      uniforms,
      transparent: true,
      // No depth at all. Sorting nine thousand points per frame on the CPU is
      // not affordable, and it is not needed: the samples are in random buffer
      // order, so an unsorted alpha blend averages out into even density
      // rather than into visible layers.
      depthTest: false,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    const points = new THREE.Points(geometry, material);
    // Displacement happens in the shader, where the frustum culler cannot see
    // it. The bounding sphere three computes from the rest positions is right
    // for the assembled shell and much too small for the scattered one.
    points.frustumCulled = false;
    turntable.add(points);

    const rings = measureRings(shell, Math.max(0, Math.round(ringCount)), total);
    let ringMaterial: THREE.LineBasicMaterial | null = null;
    if (rings.length > 0) {
      ringMaterial = new THREE.LineBasicMaterial({
        color: new THREE.Color(ringColor),
        transparent: true,
        opacity: 0,
        depthTest: false,
        depthWrite: false,
      });
      const ringLines = new THREE.LineSegments(buildRingGeometry(rings), ringMaterial);
      ringLines.frustumCulled = false;
      turntable.add(ringLines);
    }

    el.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';

    let form = 0;
    let angle = 0;

    const resize = (w: number, h: number) => {
      if (w <= 0 || h <= 0) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;

      // Fit the unit sphere in BOTH axes. Vertical fov alone leaves a tall
      // preview cropping the shell; the horizontal half-angle is the binding
      // constraint whenever the container is narrower than it is tall.
      const vHalf = (camera.fov * Math.PI) / 360;
      const hHalf = Math.atan(Math.tan(vHalf) * camera.aspect);
      const distance = (SHELL_RADIUS / Math.sin(Math.min(vHalf, hHalf))) * FIT_PADDING;
      camera.position.set(0, 0, distance);
      camera.far = distance + SHELL_RADIUS * 8;
      camera.updateProjectionMatrix();

      // Camera distance is half of the perspective size term, so it has to be
      // republished whenever the fit changes — otherwise particles keep the
      // pixel size of the previous layout.
      uniforms.uSizeScale.value = renderer.getPixelRatio() * distance;
      uniforms.uMaxSize.value = maxSize * renderer.getPixelRatio();
    };

    const render = () => {
      uniforms.uForm.value = form;
      turntable.rotation.y = angle;
      if (ringMaterial) ringMaterial.opacity = ringOpacity * form;
      renderer.render(scene, camera);
    };

    const step = (dt: number, elapsed: number) => {
      // Frame-rate independent: a per-frame constant would build the shell
      // twice as fast on a 120 Hz display.
      form = form >= FORM_EPSILON ? 1 : damp(form, 1, FORM_SMOOTHING, dt);
      angle += dt * spin;
      uniforms.uElapsed.value = elapsed;
      render();
    };

    const still = () => {
      form = 1;
      angle = STATIC_ANGLE;
      uniforms.uElapsed.value = STATIC_ELAPSED;
      render();
    };

    resize(box.current.width, box.current.height);
    stage.current = { resize, step, still };
    render();

    return () => {
      stage.current = null;
      disposeObject(scene);
      material.dispose();
      ringMaterial?.dispose();
      disposeRenderer(renderer);
      renderer.domElement.remove();
    };
  }, [
    ready,
    count,
    size,
    maxSize,
    spin,
    puff,
    scatter,
    ringCount,
    ringOpacity,
    opacity,
    colorBase,
    colorTip,
    ringColor,
    fov,
    seed,
  ]);

  // Resize is its own effect: a container reflow costs a `setSize` and a
  // camera refit, never a re-sample of the surface.
  useEffect(() => {
    stage.current?.resize(width, height);
    if (reduced) stage.current?.still();
  }, [width, height, reduced]);

  useRaf(
    (dt, elapsed) => stage.current?.step(dt, elapsed),
    ready && inView && visible && !reduced && !unsupported,
  );
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The source object is disposed immediately after sampling, before the renderer even exists. On unmount the stage ref is nulled so an in-flight frame cannot draw into a dying context, `disposeObject(scene)` disposes the point geometry, the ring geometry and their materials, the point material and the ring material are disposed explicitly as well, then `disposeRenderer` performs `dispose()` + `forceContextLoss()` + a zeroed drawing buffer — `dispose()` alone leaves the context alive — and the canvas node is removed. `useRaf`, `useInView`, `useVisibility` and `useResizeObserver` release their own subscriptions.

**Reduced motion.** No rAF subscription is opened and one still frame is drawn with `uForm` forced to 1 and the turntable at 0.6 rad — a three-quarter view of the fully assembled shell with its rings at full opacity, not the unformed cloud. The shell, the density, the depth cue from perspective point sizing and the measured rings are all present; the assembly, the breathing and the rotation are what stop. A resize redraws the same still.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Sampling a fixed number of points per mesh. It is the obvious loop and it is wrong: density then tracks the mesh list rather than the surface, so a model whose parts differ in size gets a dense speckle on the small ones and a haze on the large ones. One cumulative table over all triangles of all meshes is the fix, and it is no more code.
- Building the area table in local space. A mesh scaled 10x has 100x the surface area; weighting by untransformed triangles gives that part a hundredth of the density it should have, and the bug only shows on models that use node transforms.
- Accumulating the running area total in a `Float32Array`. At tens of thousands of triangles the smallest ones land inside the rounding error of the sum, their cumulative entries stop increasing, and they become unreachable by any sample — whole thin features silently receive no particles.
- Keeping degenerate triangles. Exported and generated geometry is full of zero-area faces; they contribute zero-width steps to the distribution and, worse, normalising a zero-length cross product yields NaN. One NaN vertex position takes visible neighbours with it on some drivers.
- Using `u` and `v` raw as barycentric weights. Points then pile into one corner of every triangle, and at high triangle counts the cloud acquires a visible directional grain along the tessellation. Reflecting the far half of the unit square across the diagonal costs one comparison and is exactly uniform.
- Leaving `frustumCulled` on. Every displacement happens in the vertex shader, so the bounding sphere three computes from the rest positions is right for the assembled shell and far too small for the scattered one — the whole cloud blinks out during the part of the animation where it is largest.
- Making `gl_PointSize` constant. Point size does not fall off with distance on its own, so a 3D cloud with a fixed size has no depth at all — it looks like a flat stencil of the object. Dividing by view-space depth is the entire perspective cue, and `max(0.1, -mv.z)` is a required guard, not a nicety: a particle crossing the near plane otherwise asks for an infinite size and some drivers drop the draw.
- Caching the perspective size term at construction. Camera distance is derived from the container aspect ratio, so it changes on every reflow; a stale `uSizeScale` leaves particles at the pixel size of the previous layout.
- Depth-testing a translucent point cloud. With `depthWrite` on, nine thousand sprites occlude each other in buffer order and the cloud tears into hard layers; sorting them per frame on the CPU is unaffordable. Because the samples are already in random order, no depth and an unsorted blend average out into even density.
- Hard-coding ring radii for the model you happen to be sampling. They stop matching the moment the source changes, and nothing in the code says why the numbers were what they were. Measuring a percentile of the cloud's own radius per band is the same three lines and survives a new source.
- Adding the source object to the scene so it can be sampled. It never needs to be rendered — it is a CPU-side measuring stick. Leaving it in the graph uploads every one of its triangles to the GPU and draws a solid mesh through the middle of the particles.
- Making the `source` callback an effect dependency. An inline arrow changes identity on every parent render, so the entire surface is re-sampled — tens of thousands of triangles and a full buffer upload — on any unrelated state change upstream. It is held in a ref instead.

## Notes

- The technique is the same one used to scatter particles over a loaded GLB; the built-in specimen exists so the component ships with no asset. It is four primitives with deliberately mismatched areas — a torus knot, a small icosahedral finial, an open cylinder stem and a lathed base — which is precisely the case area weighting exists to handle.
- Pass `source` to sample something else: return the `scene` of a loaded model, or any procedural `Object3D`. It is measured, normalised to a unit bounding sphere and then disposed, so a source authored in metres and one authored in unit space both frame identically.
- Sampling costs one pass over every triangle plus a binary search per particle — a few milliseconds for 9000 particles over 10k triangles — and it happens once per rebuild, never per frame.
- Two draw calls: the whole point cloud, and every measured ring in one `LineSegments` buffer. The rings do not depth-test, so their far halves cross in front of the shell; at hairline width and 0.3 opacity that reads as an orbit diagram rather than as an error.
- The rAF subscription is gated on `useInView` and `useVisibility`, so a scrolled-away or backgrounded instance stops paying for fill. The assembly resumes from wherever it froze rather than restarting.
- three constructs its own canvas, which is appended and removed per effect run. Reusing a React-owned `<canvas ref>` is unsafe here: cleanup calls `forceContextLoss()`, and under React 19 StrictMode the remount would hand the effect back the dead context, leaving the component permanently black.

## Definition of done

On entering view the shell builds from the base upward over about two seconds and holds, then turns slowly. Density is even everywhere: the small finial and the large knot carry the same particles-per-square-millimetre, with no dense speckle on the small parts. Particles nearer the camera are visibly larger than those on the far side, and none of them pop out of existence as the cloud turns. The rings hug the silhouette — they widen where the form widens — and do not cut through the middle of it. Resize the container from wide to narrow: the shell stays fully in frame and particles keep the same apparent size rather than growing or shrinking. With reduced motion a fully assembled three-quarter view renders immediately and holds still.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
