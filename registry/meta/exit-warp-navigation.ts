import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'exit-warp-navigation',
  title: 'Exit Warp Before Navigate',
  category: 'transition',
  tags: ['three', 'gsap', 'page-exit', 'ring', 'router'],
  blurb: 'A ring of cards tears itself apart and rushes past the camera, and only then does the route change.',
  cost: 'webgl',
  motif: 'rings',

  files: [
    {
      path: 'registry/ui/exit-warp-navigation.tsx',
      target: 'components/motion/exit-warp-navigation.tsx',
      type: 'registry:ui',
      role: 'component',
    },
    {
      path: 'registry/lib/webgl.ts',
      target: 'lib/webgl.ts',
      type: 'registry:lib',
      role: 'context disposal, DPR cap, capability check',
    },
    {
      path: 'registry/lib/wrap.ts',
      target: 'lib/wrap.ts',
      type: 'registry:lib',
      role: 'shortest signed ring offset',
    },
    {
      path: 'registry/hooks/use-reduced-motion.ts',
      target: 'hooks/use-reduced-motion.ts',
      type: 'registry:hook',
      role: 'motion preference',
    },
  ],
  dependencies: ['three@^0.185.1', 'gsap@^3.15.0'],
  registryDependencies: [],

  summary:
    'Choosing a destination does not navigate. It plays an exit: the DOM chrome lifts and fades, the ring of cards is shoved thirty slots forward while its vertical spacing explodes and its radius collapses, the planes dissolve in index order, and only after one settle frame does the router move. The ease is expo.in, so almost nothing happens for the first half-second and then everything happens at once.',

  mechanism: [
    'Four scalars describe the ring — `position`, `spacing`, `hSpacing`, `radius` — and one `layout()` reads them: `angle = wrappedOffset(i, position, count) * (2*PI/count) * hSpacing`, then `mesh.position.set(sin(angle) * radius, offset * spacing * 0.12, cos(angle) * radius - radius)` and `mesh.rotation.y = angle`. Idle and exit both drive the same function, so no second code path can disagree about where a card belongs.',
    'Idle rotation is `position += dt * 0.16` inside `setAnimationLoop`, with `dt` in seconds clamped to 50 ms — a per-frame constant would spin twice as fast on a 120 Hz display.',
    'On select, a timeline fades the chrome (`opacity: 0, y: -20, 0.5s, power2.out, stagger 0.05`) and a `tl.call` pinned at an absolute 0.4s starts the warp, so the ring begins moving 0.1s before the text has finished leaving.',
    'The warp is one `gsap.to` on the scalar object: `position + 30`, `spacing 0.8 -> 10`, `hSpacing 1 -> 3`, `radius 2.3 -> 0.6`, 1.4s, `expo.in`, with `onUpdate` calling `layout()`. Radius shrinking while spacing explodes is what makes the planes leave in different directions instead of receding as a group.',
    'Each material tweens `opacity: 0` over 1s with `delay: 0.03 * i`, so the ring dissolves in index order rather than as a single fade.',
    'The tween\'s `onComplete` sets a 50 ms timeout, and only that timeout calls `onNavigate`. Textures are canvas-drawn gradients with the item label baked in, so the component ships without a single image.',
  ],

  constants: [
    {
      name: 'duration',
      value: '1.4',
      why: 'Seconds of warp. With expo.in the perceived length is roughly half the real one; below ~1.1s the accelerating half is too brief to register and it reads as a cut, above ~1.8s the destination feels withheld.',
    },
    {
      name: 'shove',
      value: '30',
      why: 'Ring slots travelled during the exit. For a six-item ring that is five full revolutions — enough that individual cards stop being trackable and the ring reads as a blur rather than as a carousel scrubbing.',
    },
    {
      name: 'WARP_CUE',
      value: '0.4',
      why: 'Absolute seconds at which the scene warp starts, against a 0.5s chrome fade. The 0.1s overlap fuses two moves into one gesture; at 0.5 they read as sequential steps, and at 0 the ring pulls the eye off the text before it has gone.',
    },
    {
      name: 'FADE_STAGGER',
      value: '0.03',
      why: 'Seconds between per-card dissolves. 30 ms x 6 cards is 180 ms of sweep — visible as a direction, short enough that the last card still fades inside the warp.',
    },
    {
      name: 'SETTLE_MS',
      value: '50',
      why: 'GSAP fires onComplete on the same frame the tween ends, before that frame is presented. Navigating there shows one frame of the un-warped ring. One extra tick guarantees the final layout has been painted.',
    },
    {
      name: 'WARP_SPACING / WARP_RADIUS',
      value: '10 / 0.6',
      why: 'Vertical gap goes 0.8 -> 10 while radius goes 2.3 -> 0.6. Spreading without shrinking looks like a zoom out; shrinking without spreading looks like a dolly. Both together are the only combination that reads as the ring tearing apart around the camera.',
    },
    {
      name: 'IDLE_SPEED',
      value: '0.16',
      why: 'Ring slots per second at rest. One card takes about six seconds to reach the front — slow enough to read as ambience, fast enough that the ring is never mistaken for a static image.',
    },
  ],

  pitfalls: [
    'Calling `router.push` in the click handler and animating afterwards. React unmounts the canvas as the route resolves, so the warp plays for two frames and then disappears; the navigation must be the last step, inside the tween\'s completion.',
    'No re-entrancy guard. A double click starts two warps tweening the same four scalars from different origins — the ring jitters and the second navigation fires into an already-unmounting tree.',
    'Navigating in `onComplete` instead of one tick later. The final frame has not been presented, so a single frame of the intact ring flashes just before the route changes.',
    'Calling `renderer.dispose()` and stopping there. The GL context stays alive; Chromium kills the oldest context once about sixteen exist, so an unrelated canvas elsewhere on the page goes black. `disposeRenderer` also calls `forceContextLoss()` and zeroes the backing store.',
    'Leaving the exit tweens running through unmount. They keep writing to disposed materials and to a scalar object nobody reads; the material writes throw once the context is gone. Cleanup kills the tweens on the state object and every material before disposing.',
    'Deciding whether WebGL exists during render. `hasWebGL()` needs `document`, so it returns false on the server and true on the client, and the two renders disagree — the check runs in an effect and flips to the static fallback afterwards.',
    'Advancing the idle rotation by a per-frame constant. The ring idles at double speed on a 120 Hz laptop, which is exactly the sort of bug that never reproduces on the developer\'s machine.',
  ],

  notes: [
    'App Router wiring: `onNavigate={(id) => router.push(`/work/${id}`)}`. Call `router.prefetch` on hover (see `hover-prefetch-wipe`) so the 1.4s warp is spent downloading the destination rather than waiting after it.',
    'Reduced motion and no-WebGL share one path: a static grid of the same cards, a 0.3s fade of the chrome, then navigate. No context is ever created in that branch.',
    'The ring is index-driven, not raycast-driven. Picking is done with real DOM buttons over the canvas, which keeps the nav keyboard-reachable and screen-reader-legible for free.',
  ],

  apiSignature:
    'function ExitWarpNavigation(props: { items: { id: string; label: string }[]; onNavigate: (id: string) => void; children?: ReactNode; duration?: number; shove?: number; className?: string }): JSX.Element',

  props: [
    { name: 'items', type: '{ id: string; label: string }[]', description: 'Destinations. One card and one nav button each; the label is drawn into the card texture.' },
    { name: 'onNavigate', type: '(id: string) => void', description: 'Called after the warp and its settle frame. Do the router push here.' },
    { name: 'children', type: 'ReactNode', description: 'Chrome over the canvas. Descendants marked `data-warp-chrome` fade and lift first.' },
    { name: 'duration', type: 'number', default: '1.4', description: 'Warp length in seconds.' },
    { name: 'shove', type: 'number', default: '30', description: 'Ring slots the drum travels during the warp.' },
    { name: 'className', type: 'string', description: 'Merged onto the positioned wrapper.' },
  ],

  reducedMotion:
    'No WebGL context is created. The same cards render as a static CSS-gradient grid, and choosing one fades the chrome over 0.15s before navigating — the transition still covers the swap, it just does not move.',

  cleanup:
    'Disconnects the ResizeObserver, kills the tweens on the scalar object and on every material, clears the pending navigation timeout, calls `disposeRenderer` (which stops the animation loop, disposes, forces context loss and zeroes the canvas), then disposes every material, texture and the shared geometry, and removes the canvas element.',

  acceptance:
    'The ring idles at the same speed on a 60 Hz and a 120 Hz display. Choosing a destination fades the caption, then the ring barely moves for about half a second before tearing outward and past the camera; the new route appears only once the frame is empty, with no flash of the intact ring. Unmount mid-warp and the console stays clean.',

  criticalRegion: 'critical',
};

export default meta;
