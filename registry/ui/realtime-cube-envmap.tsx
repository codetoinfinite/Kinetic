'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { cn } from '@/lib/cn';
import { useInView } from '@/registry/hooks/use-in-view';
import { useRaf } from '@/registry/hooks/use-raf';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';
import { useResizeObserver } from '@/registry/hooks/use-resize-observer';
import { useVisibility } from '@/registry/hooks/use-visibility';
import {
  disposeObject,
  disposeRenderer,
  hasWebGL,
  pixelRatio,
} from '@/registry/lib/webgl';

/* ==========================================================================
   Realtime Cube EnvMap
   --------------------------------------------------------------------------
   A metal object that reflects a scene which is itself moving. There is no
   HDRI, no .env file, no loader: a `CubeCamera` sitting inside the object
   renders the six faces around it every frame, and that cube texture is
   assigned straight onto the material as its `envMap`.

   Two things make it work rather than merely run:

     1. The reflector is hidden for the duration of the capture. A mirror that
        can see itself captures its own previous frame, and the next capture
        includes that, so the surface fills with a recursive tunnel of dark
        shells within about a second.
     2. The capture is throttled independently of the render. Six faces is
        six scene renders; the visible pass is one. Refreshing the cube on
        alternate frames halves the cost of the whole component and, because
        an env map is sampled by direction and not by position, a one-frame-old
        reflection is not observable on motion this slow.
   ========================================================================== */

export interface RealtimeCubeEnvmapProps {
  /** Reflector silhouette. The knot has more curvature, so it reflects more. */
  shape?: 'knot' | 'icosahedron';
  /** Emitting panels arranged around the object. These are the reflection. */
  panelCount?: number;
  /** Ring radius in world units. The reflector is ~1.4 units across. */
  panelRadius?: number;
  /** Panel ring rotation, radians per second. */
  spinSpeed?: number;
  /** Reflector rotation, radians per second about Y. */
  objectSpin?: number;
  /** Cube face size in pixels. Cost is 6 x resolution². */
  resolution?: number;
  /** Capture the cube map every Nth frame. 1 = every frame. */
  refreshEvery?: number;
  /** Surface roughness. Above ~0.3 the reflection stops being readable. */
  roughness?: number;
  /** 1 is a mirror, 0 is a diffuse surface lit only by the env map. */
  metalness?: number;
  /** Multiplier on the reflected light. Above ~2 the highlights clip flat. */
  envMapIntensity?: number;
  /** Base hue for the panels, degrees. */
  hue?: number;
  className?: string;
}

interface Stage {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  cubeTarget: THREE.WebGLCubeRenderTarget;
  /** Frames the container aspect, then redraws — a resize must not go stale. */
  resize: (width: number, height: number) => void;
  /** `forceCapture` bypasses the refresh throttle, for the first frame. */
  draw: (elapsed: number, forceCapture: boolean) => void;
}

/**
 * Camera distance at aspect >= 1. Chosen so a 1.4-unit reflector fills roughly
 * two thirds of the frame height at a 34 degree field of view.
 */
const BASE_DISTANCE = 7.2;
const FIELD_OF_VIEW = 34;

/**
 * Pose used when motion is suppressed. Deliberately not 0: at elapsed 0 the
 * knot is axis-aligned and the panels sit on the cardinal directions, which
 * reads as a technical diagram rather than a lit object.
 */
const STATIC_POSE = 0.9;

/** Vertical gradient for the surrounding shell. 4px wide — it never varies in u. */
function makeShellTexture(hue: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const ramp = ctx.createLinearGradient(0, 0, 0, 256);
  ramp.addColorStop(0, `hsl(${hue + 8}, 22%, 26%)`);
  ramp.addColorStop(0.46, `hsl(${hue}, 16%, 11%)`);
  ramp.addColorStop(1, 'hsl(0, 0%, 4%)');
  ctx.fillStyle = ramp;
  ctx.fillRect(0, 0, 4, 256);
  return canvas;
}

// #region critical
export function RealtimeCubeEnvmap({
  shape = 'knot',
  panelCount = 7,
  panelRadius = 4.2,
  spinSpeed = 0.18,
  objectSpin = 0.32,
  resolution = 256,
  refreshEvery = 2,
  roughness = 0.08,
  metalness = 1,
  envMapIntensity = 1.4,
  hue = 208,
  className,
}: RealtimeCubeEnvmapProps) {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage | null>(null);

  const { width, height } = useResizeObserver(host);
  const { inView } = useInView(host, { threshold: 0 });
  const visible = useVisibility();
  const reduced = useReducedMotion();

  const [supported, setSupported] = useState(true);
  useEffect(() => setSupported(hasWebGL()), []);

  const size = useRef({ width, height });
  size.current = { width, height };

  const ready = width > 1 && height > 1 && supported;

  useEffect(() => {
    const el = host.current;
    if (!el || !ready) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
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
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(FIELD_OF_VIEW, 1, 0.1, 60);
    camera.position.set(0, 0.35, BASE_DISTANCE);
    camera.lookAt(0, 0, 0);

    // The shell is the environment's floor and sky in one object: a sphere
    // turned inside out. It is what the cube camera sees in every direction
    // the panels do not cover, so without it the reflection has large holes of
    // clear-colour black and the object reads as unlit rather than dark.
    const shellTexture = new THREE.CanvasTexture(makeShellTexture(hue));
    shellTexture.colorSpace = THREE.SRGBColorSpace;
    const shellGeometry = new THREE.SphereGeometry(16, 32, 16);
    const shellMaterial = new THREE.MeshBasicMaterial({
      map: shellTexture,
      side: THREE.BackSide,
    });
    scene.add(new THREE.Mesh(shellGeometry, shellMaterial));

    // Panels. Their arrangement is a pure function of the index — there is no
    // random scatter here, so there is no seed to keep in step between the
    // server render and the client one.
    const ring = new THREE.Group();
    const panelGeometry = new THREE.PlaneGeometry(1.5, 3.4);
    const panelMaterials: THREE.MeshBasicMaterial[] = [];
    const count = Math.max(2, Math.round(panelCount));

    for (let i = 0; i < count; i += 1) {
      const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
      // Alternating bright and near-black panels. An environment that is
      // uniformly bright gives a mirror nothing to contrast against and the
      // metal reads as matte plastic; the dark panels are what draw the
      // specular edges.
      const bright = i % 2 === 0;
      material.color.setHSL(
        ((hue + i * 26) % 360) / 360,
        bright ? 0.66 : 0.4,
        bright ? 0.62 : 0.08,
      );
      panelMaterials.push(material);

      const panel = new THREE.Mesh(panelGeometry, material);
      const angle = (i / count) * Math.PI * 2;
      // Golden-angle stagger on the height, so the panels do not sit in a
      // single band and the reflection has vertical structure to move through.
      const lift = Math.sin(i * 2.39996) * 0.9;
      panel.position.set(
        Math.sin(angle) * panelRadius,
        lift,
        Math.cos(angle) * panelRadius,
      );
      panel.lookAt(0, 0, 0);
      ring.add(panel);
    }
    scene.add(ring);

    const reflectorGeometry =
      shape === 'knot'
        ? new THREE.TorusKnotGeometry(0.92, 0.31, 220, 32)
        : new THREE.IcosahedronGeometry(1.35, 2);

    // Mipmaps are not optional here. `roughness` selects a mip level of the
    // env map, so a cube target without them samples level 0 at every
    // roughness and the surface stays a hard mirror no matter what you pass.
    const cubeTarget = new THREE.WebGLCubeRenderTarget(Math.max(16, Math.round(resolution)), {
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
    });
    const cubeCamera = new THREE.CubeCamera(0.1, 60, cubeTarget);
    // Co-located with the reflector: an env map is sampled by direction, so
    // the capture point is the only position information it carries. Offset it
    // and the reflections belong to a different object.
    cubeCamera.position.set(0, 0, 0);
    scene.add(cubeCamera);

    const material = new THREE.MeshPhysicalMaterial({
      metalness,
      roughness,
      envMapIntensity,
      // Assigned to the material rather than `scene.environment` on purpose.
      // A live capture belongs to one object at one point in space; sharing it
      // scene-wide would give every reflector the same viewpoint.
      envMap: cubeTarget.texture,
      color: 0xffffff,
    });
    const reflector = new THREE.Mesh(reflectorGeometry, material);
    scene.add(reflector);

    const throttle = Math.max(1, Math.round(refreshEvery));
    let frames = 0;

    const draw = (elapsed: number, forceCapture: boolean) => {
      ring.rotation.y = elapsed * spinSpeed;
      reflector.rotation.y = elapsed * objectSpin;
      reflector.rotation.x = elapsed * objectSpin * 0.55;

      frames += 1;
      if (forceCapture || frames % throttle === 0) {
        // Hide, capture, show — in that order, inside one frame. Skipping the
        // hide is the classic version of this bug: the object captures itself
        // and within a second the surface is a recursive tunnel.
        reflector.visible = false;
        cubeCamera.update(renderer, scene);
        reflector.visible = true;
      }

      renderer.render(scene, camera);
    };

    const resize = (w: number, h: number) => {
      if (w < 1 || h < 1) return;
      const aspect = w / h;
      renderer.setPixelRatio(pixelRatio());
      renderer.setSize(w, h, false);
      camera.aspect = aspect;
      // Pull the camera back on narrow containers. A fixed distance frames the
      // object on height alone, so a portrait preview clips the panel ring off
      // both sides and the reflections lose their source.
      camera.position.z = BASE_DISTANCE / Math.min(1, aspect);
      camera.updateProjectionMatrix();
    };

    resize(size.current.width, size.current.height);
    stage.current = { renderer, scene, camera, cubeTarget, resize, draw };
    // First frame forces a capture: with an empty cube map a metal surface is
    // pure black, and on a throttled refresh that black would be on screen for
    // `refreshEvery` frames.
    draw(STATIC_POSE, true);

    return () => {
      stage.current = null;
      scene.remove(cubeCamera);
      // Order matters: free the scene graph's GPU objects while the context is
      // still alive, then hand the context itself back.
      disposeObject(scene);
      shellTexture.dispose();
      shellGeometry.dispose();
      shellMaterial.dispose();
      panelGeometry.dispose();
      for (const panelMaterial of panelMaterials) panelMaterial.dispose();
      reflectorGeometry.dispose();
      material.dispose();
      // The cube target is not in the scene graph, so nothing above reaches
      // it. It holds six faces plus their mip chain — at 256px that is about
      // 2 MB of GPU memory per instance.
      cubeTarget.dispose();
      disposeRenderer(renderer);
      renderer.domElement.remove();
    };
  }, [
    ready,
    shape,
    panelCount,
    panelRadius,
    spinSpeed,
    objectSpin,
    resolution,
    refreshEvery,
    roughness,
    metalness,
    envMapIntensity,
    hue,
  ]);

  // Resize in its own effect: a container reflow costs a `setSize` and one
  // redraw rather than a rebuild of the geometry and the cube target.
  useEffect(() => {
    const current = stage.current;
    if (!current) return;
    current.resize(width, height);
    current.draw(STATIC_POSE, true);
  }, [width, height, reduced]);

  useRaf(
    (_dt, elapsed) => stage.current?.draw(elapsed, false),
    ready && inView && visible && !reduced,
  );
  // #endregion critical

  return (
    <div className={cn('relative h-full w-full overflow-hidden bg-bg', className)}>
      <div ref={host} className="absolute inset-0" />
      {!supported ? (
        <div className="absolute inset-0 grid place-items-center">
          <div
            className="h-2/5 w-2/5 rounded-full"
            style={{
              background: `radial-gradient(circle at 34% 28%, hsl(${hue} 30% 82%), hsl(${hue} 24% 34%) 46%, hsl(${hue} 20% 8%) 100%)`,
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
