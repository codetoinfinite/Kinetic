'use client';

import gsap from 'gsap';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { cn } from '@/lib/cn';
import { useDrag } from '@/registry/hooks/use-drag';
import { useInView } from '@/registry/hooks/use-in-view';
import { useLenis } from '@/registry/hooks/use-lenis';
import { useRaf } from '@/registry/hooks/use-raf';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';
import { useResizeObserver } from '@/registry/hooks/use-resize-observer';
import { useSmoothPointer } from '@/registry/hooks/use-smooth-pointer';
import { useVisibility } from '@/registry/hooks/use-visibility';
import { clamp, damp, gaussian, lerp } from '@/registry/lib/damp';
import {
  disposeObject,
  disposeRenderer,
  hasWebGL,
  pixelRatio,
} from '@/registry/lib/webgl';
import { wrapIndex, wrappedOffset } from '@/registry/lib/wrap';
import {
  cylinderGalleryFragmentShader,
  cylinderGalleryVertexShader,
} from '@/registry/shaders/cylinder-gallery';

/* ==========================================================================
   Cylinder Gallery Drum
   --------------------------------------------------------------------------
   A portfolio as a rotating drum: one plane per item, wrapped around the
   inside of a cylinder you are standing in the middle of. The camera never
   moves. Every bit of motion is vertices being repositioned in the vertex
   shader, which is why nineteen planes cost nineteen draw calls and nothing
   else.

   The whole component is four scalars — position, radius, spacing, intro —
   plus one shortest-signed-offset call per plane per frame.
   ========================================================================== */

export interface CylinderGalleryItem {
  /** Stable identity. Also the React key and the texture cache key. */
  id: string;
  /** Shown in the caption and burned into the generated plate. */
  title: string;
  /** Small caption under the title. */
  meta?: string;
  /** Base hue (0-360) for the generated plate. Defaults to an even spread. */
  hue?: number;
}

export interface CylinderGalleryProps {
  items: CylinderGalleryItem[];
  /**
   * `pointer` — the drum consumes wheel and drag inside its own box. Nothing
   * touches the host page's scroll. This is the right default for a gallery
   * embedded in a page.
   *
   * `page` — a shared Lenis instance with `infinite: true` drives the drum
   * from document scroll, which is what the technique looks like when the
   * gallery IS the page.
   */
  drive?: 'pointer' | 'page';
  /** Drum radius in world units. Also scales with scroll velocity. */
  radius?: number;
  /** Full revolutions the ring spans across all items. */
  turns?: number;
  /** Vertical world units between adjacent items. */
  spacing?: number;
  /** Plane subdivisions per axis. The bend is per-vertex, so this is the curve. */
  segments?: number;
  /** Pixels of document scroll per index step, in `page` mode. */
  pixelsPerIndex?: number;
  /** Overall alpha multiplier, before the focus falloff. */
  opacity?: number;
  /** Paint the plate for an item. Default draws a hue ramp plus a numeral. */
  paint?: (
    ctx: CanvasRenderingContext2D,
    item: CylinderGalleryItem,
    index: number,
    size: { width: number; height: number },
  ) => void;
  /** Fired when the focused plane is tapped (a drag never counts as a tap). */
  onSelect?: (item: CylinderGalleryItem, index: number) => void;
  /** Fired whenever a different item takes the centre of the drum. */
  onFocusChange?: (item: CylinderGalleryItem, index: number) => void;
  className?: string;
}

/* --------------------------------------------------------------------------
   Geometry and camera. These four are a matched set: the plane is 1 unit wide
   so its width maps to exactly one radian of the drum, and the camera sits far
   enough back that a 1.95-tall plane still clears the frustum after the barrel
   pulls its edges in.
   -------------------------------------------------------------------------- */
const PLANE_WIDTH = 1;
const PLANE_HEIGHT = 1.95;
const CAMERA_FOV = 45;
const CAMERA_Z = 5;

const TEXTURE_WIDTH = 512;
const TEXTURE_HEIGHT = 1024;
const OVERSCAN = 1.12;

const WHEEL_INDEX_PER_PIXEL = 0.0028;
const DRAG_INDEX_PER_PIXEL = 0.006;
const SNAP_DELAY_MS = 170;
const SNAP_DURATION = 0.75;
const INTRO_DURATION = 1.6;
const INTRO_DELAY = 0.12;

const POSITION_SMOOTHING = 0.0006;
const STRENGTH_SMOOTHING = 0.002;
const VELOCITY_REFERENCE = 5;
const MAX_DEFORM = 1.5;
const DEFORM_PER_INDEX = 0.42;
const RADIUS_VELOCITY_GAIN = 0.5;
const SPACING_VELOCITY_GAIN = 0.35;
const ANGULAR_VELOCITY_GAIN = 0.2;

/** Uniform bag, as a type alias so it keeps its implicit index signature and
 *  is assignable to `ShaderMaterial`'s `{ [name: string]: IUniform }`. */
type PlaneUniforms = {
  uTexture: { value: THREE.Texture | null };
  uTextureAspect: { value: number };
  uPlaneAspect: { value: number };
  uOverscan: { value: number };
  uSpiralAngle: { value: number };
  uRadius: { value: number };
  uIntro: { value: number };
  uFocus: { value: number };
  uOpacity: { value: number };
  uDeform: { value: number };
  uMouseNdc: { value: THREE.Vector2 };
  uMouseStrength: { value: number };
};

interface Plane {
  mesh: THREE.Mesh;
  uniforms: PlaneUniforms;
  texture: THREE.CanvasTexture;
}

interface Stage {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  geometry: THREE.PlaneGeometry;
  planes: Plane[];
}

/* --------------------------------------------------------------------------
   Plates are drawn, never loaded. No image ships with this component and none
   is fetched: a canvas per item, a hue ramp, hairline bands and a numeral.
   The bands matter — a smooth gradient hides every deformation the shader
   applies, so there has to be structure for the wave and the bulge to bend.
   -------------------------------------------------------------------------- */
function paintPlate(
  ctx: CanvasRenderingContext2D,
  item: CylinderGalleryItem,
  index: number,
  size: { width: number; height: number },
): void {
  const { width, height } = size;
  const hue = item.hue ?? (index * 37) % 360;

  const ramp = ctx.createLinearGradient(0, 0, width * 0.65, height);
  ramp.addColorStop(0, `hsl(${hue}, 55%, 12%)`);
  ramp.addColorStop(0.55, `hsl(${hue + 16}, 52%, 33%)`);
  ramp.addColorStop(1, `hsl(${hue + 44}, 68%, 63%)`);
  ctx.fillStyle = ramp;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.13)';
  ctx.lineWidth = Math.max(1, width / 320);
  for (let band = 1; band < 10; band++) {
    const y = (height * band) / 10;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.lineWidth = Math.max(2, width / 96);
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, width - ctx.lineWidth, height - ctx.lineWidth);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.font = `600 ${Math.round(height * 0.3)}px ui-sans-serif, system-ui, sans-serif`;
  ctx.fillText(String(index + 1).padStart(2, '0'), width / 2, height * 0.44);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
  ctx.font = `500 ${Math.round(height * 0.038)}px ui-monospace, SFMono-Regular, monospace`;
  ctx.fillText(item.title.toUpperCase(), width / 2, height * 0.88);
}

type Tween = ReturnType<typeof gsap.to>;

// #region critical
export function CylinderGallery({
  items,
  drive = 'pointer',
  radius = 2,
  turns = 3,
  spacing = 0.8,
  segments = 64,
  pixelsPerIndex = 240,
  opacity = 1,
  paint,
  onSelect,
  onFocusChange,
  className,
}: CylinderGalleryProps) {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage | null>(null);

  const { width, height } = useResizeObserver(host);
  const { inView } = useInView(host, { threshold: 0 });
  const visible = useVisibility();
  const reduced = useReducedMotion();
  const pointer = useSmoothPointer({ target: host, smoothing: 0.0015 });

  // `hasWebGL` touches `document`, so it cannot run during render without
  // disagreeing with the server. Start optimistic and correct after mount:
  // both renders then agree and nothing hydrates twice.
  const [supported, setSupported] = useState(true);
  useEffect(() => setSupported(hasWebGL()), []);

  const [focused, setFocused] = useState(0);

  const position = useRef(0);
  const target = useRef(0);
  const velocity = useRef(0);
  const intro = useRef(0);
  const strength = useRef(0);
  const hovered = useRef(false);
  const focusedRef = useRef(0);
  const snapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snapTween = useRef<Tween | null>(null);

  // Everything the frame loop reads but must not resubscribe on. Written on
  // every render, read once per frame; the loop itself never re-creates.
  const live = useRef({ radius, turns, spacing, opacity, drive, pixelsPerIndex, items, onSelect, onFocusChange });
  live.current = { radius, turns, spacing, opacity, drive, pixelsPerIndex, items, onSelect, onFocusChange };

  // Rebuilding the scene is expensive, so it is keyed on what actually changes
  // the meshes — identity, label and hue — not on the array's reference, which
  // is new on every render for any caller who writes the list inline.
  const itemsKey = items.map((item) => `${item.id}:${item.title}:${item.hue ?? ''}`).join('|');

  const lenis = useLenis({ infinite: true, enabled: drive === 'page' });

  const killSnap = useCallback(() => {
    if (snapTimer.current !== null) {
      clearTimeout(snapTimer.current);
      snapTimer.current = null;
    }
    snapTween.current?.kill();
    snapTween.current = null;
  }, []);

  const scheduleSnap = useCallback(() => {
    if (snapTimer.current !== null) clearTimeout(snapTimer.current);
    snapTimer.current = setTimeout(() => {
      snapTimer.current = null;
      // Snap the TARGET, not the position: the frame loop keeps damping
      // toward it, so the settle stays one continuous motion instead of a
      // second animation fighting the first.
      snapTween.current = gsap.to(target, {
        current: Math.round(target.current),
        duration: SNAP_DURATION,
        ease: 'power3.out',
      });
    }, SNAP_DELAY_MS);
  }, []);

  /* ---- scene construction ------------------------------------------------ */

  const ready = width > 1 && height > 1 && supported;

  useEffect(() => {
    const el = host.current;
    if (!el || !ready || items.length === 0) return;

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
    // Capped, not raw. A 3x phone with an uncapped ratio pays 9x the fill rate
    // for a difference nobody can see.
    renderer.setPixelRatio(pixelRatio());
    renderer.setSize(el.clientWidth, el.clientHeight, false);
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      CAMERA_FOV,
      el.clientWidth / Math.max(el.clientHeight, 1),
      0.1,
      100,
    );
    camera.position.z = CAMERA_Z;

    // One geometry for every plane. The bend is per-vertex, so the mesh has to
    // be dense enough that the curve reads as a curve: below ~24 segments the
    // drum visibly becomes a folded card.
    const geometry = new THREE.PlaneGeometry(PLANE_WIDTH, PLANE_HEIGHT, segments, segments);
    const planeAspect = PLANE_WIDTH / PLANE_HEIGHT;
    const paintItem = paint ?? paintPlate;
    const maxAnisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());

    const planes: Plane[] = items.map((item, index) => {
      const canvas = document.createElement('canvas');
      canvas.width = TEXTURE_WIDTH;
      canvas.height = TEXTURE_HEIGHT;
      const ctx = canvas.getContext('2d');
      if (ctx) paintItem(ctx, item, index, { width: TEXTURE_WIDTH, height: TEXTURE_HEIGHT });

      const texture = new THREE.CanvasTexture(canvas);
      // sRGB in, sRGB out. Skip this and the plates render noticeably darker
      // than the CSS colours sitting next to them.
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = maxAnisotropy;
      texture.needsUpdate = true;

      const uniforms: PlaneUniforms = {
        uTexture: { value: texture },
        uTextureAspect: { value: TEXTURE_WIDTH / TEXTURE_HEIGHT },
        uPlaneAspect: { value: planeAspect },
        uOverscan: { value: OVERSCAN },
        uSpiralAngle: { value: 0 },
        uRadius: { value: radius },
        uIntro: { value: 0 },
        uFocus: { value: 1 },
        uOpacity: { value: opacity },
        uDeform: { value: 0 },
        uMouseNdc: { value: new THREE.Vector2(0, 0) },
        uMouseStrength: { value: 0 },
      };

      // A material per mesh, because every plane needs its own spiralAngle,
      // radius and focus. three keys its program cache on the shader source,
      // so all of these share one compiled program regardless.
      const material = new THREE.ShaderMaterial({
        vertexShader: cylinderGalleryVertexShader,
        fragmentShader: cylinderGalleryFragmentShader,
        uniforms,
        transparent: true,
        side: THREE.DoubleSide,
        // Painted strictly back to front via renderOrder below, so neither
        // depth write nor depth test has anything to contribute — and both
        // would be wrong anyway, since the depth they compare is the depth of
        // a mesh the CPU thinks is still flat at the origin.
        depthWrite: false,
        depthTest: false,
      });

      const mesh = new THREE.Mesh(geometry, material);
      // The CPU-side geometry is a flat plane at mesh.position; the shape you
      // can actually see is somewhere else entirely. Frustum culling compares
      // against that stale bounding sphere and blanks planes that are plainly
      // on screen.
      mesh.frustumCulled = false;
      scene.add(mesh);
      return { mesh, uniforms, texture };
    });

    stage.current = { renderer, scene, camera, geometry, planes };
    renderer.render(scene, camera);

    return () => {
      stage.current = null;
      for (const plane of planes) {
        scene.remove(plane.mesh);
        // disposeObject walks a material's own properties looking for
        // textures. These live inside `uniforms`, two levels down, so it will
        // never find them — they have to be released by hand.
        plane.texture.dispose();
      }
      disposeObject(scene);
      geometry.dispose();
      // dispose() frees GPU objects and leaves the context alive. Only
      // forceContextLoss, which disposeRenderer calls, hands it back.
      disposeRenderer(renderer);
      renderer.domElement.remove();
    };
    // `items` is read through the key; `radius`/`opacity` only seed uniforms
    // the frame loop overwrites immediately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, itemsKey, segments, paint]);

  /* ---- size ------------------------------------------------------------- */

  useEffect(() => {
    const current = stage.current;
    if (!current || width < 1 || height < 1) return;
    current.renderer.setPixelRatio(pixelRatio());
    // `false` — the canvas is sized by CSS at 100%/100%; letting three write
    // inline pixel dimensions makes it fight the flex parent on every resize.
    current.renderer.setSize(width, height, false);
    current.camera.aspect = width / height;
    current.camera.updateProjectionMatrix();
  }, [width, height]);

  /* ---- intro morph ------------------------------------------------------- */

  useEffect(() => {
    if (!ready) return;
    if (reduced) {
      intro.current = 1;
      return;
    }
    intro.current = 0;
    const tween = gsap.to(intro, {
      current: 1,
      duration: INTRO_DURATION,
      delay: INTRO_DELAY,
      ease: 'power3.inOut',
    });
    return () => {
      tween.kill();
    };
  }, [ready, reduced]);

  /* ---- input ------------------------------------------------------------- */

  useEffect(() => {
    const el = host.current;
    if (!el || drive !== 'pointer') return;

    const onWheel = (event: WheelEvent) => {
      // Non-passive on purpose: without preventDefault the drum spins AND the
      // page scrolls under it, which reads as two competing gestures.
      event.preventDefault();
      killSnap();
      target.current += event.deltaY * WHEEL_INDEX_PER_PIXEL;
      scheduleSnap();
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [drive, killSnap, scheduleSnap]);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const enter = () => {
      hovered.current = true;
    };
    const leave = () => {
      hovered.current = false;
    };
    el.addEventListener('pointerenter', enter);
    el.addEventListener('pointerleave', leave);
    return () => {
      el.removeEventListener('pointerenter', enter);
      el.removeEventListener('pointerleave', leave);
    };
  }, []);

  useDrag(host, {
    enabled: drive === 'pointer',
    onDragStart: killSnap,
    onDrag: (state) => {
      target.current -= state.deltaY * DRAG_INDEX_PER_PIXEL;
    },
    onDragEnd: (_state, moved) => {
      if (!moved) {
        const { items: list, onSelect: select } = live.current;
        const index = wrapIndex(Math.round(position.current), list.length);
        const item = list[index];
        if (item) select?.(item, index);
      }
      scheduleSnap();
    },
  });

  useEffect(() => killSnap, [killSnap]);

  /* ---- the frame --------------------------------------------------------- */

  useRaf(
    (dt) => {
      const current = stage.current;
      if (!current) return;
      const {
        radius: baseRadius,
        turns: baseTurns,
        spacing: baseSpacing,
        opacity: alpha,
        drive: mode,
        pixelsPerIndex: perIndex,
        items: list,
        onFocusChange: notify,
      } = live.current;

      const count = current.planes.length;
      if (count === 0) return;

      if (mode === 'page') {
        const instance = lenis.current;
        if (instance) target.current = instance.scroll / Math.max(perIndex, 1);
      }

      const previous = position.current;
      position.current = damp(position.current, target.current, POSITION_SMOOTHING, dt);

      // Index steps per second, smoothed by the same damp that produced the
      // position, so the wave can never lead the geometry it is bending.
      const instant = dt > 0 ? (position.current - previous) / dt : 0;
      velocity.current = damp(velocity.current, instant, 0.002, dt);
      const normalized = clamp(velocity.current / VELOCITY_REFERENCE, -1, 1);

      strength.current = damp(
        strength.current,
        hovered.current && !reduced ? 1 : 0,
        STRENGTH_SMOOTHING,
        dt,
      );

      const s = intro.current;
      const speed = Math.abs(normalized);
      const liveRadius = baseRadius * (1 + RADIUS_VELOCITY_GAIN * speed);
      const liveSpacing = baseSpacing * (1 + SPACING_VELOCITY_GAIN * speed);
      const angularScale = 1 + ANGULAR_VELOCITY_GAIN * speed;
      const deform = reduced
        ? 0
        : clamp(velocity.current * DEFORM_PER_INDEX, -MAX_DEFORM, MAX_DEFORM);

      // The flat-row layout spans the frustum's visible WIDTH at z = 0. Sizing
      // it from window.innerWidth, or from the visible height, leaves the row
      // short on wide viewports and clipped on narrow ones.
      const visibleWidth =
        2 * Math.tan((CAMERA_FOV * Math.PI) / 360) * CAMERA_Z * current.camera.aspect * 0.86;
      const step = visibleWidth / Math.max(count - 1, 1);
      const rowWidth = (count - 1) * step;

      const mx = pointer.current.active ? pointer.current.ndcX : 0;
      const my = pointer.current.active ? pointer.current.ndcY : 0;

      for (let i = 0; i < count; i++) {
        const plane = current.planes[i];
        if (!plane) continue;

        // The one call that makes a finite array behave like an infinite ring:
        // item 0 is one step BEFORE item 18, not eighteen steps after it.
        const offset = wrappedOffset(i, position.current, count);
        const angle = (offset / count) * Math.PI * 2 * baseTurns * angularScale;
        const y = -offset * liveSpacing;

        plane.mesh.position.x = (i * step - rowWidth / 2) * (1 - s);
        plane.mesh.position.y = y * s;
        plane.mesh.scale.setScalar(lerp(0.62, 1, s));

        const u = plane.uniforms;
        u.uSpiralAngle.value = angle;
        u.uRadius.value = liveRadius;
        u.uIntro.value = s;
        u.uDeform.value = deform;
        u.uOpacity.value = alpha;
        u.uMouseStrength.value = strength.current;
        u.uMouseNdc.value.set(mx, my);
        // exp(-d²): 1.000 at the centre, 0.368 one step out, 0.018 two, 0.0001
        // three. Continuous, branchless, and the reason the drum reads as
        // analogue rather than as a list with a selected row.
        u.uFocus.value = lerp(1, gaussian(offset), s);

        // Transparent meshes are sorted by three using the CPU position, which
        // for this drum is (0, y, 0) for every plane. Reconstructing the depth
        // the shader will actually produce and painting back to front is the
        // only way the far side of the ring stays behind the near side.
        const worldZ = liveRadius * Math.cos(angle) * s;
        plane.mesh.renderOrder = Math.round(-worldZ * 1000);
      }

      const nextFocus = wrapIndex(Math.round(position.current), count);
      if (nextFocus !== focusedRef.current) {
        focusedRef.current = nextFocus;
        setFocused(nextFocus);
        const item = list[nextFocus];
        if (item) notify?.(item, nextFocus);
      }

      current.renderer.render(current.scene, current.camera);
    },
    ready && inView && visible,
  );
  // #endregion critical

  const focusedItem = items[wrapIndex(focused, Math.max(items.length, 1))];

  const fallback = useMemo(
    () => (
      <div className="flex h-full w-full items-center justify-center">
        <ol className="flex max-w-full gap-px overflow-hidden">
          {items.slice(0, 7).map((item, index) => (
            <li
              key={item.id}
              className="flex h-28 w-10 shrink-0 items-end justify-center pb-2 text-[10px] text-fg/70"
              style={{
                background: `linear-gradient(160deg, hsl(${item.hue ?? (index * 37) % 360} 55% 14%), hsl(${(item.hue ?? (index * 37) % 360) + 44} 68% 55%))`,
              }}
            >
              {String(index + 1).padStart(2, '0')}
            </li>
          ))}
        </ol>
      </div>
    ),
    [items],
  );

  return (
    <div className={cn('relative h-full w-full overflow-hidden', className)}>
      <div
        ref={host}
        className="absolute inset-0 touch-none select-none"
        style={{ cursor: drive === 'pointer' ? 'grab' : 'default' }}
      />
      {!supported ? fallback : null}
      {focusedItem ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-4">
          <p className="text-sm tracking-tight text-fg">{focusedItem.title}</p>
          <p className="meta">{focusedItem.meta ?? `${focused + 1} / ${items.length}`}</p>
        </div>
      ) : null}
    </div>
  );
}
