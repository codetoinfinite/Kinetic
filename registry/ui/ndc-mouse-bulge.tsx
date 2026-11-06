'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { cn } from '@/lib/cn';
import { useInView } from '@/registry/hooks/use-in-view';
import { useRaf } from '@/registry/hooks/use-raf';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';
import { useResizeObserver } from '@/registry/hooks/use-resize-observer';
import { useSmoothPointer } from '@/registry/hooks/use-smooth-pointer';
import { useVisibility } from '@/registry/hooks/use-visibility';
import { damp } from '@/registry/lib/damp';
import {
  disposeObject,
  disposeRenderer,
  hasWebGL,
  pixelRatio,
} from '@/registry/lib/webgl';
import {
  ndcMouseBulgeFragmentShader,
  ndcMouseBulgeVertexShader,
} from '@/registry/shaders/ndc-mouse-bulge';

/* ==========================================================================
   In-Shader Mouse Bulge
   --------------------------------------------------------------------------
   A soft lens that follows the cursor across a textured plane, with no
   raycaster, no picking buffer and no CPU geometry work at all.

   The pointer arrives in normalised device coordinates and stays there. Each
   vertex projects itself once to find out where it is on screen, compares
   that against the pointer, and displaces itself by the result.
   ========================================================================== */

export interface NdcMouseBulgeProps {
  /** Peak displacement weight. 0 disables the effect. */
  strength?: number;
  /** Gaussian tightness. Higher is a smaller, sharper lens. */
  falloff?: number;
  /** World units the crown of the bulge rises toward the camera. */
  lift?: number;
  /** How far the lens magnifies at the crown, in UV units. */
  magnify?: number;
  /** Extra brightness at the crown. */
  sheen?: number;
  /** Plane subdivisions per axis. The bulge is per-vertex, so this is its resolution. */
  segments?: number;
  /** Draw the surface. Default paints a ruled hue field. */
  paint?: (
    ctx: CanvasRenderingContext2D,
    size: { width: number; height: number },
  ) => void;
  className?: string;
}

const CAMERA_FOV = 45;
const CAMERA_Z = 3;
const TEXTURE_SIZE = 1024;
const STRENGTH_SMOOTHING = 0.0008;

interface BulgeUniforms {
  [name: string]: THREE.IUniform;
  uTexture: THREE.IUniform<THREE.Texture | null>;
  uMouseNdc: THREE.IUniform<THREE.Vector2>;
  uAspect: THREE.IUniform<number>;
  uStrength: THREE.IUniform<number>;
  uFalloff: THREE.IUniform<number>;
  uLift: THREE.IUniform<number>;
  uMagnify: THREE.IUniform<number>;
  uSheen: THREE.IUniform<number>;
}

interface Stage {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  mesh: THREE.Mesh;
  geometry: THREE.PlaneGeometry;
  material: THREE.ShaderMaterial;
  texture: THREE.CanvasTexture;
  uniforms: BulgeUniforms;
}

function paintSurface(
  ctx: CanvasRenderingContext2D,
  size: { width: number; height: number },
): void {
  const { width, height } = size;

  const ramp = ctx.createLinearGradient(0, 0, width, height);
  ramp.addColorStop(0, 'hsl(248, 46%, 15%)');
  ramp.addColorStop(0.55, 'hsl(212, 52%, 38%)');
  ramp.addColorStop(1, 'hsl(166, 56%, 60%)');
  ctx.fillStyle = ramp;
  ctx.fillRect(0, 0, width, height);

  // A regular lattice. The lens is measured by how the cells swell as it
  // passes; on a plain gradient there is nothing to swell.
  const cell = width / 22;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = Math.max(1, width / 900);
  for (let x = cell; x < width; x += cell) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = cell; y < height; y += cell) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `600 ${Math.round(height * 0.085)}px ui-sans-serif, system-ui, sans-serif`;
  ctx.fillText('UNDER GLASS', width / 2, height / 2);
}

// #region critical
export function NdcMouseBulge({
  strength = 1,
  falloff = 5,
  lift = 0.5,
  magnify = 0.12,
  sheen = 0.18,
  segments = 128,
  paint,
  className,
}: NdcMouseBulgeProps) {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage | null>(null);

  const { width, height } = useResizeObserver(host);
  const { inView } = useInView(host, { threshold: 0 });
  const visible = useVisibility();
  const reduced = useReducedMotion();
  // Already in NDC, which is exactly the space the shader compares in — no
  // conversion, no cached bounding rect to go stale on scroll.
  const pointer = useSmoothPointer({ target: host, smoothing: 0.0008 });

  const [supported, setSupported] = useState(true);
  useEffect(() => setSupported(hasWebGL()), []);

  const engaged = useRef(0);

  const live = useRef({ strength, falloff, lift, magnify, sheen });
  live.current = { strength, falloff, lift, magnify, sheen };

  const ready = width > 1 && height > 1 && supported;

  useEffect(() => {
    const el = host.current;
    if (!el || !ready) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      // A context can still be refused between the probe and the construction —
      // the tab may have hit the browser's live-context ceiling in between. three
      // throws rather than returning null, and an uncaught throw here takes the
      // page with it.
      setSupported(false);
      return;
    }
    renderer.setPixelRatio(pixelRatio());
    renderer.setSize(el.clientWidth, el.clientHeight, false);
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 100);
    camera.position.z = CAMERA_Z;

    const canvas = document.createElement('canvas');
    canvas.width = TEXTURE_SIZE;
    canvas.height = TEXTURE_SIZE;
    const ctx = canvas.getContext('2d');
    if (ctx) (paint ?? paintSurface)(ctx, { width: TEXTURE_SIZE, height: TEXTURE_SIZE });

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());

    const uniforms: BulgeUniforms = {
      uTexture: { value: texture },
      uMouseNdc: { value: new THREE.Vector2(0, 0) },
      uAspect: { value: 1 },
      uStrength: { value: 0 },
      uFalloff: { value: falloff },
      uLift: { value: lift },
      uMagnify: { value: magnify },
      uSheen: { value: sheen },
    };

    // Dense. The bulge is evaluated per vertex, so the lens can only be as
    // round as the mesh is fine: at 16 segments the Gaussian resolves into a
    // faceted pyramid that follows the cursor.
    const geometry = new THREE.PlaneGeometry(1, 1, segments, segments);
    const material = new THREE.ShaderMaterial({
      vertexShader: ndcMouseBulgeVertexShader,
      fragmentShader: ndcMouseBulgeFragmentShader,
      uniforms,
    });
    const mesh = new THREE.Mesh(geometry, material);
    // The lift happens after the bounding sphere was computed; leaving culling
    // on lets three blank a plane that is filling the viewport.
    mesh.frustumCulled = false;
    scene.add(mesh);

    stage.current = { renderer, scene, camera, mesh, geometry, material, texture, uniforms };

    return () => {
      stage.current = null;
      scene.remove(mesh);
      // Inside `uniforms`, where `disposeObject` cannot see it.
      texture.dispose();
      disposeObject(scene);
      geometry.dispose();
      material.dispose();
      disposeRenderer(renderer);
      renderer.domElement.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, segments, paint]);

  useEffect(() => {
    const current = stage.current;
    if (!current || width < 1 || height < 1) return;
    const aspect = width / height;
    current.renderer.setPixelRatio(pixelRatio());
    current.renderer.setSize(width, height, false);
    current.camera.aspect = aspect;
    current.camera.updateProjectionMatrix();

    // Cover the frustum exactly at z = 0. Derived from the camera, because the
    // visible extent at this distance has no fixed relationship to the pixel
    // width of the container.
    const visibleHeight = 2 * Math.tan((CAMERA_FOV * Math.PI) / 360) * CAMERA_Z;
    current.mesh.scale.set(visibleHeight * aspect, visibleHeight, 1);
    // The shader corrects its screen-space distance with this, so a stale
    // value turns the lens into an ellipse the moment the container reshapes.
    current.uniforms.uAspect.value = aspect;
  }, [width, height]);

  useRaf(
    (dt) => {
      const current = stage.current;
      if (!current) return;
      const { strength: peak, falloff: tightness, lift: rise, magnify: zoom, sheen: light } =
        live.current;

      // Fade the whole effect in and out with the pointer rather than snapping
      // it. Snapping leaves a lens sitting at the last known position for one
      // frame after the cursor leaves, which flickers.
      const wanted = pointer.current.active && !reduced ? peak : 0;
      engaged.current = damp(engaged.current, wanted, STRENGTH_SMOOTHING, dt);

      current.uniforms.uMouseNdc.value.set(pointer.current.ndcX, pointer.current.ndcY);
      current.uniforms.uStrength.value = engaged.current;
      current.uniforms.uFalloff.value = tightness;
      current.uniforms.uLift.value = rise;
      current.uniforms.uMagnify.value = zoom;
      current.uniforms.uSheen.value = light;

      current.renderer.render(current.scene, current.camera);
    },
    ready && inView && visible,
  );
  // #endregion critical

  return (
    <div className={cn('relative h-full w-full overflow-hidden', className)}>
      <div ref={host} className="absolute inset-0" />
      {!supported ? (
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(135deg, hsl(248 46% 15%), hsl(212 52% 38%), hsl(166 56% 60%))',
          }}
        />
      ) : null}
    </div>
  );
}
