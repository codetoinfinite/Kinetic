import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'velocity-afterimage-pass',
  title: 'Velocity Afterimage Pass',
  category: 'webgl',
  tags: ['three', 'shader', 'render-target', 'ping-pong', 'trail', 'velocity'],
  blurb: 'Marks that smear into a tail when the pointer moves fast and stay crisp when it slows, from two targets swapping roles.',
  cost: 'webgl',
  motif: 'trail',

  files: [
    {
      path: 'registry/ui/velocity-afterimage-pass.tsx',
      type: 'registry:ui',
      role: 'component',
    },
    {
      path: 'registry/shaders/velocity-afterimage-pass.ts',
      type: 'registry:lib',
      role: 'vertex + fragment GLSL for the blend pass',
    },
  ],
  dependencies: ['three@^0.185.1'],

  summary:
    'A motion trail that stores no history. Two render targets take turns: one holds everything that has happened, the other receives that accumulation multiplied by a decay factor with the current frame composited over it, and next frame they swap roles. Because the trail is a texture rather than a list of past positions, its length is one float — so it can be driven straight from how fast the marks are moving and change continuously without allocating anything. Fast movement smears; slow movement is perfectly crisp.',

  mechanism: [
    'Three half-float targets are allocated at container size x DPR x `resolutionScale`: `frame` receives only this frame\'s marks, and `ping`/`pong` alternate as the accumulation. Reading and writing one target in a single pass is undefined in WebGL, which is the only reason there are two.',
    'Pass 1 clears `frame` and renders the content scene into it — one lead mark plus `satellites` orbiters, all sharing a single 1x1 `PlaneGeometry` and one 256px canvas-drawn radial falloff texture, so the whole cluster is a handful of draw calls and no per-frame allocation.',
    'The lead follows the pointer through `damp(lead.x, pointer.ndcX * aspect, 0.0004, dt)`, and the satellites sit at `lead + (cos, sin)(i/n * 2PI + elapsed * 1.5) * 0.3` around it. The x target is multiplied by aspect because the orthographic frustum is widened to `[-aspect, aspect]` while staying `[-1, 1]` tall.',
    'Trail length is measured from the *mark*, not the cursor: `speed = hypot(lead - previousLead) / dt`, normalised by `reference`, clamped to 0..1 and scaled by `maxDamp`. That target is then itself run through `damp(..., 0.003, dt)`, so the tail extends and retracts smoothly instead of popping to full length on the first fast frame.',
    'Pass 2 renders a fullscreen quad into whichever target is not the current history, with `uCurrent = frame.texture`, `uHistory = ping.texture` and `uDamp` set to the smoothed speed. The fragment is `float alive = step(uCutoff, history.a); history *= uDamp * alive; gl_FragColor = max(current, history);` — `max` keeps the head at full strength and lets the tail sit underneath it.',
    'Pass 3 blits the accumulation to the canvas through a stock `MeshBasicMaterial`, so three performs output colour conversion exactly once and the blend pass stays in linear space. Then `ping` and `pong` are swapped: what was just written becomes next frame\'s history.',
  ],

  constants: [
    {
      name: 'maxDamp',
      value: '0.9',
      why: 'Per-frame decay factor at full speed. Must stay below 1: at exactly 1 nothing ever decays and the trail becomes a permanent painted streak across the panel. Above ~0.95 the tail outlives the gesture by seconds and reads as a smudged framebuffer rather than motion.',
    },
    {
      name: 'cutoff',
      value: '0.06',
      why: 'Alpha below which `step()` zeroes a pixel outright. Geometric decay never actually reaches zero — at 0.9 a pixel still holds 0.5% of its value a hundred frames later, and on a half-float target that faint ghost of the very first frame is baked in permanently. Below ~0.02 the ghost is visible on a dark surface; above ~0.15 the tail ends in a hard edge instead of fading.',
    },
    {
      name: 'reference',
      value: '1.6',
      why: 'World units per second that count as full speed. The frustum is 2 units tall, so this is roughly 0.8 container heights per second — a brisk but ordinary hand movement. Set it much higher and only a violent flick produces any trail at all.',
    },
    {
      name: 'LEAD_SMOOTHING',
      value: '0.0004',
      why: 'Fraction of the gap to the pointer still remaining after one second. Tight enough that the lead feels attached to the cursor, loose enough that the mark keeps travelling for a frame or two after the hand stops — which is what gives the tail something to decay from.',
    },
    {
      name: 'DAMP_SMOOTHING',
      value: '0.003',
      why: 'Smoothing on the decay factor itself, deliberately looser than the position smoothing. If the trail length tracked speed instantly, a single dropped frame would spike `dt`, spike the measured speed, and flash a full-length tail out of a stationary mark.',
    },
    {
      name: 'ORBIT_RADIUS / ORBIT_SPEED',
      value: '0.3 / 1.5',
      why: 'Satellites orbit 0.3 world units out at 1.5 rad/s. The radius has to exceed the lead\'s own 0.34 half-size or the satellites never clear the lead\'s falloff and the cluster reads as one blob; the speed is what produces a curved tail rather than three parallel straight ones.',
    },
    {
      name: 'SPRITE_SIZE',
      value: '256',
      why: 'One canvas-drawn radial gradient shared by every mark. 256px is above the on-screen size of the largest mark at DPR 2, so it never magnifies into visible steps, and it is small enough that the upload is a single sub-millisecond cost at build time.',
    },
    {
      name: 'target type / filter',
      value: 'HalfFloatType, NearestFilter',
      why: 'The accumulation is multiplied by a fraction every frame. On the default 8-bit unsigned byte the result quantises into stair-stepped bands down the length of the trail. Nearest rather than linear because the blend samples texel-for-texel from a target of identical size — bilinear filtering would smear the trail sideways a little more on each of the hundreds of passes a pixel survives.',
    },
  ],

  pitfalls: [
    'Blending a target into itself. It is the obvious shape — one history target, read it and write it — and it is undefined behaviour in WebGL: depending on driver you get tearing, a black frame, or a result that looks right on your machine and fails on someone else\'s.',
    'Leaving the targets at the default `UnsignedByteType`. Repeated multiplication by 0.9 on 8 bits per channel quantises the tail into visible stair-stepped bands, and the banding is worst on exactly the slow gradients the effect is made of.',
    'Using `LinearFilter` on the ping-pong pair. Each pass smears the accumulation by a fraction of a texel, and a pixel survives hundreds of passes, so the trail visibly fattens and drifts diagonally away from the path the pointer actually took.',
    'Decaying with no floor. `history *= 0.9` is a geometric series that never reaches zero, so a permanent ghost of the first frames stays welded into the buffer and the panel is never clean again. The `step(uCutoff, history.a)` factor cuts it instead.',
    'Compositing with `mix()` or additive blending instead of `max()`. `mix` dims the current frame in proportion to the trail behind it, so the head goes dark exactly when it is moving fastest; additive blows out to white wherever the path crosses itself.',
    'Applying output colour conversion in the blend pass. Its result goes into another render target that stays in linear working space, so converting there and again on the final blit brightens the accumulation on every pass until the whole panel is white within a second.',
    'Calling `setSize` on the targets after a resize and rendering straight away. `setSize` reallocates the texture, so the history now points at undefined memory, and the first composited frame is garbage that then decays for a full second.',
    'Deriving the trail from raw pointer speed. The mark is what is being smeared, and it lags the cursor — so a cursor-driven trail starts before the mark moves and keeps growing after it has stopped.',
    'Smoothing the decay factor with a per-frame constant (`d += (target - d) * 0.1`). That converges twice as fast at 120Hz, so the same hand speed produces a visibly shorter trail on a high-refresh display.',
    'Disposing the scene graph and stopping there. Render targets belong to no scene, so nothing walks them — each holds a full-resolution half-float texture plus a framebuffer, and three of them at DPR 2 is tens of megabytes retained per unmount.',
  ],

  notes: [
    'Guarded with `hasWebGL()`: where a context cannot be acquired the component renders a single static radial gradient at the configured hue instead of an empty canvas.',
    'The loop is gated on `useInView` plus `useVisibility`, so an off-screen or backgrounded instance costs no GPU time at all — which matters more here than elsewhere, because this effect pays for three full-resolution passes per frame.',
    '`resolutionScale` below 1 trades tail sharpness for fill rate. Because the trail is low-frequency by nature, 0.6 is close to free visually and cuts the post-processing cost to roughly a third.',
  ],

  apiSignature:
    'function VelocityAfterimagePass(props: { maxDamp?: number; cutoff?: number; reference?: number; satellites?: number; hue?: number; resolutionScale?: number; className?: string }): JSX.Element',

  props: [
    { name: 'maxDamp', type: 'number', default: '0.9', description: 'Longest trail, as the per-frame decay factor. Must stay below 1.' },
    { name: 'cutoff', type: 'number', default: '0.06', description: 'Alpha below which a pixel is cut to nothing instead of decaying forever.' },
    { name: 'reference', type: 'number', default: '1.6', description: 'Mark travel in world units per second that counts as full speed.' },
    { name: 'satellites', type: 'number', default: '3', description: 'Marks orbiting the lead. 0 leaves a single mark.' },
    { name: 'hue', type: 'number', default: '196', description: 'Base hue in degrees. Satellites are offset 26 degrees apart from it.' },
    { name: 'resolutionScale', type: 'number', default: '1', description: 'Render target scale relative to the canvas. Below 1 trades tail sharpness for fill rate.' },
    { name: 'className', type: 'string', description: 'Merged onto the root container via `cn`.' },
  ],

  reducedMotion:
    'The orbit clock is not advanced and the decay factor is pinned to 0, so no accumulation survives a frame: the panel shows the crisp mark cluster with the satellites holding their starting angles and no tail behind them, however fast the pointer moves. The marks still follow the pointer, since that is direct response to input rather than self-driven motion.',

  cleanup:
    'Nulls the stage handle first so an in-flight frame cannot touch a half-disposed renderer, then `disposeObject` on all three scenes, disposes the sprite texture, both geometries, the blend, screen and every mark material, then explicitly disposes `frame`, `ping` and `pong` — no scene graph reaches them — then `disposeRenderer` (which forces context loss, not just `dispose()`) and removes the canvas element. The rAF subscription is released by `useRaf`.',

  acceptance:
    'Move the pointer slowly across the panel and the marks stay crisp with no tail. Flick across it and a smooth curved tail follows the cluster, fading to nothing rather than to a faint permanent ghost. Stop moving and the tail retracts over about a third of a second, leaving the surface clean. Resize the container mid-gesture and no block of garbage appears. Scroll the panel out of view and GPU work stops; unmount and the WebGL context count in about:gpu drops.',

  criticalRegion: 'critical',
};

export default meta;
