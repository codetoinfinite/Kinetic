import type { Motif } from '@/scripts/schema';
import { BOX, O, W, q } from '@/components/preview/motif/atoms';
import { FALLBACK_PLATE, PLATES } from '@/components/preview/motif/plates';
import {
  resolve,
  type Anchor,
  type NonEmpty,
  type PlateSpec,
} from '@/components/preview/motif/variation';

/* ==========================================================================
   Static posters.
   --------------------------------------------------------------------------
   A hundred and ten live previews is not a design decision, it is a hardware
   limit — see lib/preview-budget.ts. So a card that has not been granted a
   slot needs something to be, and "grey box" throws away the one moment where
   the grid can communicate anything.

   Eight motifs, one per family of technique, drawn against the category accent
   that the enclosing [data-category] subtree already sets. What changed: eight
   drawings across 119 components meant every family's picture appeared up to
   thirty-seven times on one screen, and a poster repeated thirty-seven times
   stops being a drawing and becomes wallpaper. So the family now selects a
   grammar and the slug selects the specimen — see motif/variation.ts for the
   selector and motif/plates.tsx for the sixty-four plates.

   Still hand-drawn, for the reason it always was: a generated placeholder
   looks generated, and this is the state most cards are in most of the time.
   The hash therefore only ever chooses between drawn options — which plate,
   how many elements, which of four turns, where the accent goes. It never
   moves a coordinate.

   Cost: one pure function, no ids, no filters, no state, no effect, no GPU
   context. The whole surface is stroked <path>/<rect>/<ellipse> against the
   page background, so 119 of these cost one paint and never a second one.
   ========================================================================== */

/* MOTION: shipped static, deliberately.
   Every one of these is on screen simultaneously in the browse grid, so any
   repeating animation is 119 concurrent compositor jobs behind whichever card
   the eye is actually on — and the live previews are the thing that is
   supposed to move. A poster that also moves competes with the preview it is
   standing in for. Calm and legible at a glance beats animated, and the brief
   is explicit that static and beautiful wins. The only motion here belongs to
   preview-host's own opacity cross-fade as a real preview takes over. */

/* Composition offsets. Five positions, all inside the safe box, so shifting
   the figure can never push geometry past the viewBox. */
const ANCHOR: Record<Anchor, readonly [number, number]> = {
  center: [0, 0],
  left: [-5, 0],
  right: [5, 0],
  high: [0, -3.5],
  low: [0, 3.5],
};

/* Applied in this order so mirror and scale both act on the figure's own
   centre rather than on the shifted one — otherwise `right` + mirror would
   silently cancel out and two distinct specs would draw the same poster. */
function figureTransform(s: PlateSpec): string | undefined {
  const [dx, dy] = ANCHOR[s.anchor];
  const parts: string[] = [];

  if (dx !== 0 || dy !== 0) parts.push('translate(' + String(dx) + ' ' + String(dy) + ')');
  if (s.mirror) parts.push('translate(100 0) scale(-1 1)');
  if (s.scale !== 1) {
    parts.push('translate(50 32) scale(' + String(s.scale) + ') translate(-50 -32)');
  }

  return parts.length > 0 ? parts.join(' ') : undefined;
}

/**
 * Frame furniture: the marks a plate would carry if it were a page from a
 * technical manual. Drawn at ghost weight outside the figure transform, so it
 * stays registered to the frame while the figure moves inside it — which is
 * the whole reason it reads as apparatus rather than as part of the drawing.
 */
function Chrome({ kind }: { kind: PlateSpec['chrome'] }) {
  if (kind === 'ticks') {
    const corners: readonly (readonly [number, number, number, number])[] = [
      [BOX.x0, BOX.y0, 1, 1],
      [BOX.x1, BOX.y0, -1, 1],
      [BOX.x0, BOX.y1, 1, -1],
      [BOX.x1, BOX.y1, -1, -1],
    ];
    return (
      <g opacity={O.faint} strokeWidth={W.faint}>
        {corners.map(([x, y, sx, sy], i) => (
          <g key={i}>
            <line x1={x} y1={y} x2={q(x + sx * 5)} y2={y} />
            <line x1={x} y1={y} x2={x} y2={q(y + sy * 4)} />
          </g>
        ))}
      </g>
    );
  }

  if (kind === 'baseline') {
    return (
      <g opacity={O.faint} strokeWidth={W.faint}>
        <line x1={BOX.x0} y1={BOX.y1} x2={BOX.x1} y2={BOX.y1} />
        <line x1={q(BOX.x0 + BOX.w / 3)} y1={BOX.y1} x2={q(BOX.x0 + BOX.w / 3)} y2={q(BOX.y1 + 3)} />
      </g>
    );
  }

  if (kind === 'gauge') {
    return (
      <g opacity={O.ghost} strokeWidth={W.faint}>
        <line x1={BOX.x0} y1={BOX.y0} x2={BOX.x0} y2={BOX.y1} />
        {[0, 1, 2, 3, 4, 5, 6].map((i) => {
          const y = q(BOX.y0 + i * (BOX.h / 6));
          return <line key={i} x1={BOX.x0} y1={y} x2={q(BOX.x0 + (i % 2 === 0 ? 4 : 2))} y2={y} />;
        })}
      </g>
    );
  }

  return null;
}

/**
 * The `axis` deployment of the accent: instead of lighting up one element of
 * the figure, the category hue is spent on a single measure line under it. It
 * is the quietest posture in the system and the reason a fifth of the grid
 * doesn't have a coloured element competing with its own drawing.
 */
function AccentAxis({ turn }: { turn: number }) {
  const lines: NonEmpty<readonly [number, number, number, number]> = [
    [6, 32, 94, 32],
    [50, 3, 50, 61],
    [6, 54, 94, 54],
    [22, 3, 22, 61],
  ];
  const [x1, y1, x2, y2] = lines[turn] ?? lines[0];
  return (
    <g className="text-accent">
      <line x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={W.faint} opacity={O.mid} />
      <rect x={q(x2 - 1)} y={q(y2 - 1)} width={2} height={2} fill="currentColor" stroke="none" opacity={0.85} />
    </g>
  );
}

/**
 * `slug` is optional because preview-host currently passes only the motif;
 * without it the poster degrades to one plate per family, which is exactly the
 * old behaviour. Passing the slug is what turns eight pictures into 119, so
 * the host should hand it over — the fallback exists so that a call site which
 * hasn't yet still renders something drawn rather than nothing.
 */
export function MotifPoster({ motif, slug }: { motif: Motif; slug?: string }) {
  const spec = resolve(motif, slug ?? motif);
  // Motif arrives cast from a plain string at the card layer, so an unknown
  // family must still land on a plate: never a blank poster.
  const Plate = PLATES[motif] ?? FALLBACK_PLATE;

  return (
    <>
      {/*
        vector-effect is not an inherited property, so the attribute this
        component used to carry on the <svg> root did nothing: a 0.5-unit
        stroke rendered near 1px on a browse card and near 4.5px on the detail
        hero, which is why the posters read heavy at large sizes. One hoisted
        rule fixes every descendant, lets the weights in atoms.ts be honest CSS
        pixels, and saves repeating the attribute on ~30 nodes × 119 posters of
        server-rendered markup. React dedupes by href, so it ships once.

        Hooked on a data attribute rather than a class: this is the component's
        own selector, not a utility and not one of globals.css's component
        classes, and check:classes is right to report a class that no stylesheet
        in the theme declares.
      */}
      <style href="kx-poster" precedence="default">
        {'[data-kx-plate] * { vector-effect: non-scaling-stroke; }'}
      </style>
      <svg
        viewBox="0 0 100 64"
        /* meet, not slice: the poster is used at 16/10 on cards, 2/1 on the
           detail hero and near-portrait on the standalone preview page, and
           slice would crop a third of the figure's width in the last case.
           There is no background fill, so the letterbox is invisible. */
        preserveAspectRatio="xMidYMid meet"
        data-kx-plate=""
        className="h-full w-full text-fg"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
      >
        <Chrome kind={spec.chrome} />
        {spec.accentMode === 'axis' ? <AccentAxis turn={spec.turn} /> : null}
        <g transform={figureTransform(spec)}>
          <Plate s={spec} />
        </g>
      </svg>
    </>
  );
}
