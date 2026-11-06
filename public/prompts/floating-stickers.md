# Build: Floating Stickers

Playful stickers for a landing section, like the characters that peek over a footer line. Each sticker sits at a fractional position in its field and bobs on a slow float whose duration, phase, lift and sway come from a seed, so every load looks the same. Grab one with a pointer and it scales up, gains a deeper shadow and rises to the top of the stack. It follows the pointer through pointer capture and stays clamped to the field. Focused stickers move with the arrow keys.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Die-cut SVG characters that bob on seeded floats. Drag one and it lifts above the rest, clamped to the frame. Arrow keys nudge it.

- Category: display
- Runtime cost: dom
- Dependencies: none beyond React

## How it works

1. The root is an `@container` field. Its `children` render in a `z-0` layer, and a `pointer-events-none` overlay above them holds the stickers. Each sticker is absolutely placed at `left: x%`, `top: y%` and centred with `translate(-50%, -50%)`. Its width is `min(size px, size/6.4 cqw)`, so it shrinks with a field narrower than 640px.
2. Every sticker has four layers. The outer layer carries the drag offset and the z-index. The lift layer scales to 1.1 and swaps `drop-shadow-md` for `drop-shadow-xl` while held. The float layer runs a Web Animations API loop, and the art layer holds the resting tilt. Because the float is WAAPI on `transform`, it runs on the compositor and never re-renders React.
3. Float parameters come from `createRng(`${seed}:${id}`)`: a duration of 4.2 to 7.4s, a negative start delay so the stickers start out of phase, 5 to 11px of lift, ±3px of drift and 1.5 to 4.5° of sway. The loop alternates with ease-in-out, and is paused on grab and resumed on drop.
4. On pointerdown the sticker calls `setPointerCapture`, records the start pointer and offset, and computes bounds once: the field rect minus the sticker's resting rect. A sticker placed partly outside the field keeps its current offset as a valid edge, so it never jumps. Pointermove clamps the offset into those bounds. Pointerup, pointercancel and lostpointercapture all end the drag through one handler.
5. Stacking is an order array in the parent, with the last id on top. Grabbing or key-nudging a sticker moves its id to the end, and each sticker's z-index is its rank + 1. The top sticker carries `data-top`.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `float = 4200 to 7400ms, alternate, ease-in-out, lift 5 to 11px, sway 1.5 to 4.5°`
  At this pace the motion reads as idle breathing rather than a call to action, and differing durations keep the stickers from syncing up.
- `grab lift = scale 1.1, drop-shadow-md → drop-shadow-xl, 200ms ease-out`
  A sticker peeled off a page gets bigger and casts a softer, larger shadow. The scale is on its own layer, so it never fights the drag offset or the float.
- `key step = 10px, Shift 40px`
  Small enough to place precisely, and Shift crosses the field in a few presses.
- `responsive size = min(size px, size / 6.4 cqw)`
  Full size from a 640px field. At a 328px phone field an 88px sticker drops to about 45px and stays clear of the headline.

## API

```ts
function FloatingStickers(props: { stickers: StickerItem[]; seed?: string; draggable?: boolean; onGrab?: (id: string) => void; onMove?: (id: string, offset: { x: number; y: number }) => void; children?: ReactNode; className?: string }): JSX.Element
```

- `stickers: StickerItem[]`
  `{ id, label, kind?, art?, x, y, size?, rotate? }`. x and y are 0 to 1 fractions of the field, `kind` is blob, star, cloud, heart or chart, and `art` is custom artwork.
- `seed: string` — default `"kinetic"`
  Seeds every float. Same seed, same motion.
- `draggable: boolean` — default `true`
  Enables pointer drag and arrow-key nudging. When false, the stickers are decorative and aria-hidden.
- `onGrab: (id) => void`
  Fires on pointer grab and key nudge.
- `onMove: (id, offset) => void`
  Fires on drop (if moved) and on each key nudge, with the offset in px from the resting place.
- `children: ReactNode`
  Section content beneath the stickers.
- `className: string`
  Field classes. Give it a height.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
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
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Each float animation is cancelled in its effect cleanup, which runs on unmount, on a reduced-motion change or on a new seed. Pointer listeners are React props on the sticker, and pointer capture is released by the browser on pointerup. Lost capture ends the drag through the same handler, so no drag state outlives the gesture.

**Reduced motion.** With prefers-reduced-motion, `useReducedMotion` skips the WAAPI float, so every sticker rests still at its tilt. The lift scale and shadow apply instantly (`motion-reduce:transition-none`). Dragging and key nudging still work, because they follow the user's own input.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Putting the float and the drag on the same `transform`. Each would overwrite the other every frame, so the sticker snaps back mid-drag. Keep separate nested layers.
- Skipping `touch-action: none`. On touch screens the browser starts scrolling and fires pointercancel after a few pixels, so the drag dies. The draggable stickers carry `touch-none`.
- Seeding with `Math.random()`. The server and client would render different phases, so hydration fails and screenshots never match. Use the seeded rng.
- Clamping against bounds computed on every move. Reading layout in each pointermove is a forced reflow per frame. Bounds are computed once on pointerdown.

## Notes

- Pass `draggable={false}` for pure decoration. Stickers then ignore the pointer and are hidden from assistive tech.
- To reset positions, remount with a new `key` (the demo's Reset button does this). Offsets are internal state relative to each resting place.
- Give the field an explicit height. The overlay is `absolute inset-0`, so it covers whatever box the children produce.

## Definition of done

Five stickers (blob, star, chart, cloud, heart) bob out of sync around the "Make it yours" headline. Dragging the star moves it with the pointer, scales it up, puts it above the other stickers and keeps it inside the field, even when the pointer leaves it. The status line reads "Sleepy star moved +x, +y px". A focused sticker moves 10px per arrow key. Reset puts every sticker back. Under reduced motion nothing bobs. At 360px the stickers shrink and stay clear of the copy.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
