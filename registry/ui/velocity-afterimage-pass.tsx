'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { cn } from '@/lib/cn';
import { useInView } from '@/registry/hooks/use-in-view';
import { useRaf } from '@/registry/hooks/use-raf';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';
import { useResizeObserver } from '@/registry/hooks/use-resize-observer';
import { useSmoothPointer } from '@/registry/hooks/use-smooth-pointer';
import { useVisibility } from '@/registry/hooks/use-visibility';
import { clamp, damp } from '@/registry/lib/damp';
import {
  disposeObject,
  disposeRenderer,
  hasWebGL,
  pixelRatio,
} from '@/registry/lib/webgl';
import {
  velocityAfterimageFragmentShader,
  velocityAfterimageVertexShader,
} from '@/registry/shaders/velocity-afterimage-pass';

/* ==========================================================================
   Velocity Afterimage Pass
   --------------------------------------------------------------------------
   A motion trail that keeps no history. Two render targets take turns: one
   holds everything that has happened, the other receives that accumulation
   decayed by a factor with the current frame composited on top. Next frame
   they swap roles.

   The trail length is therefore one float, not a list of past positions —
   which is why it can be driven straight from pointer speed and change
   continuously without allocating anything.
   ========================================================================== */

export interface VelocityAfterimagePassProps {
  /** Longest trail, as the per-frame decay factor. Must stay below 1. */
  maxDamp?: number;
  /** Alpha below which a pixel is cut to nothing instead of decaying forever. */
  cutoff?: number;
  /** Pointer travel in screen-heights per second that counts as full speed. */
  reference?: number;
  /** Satellites orbiting the lead mark. */
  satellites?: number;
  /** Base hue for the marks. */
  hue?: number;
  /** Render target scale. Below 1 trades trail sharpness for fill rate. */
  resolutionScale?: number;
  className?: string;
}

const LEAD_SIZE = 0.34;
const SATELLITE_SIZE = 0.16;
const ORBIT_RADIUS = 0.3;
const ORBIT_SPEED = 1.5;
const LEAD_SMOOTHING = 0.0004;
const DAMP_SMOOTHING = 0.003;
const SPRITE_SIZE = 256;

interface BlendUniforms {
  [name: string]: THREE.IUniform;
  uCurrent: THREE.IUniform<THREE.Texture | null>;
  uHistory: THREE.IUniform<THREE.Texture | null>;
  uDamp: THREE.IUniform<number>;
  uCutoff: THREE.IUniform<number>;
}

interface Stage {
  renderer: THREE.WebGLRenderer;
  content: THREE.Scene;
  contentCamera: THREE.OrthographicCamera;
  quadScene: THREE.Scene;
  quadCamera: THREE.OrthographicCamera;
  screenScene: THREE.Scene;
  frame: THREE.WebGLRenderTarget;
  ping: THREE.WebGLRenderTarget;
  pong: THREE.WebGLRenderTarget;
  blendUniforms: BlendUniforms;
  screenMaterial: THREE.MeshBasicMaterial;
  lead: THREE.Mesh;
  orbiters: THREE.Mesh[];
  sprite: THREE.CanvasTexture;
  quadGeometry: THREE.PlaneGeometry;
  markGeometry: THREE.PlaneGeometry;
  blendMaterial: THREE.ShaderMaterial;
  markMaterials: THREE.MeshBasicMaterial[];
}

/** A radial falloff, drawn once and reused by every mark. */
function makeSprite(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = SPRITE_SIZE;
  canvas.height = SPRITE_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const half = SPRITE_SIZE / 2;
  const glow = ctx.createRadialGradient(half, half, 0, half, half, half);
  glow.addColorStop(0, 'rgba(255, 255, 255, 1)');
  glow.addColorStop(0.42, 'rgba(255, 255, 255, 0.72)');
  glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
  return canvas;
}

function makeTarget(width: number, height: number): THREE.WebGLRenderTarget {
  return new THREE.WebGLRenderTarget(width, height, {
    // Half float, not the default unsigned byte. The accumulation is
    // multiplied by a fraction every single frame, and on 8 bits the result
    // quantises into visible stair-stepped bands down the length of the trail.
    type: THREE.HalfFloatType,
    // Nearest, not linear. The blend reads texel-for-texel from a target of
    // exactly the same size; bilinear filtering would smear the trail
    // sideways a little more on each of the hundreds of passes it survives.
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    depthBuffer: false,
    stencilBuffer: false,
  });
}

// #region critical
export function VelocityAfterimagePass({
  maxDamp = 0.9,
  cutoff = 0.06,
  reference = 1.6,
  satellites = 3,
  hue = 196,
  resolutionScale = 1,
  className,
}: VelocityAfterimagePassProps) {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage | null>(null);

  const { width, height } = useResizeObserver(host);
  const { inView } = useInView(host, { threshold: 0 });
  const visible = useVisibility();
  const reduced = useReducedMotion();
  const pointer = useSmoothPointer({ target: host, smoothing: 0.0005 });

  const [supported, setSupported] = useState(true);
  useEffect(() => setSupported(hasWebGL()), []);

  const elapsed = useRef(0);
  const dampNow = useRef(0);
  const last = useRef<{ x: number; y: number } | null>(null);
  const lead = useRef({ x: 0, y: 0 });

  const live = useRef({ maxDamp, cutoff, reference });
  live.current = { maxDamp, cutoff, reference };

  const ready = width > 1 && height > 1 && supported;

  /* Sizing is a callback rather than effect-body code because it has to be
     reachable from BOTH effects, which fire on independent triggers. The build
     effect sizes the render targets itself, but it constructs `contentCamera`
     at +/-1 and nothing else ever widened it — that lived only in the effect
     keyed on the observed width and height. So any rebuild without an
     accompanying size change left the camera square inside a non-square
     canvas: the marks render as ellipses, and because the raf loop reads the
     aspect back off `contentCamera.right` the lead mark also tracks the
     pointer at the wrong horizontal scale, drifting further from the cursor
     the further it travels. The build effect re-runs on `satellites`, `hue`
     and `resolutionScale`, so that state persisted until the user happened to
     resize the window. Everything below is derived purely from w and h, and
     `WebGLRenderTarget.setSize` no-ops on unchanged dimensions, so calling it
     from both paths is idempotent. */
  const fitStage = useCallback(
    (w: number, h: number) => {
      const current = stage.current;
      if (!current || w < 1 || h < 1) return;
      const dpr = pixelRatio();
      const aspect = w / h;
      current.renderer.setPixelRatio(dpr);
      current.renderer.setSize(w, h, false);
      current.contentCamera.left = -aspect;
      current.contentCamera.right = aspect;
      current.contentCamera.updateProjectionMatrix();

      const bufferW = Math.max(2, Math.round(w * dpr * resolutionScale));
      const bufferH = Math.max(2, Math.round(h * dpr * resolutionScale));
      for (const target of [current.frame, current.ping, current.pong]) {
        target.setSize(bufferW, bufferH);
        // setSize reallocates the texture, so whatever the history held is now
        // undefined memory. Without an explicit clear, the first frame after a
        // resize can composite garbage that then decays for a second.
        current.renderer.setRenderTarget(target);
        current.renderer.clear();
      }
      current.renderer.setRenderTarget(null);
    },
    [resolutionScale],
  );

  useEffect(() => {
    const el = host.current;
    if (!el || !ready) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    } catch {
      // A context can still be refused between the probe and the construction —
      // the tab may have hit the browser's live-context ceiling in between. three
      // throws rather than returning null, and an uncaught throw here takes the
      // page with it.
      setSupported(false);
      return;
    }
    const dpr = pixelRatio();
    renderer.setPixelRatio(dpr);
    renderer.setSize(el.clientWidth, el.clientHeight, false);
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    el.appendChild(renderer.domElement);

    const bufferW = Math.max(2, Math.round(el.clientWidth * dpr * resolutionScale));
    const bufferH = Math.max(2, Math.round(el.clientHeight * dpr * resolutionScale));

    // Three targets: one for this frame's marks, two that swap as history.
    // Reading and writing the same target in one pass is undefined behaviour
    // in WebGL and shows up as tearing or a black frame depending on driver.
    const frame = makeTarget(bufferW, bufferH);
    const ping = makeTarget(bufferW, bufferH);
    const pong = makeTarget(bufferW, bufferH);

    const sprite = new THREE.CanvasTexture(makeSprite());
    sprite.colorSpace = THREE.SRGBColorSpace;

    const content = new THREE.Scene();
    const contentCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 10);
    contentCamera.position.z = 1;

    const markGeometry = new THREE.PlaneGeometry(1, 1);
    const markMaterials: THREE.MeshBasicMaterial[] = [];

    const makeMark = (size: number, lightness: number, shift: number) => {
      const material = new THREE.MeshBasicMaterial({
        map: sprite,
        transparent: true,
        depthWrite: false,
        depthTest: false,
      });
      material.color.setHSL(((hue + shift) % 360) / 360, 0.72, lightness);
      markMaterials.push(material);
      const mesh = new THREE.Mesh(markGeometry, material);
      mesh.scale.setScalar(size);
      content.add(mesh);
      return mesh;
    };

    const leadMesh = makeMark(LEAD_SIZE, 0.62, 0);
    const orbiters: THREE.Mesh[] = [];
    for (let i = 0; i < Math.max(satellites, 0); i++) {
      orbiters.push(makeMark(SATELLITE_SIZE, 0.5, (i + 1) * 26));
    }

    // Fullscreen quad, reused by both post passes. PlaneGeometry(2, 2) exactly
    // fills a -1..1 orthographic frustum with no scaling in between.
    const quadGeometry = new THREE.PlaneGeometry(2, 2);
    const quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const blendUniforms: BlendUniforms = {
      uCurrent: { value: frame.texture },
      uHistory: { value: ping.texture },
      uDamp: { value: 0 },
      uCutoff: { value: cutoff },
    };
    const blendMaterial = new THREE.ShaderMaterial({
      vertexShader: velocityAfterimageVertexShader,
      fragmentShader: velocityAfterimageFragmentShader,
      uniforms: blendUniforms,
      depthWrite: false,
      depthTest: false,
    });
    const quadScene = new THREE.Scene();
    quadScene.add(new THREE.Mesh(quadGeometry, blendMaterial));

    // The final blit uses a stock material precisely so three applies its own
    // output colour-space conversion here, and only here.
    const screenMaterial = new THREE.MeshBasicMaterial({
      map: pong.texture,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });
    const screenScene = new THREE.Scene();
    screenScene.add(new THREE.Mesh(quadGeometry, screenMaterial));

    const stageValue: Stage = {
      renderer,
      content,
      contentCamera,
      quadScene,
      quadCamera,
      screenScene,
      frame,
      ping,
      pong,
      blendUniforms,
      screenMaterial,
      lead: leadMesh,
      orbiters,
      sprite,
      quadGeometry,
      markGeometry,
      blendMaterial,
      markMaterials,
    };
    stage.current = stageValue;

    // Fit before the first frame. `ready` guarantees the observed box is real,
    // and waiting for the resize effect to widen the camera is a bet that the
    // box will change size again — on a stage that is built once and never
    // reflowed, that bet never pays out. The clear this performs is wanted
    // here too: the three targets are freshly allocated and their contents are
    // undefined until something writes them.
    fitStage(width, height);

    return () => {
      stage.current = null;
      disposeObject(content);
      disposeObject(quadScene);
      disposeObject(screenScene);
      sprite.dispose();
      quadGeometry.dispose();
      markGeometry.dispose();
      blendMaterial.dispose();
      screenMaterial.dispose();
      for (const material of markMaterials) material.dispose();
      // Render targets are not part of any scene graph, so nothing walks them.
      // Each one holds a full-resolution half-float texture and a framebuffer.
      frame.dispose();
      ping.dispose();
      pong.dispose();
      disposeRenderer(renderer);
      renderer.domElement.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, satellites, hue, resolutionScale]);

  // Reflow costs a re-fit, never a rebuild. `resolutionScale` stays covered
  // because `fitStage` closes over it, so a new scale gives a new identity.
  useEffect(() => {
    fitStage(width, height);
  }, [fitStage, width, height]);

  useRaf(
    (dt) => {
      const current = stage.current;
      if (!current) return;
      const { maxDamp: longest, cutoff: floor, reference: full } = live.current;

      if (!reduced) elapsed.current += dt;

      const aspect = current.contentCamera.right;
      const targetX = pointer.current.active ? pointer.current.ndcX * aspect : 0;
      const targetY = pointer.current.active ? pointer.current.ndcY : 0;
      lead.current.x = damp(lead.current.x, targetX, LEAD_SMOOTHING, dt);
      lead.current.y = damp(lead.current.y, targetY, LEAD_SMOOTHING, dt);

      // Speed of the mark itself, not of the raw pointer. The mark is what is
      // being smeared, so a trail measured from the cursor would start before
      // the mark moves and keep going after it has stopped.
      const previous = last.current;
      const speed =
        previous && dt > 0
          ? Math.hypot(lead.current.x - previous.x, lead.current.y - previous.y) / dt
          : 0;
      last.current = { x: lead.current.x, y: lead.current.y };

      const wanted = reduced ? 0 : clamp(speed / Math.max(full, 0.0001), 0, 1) * longest;
      dampNow.current = damp(dampNow.current, wanted, DAMP_SMOOTHING, dt);

      current.lead.position.set(lead.current.x, lead.current.y, 0);
      for (let i = 0; i < current.orbiters.length; i++) {
        const orbiter = current.orbiters[i];
        if (!orbiter) continue;
        const phase = (i / current.orbiters.length) * Math.PI * 2 + elapsed.current * ORBIT_SPEED;
        orbiter.position.set(
          lead.current.x + Math.cos(phase) * ORBIT_RADIUS,
          lead.current.y + Math.sin(phase) * ORBIT_RADIUS,
          0,
        );
      }

      // Pass 1 — this frame's marks alone, into their own target.
      current.renderer.setRenderTarget(current.frame);
      current.renderer.clear();
      current.renderer.render(current.content, current.contentCamera);

      // Pass 2 — decayed history plus this frame, into the target that is not
      // currently the history. Reading and writing one target in a single pass
      // is undefined in WebGL, which is the entire reason for the swap.
      current.blendUniforms.uCurrent.value = current.frame.texture;
      current.blendUniforms.uHistory.value = current.ping.texture;
      current.blendUniforms.uDamp.value = dampNow.current;
      current.blendUniforms.uCutoff.value = floor;
      current.renderer.setRenderTarget(current.pong);
      current.renderer.render(current.quadScene, current.quadCamera);

      // Pass 3 — the accumulation to the canvas, through a stock material so
      // three performs output colour conversion exactly once.
      current.renderer.setRenderTarget(null);
      current.screenMaterial.map = current.pong.texture;
      current.renderer.render(current.screenScene, current.quadCamera);

      // Swap. The target just written becomes next frame's history.
      const swap = current.ping;
      current.ping = current.pong;
      current.pong = swap;
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
            className="h-24 w-24 rounded-full"
            style={{ background: `radial-gradient(circle, hsl(${hue} 72% 62%), transparent 70%)` }}
          />
        </div>
      ) : null}
    </div>
  );
}
