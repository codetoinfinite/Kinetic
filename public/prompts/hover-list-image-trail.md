# Build: Hover List Image Trail

Each row entered adds a plate to a column beside the list, and the column follows the pointer vertically with `quickTo`. Every plate is a masked-reveal pair — a clipping wrapper sliding up while the canvas inside slides down — and the stack is bounded by culling the oldest node rather than by pooling.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Hovering a row stacks a plate into a column that follows the pointer; the oldest is culled past twenty.

- Category: cursor
- Runtime cost: dom
- Dependencies: gsap@^3.15.0

## How it works

1. The spawn is two elements on one tween, moving in opposite directions. The wrapper animates `yPercent` from 100 to 0 while the canvas inside it animates from -100 to 0, on the same duration and the same ease. Because the wrapper clips, the two motions cancel and the plate is uncovered in place instead of flying in — the difference between a card arriving and a card being developed.
2. The cancellation only holds if both tweens share duration and ease exactly. Any mismatch and the plate visibly slides inside its own frame, which reads as a parallax bug rather than a reveal.
3. A node is created per hover and the stack is bounded by a cull, which is the deliberate opposite of `pooled-image-trail`. That is affordable here because hover entry is bounded by how fast a human can cross rows — roughly ten a second at worst — where a pointermove trail is bounded by the display refresh rate. The choice between pooling and culling follows from the event arrival rate, not from taste.
4. Every spawn drops the oldest node once the stack holds twenty, so the DOM has a hard ceiling at all times rather than a ceiling per interaction. Tweens are killed before removal so GSAP cannot write to a node the DOM has already released.
5. The column is centred on the pointer once with `gsap.set(stack, { yPercent: -50 })`, so the follow tween writes a raw `y` and never subtracts a half-height it would have to re-measure. A single `quickTo` at 0.5s with `power4` gives a long, heavy tail: `power4` spends most of its time near the destination, so the column snaps toward the pointer and then settles.
6. Plates are painted once into offscreen canvases at mount and blitted with a single `drawImage` on spawn, so no gradient, sheen or text work lands on the frame where a tween starts — the one frame that cannot afford it. There are no image assets and nothing allocated through `createObjectURL`, so nothing needs revoking.
7. `pointerover` bubbles, so one listener covers every row however React re-renders the list, but it also fires again for each descendant crossed inside the same row. The spawn is therefore gated on `relatedTarget` being outside the row, which turns "the event fired" into "the pointer actually changed rows".

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `MAX_PLATES = 20`
  Hard ceiling on live plates. Enough that a quick scan down a list leaves a visible stack with depth; low enough that twenty composited layers of 168x116 stay trivial. Remove this and an idle user running the pointer up and down the list allocates for as long as the page is open.
- `REVEAL_DURATION = 0.6`
  Seconds for the masked pair. Long for a hover response, deliberately: the reveal is the content of the interaction, not feedback about it. Below ~0.35 the opposite-direction pair is too fast to read as a reveal and just looks like a fade.
- `ease: 'expo.inOut' = expo.inOut`
  The most extreme standard curve, and the reason the reveal reads as mechanical rather than soft. Nearly all the travel happens in the middle third, so the plate is still at the start of its move, then has arrived, with very little visible in between.
- `followDuration = 0.5`
  Seconds of catch-up on the column. Longer than a cursor follow because the column is a heavy object carrying several plates; at 0.2 it is welded to the pointer and the stack stops feeling like it has mass.
- `follow ease 'power4' = power4 (in-out)`
  A very late curve, so the column covers the gap early and creeps the last few pixels. quickTo remutates the end value on every event, so an in-out curve absorbs direction changes instead of restarting an outward ramp each time.
- `PLATE_SCALE = 2`
  Backing-store multiplier for the offscreen plates. Fixed rather than `devicePixelRatio` so the drawn output is byte-identical on every machine and a screenshot diff of this component is meaningful.
- `hue step = 137.508 degrees`
  The golden angle. Consecutive plates are always far apart in hue and the sequence never repeats a near-duplicate, so a fast scan down the list never stacks two plates that read as the same colour.
- `monotonic zIndex = order += 1, never reset`
  A later plate must always sit above an earlier one. Reusing or resetting the counter lets two live plates tie, and tied z-indices resolve by DOM order, which changes as the cull removes nodes — the observable symptom is a plate flickering behind one that arrived before it.

## API

```ts
function HoverListImageTrail(props: { rows: TrailRow[]; tileWidth?: number; tileHeight?: number; followDuration?: number; seed?: string; className?: string }): JSX.Element
```

- `rows: TrailRow[]`
  List rows. `{ id, label, meta? }`; one plate is painted per row at mount.
- `tileWidth: number` — default `168`
  Plate width in CSS px.
- `tileHeight: number` — default `116`
  Plate height in CSS px.
- `followDuration: number` — default `0.5`
  Seconds of catch-up on the column follow.
- `seed: string` — default `'hover-list-image-trail'`
  Seeds the plate palette. Same seed, same colours, every render.
- `className: string`
  Merged onto the root container via `cn`.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
const PLATE_SCALE = 2;
/** Hard ceiling on live plates. Every spawn past this drops the oldest. */
const MAX_PLATES = 20;
const REVEAL_DURATION = 0.6;

/**
 * Plates are painted once into offscreen canvases and blitted on spawn. No
 * image assets, and — more importantly — no gradient, text or shadow work on
 * the frame where a tween starts, which is exactly the frame that cannot
 * afford it.
 */
function paintPlate(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  index: number,
  seed: string,
) {
  // Seeded, never `Math.random()`: the plate colours must be identical on the
  // server and the client, and identical across reloads so a visual diff of
  // this component means something.
  const rng = createRng(`${seed}-${index}`);
  // Golden-angle hue walk: consecutive plates are always far apart in hue, so
  // a fast scan down the list never stacks two similar colours.
  const hue = (index * 137.508 + rng() * 18) % 360;

  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, `hsl(${hue} 46% 26%)`);
  bg.addColorStop(1, `hsl(${(hue + 44) % 360} 52% 13%)`);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // A soft off-centre sheen so the plate has a light direction rather than
  // reading as a flat swatch.
  const sheen = ctx.createRadialGradient(w * 0.3, h * 0.22, 0, w * 0.3, h * 0.22, h * 1.15);
  sheen.addColorStop(0, 'rgba(255,255,255,0.22)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, w - 1, h - 1);

  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  ctx.font = `500 ${Math.round(h * 0.19)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(String(index + 1).padStart(2, '0'), w * 0.07, h * 0.88);
}

export function HoverListImageTrail({
  rows,
  tileWidth = 168,
  tileHeight = 116,
  followDuration = 0.5,
  seed = 'hover-list-image-trail',
  className,
}: HoverListImageTrailProps) {
  const root = useRef<HTMLDivElement>(null);
  const column = useRef<HTMLDivElement>(null);
  const plates = useRef<HTMLCanvasElement[]>([]);

  // Paint one plate per row, once. Re-running only when the geometry or the
  // row count actually changes — not on every render.
  useEffect(() => {
    const bw = tileWidth * PLATE_SCALE;
    const bh = tileHeight * PLATE_SCALE;
    const made: HTMLCanvasElement[] = [];

    for (let i = 0; i < rows.length; i += 1) {
      const canvas = document.createElement('canvas');
      canvas.width = bw;
      canvas.height = bh;
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;
      ctx.scale(PLATE_SCALE, PLATE_SCALE);
      paintPlate(ctx, tileWidth, tileHeight, i, seed);
      made.push(canvas);
    }

    plates.current = made;
    return () => {
      // Plain canvases: nothing was allocated through `createObjectURL`, so
      // there is nothing to revoke. Dropping the references is the disposal.
      plates.current = [];
    };
  }, [rows.length, tileWidth, tileHeight, seed]);

  useEffect(() => {
    const el = root.current;
    const stack = column.current;
    if (!el || !stack) return;

    // A trail that follows a cursor has no meaning without a cursor. On touch
    // `pointerenter` fires on tap, so every tap would stack a plate under the
    // finger and leave it there.
    if (!window.matchMedia('(pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    /* Centring the column on the pointer once, so the follow tween writes a
       raw `y` and never has to subtract half a height it does not know. */
    gsap.set(stack, { yPercent: -50 });
    const yTo = gsap.quickTo(stack, 'y', { duration: followDuration, ease: 'power4' });

    let seeded = false;
    let order = 0;

    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const y = e.clientY - rect.top;
      if (seeded) {
        yTo(y);
      } else {
        seeded = true;
        // Second argument is quickTo's START value, so the column teleports on
        // entry instead of sweeping down the list from wherever it was left.
        yTo(y, y);
      }
    };

    const onLeave = () => {
      seeded = false;
    };

    const spawn = (index: number) => {
      const plate = plates.current[index];
      if (!plate) return;

      /* The wrapper is the mask. `overflow: hidden` plus a fixed size is what
         makes the opposite-direction pair read as a reveal instead of two
         elements sliding past each other. */
      const wrap = document.createElement('div');
      wrap.style.position = 'absolute';
      wrap.style.left = '0';
      wrap.style.top = '0';
      wrap.style.width = `${tileWidth}px`;
      wrap.style.height = `${tileHeight}px`;
      wrap.style.overflow = 'hidden';
      wrap.style.borderRadius = '4px';
      wrap.style.willChange = 'transform';
      // Monotonic, never reset: a later plate is always above an earlier one,
      // with no possibility of two plates tying and flickering.
      order += 1;
      wrap.style.zIndex = String(order);

      const canvas = document.createElement('canvas');
      canvas.width = plate.width;
      canvas.height = plate.height;
      canvas.style.width = `${tileWidth}px`;
      canvas.style.height = `${tileHeight}px`;
      canvas.style.display = 'block';
      canvas.style.willChange = 'transform';
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      // One blit. All the expensive drawing happened at mount.
      ctx.drawImage(plate, 0, 0);

      wrap.appendChild(canvas);
      stack.appendChild(wrap);

      /* The masked-reveal pair: wrapper up from +100%, canvas down from -100%,
         on the same duration and ease so they cancel exactly. Any mismatch in
         either and the plate visibly slides inside its own frame. */
      gsap.fromTo(
        wrap,
        { yPercent: 100 },
        { yPercent: 0, duration: REVEAL_DURATION, ease: 'expo.inOut', overwrite: 'auto' },
      );
      gsap.fromTo(
        canvas,
        { yPercent: -100 },
        { yPercent: 0, duration: REVEAL_DURATION, ease: 'expo.inOut', overwrite: 'auto' },
      );

      /* The cull. Not a nicety — without it the stack grows for as long as the
         page is open, and a user idly running the pointer up and down the list
         builds thousands of composited layers. Killing tweens before removal
         stops GSAP writing to a node React and the DOM have both let go of. */
      while (stack.children.length > MAX_PLATES) {
        const oldest = stack.firstElementChild;
        if (!oldest) break;
        gsap.killTweensOf(oldest);
        gsap.killTweensOf(oldest.firstElementChild);
        oldest.remove();
      }
    };

    const onOver = (e: Event) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      const row = target.closest('[data-trail-row]');
      if (!row) return;
      /* `pointerover` bubbles and fires again for every descendant crossed
         inside the same row, so the spawn is gated on actually changing rows
         rather than on the event firing. `relatedTarget` still inside the row
         means the pointer never left it. */
      const from = (e as PointerEvent).relatedTarget;
      if (from instanceof Node && row.contains(from)) return;
      const index = Number(row.getAttribute('data-trail-row'));
      if (!Number.isInteger(index)) return;
      spawn(index);
    };

    el.addEventListener('pointermove', onMove, { passive: true });
    el.addEventListener('pointerleave', onLeave);
    el.addEventListener('pointerover', onOver);

    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      el.removeEventListener('pointerover', onOver);
      gsap.killTweensOf(stack);
      // Every live plate is a node this effect created and React does not know
      // about, so this effect has to remove them itself.
      while (stack.firstElementChild) {
        const child = stack.firstElementChild;
        gsap.killTweensOf(child);
        gsap.killTweensOf(child.firstElementChild);
        child.remove();
      }
      gsap.set(stack, { clearProps: 'all' });
    };
  }, [followDuration, tileWidth, tileHeight]);
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Removes all three container listeners, kills tweens on the column and on every live plate and its canvas, then removes each plate node — these were created imperatively, so React will not clean them up — and clears the column transform. The offscreen plate canvases are released by nulling the ref array; they are plain canvases, never object URLs, so there is nothing to revoke.

**Reduced motion.** No listeners attach and no plates are ever created. What remains is the list itself — real links, real hover colour — which loses nothing functional. There is no meaningful static version of a trail, so the component removes itself rather than pretending.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- No cull. The stack grows for the lifetime of the page; a user idly running the pointer across the list builds thousands of composited layers and the tab degrades with no single frame that looks like the culprit.
- Culling by index or on a timer instead of on spawn. The ceiling then applies per interaction rather than at all times, and a burst of hovers still spikes the node count.
- Removing a node without `killTweensOf`. GSAP keeps writing transforms to a detached element, which is wasted work per frame forever and, in dev, a confusing set of live tweens for nodes that no longer exist.
- Mismatched duration or ease between the wrapper and the canvas. The cancellation breaks and the plate slides inside its own frame — it looks like a parallax effect nobody asked for, and reads as a bug.
- Putting `overflow: hidden` on the column instead of on each wrapper. Every plate is then clipped by one shared box, so plates offset from the column are cut off and the reveal only works for the newest one.
- Spawning on `pointerover` without checking `relatedTarget`. The event refires for every descendant crossed inside the same row, so a single hover over a row containing a number, a label and a date spawns three plates.
- Using `pointerenter` per row instead. It does not bubble, so it needs a listener on every row plus re-subscription whenever React re-renders the list — the bookkeeping is the bug surface.
- Letting the column receive pointer events. Plates then intercept the very moves that drive the follow, and the column stalls whenever it catches up with the pointer.
- `Math.random()` for the plate colours. The server and client disagree, React reports a hydration mismatch, and every reload produces a different set of plates so no visual regression is ever detectable.

## Notes

- Gated on `(pointer: fine)`. On touch nothing mounts: `pointerenter` fires on tap, so every tap would stack a plate directly under the finger and leave it there with no way to dismiss it, and the vertical follow has nothing to follow.
- Reduced motion disables the component entirely rather than shortening it. The plates and the column exist only as motion — there is no static state that still communicates anything — so the honest reduction is the plain list, which is fully functional on its own.
- The column is `aria-hidden`. The rows are real links and remain the accessible content; the plates are decoration with no text equivalent.
- Compare with `pooled-image-trail`, which solves the same visual problem for a pointermove-rate event by reusing a fixed ring of nodes. Neither approach is correct in general; the arrival rate of the event decides.

## Definition of done

Move down the list and each row entered drops a plate into the column, uncovered from the bottom rather than sliding in — watch the numeral in the corner and it should not move relative to the plate edge. The column follows your vertical position with a long settle. Hover a row, move within it across the number and the date, and exactly one plate appears. Run the pointer up and down the list for ten seconds and inspect the column in DevTools: it holds at most twenty children. On touch, or with reduced motion, the list is plain and no plates appear.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
