import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'cpu-mirror-picking',
  title: 'Raycaster-Free Hover Picking',
  category: 'primitive',
  tags: ['picking', 'hit-test', 'projection', 'css-3d', 'compositor'],
  blurb: 'Run the GPU\'s transform again on the CPU and hit-test the result. No raycaster, no rect reads.',
  cost: 'dom',
  motif: 'orbit',

  files: [
    {
      path: 'registry/ui/cpu-mirror-picking.tsx',
      type: 'registry:ui',
      role: 'component + project() mirror',
    },
    {
      path: 'registry/lib/damp.ts',
      type: 'registry:lib',
      role: 'clamp for the responsive radius',
    },
    {
      path: 'registry/hooks/use-raf.ts',
      type: 'registry:hook',
      role: 'shared frame loop the pick runs in',
    },
    {
      path: 'registry/hooks/use-reduced-motion.ts',
      type: 'registry:hook',
      role: 'stops the spin, keeps the picking',
    },
    {
      path: 'registry/hooks/use-resize-observer.ts',
      type: 'registry:hook',
      role: 'container size without a layout read in the loop',
    },
  ],
  dependencies: [],
  registryDependencies: [],

  summary:
    'A ring of plates spins entirely on the compositor, so the main thread has no idea where anything is. Instead of measuring the DOM, the component recomputes the same transform in JavaScript — rotate, tilt, perspective divide — and hit-tests the resulting screen points against the pointer. A crosshair marks the computed position so you can see the mirror agreeing with the pixels.',

  mechanism: [
    'The spin is one `Element.animate` keyframe pair with `iterations: Infinity`. It runs off the main thread, which means it keeps time even while JS is busy, and means the main thread must reconstruct the angle rather than remember it: `animation.currentTime` divided by the period gives the exact phase the compositor is drawing.',
    'The mirror is four lines that shadow the CSS one for one. Two nested `rotateY` (ring spin, plate angle) collapse into a single angle sum, so a plate centre sits at `(r·sin a, 0, r·cos a)`. The stage `rotateX` turns that depth into vertical offset. The perspective divide `d / (d − z)` reproduces what the browser does with the `perspective` property.',
    'Picking runs once per frame, not per `pointermove`. The geometry moves under a stationary cursor, so the correct answer changes on frames where no input arrived at all. An event-driven hit test would leave the hover state stuck on whatever plate happened to be there when the pointer last moved.',
    'Plates with `z <= 0` are rejected before the distance compare. They are on the far side of the ring, drawn behind the near plates, and picking them would let a click pass through the front of the object.',
    'The winner is the nearest projected point within a squared pick radius. Squared, because a comparison against `r²` gives the same ordering as a comparison against `r` without the square root.',
    'This is the only correct approach when a vertex shader, a CSS transform, or GPU skinning moves the geometry after it leaves JavaScript. The CPU-side geometry never changed, so `Raycaster` intersects the undeformed mesh and reports hits on a shape that is not on screen. Mirroring the vertex transform on the CPU is the fix — the same maths, applied to one point instead of every vertex.',
    'Everything inside the perspective root is `pointer-events: none`. There is nothing for the browser to hit-test; the container takes the pointer and the mirror decides what was under it.',
  ],

  constants: [
    {
      name: 'PERSPECTIVE',
      value: '900',
      why: 'Shared by the CSS `perspective` property and the JS divide. If the two ever disagree the crosshair drifts away from the plate it is meant to mark — which makes this the single most important value to keep in one place.',
    },
    {
      name: 'TILT',
      value: '16',
      why: 'Degrees of stage lean. Enough that the ring reads as a ring rather than a row; past ~30° the far plates hide behind the near ones and picking gets ambiguous even with the depth rejection.',
    },
    {
      name: 'PICK_RADIUS',
      value: '44',
      why: 'The pointer must land within 44 px of a projected centre. Matches the 44 px minimum touch target, and is wide enough to forgive the plate scaling down as it recedes.',
    },
    {
      name: 'PICK_RADIUS_SQ',
      value: 'PICK_RADIUS * PICK_RADIUS',
      why: 'Compared against squared distance so the loop never calls `Math.sqrt`. Fourteen square roots a frame is not a real cost, but the squared compare is free and is the habit worth having in a loop that might hold a thousand points.',
    },
    {
      name: 'RADIUS_RATIO',
      value: '0.36',
      why: 'Ring radius as a fraction of container width. Keeps the ring inside the box at its widest and leaves room for the pick-radius halo at the edges.',
    },
    {
      name: 'SPIN_PERIOD',
      value: '26',
      why: 'Seconds per revolution. Slow enough that a plate stays under the cursor long enough to click, fast enough that the per-frame re-pick is visibly necessary.',
    },
  ],

  pitfalls: [
    '`getBoundingClientRect()` per plate per pointermove. That is N forced layouts per event, and the rects are wrong anyway: a compositor-driven transform does not update layout boxes, so every rect reports the plate\'s unanimated position.',
    'Hit-testing only on `pointermove`. The ring rotates under a still cursor, so hover has to be re-evaluated every frame or it freezes on a stale plate.',
    'Letting the CSS and the mirror drift apart. A tweak to `perspective`, the tilt, or the transform order in one place and not the other produces a crosshair that is subtly, maddeningly offset. Keep both reading the same constants.',
    'Putting `overflow: hidden` on a `transform-style: preserve-3d` element. Overflow is a grouping property: it silently forces the subtree back to flat and the ring collapses into a line.',
    'Trusting `Raycaster` against a shader-deformed mesh. The vertex shader runs on the GPU; the `BufferGeometry` in memory is the rest pose. The ray intersects the rest pose and hits nothing you can see.',
    'Reading `animation.currentTime` as a number without narrowing. It is typed `CSSNumberish | null` — null before the animation starts, and permitted by spec to be a `CSSNumericValue`.',
    'Forgetting the far-half rejection. Without it the ring picks through itself, and a click near the centre selects a plate on the back.',
  ],

  notes: [
    'The depth fade rides along on the projection pass that was going to run anyway — one extra style write per plate, no second traversal and no extra maths.',
    'The same mirror generalises: for a three.js scene, project the object\'s world position with `vector.project(camera)` and compare in NDC; for a shader-deformed mesh, re-run the deformation for that one vertex on the CPU. The principle is identical — hit-test the transform, not the source geometry.',
  ],

  apiSignature:
    'function CpuMirrorPicking(props: { count?: number; period?: number; showMirror?: boolean; className?: string }): JSX.Element',

  props: [
    { name: 'count', type: 'number', default: '14', description: 'Plates around the ring.' },
    { name: 'period', type: 'number', default: '26', description: 'Seconds per revolution. The mirror divides the animation clock by this.' },
    { name: 'showMirror', type: 'boolean', default: 'true', description: 'Draw the computed crosshair and the pick-radius halo.' },
    { name: 'className', type: 'string', description: 'Merged onto the perspective root via `cn`.' },
  ],

  reducedMotion:
    'The spin animation is never created, so the ring holds still at phase zero. Picking is unaffected — the mirror simply reads a spin of 0 — which is the point: the technique is about where things are, not about them moving.',

  cleanup:
    'The animation is cancelled on unmount or period change, which releases the compositor animation and nulls the ref. The frame loop unsubscribes with the hook; the shared RAF parks itself once no subscriber is left. No listeners are attached outside React.',

  acceptance:
    'Hold the pointer still over a plate: the crosshair tracks the plate as it rotates away and hover releases at the pick radius, with no pointer events involved. Move to the middle of the ring and nothing on the far side lights up. Click and the plate under the crosshair — not the one under a stale rect — is the one that selects. With reduced motion the ring is static and picking still works.',

  criticalRegion: 'critical',
};

export default meta;
