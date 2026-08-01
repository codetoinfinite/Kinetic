import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'cylinder-dot-score',
  title: 'Dot-Cloud Score Cylinder',
  category: 'webgl',
  tags: ['three', 'points', 'draw-order', 'instancing', 'no-depth-buffer'],
  blurb: 'Two counter-rotating cylinders of dots — rings, bar lines, notes — drawn from one buffer with no depth buffer.',
  cost: 'webgl',
  motif: 'rings',

  files: [
    {
      path: 'registry/ui/cylinder-dot-score.tsx',
      target: 'components/motion/cylinder-dot-score.tsx',
      type: 'registry:ui',
      role: 'component',
    },
    {
      path: 'registry/shaders/cylinder-dot-score.ts',
      target: 'components/motion/shaders/cylinder-dot-score.ts',
      type: 'registry:lib',
      role: 'vertex and fragment source',
    },
  ],
  dependencies: ['three@^0.185.1'],
  registryDependencies: ['webgl', 'prng', 'use-raf', 'use-resize-observer', 'use-reduced-motion'],

  summary:
    'A score wrapped around a cylinder and drawn entirely in dots: measure rings, vertical bar dividers, and note clusters that light as a playhead sweeps them. Two cylinders are stacked and turned to different yaws so they never present the same face at once, and both live in one buffer. Nothing uses a depth buffer — every dot is flattened to z = 0 before projection, and solidity comes from alpha and point size falling off with the model-space z.',

  mechanism: [
    'One `Float32Array` pair is filled in six consecutive passes — both cylinders\' measure rings, then both cylinders\' dividers, then both cylinders\' notes. Buffer order is the draw order, so notes end up on top of everything without a sort and without a second object.',
    'Identity travels in `aPointData = vec4(instanceIndex, isNote, pointScale, groupIndex)`, so the two cylinders share a geometry and the vertex shader picks the transform: instance 1 is mirrored with `p.z *= -1.0` and yawed -166°, instance 0 is yawed -90°.',
    'Both are then yawed by `uSpin` (degrees, advancing linearly at `spinSpeed` per second) and tilted 8° on X, and instance 0 is pushed up by 0.3 *after* the rotation so the stack separation is a pure screen-space offset that does not tip with the spin.',
    'Depth is faked from the transformed z: `depthT = clamp((z + 0.6) / 1.2, 0, 1)` drives alpha from 0.25 to 1.0 and point size from 0.65 to 1.0, so the far wall of the cylinder recedes without a depth test.',
    'The playhead is `mod(floor(uElapsed / uNoteInterval), uGroupCount)`, computed in the vertex shader from the clock that is already there. A note group whose index matches gets 2x point size and full alpha, so highlighting a beat costs no React render and no uniform write.',
    'Angles within each ring are sorted before being written into the buffer, and `gl_PointSize` gets the same clamp-plus-area-compensated-alpha treatment as every other point field here.',
  ],

  constants: [
    {
      name: 'BASE_SCALE',
      value: '1.5',
      why: 'Applied in the shader, not baked into the buffer, so re-framing the piece never re-uploads a vertex.',
    },
    {
      name: 'TILT',
      value: '8.0 degrees',
      why: 'X tilt. Below ~4° the cylinder collapses to a straight band and stops reading as a cylinder; past ~15° you look down the tube and the far wall crowds the near one.',
    },
    {
      name: 'INSTANCE_B_YAW',
      value: '-166.0 degrees',
      why: 'Not -180. At exactly half a turn the two cylinders present mirror-image faces and the pair looks like one object reflected; 166° keeps them legibly distinct through the whole rotation.',
    },
    {
      name: 'STACK_OFFSET',
      value: '0.3',
      why: 'Vertical separation, applied after `rotateX` so it is screen-space. Applied before, the offset would tilt with the cylinder and the two would drift into each other as they turn.',
    },
    {
      name: 'DEPTH_HALF_RANGE',
      value: '0.6',
      why: 'z is normalised over ±0.6 while the cloud actually spans ±0.75, so the nearest and furthest dots saturate. Normalising over the exact range leaves the middle band looking flat.',
    },
    {
      name: 'DEPTH_MIN_SIZE / DEPTH_MAX_SIZE',
      value: '0.65 / 1.0',
      why: 'Far dots at 65% of near dots. Alpha alone is not enough — without the size falloff the far wall reads as a grey copy of the near one rather than as distance.',
    },
    {
      name: 'NOTE_ACTIVE_SCALE',
      value: '2.0',
      why: 'Point size multiplier for the lit note group. Area goes as the square, so 2x is a 4x brighter mark — visible at a glance without any colour change being required.',
    },
    {
      name: 'spinSpeed',
      value: '12 degrees/second',
      why: 'One revolution every 30s. The original ran at 1°/s, which is right for an ambient full-page object and far too slow to read in a preview card. Linear either way: easing it would make it look like it is arriving somewhere.',
    },
    {
      name: 'MEASURE_SCALE / NOTE_SCALE',
      value: '0.7 / 1.4',
      why: 'Notes are exactly double the measure dots so they survive the depth size falloff on the far wall, where a measure dot is already down to 0.46.',
    },
  ],

  pitfalls: [
    'Leaving `depthTest` on. Every dot is projected with z = 0, so the first fragment written at a pixel wins and the far wall of the cylinder punches holes in the near one. The whole design depends on buffer order, not on the depth buffer.',
    'Sorting note dots into the buffer before measure dots, or drawing them as a second object added earlier. With depth testing off, "on top" means "later in the buffer" — get it wrong and the notes are half-eaten by the rings that surround them.',
    'Applying the stack offset before `rotateX`. It then rotates with the model, and the two cylinders slowly drift into each other over the course of a revolution instead of staying vertically separated.',
    'Writing raw random angles into a ring. Blending happens in buffer order, so unsorted angles interleave near and far dots and the ring visibly stipples rather than reading as a continuous engraved line.',
    'Driving the playhead from React state and an interval. It re-renders the tree once per beat, and the highlight lands one frame after the beat because the uniform write happens in a commit rather than in the frame loop — deriving it from `uElapsed` in the shader avoids both.',
    'Rebuilding the buffer when the container resizes. Model space is size-independent; only `uViewScale` and `uViewportYOffset` change, so a reflow costs two uniform writes rather than a dropped GL context.',
    'Setting `frustumCulled` at its default. Positions are unit-scale around the origin and the real placement happens in the shader, so three\'s bounding sphere does not describe what is on screen.',
  ],

  notes: [
    'The two cylinders are "instances" only in the conceptual sense — this is one non-instanced `Points` with an index in an attribute, which is cheaper than instancing for a case where every vertex differs anyway.',
    'Total dot count is `2 * (ringCount * ringDots + dividerCount * dividerDots + noteGroups * noteDots)`, about 6100 at the defaults, in one draw call.',
  ],

  apiSignature:
    'function CylinderDotScore(props: { ringCount?: number; ringDots?: number; dividerCount?: number; dividerDots?: number; noteGroups?: number; noteDots?: number; spinSpeed?: number; noteInterval?: number; dotScale?: number; viewScale?: number; opacity?: number; color?: string; noteColor?: string; seed?: number | string; className?: string }): JSX.Element',

  props: [
    { name: 'ringCount', type: 'number', default: '10', description: 'Measure rings per cylinder, split evenly above and below the equator gap.' },
    { name: 'ringDots', type: 'number', default: '260', description: 'Dots in each measure ring.' },
    { name: 'dividerCount', type: 'number', default: '8', description: 'Vertical bar dividers per cylinder.' },
    { name: 'dividerDots', type: 'number', default: '34', description: 'Dots making up each divider.' },
    { name: 'noteGroups', type: 'number', default: '6', description: 'Note clusters per cylinder; the playhead cycles through them.' },
    { name: 'noteDots', type: 'number', default: '26', description: 'Dots per note cluster.' },
    { name: 'spinSpeed', type: 'number', default: '12', description: 'Degrees of yaw per second. Linear.' },
    { name: 'noteInterval', type: 'number', default: '1.2', description: 'Seconds each note group stays lit.' },
    { name: 'dotScale', type: 'number', default: '1', description: 'Global dot radius multiplier in CSS pixels.' },
    { name: 'viewScale', type: 'number', default: '0.62', description: 'Model-to-pixel scale as a fraction of the container short side.' },
    { name: 'opacity', type: 'number', default: '1', description: 'Multiplier applied to every dot.' },
    { name: 'color', type: 'string', default: "'#7d838c'", description: 'Measure and divider dot colour.' },
    { name: 'noteColor', type: 'string', default: "'#ffffff'", description: 'Note dot colour; lit notes go fully to this.' },
    { name: 'seed', type: 'number | string', default: "'cylinder-dot-score'", description: 'Seeds ring angles and note scatter for a stable, hydration-safe layout.' },
    { name: 'className', type: 'string', description: 'Merged onto the host element via `cn`.' },
  ],

  reducedMotion:
    'No frame loop is opened. One frame is drawn at `uElapsed = 0.4`, which shows both cylinders at a legible yaw with the first note group lit, so the structure and the highlight convention are both visible. Neither the rotation nor the playhead advances.',

  cleanup:
    'Nulls the stage ref so a queued frame cannot touch a dead renderer, disposes the geometry through `disposeObject(scene)`, disposes the material, calls `disposeRenderer` for `dispose` + `forceContextLoss` + a zeroed backing store, and removes the canvas. `useRaf` unsubscribes on unmount.',

  acceptance:
    'Two stacked cylinders of dots turn at a constant rate, showing different faces to the viewer. Dots on the far side are visibly smaller and dimmer than those on the near side, and no dot ever pops in front of one it should be behind. A cluster of larger note dots lights every 1.2 seconds and cycles around the cylinder. Resize the container and the piece rescales without a flicker. With reduced motion it holds a single legible frame.',

  criticalRegion: 'critical',
};

export default meta;
