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
  vertexCylinderBendFragmentShader,
  vertexCylinderBendVertexShader,
} from '@/registry/shaders/vertex-cylinder-bend';

/* ==========================================================================
   Vertex Shader Cylinder Bend
   --------------------------------------------------------------------------
   One flat plane, curved on the GPU. The mesh is never rebuilt and the CPU
   never touches a vertex: curl is a uniform, so the same geometry can be
   flat, gently bowed or wrapped most of the way round a cylinder between two
   frames.

   This is the primitive that the cylinder gallery is nineteen copies of.
   ========================================================================== */

export interface VertexCylinderBendProps {
  /** Radians of bend per world unit of plane width. 0 is flat. */
  curl?: number;
  /** Peak extra curl added by the idle breathing cycle. */
  curlSwing?: number;
  /** Radians the banner rocks around the drum axis from full pointer travel. */
  parallax?: number;
  /** Vertical bow, 0 (straight edges) to ~1 (full sine). */
  barrel?: number;
  /** How much the facing term darkens the receding edges, 0-1. */
  shade?: number;
  /** Plane subdivisions across the bend. This is the resolution of the curve. */
  segments?: number;
  /** Seconds per breathing cycle. */
  period?: number;
  /** Draw the banner face. Default paints a ruled hue ramp with a numeral scale. */
  paint?: (
    ctx: CanvasRenderingContext2D,
    size: { width: number; height: number },
  ) => void;
  className?: string;
}

/* Fixed world size, deliberately. `curl` is defined in radians per world unit,
   so a plane whose width changed with the viewport would bend by a different
   total angle on every device. The camera moves to fit instead. */
const PLANE_WIDTH = 3;
const PLANE_HEIGHT = 1.4;
const CAMERA_FOV = 40;
const FIT = 0.86;

const TEXTURE_WIDTH = 1024;
const TEXTURE_HEIGHT = 512;

const CURL_SMOOTHING = 0.004;
const SPIN_SMOOTHING = 0.002;

type BendUniforms = {
  uTexture: { value: THREE.Texture | null };
  uCurl: { value: number };
  uSpin: { value: number };
  uBarrel: { value: number };
  uShade: { value: number };
};

interface Stage {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  geometry: THREE.PlaneGeometry;
  material: THREE.ShaderMaterial;
  texture: THREE.CanvasTexture;
  uniforms: BendUniforms;
}

function paintBanner(
  ctx: CanvasRenderingContext2D,
  size: { width: number; height: number },
): void {
  const { width, height } = size;

  const ramp = ctx.createLinearGradient(0, 0, width, height);
  ramp.addColorStop(0, 'hsl(214, 44%, 16%)');
  ramp.addColorStop(0.5, 'hsl(196, 48%, 40%)');
  ramp.addColorStop(1, 'hsl(46, 82%, 62%)');
  ctx.fillStyle = ramp;
  ctx.fillRect(0, 0, width, height);

  // Vertical rules are the point. On a smooth gradient the bend is almost
  // invisible; evenly spaced verticals bunch up toward the receding edges and
  // make the curvature readable at a glance.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.lineWidth = Math.max(1, width / 640);
  for (let i = 1; i < 24; i++) {
    const x = (width * i) / 24;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `600 ${Math.round(height * 0.26)}px ui-sans-serif, system-ui, sans-serif`;
  ctx.fillText('CURVATURE', width / 2, height * 0.46);

  ctx.font = `500 ${Math.round(height * 0.062)}px ui-monospace, SFMono-Regular, monospace`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.fillText('ONE PLANE / ONE UNIFORM / NO REBUILD', width / 2, height * 0.72);
}

// #region critical
export function VertexCylinderBend({
  curl = 0.62,
  curlSwing = 0.22,
  parallax = 0.34,
  barrel = 0.3,
  shade = 0.55,
  segments = 96,
  period = 9,
  paint,
  className,
}: VertexCylinderBendProps) {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage | null>(null);

  const { width, height } = useResizeObserver(host);
  const { inView } = useInView(host, { threshold: 0 });
  const visible = useVisibility();
  const reduced = useReducedMotion();
  const pointer = useSmoothPointer({ target: host, smoothing: 0.002 });

  const [supported, setSupported] = useState(true);
  useEffect(() => setSupported(hasWebGL()), []);

  const elapsed = useRef(0);
  const spin = useRef(0);
  const curlNow = useRef(curl);

  const live = useRef({ curl, curlSwing, parallax, barrel, shade, period });
  live.current = { curl, curlSwing, parallax, barrel, shade, period };

  const ready = width > 1 && height > 1 && supported;

  useEffect(() => {
    const el = host.current;
    if (!el || !ready) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(pixelRatio());
    renderer.setSize(el.clientWidth, el.clientHeight, false);
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 100);

    const canvas = document.createElement('canvas');
    canvas.width = TEXTURE_WIDTH;
    canvas.height = TEXTURE_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (ctx) (paint ?? paintBanner)(ctx, { width: TEXTURE_WIDTH, height: TEXTURE_HEIGHT });

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());

    const uniforms: BendUniforms = {
      uTexture: { value: texture },
      uCurl: { value: curl },
      uSpin: { value: 0 },
      uBarrel: { value: barrel },
      uShade: { value: shade },
    };

    // Segments only along x. The bend is a function of x alone, so vertical
    // subdivision buys nothing but vertices — except the barrel bow, which
    // needs a handful of rows to curve at all.
    const geometry = new THREE.PlaneGeometry(PLANE_WIDTH, PLANE_HEIGHT, segments, 16);
    const material = new THREE.ShaderMaterial({
      vertexShader: vertexCylinderBendVertexShader,
      fragmentShader: vertexCylinderBendFragmentShader,
      uniforms,
      transparent: true,
      // The bend turns the far edges away from the camera, so without
      // DoubleSide a hard curl punches holes through the ends of the banner.
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    // The CPU bounding sphere describes a flat plane that the shader has
    // already moved. Culling against it blanks the banner at shallow angles.
    mesh.frustumCulled = false;
    scene.add(mesh);

    stage.current = { renderer, scene, camera, geometry, material, texture, uniforms };

    return () => {
      stage.current = null;
      scene.remove(mesh);
      // The texture is inside `uniforms`, where disposeObject cannot see it.
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

    // Contain-fit by moving the camera, not by resizing the plane: the plane's
    // world width is what `curl` is measured against, so it has to stay fixed.
    // Take the larger of the two required distances or the banner is cropped
    // on whichever axis is tighter.
    const tanHalf = Math.tan((CAMERA_FOV * Math.PI) / 360);
    const forWidth = PLANE_WIDTH / FIT / (2 * tanHalf * aspect);
    const forHeight = PLANE_HEIGHT / FIT / (2 * tanHalf);
    current.camera.position.z = Math.max(forWidth, forHeight);
    current.camera.updateProjectionMatrix();
  }, [width, height]);

  useRaf(
    (dt) => {
      const current = stage.current;
      if (!current) return;
      const { curl: base, curlSwing: swing, parallax: sway, barrel: bow, shade: dark, period: cycle } =
        live.current;

      elapsed.current += dt;

      // Breathing curl. The whole reason the bend lives in a uniform is that
      // it can move; holding it at one value hides the technique.
      const target = reduced ? base : base + swing * Math.sin((elapsed.current * Math.PI * 2) / Math.max(cycle, 0.5));
      curlNow.current = damp(curlNow.current, target, CURL_SMOOTHING, dt);

      // Pointer rocks the banner around the drum axis. This survives reduced
      // motion because it is a direct response to input, not autonomous motion.
      // ndcX, not nx: ndc is -1..1 about the centre, so the banner rocks
      // symmetrically. nx is 0..1, which would bias every rock to one side.
      const aim = pointer.current.active ? pointer.current.ndcX * sway : 0;
      spin.current = damp(spin.current, aim, SPIN_SMOOTHING, dt);

      current.uniforms.uCurl.value = curlNow.current;
      current.uniforms.uSpin.value = spin.current;
      current.uniforms.uBarrel.value = bow;
      current.uniforms.uShade.value = dark;
      current.renderer.render(current.scene, current.camera);
    },
    ready && inView && visible,
  );
  // #endregion critical

  return (
    <div className={cn('relative h-full w-full overflow-hidden', className)}>
      <div ref={host} className="absolute inset-0" />
      {!supported ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="h-24 w-2/3 rounded-md"
            style={{
              background:
                'linear-gradient(100deg, hsl(214 44% 16%), hsl(196 48% 40%), hsl(46 82% 62%))',
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
