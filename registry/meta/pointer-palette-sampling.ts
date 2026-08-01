import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'pointer-palette-sampling',
  title: 'Pointer Palette Sampling',
  category: 'cursor',
  tags: ['canvas', 'getimagedata', 'oklab', 'colour', 'pointer', 'palette'],
  blurb: 'Point at the artwork and it names the colour — a clamped pixel read snapped to the nearest palette entry.',
  cost: 'canvas2d',
  motif: 'grid',

  files: [
    {
      path: 'registry/ui/pointer-palette-sampling.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: [],
  registryDependencies: ['use-resize-observer', 'use-reduced-motion', 'damp'],

  summary:
    'A surface you paint into a 2D canvas, plus a pointer that reads the pixel underneath it and snaps that read to the nearest entry in a named palette. The colour comes out as a CSS custom property on the root and as a throttled callback, so a chip can follow the cursor with no JavaScript per frame. It turns a palette from a legend you read into something you find by pointing.',

  mechanism: [
    'The canvas is created with `document.createElement` inside the effect and appended to the root, not rendered with a React `ref`. `willReadFrequently` is only honoured on the first `getContext` for a given canvas, so the element and the context have to share one lifecycle — under StrictMode a rendered canvas survives the mount/unmount/remount cycle while the context does not.',
    'On resize the backing store is set to `round(cssSize * min(devicePixelRatio, 2))` and the transform re-applied with `setTransform(dpr, 0, 0, dpr, 0, 0)`, in that order, because assigning `canvas.width` resets both the bitmap and the transform. The consumer\'s `paint` then draws in CSS pixels.',
    'A `pointermove` converts client coordinates to bitmap coordinates with the canvas\'s own backing ratio — `canvas.width / rect.width` — rather than `devicePixelRatio`, so browser zoom and any CSS scale on an ancestor stay correct.',
    'A 3x3 box centred on that pixel is clamped to `[0, canvas.width - 1]` and `[0, canvas.height - 1]`, then read in one `getImageData` call. The nine samples are averaged with alpha as the weight, so a dithered or grainy surface produces a stable colour instead of oscillating between two palette entries.',
    'The average and every palette hex are converted sRGB → linear → OKLab, and the match is the smallest squared OKLab distance. Nearest-colour in raw RGB is dominated by the green channel and routinely calls a mid blue "black".',
    'The match is written to `--kx-sample-color` on the root immediately, along with `--kx-sample-x` / `--kx-sample-y` in CSS pixels, and emitted through `onSample` on a throttle — position is a cursor and must not lag, colour is information and must not spam.',
  ],

  constants: [
    {
      name: 'willReadFrequently',
      value: 'true',
      why: 'A default 2D context lives in GPU memory, and each `getImageData` forces a synchronous readback that stalls the pipeline — on a pointermove that is a visible drag on the cursor. The flag moves the surface to a software backing: paint is marginally slower, reads are roughly an order of magnitude faster.',
    },
    {
      name: 'SAMPLE_BOX',
      value: '3',
      why: 'Odd, so the box centres on the pointer\'s own pixel. One pixel flickers between neighbouring palette entries over any gradient dither; 3x3 is enough to settle it, and 5x5 starts averaging across a real colour boundary so edges read as a colour that is not on screen.',
    },
    {
      name: 'MAX_DPR',
      value: '2',
      why: 'Sampling cost is per read and does not care, but paint cost is per pixel. A 3x display would quadruple the fill work relative to 1.5x for no perceptible gain on a flat-colour artwork.',
    },
    {
      name: 'throttleMs',
      value: '50',
      why: 'Matches the source. Fast enough that dragging across the artwork feels continuous, slow enough that a React consumer re-rendering a swatch on every emission stays under one render per three frames.',
    },
    {
      name: 'alpha weight',
      value: 'data[i + 3] / 255',
      why: 'Transparent pixels carry no colour but their RGB is usually zero, so an unweighted mean over a partly-transparent box returns something darker than anything visible. Weighting by alpha, and bailing when the total is zero, keeps the answer to what was actually painted.',
    },
  ],

  pitfalls: [
    'Calling `getContext("2d")` first and adding `{ willReadFrequently: true }` later. The attributes of a canvas context are fixed at creation; the second call returns the first context and silently ignores the options, so the optimisation appears to be applied and is not.',
    'Reading the box unclamped. A pointer on the right or bottom edge produces a rect that overhangs the bitmap — no exception, the overhang is filled with transparent black — so the average darkens and the match snaps to the palette\'s darkest entry along every border.',
    'Letting the clamp collapse the rect. `getImageData` with a zero width or height throws `IndexSizeError`, which is what happens on a 1px-wide canvas if the box is clamped naively to a range instead of to an inclusive index pair.',
    'Converting with `devicePixelRatio` instead of the backing ratio. Correct at 100% zoom on a static layout, then off by the zoom factor the moment the user hits Cmd-plus, and off by the scale factor inside any transformed ancestor.',
    'Drawing a cross-origin image into the canvas. The canvas is tainted from that draw onward and every `getImageData` throws `SecurityError` — including for the parts of the surface you painted yourself. Paint procedurally, or serve the image same-origin with CORS.',
    'Matching in RGB. Euclidean distance in sRGB is not perceptual: green outweighs red and blue roughly six to one, so mid-tones snap to the wrong hue and the palette looks mislabelled rather than the maths looking wrong.',
    'Rendering the canvas as JSX with a `ref` and disposing the context in cleanup. Under StrictMode the element is reused across the double-invoke while the effect runs twice, so the surviving mount holds a context the first teardown already reset.',
    'Throttling the pointer position along with the colour. The readout then trails the cursor by the throttle window and the whole interaction reads as laggy, even though the sampling itself is instant.',
  ],

  notes: [
    'Everything downstream is CSS. `--kx-sample-color` and `--kx-sample-x` / `--kx-sample-y` mean a chip can follow the pointer and recolour itself with no rAF and no React render.',
    '`data-sampling` on the root is `true` while the pointer is over the artwork, which is the hook for fading the readout in and out.',
    'Palette entries with an unparseable hex are dropped at match time rather than throwing, so one bad token in a design-token export does not take the interaction down.',
  ],

  apiSignature:
    'function PointerPaletteSampling(props: { palette: readonly PaletteEntry[]; paint: (ctx: CanvasRenderingContext2D, size: { width: number; height: number; dpr: number }) => void; paintKey?: string | number; onSample?: (entry: PaletteEntry | null) => void; throttleMs?: number; children?: ReactNode; className?: string }): JSX.Element',

  props: [
    { name: 'palette', type: 'readonly PaletteEntry[]', description: 'Named colours the read snaps to. `{ name, hex }`, `#rgb` or `#rrggbb`.' },
    { name: 'paint', type: '(ctx, size) => void', description: 'Draws the surface. Context is pre-scaled and cleared, so draw in CSS pixels. Must not draw a cross-origin image.' },
    { name: 'paintKey', type: 'string | number', description: 'Bump to force a repaint when the painter\'s inputs change. The painter itself is read through a ref, so an inline arrow is safe.' },
    { name: 'onSample', type: '(entry: PaletteEntry | null) => void', description: 'Throttled match. `null` when the pointer leaves.' },
    { name: 'throttleMs', type: 'number', default: '50', description: 'Minimum gap between emissions.' },
    { name: 'children', type: 'ReactNode', description: 'Overlay content, rendered in a positioned layer above the canvas.' },
    { name: 'className', type: 'string', description: 'Merged onto the root. Give it a size.' },
  ],

  reducedMotion:
    'Sampling is not motion, so it keeps working: the colour still updates and `onSample` still fires. What stops is the chase — `--kx-sample-x` and `--kx-sample-y` are left parked at their initial 50% so a readout pinned to those properties stays still and simply recolours, instead of flying around the frame after the cursor.',

  cleanup:
    'The canvas element is removed from the DOM in the same effect that created it, which drops the bitmap and the context with it. The four pointer listeners are removed, any pending throttle timer is cleared so no emission lands after unmount, and `data-sampling` is reset. The shared ResizeObserver unsubscribes through the hook.',

  acceptance:
    'Move the pointer across the artwork: the readout recolours continuously and names a palette entry, with no stutter under a fast drag. Park the cursor exactly on the right or bottom edge — the name must not jump to the darkest colour in the palette. Zoom the browser to 150% and point at the same region; the answer is unchanged. With reduced motion on, the readout stops following the pointer but still renames itself.',

  criticalRegion: 'critical',
};

export default meta;
