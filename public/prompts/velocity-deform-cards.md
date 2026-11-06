# Build: Velocity-Deformed Cards

Scroll position says where the page is; scroll velocity says how hard the user is pushing it, and that is the input that gives a list a material. Cards skew and stretch along the direction of travel, trail behind by an amount proportional to speed, and ease back to rest when you stop — the ease-out being a property of the filter rather than a keyframe.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Cards skew, stretch and trail in proportion to scroll speed, then settle on their own with no easing curve anywhere.

- Category: scroll
- Runtime cost: dom
- Dependencies: none beyond React

## How it works

1. Velocity comes from `useScrollVelocity`, which filters twice: a one-pole low-pass on the raw per-frame delta so wheel steps stop ringing, then a damped approach toward that filtered value. The second stage is what produces the settle — a step change in speed leaves the filter as a curve, so no easing is ever authored.
2. Both stages use `damp(current, target, smoothing, dt)`, where `smoothing` is the fraction of the gap left after one second. The deformation therefore looks identical on a 60 Hz laptop and a 144 Hz monitor, which the per-frame form (`v += (target - v) * 0.1`) does not.
3. The normalised velocity drives four values per card: trailing translate, skew, stretch along the travel axis, and a squash across it at half the stretch, so the card roughly preserves its area. Without the squash the deformation reads as a scaling bug rather than as inertia.
4. Each card scales its share by a `data-deform` depth. Identical depths make the grid move as one rigid sheet; varied depths make it bend, which is the entire difference between "the page is skewing" and "these cards have weight".
5. Every transform is composed into a string, rounded, and compared with what was written last frame. A stationary list therefore performs zero style writes — at rest all cards produce the same string, and the loop costs one comparison each.
6. Card elements are collected once per `children` change instead of per frame. A `querySelectorAll` inside a rAF loop is a forced style recalculation 60 times a second for a list that changed once.
7. Only `transform` is animated, so the work stays on the compositor. Velocity is held in a ref and never enters React state — a value that changes every frame must not cause a render.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `maxSkew = 5`
  Degrees at full velocity. Around 5 the cards read as flexing; past ~10 the text inside becomes visibly sheared and the effect turns into a distraction the user actively fights.
- `maxLag = 28`
  Pixels a card trails at full velocity. Enough to open a visible gap against the container edge, small enough that a card never appears to belong to a different row.
- `maxStretch = 0.14`
  Fractional stretch along the travel axis. Fourteen percent is at the edge of what reads as elastic rather than broken; the cross-axis squash is half of it, which keeps the area roughly constant.
- `reference = 1400`
  Pixels per second that count as full deflection. A firm trackpad flick peaks around 1200-1800 px/s, so a normal gesture uses most of the range without a hard flick pinning it.
- `smoothing = 0.0002`
  Fraction of the velocity gap left after one second — a settle of roughly a third of a second. Faster and the cards twitch on every wheel step; slower and they keep moving after the scrollbar has visibly stopped, which reads as lag rather than as weight.
- `per-card depth = 0.55 – 1`
  The spread used in the demo. Below about 0.4 a card barely participates and looks broken next to its neighbours; a uniform 1 removes the bend that makes the grid feel like fabric.

## API

```ts
function VelocityDeformCards(props: { children: ReactNode; maxSkew?: number; maxLag?: number; maxStretch?: number; reference?: number; smoothing?: number; scroller?: RefObject<HTMLElement | null>; className?: string }): JSX.Element
```

- `children: ReactNode`
  The grid contents. Elements carrying `data-deform` are the ones deformed.
- `maxSkew: number` — default `5`
  Degrees of skew at full velocity.
- `maxLag: number` — default `28`
  Pixels a card trails at full velocity.
- `maxStretch: number` — default `0.14`
  Stretch along the travel axis at full velocity.
- `reference: number` — default `1400`
  Velocity in px/s that counts as full deflection.
- `smoothing: number` — default `0.0002`
  Fraction of the velocity gap left after one second.
- `scroller: RefObject<HTMLElement | null>`
  Scroll container. Omit to auto-detect.
- `className: string`
  Merged onto the wrapper — the grid definition usually lives here.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function VelocityDeformCards({
  children,
  maxSkew = 5,
  maxLag = 28,
  maxStretch = 0.14,
  reference = 1400,
  smoothing = 0.0002,
  scroller,
  className,
}: VelocityDeformCardsProps) {
  const root = useRef<HTMLDivElement>(null);
  const cards = useRef<HTMLElement[]>([]);
  const written = useRef<string[]>([]);
  const lastVelocity = useRef('');
  const reduced = useReducedMotion();

  // The hook wants an element, not a ref, so the container is resolved once
  // after mount — `document.documentElement` is the window-scroll case and is
  // read through `scrollTop` there too, which is correct on every engine.
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const rootEl = root.current;
    if (!rootEl) return;
    setHost(scroller?.current ?? nearestScroller(rootEl));
  }, [scroller]);

  const velocity = useScrollVelocity({
    reference,
    smoothing,
    // `host` is null until the effect above runs, which means it is null for
    // the whole of the server render — and null is already the answer there.
    // Short-circuiting on it is what keeps `document` out of the render path:
    // reading it unguarded threw a ReferenceError on the server, and a client
    // component still renders there.
    target: host === null || host === document.documentElement ? null : host,
  });

  // Cached rather than queried per frame: a `querySelectorAll` inside the rAF
  // loop is a forced style recalc 60 times a second for a list that changed
  // once.
  useEffect(() => {
    const rootEl = root.current;
    if (!rootEl) return;
    cards.current = Array.from(rootEl.querySelectorAll<HTMLElement>('[data-deform]'));
    written.current = cards.current.map(() => '');
  }, [children]);

  useRaf((_dt) => {
    const rootEl = root.current;
    if (!rootEl) return;

    if (reduced) {
      // One pass to clear, then nothing. The guard below keeps it to one pass.
      for (let i = 0; i < cards.current.length; i += 1) {
        if (written.current[i] === '') continue;
        written.current[i] = '';
        const card = cards.current[i];
        if (card) card.style.transform = '';
      }
      return;
    }

    // -1..1, already low-passed twice. Positive is scrolling down.
    const v = velocity.current.normalized;
    const magnitude = Math.abs(v);

    for (let i = 0; i < cards.current.length; i += 1) {
      const card = cards.current[i];
      if (!card) continue;

      // Per-card depth is the whole effect: identical values make the list
      // move as one rigid sheet, varied values make it bend like cloth.
      const raw = Number.parseFloat(card.dataset.deform ?? '');
      const depth = Number.isFinite(raw) ? raw : 1;

      const lag = -v * maxLag * depth;
      const skew = -v * maxSkew * depth;
      const stretch = 1 + magnitude * maxStretch * depth;
      // Squash across the travel axis by half the stretch: the card keeps
      // roughly its area, which is what stops the deformation reading as a
      // scaling bug.
      const squash = 1 - magnitude * maxStretch * depth * 0.5;

      const transform =
        `translate3d(0, ${lag.toFixed(2)}px, 0) ` +
        `skewY(${skew.toFixed(2)}deg) ` +
        `scale(${squash.toFixed(4)}, ${stretch.toFixed(4)})`;

      // At rest every card produces the same string as last frame, so an idle
      // list costs one comparison per card and zero style invalidations.
      if (written.current[i] === transform) continue;
      written.current[i] = transform;
      card.style.transform = transform;
    }

    // Published for anything that would rather react in CSS than in JS —
    // guarded, so a stationary list stops writing to the DOM entirely.
    const text = v.toFixed(3);
    if (text !== lastVelocity.current) {
      lastVelocity.current = text;
      rootEl.style.setProperty('--scroll-velocity', text);
    }
  });
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** `useRaf` unsubscribes from the shared loop on unmount, and `useScrollVelocity` does the same. There are no listeners, observers or timers to remove; the only state is refs and one element resolved after mount, and every transform is written on nodes React owns.

**Reduced motion.** When `prefers-reduced-motion: reduce` matches, one pass clears every transform and the loop then writes nothing at all. The cards keep their layout, spacing and hover states, so the grid is intact — it simply does not flex. Toggling the OS setting takes effect on the next frame without a reload.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Feeding raw `scrollY` deltas straight into the transform. A trackpad emits bursts and a mouse wheel emits steps, so the cards strobe instead of flexing — the two filter stages exist precisely for this.
- Smoothing with a per-frame constant. The settle is more than twice as fast on a 144 Hz display, and every tuning pass that fixes one refresh rate breaks the other.
- Stretching without squashing. The cards visibly gain area at speed, which the eye reads as a rendering fault rather than as elasticity.
- Giving every card the same depth. The whole grid then skews as one plane, which looks like the viewport is broken rather than like the cards have mass.
- Putting velocity in React state. That is a re-render per frame, and the reconciliation cost alone is enough to lower the frame rate that the velocity is measured against — the effect degrades itself.
- Writing transforms unconditionally. Idle frames still cost a style invalidation and a composite for each card, on a list where nothing moved.
- Querying the cards inside the loop. `querySelectorAll` per frame forces style resolution 60 times a second for a list whose contents changed once.
- Animating `top`, `margin` or `height` for the trail instead of `transform`. Every frame relayouts the whole grid, and the deformation becomes a slideshow on any laptop.

## Notes

- The scroll container is auto-detected by walking ancestors for a scrollable `overflow-y`; pass `scroller` when it is ambiguous. `useScrollVelocity` takes an element rather than a ref, so the container is resolved once after mount.
- The normalised velocity is also published as `--scroll-velocity` on the root, so a border colour or a blur can react in CSS without another JS subscriber.
- Set `will-change: transform` on the cards, not on the container: the container never moves, and promoting a large scrolling element wastes memory for nothing.

## Definition of done

A fast flick skews and stretches the cards in the direction of travel by different amounts per column, and they settle within about a third of a second after the scroll stops, with no overshoot. Text stays readable throughout. At rest, a paint-flashing or style-recalc profile shows no per-frame work. The settle takes the same wall-clock time at 60 and 144 Hz. With reduced motion on, nothing deforms.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
