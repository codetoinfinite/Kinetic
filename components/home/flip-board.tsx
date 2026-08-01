'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

import { claim, priority } from '@/lib/preview-budget';
import { useRaf } from '@/registry/hooks/use-raf';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';
import { disposeRenderer, hasWebGL, pixelRatio } from '@/registry/lib/webgl';

/* ==========================================================================
   Flip board.
   --------------------------------------------------------------------------
   A split-flap wall — the mechanical departure board — with the reader's
   scroll position as the drive shaft. Every tile is one character. Travelling
   the pinned track drives the whole wall through five messages, and because
   the angle of each flap is a function of position rather than of an event,
   stopping halfway leaves the board halfway and scrolling back runs it
   backwards, flap by flap, exactly as it came.

   Why this and not a scene: the product is type and source, and a board made
   of characters is the one motion object that *is* its own content. It also
   has a physical referent, which is what keeps it from reading as an effect —
   everyone has watched one of these boards resolve.

   Three things are worth knowing about the implementation.

     One mesh. All 36 tiles are quads in a single indexed BufferGeometry, and
     the flip is computed in the vertex shader from a per-vertex delay and one
     uniform. There is no per-tile object, no matrix update and no CPU work per
     frame beyond writing that uniform: the whole board is one draw call.

     One texture. The glyphs are baked once into an atlas — 8x5 cells, drawn
     with the site's own mono face at whatever size the device asks for — and
     each vertex carries the atlas cell for the character it shows *now* and
     the one it shows *next*. Changing message is 288 floats, four times per
     traversal, not a redraw.

     `gl_FrontFacing` does the reveal. Rotating a quad by pi about its own
     horizontal axis turns its back to the camera, so the fragment shader can
     simply ask which face it is shading and sample the outgoing character or
     the incoming one. The back face's V is flipped because the rotation
     flipped the geometry, which is the whole of the trick.

   The board is `aria-hidden`. It is a picture of the strip of real links the
   hero lays over it, and every message it spells is stated in the copy beside
   it — nothing is only here.
   ========================================================================== */

export interface FlipPanel {
  /** Category id — picks the accent this message is set in. */
  category: string;
  /** Three lines, each at most `COLS` characters. Centred per line. */
  lines: readonly string[];
}

export interface FlipBoardProps {
  panels: readonly FlipPanel[];
  className?: string;
  /**
   * Overlaid on the stage. Children rather than a sibling because `--k-scrub`
   * is published on this element: anything scrubbed by the same playhead has to
   * inherit it, and a sibling would re-derive the number from scroll and land a
   * frame off.
   */
  children?: React.ReactNode;
}

/** Board shape. 12 x 3 holds a twelve-character line and still leaves the
    glyphs large enough to read across a room, which is the reference. */
const COLS = 12;
const ROWS = 3;
const TILES = COLS * ROWS;

/** Which line carries the accent. The last one, so the message resolves into
    colour rather than opening in it. */
const ACCENT_ROW = ROWS - 1;

/** Atlas layout. 39 glyphs into 40 cells; the spare stays blank. */
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -/';
const ATLAS_COLS = 8;
const ATLAS_ROWS = 5;
const CELL_W = 160;
const CELL_H = 200;
const SPACE = CHARS.indexOf(' ');

/** Flap proportion, height over width. Matches the atlas cell exactly. */
const TILE_ASPECT = CELL_H / CELL_W;

/** Seam between flaps, as a fraction of a cell. The page background shows
    through it — the same hairline grammar the rest of the site is ruled in. */
const GAP = 0.045;

const FOV = 34;
/** Camera distance to the board plane. Arbitrary, then everything is derived
    from it: the board is fitted to the frame rather than the camera to the
    board, so there is one number to change and nothing to keep in step. */
const CAM_D = 10;

/** How much of the frame the board is allowed to take. Height is the binding
    constraint on a laptop and width on a phone, so both are stated. */
const FILL_W = 0.9;
const FILL_H = 0.5;

/** The board is centred in the top band of the stage; the copy owns the rest. */
const BAND = 0.62;

/**
 * Flip shape. A tile's flip occupies `WINDOW` of the message transition and
 * starts at its own `MAX_DELAY`-scaled offset, so the board resolves as a
 * diagonal wave from the top-left. The two sum to 1: the last flap lands
 * exactly as the transition ends, with no dead tail and no clipping.
 */
const MAX_DELAY = 0.6;
const WINDOW = 0.4;

/** Framerate-independent damping for the scrub. 9 lands a flick in ~250ms. */
const DAMP = 9;

/** Extra tilt on the flap under the pointer, radians. */
const HOVER_TILT = 0.42;

interface Palette {
  surface: THREE.Vector3;
  fg: THREE.Vector3;
  accents: Map<string, THREE.Vector3>;
  mono: string;
}

interface Stage {
  render: (progress: number, dt: number) => void;
  resize: (width: number, height: number) => void;
  hover: (x: number, y: number) => void;
  redraw: () => void;
  dispose: () => void;
}

/**
 * Any CSS colour to a plain sRGB triple.
 *
 * Two things are going on. `THREE.Color` cannot parse `oklch()` — it reads hex,
 * `rgb()`, `hsl()` and named colours only, so handing it a theme token yields
 * black — while canvas 2D parses the whole of CSS Color 4, so one painted pixel
 * gets the browser to do the conversion.
 *
 * And the value stays *display* sRGB rather than being linearised, because this
 * material writes `gl_FragColor` straight out with no colour-space chunk: what
 * goes in the uniform is what lands in the framebuffer, which is what makes the
 * board exactly the same near-black as the DOM around it.
 */
function resolveRgb(css: string): THREE.Vector3 {
  const probe = document.createElement('canvas');
  probe.width = 1;
  probe.height = 1;
  const ctx = probe.getContext('2d', { willReadFrequently: true });
  if (!ctx) return new THREE.Vector3(1, 1, 1);

  ctx.fillStyle = css;
  ctx.fillRect(0, 0, 1, 1);
  const [r = 0, g = 0, b = 0] = ctx.getImageData(0, 0, 1, 1).data;
  return new THREE.Vector3(r / 255, g / 255, b / 255);
}

/**
 * The theme lives in CSS, so it is read from CSS — including the per-category
 * accents, which globals.css defines as `[data-category='…'] { --k-accent: … }`.
 * A hidden probe wearing the attribute is the only way to resolve those from
 * script without restating the seven values and letting them drift.
 */
function readPalette(host: HTMLElement, categories: readonly string[]): Palette {
  const root = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string): string => {
    const value = root.getPropertyValue(name).trim();
    return value === '' ? fallback : value;
  };

  const probe = document.createElement('div');
  probe.style.display = 'none';
  probe.className = 'font-mono';
  host.appendChild(probe);

  const accents = new Map<string, THREE.Vector3>();
  for (const category of categories) {
    probe.dataset['category'] = category;
    const accent = getComputedStyle(probe).getPropertyValue('--k-accent').trim();
    accents.set(category, resolveRgb(accent === '' ? '#8bb4ff' : accent));
  }

  // The generated family name from next/font is only knowable at runtime.
  const mono = getComputedStyle(probe).fontFamily;
  probe.remove();

  return {
    surface: resolveRgb(read('--k-surface', '#141414')),
    fg: resolveRgb(read('--k-fg', '#f5f5f5')),
    accents,
    mono: mono === '' ? 'ui-monospace, monospace' : mono,
  };
}

/** Character to atlas cell. Anything unmapped shows as a blank flap. */
function glyph(character: string): number {
  const index = CHARS.indexOf(character.toUpperCase());
  return index === -1 ? SPACE : index;
}

/** One message to `TILES` atlas cells, each line centred in its row. */
function layout(lines: readonly string[]): Uint8Array {
  const cells = new Uint8Array(TILES).fill(SPACE);

  for (let row = 0; row < ROWS; row += 1) {
    const line = (lines[row] ?? '').slice(0, COLS);
    const left = Math.floor((COLS - line.length) / 2);
    for (let i = 0; i < line.length; i += 1) {
      cells[row * COLS + left + i] = glyph(line[i] ?? ' ');
    }
  }

  return cells;
}

/** Every glyph, once, at device resolution. Drawn white on transparent: the
    fragment shader reads coverage out of the alpha channel and colours it. */
function drawAtlas(canvas: HTMLCanvasElement, mono: string): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ffffff';
  ctx.font = `500 ${Math.round(CELL_H * 0.62)}px ${mono}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = 0; i < CHARS.length; i += 1) {
    const column = i % ATLAS_COLS;
    const row = Math.floor(i / ATLAS_COLS);
    // A hair above centre: mono faces hang their baseline low, and a column of
    // characters optically centred beats one geometrically centred.
    ctx.fillText(CHARS[i] ?? ' ', (column + 0.5) * CELL_W, (row + 0.47) * CELL_H);
  }
}

const VERTEX = /* glsl */ `
  attribute vec3 aCenter;
  attribute float aDelay;
  attribute vec2 aCellA;
  attribute vec2 aCellB;
  attribute float aRow;
  attribute float aHover;

  uniform float uProgress;
  uniform vec2 uAtlas;

  varying vec2 vUvA;
  varying vec2 vUvB;
  varying float vShade;
  varying float vRow;

  const float PI = 3.141592653589793;

  void main() {
    float t = clamp((uProgress - aDelay) / ${WINDOW.toFixed(3)}, 0.0, 1.0);
    // Hermite: a flap that starts and stops abruptly reads as a slide, and the
    // thing being imitated has mass at both ends of its travel.
    float eased = t * t * (3.0 - 2.0 * t);
    float angle = PI * eased + aHover * ${HOVER_TILT.toFixed(3)};

    float c = cos(angle);
    float s = sin(angle);

    // Rotation about the tile's own horizontal centre line. Top edge goes away
    // from the camera first, which is the direction a real flap falls.
    vec3 local = position - aCenter;
    vec3 flipped = vec3(local.x, local.y * c, -local.y * s);
    vec3 lifted = aCenter + flipped + vec3(0.0, 0.0, aHover * 0.08);

    vUvA = (aCellA + uv) / uAtlas;
    // The back face is the geometry seen after a half turn, so it arrives
    // vertically mirrored; sampling the incoming glyph upside down puts it back
    // the right way up.
    vUvB = (aCellB + vec2(uv.x, 1.0 - uv.y)) / uAtlas;
    // Edge-on flaps go dark. This is the only shading on the board and it is
    // what makes the flip read as a solid object turning rather than as a
    // texture cross-fading.
    vShade = mix(0.3, 1.0, abs(c));
    vRow = aRow;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(lifted, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  precision highp float;

  uniform sampler2D uMap;
  uniform vec3 uSurface;
  uniform vec3 uFg;
  uniform vec3 uAccentA;
  uniform vec3 uAccentB;

  varying vec2 vUvA;
  varying vec2 vUvB;
  varying float vShade;
  varying float vRow;

  void main() {
    bool front = gl_FrontFacing;
    float ink = texture2D(uMap, front ? vUvA : vUvB).a;
    vec3 accent = front ? uAccentA : uAccentB;
    vec3 tint = abs(vRow - ${ACCENT_ROW.toFixed(1)}) < 0.5 ? accent : uFg;
    gl_FragColor = vec4(mix(uSurface, tint, ink) * vShade, 1.0);
  }
`;

function createStage(
  canvas: HTMLCanvasElement,
  panels: readonly FlipPanel[],
  palette: Palette,
  onPanel: (index: number) => void,
): Stage | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch {
    return null;
  }

  renderer.setPixelRatio(pixelRatio());
  renderer.setClearAlpha(0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, CAM_D * 4);
  camera.position.set(0, 0, CAM_D);

  const atlas = document.createElement('canvas');
  atlas.width = ATLAS_COLS * CELL_W;
  atlas.height = ATLAS_ROWS * CELL_H;
  drawAtlas(atlas, palette.mono);

  const texture = new THREE.CanvasTexture(atlas);
  // Alpha is read as coverage, never as colour, so there is nothing to decode.
  texture.colorSpace = THREE.NoColorSpace;
  texture.flipY = false;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  texture.generateMipmaps = true;

  /* Geometry is built once, in cell units: one cell is 1 wide and TILE_ASPECT
     tall, and the whole board is scaled to the frame in `resize`. Fitting by
     scale rather than by rebuilding vertices is what keeps a window drag free
     of attribute uploads. */
  const position = new Float32Array(TILES * 4 * 3);
  const corner = new Float32Array(TILES * 4 * 2);
  const centers = new Float32Array(TILES * 4 * 3);
  const delays = new Float32Array(TILES * 4);
  /* The wave position each tile would take if it had something to say. A tile
     that is blank on both sides of a transition is parked outside the window
     instead (see `show`) — a turning blank flap is a grey parallelogram sliding
     through the gutter with no glyph to justify it. */
  const baseDelay = new Float32Array(TILES);
  const cellA = new Float32Array(TILES * 4 * 2);
  const cellB = new Float32Array(TILES * 4 * 2);
  const rows = new Float32Array(TILES * 4);
  const hovers = new Float32Array(TILES * 4);
  const indices = new Uint16Array(TILES * 6);

  const tileW = 1 - GAP;
  const tileH = TILE_ASPECT * (1 - GAP);
  // (u, v) with v measured downward, so it indexes the atlas directly.
  const CORNERS: readonly [number, number][] = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ];

  for (let tile = 0; tile < TILES; tile += 1) {
    const col = tile % COLS;
    const row = Math.floor(tile / COLS);
    const cx = col - (COLS - 1) / 2;
    const cy = ((ROWS - 1) / 2 - row) * TILE_ASPECT;
    const delay =
      ((col / (COLS - 1)) * 0.62 + (row / (ROWS - 1)) * 0.38) * MAX_DELAY;
    baseDelay[tile] = delay;

    for (let c = 0; c < 4; c += 1) {
      const [u = 0, v = 0] = CORNERS[c] ?? [0, 0];
      const vertex = tile * 4 + c;

      position[vertex * 3] = cx + (u - 0.5) * tileW;
      position[vertex * 3 + 1] = cy + (0.5 - v) * tileH;
      position[vertex * 3 + 2] = 0;

      corner[vertex * 2] = u;
      corner[vertex * 2 + 1] = v;

      centers[vertex * 3] = cx;
      centers[vertex * 3 + 1] = cy;
      centers[vertex * 3 + 2] = 0;

      delays[vertex] = delay;
      rows[vertex] = row;
    }

    // Counter-clockwise seen from +z, so an unflipped flap is front-facing.
    const base = tile * 4;
    const slot = tile * 6;
    indices[slot] = base;
    indices[slot + 1] = base + 3;
    indices[slot + 2] = base + 2;
    indices[slot + 3] = base;
    indices[slot + 4] = base + 2;
    indices[slot + 5] = base + 1;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(corner, 2));
  geometry.setAttribute('aCenter', new THREE.BufferAttribute(centers, 3));
  const delayAttr = new THREE.BufferAttribute(delays, 1);
  delayAttr.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('aDelay', delayAttr);
  const cellAttrA = new THREE.BufferAttribute(cellA, 2);
  const cellAttrB = new THREE.BufferAttribute(cellB, 2);
  const hoverAttr = new THREE.BufferAttribute(hovers, 1);
  cellAttrA.setUsage(THREE.DynamicDrawUsage);
  cellAttrB.setUsage(THREE.DynamicDrawUsage);
  hoverAttr.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('aCellA', cellAttrA);
  geometry.setAttribute('aCellB', cellAttrB);
  geometry.setAttribute('aRow', new THREE.BufferAttribute(rows, 1));
  geometry.setAttribute('aHover', hoverAttr);
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));

  const uniforms = {
    uProgress: { value: 0 },
    uAtlas: { value: new THREE.Vector2(ATLAS_COLS, ATLAS_ROWS) },
    uMap: { value: texture },
    uSurface: { value: palette.surface.clone() },
    uFg: { value: palette.fg.clone() },
    uAccentA: { value: new THREE.Vector3(1, 1, 1) },
    uAccentB: { value: new THREE.Vector3(1, 1, 1) },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  // The flip lives in the vertex shader, so the CPU-side bounds do not describe
  // where these triangles actually are.
  mesh.frustumCulled = false;
  scene.add(mesh);

  const layouts = panels.map((panel) => layout(panel.lines));
  let accents = panels.map(
    (panel) => palette.accents.get(panel.category) ?? palette.fg,
  );

  /** Writes the outgoing and incoming message into the vertex attributes. */
  let shown = -1;
  const show = (index: number): void => {
    const from = layouts[index] ?? layouts[0];
    const to = layouts[Math.min(index + 1, layouts.length - 1)] ?? from;
    if (!from || !to) return;

    for (let tile = 0; tile < TILES; tile += 1) {
      const a = from[tile] ?? SPACE;
      const b = to[tile] ?? SPACE;
      const ax = a % ATLAS_COLS;
      const ay = Math.floor(a / ATLAS_COLS);
      const bx = b % ATLAS_COLS;
      const by = Math.floor(b / ATLAS_COLS);
      // Well past the end of the window, so `t` clamps to zero for the whole
      // transition and the flap holds flat.
      const delay = a === SPACE && b === SPACE ? 2 : (baseDelay[tile] ?? 0);

      for (let c = 0; c < 4; c += 1) {
        const slot = tile * 4 + c;
        const vertex = slot * 2;
        cellA[vertex] = ax;
        cellA[vertex + 1] = ay;
        cellB[vertex] = bx;
        cellB[vertex + 1] = by;
        delays[slot] = delay;
      }
    }

    cellAttrA.needsUpdate = true;
    cellAttrB.needsUpdate = true;
    delayAttr.needsUpdate = true;
    uniforms.uAccentA.value = accents[index] ?? palette.fg;
    uniforms.uAccentB.value =
      accents[Math.min(index + 1, accents.length - 1)] ?? palette.fg;
    shown = index;
  };
  show(0);

  let size = { width: 1, height: 1 };
  let cell = 1;
  let frameH = 1;
  let boardY = 0;

  /**
   * The board's vertical seat, as a share of the frame it is centred in.
   *
   * It starts in the top band, because the bottom of the first screen belongs to
   * the copy, and settles into the middle of the stage once that copy has
   * scrubbed away — otherwise the board spends four fifths of the track sitting
   * above a screen and a half of empty page.
   */
  const seat = (progress: number): number => {
    const t = Math.min(Math.max(progress / 0.16, 0), 1);
    const band = BAND + (1 - BAND) * (t * t * (3 - 2 * t));
    return frameH * (0.5 - band / 2);
  };

  const resize = (width: number, height: number): void => {
    size = { width: Math.max(width, 1), height: Math.max(height, 1) };
    renderer.setSize(size.width, size.height, false);

    const aspect = size.width / size.height;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();

    frameH = 2 * CAM_D * Math.tan(THREE.MathUtils.degToRad(FOV) / 2);
    const frameW = frameH * aspect;

    // Whichever of the two limits binds first. On a laptop that is the height
    // budget; on a phone the board is width-bound and reads as a marquee, which
    // is the correct degradation — the alternative is a different column count
    // per breakpoint, and a twelve-character line cannot be set in seven.
    cell = Math.min((frameW * FILL_W) / COLS, (frameH * FILL_H) / (ROWS * TILE_ASPECT));
    mesh.scale.setScalar(cell);
  };

  /* Per-tile hover, eased on the CPU. 36 floats a frame is nothing, and it is
     the only way both the arriving and the departing flap can ease — a single
     "hovered index" uniform snaps the one you just left. */
  let hoverTile = -1;
  let hoverDirty = false;
  const amounts = new Float32Array(TILES);

  const hover = (x: number, y: number): void => {
    const frameH = 2 * CAM_D * Math.tan(THREE.MathUtils.degToRad(FOV) / 2);
    const frameW = frameH * (size.width / size.height);

    // The board is a plane at z=0 and the camera looks straight at it, so the
    // pointer maps to board space by proportion alone — no raycaster, and no
    // dependence on the vertex shader's current rotation.
    const bx = ((x / size.width) * 2 - 1) * (frameW / 2);
    const by = (-(y / size.height) * 2 + 1) * (frameH / 2) - boardY;

    const col = Math.floor(bx / cell + COLS / 2);
    const row = Math.floor(((ROWS * TILE_ASPECT) / 2 - by / cell) / TILE_ASPECT);

    hoverTile =
      col < 0 || col >= COLS || row < 0 || row >= ROWS ? -1 : row * COLS + col;
  };

  let reported = -1;

  const render = (progress: number, dt: number): void => {
    const span = Math.max(panels.length - 1, 1);
    const travel = Math.min(Math.max(progress, 0), 1) * span;
    const index = Math.min(Math.floor(travel), span - 1);
    if (index !== shown) show(index);
    uniforms.uProgress.value = travel - index;

    boardY = seat(progress);
    mesh.position.y = boardY;

    // The counter names the message you can *read*, which past the halfway point
    // of a flip is the incoming one — `index` is the outgoing panel and would
    // sit a step behind for the whole second half of every transition.
    const readable = Math.round(travel);
    if (readable !== reported) {
      reported = readable;
      onPanel(readable);
    }

    const k = 1 - Math.exp(-12 * dt);
    for (let tile = 0; tile < TILES; tile += 1) {
      const target = tile === hoverTile ? 1 : 0;
      const current = amounts[tile] ?? 0;
      const next = current + (target - current) * k;
      if (Math.abs(next - current) < 0.0008) continue;
      amounts[tile] = next;
      for (let c = 0; c < 4; c += 1) hovers[tile * 4 + c] = next;
      hoverDirty = true;
    }
    if (hoverDirty) {
      hoverAttr.needsUpdate = true;
      hoverDirty = false;
    }

    renderer.render(scene, camera);
  };

  const redraw = (): void => {
    const next = readPalette(canvas.parentElement ?? document.body, [
      ...new Set(panels.map((panel) => panel.category)),
    ]);
    drawAtlas(atlas, next.mono);
    texture.needsUpdate = true;
    uniforms.uSurface.value = next.surface;
    uniforms.uFg.value = next.fg;
    accents = panels.map((panel) => next.accents.get(panel.category) ?? next.fg);
    const current = shown;
    shown = -1;
    show(current < 0 ? 0 : current);
  };

  const dispose = (): void => {
    geometry.dispose();
    material.dispose();
    texture.dispose();
    disposeRenderer(renderer);
  };

  return { render, resize, hover, redraw, dispose };
}

export function FlipBoard({ panels, className, children }: FlipBoardProps) {
  const reduced = useReducedMotion();

  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<Stage | null>(null);
  const scrub = useRef({ current: 0, target: 0 });

  const [live, setLive] = useState(false);
  const [supported, setSupported] = useState(true);
  const [panelIndex, setPanelIndex] = useState(0);

  // A slot from the same arbiter every preview uses. `focused` ranks the hero
  // above every card on the page: whatever else scrolls past, this keeps its
  // context.
  useEffect(() => {
    if (reduced) return;
    if (!hasWebGL()) {
      setSupported(false);
      return;
    }
    return claim(
      { id: 'home:flip-board', cost: 'webgl', weight: priority(1, { focused: true }) },
      setLive,
    );
  }, [reduced]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!live || !canvas || !host) return;

    const categories = [...new Set(panels.map((panel) => panel.category))];
    const stage = createStage(canvas, panels, readPalette(host, categories), setPanelIndex);
    if (!stage) {
      setSupported(false);
      return;
    }
    stageRef.current = stage;

    const measure = (): void => {
      const rect = host.getBoundingClientRect();
      stage.resize(rect.width, rect.height);
      stage.render(scrub.current.current, 1 / 60);
    };
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(host);

    // Web fonts land after first paint, so the first atlas is drawn in fallback
    // metrics. One redraw when they are ready rather than blocking on them.
    let cancelled = false;
    void document.fonts?.ready.then(() => {
      if (!cancelled) stage.redraw();
    });

    // The palette is a function of the theme class on <html>, which the toggle
    // rewrites without a React render.
    const theme = new MutationObserver(() => stage.redraw());
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    const onLost = (event: Event): void => {
      event.preventDefault();
      setSupported(false);
    };
    canvas.addEventListener('webglcontextlost', onLost);

    return () => {
      cancelled = true;
      canvas.removeEventListener('webglcontextlost', onLost);
      theme.disconnect();
      observer.disconnect();
      stage.dispose();
      stageRef.current = null;
    };
  }, [live, panels]);

  /**
   * Scroll → progress. The track is taller than the viewport; progress is how
   * far the pinned stage has travelled through it, and it is the only number
   * this section reads off the page.
   */
  const readProgress = useCallback((): number => {
    const host = hostRef.current;
    if (!host) return 0;
    const track = host.closest('[data-scrub-track]');
    if (!(track instanceof HTMLElement)) return 0;

    const rect = track.getBoundingClientRect();
    const span = rect.height - window.innerHeight;
    if (span <= 0) return 0;
    return Math.min(Math.max(-rect.top / span, 0), 1);
  }, []);

  useRaf(
    (dt) => {
      const stage = stageRef.current;
      const host = hostRef.current;
      if (!stage || !host) return;

      scrub.current.target = readProgress();

      // Framerate-independent exponential approach: the same settling time at
      // 60 and 144Hz, where a fixed per-frame lerp would be twice as fast on
      // the faster display.
      const k = 1 - Math.exp(-DAMP * dt);
      scrub.current.current += (scrub.current.target - scrub.current.current) * k;

      const p = scrub.current.current;
      // Published for CSS. The overlay's fades and offsets read this one
      // property, so type and geometry are scrubbed by the same number in the
      // same frame.
      host.style.setProperty('--k-scrub', p.toFixed(4));

      stage.render(p, dt);
    },
    live && supported,
  );

  const onMove = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    const rect = event.currentTarget.getBoundingClientRect();
    stageRef.current?.hover(event.clientX - rect.left, event.clientY - rect.top);
  };

  const onLeave = (): void => stageRef.current?.hover(-1e6, -1e6);

  const canvasVisible = live && supported && !reduced;
  const first = panels[0];

  return (
    <div ref={hostRef} className={className} style={{ '--k-scrub': 0 } as React.CSSProperties}>
      {canvasVisible ? (
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          onPointerMove={onMove}
          onPointerLeave={onLeave}
          // z-10 rather than auto: the hero lays scrim and copy over this at
          // higher levels and they have to stay above it.
          className="absolute inset-0 z-10 h-full w-full"
        />
      ) : (
        /* Not a degraded picture of the board — the same board, set in the same
           face, standing still. Reduced motion, no WebGL, a lost context and a
           budget refusal all land here. */
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-[7%] z-10 flex justify-center px-5"
          data-category={first?.category}
        >
          <div className="grid w-full max-w-[72rem] grid-cols-12 gap-px">
            {[...(first ? first.lines : [])].slice(0, ROWS).flatMap((line, row) => {
              const padded = line.slice(0, COLS).toUpperCase();
              const left = Math.floor((COLS - padded.length) / 2);
              return Array.from({ length: COLS }, (_, col) => (
                <span
                  key={`${row}-${col}`}
                  className={`flex aspect-4/5 items-center justify-center bg-surface font-mono text-display-2 ${
                    row === ACCENT_ROW ? 'text-accent' : 'text-fg'
                  }`}
                >
                  {padded[col - left] ?? ''}
                </span>
              ));
            })}
          </div>
        </div>
      )}

      {children}

      {/* Board counter. Four characters of mono is the whole readout: which
          message is showing, out of how many, updated only when a message
          actually changes rather than every frame. */}
      <p className="meta pointer-events-none absolute left-5 top-6 z-30 text-faint sm:left-8">
        <span className="text-accent">{String(panelIndex + 1).padStart(2, '0')}</span> /{' '}
        {String(panels.length).padStart(2, '0')}
      </p>
    </div>
  );
}
