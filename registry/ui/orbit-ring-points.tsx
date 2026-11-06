'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { cn } from '@/lib/cn';
import { useRaf } from '@/registry/hooks/use-raf';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';
import { useResizeObserver } from '@/registry/hooks/use-resize-observer';
import { createRng } from '@/registry/lib/prng';
import { disposeObject, disposeRenderer, hasWebGL, pixelRatio } from '@/registry/lib/webgl';
import {
  ORBIT_RING_POINTS_FRAG,
  ORBIT_RING_POINTS_VERT,
} from '@/registry/shaders/orbit-ring-points';

/* ==========================================================================
   Single-Draw Orbit Rings
   --------------------------------------------------------------------------
   Concentric rings of dots, each ring carrying one bright marker travelling
   it. Every dot in the system — static or orbiting, any ring — is a vertex of
   one `THREE.Points`, so the whole structure is a single draw call no matter
   how many rings you ask for.

   The trick is that `position` carries no information. It is zeroed for every
   vertex; a packed `vec4` attribute says which ring a dot belongs to, at what
   angle, whether it is a path dot or a marker, and how big it is. The vertex
   shader does the rest.
   ========================================================================== */

export interface OrbitRingPointsProps {
  /** Number of concentric rings. Each gets its own marker. */
  ringCount?: number;
  /** Static path dots per ring. */
  dotsPerRing?: number;
  /** Marker angular speed, radians per second. */
  speed?: number;
  /** Outermost ring diameter as a fraction of the container's short side. */
  baseRadius?: number;
  /** Path dot radius in CSS pixels. */
  dotRadius?: number;
  /** Marker radius in CSS pixels. */
  markerRadius?: number;
  /** Overall opacity multiplier applied in the vertex shader. */
  opacity?: number;
  /** Path dot colour. Any value `THREE.Color` accepts. */
  color?: string;
  /** Marker colour. */
  markerColor?: string;
  /** Seed for the angular scatter. Same seed, same ring every reload. */
  seed?: number | string;
  className?: string;
}

interface Uniforms {
  /** three types `uniforms` as an open record; without this the object is not assignable. */
  [name: string]: THREE.IUniform;
  uElapsed: { value: number };
  uExtent: { value: number };
  uPixelRatio: { value: number };
  uOpacity: { value: number };
  uRingCount: { value: number };
  uSpeed: { value: number };
  uBaseRadius: { value: number };
  uColor: { value: THREE.Color };
  uMarkerColor: { value: THREE.Color };
}

interface Stage {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  uniforms: Uniforms;
  resize: (width: number, height: number) => void;
  draw: (elapsed: number) => void;
}

/** Marker angle when motion is suppressed: twelve o'clock, cycle not started. */
const STATIC_ELAPSED = 0;

// #region critical
export function OrbitRingPoints({
  ringCount = 5,
  dotsPerRing = 170,
  speed = 0.3,
  baseRadius = 0.75,
  dotRadius = 1,
  markerRadius = 3,
  opacity = 1,
  color = '#8a8f98',
  markerColor = '#ffffff',
  seed = 'orbit-ring-points',
  className,
}: OrbitRingPointsProps) {
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

    // `antialias: false` is deliberate: the fragment shader anti-aliases each
    // disc itself with a smoothstep, so MSAA would pay for a whole extra
    // sample buffer to solve a problem that is already solved.
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
    // Orthographic and 1:1 with CSS pixels, so `gl_PointSize` in the shader is
    // a real pixel count and the ring radii are real pixel radii.
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;

    const rng = createRng(seed);
    const perRing = dotsPerRing + 1; // path dots + one marker
    const total = ringCount * perRing;

    const positions = new Float32Array(total * 3); // stays all zeros
    const pointData = new Float32Array(total * 4);

    let at = 0;
    for (let ring = 0; ring < ringCount; ring += 1) {
      // Sorting the angles is not cosmetic. Points are drawn in buffer order,
      // and an unsorted ring interleaves near and far dots so the alpha blend
      // stipples along the path instead of reading as one continuous line.
      const angles = new Float32Array(dotsPerRing);
      for (let i = 0; i < dotsPerRing; i += 1) angles[i] = rng() * Math.PI * 2;
      angles.sort();

      for (let i = 0; i < dotsPerRing; i += 1) {
        pointData[at] = 0;
        pointData[at + 1] = ring;
        pointData[at + 2] = angles[i] ?? 0;
        pointData[at + 3] = dotRadius;
        at += 4;
      }

      pointData[at] = 1;
      pointData[at + 1] = ring;
      pointData[at + 2] = rng() * Math.PI * 2;
      pointData[at + 3] = markerRadius;
      at += 4;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aPointData', new THREE.BufferAttribute(pointData, 4));

    const uniforms: Uniforms = {
      uElapsed: { value: 0 },
      uExtent: { value: 1 },
      uPixelRatio: { value: renderer.getPixelRatio() },
      uOpacity: { value: opacity },
      uRingCount: { value: ringCount },
      uSpeed: { value: speed },
      uBaseRadius: { value: baseRadius },
      uColor: { value: new THREE.Color(color) },
      uMarkerColor: { value: new THREE.Color(markerColor) },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: ORBIT_RING_POINTS_VERT,
      fragmentShader: ORBIT_RING_POINTS_FRAG,
      uniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    const points = new THREE.Points(geometry, material);
    // Every vertex sits at the origin, so three computes a bounding sphere of
    // radius zero and culls the entire object the moment the camera is not
    // looking straight at (0,0,0). Displacement happens in the shader, which
    // the culler cannot see.
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
      // Ring radii scale off the SHORT side. Off the height alone, a wide
      // preview leaves the rings floating in a sea of empty space; off the
      // width alone, a tall one clips them.
      uniforms.uExtent.value = Math.min(w, h);
      uniforms.uPixelRatio.value = renderer.getPixelRatio();
    };

    const draw = (elapsed: number) => {
      uniforms.uElapsed.value = elapsed;
      renderer.render(scene, camera);
    };

    resize(size.current.width, size.current.height);
    stage.current = { renderer, scene, camera, uniforms, resize, draw };
    draw(STATIC_ELAPSED);

    return () => {
      stage.current = null;
      // Order matters: release the scene graph's GPU objects while the
      // context is still alive, then hand the context back.
      disposeObject(scene);
      material.dispose();
      disposeRenderer(renderer);
      renderer.domElement.remove();
    };
  }, [
    ready,
    ringCount,
    dotsPerRing,
    speed,
    baseRadius,
    dotRadius,
    markerRadius,
    opacity,
    color,
    markerColor,
    seed,
  ]);

  // Resize is its own effect so a container reflow costs a `setSize` call
  // rather than a full teardown and rebuild of the buffer.
  useEffect(() => {
    stage.current?.resize(width, height);
    if (reduced) stage.current?.draw(STATIC_ELAPSED);
  }, [width, height, reduced]);

  useRaf((_dt, elapsed) => stage.current?.draw(elapsed), ready && !reduced && !unsupported);
  // #endregion critical

  return (
    <div ref={host} className={cn('relative h-full w-full overflow-hidden', className)}>
      {unsupported ? (
        <div className="absolute inset-0 grid place-items-center">
          <div className="relative aspect-square h-[75%]">
            {Array.from({ length: ringCount }, (_, i) => {
              const scale = 1 - (ringCount - 1 - i) * 0.1;
              return (
                <div
                  key={i}
                  className="absolute rounded-full border border-line"
                  style={{
                    inset: `${(1 - scale) * 50}%`,
                    opacity: 0.2 + 0.6 * (1 - (ringCount - 1 - i) / ringCount),
                  }}
                />
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
