import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'fractional-render-scale',
  title: 'Fractional Render Scale',
  category: 'webgl',
  tags: ['three', 'performance', 'render-scale', 'grid', 'pointer', 'fragment-shader'],
  blurb: 'A field rendered into a backing store 0.6x its box — 36% of the fragments — with a grid measured in texels so the upscale never shows.',
  cost: 'webgl',
  motif: 'grid',

  files: [
    {
      path: 'registry/ui/fractional-render-scale.tsx',
      type: 'registry:ui',
      role: 'component',
    },
    {
      path: 'registry/shaders/fractional-render-scale.ts',
      type: 'registry:lib',
      role: 'fullscreen-triangle vertex and field fragment source',
    },
  ],
  dependencies: ['three@^0.185.1'],
  registryDependencies: [
    'webgl',
    'damp',
    'use-raf',
    'use-in-view',
    'use-visibility',
    'use-resize-observer',
    'use-reduced-motion',
    'use-smooth-pointer',
  ],

  summary:
    'A drifting fog field with a latent grid that develops under the cursor, rendered into a canvas whose backing store is deliberately 0.6x the size of the element it fills. The browser upscales it, and the upscale is invisible because the content was authored for it: no detail finer than a dozen pixels, and the one thing with an edge — the grid — has its line width specified in backing-store pixels rather than CSS pixels. It is a background you can afford, and a demonstration of the cheapest large performance win in WebGL.',

  mechanism: [
    'The scale is applied through the pixel ratio: `renderer.setPixelRatio(pixelRatio(maxDpr) * scale)` followed by `setSize(w, h, false)`. three then sizes the backing store to `floor(w * dpr * scale)` while the canvas keeps `width: 100%` from CSS, so one number controls the ratio and there is no second sizing path to keep in sync.',
    'The achieved ratio is measured rather than assumed. `setSize` floors, so `getDrawingBufferSize().x / cssWidth` can differ from `dpr * scale` by up to a pixel; that measured value becomes `uScale`, and every length the shader treats as a CSS pixel is `gl_FragCoord.xy / uScale`.',
    'The fog is three sines multiplied and added, then pushed through `smoothstep(-0.15, 1.15, fog)`. It is not trying to be fbm — it is trying to contain no feature smaller than roughly a dozen pixels, which is the precondition for a bilinear upscale being undetectable.',
    'The grid is drawn from `abs(fract(cell - 0.5) - 0.5) * pxPerCell`, which is the distance to the nearest line expressed in backing-store pixels, and a `smoothstep(width - 0.5, width + 0.5, d)` ramp across exactly one texel. A line specified this way is `1 / scale` CSS pixels wide after the upscale: softer as the scale drops, never thinner, so it cannot fall through the sampling grid.',
    'No `fwidth`. The grid is axis-aligned in screen space, so the derivative of the cell coordinate is a constant the shader already holds — `uScale * uGridSize` backing pixels per cell. Computing it directly is exact, is one multiply, and needs no derivatives extension.',
    'The geometry is a single triangle with vertices at (-1,-1), (3,-1) and (-1,3). It covers the viewport with three vertices and no diagonal, so the GPU never shades the seam pixels twice as it does where two triangles of a fullscreen quad meet.',
    'The pointer is smoothed by `useSmoothPointer` with `perFrameToSmoothing(0.05)`, which reproduces the source\'s `x += (target - x) * 0.05` at 60 Hz while staying frame-rate independent, and its `nx`/`ny` are flipped to GL\'s y-up before reaching the uniform.',
  ],

  constants: [
    {
      name: 'renderScale',
      value: '0.6',
      why: 'Linear, so the saving is quadratic: 0.36 of the fragments, a 64% cut, about 2.8x less fragment work. A 2560x1440 window drops from 3.7 M fragments a frame to 1.3 M. Below roughly 0.5 the grid lines start to look conspicuously soft against crisp DOM text next to them; above 0.8 there is little left to win.',
    },
    {
      name: 'MIN_SCALE',
      value: '0.25',
      why: 'Floor on the prop. At 0.25 a one-texel line is already four CSS pixels wide — a third of a 44 px cell — and the grid stops reading as a grid and starts reading as a plaid.',
    },
    {
      name: 'lineWidth',
      value: '1 backing pixel',
      why: 'The unit is the whole point. One texel is the finest line the buffer can actually hold; asking for one CSS pixel at 0.6 scale asks for 0.6 of a texel, which the rasteriser answers with a dashed line that crawls as the box resizes.',
    },
    {
      name: 'gridSize',
      value: '44 CSS pixels',
      why: 'Authored in CSS pixels so the grid holds its apparent size when the render scale changes — the entire visual difference between 0.6 and 1.0 should be a slight softening, never a different layout.',
    },
    {
      name: 'majorEvery',
      value: '5',
      why: 'A 220 px major cell. Without a second scale the grid is a flat screen door; with one it acquires depth. Its line is 1.6x the minor width, which survives the upscale as a clear hierarchy where a colour difference alone would not.',
    },
    {
      name: 'POINTER_ALPHA',
      value: '0.05 per frame at 60 Hz',
      why: 'The source chose it to be slower than the eye expects, which reads as viscosity: about 330 ms to close 63% of the gap. Passed through `perFrameToSmoothing` so a 120 Hz display gets the same 330 ms rather than half of it.',
    },
    {
      name: 'glow exponent',
      value: 'exp(-d * d * 2.2)',
      why: 'A Gaussian on distance normalised by the radius, so `glowRadius` is where the glow has fallen to about 11%. A smoothstep here would put a visible circular edge on a field that has no other edges — the one place the upscale would be caught.',
    },
    {
      name: 'grid reveal',
      value: '0.18 + 0.82 * glow',
      why: 'The grid is mostly latent and the cursor develops it. At full strength everywhere it is a background; appearing under the pointer, it is a surface reacting to being touched. The 0.18 floor keeps the structure legible before the pointer arrives.',
    },
    {
      name: 'POINTER_EPSILON',
      value: '0.0002',
      why: 'Under reduced motion the image is a pure function of the pointer, so frames where it has not moved are skipped entirely. The threshold is well under one pixel of an ordinary box, so no real movement is ever swallowed.',
    },
  ],

  pitfalls: [
    'Setting only `canvas.width` and forgetting the CSS size, or the reverse. Either mistake produces a canvas that is simply smaller or simply blurrier than intended; the technique is the deliberate gap between the two sizes, and both have to be set on purpose.',
    'Putting `image-rendering: pixelated` on the canvas — sometimes inherited from a global rule aimed at sprite art. It replaces the bilinear upscale with nearest-neighbour and the entire effect turns into visible blocks.',
    'Specifying line widths, glow radii or grid spacing in device pixels via raw `gl_FragCoord`. Everything is tuned on one machine and then renders at 0.6 of that size at 0.6 scale, and a third of it again on a 3x phone. Divide by the measured scale and author in CSS pixels.',
    'Rendering content with fine detail at a fractional scale. Text, hairlines, high-frequency noise and hard-edged shapes all alias the moment the buffer shrinks. This technique is for soft fields, and content and scale have to be chosen together.',
    'Listening to `window.resize` instead of observing the element. A sidebar opening, a font loading and reflowing, or a flex sibling changing all resize the box with no window event — and `ResizeObserver` also fires once on observe, which handles the initial size with no separate call.',
    'Forgetting that resizing the canvas clears its drawing buffer. Any component that skips frames — as this one does when time is frozen — goes blank after a resize unless the resize path redraws explicitly.',
    'Reading `dpr * scale` back as the achieved ratio. `setSize` floors the backing store, so on most box widths the real ratio is slightly lower; using the nominal value makes the grid drift by a pixel against the layout as the window changes.',
    'Suppressing the render entirely under reduced motion. Time frozen at 0 still gives the fog, the vignette and the cursor glow, because none of them depend on it — a far better degradation than a flat colour, and the accessibility requirement is about motion, not about the image.',
    'Assuming `antialias: true` helps. There is no geometric edge to sample: the only visible edges come from the fragment shader, MSAA does not see them, and the request costs a multisampled buffer of the same size as everything just saved.',
  ],

  notes: [
    'The renderer is created with `powerPreference: "low-power"`. On a laptop with switchable graphics this keeps a decorative background off the discrete GPU, which is worth more battery than the render scale itself.',
    '`renderScale` and `maxDpr` are read from a ref inside the resize path, so changing them re-sizes the backing store without rebuilding the GL context — a render-scale slider can be dragged live.',
    'A useful way to see the technique: set `renderScale` to 1 and then to 0.6 and watch the grid rather than the fog. The lines soften very slightly and nothing else about the image changes, while the fragment count falls by two thirds.',
    'The colours are individual string props rather than an array, so a caller passing literals does not hand the effect a new identity on every render.',
  ],

  apiSignature:
    'function FractionalRenderScale(props: { renderScale?: number; maxDpr?: number; gridSize?: number; majorEvery?: number; lineWidth?: number; glowRadius?: number; baseColor?: string; fogColor?: string; lineColor?: string; glowColor?: string; className?: string }): JSX.Element',

  props: [
    { name: 'renderScale', type: 'number', default: '0.6', description: 'Backing store size relative to the display pixel ratio. Clamped to 0.25..1.' },
    { name: 'maxDpr', type: 'number', default: '2', description: 'Cap on the device pixel ratio before the render scale is applied.' },
    { name: 'gridSize', type: 'number', default: '44', description: 'Grid spacing in CSS pixels. Floored at 4.' },
    { name: 'majorEvery', type: 'number', default: '5', description: 'Every nth line is drawn as a major one, 1.6x the width.' },
    { name: 'lineWidth', type: 'number', default: '1', description: 'Minor line width in backing-store pixels — not CSS pixels. Floored at 0.5.' },
    { name: 'glowRadius', type: 'number', default: '240', description: 'Cursor glow radius in CSS pixels, at which the glow has fallen to about 11%.' },
    { name: 'baseColor', type: 'string', default: "'#080b12'", description: 'Darkest colour of the field.' },
    { name: 'fogColor', type: 'string', default: "'#1d3350'", description: 'Colour the fog lifts toward.' },
    { name: 'lineColor', type: 'string', default: "'#8fb6df'", description: 'Grid line colour.' },
    { name: 'glowColor', type: 'string', default: "'#3f7fd0'", description: 'Additive colour under the pointer.' },
    { name: 'className', type: 'string', description: 'Merged onto the host element via `cn`.' },
  ],

  reducedMotion:
    'The component reads `useReducedMotion` itself and freezes `uTime` at 0 rather than stopping the render. The fog, the vignette, the grid and the cursor glow are all still drawn — none of them depends on time — so what is lost is exactly the drift and nothing else. With time constant the image is a pure function of the pointer, so the loop skips any frame in which the pointer has not moved by more than 0.0002, and a still page costs nothing beyond the empty rAF callback.',

  cleanup:
    'Nulls the stage ref, disposes the triangle geometry and the ShaderMaterial, then calls `disposeRenderer` for `dispose` + `forceContextLoss` + a zeroed drawing buffer, and removes the canvas from the DOM. The canvas is three\'s own, created inside the effect and appended per effect run, so a StrictMode remount builds a new context instead of reattaching one that was just force-lost. The pointer listener belongs to `useSmoothPointer` and is removed with it; sizing, visibility and the frame loop are all shared subscriptions that release themselves.',

  acceptance:
    'A soft blue fog drifting behind a faint grid, with the grid brightening into a pool under the cursor that trails a third of a second behind it. Open DevTools and the canvas element reports a backing store of 0.6 of its CSS size — the technique is verifiable, not merely claimed — while the image shows no blockiness and the grid lines stay continuous rather than dashed. Resize the window slowly: the grid keeps its 44 px spacing against the layout and never crawls. With reduced motion the fog stops drifting and everything else, cursor glow included, still works.',

  criticalRegion: 'critical',
};

export default meta;
