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
  ANTIALIASED_DISC_FRAG,
  ANTIALIASED_DISC_VERT,
} from '@/registry/shaders/antialiased-disc-fragment';

/* ==========================================================================
   Anti-Aliased Point Discs
   --------------------------------------------------------------------------
   `gl_PointSize` gives you a square. This is the pair of shader tricks that
   turns that square into a dot which looks the same on a 1x monitor and a 3x
   phone, with no MSAA and no texture:

     1. the fragment shader carves a disc out of the sprite with a smoothstep
        across the outer few percent of its radius, and discards the rest;
     2. the vertex shader clamps the point size to the hardware floor and then
        divides the alpha by the area that clamping invented.

   The field is a phyllotaxis spiral so that the size ramp is visible in one
   frame: sub-pixel dots at the core, twenty-pixel dots at the rim, both
   correct.
   ========================================================================== */

export interface AntialiasedDiscFragmentProps {
  /** Dot count. Cost is linear; 4000 is comfortable on integrated graphics. */
  count?: number;
  /** Disc radius in CSS pixels at the centre of the field. */
  minRadius?: number;
  /** Disc radius in CSS pixels at the rim. */
  maxRadius?: number;
  /** Field diameter as a fraction of the container's short side. */
  fieldRadius?: number;
  /** Base angular speed in radians per second. The rim runs faster. */
  spin?: number;
  /**
   * Width of the anti-aliased band as a fraction of the sprite radius.
   * 0.07 is the smallest value that still reads as round at 2px.
   */
  softness?: number;
  opacity?: number;
  /** Tint at the centre of the field. */
  colorInner?: string;
  /** Tint at the rim. */
  colorOuter?: string;
  seed?: number | string;
  className?: string;
}

interface Uniforms {
  /** three types `uniforms` as an open record; without this the object is not assignable. */
  [name: string]: THREE.IUniform;
  uElapsed: { value: number };
  uExtent: { value: number };
  uPixelRatio: { value: number };
  uSpin: { value: number };
  uFieldRadius: { value: number };
  uMinRadius: { value: number };
  uMaxRadius: { value: number };
  uOpacity: { value: number };
  uColorInner: { value: THREE.Color };
  uColorOuter: { value: THREE.Color };
  uEdgeInner: { value: number };
}

interface Stage {
  resize: (width: number, height: number) => void;
  draw: (elapsed: number) => void;
}

/** 137.507…°, the angle that makes a phyllotaxis spiral pack evenly. */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/** Frame drawn when motion is suppressed. Non-zero so the arms are sheared. */
const STATIC_ELAPSED = 6;

// #region critical
export function AntialiasedDiscFragment({
  count = 4000,
  minRadius = 0.5,
  maxRadius = 10,
  fieldRadius = 0.92,
  spin = 0.08,
  softness = 0.07,
  opacity = 1,
  colorInner = '#ffffff',
  colorOuter = '#6f7680',
  seed = 'antialiased-disc-fragment',
  className,
}: AntialiasedDiscFragmentProps) {
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

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    renderer.setPixelRatio(pixelRatio());
    renderer.setClearAlpha(0);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;

    const rng = createRng(seed);
    const positions = new Float32Array(count * 3); // all zeros; the shader places them
    const disc = new Float32Array(count * 2);

    for (let i = 0; i < count; i += 1) {
      // sqrt spacing, not linear: linear spacing crowds the centre, which is
      // exactly where the sub-pixel dots are and where crowding is least
      // forgiving.
      const t = Math.sqrt((i + 0.5) / count);
      // A little seeded angular jitter breaks the moiré that a pure golden
      // spiral shows at small radii on a low-DPR screen.
      disc[i * 2] = t;
      disc[i * 2 + 1] = i * GOLDEN_ANGLE + (rng() - 0.5) * 0.12;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aDisc', new THREE.BufferAttribute(disc, 2));

    const uniforms: Uniforms = {
      uElapsed: { value: 0 },
      uExtent: { value: 1 },
      uPixelRatio: { value: renderer.getPixelRatio() },
      uSpin: { value: spin },
      uFieldRadius: { value: fieldRadius },
      uMinRadius: { value: minRadius },
      uMaxRadius: { value: maxRadius },
      uOpacity: { value: opacity },
      uColorInner: { value: new THREE.Color(colorInner) },
      uColorOuter: { value: new THREE.Color(colorOuter) },
      // The band always ENDS at 0.5 — the sprite's own edge. Softening inward
      // keeps the disc inscribed in the sprite; softening outward would clip
      // the falloff square at the corners.
      uEdgeInner: { value: 0.5 - softness },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: ANTIALIASED_DISC_VERT,
      fragmentShader: ANTIALIASED_DISC_FRAG,
      uniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      // Additive would blow the overlapping core to white. Normal blending
      // with a discard keeps the density readable where the dots overlap.
      blending: THREE.NormalBlending,
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
      uniforms.uExtent.value = Math.min(w, h);
      // Re-read rather than assume: moving a window between a retina and a
      // non-retina display changes devicePixelRatio without changing the
      // canvas size, and a stale value breaks the whole compensation.
      uniforms.uPixelRatio.value = renderer.getPixelRatio();
    };

    const draw = (elapsed: number) => {
      uniforms.uElapsed.value = elapsed;
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
    count,
    minRadius,
    maxRadius,
    fieldRadius,
    spin,
    softness,
    opacity,
    colorInner,
    colorOuter,
    seed,
  ]);

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
          <div
            className="aspect-square h-[80%] rounded-full border border-line"
            style={{
              background:
                'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.16), rgba(255,255,255,0.02) 60%, transparent 72%)',
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
