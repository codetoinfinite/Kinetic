import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'fov-derived-row-step',
  title: 'FOV-Derived Row Spacing',
  category: 'layout',
  tags: ['perspective', 'projection', 'spacing', 'camera', 'no-dependencies'],
  blurb:
    'A row whose item spacing is solved from a field of view and a camera distance, so it spans the frame exactly at any size.',
  cost: 'dom',
  motif: 'grid',

  files: [
    { path: 'registry/ui/fov-derived-row-step.tsx', type: 'registry:ui', role: 'component' },
  ],
  dependencies: [],
  registryDependencies: ['use-in-view', 'use-raf', 'use-reduced-motion', 'use-resize-observer', 'damp'],

  summary:
    'A perspective row that never guesses its spacing. Given a vertical field of view and a camera distance, it computes the visible width on the row plane, divides it across the gaps between item centres, and converts to pixels once at the end. The outermost item centres land on the frame edges by construction, at any aspect ratio, with no breakpoint table and no tuned magic number. It is the flat pre-intro layout of a three.js drum, done in the DOM with the identical arithmetic.',

  mechanism: [
    'A pinhole camera at distance d from a plane sees `visibleHeight = 2 · d · tan(fov / 2)` on that plane, and `visibleWidth = visibleHeight · aspect`. Both quantities are in world units; nothing pixel-sized is involved yet.',
    'The step is `visibleWidth · spanRatio / (n − 1)` and item centres are `x_i = i · step − rowWidth / 2` where `rowWidth = (n − 1) · step`. The subtraction centres the row on the origin without a second measurement, because the outermost centres are at ±rowWidth/2 by definition.',
    'World units become pixels through a single scalar, `pxPerUnit = heightPx / visibleHeight`, applied at the last multiplication. Every intermediate value stays resolution-independent, which is why a resize needs no re-derivation of anything but this one number.',
    'CSS `perspective` is set to `cameraZ · pxPerUnit`, which reduces to `heightPx / (2 · tan(fov / 2))` — the cameraZ cancels. That cancellation is the proof that the world-unit scale and the CSS projection describe the same camera: if it did not cancel, the two coordinate systems would disagree and depth would foreshorten by the wrong amount.',
    'Items are placed with `translate3d(x · pxPerUnit, 0, z · pxPerUnit)` and the browser performs the perspective divide. An element at world z projects with scale `cameraZ / (cameraZ − z)`, which is exactly what a `PerspectiveCamera` does to a plane at the same depth.',
    'The optional bow pushes outer items away on a parabola, `z = −bow · t²` with `t = x / (visibleWidth / 2)`. Depth would shrink their projected x, so the unprojected x is pre-multiplied by `(cameraZ − z) / cameraZ` — the exact inverse of the divide — and the row still spans the frame with the bow at any strength.',
    'The four camera scalars are damped rather than assigned, so changing the field of view reads as a dolly. The layout is a pure function of them, so an interruption mid-spread cannot desynchronise anything: there is no accumulated position to corrupt.',
    'The frame loop snaps inside an epsilon, writes one final layout, and then returns immediately. Exponential damping never actually arrives, so without that gate the component would rewrite n transforms every frame forever for a row that has visibly stopped moving.',
  ],

  constants: [
    {
      name: 'visibleHeight',
      value: '2 · cameraZ · tan(fov / 2)',
      why: 'The exact height of the frustum cross-section at the row plane. Half the FOV subtends a right triangle of opposite `visibleHeight / 2` over adjacent `cameraZ`, so `tan(fov / 2) = (visibleHeight / 2) / cameraZ`. The factor of 2 and the half-angle are the two places this is most often written wrong; using `tan(fov)` overstates the span by roughly 3x at 70 degrees.',
    },
    {
      name: 'step',
      value: 'visibleWidth · spanRatio / (n − 1)',
      why: 'n − 1, not n. The step is the distance between adjacent item CENTRES, and n centres have n − 1 gaps between them. Dividing by n leaves the row one step short, so the last item never reaches the frame edge — the discrepancy is 1/n, which is invisible at twenty items and glaring at four.',
    },
    {
      name: 'x_i',
      value: 'i · step − rowWidth / 2',
      why: 'Centres the row on the origin arithmetically. With `rowWidth = (n − 1) · step`, item 0 sits at −rowWidth/2 and item n−1 at +rowWidth/2, so the row is symmetric for both odd and even counts without a special case and without measuring the assembled row afterwards.',
    },
    {
      name: 'perspective',
      value: 'heightPx / (2 · tan(fov / 2))',
      why: 'The CSS perspective distance in pixels that reproduces the same vertical FOV over a box of height H. Derived by asking at what distance the visible height equals H: `H = 2 · P · tan(fov / 2)`. It is `cameraZ · pxPerUnit` with the cameraZ cancelled, which is why the row can be moved nearer or further without touching this value.',
    },
    {
      name: 'depthScale',
      value: '(cameraZ − z) / cameraZ',
      why: 'Perspective divides a point\'s projected x by `(cameraZ − z) / cameraZ`, so pre-multiplying the unprojected x by the same factor leaves the projection exactly where the flat row put it. Omitting it makes any bow pull the outer items inward, which is the bug usually patched by nudging spanRatio above 1 until it happens to look right at one screen size.',
    },
    {
      name: 'fov',
      value: '70',
      why: 'Degrees, vertical. Wide enough that the bow foreshortens visibly rather than reading as a flat scale-down. Above ~90 the near items grow fast enough to clip the frame; below ~40 the perspective is so weak that the depth compensation has nothing to compensate for and the row may as well be 2D.',
    },
    {
      name: 'cameraZ',
      value: '5',
      why: 'World units. It sets nothing visible on its own — it only fixes the unit scale, since a larger distance widens the visible area by the same ratio it shrinks everything on screen. 5 keeps the bow and the item sizes in a range where single decimal digits are meaningful, matching the drum this arithmetic came from.',
    },
    {
      name: 'bow',
      value: '0.6',
      why: 'World units of depth at the frame edge, about 12% of cameraZ. Enough that the outer items read as receding; past ~0.3 · cameraZ they shrink far enough that the row looks like a fisheye rather than a row, and the compensated x starts pushing content beyond the overflow clip.',
    },
    {
      name: 'smoothing',
      value: '0.0015',
      why: 'Fraction of the remaining gap left after one second, so the row is ~99.9% of the way to a new field of view within that second. Frame-rate independent by construction, so a 120 Hz display and a throttled tab converge on the same curve rather than the same per-frame ratio.',
    },
    {
      name: 'EPSILON',
      value: '0.0005',
      why: 'Summed absolute gap across the four scalars below which the layout snaps and the loop stops writing. Small enough to be sub-pixel at any plausible pxPerUnit, large enough that exponential damping crosses it in under a second instead of asymptoting forever.',
    },
  ],

  pitfalls: [
    'Spacing a perspective row by `containerWidth / n`. It is wrong twice: it uses n instead of n − 1, and it ignores that the row plane is not the screen plane. It looks correct at one viewport because the error was absorbed into a hand-tuned padding, and it breaks on the first aspect-ratio change.',
    'Using `tan(fov)` instead of `tan(fov / 2)`. At 70 degrees that overstates the visible extent by about 3x, so the row spreads far past the frame. It survives review because the row still looks deliberate — just wildly too wide — and the fix gets applied as a 0.35 multiplier somewhere else.',
    'Applying degrees to `Math.tan` directly. `Math.tan(70)` is a perfectly finite number, so nothing throws and nothing warns; the layout is simply nonsense. `(fov * Math.PI) / 360` converts and halves in one step, which is also why that constant is 360 and not 180.',
    'Bowing items in z without compensating x. Depth shrinks projected x, so the outer items drift inward and the row silently stops spanning the frame. The formula is one multiplication and its absence is normally treated as a spacing problem rather than a projection one.',
    'Setting `perspective` from a fixed pixel value while deriving the spacing from an FOV. The two then describe different cameras: the arithmetic places items for one frustum and the browser projects them through another, so depth foreshortens by the wrong amount and no amount of spacing tuning fixes it.',
    'Deriving the layout from `window.innerWidth`. The component is correct on load and wrong the moment it sits in a resizable panel or a grid cell that reflows. Its own `clientWidth` and `clientHeight` are the only inputs that stay true, which is what `useResizeObserver` supplies.',
    'Letting the damping loop run forever. Exponential approach never reaches its target, so a settled row keeps writing n transforms per frame and the profiler shows a permanent baseline cost for a component that has not moved in a minute. Snap inside an epsilon and return.',
    'Recomputing on resize only inside the frame loop. A resize is not an animation; deferring it by a frame makes the row visibly lag a window drag by one tick, which reads as jank rather than as smoothing.',
    'Omitting `transform-style: preserve-3d`, or setting the perspective on an ancestor with its own transform. Either flattens the subtree and every `translateZ` collapses to no effect, leaving a row that is correctly spaced but stubbornly two-dimensional.',
  ],

  notes: [
    'The spacing arithmetic is identical to the flat pre-intro row of a three.js drum gallery, which is the point: the formula belongs to the projection, not to the renderer. Porting it means replacing one conversion line, and this component is the DOM half of the pair that `layout-lerp-scalar` interpolates away from.',
    'With `bow: 0` and `spanRatio: 1` the component has a hands-on correctness test: the outermost item centres sit exactly on the left and right edges of the box, at every viewport, with no tuning. If they do not, one of the formulas above has been mistyped.',
    '`spanRatio` is the only aesthetic knob here — everything else is determined. Values below 1 inset the row from the frame; above 1 it deliberately overflows the clip, which is useful when the outer items are meant to be cut off.',
  ],

  apiSignature:
    'function FovDerivedRow(props: { children: ReactNode; fov?: number; cameraZ?: number; spanRatio?: number; bow?: number; smoothing?: number; className?: string; cellClassName?: string }): JSX.Element',

  props: [
    { name: 'children', type: 'ReactNode', description: 'One positioned cell per child, laid out on the derived step.' },
    { name: 'fov', type: 'number', default: '70', description: 'Vertical field of view in degrees. Drives both the spacing and the CSS perspective.' },
    { name: 'cameraZ', type: 'number', default: '5', description: 'Camera distance to the row plane in world units. Fixes the unit scale.' },
    { name: 'spanRatio', type: 'number', default: '1', description: 'Fraction of the visible width the row spans. 1 puts the outer centres on the frame edges.' },
    { name: 'bow', type: 'number', default: '0.6', description: 'World units the outermost items recede. Their x is compensated so the span is preserved.' },
    { name: 'smoothing', type: 'number', default: '0.0015', description: 'Fraction of the gap remaining after one second while the row re-spreads.' },
    { name: 'className', type: 'string', description: 'Merged onto the stage element.' },
    { name: 'cellClassName', type: 'string', description: 'Merged onto every positioned cell. Size the items here.' },
  ],

  reducedMotion:
    'The reduced branch adopts the target scalars outright and lays the row out once, so the resolved geometry is on screen rather than a fast spread toward it. The frame loop is not subscribed at all, so no work is scheduled for a user who asked for none, and a later prop change still re-derives the layout immediately through the same code path. Because the layout is a pure function of the four scalars, the reduced render is pixel-identical to the settled animated one.',

  cleanup:
    '`useRaf` unsubscribes from the shared loop on unmount and cancels the frame when it is the last subscriber; `useResizeObserver` and `useInView` remove their targets from their shared observers. No listeners, timers or tweens are created directly. Inline transforms are written only to elements this component owns and rendered, so they are removed with them.',

  acceptance:
    'Set `bow` to 0 and the leftmost and rightmost item centres sit exactly on the edges of the box — resize the panel from narrow to wide and they stay there, with no jump and no breakpoint. Restore the bow and the outer items recede and shrink while their horizontal positions do not move. Raise the field of view and the row spreads on a smooth dolly rather than snapping. Item counts of 1 and 2 both render without a divide-by-zero or a NaN transform. With reduced motion on, the row is at its final geometry on first paint and the profiler shows no animation frames for it.',

  criticalRegion: 'critical',
};

export default meta;
