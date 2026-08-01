import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'hover-list-image-trail',
  title: 'Hover List Image Trail',
  category: 'cursor',
  tags: ['gsap', 'quickto', 'hover', 'masked-reveal', 'canvas', 'cull'],
  blurb: 'Hovering a row stacks a plate into a column that follows the pointer; the oldest is culled past twenty.',
  cost: 'dom',
  motif: 'trail',

  files: [
    { path: 'registry/ui/hover-list-image-trail.tsx', type: 'registry:ui', role: 'component' },
  ],
  dependencies: ['gsap@^3.15.0'],
  registryDependencies: ['prng'],

  summary:
    'Each row entered adds a plate to a column beside the list, and the column follows the pointer vertically with `quickTo`. Every plate is a masked-reveal pair — a clipping wrapper sliding up while the canvas inside slides down — and the stack is bounded by culling the oldest node rather than by pooling.',

  mechanism: [
    'The spawn is two elements on one tween, moving in opposite directions. The wrapper animates `yPercent` from 100 to 0 while the canvas inside it animates from -100 to 0, on the same duration and the same ease. Because the wrapper clips, the two motions cancel and the plate is uncovered in place instead of flying in — the difference between a card arriving and a card being developed.',
    'The cancellation only holds if both tweens share duration and ease exactly. Any mismatch and the plate visibly slides inside its own frame, which reads as a parallax bug rather than a reveal.',
    'A node is created per hover and the stack is bounded by a cull, which is the deliberate opposite of `pooled-image-trail`. That is affordable here because hover entry is bounded by how fast a human can cross rows — roughly ten a second at worst — where a pointermove trail is bounded by the display refresh rate. The choice between pooling and culling follows from the event arrival rate, not from taste.',
    'Every spawn drops the oldest node once the stack holds twenty, so the DOM has a hard ceiling at all times rather than a ceiling per interaction. Tweens are killed before removal so GSAP cannot write to a node the DOM has already released.',
    'The column is centred on the pointer once with `gsap.set(stack, { yPercent: -50 })`, so the follow tween writes a raw `y` and never subtracts a half-height it would have to re-measure. A single `quickTo` at 0.5s with `power4` gives a long, heavy tail: `power4` spends most of its time near the destination, so the column snaps toward the pointer and then settles.',
    'Plates are painted once into offscreen canvases at mount and blitted with a single `drawImage` on spawn, so no gradient, sheen or text work lands on the frame where a tween starts — the one frame that cannot afford it. There are no image assets and nothing allocated through `createObjectURL`, so nothing needs revoking.',
    '`pointerover` bubbles, so one listener covers every row however React re-renders the list, but it also fires again for each descendant crossed inside the same row. The spawn is therefore gated on `relatedTarget` being outside the row, which turns "the event fired" into "the pointer actually changed rows".',
  ],

  constants: [
    {
      name: 'MAX_PLATES',
      value: '20',
      why: 'Hard ceiling on live plates. Enough that a quick scan down a list leaves a visible stack with depth; low enough that twenty composited layers of 168x116 stay trivial. Remove this and an idle user running the pointer up and down the list allocates for as long as the page is open.',
    },
    {
      name: 'REVEAL_DURATION',
      value: '0.6',
      why: 'Seconds for the masked pair. Long for a hover response, deliberately: the reveal is the content of the interaction, not feedback about it. Below ~0.35 the opposite-direction pair is too fast to read as a reveal and just looks like a fade.',
    },
    {
      name: "ease: 'expo.inOut'",
      value: 'expo.inOut',
      why: 'The most extreme standard curve, and the reason the reveal reads as mechanical rather than soft. Nearly all the travel happens in the middle third, so the plate is still at the start of its move, then has arrived, with very little visible in between.',
    },
    {
      name: 'followDuration',
      value: '0.5',
      why: 'Seconds of catch-up on the column. Longer than a cursor follow because the column is a heavy object carrying several plates; at 0.2 it is welded to the pointer and the stack stops feeling like it has mass.',
    },
    {
      name: "follow ease 'power4'",
      value: 'power4 (in-out)',
      why: 'A very late curve, so the column covers the gap early and creeps the last few pixels. quickTo remutates the end value on every event, so an in-out curve absorbs direction changes instead of restarting an outward ramp each time.',
    },
    {
      name: 'PLATE_SCALE',
      value: '2',
      why: 'Backing-store multiplier for the offscreen plates. Fixed rather than `devicePixelRatio` so the drawn output is byte-identical on every machine and a screenshot diff of this component is meaningful.',
    },
    {
      name: 'hue step',
      value: '137.508 degrees',
      why: 'The golden angle. Consecutive plates are always far apart in hue and the sequence never repeats a near-duplicate, so a fast scan down the list never stacks two plates that read as the same colour.',
    },
    {
      name: 'monotonic zIndex',
      value: 'order += 1, never reset',
      why: 'A later plate must always sit above an earlier one. Reusing or resetting the counter lets two live plates tie, and tied z-indices resolve by DOM order, which changes as the cull removes nodes — the observable symptom is a plate flickering behind one that arrived before it.',
    },
  ],

  pitfalls: [
    'No cull. The stack grows for the lifetime of the page; a user idly running the pointer across the list builds thousands of composited layers and the tab degrades with no single frame that looks like the culprit.',
    'Culling by index or on a timer instead of on spawn. The ceiling then applies per interaction rather than at all times, and a burst of hovers still spikes the node count.',
    'Removing a node without `killTweensOf`. GSAP keeps writing transforms to a detached element, which is wasted work per frame forever and, in dev, a confusing set of live tweens for nodes that no longer exist.',
    'Mismatched duration or ease between the wrapper and the canvas. The cancellation breaks and the plate slides inside its own frame — it looks like a parallax effect nobody asked for, and reads as a bug.',
    'Putting `overflow: hidden` on the column instead of on each wrapper. Every plate is then clipped by one shared box, so plates offset from the column are cut off and the reveal only works for the newest one.',
    'Spawning on `pointerover` without checking `relatedTarget`. The event refires for every descendant crossed inside the same row, so a single hover over a row containing a number, a label and a date spawns three plates.',
    'Using `pointerenter` per row instead. It does not bubble, so it needs a listener on every row plus re-subscription whenever React re-renders the list — the bookkeeping is the bug surface.',
    'Letting the column receive pointer events. Plates then intercept the very moves that drive the follow, and the column stalls whenever it catches up with the pointer.',
    '`Math.random()` for the plate colours. The server and client disagree, React reports a hydration mismatch, and every reload produces a different set of plates so no visual regression is ever detectable.',
  ],

  notes: [
    'Gated on `(pointer: fine)`. On touch nothing mounts: `pointerenter` fires on tap, so every tap would stack a plate directly under the finger and leave it there with no way to dismiss it, and the vertical follow has nothing to follow.',
    'Reduced motion disables the component entirely rather than shortening it. The plates and the column exist only as motion — there is no static state that still communicates anything — so the honest reduction is the plain list, which is fully functional on its own.',
    'The column is `aria-hidden`. The rows are real links and remain the accessible content; the plates are decoration with no text equivalent.',
    'Compare with `pooled-image-trail`, which solves the same visual problem for a pointermove-rate event by reusing a fixed ring of nodes. Neither approach is correct in general; the arrival rate of the event decides.',
  ],

  apiSignature:
    'function HoverListImageTrail(props: { rows: TrailRow[]; tileWidth?: number; tileHeight?: number; followDuration?: number; seed?: string; className?: string }): JSX.Element',

  props: [
    { name: 'rows', type: 'TrailRow[]', description: 'List rows. `{ id, label, meta? }`; one plate is painted per row at mount.' },
    { name: 'tileWidth', type: 'number', default: '168', description: 'Plate width in CSS px.' },
    { name: 'tileHeight', type: 'number', default: '116', description: 'Plate height in CSS px.' },
    { name: 'followDuration', type: 'number', default: '0.5', description: 'Seconds of catch-up on the column follow.' },
    { name: 'seed', type: 'string', default: "'hover-list-image-trail'", description: 'Seeds the plate palette. Same seed, same colours, every render.' },
    { name: 'className', type: 'string', description: 'Merged onto the root container via `cn`.' },
  ],

  reducedMotion:
    'No listeners attach and no plates are ever created. What remains is the list itself — real links, real hover colour — which loses nothing functional. There is no meaningful static version of a trail, so the component removes itself rather than pretending.',

  cleanup:
    'Removes all three container listeners, kills tweens on the column and on every live plate and its canvas, then removes each plate node — these were created imperatively, so React will not clean them up — and clears the column transform. The offscreen plate canvases are released by nulling the ref array; they are plain canvases, never object URLs, so there is nothing to revoke.',

  acceptance:
    'Move down the list and each row entered drops a plate into the column, uncovered from the bottom rather than sliding in — watch the numeral in the corner and it should not move relative to the plate edge. The column follows your vertical position with a long settle. Hover a row, move within it across the number and the date, and exactly one plate appears. Run the pointer up and down the list for ten seconds and inspect the column in DevTools: it holds at most twenty children. On touch, or with reduced motion, the list is plain and no plates appear.',

  criticalRegion: 'critical',
};

export default meta;
