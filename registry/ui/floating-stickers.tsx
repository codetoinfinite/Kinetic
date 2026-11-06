/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Floating Stickers" (boardui.com/).
 * No BoardUI source was used.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent, ReactNode, RefObject } from "react";
import { useReducedMotion } from "@/registry/hooks/use-reduced-motion";
import { createRng, randRange } from "@/registry/lib/prng";
import { cx } from "@/registry/lib/cx";
import { StickerArtwork } from "@/registry/ui/floating-stickers-art";
import type { StickerKind } from "@/registry/ui/floating-stickers-art";

/**
 * Floating Stickers: decorative die-cut characters scattered over a section.
 * Each one bobs on its own slow, seeded float. Grab one and it lifts, rises
 * above the others and follows the pointer, clamped to the field. Arrow keys
 * nudge a focused sticker (Shift for bigger steps).
 *
 *   <FloatingStickers
 *     className="h-[420px]"
 *     stickers={[{ id: "star", label: "Star", kind: "star", x: 0.85, y: 0.2 }]}
 *   >
 *     <Hero />
 *   </FloatingStickers>
 */

export interface StickerItem {
  id: string;
  /** Accessible name, e.g. "Sleepy star". */
  label: string;
  /** Built-in artwork. Ignored when `art` is given. */
  kind?: StickerKind;
  /** Custom artwork that fills the sticker box. */
  art?: ReactNode;
  /** Centre position as a fraction of the field width (0 to 1). */
  x: number;
  /** Centre position as a fraction of the field height (0 to 1). */
  y: number;
  /** Box size in px at a field 640px or wider. Default 88. */
  size?: number;
  /** Resting tilt in degrees. */
  rotate?: number;
}

export interface StickerOffset {
  x: number;
  y: number;
}

export interface FloatingStickersProps {
  stickers: readonly StickerItem[];
  /** Seeds every sticker's float (duration, phase, lift, sway). Same seed, same motion. */
  seed?: string;
  /** Pointer drag and arrow-key nudging. When false the stickers are decorative and hidden from assistive tech. */
  draggable?: boolean;
  /** Fires when a sticker is grabbed (pointer down or key nudge). */
  onGrab?: (id: string) => void;
  /** Fires on drop and on each key nudge with the offset from the resting place. */
  onMove?: (id: string, offset: StickerOffset) => void;
  children?: ReactNode;
  className?: string;
}

interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

const KEY_STEPS: Record<string, readonly [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

const clamp = (value: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, value));

/** Seeded float parameters. Pure, so server and client agree. */
function floatParams(seed: string, id: string) {
  const rng = createRng(`${seed}:${id}`);
  const duration = randRange(rng, 4200, 7400);
  return {
    duration,
    delay: -randRange(rng, 0, duration),
    lift: randRange(rng, 5, 11),
    drift: randRange(rng, -3, 3),
    sway: randRange(rng, 1.5, 4.5),
  };
}

interface StickerProps {
  item: StickerItem;
  seed: string;
  draggable: boolean;
  reduced: boolean;
  z: number;
  top: boolean;
  fieldRef: RefObject<HTMLDivElement | null>;
  raise: (id: string) => void;
  onMove?: (id: string, offset: StickerOffset) => void;
}

// #region critical
function Sticker({ item, seed, draggable, reduced, z, top, fieldRef, raise, onMove }: StickerProps) {
  const [offset, setOffset] = useState<StickerOffset>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const floatRef = useRef<HTMLDivElement>(null);
  const anim = useRef<Animation | null>(null);
  const drag = useRef<{ pointer: number; sx: number; sy: number; ox: number; oy: number; x: number; y: number; b: Bounds } | null>(null);
  const size = item.size ?? 88;

  // The float runs on the compositor through WAAPI, so a bobbing sticker
  // never re-renders React. Reduced motion skips it: the sticker rests still.
  useEffect(() => {
    const el = floatRef.current;
    if (!el || reduced || typeof el.animate !== "function") return;
    const p = floatParams(seed, item.id);
    const a = el.animate(
      [
        { transform: `translate3d(0, 0, 0) rotate(${-p.sway}deg)` },
        { transform: `translate3d(${p.drift}px, ${-p.lift}px, 0) rotate(${p.sway}deg)` },
      ],
      { duration: p.duration, delay: p.delay, iterations: Infinity, direction: "alternate", easing: "ease-in-out" },
    );
    anim.current = a;
    return () => {
      a.cancel();
      anim.current = null;
    };
  }, [reduced, seed, item.id]);

  /** Allowed offsets that keep the sticker box inside the field. A sticker placed half outside may stay there. */
  const bounds = (el: HTMLElement): Bounds | null => {
    const field = fieldRef.current;
    if (!field) return null;
    const f = field.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return {
      minX: Math.min(f.left - (r.left - offset.x), offset.x),
      maxX: Math.max(f.right - (r.right - offset.x), offset.x),
      minY: Math.min(f.top - (r.top - offset.y), offset.y),
      maxY: Math.max(f.bottom - (r.bottom - offset.y), offset.y),
    };
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!draggable || event.button !== 0 || drag.current) return;
    const b = bounds(event.currentTarget);
    if (!b) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { pointer: event.pointerId, sx: event.clientX, sy: event.clientY, ox: offset.x, oy: offset.y, x: offset.x, y: offset.y, b };
    anim.current?.pause();
    setDragging(true);
    raise(item.id);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.pointer !== event.pointerId) return;
    d.x = clamp(d.ox + event.clientX - d.sx, d.b.minX, d.b.maxX);
    d.y = clamp(d.oy + event.clientY - d.sy, d.b.minY, d.b.maxY);
    setOffset({ x: d.x, y: d.y });
  };

  // Up, cancel and lost capture all land here; the first one wins.
  const end = (event: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.pointer !== event.pointerId) return;
    drag.current = null;
    anim.current?.play();
    setDragging(false);
    if (d.x !== d.ox || d.y !== d.oy) onMove?.(item.id, { x: Math.round(d.x), y: Math.round(d.y) });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = KEY_STEPS[event.key];
    if (!draggable || !step || drag.current) return;
    event.preventDefault();
    const b = bounds(event.currentTarget);
    if (!b) return;
    const by = event.shiftKey ? 40 : 10;
    const next = { x: clamp(offset.x + step[0] * by, b.minX, b.maxX), y: clamp(offset.y + step[1] * by, b.minY, b.maxY) };
    raise(item.id);
    if (next.x === offset.x && next.y === offset.y) return;
    setOffset(next);
    onMove?.(item.id, { x: Math.round(next.x), y: Math.round(next.y) });
  };

  return (
    <div
      data-sticker={item.id}
      data-top={top ? "" : undefined}
      data-dragging={dragging ? "" : undefined}
      role="img"
      aria-label={item.label}
      aria-roledescription={draggable ? "draggable sticker" : undefined}
      aria-keyshortcuts={draggable ? "ArrowUp ArrowDown ArrowLeft ArrowRight" : undefined}
      tabIndex={draggable ? 0 : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
      onKeyDown={onKeyDown}
      className={cx(
        "absolute aspect-square rounded-[28%] outline-none",
        draggable &&
          "pointer-events-auto cursor-grab touch-none select-none focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background-primary-default",
        dragging && "cursor-grabbing",
      )}
      style={{
        left: `${item.x * 100}%`,
        top: `${item.y * 100}%`,
        width: `min(${size}px, ${(size / 6.4).toFixed(2)}cqw)`,
        zIndex: z,
        transform: `translate(-50%, -50%) translate3d(${offset.x}px, ${offset.y}px, 0)`,
      }}
    >
      <div
        className={cx(
          "size-full transition-[transform,filter] duration-200 ease-out motion-reduce:transition-none",
          dragging ? "scale-110 drop-shadow-xl" : "drop-shadow-md",
        )}
      >
        <div ref={floatRef} className="size-full">
          <div className="size-full" style={{ transform: `rotate(${item.rotate ?? 0}deg)` }}>
            {item.art ?? <StickerArtwork kind={item.kind ?? "blob"} className="size-full" />}
          </div>
        </div>
      </div>
    </div>
  );
}
// #endregion

export function FloatingStickers({
  stickers,
  seed = "kinetic",
  draggable = true,
  onGrab,
  onMove,
  children,
  className,
}: FloatingStickersProps) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  // Stacking order, last = on top. Grabbing moves a sticker to the end.
  const [order, setOrder] = useState<readonly string[]>(() => stickers.map((s) => s.id));

  const raise = (id: string) => {
    setOrder((prev) => (prev[prev.length - 1] === id ? prev : [...prev.filter((x) => x !== id), id]));
    onGrab?.(id);
  };

  const ranks = stickers.map((item, i) => {
    const rank = order.indexOf(item.id);
    return (rank === -1 ? order.length + i : rank) + 1;
  });
  const topRank = Math.max(0, ...ranks);

  return (
    <div ref={fieldRef} className={cx("@container relative isolate", className)}>
      <div className="relative z-0 h-full">{children}</div>
      <div className="pointer-events-none absolute inset-0 z-10" aria-hidden={draggable ? undefined : true}>
        {stickers.map((item, i) => (
          <Sticker
            key={item.id}
            item={item}
            seed={seed}
            draggable={draggable}
            reduced={reduced}
            z={ranks[i] ?? 1}
            top={ranks[i] === topRank}
            fieldRef={fieldRef}
            raise={raise}
            onMove={onMove}
          />
        ))}
      </div>
    </div>
  );
}
