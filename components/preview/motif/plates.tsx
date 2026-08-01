import type { Motif } from '@/scripts/schema';
import {
  BOX,
  O,
  W,
  accented,
  bayer,
  contourAt,
  cosT,
  dashOf,
  humps,
  ink,
  inkFill,
  poly,
  q,
  ramp,
  seq,
  sinT,
  trailPoint,
} from '@/components/preview/motif/atoms';
import {
  VARIANTS,
  type Fixed,
  type NonEmpty,
  type PlateSpec,
} from '@/components/preview/motif/variation';

/* ==========================================================================
   Sixty-four plates, eight families.
   --------------------------------------------------------------------------
   The taxonomy is unchanged and load-bearing: a scroll component's poster is
   still a scroll poster, because the eight families are how the grid says
   anything at all about what a card contains. What changes is that a family
   is now a grammar rather than a picture. `stack` carries 37 components and
   gets fourteen plates; `noise` carries 7 and gets six.

   Every plate is drawn, not parameterised. The spec chooses between them and
   sets counts, turns, anchors and where the accent goes — it never moves a
   coordinate, which is the difference between a set of specimens and a
   generator with the noise turned down.

   Read the plates as technical illustration: nothing is centred by accident,
   nothing is shaded, the second ink is spent once. Where a plate can draw the
   actual technique its family stands for — the Bayer matrix in `noise`, the
   sheared deck in `stack`, the dithered threshold — it does, because a
   diagram that happens to be true is worth more than one that is merely
   decorative.
   ========================================================================== */

interface Props {
  s: PlateSpec;
}

export type Plate = (props: Props) => React.JSX.Element;

/* -- stack ------------------------------------------------------------------
   Layers, sheets, z-order, containment. The family the transition and layout
   components mostly land in, and the one that had to carry 37 cards on one
   drawing before this. */

function StackNested({ s }: Props) {
  const n = s.count;
  const step = 13 / Math.max(1, n - 1);
  return (
    <>
      {seq(n).map((i) => {
        const dx = i * step;
        const dy = dx * 0.586;
        return (
          <rect
            key={i}
            x={q(21 + dx)}
            y={q(15 + dy)}
            width={q(58 - dx * 2)}
            height={q(34 - dy * 2)}
            strokeDasharray={i === n - 1 ? dashOf(s.dash) : 'none'}
            {...ink(s, i, n, ramp(i, n))}
          />
        );
      })}
    </>
  );
}

function StackCascade({ s }: Props) {
  const n = s.count;
  const dx = 7;
  const dy = 4.5;
  const x0 = 28 - ((n - 1) * dx) / 2;
  const y0 = 19 - ((n - 1) * dy) / 2;
  return (
    <>
      {seq(n).map((i) => (
        <rect
          key={i}
          x={q(x0 + i * dx)}
          y={q(y0 + i * dy)}
          width={44}
          height={26}
          strokeDasharray={i === 0 ? dashOf(s.dash) : 'none'}
          {...ink(s, i, n, ramp(i, n, O.faint, O.key))}
        />
      ))}
    </>
  );
}

function StackFan({ s }: Props) {
  const n = s.count;
  const step = [3, 5, 7, 9][s.turn] ?? 5;
  return (
    <>
      {seq(n).map((i) => (
        <rect
          key={i}
          x={27}
          y={20}
          width={46}
          height={28}
          transform={'rotate(' + q((i - (n - 1) / 2) * step) + ' 50 54)'}
          {...ink(s, i, n, ramp(i, n))}
        />
      ))}
    </>
  );
}

function StackDeck({ s }: Props) {
  const n = s.count;
  const d = Math.min(11, 34 / Math.max(1, n - 1));
  const y0 = 32 - ((n - 1) * d + 14) / 2;
  return (
    <>
      {seq(n).map((i) => (
        <rect
          key={i}
          x={24}
          y={q(y0 + i * d)}
          width={52}
          height={14}
          strokeDasharray={i === n - 1 ? dashOf(s.dash) : 'none'}
          {...ink(s, i, n, ramp(i, n))}
        />
      ))}
    </>
  );
}

function StackSpread({ s }: Props) {
  const n = s.count;
  const d = Math.min(16, 54 / Math.max(1, n - 1));
  const x0 = 50 - ((n - 1) * d + 26) / 2;
  return (
    <>
      {seq(n).map((i) => (
        <rect key={i} x={q(x0 + i * d)} y={16} width={26} height={32} {...ink(s, i, n, ramp(i, n))} />
      ))}
    </>
  );
}

/* One band steps out of the stack. The offset is the whole drawing, so it is a
   full 9 units — a 2-unit nudge would read as a mistake. */
function StackBandSplit({ s }: Props) {
  const n = s.count;
  const bh = 36 / n;
  return (
    <>
      <line x1={20} y1={13} x2={20} y2={51} strokeWidth={W.hair} opacity={O.faint} />
      {seq(n).map((i) => {
        const out = accented(s, i, n);
        return (
          <rect
            key={i}
            x={q(22 + (out ? 9 : 0))}
            y={q(14 + i * bh)}
            width={56}
            height={q(bh - 1.4)}
            {...ink(s, i, n, ramp(i, n))}
          />
        );
      })}
    </>
  );
}

/* Two buffers, half a frame apart. The dashed one is the layer that is not
   currently showing, which is the only thing worth saying about a ping-pong. */
function StackPingPong({ s }: Props) {
  const m = s.count2;
  return (
    <>
      <rect x={18} y={12} width={48} height={30} {...ink(s, 0, 2, O.strong)} />
      {seq(m).map((j) => (
        <line
          key={j}
          x1={24}
          y1={q(19 + j * (16 / Math.max(1, m)))}
          x2={q(24 + [30, 22, 26, 18][j % 4]!)}
          y2={q(19 + j * (16 / Math.max(1, m)))}
          strokeWidth={W.faint}
          opacity={O.faint}
        />
      ))}
      <rect
        x={34}
        y={22}
        width={48}
        height={30}
        strokeDasharray={dashOf(s.dash === 0 ? 2 : s.dash)}
        {...ink(s, 1, 2, O.mid)}
      />
    </>
  );
}

function StackLedger({ s }: Props) {
  const m = s.count2 * 2;
  const lens = [36, 28, 33, 22, 30, 26, 34, 24];
  return (
    <>
      <rect x={20} y={13} width={60} height={38} strokeWidth={W.hair} opacity={O.mid} />
      <line x1={33} y1={13} x2={33} y2={51} strokeWidth={W.hair} opacity={O.faint} />
      {seq(m).map((j) => {
        const y = q(18 + j * (28 / Math.max(1, m - 1)));
        return (
          <line
            key={j}
            x1={37}
            y1={y}
            x2={q(37 + (lens[j % 8] ?? 30))}
            y2={y}
            {...ink(s, j, m, O.faint)}
          />
        );
      })}
    </>
  );
}

function StackPlinth({ s }: Props) {
  const n = s.count;
  const hs = 40 / n;
  return (
    <>
      {seq(n).map((i) => {
        const w = 62 - i * 9;
        return (
          <rect
            key={i}
            x={q(50 - w / 2)}
            y={q(49 - (i + 1) * hs)}
            width={q(w)}
            height={q(hs - 1.4)}
            {...ink(s, i, n, ramp(i, n, O.mid, O.key))}
          />
        );
      })}
      <line x1={16} y1={49} x2={84} y2={49} strokeWidth={W.hair} opacity={O.faint} />
    </>
  );
}

/* A registered frame: the plate says "this is a measured surface" rather than
   drawing anything inside it. Ticks read along both long edges. */
function StackRegistered({ s }: Props) {
  const n = s.count;
  const pitch = 52 / (n + 1);
  return (
    <>
      <rect x={24} y={16} width={52} height={32} strokeWidth={W.hair} opacity={O.strong} />
      <rect
        x={30}
        y={22}
        width={40}
        height={20}
        strokeWidth={W.faint}
        opacity={O.faint}
        strokeDasharray={dashOf(s.dash)}
      />
      {seq(n).map((i) => {
        const x = q(24 + (i + 1) * pitch);
        return (
          <g key={i}>
            <line x1={x} y1={11} x2={x} y2={16} {...ink(s, i, n, O.mid)} />
            <line x1={x} y1={48} x2={x} y2={53} {...ink(s, i, n, O.faint)} />
          </g>
        );
      })}
    </>
  );
}

/* A fan of chords from one corner. Every segment ends on the opposite edge, so
   the hatch stays inside the frame without a clip path — and no clip path
   means no id, which on a 119-poster page means no duplicate ids. */
function StackChords({ s }: Props) {
  const m = s.count * 2;
  const corners: readonly (readonly [number, number])[] = [
    [20, 51],
    [80, 51],
    [20, 13],
    [80, 13],
  ];
  const [px, py] = corners[s.turn] ?? [20, 51];
  const edgeY = py > 32 ? 13 : 51;
  return (
    <>
      <rect x={20} y={13} width={60} height={38} strokeWidth={W.hair} opacity={O.mid} />
      {seq(m).map((j) => (
        <line
          key={j}
          x1={px}
          y1={py}
          x2={q(20 + (j + 0.5) * (60 / m))}
          y2={edgeY}
          {...ink(s, j, m, O.faint)}
        />
      ))}
    </>
  );
}

function StackRows({ s }: Props) {
  const n = s.count + 1;
  const d = Math.min(9, 42 / Math.max(1, n - 1));
  const lens = [52, 38, 46, 30, 44, 34, 48];
  const y0 = 32 - ((n - 1) * d + 5) / 2;
  return (
    <>
      {seq(n).map((i) => (
        <rect
          key={i}
          x={24}
          y={q(y0 + i * d)}
          width={lens[i % 7] ?? 44}
          height={5}
          {...inkFill(s, i, n, ramp(i, n))}
        />
      ))}
    </>
  );
}

function StackWindow({ s }: Props) {
  const m = s.count2;
  const rules = s.count;
  return (
    <>
      <rect x={18} y={11} width={64} height={42} strokeWidth={W.hair} opacity={O.strong} />
      <line x1={18} y1={19} x2={82} y2={19} strokeWidth={W.hair} opacity={O.mid} />
      {seq(m).map((j) => (
        <line
          key={j}
          x1={q(23 + j * 4.5)}
          y1={13.5}
          x2={q(23 + j * 4.5)}
          y2={16.5}
          {...ink(s, j, m, O.mid)}
        />
      ))}
      <rect
        x={24}
        y={25}
        width={52}
        height={22}
        strokeWidth={W.faint}
        opacity={O.faint}
        strokeDasharray={dashOf(s.dash)}
      />
      {seq(rules).map((j) => (
        <line
          key={j}
          x1={29}
          y1={q(30 + j * (14 / Math.max(1, rules)))}
          x2={q(29 + [38, 26, 33, 21, 30, 24][j % 6]!)}
          y2={q(30 + j * (14 / Math.max(1, rules)))}
          strokeWidth={W.faint}
          opacity={O.ghost}
        />
      ))}
    </>
  );
}

/* Interleaved rows, alternating alignment. Reads as two sequences sharing one
   timeline, which is what a stagger with an asymmetric in and out is. */
function StackComb({ s }: Props) {
  const n = s.count + 1;
  const d = Math.min(8, 42 / Math.max(1, n - 1));
  const y0 = 32 - ((n - 1) * d + 4.5) / 2;
  return (
    <>
      {seq(n).map((i) => (
        <rect
          key={i}
          x={i % 2 === 0 ? 20 : 46}
          y={q(y0 + i * d)}
          width={34}
          height={4.5}
          {...inkFill(s, i, n, ramp(i, n))}
        />
      ))}
      <line x1={50} y1={q(y0 - 2)} x2={50} y2={q(y0 + (n - 1) * d + 6.5)} strokeWidth={W.faint} opacity={O.ghost} />
    </>
  );
}

/* -- wave -------------------------------------------------------------------
   Phase, travel, oscillation. Everything here is built from cubic humps, so a
   wave is smooth at hero size without a hundred sampled points. */

function WaveLines({ s }: Props) {
  const n = s.count;
  const gap = Math.min(10, 40 / Math.max(1, n - 1));
  const halves = 4 + s.turn;
  const y0 = 32 - ((n - 1) * gap) / 2;
  return (
    <>
      {seq(n).map((i) => (
        <path
          key={i}
          d={humps({ x0: BOX.x0, x1: BOX.x1, y: y0 + i * gap, amp: 5, halves, up: i % 2 === 0 })}
          strokeDasharray={i === n - 1 ? dashOf(s.dash) : 'none'}
          {...ink(s, i, n, ramp(i, n))}
        />
      ))}
    </>
  );
}

/* A wave and its own reflection. Where they cross is a node, and the lens
   shapes between nodes are the drawing. */
function WaveLens({ s }: Props) {
  const halves = 4 + s.turn;
  const m = s.count2;
  return (
    <>
      {[true, false].map((up, i) => (
        <path
          key={i}
          d={humps({ x0: BOX.x0, x1: BOX.x1, y: 32, amp: 13, halves, up })}
          {...ink(s, i, 2, O.strong)}
        />
      ))}
      {seq(m).map((j) =>
        [true, false].map((up) => (
          <path
            key={String(j) + String(up)}
            d={humps({
              x0: BOX.x0,
              x1: BOX.x1,
              y: 32,
              amp: q(13 * ((m - j) / (m + 1))),
              halves,
              up,
            })}
            strokeWidth={W.faint}
            opacity={O.ghost}
          />
        )),
      )}
    </>
  );
}

function WavePacket({ s }: Props) {
  const halves = 6 + s.turn;
  const n = s.count;
  return (
    <>
      <line x1={BOX.x0} y1={32} x2={BOX.x1} y2={32} strokeWidth={W.faint} opacity={O.ghost} />
      {seq(n).map((i) => (
        <path
          key={i}
          d={humps({ x0: BOX.x0, x1: BOX.x1, y: 32, amp: q(16 - i * (11 / n)), halves, taper: 1 })}
          {...ink(s, i, n, ramp(i, n))}
        />
      ))}
    </>
  );
}

function WaveComb({ s }: Props) {
  const m = 13 + s.count * 3;
  return (
    <>
      {seq(m).map((j) => {
        const t = m > 1 ? j / (m - 1) : 0;
        const h = 5 + 17 * (0.5 + 0.5 * sinT(t * 1.5));
        const x = q(BOX.x0 + t * BOX.w);
        return <line key={j} x1={x} y1={48} x2={x} y2={q(48 - h)} {...ink(s, j, m, ramp(j, m, O.strong, O.mid))} />;
      })}
      <line x1={BOX.x0} y1={48} x2={BOX.x1} y2={48} strokeWidth={W.hair} opacity={O.faint} />
    </>
  );
}

/* The dots are samples of a row's wave, so each row draws its wave underneath
   at ghost weight. Sixty dots with nothing behind them read as a scatter, and a
   scatter is the one reading this library must not have. */
function WaveDots({ s }: Props) {
  const rows = s.count2 + 2;
  const cols = 15;
  const rowY = (r: number, t: number) =>
    q(32 + (r - (rows - 1) / 2) * 9 + 3.4 * sinT(t * 1.5 + r * 0.12));
  return (
    <>
      {seq(rows).map((r) => (
        <path
          key={'g' + String(r)}
          d={poly(seq(31).map((k) => ({ x: q(12 + (k / 30) * 76), y: rowY(r, k / 30) })))}
          strokeWidth={W.faint}
          opacity={O.ghost}
        />
      ))}
      {seq(rows).map((r) =>
        seq(cols).map((c) => {
          const t = c / (cols - 1);
          return (
            <circle
              key={String(r) + '-' + String(c)}
              cx={q(12 + t * 76)}
              cy={rowY(r, t)}
              r={1.1}
              {...inkFill(s, r, rows, ramp(r, rows, O.strong, O.faint))}
            />
          );
        }),
      )}
    </>
  );
}

/* One wave and its afterimages. The ghosts are offset in y rather than in x
   because a phase-shifted copy on top of the original just reads as a thicker
   line, and a stacked copy reads as travel. */
function WavePhase({ s }: Props) {
  const n = s.count;
  const halves = 4 + s.turn;
  return (
    <>
      {seq(n)
        .slice()
        .reverse()
        .map((i) => (
          <path
            key={i}
            d={humps({ x0: BOX.x0, x1: BOX.x1, y: q(32 + i * 2.6), amp: 9, halves })}
            {...ink(s, i, n, ramp(i, n, O.key, O.ghost))}
          />
        ))}
    </>
  );
}

function WaveNodes({ s }: Props) {
  const halves = 4 + s.turn;
  const step = BOX.w / halves;
  return (
    <>
      <line x1={BOX.x0} y1={32} x2={BOX.x1} y2={32} strokeWidth={W.faint} opacity={O.faint} />
      <path d={humps({ x0: BOX.x0, x1: BOX.x1, y: 32, amp: 12, halves })} {...ink(s, 0, 1, O.strong)} />
      {seq(halves + 1).map((k) => {
        const x = q(BOX.x0 + k * step);
        return (
          <g key={k}>
            <line x1={x} y1={23} x2={x} y2={41} {...ink(s, k, halves + 1, O.ghost)} />
            <rect x={q(x - 1)} y={31} width={2} height={2} {...inkFill(s, k, halves + 1, O.mid)} />
          </g>
        );
      })}
    </>
  );
}

function WaveBeat({ s }: Props) {
  const a = 4 + s.turn;
  return (
    <>
      {[a, a + 3].map((halves, i) => (
        <path
          key={i}
          d={humps({ x0: BOX.x0, x1: BOX.x1, y: 32, amp: 9, halves })}
          strokeDasharray={i === 1 ? dashOf(s.dash) : 'none'}
          {...ink(s, i, 2, i === 0 ? O.strong : O.mid)}
        />
      ))}
      <line x1={BOX.x0} y1={32} x2={BOX.x1} y2={32} strokeWidth={W.faint} opacity={O.ghost} />
    </>
  );
}

/* -- rings ------------------------------------------------------------------
   Circles seen in perspective: cylinders, latitudes, apertures. The tilt is
   one of four designed foreshortenings, never an arbitrary ry. */

const TILT = [0.3, 0.45, 0.62, 0.85] as const;

function tiltOf(turn: number): number {
  return TILT[turn] ?? 0.45;
}

function RingsConcentric({ s }: Props) {
  const n = s.count;
  const t = tiltOf(s.turn);
  return (
    <>
      {seq(n).map((i) => {
        const rx = 12 + i * (26 / Math.max(1, n - 1));
        return (
          <ellipse
            key={i}
            cx={50}
            cy={32}
            rx={q(rx)}
            ry={q(Math.min(24, rx * t))}
            strokeDasharray={i === n - 1 ? dashOf(s.dash) : 'none'}
            {...ink(s, i, n, ramp(i, n))}
          />
        );
      })}
    </>
  );
}

function RingsDrum({ s }: Props) {
  const rx = 30;
  const ry = 8;
  const m = s.count2;
  return (
    <>
      <ellipse cx={50} cy={18} rx={rx} ry={ry} {...ink(s, 0, 3, O.strong)} />
      <ellipse cx={50} cy={46} rx={rx} ry={ry} {...ink(s, 1, 3, O.mid)} />
      <line x1={20} y1={18} x2={20} y2={46} {...ink(s, 2, 3, O.strong)} />
      <line x1={80} y1={18} x2={80} y2={46} {...ink(s, 2, 3, O.strong)} />
      {seq(m).map((k) => {
        const x = -rx + (k + 1) * ((2 * rx) / (m + 1));
        const dy = ry * Math.sqrt(Math.max(0, 1 - (x / rx) * (x / rx)));
        return (
          <line
            key={k}
            x1={q(50 + x)}
            y1={q(18 + dy)}
            x2={q(50 + x)}
            y2={q(46 + dy)}
            strokeWidth={W.faint}
            opacity={O.ghost}
          />
        );
      })}
    </>
  );
}

function RingsLatitudes({ s }: Props) {
  const R = 22;
  const n = s.count;
  return (
    <>
      <ellipse cx={50} cy={32} rx={R} ry={R} {...ink(s, 0, 1, O.strong)} />
      {seq(n).map((i) => {
        const u = 2 * ((i + 1) / (n + 1)) - 1;
        const rx = R * Math.sqrt(Math.max(0, 1 - u * u));
        return (
          <ellipse
            key={i}
            cx={50}
            cy={q(32 + R * u)}
            rx={q(rx)}
            ry={q(rx * 0.2)}
            {...ink(s, i, n, ramp(i, n, O.mid, O.faint))}
          />
        );
      })}
    </>
  );
}

function RingsMeridians({ s }: Props) {
  const R = 22;
  const n = s.count;
  return (
    <>
      <ellipse cx={50} cy={32} rx={R} ry={R} {...ink(s, 0, 1, O.strong)} />
      {seq(n).map((i) => (
        <ellipse
          key={i}
          cx={50}
          cy={32}
          rx={q(R * Math.abs(cosT(((i + 1) / (n + 1)) * 0.5)))}
          ry={R}
          {...ink(s, i, n, ramp(i, n, O.mid, O.faint))}
        />
      ))}
    </>
  );
}

/* Radial ticks around an aperture, one of them running long. The long tick is
   the reading — a graduated dial with no graduation marked is furniture. */
function RingsAperture({ s }: Props) {
  const m = s.count2 * 2;
  return (
    <>
      <ellipse cx={50} cy={32} rx={19} ry={q(19 * tiltOf(s.turn))} {...ink(s, 0, 1, O.strong)} />
      {seq(m).map((k) => {
        const a = k / m;
        const long = accented(s, k, m);
        const r0 = 23;
        const r1 = long ? 33 : 27;
        return (
          <line
            key={k}
            x1={q(50 + cosT(a) * r0)}
            y1={q(32 + sinT(a) * r0 * 0.7)}
            x2={q(50 + cosT(a) * r1)}
            y2={q(32 + sinT(a) * r1 * 0.7)}
            {...ink(s, k, m, O.mid)}
          />
        );
      })}
    </>
  );
}

function RingsAnnulus({ s }: Props) {
  const m = s.count2 * 2;
  const t = tiltOf(s.turn);
  return (
    <>
      <ellipse cx={50} cy={32} rx={14} ry={q(14 * t)} {...ink(s, 0, 2, O.mid)} />
      <ellipse cx={50} cy={32} rx={27} ry={q(27 * t)} {...ink(s, 1, 2, O.strong)} />
      {seq(m).map((k) => {
        const a = k / m;
        return (
          <line
            key={k}
            x1={q(50 + cosT(a) * 14)}
            y1={q(32 + sinT(a) * 14 * t)}
            x2={q(50 + cosT(a) * 27)}
            y2={q(32 + sinT(a) * 27 * t)}
            {...ink(s, k, m, O.faint)}
          />
        );
      })}
    </>
  );
}

function RingsHalo({ s }: Props) {
  const n = s.count;
  return (
    <>
      <circle cx={50} cy={32} r={3.4} {...inkFill(s, 0, n, O.key)} />
      {seq(n).map((i) => (
        <circle
          key={i}
          cx={50}
          cy={32}
          r={q(8 + i * (16 / Math.max(1, n - 1)))}
          strokeDasharray={i === n - 1 ? dashOf(s.dash) : 'none'}
          {...ink(s, i, n, ramp(i, n))}
        />
      ))}
    </>
  );
}

function RingsCoil({ s }: Props) {
  const n = s.count + 1;
  const d = Math.min(10, 38 / Math.max(1, n - 1));
  return (
    <>
      {seq(n).map((i) => {
        const k = i - (n - 1) / 2;
        return (
          <ellipse
            key={i}
            cx={q(50 + k * 2.2)}
            cy={q(32 + k * d)}
            rx={26}
            ry={6}
            {...ink(s, i, n, ramp(i, n))}
          />
        );
      })}
    </>
  );
}

/* -- split ------------------------------------------------------------------
   Type broken into pieces: characters, columns, rows of set text. The family
   the text components land in, so the plates behave like typography — a
   baseline, a measure, and blocks that sit on it. */

function SplitBars({ s }: Props) {
  const m = s.count;
  const pitch = Math.min(9, 74 / m);
  const x0 = 50 - (m * pitch) / 2;
  return (
    <>
      {seq(m).map((j) => {
        const t = m > 1 ? j / (m - 1) : 0;
        const h = 11 + 21 * (0.5 + 0.5 * sinT(t * 0.9 + 0.08));
        return (
          <rect
            key={j}
            x={q(x0 + j * pitch)}
            y={q(48 - h)}
            width={q(Math.min(4.4, pitch - 2))}
            height={q(h)}
            {...inkFill(s, j, m, ramp(j, m, O.strong, O.mid))}
          />
        );
      })}
      <line x1={q(x0 - 3)} y1={48} x2={q(x0 + m * pitch + 1)} y2={48} strokeWidth={W.hair} opacity={O.faint} />
    </>
  );
}

const GLYPHS = [7, 4, 9, 5, 3, 8, 6, 4, 7, 5, 9] as const;

/* The glyph widths are a rhythm, not a measurement, so they are fitted to the
   safe box rather than trusted: eleven of them at their written widths run
   thirteen units past it and get clipped. Capped at 1.15 so that six glyphs
   become letterforms rather than slabs. */
function SplitGlyphs({ s }: Props) {
  const m = s.count;
  const gap = 2.6;
  const raw = seq(m).map((j) => GLYPHS[j % GLYPHS.length] ?? 6);
  const sum = raw.reduce((a, b) => a + b, 0);
  const k = Math.min(1.15, (72 - gap * (m - 1)) / sum);
  const widths = raw.map((w) => q(w * k));
  const total = widths.reduce((a, b) => a + b, 0) + gap * (m - 1);
  let x = 50 - total / 2;
  const cells = widths.map((w, j) => {
    const cell = { x, w, j };
    x += w + gap;
    return cell;
  });
  return (
    <>
      {cells.map((c) => (
        <rect key={c.j} x={q(c.x)} y={24} width={c.w} height={16} {...ink(s, c.j, m, ramp(c.j, m, O.strong, O.mid))} />
      ))}
      <line
        x1={q(50 - total / 2 - 3)}
        y1={44}
        x2={q(50 + total / 2 + 3)}
        y2={44}
        strokeWidth={W.hair}
        opacity={O.faint}
      />
    </>
  );
}

/* Two columns reading in opposite directions — one reveal engine, two axes. */
function SplitTwoColumn({ s }: Props) {
  const rows = s.count2 * 2;
  const lens = [22, 15, 19, 12, 21, 14, 18, 16];
  return (
    <>
      <line x1={50} y1={12} x2={50} y2={52} strokeWidth={W.hair} opacity={O.faint} />
      {seq(rows).map((r) => {
        const y = q(16 + r * (32 / Math.max(1, rows - 1)));
        const l = lens[r % 8] ?? 18;
        return (
          <g key={r}>
            <line x1={q(46 - l)} y1={y} x2={46} y2={y} {...ink(s, r, rows, ramp(r, rows, O.strong, O.faint))} />
            <line
              x1={54}
              y1={y}
              x2={q(54 + (lens[(rows - 1 - r) % 8] ?? 18))}
              y2={y}
              {...ink(s, rows - 1 - r, rows, ramp(rows - 1 - r, rows, O.strong, O.faint))}
            />
          </g>
        );
      })}
    </>
  );
}

function SplitStaircase({ s }: Props) {
  const m = s.count;
  const pitch = Math.min(8, 72 / m);
  const lean = [1.6, 2.4, -1.6, -2.4][s.turn] ?? 1.6;
  const x0 = 50 - (m * pitch) / 2;
  return (
    <>
      {seq(m).map((j) => (
        <rect
          key={j}
          x={q(x0 + j * pitch)}
          y={q(25 + (j - (m - 1) / 2) * lean)}
          width={q(Math.min(5, pitch - 2.4))}
          height={14}
          {...inkFill(s, j, m, ramp(j, m, O.mid, O.key))}
        />
      ))}
    </>
  );
}

/* A reveal boundary: set on one side, unset on the other, and the rule that
   separates them is where the accent goes. */
function SplitBoundary({ s }: Props) {
  const m = s.count;
  const b = 1 + (s.accent % Math.max(1, m - 1));
  const pitch = Math.min(8.5, 74 / m);
  const x0 = 50 - (m * pitch) / 2;
  const w = Math.min(5.6, pitch - 2.6);
  const bx = q(x0 + b * pitch - 1.3);
  // Hoisted out of the className below on purpose: check:classes reads string
  // literals inside a className expression as candidate utilities, and a mode
  // name sitting in that position is reported as a class that compiles to
  // nothing. The comparison is the same; only its position moves.
  const spent = s.accentMode === 'axis';
  return (
    <>
      {seq(m).map((j) =>
        j < b ? (
          <rect key={j} x={q(x0 + j * pitch)} y={22} width={q(w)} height={20} fill="currentColor" stroke="none" opacity={O.strong} />
        ) : (
          <rect key={j} x={q(x0 + j * pitch)} y={22} width={q(w)} height={20} strokeWidth={W.hair} opacity={O.faint} />
        ),
      )}
      <line
        x1={bx}
        y1={14}
        x2={bx}
        y2={50}
        className={spent ? undefined : 'text-accent'}
        strokeWidth={W.key}
        opacity={spent ? O.mid : 1}
      />
    </>
  );
}

function SplitTextRows({ s }: Props) {
  const rows = s.count2 + 1;
  const lens = [56, 44, 60, 38, 52];
  const y0 = 32 - ((rows - 1) * 8) / 2;
  const cut = s.accent % rows;
  return (
    <>
      {seq(rows).map((r) => {
        const y = q(y0 + r * 8);
        const l = lens[r % 5] ?? 50;
        if (r !== cut) {
          return <line key={r} x1={22} y1={y} x2={q(22 + l)} y2={y} {...ink(s, r, rows, ramp(r, rows, O.strong, O.faint))} />;
        }
        const a = l * 0.45;
        return (
          <g key={r}>
            <line x1={22} y1={y} x2={q(22 + a)} y2={y} {...ink(s, r, rows, O.mid)} />
            <line x1={q(22 + a + 7)} y1={y} x2={q(22 + l + 7)} y2={y} {...ink(s, r, rows, O.mid)} />
          </g>
        );
      })}
    </>
  );
}

function SplitConverge({ s }: Props) {
  const side = Math.max(2, Math.round(s.count / 2));
  const pitch = Math.min(7, 26 / side);
  return (
    <>
      {seq(side).map((j) => (
        <g key={j}>
          <rect x={q(44 - (j + 1) * pitch)} y={21} width={4} height={22} {...inkFill(s, j, side, ramp(j, side, O.key, O.faint))} />
          <rect x={q(56 + j * pitch)} y={21} width={4} height={22} {...inkFill(s, j, side, ramp(j, side, O.key, O.faint))} />
        </g>
      ))}
      <line x1={44.5} y1={17} x2={44.5} y2={47} strokeWidth={W.faint} opacity={O.ghost} />
      <line x1={55.5} y1={17} x2={55.5} y2={47} strokeWidth={W.faint} opacity={O.ghost} />
    </>
  );
}

function SplitStrokeFill({ s }: Props) {
  const m = s.count;
  const pitch = Math.min(8.5, 74 / m);
  const x0 = 50 - (m * pitch) / 2;
  const w = Math.min(5.6, pitch - 2.8);
  return (
    <>
      {seq(m).map((j) => (
        <rect key={'a' + String(j)} x={q(x0 + j * pitch)} y={15} width={q(w)} height={13} {...ink(s, j, m, O.mid)} />
      ))}
      {seq(m).map((j) => (
        <rect key={'b' + String(j)} x={q(x0 + j * pitch)} y={36} width={q(w)} height={13} {...inkFill(s, j, m, O.strong)} />
      ))}
    </>
  );
}

/* -- grid -------------------------------------------------------------------
   A lattice, and what is done to it. All eight plates share one coordinate
   generator so the cell pitch is consistent across the family. */

function lattice(s: PlateSpec) {
  const cols = s.count;
  const rows = s.count2;
  const gx = Math.min(9, 72 / Math.max(1, cols - 1));
  const gy = Math.min(10, 40 / Math.max(1, rows - 1));
  return {
    cols,
    rows,
    gx,
    gy,
    n: cols * rows,
    x: (c: number) => q(50 + (c - (cols - 1) / 2) * gx),
    y: (r: number) => q(32 + (r - (rows - 1) / 2) * gy),
    cells: seq(rows).flatMap((r) => seq(cols).map((c) => ({ r, c, i: r * cols + c }))),
  };
}

function GridDots({ s }: Props) {
  const g = lattice(s);
  return (
    <>
      {g.cells.map((k) => (
        <circle key={k.i} cx={g.x(k.c)} cy={g.y(k.r)} r={1.2} {...inkFill(s, k.i, g.n, O.mid)} />
      ))}
    </>
  );
}

/* Size, not opacity, carries the ramp: a lattice that fades reads as a
   rendering artefact, and one that changes scale reads as a measurement. */
function GridRamp({ s }: Props) {
  const g = lattice(s);
  const fromCol = s.turn === 1 || s.turn === 2 ? g.cols - 1 : 0;
  const fromRow = s.turn >= 2 ? g.rows - 1 : 0;
  const span = Math.max(1, g.cols - 1 + g.rows - 1);
  return (
    <>
      {g.cells.map((k) => {
        const d = Math.abs(k.c - fromCol) + Math.abs(k.r - fromRow);
        const side = 1.6 + 4.4 * (1 - d / span);
        return (
          <rect
            key={k.i}
            x={q(g.x(k.c) - side / 2)}
            y={q(g.y(k.r) - side / 2)}
            width={q(side)}
            height={q(side)}
            {...inkFill(s, k.i, g.n, O.mid)}
          />
        );
      })}
    </>
  );
}

function GridRules({ s }: Props) {
  const g = lattice(s);
  const hot = s.accent % Math.max(1, g.n);
  const hr = Math.floor(hot / g.cols);
  const hc = hot % g.cols;
  return (
    <>
      {seq(g.cols).map((c) => (
        <line key={'v' + String(c)} x1={g.x(c)} y1={g.y(0)} x2={g.x(c)} y2={g.y(g.rows - 1)} strokeWidth={W.faint} opacity={O.faint} />
      ))}
      {seq(g.rows).map((r) => (
        <line key={'h' + String(r)} x1={g.x(0)} y1={g.y(r)} x2={g.x(g.cols - 1)} y2={g.y(r)} strokeWidth={W.faint} opacity={O.faint} />
      ))}
      <rect
        x={q(g.x(hc) - g.gx / 2)}
        y={q(g.y(hr) - g.gy / 2)}
        width={q(g.gx)}
        height={q(g.gy)}
        {...ink(s, hot, g.n, O.strong)}
      />
    </>
  );
}

function GridPlus({ s }: Props) {
  const g = lattice(s);
  return (
    <>
      {g.cells.map((k) => {
        const x = g.x(k.c);
        const y = g.y(k.r);
        return (
          <g key={k.i} {...ink(s, k.i, g.n, O.mid)}>
            <line x1={q(x - 2.2)} y1={y} x2={q(x + 2.2)} y2={y} />
            <line x1={x} y1={q(y - 2.2)} x2={x} y2={q(y + 2.2)} />
          </g>
        );
      })}
    </>
  );
}

function GridBand({ s }: Props) {
  const g = lattice(s);
  const band = s.accent % g.rows;
  return (
    <>
      {g.cells.map((k) =>
        k.r === band ? null : (
          <circle key={k.i} cx={g.x(k.c)} cy={g.y(k.r)} r={1.2} fill="currentColor" stroke="none" opacity={O.faint} />
        ),
      )}
      <rect
        x={q(g.x(0) - 2)}
        y={q(g.y(band) - 1.6)}
        width={q(g.x(g.cols - 1) - g.x(0) + 4)}
        height={3.2}
        {...inkFill(s, band, g.rows, O.strong)}
      />
    </>
  );
}

function GridNested({ s }: Props) {
  const g = lattice(s);
  const side = Math.min(6.4, Math.min(g.gx, g.gy) - 1.6);
  return (
    <>
      {g.cells.map((k) => {
        const x = g.x(k.c);
        const y = g.y(k.r);
        return (
          <g key={k.i}>
            <rect
              x={q(x - side / 2)}
              y={q(y - side / 2)}
              width={q(side)}
              height={q(side)}
              {...ink(s, k.i, g.n, O.faint)}
            />
            <rect
              x={q(x - side / 4.6)}
              y={q(y - side / 4.6)}
              width={q(side / 2.3)}
              height={q(side / 2.3)}
              {...inkFill(s, k.i, g.n, O.mid)}
            />
          </g>
        );
      })}
    </>
  );
}

/* Only the cells on a designed diagonal are set. The lattice is still there
   in the eye because the occupied cells are exactly on its pitch. */
/* Every fourth diagonal is only a diagonal if the lattice it was taken from is
   visible; without the ghost registration the survivors read as five squares
   dropped at random, which is the one thing this family must never look like. */
function GridDiagonal({ s }: Props) {
  const g = lattice(s);
  const k = 2 + (s.turn % 3);
  const dir = s.turn === 3 ? -1 : 1;
  const side = Math.min(4.4, Math.min(g.gx, g.gy) - 1.6);
  return (
    <>
      {g.cells.map((cell) => (
        <circle
          key={'g' + String(cell.i)}
          cx={g.x(cell.c)}
          cy={g.y(cell.r)}
          r={0.7}
          fill="currentColor"
          stroke="none"
          opacity={O.ghost}
        />
      ))}
      {g.cells.map((cell) =>
        (cell.c + dir * cell.r + 24) % k !== 0 ? null : (
          <rect
            key={cell.i}
            x={q(g.x(cell.c) - side / 2)}
            y={q(g.y(cell.r) - side / 2)}
            width={q(side)}
            height={q(side)}
            {...inkFill(s, cell.i, g.n, O.strong)}
          />
        ),
      )}
    </>
  );
}

function GridChecker({ s }: Props) {
  const g = lattice(s);
  const side = Math.min(5.2, Math.min(g.gx, g.gy) - 1.4);
  return (
    <>
      {g.cells.map((k) =>
        (k.c + k.r) % 2 === 0 ? (
          <rect
            key={k.i}
            x={q(g.x(k.c) - side / 2)}
            y={q(g.y(k.r) - side / 2)}
            width={q(side)}
            height={q(side)}
            {...inkFill(s, k.i, g.n, O.mid)}
          />
        ) : (
          <circle key={k.i} cx={g.x(k.c)} cy={g.y(k.r)} r={0.8} fill="currentColor" stroke="none" opacity={O.ghost} />
        ),
      )}
    </>
  );
}

/* -- orbit ------------------------------------------------------------------
   A centre and things going round it. Bodies sit on 15° steps of the shared
   sine table, which is why they never land at a slightly-wrong angle. */

const BODY_STEPS = [2, 9, 16, 5, 20, 12] as const;

function OrbitBodies({ s }: Props) {
  const n = s.count;
  const t = tiltOf(s.turn);
  return (
    <>
      {seq(n).map((i) => {
        const rx = 13 + i * (27 / Math.max(1, n - 1));
        const ry = Math.min(24, rx * t);
        const a = (BODY_STEPS[i % BODY_STEPS.length] ?? 2) / 24;
        return (
          <g key={i}>
            <ellipse cx={50} cy={32} rx={q(rx)} ry={q(ry)} strokeWidth={W.faint} opacity={ramp(i, n, O.mid, O.faint)} />
            <circle cx={q(50 + cosT(a) * rx)} cy={q(32 + sinT(a) * ry)} r={2.1} {...inkFill(s, i, n, O.key)} />
          </g>
        );
      })}
      <circle cx={50} cy={32} r={3.2} fill="currentColor" stroke="none" opacity={O.key} />
    </>
  );
}

/* One orbit, opened: an arc rather than a closed ellipse, with the radius
   drawn in. An arc says which way round; a circle does not. */
function OrbitArc({ s }: Props) {
  const t = tiltOf(s.turn);
  const rx = 32;
  // 21, not 24: at the steepest tilt the marker sits near the bottom of the
  // ellipse and adds its own radius, which is what reaches the frame.
  const ry = Math.min(21, rx * t);
  const from = 0.55;
  const span = 0.72;
  const pts = seq(25).map((k) => {
    const a = from + (span * k) / 24;
    return { x: 50 + cosT(a) * rx, y: 32 + sinT(a) * ry };
  });
  const head = from + span;
  const hx = q(50 + cosT(head) * rx);
  const hy = q(32 + sinT(head) * ry);
  return (
    <>
      <ellipse cx={50} cy={32} rx={rx} ry={q(ry)} strokeWidth={W.faint} opacity={O.ghost} strokeDasharray={dashOf(2)} />
      <path d={poly(pts)} {...ink(s, 0, 2, O.strong)} />
      <line x1={50} y1={32} x2={hx} y2={hy} strokeWidth={W.faint} opacity={O.faint} />
      <circle cx={hx} cy={hy} r={2.8} {...inkFill(s, 1, 2, O.key)} />
      <line x1={46} y1={32} x2={54} y2={32} strokeWidth={W.hair} opacity={O.mid} />
      <line x1={50} y1={28} x2={50} y2={36} strokeWidth={W.hair} opacity={O.mid} />
    </>
  );
}

/* Rotating the same ellipse means the figure's bounding box is a circle of
   radius rx, so rx is set by the short axis of the frame, not the long one. */
function OrbitTilted({ s }: Props) {
  const n = s.count;
  const m = s.count2;
  const rx = 25;
  return (
    <>
      {seq(n).map((i) => (
        <ellipse
          key={i}
          cx={50}
          cy={32}
          rx={rx}
          ry={9}
          transform={'rotate(' + q(i * (180 / n)) + ' 50 32)'}
          {...ink(s, i, n, ramp(i, n, O.strong, O.faint))}
        />
      ))}
      {seq(m).map((j) => {
        const a = (BODY_STEPS[j % BODY_STEPS.length] ?? 2) / 24;
        return (
          <circle key={j} cx={q(50 + cosT(a) * rx)} cy={q(32 + sinT(a) * 9)} r={2} {...inkFill(s, j, m, O.key)} />
        );
      })}
      <circle cx={50} cy={32} r={2.6} fill="currentColor" stroke="none" opacity={O.key} />
    </>
  );
}

function OrbitDrum({ s }: Props) {
  const m = s.count2 * 4;
  const ry = 11;
  return (
    <>
      <ellipse cx={50} cy={32} rx={32} ry={ry} strokeWidth={W.hair} opacity={O.mid} />
      {seq(m).map((k) => {
        const a = k / m;
        const px = q(50 + cosT(a) * 32);
        const py = q(32 + sinT(a) * ry);
        return (
          <g key={k}>
            <line x1={50} y1={32} x2={px} y2={py} strokeWidth={W.faint} opacity={O.ghost} />
            <circle cx={px} cy={py} r={2.2} {...inkFill(s, k, m, O.strong)} />
          </g>
        );
      })}
    </>
  );
}

function OrbitEpicycle({ s }: Props) {
  const a = (BODY_STEPS[s.turn] ?? 3) / 24;
  const cx = q(50 + cosT(a) * 23);
  const cy = q(32 + sinT(a) * 23 * 0.72);
  const b = a + 0.3;
  return (
    <>
      <ellipse cx={50} cy={32} rx={23} ry={q(23 * 0.72)} strokeWidth={W.faint} opacity={O.faint} />
      <circle cx={cx} cy={cy} r={9} {...ink(s, 0, 2, O.strong)} />
      <line x1={50} y1={32} x2={cx} y2={cy} strokeWidth={W.faint} opacity={O.ghost} />
      <line x1={cx} y1={cy} x2={q(cx + cosT(b) * 9)} y2={q(cy + sinT(b) * 9)} strokeWidth={W.faint} opacity={O.faint} />
      <circle cx={q(cx + cosT(b) * 9)} cy={q(cy + sinT(b) * 9)} r={2.4} {...inkFill(s, 1, 2, O.key)} />
      <circle cx={50} cy={32} r={2.4} fill="currentColor" stroke="none" opacity={O.mid} />
    </>
  );
}

/* A body inside a field, with the leader line stopping short of the centre.
   The gap is the point: the pull is not a collision. */
function OrbitPull({ s }: Props) {
  const n = s.count;
  const bx = q(50 + 20 * cosT((BODY_STEPS[s.turn] ?? 2) / 24));
  const by = q(32 + 20 * sinT((BODY_STEPS[s.turn] ?? 2) / 24) * 0.7);
  return (
    <>
      {seq(n).map((i) => (
        <ellipse
          key={i}
          cx={50}
          cy={32}
          rx={q(11 + i * (16 / Math.max(1, n - 1)))}
          ry={q((11 + i * (16 / Math.max(1, n - 1))) * 0.7)}
          strokeWidth={W.faint}
          opacity={ramp(i, n, O.faint, O.ghost)}
          strokeDasharray={i === n - 1 ? dashOf(2) : 'none'}
        />
      ))}
      <line x1={q(50 + (bx - 50) * 0.28)} y1={q(32 + (by - 32) * 0.28)} x2={bx} y2={by} strokeWidth={W.hair} opacity={O.mid} />
      <circle cx={bx} cy={by} r={3.4} {...inkFill(s, 0, 1, O.key)} />
      <circle cx={50} cy={32} r={3} fill="currentColor" stroke="none" opacity={O.strong} />
    </>
  );
}

/* -- trail ------------------------------------------------------------------
   A leader and what follows it. Not particles: a fixed series on a designed
   path, spaced evenly, which is what an image trail or a lagged cursor
   actually is once you stop animating it. */

/* The guide path is not decoration. Without it a short series of discs reads
   as scattered points, which is the one thing these posters must never look
   like; with it the same discs read as samples along a path. */
function guidePath(turn: number): string {
  return poly(seq(17).map((k) => trailPoint(k / 16, turn)));
}

function TrailDots({ s }: Props) {
  const n = s.count;
  return (
    <>
      <path d={guidePath(s.turn)} strokeWidth={W.faint} opacity={O.ghost} />
      {seq(n).map((i) => {
        const t = n > 1 ? i / (n - 1) : 0;
        const p = trailPoint(t, s.turn);
        return <circle key={i} cx={p.x} cy={p.y} r={q(1 + t * 3.4)} {...inkFill(s, i, n, ramp(i, n, O.ghost, O.key))} />;
      })}
    </>
  );
}

/* Every trail plate draws the path, even the ones whose samples are far apart.
   Six frames on their own read as six frames dropped on the floor; with the
   path under them they read as one thing sampled six times. */
function TrailFrames({ s }: Props) {
  const n = s.count;
  return (
    <>
      <path d={guidePath(s.turn)} strokeWidth={W.faint} opacity={O.ghost} />
      {seq(n).map((i) => {
        const t = n > 1 ? i / (n - 1) : 0;
        const p = trailPoint(t, s.turn);
        return (
          <rect
            key={i}
            x={q(p.x - 5.5)}
            y={q(p.y - 3.6)}
            width={11}
            height={7.2}
            transform={'rotate(' + q(t * 20 - 10) + ' ' + String(p.x) + ' ' + String(p.y) + ')'}
            {...ink(s, i, n, ramp(i, n, O.ghost, O.key))}
          />
        );
      })}
    </>
  );
}

function TrailLagPair({ s }: Props) {
  const pts = seq(17).map((k) => trailPoint(k / 16, s.turn));
  const lag = seq(17).map((k) => {
    const p = trailPoint(Math.max(0, k / 16 - 0.07), s.turn);
    return { x: p.x, y: p.y + 3.6 };
  });
  return (
    <>
      <path d={poly(lag)} strokeDasharray={dashOf(s.dash === 0 ? 2 : s.dash)} {...ink(s, 1, 2, O.faint)} />
      <path d={poly(pts)} {...ink(s, 0, 2, O.strong)} />
      {[0, 16].map((k, i) => {
        const p = pts[k] ?? { x: 50, y: 32 };
        return <circle key={i} cx={p.x} cy={p.y} r={i === 1 ? 2.8 : 1.6} {...inkFill(s, i, 2, O.mid)} />;
      })}
    </>
  );
}

function TrailChevrons({ s }: Props) {
  const n = s.count;
  return (
    <>
      <path d={guidePath(s.turn)} strokeWidth={W.faint} opacity={O.ghost} />
      {seq(n).map((i) => {
        const t = n > 1 ? i / (n - 1) : 0;
        const p = trailPoint(t, s.turn);
        return (
          <path
            key={i}
            d="M-3.4,-2.6 L0,0 L3.4,-2.6"
            transform={'translate(' + String(p.x) + ' ' + String(p.y) + ') rotate(' + q(t * 24 - 12) + ')'}
            {...ink(s, i, n, ramp(i, n, O.ghost, O.key))}
          />
        );
      })}
    </>
  );
}

/* The path plus the measurement of it. Ticks grow toward the head, so the
   drawing states the direction of travel without an arrowhead. */
function TrailSpine({ s }: Props) {
  const n = s.count;
  const pts = seq(21).map((k) => trailPoint(k / 20, s.turn));
  return (
    <>
      <path d={poly(pts)} strokeWidth={W.hair} opacity={O.mid} />
      {seq(n).map((i) => {
        const t = n > 1 ? i / (n - 1) : 0;
        const p = trailPoint(t, s.turn);
        const l = 2 + t * 7;
        return (
          <line key={i} x1={p.x} y1={q(p.y - l / 2)} x2={p.x} y2={q(p.y + l / 2)} {...ink(s, i, n, ramp(i, n, O.faint, O.key))} />
        );
      })}
    </>
  );
}

function TrailGhost({ s }: Props) {
  const n = s.count;
  return (
    <>
      <path d={guidePath(s.turn)} strokeWidth={W.faint} opacity={O.ghost} />
      {seq(n).map((i) => {
        const t = n > 1 ? i / (n - 1) : 0;
        const p = trailPoint(t, s.turn);
        return (
          <rect
            key={i}
            x={q(p.x - 8)}
            y={q(p.y - 5.5)}
            width={16}
            height={11}
            {...ink(s, i, n, ramp(i, n, O.ghost, O.strong))}
          />
        );
      })}
    </>
  );
}

/* -- noise ------------------------------------------------------------------
   Quantisation, not fuzz. The previous plate used feTurbulence, which cost a
   filter pass per card, duplicated an SVG id 119 times, and looked like a
   smudge. Ordered dither is the technique these components actually use, it
   is integer maths, and it draws as a plate. */

function NoiseBayer({ s }: Props) {
  const m = s.count2;
  const cell = Math.min(6, 46 / m);
  const ox = 50 - (m * cell) / 2;
  const oy = 32 - (m * cell) / 2;
  const top = m * m - 1;
  return (
    <>
      {seq(m).map((y) =>
        seq(m).map((x) => {
          const f = 0.22 + 0.78 * (bayer(x, y, m) / top);
          const side = cell * f * 0.88;
          return (
            <rect
              key={String(y) + '-' + String(x)}
              x={q(ox + x * cell + (cell - side) / 2)}
              y={q(oy + y * cell + (cell - side) / 2)}
              width={q(side)}
              height={q(side)}
              {...inkFill(s, y * m + x, m * m, O.strong)}
            />
          );
        }),
      )}
    </>
  );
}

function NoiseHalftone({ s }: Props) {
  const cols = 15;
  const rows = 9;
  return (
    <>
      {seq(rows).map((r) =>
        seq(cols).map((c) => {
          const u = c / (cols - 1);
          const v = r / (rows - 1);
          const f =
            s.turn === 0 ? u : s.turn === 1 ? v : s.turn === 2 ? (u + v) / 2 : 1 - (Math.abs(u - 0.5) + Math.abs(v - 0.5));
          return (
            <circle
              key={String(r) + '-' + String(c)}
              cx={q(13 + u * 74)}
              cy={q(11 + v * 42)}
              r={q(0.4 + 2.3 * f)}
              {...inkFill(s, r * cols + c, cols * rows, O.mid)}
            />
          );
        }),
      )}
    </>
  );
}

/* Contour lines off a hand-written radial profile, rotated a little per ring.
   Concentric rings would read as a target; rotated ones read as terrain. */
function NoiseContour({ s }: Props) {
  const n = s.count;
  return (
    <>
      {seq(n).map((i) => {
        const scale = 8 + i * (26 / Math.max(1, n - 1));
        const pts = seq(25).map((k) => {
          const p = contourAt(k + i * 2);
          return { x: 50 + cosT(k / 24) * scale * p, y: 32 + sinT(k / 24) * scale * p * 0.62 };
        });
        return <path key={i} d={poly(pts) + ' Z'} {...ink(s, i, n, ramp(i, n, O.key, O.faint))} />;
      })}
    </>
  );
}

/* Twelve to sixteen lines, not twenty-six: past about a 3-unit pitch the field
   stops reading as scanlines at card size and becomes a grey block. */
function NoiseScanlines({ s }: Props) {
  const m = 8 + s.count;
  const band = s.accent % m;
  return (
    <>
      {seq(m).map((j) => {
        const t = j / (m - 1);
        const y = q(9 + (s.turn % 2 === 0 ? t * t : 1 - (1 - t) * (1 - t)) * 44);
        return (
          <g key={j}>
            <line x1={12} y1={y} x2={88} y2={y} {...ink(s, j, m, ramp(j, m, O.strong, O.faint))} />
            {j === band ? <line x1={12} y1={q(y + 1)} x2={88} y2={q(y + 1)} {...ink(s, j, m, O.mid)} /> : null}
          </g>
        );
      })}
    </>
  );
}

/* A threshold with the dither shown: cells survive where the ordered matrix
   beats the ramp. This is the algorithm, drawn. */
function NoiseThreshold({ s }: Props) {
  const m = s.count2;
  const cols = 16;
  const rows = 10;
  const cell = 4.9;
  const ox = 50 - (cols * cell) / 2;
  const oy = 32 - (rows * cell) / 2;
  const top = m * m;
  return (
    <>
      {seq(rows).map((r) =>
        seq(cols).map((c) => {
          const u = c / (cols - 1);
          const v = r / (rows - 1);
          const f = s.turn % 2 === 0 ? (u + v) / 2 : (u + (1 - v)) / 2;
          if (bayer(c % m, r % m, m) / top >= 1 - f) return null;
          return (
            <rect
              key={String(r) + '-' + String(c)}
              x={q(ox + c * cell + 0.7)}
              y={q(oy + r * cell + 0.7)}
              width={q(cell - 1.4)}
              height={q(cell - 1.4)}
              {...inkFill(s, r * cols + c, cols * rows, O.strong)}
            />
          );
        }),
      )}
    </>
  );
}

/* Four pitches, stacked. Octaves of a band-limited field, said plainly. */
function NoiseLadder({ s }: Props) {
  const pitches = [2, 3.2, 4.8, 7];
  const bandH = 11;
  return (
    <>
      {seq(4).map((b) => {
        const pitch = pitches[(b + s.turn) % 4] ?? 3;
        const y0 = 8 + b * (bandH + 1.6);
        const lines = Math.max(2, Math.floor(bandH / pitch));
        return (
          <g key={b} {...ink(s, b, 4, ramp(b, 4, O.strong, O.faint))}>
            {seq(lines).map((j) => (
              <line key={j} x1={14} y1={q(y0 + j * pitch)} x2={86} y2={q(y0 + j * pitch)} />
            ))}
          </g>
        );
      })}
    </>
  );
}

/* -- assembly ---------------------------------------------------------------
   The tuple types tie each list's length to VARIANTS, so adding a plate
   without widening the selector is a compile error rather than a plate that
   nothing ever picks. */

const STACK: Fixed<Plate, typeof VARIANTS.stack> = [
  StackNested,
  StackCascade,
  StackFan,
  StackDeck,
  StackSpread,
  StackBandSplit,
  StackPingPong,
  StackLedger,
  StackPlinth,
  StackRegistered,
  StackChords,
  StackRows,
  StackWindow,
  StackComb,
];

const WAVE: Fixed<Plate, typeof VARIANTS.wave> = [
  WaveLines,
  WaveLens,
  WavePacket,
  WaveComb,
  WaveDots,
  WavePhase,
  WaveNodes,
  WaveBeat,
];

const RINGS: Fixed<Plate, typeof VARIANTS.rings> = [
  RingsConcentric,
  RingsDrum,
  RingsLatitudes,
  RingsMeridians,
  RingsAperture,
  RingsAnnulus,
  RingsHalo,
  RingsCoil,
];

const SPLIT: Fixed<Plate, typeof VARIANTS.split> = [
  SplitBars,
  SplitGlyphs,
  SplitTwoColumn,
  SplitStaircase,
  SplitBoundary,
  SplitTextRows,
  SplitConverge,
  SplitStrokeFill,
];

const GRID: Fixed<Plate, typeof VARIANTS.grid> = [
  GridDots,
  GridRamp,
  GridRules,
  GridPlus,
  GridBand,
  GridNested,
  GridDiagonal,
  GridChecker,
];

const ORBIT: Fixed<Plate, typeof VARIANTS.orbit> = [
  OrbitBodies,
  OrbitArc,
  OrbitTilted,
  OrbitDrum,
  OrbitEpicycle,
  OrbitPull,
];

const TRAIL: Fixed<Plate, typeof VARIANTS.trail> = [
  TrailDots,
  TrailFrames,
  TrailLagPair,
  TrailChevrons,
  TrailSpine,
  TrailGhost,
];

const NOISE: Fixed<Plate, typeof VARIANTS.noise> = [
  NoiseBayer,
  NoiseHalftone,
  NoiseContour,
  NoiseScanlines,
  NoiseThreshold,
  NoiseLadder,
];

/* `variant` is already bounded by resolve(), so the fallback to the family's
   first plate is unreachable. It exists because a poster must never resolve to
   nothing — an empty frame is the failure this whole system replaces. */
function draw(plates: NonEmpty<Plate>, s: PlateSpec): React.JSX.Element {
  const Chosen = plates[s.variant] ?? plates[0];
  return <Chosen s={s} />;
}

export const PLATES: Record<Motif, Plate> = {
  stack: ({ s }) => draw(STACK, s),
  wave: ({ s }) => draw(WAVE, s),
  rings: ({ s }) => draw(RINGS, s),
  split: ({ s }) => draw(SPLIT, s),
  grid: ({ s }) => draw(GRID, s),
  orbit: ({ s }) => draw(ORBIT, s),
  trail: ({ s }) => draw(TRAIL, s),
  noise: ({ s }) => draw(NOISE, s),
};

/** Used when a manifest hands over a motif outside the enum: never blank. */
export const FALLBACK_PLATE: Plate = ({ s }) => draw(STACK, s);
