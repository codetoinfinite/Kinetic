# Build: Dotted Notepad Surface

A panel textured with a dot grid drawn by a single tiled radial gradient, masked so the pattern dissolves toward the edges instead of ending on a rectangle. An optional turned-down corner is one hard-stopped linear gradient. Nothing is an image, nothing animates, and the whole surface costs one background layer.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A tiled dot grid that dissolves at the panel edges, with a hard-stopped folded corner.

- Category: primitive
- Runtime cost: css
- Dependencies: none beyond React

## How it works

1. One `radial-gradient(circle, dot 1.1px, transparent 1.3px)` is tiled by `background-size: 26px 26px`, so `background-size` alone controls the pitch of the grid and the gradient controls the dot. Changing pitch never requires touching the gradient.
2. The 0.2px between the coloured stop and the transparent stop is the antialiasing ramp. With both stops at the same offset the dot edge quantises to the device pixel grid and the dots render as squares at fractional zoom; wider than about 0.4px and they visibly blur.
3. `background-position: center` rather than `0 0` keeps the lattice symmetric about the panel as it resizes. Pinned to the top-left, a resize crops the pattern on one side only and the grid appears to slide.
4. `mask-image` takes two axis gradients — one vertical, one horizontal — each opaque in the middle and transparent for `--kx-pad-fade` at both ends, combined with `mask-composite: intersect`. Intersecting two linear masks fades all four edges while keeping the interior perfectly flat; a single radial mask would instead darken the corners more than the edges and make a rectangular panel read as a lens.
5. `background-attachment` decides what the tile origin is anchored to, and only matters once the dotted element is itself a scroll container. `scroll` anchors to the element border box so the grid holds still while content slides over it; `local` anchors to the scrolled content so the grid travels with the text and the panel reads as one continuous sheet.
6. The fold is a single absolutely-positioned square carrying `linear-gradient(225deg, void 0 43%, crease 43% 48%, under 48% 100%)`. Hard stops (a stop pair at the same offset) mean no interpolation, so the boundary is a crease and not a shadow. The 225deg gradient line points down-left, which puts the void band at the top-right corner where the paper is turned back.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `pitch = 26px`
  Tile size, therefore dot spacing. Below ~18px the grid starts to read as a flat tone rather than a texture and interferes with body text; above ~34px the dots read as individual objects on the page and compete with content.
- `dotSize = 1.1px`
  Dot radius. At exactly 1px the dot lands on a whole device pixel and hardens; the fractional value is what keeps it soft on 1x displays. Above ~1.6px the surface reads as polka dots rather than paper grain.
- `antialias gap = 0.2px`
  Distance from the colour stop to the transparent stop. This is the only softening the dot gets. At 0 the edge quantises and the dots go square at fractional zoom levels; at 0.5px and above the dot loses its centre and the grid looks smudged.
- `fade = 10%`
  How far the edge mask reaches in. Below ~6% the dissolve is too abrupt to read as intentional and looks like a clipping bug; above ~18% the usable flat area of a small panel disappears and content near the edge visibly ghosts.
- `fold stop positions = 43% / 48%`
  The crease is a 5% sliver. Thinner than ~3% and it drops below a pixel on a small fold and disappears; wider than ~8% and it stops reading as a lit edge and becomes a grey stripe. The 43% start places the crease off-centre so the flap looks lifted rather than symmetrically folded.
- `shadow = 0 34px 70px -34px`
  Negative spread equal to the Y offset. It shrinks the shadow box by exactly the amount the offset moved it, so the blur only escapes below the panel. Without the negative spread a 70px blur haloes all four sides and the sheet looks lit from nowhere.

## API

```ts
function DottedNotepadSurface(props: { children?: ReactNode; pitch?: number; dotSize?: number; fade?: string; scrollable?: boolean; attachment?: 'scroll' | 'local' | 'fixed'; fold?: boolean; radius?: string; className?: string; contentClassName?: string }): JSX.Element
```

- `children: ReactNode`
  Panel content. Rendered above the dot layer.
- `pitch: number` — default `26`
  Grid pitch in pixels. Becomes `background-size`.
- `dotSize: number` — default `1.1`
  Dot radius in pixels. The transparent stop lands 0.2px further out.
- `fade: string` — default `'10%'`
  How far the edge mask reaches in from each side.
- `scrollable: boolean` — default `false`
  Makes the dotted layer the scroll container, which is what gives `attachment` meaning.
- `attachment: 'scroll' | 'local' | 'fixed'` — default `'scroll'`
  Tile origin. `scroll` holds the grid still under scrolling content; `local` scrolls the grid with it.
- `fold: boolean` — default `false`
  Draws the turned-down top-right corner.
- `radius: string` — default `'20px'`
  Panel corner radius. The fold inherits it on its own corner.
- `className: string`
  Merged onto the panel. Use for sizing and border.
- `contentClassName: string`
  Merged onto the content wrapper. Put padding here so text clears the mask.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
const NOTEPAD_CSS = `
.kx-notepad {
  position: relative;
  isolation: isolate;
  border-radius: var(--kx-pad-radius, 20px);
  overflow: hidden;

  /* Negative spread equal to the Y offset pulls the blur back inside the
     footprint, so the shadow only escapes below the panel. Without it a
     70px blur haloes all four sides and the sheet looks lit from nowhere. */
  box-shadow: 0 34px 70px -34px var(--kx-pad-shadow, rgb(0 0 0 / 0.55));
}

.kx-notepad-sheet {
  height: 100%;
  background-color: var(--kx-pad-bg, var(--color-bg-subtle, Canvas));

  /* One dot per tile. The 0.2px between the colour stop and the transparent
     stop IS the antialiasing — with the stops coincident the dot edge snaps
     to the device pixel grid and the dots go square at odd zoom levels. */
  background-image: radial-gradient(
    circle,
    var(--kx-pad-dot, color-mix(in oklab, currentColor 12%, transparent))
      var(--kx-pad-dot-size, 1.1px),
    transparent calc(var(--kx-pad-dot-size, 1.1px) + 0.2px)
  );
  background-size: var(--kx-pad-pitch, 26px) var(--kx-pad-pitch, 26px);

  /* Centred, not 0 0: the pattern then stays symmetric about the panel as it
     resizes instead of being pinned to the top-left and cropped on one side. */
  background-position: center;
  background-repeat: repeat;
  background-attachment: var(--kx-pad-attachment, scroll);

  /* Two axis gradients intersected. Mask reads alpha only, so the colour
     keyword here is arbitrary — 'black' means "keep", 'transparent' means
     "drop". A single radial mask would round the corners of the fade and
     make a rectangular panel look like a lens. */
  mask-image:
    linear-gradient(
      to bottom,
      transparent 0,
      black var(--kx-pad-fade, 10%),
      black calc(100% - var(--kx-pad-fade, 10%)),
      transparent 100%
    ),
    linear-gradient(
      to right,
      transparent 0,
      black var(--kx-pad-fade, 10%),
      black calc(100% - var(--kx-pad-fade, 10%)),
      transparent 100%
    );
  mask-composite: intersect;
}

.kx-notepad-sheet[data-scrollable='true'] {
  overflow-y: auto;
  overscroll-behavior: contain;
}

/* The turned corner: one hard-stopped gradient, no blur, no extra element.
   Band one is the void the fold reveals and must match whatever sits behind
   the panel; band two is a 5% sliver of highlight along the crease; band
   three is the underside of the flap. Hard stops ('0 43%', '43% 48%') are
   what make it read as a crease rather than a soft shadow. */
.kx-notepad-fold {
  position: absolute;
  inset: 0 0 auto auto;
  width: var(--kx-pad-fold, 52px);
  height: var(--kx-pad-fold, 52px);
  border-top-right-radius: var(--kx-pad-radius, 20px);
  pointer-events: none;
  background: linear-gradient(
    225deg,
    var(--kx-pad-void, var(--color-bg, Canvas)) 0 43%,
    var(--kx-pad-crease, color-mix(in oklab, currentColor 20%, transparent)) 43% 48%,
    var(--kx-pad-under, var(--color-surface, Canvas)) 48% 100%
  );
}

.kx-notepad-body {
  position: relative;
  z-index: 1;
}

/* Nothing here animates, so reduced motion has nothing to switch off. The
   surface is identical in both states by construction. */
`;

export function DottedNotepadSurface({
  children,
  pitch = 26,
  dotSize = 1.1,
  fade = '10%',
  scrollable = false,
  attachment = 'scroll',
  fold = false,
  radius = '20px',
  className,
  contentClassName,
}: DottedNotepadSurfaceProps) {
  const style: StyleWithVars = {
    '--kx-pad-pitch': `${pitch}px`,
    '--kx-pad-dot-size': `${dotSize}px`,
    '--kx-pad-fade': fade,
    '--kx-pad-radius': radius,
    '--kx-pad-attachment': attachment,
  };

  return (
    <>
      <style href="kinetic-dotted-notepad-surface" precedence="medium">
        {NOTEPAD_CSS}
      </style>
      <div className={cn('kx-notepad', className)} style={style}>
        <div className="kx-notepad-sheet" data-scrollable={scrollable ? 'true' : undefined}>
          <div className={cn('kx-notepad-body', contentClassName)}>{children}</div>
        </div>
        {fold ? <span className="kx-notepad-fold" aria-hidden="true" /> : null}
      </div>
    </>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing to clean up. No listeners, no timers, no animation frames. The hoisted `<style>` is reference-counted by React and removed when the last instance unmounts.

**Reduced motion.** Nothing in this component moves in either state — there is no animation, transition or timer to disable. The surface renders identically with `prefers-reduced-motion: reduce` set, including the fold and the edge fade.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Putting the mask on the panel and expecting only the dots to fade. A mask applies to everything the element paints, children included, so text within `--kx-pad-fade` of an edge ghosts out. Content padding must exceed the fade inset — that is why the component has a separate content wrapper for padding rather than padding the panel.
- Reaching for `background-attachment: fixed` to get a parallax grid. The tile origin becomes the viewport, but any ancestor with a `transform`, `filter`, `backdrop-filter` or `will-change` becomes the containing block instead, so the effect silently changes meaning as soon as someone animates a parent. It also repaints the element across its full area on every scroll frame, and iOS Safari has never implemented it usefully.
- Setting `background-attachment: local` on a panel that does not scroll and expecting a difference. `local` and `scroll` are identical until the element itself has overflow — the value is inert, so the "fix" appears to do nothing and gets removed.
- Coincident gradient stops on the dot (`radial-gradient(circle, c 1.1px, transparent 1.1px)`). It looks correct in a screenshot at 100% zoom and turns into a field of tiny squares on a 1.25x or 1.5x display.
- Using the `background` shorthand after setting `background-size`. The shorthand resets `background-size` to `auto`, the tile collapses to the gradient default, and the grid becomes one enormous dot.
- Assuming the fold reads as a hole without matching `--kx-pad-void` to what is actually behind the panel. The first band of the fold gradient is a flat colour pretending to be the page; against a different background it reads as a grey triangle stuck on the corner.

## Notes

- `mask-composite: intersect` needs Safari 15.4+, Chrome 120+ and Firefox 53+. Where it is unsupported only the first mask layer applies, so the grid fades top and bottom but not left and right — a degradation, not a break.
- The dot layer is a real background rather than a pseudo-element so that `background-attachment` has a scroll container to refer to. A decorative absolutely-positioned overlay could not express the `local` behaviour at all.
- The CSS ships inside the component as a `<style href precedence>` element; React 19 hoists it into `<head>` and de-duplicates by `href`, so any number of panels contribute one rule set.

## Definition of done

The dot grid is crisp at 100% and at 150% browser zoom — individual dots stay round, not square. All four edges dissolve rather than ending on a line, and the interior is perfectly even. With `scrollable` and `attachment="local"`, scrolling the panel moves the dots with the text; with `attachment="scroll"` the dots stay put while the text slides over them. With `fold`, the corner reads as turned paper with a single sharp crease and no blur.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
