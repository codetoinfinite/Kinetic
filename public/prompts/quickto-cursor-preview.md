# Build: quickTo Cursor Preview

Hovering a row fades in a preview panel that then trails the pointer with a full second of catch-up, so it reads as a heavy object being dragged rather than a tooltip pinned to the cursor. Position comes from exactly two `gsap.quickTo` setters created once at mount; the hovered row is the only thing that ever enters React state.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A preview panel drifts a full second behind the pointer, driven by two reused quickTo tweens.

- Category: cursor
- Runtime cost: dom
- Dependencies: gsap@^3.15.0

## How it works

1. `gsap.quickTo(box, "x", { duration, ease })` returns a setter backed by ONE tween whose end value is mutated in place. A `pointermove` handler firing 60-120 times a second therefore allocates nothing after the first frame, where the `gsap.to()` equivalent allocates and garbage-collects a tween object per event and leaves each new tween fighting the last for the same property.
2. Hovered row is React state because it changes a handful of times a second and drives real DOM structure (text colour, stroke, offset). Panel position is never state: it changes on every pointer event, and a re-render per move would cost more than the animation it is driving.
3. `duration: 1` is roughly five times a normal cursor follow, and that is the entire design. Under `power3` the panel covers most of the gap early and then creeps, so it always reads as heading for the pointer without ever arriving — which is what makes it feel like mass rather than lag.
4. The first move after entry calls `xTo(x, x)` — quickTo's second argument is the tween's START value, so the panel is teleported rather than eased. Without it, re-entering the list sends the panel sailing diagonally across the whole component over a full second before it becomes useful.
5. Position is centred with `xPercent: -50, yPercent: -50` set once at mount, so `x`/`y` are raw pointer coordinates and no offset arithmetic appears in the hot handler.
6. Every preview is a gradient plate painted into an offscreen canvas at mount — the registry ships no image assets. Switching rows is one `drawImage` blit, so the gradient, band and text work never lands on the frame where the fade-in starts.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `duration = 1`
  Seconds of catch-up, and the whole character of the component. At 0.2 it is an ordinary tooltip that happens to be smooth; at 1 it is an object with weight. Past ~1.6 the panel is still crossing the list when the pointer has already left it, and the effect reads as broken rather than heavy.
- `ease: 'power3' = power3 (in-out)`
  In-out, not `.out`. Because the end value is remutated on every event, the tween is permanently restarting from its own midpoint; the symmetric curve means direction changes are absorbed smoothly instead of snapping to a new outward ramp each time.
- `FADE_DURATION = 0.35`
  Fade and scale on row change. Long enough to register as a cross-fade rather than a cut, short enough that dragging down a list of eight rows does not leave the panel permanently mid-transition.
- `scale 0.94 -> 1 = 0.94`
  A 6% growth on appear. Paired with opacity it reads as arriving from behind the page; without it the fade alone looks like a stuck render.
- `DOCK_INSET = 20`
  Pixels of margin when the panel docks to the right edge on touch or reduced motion. Clamped against `panelWidth / 2` so a panel wider than its container still lands fully inside rather than half off-screen.
- `PLATE_SCALE = 2`
  Backing-store multiplier for the plate canvases. Fixed rather than `devicePixelRatio` so the drawn output is identical on every machine and a visual regression is actually visible in a screenshot diff.

## API

```ts
function QuickToCursorPreview(props: { items: PreviewItem[]; duration?: number; panelWidth?: number; panelHeight?: number; className?: string }): JSX.Element
```

- `items: PreviewItem[]`
  Rows to render. `{ id, title, meta? }`; one plate is painted per item.
- `duration: number` — default `1`
  Seconds of catch-up on the follow. The defining value of the effect.
- `panelWidth: number` — default `260`
  Preview panel width in CSS px.
- `panelHeight: number` — default `180`
  Preview panel height in CSS px.
- `className: string`
  Merged onto the root container via `cn`.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
const PLATE_SCALE = 2;
const FADE_DURATION = 0.35;
const DOCK_INSET = 20;

/**
 * True when the panel must NOT follow: no fine pointer (a `pointermove` on
 * touch only exists during a drag, so the panel would live under the finger
 * that is dragging it), or reduced motion (a full second of drift is precisely
 * what that user opted out of). One predicate, so the two effects below can
 * never disagree about which mode the component is in.
 */
function docked(): boolean {
  return (
    !window.matchMedia('(pointer: fine)').matches ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function QuickToCursorPreview({
  items,
  duration = 1,
  panelWidth = 260,
  panelHeight = 180,
  className,
}: QuickToCursorPreviewProps) {
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const surface = useRef<HTMLCanvasElement>(null);
  const plates = useRef<HTMLCanvasElement[]>([]);

  /* Hovered row is React state because it changes a handful of times a
     second. Panel position is never state — it changes 120 times a second and
     a re-render per pointermove would dwarf the animation itself. */
  const [hovered, setHovered] = useState<number | null>(null);
  const { width, height } = useResizeObserver(root);

  const count = items.length;

  /* Paint every plate once. Drawing at hover time would put a gradient fill,
     four band rects and a text layout on the same frame as the fade-in. */
  useEffect(() => {
    const bw = panelWidth * PLATE_SCALE;
    const bh = panelHeight * PLATE_SCALE;
    const built: HTMLCanvasElement[] = [];
    for (let i = 0; i < count; i++) {
      const plate = document.createElement('canvas');
      plate.width = bw;
      plate.height = bh;
      const ctx = plate.getContext('2d');
      if (!ctx) break;
      ctx.scale(PLATE_SCALE, PLATE_SCALE);
      paintPlate(ctx, panelWidth, panelHeight, i);
      built.push(plate);
    }
    plates.current = built;

    const canvas = surface.current;
    if (canvas) {
      canvas.width = bw;
      canvas.height = bh;
    }
    return () => {
      plates.current = [];
    };
  }, [count, panelWidth, panelHeight]);

  /* Centre the panel on its own coordinates ONCE, at mount. Doing it with a
     negative margin or `left: -130px` instead means the offset and the
     transform fight, and the panel sits half a width off. */
  useEffect(() => {
    const box = panel.current;
    if (!box) return;
    gsap.set(box, { xPercent: -50, yPercent: -50, autoAlpha: 0, scale: 0.94 });
    return () => {
      gsap.killTweensOf(box);
      gsap.set(box, { clearProps: 'all' });
    };
  }, []);

  /* With no fine pointer — or with reduced motion, where a second of drift is
     exactly what the user opted out of — the panel docks to the right edge and
     only cross-fades as rows change. */
  useEffect(() => {
    const box = panel.current;
    if (!box || width === 0 || height === 0) return;
    if (!docked()) return;
    gsap.set(box, {
      x: Math.max(width - panelWidth / 2 - DOCK_INSET, panelWidth / 2),
      y: height / 2,
    });
  }, [width, height, panelWidth]);

  useEffect(() => {
    const el = root.current;
    const box = panel.current;
    if (!el || !box || docked()) return;

    // ONE tween per property, reused for the lifetime of the component.
    const xTo = gsap.quickTo(box, 'x', { duration, ease: 'power3' });
    const yTo = gsap.quickTo(box, 'y', { duration, ease: 'power3' });
    let seeded = false;

    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (seeded) {
        xTo(x);
        yTo(y);
        return;
      }
      // Second argument is quickTo's `start` value: it snaps rather than
      // easing. Without it the panel sails in from wherever it was left,
      // taking a full second to cross the list on every re-entry.
      seeded = true;
      xTo(x, x);
      yTo(y, y);
    };

    const onLeave = () => {
      seeded = false;
    };

    el.addEventListener('pointermove', onMove, { passive: true });
    el.addEventListener('pointerleave', onLeave);

    /* Deliberately NOT clearing props here. `xPercent`, `yPercent` and
       `autoAlpha` belong to the mount effect; wiping them whenever `duration`
       changes would un-centre the panel and pop it to full opacity mid-hover.
       Teardown of those lives in the effect that set them. */
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      gsap.killTweensOf(box);
    };
  }, [duration]);

  /* Visibility and content follow the hovered row, not the pointer. */
  useEffect(() => {
    const box = panel.current;
    const canvas = surface.current;
    if (!box || !canvas) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (hovered !== null) {
      const plate = plates.current[hovered];
      const ctx = canvas.getContext('2d');
      if (plate && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(plate, 0, 0);
      }
    }

    gsap.to(box, {
      autoAlpha: hovered === null ? 0 : 1,
      scale: hovered === null ? 0.94 : 1,
      duration: reduced ? 0 : FADE_DURATION,
      ease: 'power3.out',
      // Only the fade is overwritten; the quickTo tweens own x and y and must
      // keep running underneath, which is exactly what 'auto' guarantees.
      overwrite: 'auto',
    });
  }, [hovered]);
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The follow effect removes both listeners and calls `gsap.killTweensOf(box)`, which disposes the two quickTo tweens. The mount effect separately kills tweens and runs `clearProps: "all"`, restoring the centring transform and opacity it set. The offscreen plate canvases are dropped by nulling the ref array; they are plain canvases, never object URLs, so there is nothing to revoke.

**Reduced motion.** No `pointermove` listener attaches. The panel docks to the right edge, vertically centred, and hovering a row swaps its plate with a zero-duration cross-fade. The preview still works; it simply never moves.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Calling `gsap.to()` in the `pointermove` handler. It allocates a tween per event and every new one competes with the still-running previous tween for `x`, so the panel judders under fast movement — exactly when the follow is most visible.
- Putting the panel position in React state. Every pointer event becomes a render of the whole list; the follow gets slower the more rows you add, which is a scaling failure with no obvious cause at the call site.
- Omitting the start value on the first call after entry. The panel eases in from wherever it was abandoned, so re-entering the list gives a full second of a panel flying across the layout before it means anything.
- Centring with a negative margin or `left: -130px` as well as `xPercent: -50`. The two offsets compose and the panel sits half a width away from the pointer — a bug that looks like a follow-lag problem and is not one.
- Running `clearProps: "all"` in the cleanup of an effect that only owns `x` and `y`. Any dependency change then wipes the `xPercent`/`yPercent` centring and the `autoAlpha` state owned by a different effect, and the panel jumps or flashes to full opacity mid-hover. Each effect must tear down only what it set.
- Using `overwrite: true` on the fade tween. It kills the quickTo tweens that own `x` and `y`, and the panel freezes in place the moment you move between rows. `overwrite: "auto"` only claims the properties the fade actually animates.
- Transitioning `all` on the row text. The panel and rows share a stacking context, and a blanket transition catches `transform`, which then fights whatever else is animating it.

## Notes

- Gated on `(pointer: fine)`. On touch there is no hover and a `pointermove` only exists mid-drag, so the panel would live directly under the finger dragging it. The touch path docks the panel to the right edge and cross-fades on row change instead, which keeps the preview useful without pretending there is a cursor.
- Reduced motion takes the same docked path — a second of drift is precisely what that user opted out of — and the cross-fade duration drops to 0.
- Both branches read the same `docked()` predicate, so the follow effect and the dock effect can never disagree about which mode the component is in.
- The panel is `aria-hidden` and `pointer-events-none`: it is decoration for the row title, which remains the accessible content.

## Definition of done

Hover a row and the panel fades up over ~350ms while scaling from 0.94. Move the pointer and it follows with about a second of lag, always heading toward the pointer and never quite catching it. Move fast between rows and the image cross-fades while the follow keeps running underneath — the panel never freezes. Leave and re-enter the list and the panel appears at the pointer, not sailing in from the far side. On touch or with reduced motion the panel sits docked at the right edge and only its contents change.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
