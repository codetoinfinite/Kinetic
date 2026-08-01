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
  CYLINDER_DOT_SCORE_FRAG,
  CYLINDER_DOT_SCORE_VERT,
} from '@/registry/shaders/cylinder-dot-score';

/* ==========================================================================
   Dot-Cloud Score Cylinder
   --------------------------------------------------------------------------
   A musical score wrapped around a cylinder and rendered entirely as dots:
   measure rings, bar dividers, and note clusters that light up as a playhead
   sweeps them. Two cylinders are stacked, counter-rotated, and drawn from a
   single buffer.

   The interesting constraint is that there is no depth buffer. Every dot is
   flattened to z = 0 before projection; solidity comes from alpha and point
   size falling off with the model-space z, and the fact that notes are never
   occluded by measure dots comes from where they sit in the buffer. Draw
   order is the depth sort.
   ========================================================================== */

export interface CylinderDotScoreProps {
  /** Measure rings per cylinder, split evenly above and below the centre gap. */
  ringCount?: number;
  /** Dots in each measure ring. */
  ringDots?: number;
  /** Vertical bar dividers per cylinder. */
  dividerCount?: number;
  /** Dots making up each divider. */
  dividerDots?: number;
  /** Note groups per cylinder. The playhead cycles through them. */
  noteGroups?: number;
  /** Dots per note group. */
  noteDots?: number;
  /** Degrees of yaw per second. Linear, never eased. */
  spinSpeed?: number;
  /** Seconds each note group stays lit. */
  noteInterval?: number;
  /** Global dot size multiplier, in CSS pixels of radius. */
  dotScale?: number;
  /** Model-to-pixel scale as a fraction of the container short side. */
  viewScale?: number;
  opacity?: number;
  color?: string;
  noteColor?: string;
  seed?: number | string;
  className?: string;
}

interface Uniforms {
  /** three types `uniforms` as an open record; without this the object is not assignable. */
  [name: string]: THREE.IUniform;
  uSpin: { value: number };
  uElapsed: { value: number };
  uViewScale: { value: number };
  uViewportYOffset: { value: number };
  uPixelRatio: { value: number };
  uDotScale: { value: number };
  uOpacity: { value: number };
  uNoteInterval: { value: number };
  uGroupCount: { value: number };
  uColor: { value: THREE.Color };
  uNoteColor: { value: THREE.Color };
}

interface Stage {
  resize: (width: number, height: number) => void;
  draw: (elapsed: number) => void;
}

/** Cylinder radius in model units, before the shader's BASE_SCALE of 1.5. */
const RADIUS = 0.5;
/** Half-height of the empty band at the cylinder's equator. */
const GAP = 0.03;
/** Vertical spacing between measure rings. */
const RING_PITCH = 0.03;
/** Screen-space separation of the two cylinders. Mirrors STACK_OFFSET in GLSL. */
const STACK_OFFSET = 0.3;

const MEASURE_SCALE = 0.7;
const NOTE_SCALE = 1.4;

/** Frame drawn under reduced motion — a quarter turn in, playhead on group 0. */
const STATIC_ELAPSED = 0.4;

// #region critical
export function CylinderDotScore({
  ringCount = 10,
  ringDots = 260,
  dividerCount = 8,
  dividerDots = 34,
  noteGroups = 6,
  noteDots = 26,
  spinSpeed = 12,
  noteInterval = 1.2,
  dotScale = 1,
  viewScale = 0.62,
  opacity = 1,
  color = '#7d838c',
  noteColor = '#ffffff',
  seed = 'cylinder-dot-score',
  className,
}: CylinderDotScoreProps) {
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

    /* ------------------------------------------------------------------
       Buffer layout IS the draw order. Points are blended in the order they
       appear, with depth testing off, so the six passes below are written
       consecutively into one pair of arrays: both cylinders' measures, then
       both cylinders' dividers, then both cylinders' notes. Notes last means
       notes on top, everywhere, without a sort and without a second object.
       ------------------------------------------------------------------ */
    const perCylinder = ringCount * ringDots + dividerCount * dividerDots + noteGroups * noteDots;
    const total = perCylinder * 2;

    const positions = new Float32Array(total * 3);
    const pointData = new Float32Array(total * 4);
    let cursor = 0;

    const write = (
      x: number,
      y: number,
      z: number,
      instance: number,
      isNote: number,
      scale: number,
      group: number,
    ) => {
      positions[cursor * 3] = x;
      positions[cursor * 3 + 1] = y;
      positions[cursor * 3 + 2] = z;
      pointData[cursor * 4] = instance;
      pointData[cursor * 4 + 1] = isNote;
      pointData[cursor * 4 + 2] = scale;
      pointData[cursor * 4 + 3] = group;
      cursor += 1;
    };

    /** y of measure ring `i`, mirrored around a gap at the equator. */
    const ringY = (i: number) => {
      const half = Math.floor(ringCount / 2);
      const step = i < half ? half - i : i - half + 1;
      return (i < half ? -1 : 1) * (GAP + step * RING_PITCH);
    };

    for (let instance = 0; instance < 2; instance += 1) {
      for (let ring = 0; ring < ringCount; ring += 1) {
        const y = ringY(ring);
        // Sorted angles, not raw ones. Points blend in buffer order, so an
        // unsorted ring interleaves near and far dots and the ring stipples
        // instead of reading as one continuous line of engraving.
        const angles = new Float32Array(ringDots);
        for (let i = 0; i < ringDots; i += 1) angles[i] = rng() * Math.PI * 2;
        angles.sort();
        for (let i = 0; i < ringDots; i += 1) {
          const a = angles[i] ?? 0;
          write(RADIUS * Math.cos(a), y, RADIUS * Math.sin(a), instance, 0, MEASURE_SCALE, 0);
        }
      }
    }

    const bandTop = GAP + Math.ceil(ringCount / 2) * RING_PITCH;
    for (let instance = 0; instance < 2; instance += 1) {
      for (let d = 0; d < dividerCount; d += 1) {
        const a = (d / dividerCount) * Math.PI * 2 + instance * 0.19;
        for (let i = 0; i < dividerDots; i += 1) {
          const t = dividerDots === 1 ? 0.5 : i / (dividerDots - 1);
          const y = -bandTop + t * bandTop * 2;
          write(RADIUS * Math.cos(a), y, RADIUS * Math.sin(a), instance, 0, MEASURE_SCALE, 0);
        }
      }
    }

    for (let instance = 0; instance < 2; instance += 1) {
      for (let g = 0; g < noteGroups; g += 1) {
        const centre = (g / noteGroups) * Math.PI * 2 + instance * 0.4;
        for (let i = 0; i < noteDots; i += 1) {
          const a = centre + (rng() - 0.5) * 0.22;
          const y = (rng() - 0.5) * 2 * bandTop;
          write(RADIUS * Math.cos(a), y, RADIUS * Math.sin(a), instance, 1, NOTE_SCALE, g);
        }
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aPointData', new THREE.BufferAttribute(pointData, 4));

    const uniforms: Uniforms = {
      uSpin: { value: 0 },
      uElapsed: { value: 0 },
      uViewScale: { value: 1 },
      uViewportYOffset: { value: 0 },
      uPixelRatio: { value: renderer.getPixelRatio() },
      uDotScale: { value: dotScale },
      uOpacity: { value: opacity },
      uNoteInterval: { value: noteInterval },
      uGroupCount: { value: noteGroups },
      uColor: { value: new THREE.Color(color) },
      uNoteColor: { value: new THREE.Color(noteColor) },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: CYLINDER_DOT_SCORE_VERT,
      fragmentShader: CYLINDER_DOT_SCORE_FRAG,
      uniforms,
      transparent: true,
      // Both off. With depth testing on, the first dot rasterised at a given
      // pixel would win and the far wall of the cylinder would punch holes in
      // the near one, because every dot is flattened to the same z.
      depthTest: false,
      depthWrite: false,
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
      const scale = Math.min(w, h) * viewScale;
      uniforms.uViewScale.value = scale;
      // The stack spans 0 .. STACK_OFFSET in y; pulling the whole thing down
      // by half of that puts the pair's centre on the container's centre.
      uniforms.uViewportYOffset.value = -STACK_OFFSET * 0.5 * scale;
      uniforms.uPixelRatio.value = renderer.getPixelRatio();
    };

    const draw = (elapsed: number) => {
      uniforms.uElapsed.value = elapsed;
      uniforms.uSpin.value = elapsed * spinSpeed;
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
    ringCount,
    ringDots,
    dividerCount,
    dividerDots,
    noteGroups,
    noteDots,
    spinSpeed,
    noteInterval,
    dotScale,
    viewScale,
    opacity,
    color,
    noteColor,
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
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
          {[0, 1].map((i) => (
            <div key={i} className="flex h-10 w-[62%] flex-col justify-between">
              {Array.from({ length: 5 }, (_, k) => (
                <div key={k} className="h-px w-full bg-line-strong" style={{ opacity: 0.3 + k * 0.15 }} />
              ))}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
