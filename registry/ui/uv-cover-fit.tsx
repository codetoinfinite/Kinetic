'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { cn } from '@/lib/cn';
import { useInView } from '@/registry/hooks/use-in-view';
import { useRaf } from '@/registry/hooks/use-raf';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';
import { useResizeObserver } from '@/registry/hooks/use-resize-observer';
import { useVisibility } from '@/registry/hooks/use-visibility';
import { lerp } from '@/registry/lib/damp';
import { easeInOutQuart } from '@/registry/lib/easing';
import {
  disposeObject,
  disposeRenderer,
  hasWebGL,
  pixelRatio,
} from '@/registry/lib/webgl';
import {
  uvCoverFitFragmentShader,
  uvCoverFitVertexShader,
} from '@/registry/shaders/uv-cover-fit';

/* ==========================================================================
   Cover-Fit UV Maths
   --------------------------------------------------------------------------
   `object-fit: cover` for a textured quad, where there is no box to crop and
   no CSS to do it for you. The fit is a pure function of two aspect ratios,
   evaluated in the fragment shader, so the quad can be reshaped every frame
   and the crop simply follows it.

   The frame here reshapes continuously on purpose. A cover fit that is only
   ever tested at one aspect ratio is a cover fit that has not been tested.
   ========================================================================== */

export interface UvCoverFitProps {
  /** Narrowest frame aspect in the cycle (w / h). */
  minAspect?: number;
  /** Widest frame aspect in the cycle (w / h). */
  maxAspect?: number;
  /** Seconds for a full narrow-wide-narrow cycle, holds included. */
  period?: number;
  /** Fraction of each cycle spent held at an end, 0-0.5. */
  hold?: number;
  /** Fraction of the container the frame fills at its largest. */
  fill?: number;
  /** Extra zoom on the crop. 1 fits exactly; 1.1 keeps 10% in reserve. */
  overscan?: number;
  /** Where the crop slack goes, 0-1 per axis. [0.5, 0.5] centres it. */
  focal?: [number, number];
  /** Draw the source image. Default paints a grid with a true circle on it. */
  paint?: (
    ctx: CanvasRenderingContext2D,
    size: { width: number; height: number },
  ) => void;
  /** Source canvas size. Its ratio is the texture aspect the shader fits. */
  textureSize?: { width: number; height: number };
  className?: string;
}

const DEFAULT_TEXTURE = { width: 1200, height: 675 };

type CoverUniforms = {
  uTexture: { value: THREE.Texture | null };
  uTextureAspect: { value: number };
  uPlaneAspect: { value: number };
  uOverscan: { value: number };
  uFocal: { value: THREE.Vector2 };
};

interface Stage {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  mesh: THREE.Mesh;
  geometry: THREE.PlaneGeometry;
  material: THREE.ShaderMaterial;
  texture: THREE.CanvasTexture;
  uniforms: CoverUniforms;
}

function paintSource(
  ctx: CanvasRenderingContext2D,
  size: { width: number; height: number },
): void {
  const { width, height } = size;

  const ramp = ctx.createLinearGradient(0, 0, width, height);
  ramp.addColorStop(0, 'hsl(268, 42%, 18%)');
  ramp.addColorStop(0.55, 'hsl(322, 46%, 42%)');
  ramp.addColorStop(1, 'hsl(28, 84%, 64%)');
  ctx.fillStyle = ramp;
  ctx.fillRect(0, 0, width, height);

  // A square grid, in source pixels. If the fit ever stretches instead of
  // cropping, these cells stop being square and it is obvious immediately.
  const cell = width / 16;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
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

  // The proof. A circle drawn in source pixels stays a circle under a correct
  // cover fit at every frame aspect, and becomes an ellipse the instant the
  // maths degrades into a stretch.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = Math.max(2, width / 260);
  ctx.beginPath();
  ctx.arc(width / 2, height / 2, Math.min(width, height) * 0.32, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `500 ${Math.round(height * 0.055)}px ui-monospace, SFMono-Regular, monospace`;
  ctx.fillText(`${width} x ${height}`, width / 2, height / 2);
}

/** Triangle wave with a flat hold at each end, eased. One cycle is `period`. */
function cyclePhase(elapsed: number, period: number, hold: number): number {
  const t = (elapsed % period) / period;
  const clampedHold = Math.min(Math.max(hold, 0), 0.49);
  const ramp = 0.5 - clampedHold;
  if (t < clampedHold) return 0;
  if (t < 0.5) return easeInOutQuart((t - clampedHold) / ramp);
  if (t < 0.5 + clampedHold) return 1;
  return 1 - easeInOutQuart((t - 0.5 - clampedHold) / ramp);
}

// #region critical
export function UvCoverFit({
  minAspect = 0.62,
  maxAspect = 2.3,
  period = 8,
  hold = 0.12,
  fill = 0.84,
  overscan = 1,
  focal = [0.5, 0.5],
  paint,
  textureSize = DEFAULT_TEXTURE,
  className,
}: UvCoverFitProps) {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage | null>(null);

  const { width, height } = useResizeObserver(host);
  const { inView } = useInView(host, { threshold: 0 });
  const visible = useVisibility();
  const reduced = useReducedMotion();

  const [supported, setSupported] = useState(true);
  useEffect(() => setSupported(hasWebGL()), []);

  const elapsed = useRef(0);
  const viewport = useRef({ width: 1, height: 1 });

  const live = useRef({ minAspect, maxAspect, period, hold, fill, overscan, focal });
  live.current = { minAspect, maxAspect, period, hold, fill, overscan, focal };

  const ready = width > 1 && height > 1 && supported;
  const textureWidth = textureSize.width;
  const textureHeight = textureSize.height;

  /* Sizing is a callback rather than effect-body code because it has to be
     reachable from BOTH effects, which fire on independent triggers. The
     camera is constructed at +/-1 and `viewport` starts at 1x1, and the only
     thing that replaced either was the effect keyed on the observed width and
     height. So any rebuild without an accompanying size change left the ortho
     bounds square while the container was not — the exact viewport stretch
     this component exists to disprove — and left the frame sized against a
     1x1 world inside a camera spanning aspect*2 by 2, i.e. a sliver. The
     build effect re-runs on `textureSize` and `paint`, and a caller passing
     an inline `paint` arrow rebuilds the stage on every parent render, so
     that state persisted until the user happened to resize the window.
     Everything below is derived purely from w and h, so calling it from both
     paths is idempotent. */
  const fitViewport = useCallback((w: number, h: number) => {
    const current = stage.current;
    if (!current || w < 1 || h < 1) return;
    const aspect = w / h;
    current.renderer.setPixelRatio(pixelRatio());
    current.renderer.setSize(w, h, false);
    // Ortho bounds track the container aspect so a world unit is the same
    // number of pixels on both axes. Leave them at +/-1 and the quad is
    // stretched by the viewport, which would fake the exact bug this
    // component exists to avoid.
    current.camera.left = -aspect;
    current.camera.right = aspect;
    current.camera.top = 1;
    current.camera.bottom = -1;
    current.camera.updateProjectionMatrix();
    viewport.current = { width: aspect * 2, height: 2 };
  }, []);

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
    // Orthographic, because nothing here is about perspective. World units map
    // one-to-one to the frame: the quad's scale IS its aspect ratio, with no
    // frustum arithmetic in between.
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 10);
    camera.position.z = 1;

    const canvas = document.createElement('canvas');
    canvas.width = textureWidth;
    canvas.height = textureHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) (paint ?? paintSource)(ctx, { width: textureWidth, height: textureHeight });

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    // Clamp, not repeat. If a rounding error ever pushes a UV a hair past 1,
    // repeat wraps the far edge of the image into view as a bright seam;
    // clamp smears the border pixel instead, which is invisible.
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());

    const uniforms: CoverUniforms = {
      uTexture: { value: texture },
      uTextureAspect: { value: textureWidth / textureHeight },
      uPlaneAspect: { value: 1 },
      uOverscan: { value: overscan },
      uFocal: { value: new THREE.Vector2(focal[0], focal[1]) },
    };

    // One quad, two triangles. The fit is per-fragment ratio arithmetic, so
    // subdividing would buy nothing at all.
    const geometry = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.ShaderMaterial({
      vertexShader: uvCoverFitVertexShader,
      fragmentShader: uvCoverFitFragmentShader,
      uniforms,
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    stage.current = { renderer, scene, camera, mesh, geometry, material, texture, uniforms };

    // Fit before the first frame. `ready` guarantees the observed box is real,
    // and waiting for the resize effect to do it is a bet that the box will
    // change size again — on a stage that is built once and never reflowed,
    // that bet never pays out and every frame is drawn against a 1x1 world.
    fitViewport(width, height);

    return () => {
      stage.current = null;
      scene.remove(mesh);
      // Inside `uniforms`, so `disposeObject` will never reach it.
      texture.dispose();
      disposeObject(scene);
      geometry.dispose();
      material.dispose();
      disposeRenderer(renderer);
      renderer.domElement.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, textureWidth, textureHeight, paint]);

  // Reflow costs a re-fit, never a rebuild. The guard against a stage that
  // does not exist yet now lives inside `fitViewport`.
  useEffect(() => {
    fitViewport(width, height);
  }, [fitViewport, width, height]);

  useRaf(
    (dt) => {
      const current = stage.current;
      if (!current) return;
      const {
        minAspect: low,
        maxAspect: high,
        period: cycle,
        hold: pause,
        fill: coverage,
        overscan: zoom,
        focal: focalPoint,
      } = live.current;

      if (!reduced) elapsed.current += dt;
      const phase = reduced ? 0.5 : cyclePhase(elapsed.current, Math.max(cycle, 1), pause);
      const frameAspect = lerp(low, high, phase);

      // Contain the frame inside the viewport at the requested aspect. Fitting
      // on width alone means the tall end of the cycle runs off the top and
      // bottom, which hides half the thing being demonstrated.
      const available = viewport.current;
      const maxW = available.width * coverage;
      const maxH = available.height * coverage;
      const frameW = frameAspect > maxW / maxH ? maxW : maxH * frameAspect;
      const frameH = frameAspect > maxW / maxH ? maxW / frameAspect : maxH;

      current.mesh.scale.set(frameW, frameH, 1);
      // The uniform is the QUAD's aspect, not the canvas's. Passing the
      // container aspect here is the classic bug: the crop then ignores the
      // frame and only tracks the browser window.
      current.uniforms.uPlaneAspect.value = frameAspect;
      current.uniforms.uOverscan.value = zoom;
      current.uniforms.uFocal.value.set(focalPoint[0], focalPoint[1]);

      current.renderer.render(current.scene, current.camera);
    },
    ready && inView && visible,
  );
  // #endregion critical

  return (
    <div className={cn('relative h-full w-full overflow-hidden', className)}>
      <div ref={host} className="absolute inset-0" />
      {!supported ? (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div
            className="h-full w-full rounded-md"
            style={{
              background:
                'linear-gradient(135deg, hsl(268 42% 18%), hsl(322 46% 42%), hsl(28 84% 64%))',
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
