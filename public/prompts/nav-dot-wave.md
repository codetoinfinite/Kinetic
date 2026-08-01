# Build: Nav Dot Wave

One keyframe block and N elements. Each nav item writes its own index into an inline `--i`, and the stylesheet turns that index into an animation delay, so a crest travels along the row. Adding a nav item requires no change to the CSS and no JavaScript at all.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Nav dots that lift in sequence. The index is an inline custom property; CSS derives the delay.

- Category: primitive
- Runtime cost: css
- Dependencies: none beyond React

## How it works

1. Every list item carries `style={{ "--i": i }}`. The dot's rule reads `animation-delay: calc(var(--i, 0) * var(--kx-dot-stagger, 60ms))`, so the phase offset of each dot is derived from its position rather than authored per item. The index is data; the timing is a function of it.
2. The keyframe is deliberately mostly flat: `0%, 60%, 100%` is the resting pose and only `30%` lifts. The dot therefore rests for 40% of every 1400 ms cycle. That long rest is what makes a staggered set read as a single crest travelling along the row instead of a row of dots vibrating in place.
3. 0% is the resting pose, not the lifted one, and that ordering is load-bearing. A positive `animation-delay` holds an element at its 0% pose until the delay expires, so if 0% were the lift, every dot would sit visibly raised for its share of the stagger on first paint and the row would *settle* into place rather than start from it.
4. The active item swaps to a second keyframe (`kx-dotwave-active`) with identical geometry but a constant `opacity: 1`. It participates in the wave so the row stays coherent, but it never dims, because a location marker that fades to 45% twice a second is a marker you cannot trust.
5. The lift is written with the `translate` property, not `transform`, so the active state's `scale: 1.6` composes independently and can carry its own spring transition without either value clobbering the other.
6. `reverse` negates the stagger to `-60ms`. Negative delays start an animation already partway through its cycle, so the phase gradient inverts and the crest runs right-to-left with no second keyframe.
7. The CSS ships in a `<style href="kinetic-nav-dot-wave" precedence="medium">` element. React 19 deduplicates and hoists it to the head by `href`, so the rules exist exactly once no matter how many navs are mounted, and nothing has to be added to a global stylesheet.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `durationMs = 1400`
  One dot's full cycle. Below ~900 ms the lift reads as a nervous twitch; above ~2000 ms the crest is so slow that a user glancing at the nav sees a static row and the effect is paid for but not perceived.
- `staggerMs = 60`
  Phase gap between neighbours. The crest travels at one item per 60 ms. Under ~30 ms the dots look simultaneous; over ~120 ms the wave breaks into visibly separate blips because the leading dot has finished its lift before the next begins.
- `keyframe rest span = 0%, 60%, 100%`
  The dot is flat for 40% of the cycle. Shrink the rest and adjacent dots overlap enough that the whole row appears raised at once, which is a vibration, not a wave.
- `peak position = 30%`
  The lift peaks in the first third and eases back over the next third. Symmetric timing (peak at 50%) makes each dot look like it is hovering rather than being flicked, and the crest loses its direction.
- `lift = 3`
  Pixels. A nav dot is 5px; 3px is a lift of over half its diameter, which is legible at a glance. Past ~6px the dots start colliding with the label baseline and the row looks broken rather than animated.
- `resting opacity = 0.45`
  Low enough that the peak at 1.0 registers as a change, high enough that an inactive nav item is still readable. Below ~0.3 the dots vanish against a dark surface and the row appears to lose items.
- `active scale = 1.6`
  The current-page dot has to win against five siblings that are all moving. Under ~1.3 it is lost in the wave; over ~2 it stops reading as the same kind of object as its neighbours.

## API

```ts
function NavDotWave(props: { items: readonly { label: string; href?: string }[]; activeIndex?: number; staggerMs?: number; durationMs?: number; lift?: number; size?: number; reverse?: boolean; className?: string }): JSX.Element
```

- `items: readonly NavDotWaveItem[]`
  Nav entries. Each is `{ label, href? }`; the label is also the React key.
- `activeIndex: number` — default `0`
  Index of the current page. Its dot grows, takes the accent colour and stops dimming.
- `staggerMs: number` — default `60`
  Milliseconds between one dot's phase and the next.
- `durationMs: number` — default `1400`
  Full cycle of a single dot, in milliseconds.
- `lift: number` — default `3`
  Peak lift in pixels.
- `size: number` — default `5`
  Dot diameter in pixels.
- `reverse: boolean` — default `false`
  Negates the stagger so the crest runs right-to-left.
- `className: string`
  Merged onto the `nav` element.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
const DOT_WAVE_CSS = `
/* 0% is the RESTING pose, not the lifted one. That matters: a positive
   animation-delay holds the element at its 0% pose until the delay expires,
   so if 0% were the lift, every dot would sit visibly raised for its share of
   the stagger on first paint and the row would settle rather than start. */
@keyframes kx-dotwave {
  0%, 60%, 100% { opacity: 0.45; translate: 0 0; }
  30%           { opacity: 1;    translate: 0 var(--kx-dot-lift, -3px); }
}

/* The current item never dims — it is a location marker, and a marker that
   fades to 45% twice a second is a marker you cannot trust. */
@keyframes kx-dotwave-active {
  0%, 60%, 100% { opacity: 1; translate: 0 0; }
  30%           { opacity: 1; translate: 0 var(--kx-dot-lift, -3px); }
}

.kx-dotwave-list {
  display: flex;
  align-items: center;
  gap: var(--kx-dot-gap, 1.5rem);
  list-style: none;
  margin: 0;
  padding: 0;
}

.kx-dotwave-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-muted, currentColor);
  transition: color 200ms linear;
}

.kx-dotwave-link:hover,
.kx-dotwave-item[data-active="true"] .kx-dotwave-link {
  color: var(--color-fg, currentColor);
}

.kx-dotwave-dot {
  width: var(--kx-dot-size, 5px);
  height: var(--kx-dot-size, 5px);
  border-radius: 9999px;
  background-color: currentColor;
  flex: none;
  scale: 1;

  animation: kx-dotwave var(--kx-dot-duration, 1400ms) ease-in-out infinite;
  animation-delay: calc(var(--i, 0) * var(--kx-dot-stagger, 60ms));

  /* 'translate' and 'opacity', not 'transform' — the scale below belongs to
     the active state and has to survive independently of the wave. */
  will-change: translate, opacity;
  transition: scale 260ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.kx-dotwave-item[data-active="true"] .kx-dotwave-dot {
  animation-name: kx-dotwave-active;
  background-color: var(--color-accent, currentColor);
  scale: 1.6;
}

/* No motion: the crest is decoration, so it goes. Everything that carries
   information stays — the current item keeps its accent colour and its larger
   dot, the rest keep their dimmed one. */
@media (prefers-reduced-motion: reduce) {
  .kx-dotwave-dot {
    animation: none;
    opacity: 0.45;
    will-change: auto;
  }
  .kx-dotwave-item[data-active="true"] .kx-dotwave-dot {
    opacity: 1;
  }
}
`;

export function NavDotWave({
  items,
  activeIndex = 0,
  staggerMs = 60,
  durationMs = 1400,
  lift = 3,
  size = 5,
  reverse = false,
  className,
}: NavDotWaveProps) {
  const rootStyle: StyleWithVars = {
    '--kx-dot-stagger': `${reverse ? -staggerMs : staggerMs}ms`,
    '--kx-dot-duration': `${durationMs}ms`,
    '--kx-dot-lift': `${-lift}px`,
    '--kx-dot-size': `${size}px`,
  };

  return (
    <>
      <style href="kinetic-nav-dot-wave" precedence="medium">
        {DOT_WAVE_CSS}
      </style>
      <nav className={cn('kx-dotwave', className)} style={rootStyle}>
        <ul className="kx-dotwave-list">
          {items.map((item, i) => {
            // The index is the only per-item data the stylesheet needs. Every
            // timing decision is derived from it in CSS.
            const itemStyle: StyleWithVars = { '--i': i };
            const active = i === activeIndex;
            return (
              <li
                key={item.label}
                className="kx-dotwave-item"
                data-active={active ? 'true' : 'false'}
                style={itemStyle}
              >
                <a
                  href={item.href ?? '#'}
                  className="kx-dotwave-link text-xs tracking-tight"
                  aria-current={active ? 'page' : undefined}
                >
                  <span className="kx-dotwave-dot" aria-hidden="true" />
                  {item.label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing imperative to tear down. The stylesheet is a React-managed `<style>` with an `href` key, so React owns its lifetime and deduplicates it across instances; unmounting the nav removes the elements and the animations with them.

**Reduced motion.** A `@media (prefers-reduced-motion: reduce)` block in the component's own stylesheet sets `animation: none` and `will-change: auto` on the dots, drops them to the resting opacity, and holds the active dot at full opacity. The accent colour and the 1.6x active scale stay, so the nav still shows where you are — only the travelling crest is removed.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Putting the lift at 0% of the keyframe. `animation-delay` freezes the element at its 0% pose, so on first paint the whole row sits raised and drops in sequence — the animation appears to run once backwards before starting.
- Animating `transform` for both the lift and the active scale. The last-declared transform wins, so the active dot either loses its lift or snaps back to scale 1 every cycle. Separate `translate` and `scale` properties compose instead.
- Driving the stagger from JavaScript with a timer or a per-item inline delay string. It costs a re-render per item, drifts out of phase with the CSS clock, and stops working the moment items are added dynamically.
- Letting the active dot dim with the rest. It is the only element on the page telling the user where they are; a marker at 45% opacity for most of every cycle is worse than no marker.
- Leaving `will-change: translate, opacity` on under reduced motion. The animation is gone but the compositor layer is not, so a nav that no longer moves still holds GPU memory on every dot.
- Removing the animation under reduced motion and removing the active state with it. The accent colour and the larger dot carry information, not decoration — only the crest should go.
- Keying the list by index while items reorder. The `--i` and the label desynchronise for one frame and a dot appears to jump across the row.

## Notes

- Nothing here is JavaScript-driven: no rAF, no observers, no state. The component's entire runtime cost is one style element and one inline custom property per item, which is why it is safe in a header that mounts on every route.
- The `--i` pattern generalises. Any staggered CSS animation — list entrances, grid reveals, letter-by-letter text — can take its delay from an index custom property instead of from generated per-item rules or a JavaScript timeline.
- Set `activeIndex` from your router. `aria-current="page"` is applied to the matching link, so the state is announced as well as drawn.

## Definition of done

A crest travels left-to-right along the dots once every 1.4 s and each dot is flat for most of that time. On first paint no dot is raised. The current item's dot is accent-coloured, 1.6x larger, and never dims while its neighbours do. Set `reverse` and the crest runs the other way. With reduced motion nothing moves, but the active dot is still larger and still accented.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
