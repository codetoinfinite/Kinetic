'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { cn } from '@/lib/cn';
import { useInView } from '@/registry/hooks/use-in-view';
import { useRaf } from '@/registry/hooks/use-raf';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';
import { useResizeObserver } from '@/registry/hooks/use-resize-observer';
import { useScrollVelocity } from '@/registry/hooks/use-scroll-velocity';
import { useVisibility } from '@/registry/hooks/use-visibility';
import { clamp, damp } from '@/registry/lib/damp';
import {
  disposeObject,
  disposeRenderer,
  hasWebGL,
  pixelRatio,
} from '@/registry/lib/webgl';
import {
  scrollDeformWaveFragmentShader,
  scrollDeformWaveVertexShader,
} from '@/registry/shaders/scroll-deform-wave';

/* ==========================================================================
   Scroll Deformation Wave
   --------------------------------------------------------------------------
   An image that flexes with how fast you are scrolling, and bends the other
   way when you scroll back. Signed velocity in, two sine terms out.

   The signature detail is that the wave is sampled from the plane's original
   flat coordinates rather than from the displaced ones, which pins the ripple
   to the picture instead of letting it travel through the surface.
   ========================================================================== */

export interface ScrollDeformWaveProps {
  /**
   * Element whose `scrollTop` drives the wave. `null` (default) reads
   * `window.scrollY`. Pass the scroller when the component lives inside its
   * own overflow container.
   */
  scrollTarget?: HTMLElement | null;
  /** Depth of the ripple in world units at full deflection. */
  amplitude?: number;
  /** Vertical shear amount, which breaks up the horizontal banding. */
  shear?: number;
  /** Spatial frequency of the sine, in radians per world unit. */
  frequency?: number;
  /** Phase offset, so the wave is not symmetric about the plane centre. */
  phase?: number;
  /** Clamp on the signed deform scalar. */
  maxDeform?: number;
  /** Pixels per second of scroll that count as full deflection. */
  reference?: number;
  /** How much the slope term brightens crests and darkens troughs. */
  shade?: number;
  /** Extra crop held in reserve so displaced vertices never sample past the edge. */
  overscan?: number;
  /** Plane subdivisions per axis. The wave is per-vertex, so this is its resolution. */
  segments?: number;
  /** Draw the image. Default paints a ruled hue field with a caption. */
  paint?: (
    ctx: CanvasRenderingContext2D,
    size: { width: number; height: number },
  ) => void;
  className?: string;
}

const CAMERA_FOV = 45;
const CAMERA_Z = 3;
const TEXTURE_WIDTH = 1024;
const TEXTURE_HEIGHT = 1024;
const DEFORM_SMOOTHING = 0.0025;

interface WaveUniforms {
  [name: string]: THREE.IUniform;
  uTexture: THREE.IUniform<THREE.Texture | null>;
  uTextureAspect: THREE.IUniform<number>;
  uPlaneAspect: THREE.IUniform<number>;
  uOverscan: THREE.IUniform<number>;
  uShade: THREE.IUniform<number>;
  uDeform: THREE.IUniform<number>;
  uFrequency: THREE.IUniform<number>;
  uPhase: THREE.IUniform<number>;
  uAmplitude: THREE.IUniform<number>;
  uShear: THREE.IUniform<number>;
}

interface Stage {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  mesh: THREE.Mesh;
  geometry: THREE.PlaneGeometry;
  material: THREE.ShaderMaterial;
  texture: THREE.CanvasTexture;
  uniforms: WaveUniforms;
}

function paintImage(
  ctx: CanvasRenderingContext2D,
  size: { width: number; height: number },
): void {
  const { width, height } = size;

  const ramp = ctx.createLinearGradient(0, height, width, 0);
  ramp.addColorStop(0, 'hsl(206, 52%, 14%)');
  ramp.addColorStop(0.5, 'hsl(178, 40%, 38%)');
  ramp.addColorStop(1, 'hsl(52, 78%, 66%)');
  ctx.fillStyle = ramp;
  ctx.fillRect(0, 0, width, height);

  // Horizontal rules run across the crests, so the ripple shows up as the
  // lines bowing. On a smooth gradient the deformation is nearly invisible.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.17)';
  ctx.lineWidth = Math.max(1, height / 700);
  for (let i = 1; i < 28; i++) {
    const y = (height * i) / 28;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `600 ${Math.round(height * 0.11)}px ui-sans-serif, system-ui, sans-serif`;
  ctx.fillText('DRIFT', width / 2, height * 0.46);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
  ctx.font = `500 ${Math.round(height * 0.028)}px ui-monospace, SFMono-Regular, monospace`;
  ctx.fillText('VELOCITY DRIVES THE SURFACE', width / 2, height * 0.57);
}

// #region critical
export function ScrollDeformWave({
  scrollTarget = null,
  amplitude = 0.07,
  shear = 0.04,
  frequency = 3,
  phase = 100,
  maxDeform = 1.5,
  reference = 900,
  shade = 0.22,
  overscan = 1.12,
  segments = 96,
  paint,
  className,
}: ScrollDeformWaveProps) {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage | null>(null);

  const { width, height } = useResizeObserver(host);
  const { inView } = useInView(host, { threshold: 0 });
  const visible = useVisibility();
  const reduced = useReducedMotion();

  // Signed and already smoothed. Raw scroll deltas are spiky enough that
  // feeding them straight into a geometry parameter produces visible stutter.
  const scroll = useScrollVelocity({ reference, target: scrollTarget });

  const [supported, setSupported] = useState(true);
  useEffect(() => setSupported(hasWebGL()), []);

  const deform = useRef(0);

  const live = useRef({ amplitude, shear, frequency, phase, maxDeform, shade, overscan });
  live.current = { amplitude, shear, frequency, phase, maxDeform, shade, overscan };

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
    canvas.width = TEXTURE_WIDTH;
    canvas.height = TEXTURE_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (ctx) (paint ?? paintImage)(ctx, { width: TEXTURE_WIDTH, height: TEXTURE_HEIGHT });

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());

    const uniforms: WaveUniforms = {
      uTexture: { value: texture },
      uTextureAspect: { value: TEXTURE_WIDTH / TEXTURE_HEIGHT },
      uPlaneAspect: { value: 1 },
      uOverscan: { value: overscan },
      uShade: { value: shade },
      uDeform: { value: 0 },
      uFrequency: { value: frequency },
      uPhase: { value: phase },
      uAmplitude: { value: amplitude },
      uShear: { value: shear },
    };

    // A unit plane, rescaled on resize rather than rebuilt. The wave is
    // measured in world units, so the plane keeps a fixed subdivision and the
    // mesh scale carries the aspect.
    const geometry = new THREE.PlaneGeometry(1, 1, segments, segments);
    const material = new THREE.ShaderMaterial({
      vertexShader: scrollDeformWaveVertexShader,
      fragmentShader: scrollDeformWaveFragmentShader,
      uniforms,
      transparent: true,
    });
    const mesh = new THREE.Mesh(geometry, material);
    // The bend happens after the bounding sphere was computed, so a plane at
    // the edge of the frustum blinks out mid-ripple if this stays on.
    mesh.frustumCulled = false;
    scene.add(mesh);

    stage.current = { renderer, scene, camera, mesh, geometry, material, texture, uniforms };

    return () => {
      stage.current = null;
      scene.remove(mesh);
      // Lives inside `uniforms`, which `disposeObject` never walks.
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

    // Cover the frustum exactly at z = 0, in world units derived from the
    // camera — not from `window.innerWidth`, which has no fixed relationship
    // to the visible extent at this distance.
    const visibleHeight = 2 * Math.tan((CAMERA_FOV * Math.PI) / 360) * CAMERA_Z;
    current.mesh.scale.set(visibleHeight * aspect, visibleHeight, 1);
    // The shader fits the texture into the QUAD, so this is the quad's aspect.
    current.uniforms.uPlaneAspect.value = aspect;
  }, [width, height]);

  useRaf(
    (dt) => {
      const current = stage.current;
      if (!current) return;
      const {
        amplitude: depth,
        shear: skew,
        frequency: freq,
        phase: offset,
        maxDeform: limit,
        shade: light,
        overscan: zoom,
      } = live.current;

      // Signed on purpose. Taking the magnitude would make scrolling up and
      // scrolling down produce an identical wave, and the direction cue — the
      // surface bending the other way — is most of the effect.
      const target = reduced ? 0 : clamp(scroll.current.normalized, -1, 1) * limit;
      deform.current = damp(deform.current, target, DEFORM_SMOOTHING, dt);

      current.uniforms.uDeform.value = deform.current;
      current.uniforms.uAmplitude.value = depth;
      current.uniforms.uShear.value = skew;
      current.uniforms.uFrequency.value = freq;
      current.uniforms.uPhase.value = offset;
      current.uniforms.uShade.value = light;
      current.uniforms.uOverscan.value = zoom;

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
              'linear-gradient(30deg, hsl(206 52% 14%), hsl(178 40% 38%), hsl(52 78% 66%))',
          }}
        />
      ) : null}
    </div>
  );
}
