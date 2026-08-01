'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { cn } from '@/lib/cn';
import { useInView } from '@/registry/hooks/use-in-view';
import { useRaf } from '@/registry/hooks/use-raf';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';
import { useResizeObserver } from '@/registry/hooks/use-resize-observer';
import { useVisibility } from '@/registry/hooks/use-visibility';
import { clamp } from '@/registry/lib/damp';
import { disposeRenderer, hasWebGL, pixelRatio } from '@/registry/lib/webgl';
import {
  MULTIPASS_BLOOM_FRAG,
  MULTIPASS_COMPOSITE_FRAG,
  MULTIPASS_DISC_FRAG,
  MULTIPASS_DISC_VERT,
  MULTIPASS_FLAT_VERT,
  MULTIPASS_RAMP_FRAG,
} from '@/registry/shaders/multipass-offscreen-composite';

/* ==========================================================================
   Multipass Offscreen Composite
   --------------------------------------------------------------------------
   A hero field assembled from four passes into two render targets, where the
   canvas is written exactly once, by the last pass.

     1. an angled three-stop ramp        -> scene target (cleared)
     2. three additive gradient discs    -> scene target (NOT cleared)
     3. bright-pass + tent blur          -> bloom target at half size
     4. scene + bloom + vignette + dither -> canvas

   The discipline that makes this work is 'renderer.autoClear = false'. three
   clears before every render() by default, so pass 2 would wipe pass 1 and the
   layering would silently collapse into whatever was drawn last. With autoClear
   off, clearing is something this component does deliberately, once per target.

   Why offscreen at all, when passes 1 and 2 could draw straight to the canvas:
   the bright-pass needs the accumulated image as an input, and a colour buffer
   cannot be sampled while it is bound. Everything else — HDR headroom for
   additive overlap, a half-size blur, one dither at the end — follows from
   owning the intermediate buffer.
   ========================================================================== */

export interface MultipassOffscreenCompositeProps {
  /**
   * Scroll-style progress, 0..1. The fills bloom in over the last 30% of it;
   * below REVEAL_START only the ramp is visible.
   */
  reveal?: number;
  /** How much of the blurred bright-pass is added back in pass 4. */
  bloomStrength?: number;
  /** Luminance where the bright-pass starts contributing. */
  bloomThreshold?: number;
  /** Bloom target size relative to the scene target. */
  bloomScale?: number;
  /** Corner darkening in the composite, 0..1. */
  vignette?: number;
  /** Multiplier on the fills' drift speed. */
  drift?: number;
  /** Ramp direction in degrees, measured counter-clockwise from +x. */
  rampAngle?: number;
  /** Ramp stops: start, bend, end. */
  rampColors?: readonly [string, string, string];
  /** The three additive fills. */
  fillColors?: readonly [string, string, string];
  /** Device pixel ratio cap. Four passes at 3x is a lot of fragments. */
  maxDpr?: number;
  className?: string;
}

/* Module scope, so a caller that omits the prop gets a stable identity and the
   effect below does not tear the whole GL stack down on every render. */
const RAMP_COLORS = ['#0a0f1a', '#16283c', '#070a12'] as const;
const FILL_COLORS = ['#3f7ae0', '#2fd0b4', '#a866f0'] as const;

/** From the source: fills come in over p = 0.7 -> 0.9 and hold. */
const REVEAL_START = 0.7;
const REVEAL_SPAN = 0.2;

/** Blur reach in bloom-target texels. Above ~2 the 3x3 tent starts to alias. */
const BLOOM_RADIUS = 1.4;

/** ~1/255. Enough to break an 8-bit band, below the threshold of visible noise. */
const DITHER = 0.004;

/** Gaussian tightness of a fill. Higher is a smaller, harder core. */
const DISC_SOFTNESS = 3.1;

/** Fills are round in their own plane; the plane is tilted, so they read squashed. */
const DISC_SQUASH = 0.62;
const PLANE_TILT = -0.19;

/** Frame drawn when motion is suppressed — mid-drift, so the composition is not degenerate. */
const STATIC_ELAPSED = 6.2;

interface DiscSpec {
  /** Orbit radius in world units (half-height = 1). */
  radius: number;
  /** Diameter in world units before the squash. */
  size: number;
  /** Revolutions per second; negative counter-rotates. */
  speed: number;
  /** Starting angle in radians. */
  phase: number;
  /** Peak alpha at full reveal. */
  intensity: number;
}

const DISCS: readonly DiscSpec[] = [
  { radius: 0.6, size: 1.5, speed: 0.05, phase: 0, intensity: 0.62 },
  { radius: 0.42, size: 1.05, speed: -0.08, phase: 2.1, intensity: 0.5 },
  { radius: 0.78, size: 0.8, speed: 0.11, phase: 4.35, intensity: 0.36 },
];

interface RampUniforms {
  [name: string]: THREE.IUniform;
  uResolution: THREE.IUniform<THREE.Vector2>;
  uAngle: THREE.IUniform<number>;
  uColorA: THREE.IUniform<THREE.Color>;
  uColorB: THREE.IUniform<THREE.Color>;
  uColorC: THREE.IUniform<THREE.Color>;
}

interface DiscUniforms {
  [name: string]: THREE.IUniform;
  uColor: THREE.IUniform<THREE.Color>;
  uIntensity: THREE.IUniform<number>;
  uSoftness: THREE.IUniform<number>;
}

interface BloomUniforms {
  [name: string]: THREE.IUniform;
  uSource: THREE.IUniform<THREE.Texture | null>;
  uTexel: THREE.IUniform<THREE.Vector2>;
  uThreshold: THREE.IUniform<number>;
  uRadius: THREE.IUniform<number>;
}

interface CompositeUniforms {
  [name: string]: THREE.IUniform;
  uScene: THREE.IUniform<THREE.Texture | null>;
  uBloom: THREE.IUniform<THREE.Texture | null>;
  uResolution: THREE.IUniform<THREE.Vector2>;
  uBloomStrength: THREE.IUniform<number>;
  uVignette: THREE.IUniform<number>;
  uDither: THREE.IUniform<number>;
}

interface Stage {
  resize(width: number, height: number): void;
  draw(elapsed: number): void;
}

function makeTarget(width: number, height: number): THREE.WebGLRenderTarget {
  return new THREE.WebGLRenderTarget(width, height, {
    // Half float. Three additive fills overlap past 1.0, and on an unsigned
    // byte target that overlap clips flat before the bright-pass ever sees it —
    // the bloom then has no idea where the image was actually hot.
    type: THREE.HalfFloatType,
    // Linear, unlike a ping-pong trail. The bloom pass samples this at half
    // resolution, so bilinear filtering is doing a free 2x2 box downsample on
    // every tap; nearest would make the blur crawl on sub-pixel motion.
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    // Nothing here is depth-sorted: the passes are ordered by hand and the
    // fills are additive. A depth buffer would be width x height x 3 bytes of
    // bandwidth per pass for nothing.
    depthBuffer: false,
    stencilBuffer: false,
  });
}

// #region critical
export function MultipassOffscreenComposite({
  reveal = 1,
  bloomStrength = 0.85,
  bloomThreshold = 0.34,
  bloomScale = 0.5,
  vignette = 0.38,
  drift = 1,
  rampAngle = 141,
  rampColors = RAMP_COLORS,
  fillColors = FILL_COLORS,
  maxDpr = 2,
  className,
}: MultipassOffscreenCompositeProps) {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage | null>(null);

  const { width, height } = useResizeObserver(host);
  const { inView } = useInView(host, { threshold: 0 });
  const visible = useVisibility();
  const reduced = useReducedMotion();

  const [supported, setSupported] = useState(true);
  useEffect(() => setSupported(hasWebGL()), []);

  /* Everything that only feeds a uniform lives here and is read inside the
     draw loop. None of it belongs in the effect's dependency list: rebuilding
     two render targets because a vignette changed by 0.01 would drop frames. */
  const live = useRef({ reveal, bloomStrength, bloomThreshold, vignette, drift });
  live.current = { reveal, bloomStrength, bloomThreshold, vignette, drift };

  const ready = width > 1 && height > 1 && supported;

  /* Joined, not spread. Array props are compared by identity, so an inline
     literal would be a new value every render and the effect would thrash. */
  const colorKey = `${rampColors.join('|')}/${fillColors.join('|')}`;

  useEffect(() => {
    const el = host.current;
    if (!el || !ready) return;

    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      // Opaque. Pass 4 covers every pixel with alpha 1, so an alpha channel
      // would only cost bandwidth and force the compositor to blend.
      alpha: false,
      depth: false,
      stencil: false,
    });
    renderer.setPixelRatio(pixelRatio(maxDpr));
    renderer.setSize(el.clientWidth, el.clientHeight, false);
    renderer.setClearColor(0x000000, 1);
    // The single most important line in the file. See the header.
    renderer.autoClear = false;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    el.appendChild(renderer.domElement);

    const buffer = new THREE.Vector2();
    renderer.getDrawingBufferSize(buffer);
    const bufferW = Math.max(2, Math.round(buffer.x));
    const bufferH = Math.max(2, Math.round(buffer.y));
    const bloomW = Math.max(2, Math.round(bufferW * bloomScale));
    const bloomH = Math.max(2, Math.round(bufferH * bloomScale));

    const sceneTarget = makeTarget(bufferW, bufferH);
    const bloomTarget = makeTarget(bloomW, bloomH);

    // Two cameras. The flat one is for the clip-space quads, whose vertex
    // shader ignores both matrices; the ortho one gives the fills a stable
    // -aspect..aspect x -1..1 space to move in.
    const flatCamera = new THREE.Camera();
    const contentCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 10);
    contentCamera.position.z = 1;

    const flatGeometry = new THREE.PlaneGeometry(2, 2);
    const discGeometry = new THREE.PlaneGeometry(1, 1);

    const [rampA = '#000000', rampB = '#000000', rampC = '#000000'] = rampColors;
    const rampUniforms: RampUniforms = {
      uResolution: { value: new THREE.Vector2(bufferW, bufferH) },
      uAngle: { value: (rampAngle * Math.PI) / 180 },
      uColorA: { value: new THREE.Color(rampA) },
      uColorB: { value: new THREE.Color(rampB) },
      uColorC: { value: new THREE.Color(rampC) },
    };
    const rampMaterial = new THREE.ShaderMaterial({
      vertexShader: MULTIPASS_FLAT_VERT,
      fragmentShader: MULTIPASS_RAMP_FRAG,
      uniforms: rampUniforms,
      depthTest: false,
      depthWrite: false,
    });
    const rampScene = new THREE.Scene();
    const rampQuad = new THREE.Mesh(flatGeometry, rampMaterial);
    rampQuad.frustumCulled = false;
    rampScene.add(rampQuad);

    const fillScene = new THREE.Scene();
    // One group, rotated once: the fills share a plane, and tilting the group
    // is what makes their paths read as one ellipse seen at an angle rather
    // than three unrelated circles.
    const fillGroup = new THREE.Group();
    fillGroup.rotation.z = PLANE_TILT;
    fillScene.add(fillGroup);

    const discMaterials: THREE.ShaderMaterial[] = [];
    const discMeshes: THREE.Mesh[] = [];
    for (let i = 0; i < DISCS.length; i++) {
      const spec = DISCS[i];
      if (!spec) continue;
      const uniforms: DiscUniforms = {
        uColor: { value: new THREE.Color(fillColors[i] ?? '#ffffff') },
        uIntensity: { value: 0 },
        uSoftness: { value: DISC_SOFTNESS },
      };
      const material = new THREE.ShaderMaterial({
        vertexShader: MULTIPASS_DISC_VERT,
        fragmentShader: MULTIPASS_DISC_FRAG,
        uniforms,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(discGeometry, material);
      mesh.scale.set(spec.size, spec.size * DISC_SQUASH, 1);
      mesh.frustumCulled = false;
      fillGroup.add(mesh);
      discMaterials.push(material);
      discMeshes.push(mesh);
    }

    const bloomUniforms: BloomUniforms = {
      uSource: { value: sceneTarget.texture },
      uTexel: { value: new THREE.Vector2(1 / bloomW, 1 / bloomH) },
      uThreshold: { value: bloomThreshold },
      uRadius: { value: BLOOM_RADIUS },
    };
    const bloomMaterial = new THREE.ShaderMaterial({
      vertexShader: MULTIPASS_FLAT_VERT,
      fragmentShader: MULTIPASS_BLOOM_FRAG,
      uniforms: bloomUniforms,
      depthTest: false,
      depthWrite: false,
    });
    const bloomScene = new THREE.Scene();
    const bloomQuad = new THREE.Mesh(flatGeometry, bloomMaterial);
    bloomQuad.frustumCulled = false;
    bloomScene.add(bloomQuad);

    const compositeUniforms: CompositeUniforms = {
      uScene: { value: sceneTarget.texture },
      uBloom: { value: bloomTarget.texture },
      uResolution: { value: new THREE.Vector2(bufferW, bufferH) },
      uBloomStrength: { value: bloomStrength },
      uVignette: { value: vignette },
      uDither: { value: DITHER },
    };
    const compositeMaterial = new THREE.ShaderMaterial({
      vertexShader: MULTIPASS_FLAT_VERT,
      fragmentShader: MULTIPASS_COMPOSITE_FRAG,
      uniforms: compositeUniforms,
      depthTest: false,
      depthWrite: false,
    });
    const compositeScene = new THREE.Scene();
    const compositeQuad = new THREE.Mesh(flatGeometry, compositeMaterial);
    compositeQuad.frustumCulled = false;
    compositeScene.add(compositeQuad);

    stage.current = {
      resize(w, h) {
        renderer.setPixelRatio(pixelRatio(maxDpr));
        renderer.setSize(w, h, false);
        renderer.getDrawingBufferSize(buffer);
        const bw = Math.max(2, Math.round(buffer.x));
        const bh = Math.max(2, Math.round(buffer.y));

        const aspect = w / h;
        contentCamera.left = -aspect;
        contentCamera.right = aspect;
        contentCamera.updateProjectionMatrix();

        // setSize, never new. Allocating a pair of half-float targets is a
        // synchronous driver call; doing it from a ResizeObserver during a
        // window drag is how a smooth resize turns into a slideshow — and the
        // old targets would leak unless every one of them were disposed.
        sceneTarget.setSize(bw, bh);
        rampUniforms.uResolution.value.set(bw, bh);
        compositeUniforms.uResolution.value.set(bw, bh);

        const sw = Math.max(2, Math.round(bw * bloomScale));
        const sh = Math.max(2, Math.round(bh * bloomScale));
        bloomTarget.setSize(sw, sh);
        // Texel size is per target, and this one is not the canvas. Leaving it
        // at the old size makes the blur radius drift with the window.
        bloomUniforms.uTexel.value.set(1 / sw, 1 / sh);
      },

      draw(elapsed) {
        const state = live.current;

        // The source ties the fills to scroll with exactly this ramp.
        const fade = clamp((state.reveal - REVEAL_START) / REVEAL_SPAN, 0, 1);

        for (let i = 0; i < discMeshes.length; i++) {
          const mesh = discMeshes[i];
          const spec = DISCS[i];
          const material = discMaterials[i];
          if (!mesh || !spec || !material) continue;
          const angle = spec.phase + elapsed * spec.speed * state.drift * Math.PI * 2;
          mesh.position.set(Math.cos(angle) * spec.radius, Math.sin(angle) * spec.radius, 0);
          const intensity = material.uniforms.uIntensity;
          if (intensity) intensity.value = spec.intensity * fade;
        }

        // Passes 1 and 2 — one clear, two renders. The absence of a clear
        // between them IS the composite.
        renderer.setRenderTarget(sceneTarget);
        renderer.clear(true, false, false);
        renderer.render(rampScene, flatCamera);
        renderer.render(fillScene, contentCamera);

        // Pass 3 — bright-pass and blur at bloomScale. Nothing accumulates, so
        // this target never needs to survive a frame.
        bloomUniforms.uThreshold.value = state.bloomThreshold;
        renderer.setRenderTarget(bloomTarget);
        renderer.clear(true, false, false);
        renderer.render(bloomScene, flatCamera);

        // Pass 4 — the only write to the canvas.
        compositeUniforms.uBloomStrength.value = state.bloomStrength;
        compositeUniforms.uVignette.value = state.vignette;
        renderer.setRenderTarget(null);
        renderer.clear(true, false, false);
        renderer.render(compositeScene, flatCamera);
      },
    };

    stage.current.resize(el.clientWidth, el.clientHeight);
    stage.current.draw(0);

    return () => {
      stage.current = null;
      // Explicit, not disposeObject over the scenes: flatGeometry is shared by
      // three of them, and a traversal would dispose it three times.
      flatGeometry.dispose();
      discGeometry.dispose();
      rampMaterial.dispose();
      bloomMaterial.dispose();
      compositeMaterial.dispose();
      for (const material of discMaterials) material.dispose();
      // Both targets. Nothing walks a render target for you — each holds a
      // half-float texture and a framebuffer object.
      sceneTarget.dispose();
      bloomTarget.dispose();
      disposeRenderer(renderer);
      renderer.domElement.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, colorKey, rampAngle, bloomScale, maxDpr]);

  useEffect(() => {
    const current = stage.current;
    if (!current || width < 1 || height < 1) return;
    current.resize(width, height);
    // No pass reads its own previous contents, so a resized target needs no
    // clear-and-settle — but a still frame does need redrawing, since resizing
    // a target discards what it held.
    if (reduced) current.draw(STATIC_ELAPSED);
  }, [width, height, reduced]);

  useRaf(
    (_dt, elapsed) => {
      stage.current?.draw(elapsed);
    },
    ready && inView && visible && !reduced,
  );
  // #endregion critical

  return (
    <div className={cn('relative h-full w-full overflow-hidden', className)}>
      <div ref={host} className="absolute inset-0" />
      {!supported ? (
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(60% 60% at 32% 38%, ${fillColors[0]}55, transparent 70%), radial-gradient(50% 50% at 68% 62%, ${fillColors[1]}44, transparent 70%), linear-gradient(${
              90 - rampAngle
            }deg, ${rampColors[0]}, ${rampColors[1]}, ${rampColors[2]})`,
          }}
        />
      ) : null}
    </div>
  );
}
