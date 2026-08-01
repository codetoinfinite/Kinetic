# Build: A/B Layer Ping-Pong

A double buffer for DOM content. Incoming content is written into whichever of two absolutely-positioned layers is currently invisible, then the two swap opacity. Because the outgoing content is still on screen, every change is a real crossfade rather than a swap with a fade bolted on — and running two of these at different durations is how a hover preview gets its lag between thumbnail and full-bleed background.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Two stacked layers alternate so any change crossfades, however fast you move between rows.

- Category: transition
- Runtime cost: dom
- Dependencies: gsap@^3.15.0

## How it works

1. Two absolutely positioned layers share a stacking context. A `front` slot (`"a"` or `"b"`) records which one is currently visible; the other is always at opacity 0.
2. When `contentKey` changes, the new children are written into the BACK slot and `front` flips. The back layer is already transparent, so the new content mounts invisibly — writing into the front layer instead would replace the outgoing content before it had faded.
3. `gsap.killTweensOf([inEl, outEl])` runs before every transition. Moving across a list faster than the duration otherwise leaves an unfinished fade-out driving the same node a fade-in is now driving up, and the layers flicker.
4. Two symmetric tweens — `opacity: 1` on the incoming layer, `opacity: 0` on the outgoing — with `power2.inOut`, which keeps the midpoint of the fade at roughly equal luminance instead of dipping through a visible trough.
5. The first commit is a `gsap.set`, not a tween, so the initial content is simply present; only subsequent key changes animate.
6. The last `contentKey` acted on is held in a ref, so a parent re-rendering with the same key (new inline children, a hover on the row that is already active) does not restart the fade.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `duration (background) = 1`
  Seconds. A full-bleed area needs a long fade or the whole frame appears to jump brightness; at 0.5s a large gradient change reads as a cut.
- `duration (thumbnail) = 0.6`
  The small element under the cursor answers first. Both at 1s and the interface feels unresponsive; both at 0.6s and the background flickers on fast passes. The 0.4s difference is the effect.
- `ease = 'power2.inOut'`
  Symmetric ease on both halves keeps their crossover near 50/50. With `power2.out` on the way in and `power2.in` on the way out, both layers are dim at the midpoint and the panel visibly darkens mid-fade.

## API

```ts
function ABLayerCrossfade(props: { contentKey: string; children: ReactNode; duration?: number; ease?: string; className?: string }): JSX.Element
```

- `contentKey: string`
  Identity of the current content. A change starts a crossfade.
- `children: ReactNode`
  Content for the current key. Captured into a layer at the moment the key changes.
- `duration: number` — default `1`
  Crossfade length in seconds. Use a shorter one for the smaller element in a pair.
- `ease: string` — default `'power2.inOut'`
  GSAP ease applied to both halves.
- `className: string`
  Merged onto the positioned wrapper. Give it a size — the layers are absolute.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function ABLayerCrossfade({
  contentKey,
  children,
  duration = 1,
  ease = 'power2.inOut',
  className,
}: ABLayerCrossfadeProps) {
  const aRef = useRef<HTMLDivElement>(null);
  const bRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const [front, setFront] = useState<Slot>('a');
  const [layers, setLayers] = useState<{ a: ReactNode; b: ReactNode }>({
    a: children,
    b: null,
  });

  const shownKey = useRef(contentKey);
  const frontRef = useRef<Slot>('a');
  const first = useRef(true);

  // Write into the BACK layer, then flip. The back layer is already at
  // opacity 0, so the new content mounts invisibly — no flash of it at full
  // strength before the tween starts.
  useEffect(() => {
    if (shownKey.current === contentKey) return;
    shownKey.current = contentKey;
    const next: Slot = frontRef.current === 'a' ? 'b' : 'a';
    frontRef.current = next;
    setLayers((l) => ({ ...l, [next]: children }));
    setFront(next);
  }, [contentKey, children]);

  useEffect(() => {
    const inEl = front === 'a' ? aRef.current : bRef.current;
    const outEl = front === 'a' ? bRef.current : aRef.current;
    if (!inEl || !outEl) return;

    if (first.current) {
      first.current = false;
      gsap.set(inEl, { opacity: 1 });
      gsap.set(outEl, { opacity: 0 });
      return;
    }

    // Kill first, always. Two rapid changes otherwise leave an old fade-out
    // running on the layer the new fade-in is driving up.
    gsap.killTweensOf([inEl, outEl]);

    if (reduced) {
      gsap.set(inEl, { opacity: 1 });
      gsap.set(outEl, { opacity: 0 });
      return;
    }

    gsap.to(inEl, { opacity: 1, duration, ease });
    gsap.to(outEl, { opacity: 0, duration, ease });
  }, [front, duration, ease, reduced]);

  useEffect(
    () => () => {
      gsap.killTweensOf([aRef.current, bRef.current]);
    },
    [],
  );
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** An unmount effect calls `gsap.killTweensOf` on both layer elements, so an in-flight fade cannot write opacity to a detached node after React has removed it.

**Reduced motion.** The layers still ping-pong, but the swap is a `gsap.set` rather than a tween: content changes instantly with no fade. The double-buffer structure is unchanged, so nothing else in the component behaves differently.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Crossfading one element by swapping its content at opacity 0. There is nothing to fade out of, so it reads as a blink; the two-layer buffer is the whole point.
- Writing incoming content into the front layer. The old content is replaced before it has faded, which is a hard cut with a pointless fade on top.
- Skipping `killTweensOf`. Hovering four rows in a second stacks eight opacity tweens across two nodes, and the layers end up at whatever the last-finishing pair leaves behind — usually both partly transparent.
- Giving both layers the same duration in a paired preview. The lag between the small element and the full-bleed one is what makes the interaction feel like it is answering you; without it the whole frame changes at once and reads as a page change.
- Restarting the fade when the parent re-renders. Any inline `children` array is a new object every render, so the effect must compare `contentKey`, not identity, or a hover crossfades continuously.
- Leaving tweens running past unmount. They keep writing opacity onto detached nodes; the unmount cleanup kills both layers.

## Notes

- Layers hold whatever you give them — a gradient, a canvas, a `<video>`, an image. Nothing here is image-specific.
- Content is captured per key, so if the same key needs to show new children you must change the key. That is deliberate: it is the only way to know when a transition is warranted.
- App Router wiring: pass `contentKey={usePathname()}` and render the route content as children for a whole-page crossfade with no layout thrash.

## Definition of done

Move down a list at a normal pace and each change is a smooth blend with no dip in brightness at the midpoint. Sweep the cursor across every row as fast as you can and the layers never flicker or settle half-faded. In a paired setup, the small preview visibly finishes before the background does.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
