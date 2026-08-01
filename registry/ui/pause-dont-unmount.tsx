'use client';

import { Activity, useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { cn } from '@/lib/cn';
import { useRaf } from '@/registry/hooks/use-raf';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';
import { useResizeObserver } from '@/registry/hooks/use-resize-observer';
import { createRng } from '@/registry/lib/prng';
import { disposeRenderer, hasWebGL, pixelRatio } from '@/registry/lib/webgl';

/* ==========================================================================
   Pause, Don't Unmount
   --------------------------------------------------------------------------
   A WebGL stack behind React 19's `<Activity>`, next to the same stack behind
   a plain conditional, so the difference is a switch rather than an argument.

   What `<Activity mode="hidden">` actually does, precisely: it applies
   `display: none`, it DESTROYS the Effects inside — cleanup functions run, so
   the WebGL context really is handed back — and it PRESERVES the fiber, which
   means the DOM and every `useState` and `useRef` value inside survive.
   Children keep re-rendering, at a lower priority than anything visible.

   So Activity is not a GPU pause. The renderer is rebuilt on re-show either
   way, and that is correct: a WebGL context is a scarce, process-wide
   resource — Chromium hands out about sixteen per renderer process — and
   holding one open behind `display: none` is exactly the leak that blanks
   every other canvas on the page.

   What Activity saves is everything React owns. The stack resumes at the
   rotation it was on, not at zero, because the phase lives in a ref on a
   fiber that was never destroyed. Under `unmount` the same ref is garbage and
   the scene starts over. Watch the two counters: `builds` climbs under
   Activity, because the Effect really did re-run, while the state that
   counted the builds survived to be incremented. Under `unmount` it is pinned
   at 1 forever, because there is nothing left to increment.
   ========================================================================== */

export type PauseStrategy = 'activity' | 'unmount';

export interface PauseDontUnmountProps {
  /** Which strategy the switch starts on. */
  strategy?: PauseStrategy;
  /** Slabs in the stack. */
  count?: number;
  /** Seconds for one full rotation. */
  period?: number;
  /** Colour of the bottom slab. Any value `THREE.Color` accepts. */
  color?: string;
  /** Colour of the top slab. The stack lerps between the two. */
  accent?: string;
  /** Seeds the per-slab size jitter. Same seed, same stack every reload. */
  seed?: number | string;
  className?: string;
}

const TAU = Math.PI * 2;

/** Camera vertical field of view, degrees. */
const FOV = 38;
/** Camera distance and height. Low enough to read the stack as a stack. */
const CAM_Z = 4.4;
const CAM_Y = 2.05;
/** Slab dimensions and vertical spacing, world units. */
const SLAB_W = 1.9;
const SLAB_H = 1.15;
const GAP = 0.2;
/** Rotation offset between neighbouring slabs, radians. */
const TWIST = 0.24;

interface Slab {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
}

interface Stage {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  slabs: Slab[];
  geometry: THREE.PlaneGeometry;
  resize: (width: number, height: number) => void;
}

export interface PauseStatus {
  /** Rotation of the stack in whole degrees. */
  phase: number;
  /** How many times the scene has been built on this fiber. */
  builds: number;
  /** Cost of the most recent build, milliseconds. */
  buildMs: number;
  /** Whether a scene is currently mounted at all. */
  live: boolean;
}

interface StackSceneProps {
  count: number;
  period: number;
  color: string;
  accent: string;
  seed: number | string;
  onStatus: (status: PauseStatus) => void;
}

/* --------------------------------------------------------------------------
   The subtree that gets hidden. Every piece of preserved state is in here —
   if it were lifted out to the parent, the comparison would prove nothing.
   -------------------------------------------------------------------------- */
function StackScene({ count, period, color, accent, seed, onStatus }: StackSceneProps) {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage | null>(null);
  const [unsupported, setUnsupported] = useState(false);

  // These three are the experiment. They live on this component's fiber, so
  // Activity keeps them and a conditional throws them away.
  const phase = useRef(0);
  const builds = useRef(0);
  const buildMs = useRef(0);

  const reported = useRef(-1);
  const dirty = useRef(true);

  const onStatusRef = useRef(onStatus);
  onStatusRef.current = onStatus;

  const reduced = useReducedMotion();
  const { width, height } = useResizeObserver(host);
  const ready = width > 0 && height > 0;

  const size = useRef({ width, height });
  size.current = { width, height };

  const report = useCallback((live: boolean) => {
    const degrees = Math.round((phase.current / TAU) * 360) % 360;
    reported.current = degrees;
    onStatusRef.current({
      phase: degrees,
      builds: builds.current,
      buildMs: buildMs.current,
      live,
    });
  }, []);

  // #region critical
  useEffect(() => {
    const el = host.current;
    if (!el || !ready) return;

    if (!hasWebGL()) {
      setUnsupported(true);
      return;
    }

    // Timed from here to the first completed draw: allocating the context,
    // linking the programs and uploading the geometry are what re-showing
    // actually costs, and the number is the honest counterweight to "Activity
    // makes hiding free".
    const t0 = performance.now();

    // The renderer makes its own canvas inside the effect. Two reasons, and
    // both bite here: StrictMode double-invokes this effect, so a React-owned
    // `<canvas ref>` would be handed back after `forceContextLoss()` killed
    // it; and Activity destroys and re-runs this effect on every show, which
    // is the same hazard once per toggle instead of once per mount.
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(pixelRatio());
    renderer.setClearAlpha(0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
    camera.position.set(0, CAM_Y, CAM_Z);
    camera.lookAt(0, 0, 0);

    const geometry = new THREE.PlaneGeometry(SLAB_W, SLAB_H);
    const rng = createRng(seed);
    const base = new THREE.Color(color);
    const tint = new THREE.Color(accent);

    const slabs: Slab[] = [];
    const span = Math.max(count - 1, 1);

    for (let i = 0; i < count; i += 1) {
      const t = i / span;
      const material = new THREE.MeshBasicMaterial({
        color: base.clone().lerp(tint, t),
        transparent: true,
        opacity: 0.34 + 0.46 * t,
        side: THREE.DoubleSide,
        // The slabs are flat and stacked along Y with nothing between them, so
        // the transparent pass sorted back to front is already correct. Writing
        // depth would let the upper slabs clip the lower ones they overhang.
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geometry, material);
      const k = 0.66 + rng() * 0.46;
      mesh.scale.set(k, k, 1);
      mesh.position.y = (i - span / 2) * GAP;
      scene.add(mesh);
      slabs.push({ mesh, material });
    }

    el.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';

    const resize = (w: number, h: number) => {
      renderer.setSize(w, h, false);
      camera.aspect = w / Math.max(h, 1);
      camera.updateProjectionMatrix();
      dirty.current = true;
    };
    resize(size.current.width, size.current.height);

    // Seed the scene from the PRESERVED phase before the first draw. Under
    // Activity this is wherever the stack was when it went away; under a
    // conditional the ref is new and this reads zero. Doing it before the
    // timed draw also means the resumed frame is correct on frame one, with
    // no snap from zero to the real angle.
    for (let i = 0; i < slabs.length; i += 1) {
      const slab = slabs[i];
      if (slab) slab.mesh.rotation.set(-Math.PI / 2, 0, phase.current + i * TWIST);
    }
    renderer.render(scene, camera);

    builds.current += 1;
    buildMs.current = performance.now() - t0;

    stage.current = { renderer, scene, camera, slabs, geometry, resize };
    report(true);

    return () => {
      stage.current = null;
      for (const slab of slabs) {
        scene.remove(slab.mesh);
        slab.material.dispose();
      }
      geometry.dispose();
      // Not optional. `dispose()` alone leaves the context alive and counting
      // against the per-process budget; only `forceContextLoss()`, which
      // `disposeRenderer` calls, actually gives it back. Every hide runs this.
      disposeRenderer(renderer);
      renderer.domElement.remove();
    };
  }, [ready, count, color, accent, seed, report]);
  // #endregion critical

  useEffect(() => {
    stage.current?.resize(width, height);
  }, [width, height]);

  // Report on unmount so the readout can say the scene is gone rather than
  // freezing on a stale row. Under Activity this runs on every hide too.
  useEffect(() => {
    return () => {
      onStatusRef.current({
        phase: reported.current < 0 ? 0 : reported.current,
        builds: builds.current,
        buildMs: buildMs.current,
        live: false,
      });
    };
  }, []);

  useRaf((dt) => {
    const s = stage.current;
    if (!s) return;

    if (!reduced) {
      phase.current = (phase.current + (TAU / period) * dt) % TAU;
      dirty.current = true;
    }

    for (let i = 0; i < s.slabs.length; i += 1) {
      const slab = s.slabs[i];
      if (!slab) continue;
      // Euler order XYZ composes as Rx * Ry * Rz, so Z is applied first, in
      // the plane's own space: the slab spins about its normal and is only
      // then laid flat. One `set` per slab, no quaternion allocation.
      slab.mesh.rotation.set(-Math.PI / 2, 0, phase.current + i * TWIST);
    }

    if (dirty.current) {
      dirty.current = false;
      s.renderer.render(s.scene, s.camera);
    }

    // Whole degrees only: reporting a float upward would re-render the parent
    // sixty times a second to change a digit nobody can read.
    const degrees = Math.round((phase.current / TAU) * 360) % 360;
    if (degrees !== reported.current) report(true);
  }, ready && !unsupported);

  return (
    <div ref={host} className="relative h-full w-full overflow-hidden">
      {unsupported ? (
        <div className="absolute inset-0 grid place-items-center">
          <div className="flex flex-col items-center gap-1">
            {Array.from({ length: 5 }, (_, i) => (
              <div
                key={i}
                className="h-4 w-24 rounded-sm border border-line"
                style={{ opacity: 0.3 + i * 0.14 }}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

const EMPTY: PauseStatus = { phase: 0, builds: 0, buildMs: 0, live: false };

export function PauseDontUnmount({
  strategy: initialStrategy = 'activity',
  count = 7,
  period = 24,
  color = '#5f6873',
  accent = '#e8e4dc',
  seed = 'pause-dont-unmount',
  className,
}: PauseDontUnmountProps) {
  const [strategy, setStrategy] = useState<PauseStrategy>(initialStrategy);
  const [shown, setShown] = useState(true);
  const [status, setStatus] = useState<PauseStatus>(EMPTY);

  const onStatus = useCallback((next: PauseStatus) => setStatus(next), []);

  // Flipping the switch swaps the element at this position, so React unmounts
  // whatever was there. Both arms therefore start from nothing — which is the
  // point: it is the hide/show button, not this one, that shows the difference.
  const pick = useCallback((next: PauseStrategy) => {
    setStrategy(next);
    setShown(true);
    setStatus(EMPTY);
  }, []);

  const scene = (
    <StackScene
      count={count}
      period={period}
      color={color}
      accent={accent}
      seed={seed}
      onStatus={onStatus}
    />
  );

  return (
    <div className={cn('relative flex h-full w-full flex-col bg-bg', className)}>
      <div className="relative min-h-0 flex-1">
        {strategy === 'activity' ? (
          // `mode` is the whole API. Hidden means display:none, Effects torn
          // down, fiber and DOM kept, children re-rendered at low priority.
          <Activity mode={shown ? 'visible' : 'hidden'}>{scene}</Activity>
        ) : shown ? (
          scene
        ) : null}

        {!shown ? (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-faint">
              {strategy === 'activity' ? 'hidden · fiber kept' : 'unmounted · fiber gone'}
            </p>
          </div>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-line px-3 py-2 font-mono text-[10px] uppercase tracking-[0.08em]">
        <button
          type="button"
          onClick={() => setShown((v) => !v)}
          className="rounded-sm border border-line-strong px-2 py-1 text-fg transition-colors hover:bg-surface"
        >
          {shown ? 'hide' : 'show'}
        </button>

        <div className="flex overflow-hidden rounded-sm border border-line">
          {(['activity', 'unmount'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => pick(option)}
              className={cn(
                'px-2 py-1 transition-colors',
                strategy === option ? 'bg-surface text-fg' : 'text-faint hover:text-muted',
              )}
            >
              {option}
            </button>
          ))}
        </div>

        <span className="ml-auto text-muted">
          <span className={status.builds > 1 ? 'text-accent' : undefined}>
            builds {status.builds}
          </span>
          <span className="mx-2 text-line-strong">/</span>
          <span>{status.buildMs > 0 ? `${status.buildMs.toFixed(0)} ms` : '— ms'}</span>
          <span className="mx-2 text-line-strong">/</span>
          <span className={status.live ? 'text-fg' : 'text-faint'}>
            {String(status.phase).padStart(3, '0')}&deg;
          </span>
        </span>
      </div>
    </div>
  );
}
