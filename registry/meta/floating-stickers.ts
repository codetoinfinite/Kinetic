/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Floating Stickers" (boardui.com/).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'floating-stickers',
  title: 'Floating Stickers',
  category: 'display',
  kit: 'boardui',
  tags: ['stickers', 'decoration', 'drag', 'float', 'landing', 'boardui'],
  blurb:
    'Die-cut SVG characters that bob on seeded floats. Drag one and it lifts above the rest, clamped to the frame. Arrow keys nudge it.',
  cost: 'dom',
  motif: 'orbit',

  files: [
    {
      path: 'registry/ui/floating-stickers.tsx',
      type: 'registry:ui',
      role: 'component',
    },
    {
      path: 'registry/ui/floating-stickers-art.tsx',
      type: 'registry:ui',
      role: 'die-cut SVG sticker characters (blob, star, cloud, heart, chart)',
    },
  ],
  dependencies: [],

  summary:
    'Playful stickers for a landing section, like the characters that peek over a footer line. Each sticker sits at a fractional position in its field and bobs on a slow float whose duration, phase, lift and sway come from a seed, so every load looks the same. Grab one with a pointer and it scales up, gains a deeper shadow and rises to the top of the stack. It follows the pointer through pointer capture and stays clamped to the field. Focused stickers move with the arrow keys.',

  mechanism: [
    'The root is an `@container` field. Its `children` render in a `z-0` layer, and a `pointer-events-none` overlay above them holds the stickers. Each sticker is absolutely placed at `left: x%`, `top: y%` and centred with `translate(-50%, -50%)`. Its width is `min(size px, size/6.4 cqw)`, so it shrinks with a field narrower than 640px.',
    'Every sticker has four layers. The outer layer carries the drag offset and the z-index. The lift layer scales to 1.1 and swaps `drop-shadow-md` for `drop-shadow-xl` while held. The float layer runs a Web Animations API loop, and the art layer holds the resting tilt. Because the float is WAAPI on `transform`, it runs on the compositor and never re-renders React.',
    'Float parameters come from `createRng(`${seed}:${id}`)`: a duration of 4.2 to 7.4s, a negative start delay so the stickers start out of phase, 5 to 11px of lift, ±3px of drift and 1.5 to 4.5° of sway. The loop alternates with ease-in-out, and is paused on grab and resumed on drop.',
    'On pointerdown the sticker calls `setPointerCapture`, records the start pointer and offset, and computes bounds once: the field rect minus the sticker\'s resting rect. A sticker placed partly outside the field keeps its current offset as a valid edge, so it never jumps. Pointermove clamps the offset into those bounds. Pointerup, pointercancel and lostpointercapture all end the drag through one handler.',
    'Stacking is an order array in the parent, with the last id on top. Grabbing or key-nudging a sticker moves its id to the end, and each sticker\'s z-index is its rank + 1. The top sticker carries `data-top`.',
  ],

  constants: [
    {
      name: 'float',
      value: '4200 to 7400ms, alternate, ease-in-out, lift 5 to 11px, sway 1.5 to 4.5°',
      why: 'At this pace the motion reads as idle breathing rather than a call to action, and differing durations keep the stickers from syncing up.',
    },
    {
      name: 'grab lift',
      value: 'scale 1.1, drop-shadow-md → drop-shadow-xl, 200ms ease-out',
      why: 'A sticker peeled off a page gets bigger and casts a softer, larger shadow. The scale is on its own layer, so it never fights the drag offset or the float.',
    },
    {
      name: 'key step',
      value: '10px, Shift 40px',
      why: 'Small enough to place precisely, and Shift crosses the field in a few presses.',
    },
    {
      name: 'responsive size',
      value: 'min(size px, size / 6.4 cqw)',
      why: 'Full size from a 640px field. At a 328px phone field an 88px sticker drops to about 45px and stays clear of the headline.',
    },
  ],

  pitfalls: [
    'Putting the float and the drag on the same `transform`. Each would overwrite the other every frame, so the sticker snaps back mid-drag. Keep separate nested layers.',
    'Skipping `touch-action: none`. On touch screens the browser starts scrolling and fires pointercancel after a few pixels, so the drag dies. The draggable stickers carry `touch-none`.',
    'Seeding with `Math.random()`. The server and client would render different phases, so hydration fails and screenshots never match. Use the seeded rng.',
    'Clamping against bounds computed on every move. Reading layout in each pointermove is a forced reflow per frame. Bounds are computed once on pointerdown.',
  ],

  notes: [
    'Pass `draggable={false}` for pure decoration. Stickers then ignore the pointer and are hidden from assistive tech.',
    'To reset positions, remount with a new `key` (the demo\'s Reset button does this). Offsets are internal state relative to each resting place.',
    'Give the field an explicit height. The overlay is `absolute inset-0`, so it covers whatever box the children produce.',
  ],

  apiSignature:
    'function FloatingStickers(props: { stickers: StickerItem[]; seed?: string; draggable?: boolean; onGrab?: (id: string) => void; onMove?: (id: string, offset: { x: number; y: number }) => void; children?: ReactNode; className?: string }): JSX.Element',

  props: [
    { name: 'stickers', type: 'StickerItem[]', description: '`{ id, label, kind?, art?, x, y, size?, rotate? }`. x and y are 0 to 1 fractions of the field, `kind` is blob, star, cloud, heart or chart, and `art` is custom artwork.' },
    { name: 'seed', type: 'string', default: '"kinetic"', description: 'Seeds every float. Same seed, same motion.' },
    { name: 'draggable', type: 'boolean', default: 'true', description: 'Enables pointer drag and arrow-key nudging. When false, the stickers are decorative and aria-hidden.' },
    { name: 'onGrab', type: '(id) => void', description: 'Fires on pointer grab and key nudge.' },
    { name: 'onMove', type: '(id, offset) => void', description: 'Fires on drop (if moved) and on each key nudge, with the offset in px from the resting place.' },
    { name: 'children', type: 'ReactNode', description: 'Section content beneath the stickers.' },
    { name: 'className', type: 'string', description: 'Field classes. Give it a height.' },
  ],

  reducedMotion:
    'With prefers-reduced-motion, `useReducedMotion` skips the WAAPI float, so every sticker rests still at its tilt. The lift scale and shadow apply instantly (`motion-reduce:transition-none`). Dragging and key nudging still work, because they follow the user\'s own input.',

  cleanup:
    'Each float animation is cancelled in its effect cleanup, which runs on unmount, on a reduced-motion change or on a new seed. Pointer listeners are React props on the sticker, and pointer capture is released by the browser on pointerup. Lost capture ends the drag through the same handler, so no drag state outlives the gesture.',

  acceptance:
    'Five stickers (blob, star, chart, cloud, heart) bob out of sync around the "Make it yours" headline. Dragging the star moves it with the pointer, scales it up, puts it above the other stickers and keeps it inside the field, even when the pointer leaves it. The status line reads "Sleepy star moved +x, +y px". A focused sticker moves 10px per arrow key. Reset puts every sticker back. Under reduced motion nothing bobs. At 360px the stickers shrink and stay clear of the copy.',

  criticalRegion: 'critical',
};

export default meta;
