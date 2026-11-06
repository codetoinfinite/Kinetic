import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'drag-to-pin-progress',
  title: 'Drag Mapped To Pin Progress',
  category: 'scroll',
  tags: ['gsap', 'scrolltrigger', 'drag', 'pin', 'inertia'],
  blurb: 'Drag a pinned horizontal strip and it moves exactly one pixel per pixel, then throws and settles.',
  cost: 'dom',
  motif: 'grid',

  files: [
    {
      path: 'registry/ui/drag-to-pin-progress.tsx',
      target: 'components/motion/drag-to-pin-progress.tsx',
      type: 'registry:ui',
      role: 'component',
    },
    {
      path: 'registry/hooks/use-drag.ts',
      target: 'hooks/use-drag.ts',
      type: 'registry:hook',
      role: 'pointer drag with capture, dead zone and click gate',
    },
    {
      path: 'registry/hooks/use-raf.ts',
      target: 'hooks/use-raf.ts',
      type: 'registry:hook',
      role: 'shared rAF loop with clamped delta',
    },
    {
      path: 'registry/hooks/use-reduced-motion.ts',
      target: 'hooks/use-reduced-motion.ts',
      type: 'registry:hook',
      role: 'reduced-motion query, SSR-safe',
    },
    {
      path: 'registry/lib/damp.ts',
      target: 'lib/damp.ts',
      type: 'registry:lib',
      role: 'frame-rate-independent interpolation',
    },
  ],
  dependencies: ['gsap@^3.15.0'],

  summary:
    'A drag surface laid over a pinned horizontal section. Instead of a tuned drag multiplier it reads the pin\'s live geometry — the scroll span it occupies and the pixels the strip travels — and converts one into the other, so a pixel of thumb is a pixel of track regardless of panel widths or zoom. Release throws it, and the throw decays in wall-clock time rather than per frame.',

  mechanism: [
    'The conversion is `ratio = (trigger.end - trigger.start) / getDistance()`: scroll pixels the pin occupies, divided by horizontal pixels the strip travels. Both are read on every use because ScrollTrigger recomputes `end` on each refresh.',
    'During a drag the scroll position is set absolutely — `scrollTop = pressScrollTop - dx * ratio` — using the offset from the press point, never an accumulation of per-move deltas.',
    'Velocity is sampled as `(clientX - lastX) / dt` in seconds and clamped to ±4000 px/s, so a single stuttering event pair cannot record an implausible throw.',
    'On release the velocity decays with `damp(v, 0, friction, dt)` and the scroll advances by `-v * ratio * dt` each frame, so a 144 Hz display and a 60 Hz display travel the same distance in the same wall-clock time.',
    'The loop self-parks: below 20 px/s the velocity is zeroed and the callback returns immediately on subsequent frames, so an idle component costs one comparison per frame.',
    '`trigger.progress` is rounded to three decimals and written to a `--pin-progress` custom property on the surface only when it changes, so a progress rail can be pure CSS with no per-frame React render.',
  ],

  constants: [
    {
      name: 'friction',
      value: '0.002',
      why: 'Fraction of throw velocity remaining after one second. 0.002 lands a hard flick in roughly half a second. Near 0.1 the throw stops dead and the release feels like hitting a wall; above ~0.05 it coasts long enough that the user reaches for the scrollbar to stop it.',
    },
    {
      name: 'THROW_FLOOR',
      value: '20',
      why: 'Pixels per second below which the throw is cut and the loop parks. Exponential decay never reaches zero, so without a floor the component writes a sub-pixel scroll change forever and never idles.',
    },
    {
      name: 'MAX_THROW',
      value: '4000',
      why: 'Velocity clamp in px/s. Two pointer events 2 ms apart produce an enormous instantaneous velocity; unclamped, a single jittery sample launches the track across its entire range.',
    },
    {
      name: 'release timeout',
      value: '80 ms',
      why: 'Hold still for longer than this before letting go and the release is not a throw. Without it, pausing mid-drag and releasing fires the stale velocity from the last movement.',
    },
    {
      name: 'progress quantisation',
      value: '3 decimals',
      why: 'Below this the custom property is rewritten on nearly every frame with a change no one can see; above it the progress rail visibly steps.',
    },
  ],

  pitfalls: [
    'Inventing a drag multiplier. It is correct for exactly one panel count and one container width; change either and the strip either outruns the hand or lags behind it, and the number gets re-tuned by eye forever.',
    'Accumulating per-move deltas instead of using the offset from the press point. Every clamp at the ends of the range silently swallows part of a delta, so the track drifts away from the hand and never comes back.',
    'Caching `trigger.end - trigger.start`. ScrollTrigger recomputes it on every refresh — a font swap or a resize — and a cached span makes the drag mapping wrong for the rest of the session.',
    'Decaying the throw with a per-frame constant (`v *= 0.95`). The throw travels less than half as far on a 120 Hz display, so the component feels different on different hardware.',
    'Setting `touch-action: none` on the drag surface. It kills native vertical scrolling over the whole pinned section, so on a phone the page appears frozen; `pan-y` keeps vertical scroll and hands over only the horizontal gesture.',
    'Not swallowing the click after a drag. Releasing over a panel fires that panel\'s click handler, so throwing the track opens whatever happened to be under the finger.',
  ],

  notes: [
    'Designed to sit around `pinned-horizontal-track`, whose `onTrack` payload supplies both `trigger` and `getDistance`.',
    'Because the drag writes `scrollTop`, ScrollTrigger updates through its normal scroll listener — no manual `ScrollTrigger.update()` call, and no second source of truth for position.',
  ],

  apiSignature:
    'function DragToPinProgress(props: { children: ReactNode; scroller: RefObject<HTMLElement | null>; trigger: ScrollTrigger | null; getDistance?: () => number; friction?: number; className?: string }): JSX.Element',

  props: [
    { name: 'children', type: 'ReactNode', description: 'The pinned section and anything overlaying it.' },
    { name: 'scroller', type: 'RefObject<HTMLElement | null>', description: 'The scroll container whose `scrollTop` the drag writes.' },
    { name: 'trigger', type: 'ScrollTrigger | null', description: 'The pinned trigger being scrubbed. Dragging is disabled while null.' },
    { name: 'getDistance', type: '() => number', description: 'Live horizontal travel of the strip in px. Omit for a 1:1 scroll mapping.' },
    { name: 'friction', type: 'number', default: '0.002', description: 'Fraction of throw velocity left after one second.' },
    { name: 'className', type: 'string', description: 'Merged onto the drag surface.' },
  ],

  reducedMotion:
    'Dragging still works and still maps one pixel to one pixel — it is an input method, not decoration. The inertial throw is suppressed, so the strip stops the instant the pointer is released instead of coasting.',

  cleanup:
    '`useDrag` removes its pointerdown/move/up/cancel and capture-phase click listeners and releases any outstanding pointer capture; `useRaf` unsubscribes from the shared loop. The `--pin-progress` property dies with the element, and no timers or tweens are created that could outlive it.',

  acceptance:
    'Press and drag left: the strip follows the pointer exactly, and a panel edge under your thumb stays under your thumb. Flick and release: it coasts and settles smoothly. Drag to either end and it stops flush with no rubber band. The progress rail matches the strip at all times, including while throwing. With reduced motion on, release stops it dead.',

  criticalRegion: 'critical',
};

export default meta;
