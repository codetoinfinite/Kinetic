'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import * as THREE from 'three';
import { cn } from '@/lib/cn';
import { useRaf } from '@/registry/hooks/use-raf';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';
import { useResizeObserver } from '@/registry/hooks/use-resize-observer';
import { damp } from '@/registry/lib/damp';
import { createRng } from '@/registry/lib/prng';
import { disposeRenderer, hasWebGL, pixelRatio } from '@/registry/lib/webgl';
import {
  ANALYTIC_DISC_PICKING_FRAG,
  ANALYTIC_DISC_PICKING_VERT,
} from '@/registry/shaders/analytic-disc-picking';

/* ==========================================================================
   Analytic Disc Picking
   --------------------------------------------------------------------------
   A ring of camera-facing discs, hit-tested without a raycaster.

   `THREE.Raycaster` walks the scene, builds an inverse world matrix per
   object, transforms the ray into object space, and intersects it against
   every triangle. For a flat disc facing the camera all of that is answering
   a question you can answer in four arithmetic operations: the disc lies in a
   plane whose normal is the camera's view direction, so intersect the pointer
   ray with that plane and ask whether the hit landed within `radius` of the
   centre. One dot product, one divide, one squared-distance compare. No
   allocation, no traversal, and EXACT — not an approximation of the disc's
   screen footprint, but the same circle the shader rasterises.

   It is also the only correct approach here. The billboard happens in the
   vertex shader, so the mesh's rotation never reaches the geometry: the
   `BufferGeometry` in main memory is a square lying in world XY. A raycast
   intersects that square and answers about a shape nobody can see. Turn on
   `compare` and watch the two disagree.
   ========================================================================== */

export interface AnalyticDiscPickingProps {
  /** Discs around the ring. */
  count?: number;
  /** Seconds for one revolution. */
  period?: number;
  /** Disc radius in world units. Also the pick radius — they cannot drift. */
  discRadius?: number;
  /** Ring radius in world units. */
  ringRadius?: number;
  /** Base plate colour. Any value `THREE.Color` accepts. */
  color?: string;
  /** Colour of the picked disc. */
  accent?: string;
  /** Seed for the per-disc plate pattern. Same seed, same ring every reload. */
  seed?: number | string;
  /**
   * Also run a real `Raycaster` each frame and report what it thinks was hit.
   * Off by default because it costs an `intersectObjects` traversal per frame;
   * on, it is the proof that the raycaster is wrong about a shader billboard.
   */
  compare?: boolean;
  /** Fired when a disc is clicked, with its index. */
  onPick?: (index: number) => void;
  className?: string;
}

const TAU = Math.PI * 2;

/** Camera vertical field of view, degrees. */
const FOV = 42;
/** Camera distance from the ring centre, world units. */
const CAM_Z = 5.6;
/** Camera height. Enough lean to see the ring as a ring, not a row. */
const CAM_Y = 0.75;
/** Amplitude of the vertical wave the discs ride, world units. */
const WAVE = 0.34;
/** Fraction of the hover gap left after one second. See `damp`. */
const HOVER_SMOOTHING = 0.0006;
/** How much a hovered disc grows. The pick radius grows with it. */
const HOVER_GROWTH = 0.14;

interface DiscUniforms {
  /** three types `uniforms` as an open record; without this it is not assignable. */
  [name: string]: THREE.IUniform;
  uRadius: { value: number };
  uScale: { value: number };
  uColor: { value: THREE.Color };
  uAccent: { value: THREE.Color };
  uHover: { value: number };
  uPicked: { value: number };
  uSeed: { value: number };
  uDepth: { value: number };
}

interface Disc {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
  uniforms: DiscUniforms;
  /** Ring phase at t = 0, radians. */
  phase: number;
  /** Eased hover weight, 0..1. Drives both the tint and the pick radius. */
  hover: number;
}

interface Stage {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  discs: Disc[];
  geometry: THREE.PlaneGeometry;
  /** Scratch, reused every frame. Allocating in a pick loop is the whole bug. */
  raycaster: THREE.Raycaster;
  plane: THREE.Plane;
  hit: THREE.Vector3;
  viewDir: THREE.Vector3;
  ndc: THREE.Vector2;
  meshes: THREE.Mesh[];
  intersects: THREE.Intersection[];
  resize: (width: number, height: number) => void;
}

export function AnalyticDiscPicking({
  count = 13,
  period = 30,
  discRadius = 0.46,
  ringRadius = 2.15,
  color = '#7d848e',
  accent = '#e8e4dc',
  seed = 'analytic-disc-picking',
  compare = false,
  onPick,
  className,
}: AnalyticDiscPickingProps) {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage | null>(null);
  const [unsupported, setUnsupported] = useState(false);

  /** Pointer in NDC. Null once it leaves — a pick must not survive the exit. */
  const pointer = useRef<{ x: number; y: number } | null>(null);
  /** Ring phase in radians, integrated rather than read off a wall clock. */
  const spin = useRef(0);
  const hovered = useRef(-1);
  const pickedRef = useRef(-1);
  /** Redraw request. With reduced motion nothing is drawn until this is set. */
  const dirty = useRef(true);

  const [hover, setHover] = useState(-1);
  const [picked, setPicked] = useState(-1);
  const [ghost, setGhost] = useState(-1);

  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  const reduced = useReducedMotion();
  const { width, height } = useResizeObserver(host);
  const ready = width > 0 && height > 0;

  const size = useRef({ width, height });
  size.current = { width, height };

  useEffect(() => {
    const el = host.current;
    if (!el || !ready) return;

    if (!hasWebGL()) {
      setUnsupported(true);
      return;
    }

    // The renderer makes its own canvas and this effect owns it start to
    // finish. A React-rendered `<canvas ref>` cannot be used: StrictMode
    // double-invokes the effect, the first cleanup calls `forceContextLoss()`,
    // and the second run is handed the same, now permanently dead, element.
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
    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
    camera.position.set(0, CAM_Y, CAM_Z);
    camera.lookAt(0, 0, 0);

    // One geometry for every disc. It is a SQUARE — the fragment shader carves
    // the circle out of it — which is two triangles instead of a 32-segment
    // fan and gives an analytically anti-aliased rim.
    const geometry = new THREE.PlaneGeometry(discRadius * 2, discRadius * 2);

    const rng = createRng(seed);
    const base = new THREE.Color(color);
    const tint = new THREE.Color(accent);

    const discs: Disc[] = [];
    const meshes: THREE.Mesh[] = [];

    for (let i = 0; i < count; i += 1) {
      const uniforms: DiscUniforms = {
        uRadius: { value: discRadius },
        uScale: { value: 1 },
        uColor: { value: base.clone() },
        uAccent: { value: tint.clone() },
        uHover: { value: 0 },
        uPicked: { value: 0 },
        uSeed: { value: rng() },
        uDepth: { value: 1 },
      };

      const material = new THREE.ShaderMaterial({
        vertexShader: ANALYTIC_DISC_PICKING_VERT,
        fragmentShader: ANALYTIC_DISC_PICKING_FRAG,
        uniforms,
        transparent: true,
        // Painter's algorithm. three sorts the transparent pass back to front
        // by object distance, and the object's POSITION is untouched by the
        // billboard, so that sort is exactly right. Depth testing a set of
        // discard-shaped quads would punch holes in the rim anti-aliasing.
        depthTest: false,
        depthWrite: false,
      });

      const mesh = new THREE.Mesh(geometry, material);
      // Never culled: the frustum test uses the geometry's bounding sphere at
      // the mesh's transform, and the shader moves the vertices somewhere the
      // culler cannot see.
      mesh.frustumCulled = false;
      scene.add(mesh);

      discs.push({ mesh, material, uniforms, phase: (i / count) * TAU, hover: 0 });
      meshes.push(mesh);
    }

    el.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';

    const resize = (w: number, h: number) => {
      renderer.setSize(w, h, false);
      camera.aspect = w / Math.max(h, 1);
      camera.updateProjectionMatrix();
      // `setFromCamera` reads `matrixWorld`, and nothing else in this component
      // renders before the first pick can happen.
      camera.updateMatrixWorld();
      dirty.current = true;
    };

    resize(size.current.width, size.current.height);

    stage.current = {
      renderer,
      scene,
      camera,
      discs,
      geometry,
      raycaster: new THREE.Raycaster(),
      plane: new THREE.Plane(),
      hit: new THREE.Vector3(),
      viewDir: new THREE.Vector3(),
      ndc: new THREE.Vector2(),
      meshes,
      intersects: [],
      resize,
    };

    return () => {
      stage.current = null;
      for (const disc of discs) {
        scene.remove(disc.mesh);
        disc.material.dispose();
      }
      // One shared geometry, disposed once. Order matters: release GPU objects
      // while the context is still alive, then hand the context back.
      geometry.dispose();
      disposeRenderer(renderer);
      renderer.domElement.remove();
    };
    // `ringRadius` is deliberately absent: the build above never reads it. It
    // is applied per frame in the rAF below, so listing it here bought nothing
    // and cost a full teardown — thirteen materials, the geometry, and the
    // WebGL context itself — on every change. Bound to a slider that is one
    // context per input event, and browsers cap live contexts at around
    // sixteen before they start killing the oldest.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, count, discRadius, color, accent, seed]);

  // Resize is its own effect: a container reflow costs a `setSize` call rather
  // than a teardown and rebuild of thirteen materials.
  useEffect(() => {
    stage.current?.resize(width, height);
  }, [width, height]);

  // The rAF repositions the discs from `ringRadius` every frame but only
  // *paints* when something marked the frame dirty, and under reduced motion
  // nothing does — the spin that would normally set it is frozen. Marking it
  // here is what makes a radius change visible without waiting for a pointer
  // move. The rebuild used to cover this by accident.
  useEffect(() => {
    dirty.current = true;
  }, [ringRadius]);

  const readPointer = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const el = host.current;
    if (!el) return;
    // One rect read per pointer event. NDC is what `setFromCamera` wants:
    // x right-positive, y UP-positive, both in [-1, 1].
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    pointer.current = {
      x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
      y: -(((e.clientY - rect.top) / rect.height) * 2 - 1),
    };
    dirty.current = true;
  }, []);

  const clearPointer = useCallback(() => {
    pointer.current = null;
    dirty.current = true;
  }, []);

  // #region critical
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
  // #endregion critical

  const commitPick = useCallback(() => {
    const next = hovered.current;
    pickedRef.current = next;
    setPicked(next);
    dirty.current = true;
    if (next >= 0) onPickRef.current?.(next);
  }, []);

  return (
    <div
      ref={host}
      className={cn(
        'relative h-full w-full select-none overflow-hidden',
        hover >= 0 ? 'cursor-pointer' : 'cursor-default',
        className,
      )}
      onPointerMove={readPointer}
      onPointerDown={readPointer}
      onPointerLeave={clearPointer}
      onClick={commitPick}
    >
      {unsupported ? (
        <div className="absolute inset-0 grid place-items-center">
          <div className="flex items-center gap-2">
            {Array.from({ length: 5 }, (_, i) => (
              <div
                key={i}
                className="h-8 w-8 rounded-full border border-line"
                style={{ opacity: 0.25 + i * 0.15 }}
              />
            ))}
          </div>
        </div>
      ) : null}

      <div className="pointer-events-none absolute bottom-3 left-3 font-mono text-[10px] uppercase tracking-[0.08em] text-faint">
        <span className={hover >= 0 ? 'text-fg' : undefined}>
          {hover >= 0 ? `plane hit ${String(hover).padStart(2, '0')}` : 'plane no hit'}
        </span>
        {compare ? (
          <>
            <span className="mx-2 text-line-strong">/</span>
            <span className={ghost >= 0 ? 'text-fg' : undefined}>
              {ghost >= 0 ? `raycast ${String(ghost).padStart(2, '0')}` : 'raycast no hit'}
            </span>
          </>
        ) : null}
        <span className="mx-2 text-line-strong">/</span>
        <span className={picked >= 0 ? 'text-accent' : undefined}>
          {picked >= 0 ? `picked ${String(picked).padStart(2, '0')}` : 'nothing picked'}
        </span>
      </div>
    </div>
  );
}
