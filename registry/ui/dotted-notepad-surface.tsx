'use client';

import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/cn';

/* ==========================================================================
   Dotted Notepad Surface
   --------------------------------------------------------------------------
   A tiled dot grid drawn entirely by one `radial-gradient` whose tile size is
   the grid pitch, masked so it dissolves at the edges instead of stopping at
   a hard rectangle.

   The part people get wrong is `background-attachment`, which only becomes
   observable once the surface itself scrolls:

     scroll (default) — the tile origin is the element's border box. The grid
                        is nailed to the panel; content slides over a grid
                        that never moves. Reads as a window onto a wall.
     local            — the tile origin is the element's scrollable content
                        origin. The grid travels with the text, so the panel
                        reads as one continuous sheet of paper.
     fixed            — the tile origin is the viewport. Almost always a
                        mistake here: any transformed, filtered or
                        `will-change`d ancestor becomes the containing block
                        and silently changes what "viewport" means, and the
                        element repaints across its whole area on every scroll
                        frame.
   ========================================================================== */

/** Lets an inline `style` object carry custom properties without a cast. */
type StyleWithVars = CSSProperties & Record<`--${string}`, string | number>;

export interface DottedNotepadSurfaceProps {
  children?: ReactNode;
  /** Grid pitch in pixels — the `background-size` of one tile. */
  pitch?: number;
  /** Dot radius in pixels. The transparent stop lands 0.2px further out. */
  dotSize?: number;
  /** How far the edge fade reaches in from each side. Any CSS length or %. */
  fade?: string;
  /** Makes the dotted layer the scroll container, which is what gives `attachment` meaning. */
  scrollable?: boolean;
  /** Tile origin. Only observable when `scrollable` is set. */
  attachment?: 'scroll' | 'local' | 'fixed';
  /** Draws the turned-down top-right corner. */
  fold?: boolean;
  /** Corner radius of the panel. */
  radius?: string;
  className?: string;
  /** Applied to the inner content wrapper — put padding here, not on the panel. */
  contentClassName?: string;
}

// #region critical
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
// #endregion critical
