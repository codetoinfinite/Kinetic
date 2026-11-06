'use client';

import gsap from 'gsap';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import { cn } from '@/lib/cn';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';
import { disposeRenderer, hasWebGL, pixelRatio } from '@/registry/lib/webgl';
import { wrappedOffset } from '@/registry/lib/wrap';

/* ==========================================================================
   Exit Warp Before Navigate
   --------------------------------------------------------------------------
   A ring of cards idles in front of the camera. Choosing one does not
   navigate — it plays a four-stage exit and navigates at the end of it:

     1. DOM chrome fades and lifts        (0.5 s, power2.out, 0.05 stagger)
     2. 0.1 s before that ends, the ring warps  (1.4 s, expo.in)
     3. one settle frame                  (50 ms)
     4. the route actually changes

   `expo.in` is the whole reason it reads as falling into the destination
   rather than as a cut: the first ~700 ms barely move, so your eye stays on
   the card you picked while the caption leaves, and the last ~400 ms cover
   almost the entire distance. The acceleration IS the transition.
   ========================================================================== */

export interface WarpItem {
  id: string;
  label: string;
}

export interface ExitWarpNavigationProps {
  items: WarpItem[];
  /** Called after the warp finishes. Do the `router.push` here. */
  onNavigate: (id: string) => void;
  /** Chrome drawn over the canvas. Descendants marked `data-warp-chrome` leave first. */
  children?: ReactNode;
  /** Warp length in seconds. */
  duration?: number;
  /** How many ring slots the drum is shoved forward during the warp. */
  shove?: number;
  className?: string;
}

const CHROME_DURATION = 0.5;
const CHROME_STAGGER = 0.05;
const WARP_CUE = 0.4;
const FADE_STAGGER = 0.03;
const SETTLE_MS = 50;

const IDLE_SPEED = 0.16;
const REST_RADIUS = 2.3;
const REST_SPACING = 0.8;
const WARP_SPACING = 10;
const WARP_HSPACING = 3;
const WARP_RADIUS = 0.6;
const Y_PER_SLOT = 0.12;

const CARD_W = 320;
const CARD_H = 200;

/* --------------------------------------------------------------------------
   Card artwork, drawn at runtime. No image ships with this component and none
   is fetched: the texture is a canvas gradient plus the item's own label, so
   the ring always has as many distinct faces as the caller has routes.
   -------------------------------------------------------------------------- */
function drawCard(label: string, index: number, count: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const hue = (index / Math.max(count, 1)) * 300 + 200;
  const grad = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
  grad.addColorStop(0, `hsl(${hue % 360} 45% 22%)`);
  grad.addColorStop(1, `hsl(${(hue + 40) % 360} 35% 8%)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, CARD_W - 2, CARD_H - 2);

  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '500 18px ui-monospace, monospace';
  ctx.fillText(String(index + 1).padStart(2, '0'), 20, 36);

  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = '500 26px ui-monospace, monospace';
  ctx.fillText(label.slice(0, 16), 20, CARD_H - 26);

  return canvas;
}

interface Warp {
  position: number;
  spacing: number;
  hSpacing: number;
  radius: number;
}

interface Bundle {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  geometry: THREE.PlaneGeometry;
  meshes: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[];
  textures: THREE.CanvasTexture[];
  state: Warp;
  exiting: boolean;
}

export function ExitWarpNavigation({
  items,
  onNavigate,
  children,
  duration = 1.4,
  shove = 30,
  className,
}: ExitWarpNavigationProps) {
  const host = useRef<HTMLDivElement>(null);
  const chrome = useRef<HTMLDivElement>(null);
  const bundle = useRef<Bundle | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  /* The exit timeline, so it can be killed. It schedules its real work at
     `WARP_CUE` rather than running it immediately, which means an unmount
     between the click and the cue used to leave a live timeline holding a
     callback that tweened disposed materials and then navigated the app. */
  const exitTl = useRef<gsap.core.Timeline | null>(null);
  /* Exit latch. `bundle.exiting` cannot do this job on its own: on the no-GL
     path there is no bundle, so `b?.exiting` is `undefined` and every extra
     click started another crossfade with another `onNavigate` on the end. */
  const exiting = useRef(false);
  const [fallback, setFallback] = useState(false);
  const reduced = useReducedMotion();

  const navigate = useRef(onNavigate);
  navigate.current = onNavigate;

  const ids = items.map((i) => i.id).join('|');

  // #region critical
  useEffect(() => {
    const el = host.current;
    if (!el) return;

    // Checked in an effect, never during render: `hasWebGL()` needs `document`
    // and returning different markup on the server than on the client is a
    // hydration mismatch, not a graceful degradation.
    if (!hasWebGL() || reduced) {
      setFallback(true);
      return;
    }
    setFallback(false);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      // A context can still be refused between the probe and the construction —
      // the tab may have hit the browser's live-context ceiling in between. three
      // throws rather than returning null, and an uncaught throw here takes the
      // page with it.
      setFallback(true);
      return;
    }
    renderer.setPixelRatio(pixelRatio(2));
    renderer.setClearAlpha(0);
    el.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = 'display:block;width:100%;height:100%';

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 60);

    const geometry = new THREE.PlaneGeometry(1, CARD_H / CARD_W);
    const meshes: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[] = [];
    const textures: THREE.CanvasTexture[] = [];

    items.forEach((item, i) => {
      const texture = new THREE.CanvasTexture(drawCard(item.label, i, items.length));
      texture.colorSpace = THREE.SRGBColorSpace;
      textures.push(texture);
      const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);
      meshes.push(mesh);
    });

    const state: Warp = {
      position: 0,
      spacing: REST_SPACING,
      hSpacing: 1,
      radius: REST_RADIUS,
    };

    /* One layout function, driven by four scalars. The idle loop and the exit
       tween both call it; there is no second code path that could disagree
       about where a card belongs. */
    const layout = () => {
      const count = meshes.length;
      const step = count > 0 ? (Math.PI * 2) / count : 0;
      for (let i = 0; i < count; i += 1) {
        const mesh = meshes[i];
        if (!mesh) continue;
        const offset = wrappedOffset(i, state.position, count);
        const angle = offset * step * state.hSpacing;
        mesh.position.set(
          Math.sin(angle) * state.radius,
          offset * state.spacing * Y_PER_SLOT,
          Math.cos(angle) * state.radius - state.radius,
        );
        mesh.rotation.y = angle;
      }
    };

    const resize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // Pull the camera back on narrow boxes so the ring never grows wider
      // than the frame; a fixed z crops the front card on a phone.
      camera.position.z = 3.2 * Math.max(1, 1.35 / camera.aspect);
      camera.updateProjectionMatrix();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();
    layout();

    let last = 0;
    renderer.setAnimationLoop((time) => {
      const dt = last === 0 ? 0 : Math.min((time - last) / 1000, 0.05);
      last = time;
      const b = bundle.current;
      if (b && !b.exiting) {
        // Seconds, not frames: a per-frame increment idles twice as fast on a
        // 120 Hz display as it does on 60 Hz.
        state.position += dt * IDLE_SPEED;
        layout();
      }
      renderer.render(scene, camera);
    });

    bundle.current = { renderer, scene, camera, geometry, meshes, textures, state, exiting: false };

    return () => {
      observer.disconnect();
      // A rebuild — the caller changed the item ids — must not leave the latch
      // set, or every button on the new ring is dead for the life of the page.
      exitTl.current?.kill();
      exitTl.current = null;
      exiting.current = false;
      gsap.killTweensOf(state);
      for (const mesh of meshes) gsap.killTweensOf(mesh.material);
      // disposeRenderer stops the animation loop first: a queued frame that
      // renders into a context we just released throws out of cleanup.
      disposeRenderer(renderer);
      for (const mesh of meshes) mesh.material.dispose();
      for (const texture of textures) texture.dispose();
      geometry.dispose();
      renderer.domElement.remove();
      bundle.current = null;
    };
    // `ids` stands in for `items` so a caller passing a fresh array literal
    // every render does not rebuild the whole scene each time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids, reduced]);

  const start = useCallback(
    (id: string) => {
      const b = bundle.current;
      const chromeEl = chrome.current;

      // Re-entrancy guard. Without it a double click starts two warps that
      // tween the same scalars in opposite directions and the ring jitters —
      // and on the no-GL branch below, two crossfades each ending in their own
      // `onNavigate`.
      if (exiting.current) return;
      exiting.current = true;

      const chromeTargets = chromeEl
        ? Array.from(chromeEl.querySelectorAll<HTMLElement>('[data-warp-chrome]'))
        : [];

      if (!b) {
        // No GL: the static crossfade. Same shape, no warp.
        const target = chromeTargets.length > 0 ? chromeTargets : chromeEl;
        if (target) {
          // On the same ref as the GL path's timeline, so one kill on unmount
          // covers both branches — and this is the branch the build effect
          // returns early from, so it has no cleanup of its own.
          exitTl.current = gsap.timeline().to(target, {
            opacity: 0,
            duration: reduced ? 0.15 : 0.3,
            ease: 'power2.out',
            onComplete: () => navigate.current(id),
          });
        } else {
          navigate.current(id);
        }
        return;
      }

      b.exiting = true;
      const state = b.state;

      const tl = gsap.timeline();
      exitTl.current = tl;
      if (chromeTargets.length > 0) {
        tl.to(chromeTargets, {
          opacity: 0,
          y: -20,
          duration: CHROME_DURATION,
          ease: 'power2.out',
          stagger: CHROME_STAGGER,
        });
      }

      // Absolute position: the warp starts 0.1 s before the chrome finishes
      // leaving, so the two overlap into one gesture instead of reading as
      // "text goes, then something else happens".
      tl.call(
        () => {
          gsap.to(state, {
            position: state.position + shove,
            spacing: WARP_SPACING,
            hSpacing: WARP_HSPACING,
            radius: WARP_RADIUS,
            duration,
            ease: 'expo.in',
            onComplete: () => {
              // One more frame before the route changes. GSAP's onComplete
              // fires on the same frame the tween ends, so navigating here
              // shows a single frame of the un-warped ring.
              const t = setTimeout(() => navigate.current(id), SETTLE_MS);
              timers.current.push(t);
            },
          });
          for (let i = 0; i < b.meshes.length; i += 1) {
            const mesh = b.meshes[i];
            if (!mesh) continue;
            gsap.to(mesh.material, {
              opacity: 0,
              duration: 1,
              ease: 'power2.in',
              delay: FADE_STAGGER * i,
            });
          }
        },
        undefined,
        WARP_CUE,
      );
    },
    [duration, shove, reduced],
  );
  // #endregion critical

  useEffect(
    () => () => {
      for (const t of timers.current) clearTimeout(t);
      timers.current = [];
      // The timeline's real work is scheduled at `WARP_CUE`, a second or so
      // after the click. Unmount in that gap and the callback still ran: it
      // tweened materials the build effect had already disposed and then queued
      // a `navigate` that arrived with the component gone.
      exitTl.current?.kill();
      exitTl.current = null;
    },
    [],
  );

  return (
    <div className={cn('relative h-full w-full overflow-hidden', className)}>
      <div ref={host} className="absolute inset-0" aria-hidden />

      {fallback ? (
        <div className="absolute inset-0 grid grid-cols-2 content-center gap-2 p-4 sm:grid-cols-3">
          {items.map((item, i) => (
            <div
              key={item.id}
              className="flex aspect-[16/10] flex-col justify-end rounded-md border border-line bg-linear-to-br from-surface to-bg p-2"
            >
              <span className="meta text-faint">{String(i + 1).padStart(2, '0')}</span>
              <span className="meta text-fg">{item.label}</span>
            </div>
          ))}
        </div>
      ) : null}

      <div ref={chrome} className="absolute inset-0 flex flex-col justify-between p-4">
        {children}
        <div className="flex flex-wrap gap-x-4 gap-y-1" data-warp-chrome>
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => start(item.id)}
              className="meta transition-colors hover:text-accent"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
