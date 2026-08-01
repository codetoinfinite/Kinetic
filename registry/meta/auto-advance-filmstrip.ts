import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'auto-advance-filmstrip',
  title: 'Auto-Advance Filmstrip',
  category: 'layout',
  tags: ['carousel', 'css-transition', 'container-query', 'autoplay', 'filmstrip'],
  blurb:
    'A centred strip that steps one panel every few seconds, neighbours dimmed and shrunk, on one CSS transition.',
  cost: 'css',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/auto-advance-filmstrip.tsx',
      target: 'components/motion/auto-advance-filmstrip.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: [],
  registryDependencies: ['use-reduced-motion', 'use-visibility', 'wrap'],

  summary:
    'Panels are a fixed number of container-width units wide and the whole track is one `translateX`. The active panel sits centred, its neighbours are dimmed and scaled down, and the strip steps every few seconds until you touch it. All motion is a CSS transition on a value React already recomputes when the index changes — there is no tween and no animation loop.',

  mechanism: [
    'Every panel is `W` container-width units wide (`width: 46cqw`) and the track is translated to `(100 - W) / 2 - W * index` of the same unit. The first term centres one panel — `(100 - 46) / 2 = 27` — and the second steps exactly one panel per index. It is one expression with no measurement and no resize handler, because both terms are already relative to the container.',
    '`cqw` rather than `vw`: the strip is sized against its own container, so it stays centred inside a card, a modal or a split layout instead of only when it happens to be full-bleed. The root sets `container-type: inline-size` to establish that container.',
    'The transition is `transform 500ms cubic-bezier(0.22, 1, 0.36, 1)` on the track. For a component where React already re-renders on index change, a CSS transition is fewer moving parts than a tween and it interpolates on the compositor.',
    'Inactive panels get `opacity: 0.35` **and** `scale(0.8)`, transitioning on the same curve and duration as the track so the three properties land together.',
    'Auto-advance is `setTimeout` re-armed on every index change, not `setInterval`. Manual navigation therefore restarts the dwell rather than inheriting whatever was left of the current tick.',
    'The timer is gated on four conditions — `autoPlay`, not reduced-motion, `document.visibilityState === "visible"`, and not currently hovered or focused within — so it never advances behind the user\'s back or in a background tab.',
  ],

  constants: [
    {
      name: 'panelWidth',
      value: '46',
      why: 'Panel width in `cqw`. Under 50 means two neighbours are partly visible, which is what makes it a filmstrip rather than a slideshow. At 46 the centred panel leaves 27 units of peek on each side — enough to read the neighbour as a real panel, not a sliver.',
    },
    {
      name: 'interval',
      value: '3000',
      why: 'Milliseconds per panel. Below ~2500 a caption cannot be read before it leaves; above ~5000 the strip looks broken rather than paced on a page where nothing else is moving.',
    },
    {
      name: 'duration',
      value: '500',
      why: 'Slide transition. Roughly a sixth of the dwell, which keeps the strip reading as a series of held frames with a transition between them rather than as continuous motion.',
    },
    {
      name: 'EASE',
      value: 'cubic-bezier(0.22, 1, 0.36, 1)',
      why: 'Expo-out. It covers about 80% of the distance in the first 30% of the duration, so the strip appears to arrive early and settle — the same reason it is the default curve for interface movement that should feel decided rather than mechanical.',
    },
    {
      name: 'inactiveOpacity / inactiveScale',
      value: '0.35 / 0.8',
      why: 'Both, together. 0.35 alone reads as a loading state; 0.8 alone reads as a layout bug. Applied together they read as depth, which is the only interpretation a viewer will land on.',
    },
  ],

  pitfalls: [
    'Using a percentage in the track\'s `translateX`. Percentages on `transform` resolve against the *element\'s own* width, and the track is as wide as all its panels — so `translateX(-46%)` moves it by 46% of the whole strip, not of one panel. The arithmetic only works in a unit that refers to the container: `cqw` here, `vw` if the strip is genuinely full-bleed.',
    'Using `setInterval` for the auto-advance. Tap "next" a hundred milliseconds before the tick fires and the strip advances twice; the second jump has no cause the user can see. A `setTimeout` keyed on the index gives every panel a full dwell.',
    'Leaving the timer running while the tab is hidden. The user comes back to a strip that has silently walked eleven panels forward, and every intervening transition ran on a throttled timer.',
    'Not pausing on hover or focus. A pointer resting on a panel and a keyboard user tabbing into a control both mean "I am reading this"; advancing underneath either one is the single most common complaint about auto-advancing carousels.',
    'Only setting `containerType` on an ancestor that has no definite inline size. `cqw` then resolves against the viewport-sized fallback and the arithmetic silently reverts to the `vw` behaviour it was meant to replace.',
    'Fading inactive panels to `opacity: 0`. They are still in the layout and still hit-testable, so a click intended for the active panel can land on an invisible neighbour that happens to be under the cursor.',
  ],

  notes: [
    'Cheapest of the three carousels here and the right default when the set is short and each panel needs a moment on screen. Unlike `wrapping-drum-carousel` it does not wrap continuously — it jumps from the last index back to the first, and that jump is a full-width slide, which is visible. Keep the set small enough that the loop point is rare.',
    'Every panel stays mounted and in the layout at all times. For twenty panels that is twenty subtrees painting; virtualise or switch technique past roughly a dozen.',
  ],

  apiSignature:
    "function AutoAdvanceFilmstrip(props: { children: ReactNode; panelWidth?: number; interval?: number; duration?: number; autoPlay?: boolean; inactiveOpacity?: number; inactiveScale?: number; className?: string; panelClassName?: string; 'aria-label'?: string }): JSX.Element",

  props: [
    { name: 'children', type: 'ReactNode', description: 'One panel per child.' },
    { name: 'panelWidth', type: 'number', default: '46', description: 'Panel width in container-width units (`cqw`).' },
    { name: 'interval', type: 'number', default: '3000', description: 'Milliseconds a panel is held before the strip advances.' },
    { name: 'duration', type: 'number', default: '500', description: 'Slide transition duration in milliseconds.' },
    { name: 'autoPlay', type: 'boolean', default: 'true', description: 'Whether the strip advances on its own.' },
    { name: 'inactiveOpacity', type: 'number', default: '0.35', description: 'Opacity applied to every panel that is not active.' },
    { name: 'inactiveScale', type: 'number', default: '0.8', description: 'Scale applied to every panel that is not active.' },
    { name: 'className', type: 'string', description: 'Merged onto the root, which is also the query container.' },
    { name: 'panelClassName', type: 'string', description: 'Merged onto each panel cell.' },
    { name: 'aria-label', type: 'string', default: "'Filmstrip'", description: 'Label for the carousel group.' },
  ],

  reducedMotion:
    'Auto-advance never starts, so nothing moves unless the user presses a control. When they do, `transition` is set to `none` on both the track and the panels, so the strip cuts to the new panel in one frame instead of sliding. The dot pager and arrows behave identically; only the interpolation is gone.',

  cleanup:
    'The pending `setTimeout` is cleared by the effect\'s own teardown, which also runs on every index change and whenever the strip pauses. `useVisibility` and `useReducedMotion` unsubscribe their listeners. There is nothing else to release: all motion is CSS on nodes React owns.',

  acceptance:
    'The strip steps one panel roughly every three seconds with the neighbours visible, dimmed and smaller on both sides. Hovering anywhere over it stops the advance and moving away resumes it with a full dwell. Switch tabs for ten seconds and come back: it is on the panel it was on, not ten further along. Resize the container from 320 px to full width and the active panel stays exactly centred.',

  criticalRegion: 'critical',
};

export default meta;
