'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { cn } from '@/lib/cn';
import { useInView } from '@/registry/hooks/use-in-view';
import { useRaf } from '@/registry/hooks/use-raf';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';
import { useResizeObserver } from '@/registry/hooks/use-resize-observer';
import { useVisibility } from '@/registry/hooks/use-visibility';
import { damp } from '@/registry/lib/damp';
import { createRng, type Rng } from '@/registry/lib/prng';
import { disposeObject, disposeRenderer, hasWebGL, pixelRatio } from '@/registry/lib/webgl';
import {
  SURFACE_SAMPLED_PARTICLES_FRAG,
  SURFACE_SAMPLED_PARTICLES_VERT,
} from '@/registry/shaders/surface-sampled-particles';

/* ==========================================================================
   Area-Weighted Surface Particles
   --------------------------------------------------------------------------
   Turn any mesh — one primitive or a whole loaded model — into a particle
   shell whose density is uniform over the SURFACE rather than over the mesh
   list. The naive version, "sample count / meshCount points from each mesh",
   gives a model whose parts differ in size a dense speckle on the small parts
   and a sparse haze on the large ones, and no amount of tuning fixes it
   because the error is structural.

   The fix is one cumulative distribution over the world-space area of every
   triangle in the object, sampled by binary search. A triangle a thousand
   times larger than its neighbour is picked a thousand times more often, so
   per-mesh weighting falls out for free.

   Two things then depend on having sampled properly:

     - the shell breathes along its own sampled NORMALS, which is only
       coherent if the normals came off the surface;
     - the orbit rings are sized by measuring the sampled cloud's radius in
       horizontal bands, so they hug the silhouette of whatever was sampled
       instead of being hard-coded per model.
   ========================================================================== */

export interface SurfaceSampledParticlesProps {
  /**
   * Builds the object to sample. Called once per rebuild; the returned object
   * is measured on the CPU, never added to the scene, and disposed as soon as
   * sampling finishes. Return `null` to fall back to the built-in specimen.
   *
   * Held in a ref and deliberately NOT an effect dependency — an inline arrow
   * changes identity on every parent render and would re-sample the whole
   * cloud each time. Change `seed` or `count` to force a rebuild.
   */
  source?: () => THREE.Object3D | null;
  /** Particle count. One buffer, one draw call, cost is linear. */
  count?: number;
  /** Particle diameter in CSS pixels for a particle at the centre of the shell. */
  size?: number;
  /** Ceiling on the perspective-grown size, in CSS pixels. */
  maxSize?: number;
  /** Turntable speed in radians per second. */
  spin?: number;
  /** Breathing amplitude along the sampled normal, as a fraction of the shell radius. */
  puff?: number;
  /** How far the pre-assembly cloud spreads, in shell radii. */
  scatter?: number;
  /** Horizontal bands to measure orbit rings from. 0 disables the rings. */
  ringCount?: number;
  /** Ring opacity once the shell has assembled. */
  ringOpacity?: number;
  /** Overall alpha multiplier applied in the vertex shader. */
  opacity?: number;
  /** Tint at the base of the shell. */
  colorBase?: string;
  /** Tint at the top of the shell. */
  colorTip?: string;
  /** Ring colour. */
  ringColor?: string;
  /** Vertical field of view in degrees. Camera distance is derived from it. */
  fov?: number;
  seed?: number | string;
  className?: string;
}

interface Uniforms {
  /** three types `uniforms` as an open record; without this the object is not assignable. */
  [name: string]: THREE.IUniform;
  uElapsed: { value: number };
  uForm: { value: number };
  uScatter: { value: number };
  uPuff: { value: number };
  uSize: { value: number };
  /** Device pixels, because `gl_PointSize` is. */
  uMaxSize: { value: number };
  /** `pixelRatio * cameraDistance` — see the vertex shader. */
  uSizeScale: { value: number };
  uOpacity: { value: number };
  uColorBase: { value: THREE.Color };
  uColorTip: { value: THREE.Color };
}

interface Stage {
  resize: (width: number, height: number) => void;
  step: (dt: number, elapsed: number) => void;
  still: () => void;
}

interface Shell {
  positions: Float32Array;
  normals: Float32Array;
  rands: Float32Array;
  orders: Float32Array;
  minY: number;
  maxY: number;
}

interface Ring {
  y: number;
  radius: number;
}

/** Vertices per ring. 128 is where a 1px circle stops showing flats at 600px wide. */
const RING_SEGMENTS = 128;
/** Rings float just outside the silhouette rather than cutting through it. */
const RING_MARGIN = 1.06;
/** A band this empty is a gap in the model; a ring there would hang in air. */
const MIN_BAND_SAMPLES = 12;
/** Below this a ring is a dot, not a ring. */
const MIN_RING_RADIUS = 0.08;
/**
 * Radius percentile per band. The maximum would be dragged out by a single
 * stray sample on a spike; the mean would sink inside the silhouette.
 */
const RING_PERCENTILE = 0.92;

/** Fraction of the assembly gap left after one second. ~2s to build. */
const FORM_SMOOTHING = 0.05;
/** Past this, snap: `damp` is asymptotic and the last stagger window needs 1.0. */
const FORM_EPSILON = 0.9995;

/** Fitted radius of the normalised shell. Everything else is in these units. */
const SHELL_RADIUS = 1;
/** Slack between the shell and the frustum, for the breathing and the rings. */
const FIT_PADDING = 1.14;
/** Static tilt, so the rings read as ellipses rather than as lines. */
const TILT = 0.2;

/** Turntable angle for the reduced-motion still: a three-quarter view. */
const STATIC_ANGLE = 0.6;
/** `uElapsed` for the still. The breathing phase is per-particle anyway. */
const STATIC_ELAPSED = 0;

/**
 * The built-in specimen, used when no `source` is given. Four primitives with
 * deliberately mismatched surface areas — the knot has roughly two orders of
 * magnitude more area than the finial — because that is the case area
 * weighting exists to handle.
 */
function buildDefaultSpecimen(): THREE.Object3D {
  const root = new THREE.Group();

  const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(0.62, 0.19, 200, 28, 2, 3));
  knot.position.y = 0.42;
  root.add(knot);

  const finial = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 1));
  finial.position.y = 1.24;
  root.add(finial);

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, 0.62, 24, 1, true));
  stem.position.y = -0.36;
  root.add(stem);

  // A lathe profile rather than a cylinder: the flare gives the measured rings
  // something to widen against near the base.
  const profile: THREE.Vector2[] = [];
  for (let i = 0; i <= 12; i += 1) {
    const t = i / 12;
    profile.push(new THREE.Vector2(0.12 + Math.pow(t, 2.4) * 0.46, -0.66 - t * 0.28));
  }
  root.add(new THREE.Mesh(new THREE.LatheGeometry(profile, 48)));

  return root;
}

/** First index whose cumulative value is >= `target`. */
function lowerBound(cumulative: Float64Array, length: number, target: number): number {
  let lo = 0;
  let hi = length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((cumulative[mid] ?? 0) < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

// #region critical
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
  // Mirrored into a ref for the same reason `source` is: the build effect below
  // has to know whether to hand back a still frame or a live one, but making
  // `reduced` a dependency of it would re-sample the entire surface and rebuild
  // the WebGL context every time the OS setting is toggled. The ref is read,
  // never depended on.
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;

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
    // The first frame a reduced-motion visitor gets has to be the still one.
    // `render()` draws whatever `form` happens to be, and `form` starts at 0 —
    // the fully scattered cloud, with the rings at `ringOpacity * 0`, i.e.
    // invisible — while `useRaf` below is disabled under reduced motion, so
    // that first frame would also be the last one they ever see. The resize
    // effect further down does call `still()`, but only when the observed size
    // or `reduced` itself changes; every rebuild driven by this effect's own
    // dependencies (a new `count`, a different colour, a new `seed`) happens at
    // a size that has not moved, so nothing reaches it and the shell silently
    // stops assembling.
    if (reducedRef.current) still();
    else render();

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
  //
  // `reduced` is a dependency, not an accident. It covers the two cases the
  // build effect cannot: the OS setting being switched to `reduce` mid-session
  // — `useReducedMotion` subscribes to the media query, so this really does
  // change after mount — and a resize while it is on, where the refit above
  // moves the camera but nothing would otherwise draw a frame through it.
  // `still()` only assigns fixed values and renders once, so running it again
  // when it is already the current frame costs a draw and changes nothing.
  useEffect(() => {
    stage.current?.resize(width, height);
    if (reduced) stage.current?.still();
  }, [width, height, reduced]);

  useRaf(
    (dt, elapsed) => stage.current?.step(dt, elapsed),
    ready && inView && visible && !reduced && !unsupported,
  );
  // #endregion critical

  return (
    <div ref={host} className={cn('relative h-full w-full overflow-hidden', className)}>
      {unsupported ? (
        <div className="absolute inset-0 grid place-items-center">
          <div className="relative aspect-square h-[72%]">
            <div
              className="absolute inset-[14%] rounded-full"
              style={{
                background:
                  'radial-gradient(circle at 50% 42%, rgba(255,255,255,0.18), rgba(255,255,255,0.03) 58%, transparent 74%)',
              }}
            />
            {[0.42, 0.68, 0.92].map((scale, i) => (
              <div
                key={scale}
                className="absolute rounded-[50%] border border-line"
                style={{
                  left: `${(1 - scale) * 50}%`,
                  right: `${(1 - scale) * 50}%`,
                  top: `${28 + i * 22}%`,
                  height: `${scale * 22}%`,
                }}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
