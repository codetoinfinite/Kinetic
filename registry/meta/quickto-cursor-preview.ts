import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'quickto-cursor-preview',
  title: 'quickTo Cursor Preview',
  category: 'cursor',
  tags: ['gsap', 'quickto', 'pointer', 'hover', 'preview', 'canvas'],
  blurb: 'A preview panel drifts a full second behind the pointer, driven by two reused quickTo tweens.',
  cost: 'dom',
  motif: 'trail',

  files: [
    {
      path: 'registry/ui/quickto-cursor-preview.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['gsap@^3.15.0'],
  registryDependencies: ['use-resize-observer'],

  summary:
    'Hovering a row fades in a preview panel that then trails the pointer with a full second of catch-up, so it reads as a heavy object being dragged rather than a tooltip pinned to the cursor. Position comes from exactly two `gsap.quickTo` setters created once at mount; the hovered row is the only thing that ever enters React state.',

  mechanism: [
    '`gsap.quickTo(box, "x", { duration, ease })` returns a setter backed by ONE tween whose end value is mutated in place. A `pointermove` handler firing 60-120 times a second therefore allocates nothing after the first frame, where the `gsap.to()` equivalent allocates and garbage-collects a tween object per event and leaves each new tween fighting the last for the same property.',
    'Hovered row is React state because it changes a handful of times a second and drives real DOM structure (text colour, stroke, offset). Panel position is never state: it changes on every pointer event, and a re-render per move would cost more than the animation it is driving.',
    '`duration: 1` is roughly five times a normal cursor follow, and that is the entire design. Under `power3` the panel covers most of the gap early and then creeps, so it always reads as heading for the pointer without ever arriving — which is what makes it feel like mass rather than lag.',
    'The first move after entry calls `xTo(x, x)` — quickTo\'s second argument is the tween\'s START value, so the panel is teleported rather than eased. Without it, re-entering the list sends the panel sailing diagonally across the whole component over a full second before it becomes useful.',
    'Position is centred with `xPercent: -50, yPercent: -50` set once at mount, so `x`/`y` are raw pointer coordinates and no offset arithmetic appears in the hot handler.',
    'Every preview is a gradient plate painted into an offscreen canvas at mount — the registry ships no image assets. Switching rows is one `drawImage` blit, so the gradient, band and text work never lands on the frame where the fade-in starts.',
  ],

  constants: [
    {
      name: 'duration',
      value: '1',
      why: 'Seconds of catch-up, and the whole character of the component. At 0.2 it is an ordinary tooltip that happens to be smooth; at 1 it is an object with weight. Past ~1.6 the panel is still crossing the list when the pointer has already left it, and the effect reads as broken rather than heavy.',
    },
    {
      name: "ease: 'power3'",
      value: 'power3 (in-out)',
      why: 'In-out, not `.out`. Because the end value is remutated on every event, the tween is permanently restarting from its own midpoint; the symmetric curve means direction changes are absorbed smoothly instead of snapping to a new outward ramp each time.',
    },
    {
      name: 'FADE_DURATION',
      value: '0.35',
      why: 'Fade and scale on row change. Long enough to register as a cross-fade rather than a cut, short enough that dragging down a list of eight rows does not leave the panel permanently mid-transition.',
    },
    {
      name: 'scale 0.94 -> 1',
      value: '0.94',
      why: 'A 6% growth on appear. Paired with opacity it reads as arriving from behind the page; without it the fade alone looks like a stuck render.',
    },
    {
      name: 'DOCK_INSET',
      value: '20',
      why: 'Pixels of margin when the panel docks to the right edge on touch or reduced motion. Clamped against `panelWidth / 2` so a panel wider than its container still lands fully inside rather than half off-screen.',
    },
    {
      name: 'PLATE_SCALE',
      value: '2',
      why: 'Backing-store multiplier for the plate canvases. Fixed rather than `devicePixelRatio` so the drawn output is identical on every machine and a visual regression is actually visible in a screenshot diff.',
    },
  ],

  pitfalls: [
    'Calling `gsap.to()` in the `pointermove` handler. It allocates a tween per event and every new one competes with the still-running previous tween for `x`, so the panel judders under fast movement — exactly when the follow is most visible.',
    'Putting the panel position in React state. Every pointer event becomes a render of the whole list; the follow gets slower the more rows you add, which is a scaling failure with no obvious cause at the call site.',
    'Omitting the start value on the first call after entry. The panel eases in from wherever it was abandoned, so re-entering the list gives a full second of a panel flying across the layout before it means anything.',
    'Centring with a negative margin or `left: -130px` as well as `xPercent: -50`. The two offsets compose and the panel sits half a width away from the pointer — a bug that looks like a follow-lag problem and is not one.',
    'Running `clearProps: "all"` in the cleanup of an effect that only owns `x` and `y`. Any dependency change then wipes the `xPercent`/`yPercent` centring and the `autoAlpha` state owned by a different effect, and the panel jumps or flashes to full opacity mid-hover. Each effect must tear down only what it set.',
    'Using `overwrite: true` on the fade tween. It kills the quickTo tweens that own `x` and `y`, and the panel freezes in place the moment you move between rows. `overwrite: "auto"` only claims the properties the fade actually animates.',
    'Transitioning `all` on the row text. The panel and rows share a stacking context, and a blanket transition catches `transform`, which then fights whatever else is animating it.',
  ],

  notes: [
    'Gated on `(pointer: fine)`. On touch there is no hover and a `pointermove` only exists mid-drag, so the panel would live directly under the finger dragging it. The touch path docks the panel to the right edge and cross-fades on row change instead, which keeps the preview useful without pretending there is a cursor.',
    'Reduced motion takes the same docked path — a second of drift is precisely what that user opted out of — and the cross-fade duration drops to 0.',
    'Both branches read the same `docked()` predicate, so the follow effect and the dock effect can never disagree about which mode the component is in.',
    'The panel is `aria-hidden` and `pointer-events-none`: it is decoration for the row title, which remains the accessible content.',
  ],

  apiSignature:
    'function QuickToCursorPreview(props: { items: PreviewItem[]; duration?: number; panelWidth?: number; panelHeight?: number; className?: string }): JSX.Element',

  props: [
    { name: 'items', type: 'PreviewItem[]', description: 'Rows to render. `{ id, title, meta? }`; one plate is painted per item.' },
    { name: 'duration', type: 'number', default: '1', description: 'Seconds of catch-up on the follow. The defining value of the effect.' },
    { name: 'panelWidth', type: 'number', default: '260', description: 'Preview panel width in CSS px.' },
    { name: 'panelHeight', type: 'number', default: '180', description: 'Preview panel height in CSS px.' },
    { name: 'className', type: 'string', description: 'Merged onto the root container via `cn`.' },
  ],

  reducedMotion:
    'No `pointermove` listener attaches. The panel docks to the right edge, vertically centred, and hovering a row swaps its plate with a zero-duration cross-fade. The preview still works; it simply never moves.',

  cleanup:
    'The follow effect removes both listeners and calls `gsap.killTweensOf(box)`, which disposes the two quickTo tweens. The mount effect separately kills tweens and runs `clearProps: "all"`, restoring the centring transform and opacity it set. The offscreen plate canvases are dropped by nulling the ref array; they are plain canvases, never object URLs, so there is nothing to revoke.',

  acceptance:
    'Hover a row and the panel fades up over ~350ms while scaling from 0.94. Move the pointer and it follows with about a second of lag, always heading toward the pointer and never quite catching it. Move fast between rows and the image cross-fades while the follow keeps running underneath — the panel never freezes. Leave and re-enter the list and the panel appears at the pointer, not sailing in from the far side. On touch or with reduced motion the panel sits docked at the right edge and only its contents change.',

  criticalRegion: 'critical',
};

export default meta;
