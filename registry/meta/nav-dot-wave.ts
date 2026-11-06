import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'nav-dot-wave',
  title: 'Nav Dot Wave',
  category: 'primitive',
  tags: ['css', 'keyframes', 'stagger', 'navigation', 'custom-properties'],
  blurb: 'Nav dots that lift in sequence. The index is an inline custom property; CSS derives the delay.',
  cost: 'css',
  motif: 'wave',

  files: [
    { path: 'registry/ui/nav-dot-wave.tsx', type: 'registry:ui', role: 'component' },
  ],
  dependencies: [],

  summary:
    'One keyframe block and N elements. Each nav item writes its own index into an inline `--i`, and the stylesheet turns that index into an animation delay, so a crest travels along the row. Adding a nav item requires no change to the CSS and no JavaScript at all.',

  mechanism: [
    'Every list item carries `style={{ "--i": i }}`. The dot\'s rule reads `animation-delay: calc(var(--i, 0) * var(--kx-dot-stagger, 60ms))`, so the phase offset of each dot is derived from its position rather than authored per item. The index is data; the timing is a function of it.',
    'The keyframe is deliberately mostly flat: `0%, 60%, 100%` is the resting pose and only `30%` lifts. The dot therefore rests for 40% of every 1400 ms cycle. That long rest is what makes a staggered set read as a single crest travelling along the row instead of a row of dots vibrating in place.',
    '0% is the resting pose, not the lifted one, and that ordering is load-bearing. A positive `animation-delay` holds an element at its 0% pose until the delay expires, so if 0% were the lift, every dot would sit visibly raised for its share of the stagger on first paint and the row would *settle* into place rather than start from it.',
    'The active item swaps to a second keyframe (`kx-dotwave-active`) with identical geometry but a constant `opacity: 1`. It participates in the wave so the row stays coherent, but it never dims, because a location marker that fades to 45% twice a second is a marker you cannot trust.',
    'The lift is written with the `translate` property, not `transform`, so the active state\'s `scale: 1.6` composes independently and can carry its own spring transition without either value clobbering the other.',
    '`reverse` negates the stagger to `-60ms`. Negative delays start an animation already partway through its cycle, so the phase gradient inverts and the crest runs right-to-left with no second keyframe.',
    'The CSS ships in a `<style href="kinetic-nav-dot-wave" precedence="medium">` element. React 19 deduplicates and hoists it to the head by `href`, so the rules exist exactly once no matter how many navs are mounted, and nothing has to be added to a global stylesheet.',
  ],

  constants: [
    {
      name: 'durationMs',
      value: '1400',
      why: 'One dot\'s full cycle. Below ~900 ms the lift reads as a nervous twitch; above ~2000 ms the crest is so slow that a user glancing at the nav sees a static row and the effect is paid for but not perceived.',
    },
    {
      name: 'staggerMs',
      value: '60',
      why: 'Phase gap between neighbours. The crest travels at one item per 60 ms. Under ~30 ms the dots look simultaneous; over ~120 ms the wave breaks into visibly separate blips because the leading dot has finished its lift before the next begins.',
    },
    {
      name: 'keyframe rest span',
      value: '0%, 60%, 100%',
      why: 'The dot is flat for 40% of the cycle. Shrink the rest and adjacent dots overlap enough that the whole row appears raised at once, which is a vibration, not a wave.',
    },
    {
      name: 'peak position',
      value: '30%',
      why: 'The lift peaks in the first third and eases back over the next third. Symmetric timing (peak at 50%) makes each dot look like it is hovering rather than being flicked, and the crest loses its direction.',
    },
    {
      name: 'lift',
      value: '3',
      why: 'Pixels. A nav dot is 5px; 3px is a lift of over half its diameter, which is legible at a glance. Past ~6px the dots start colliding with the label baseline and the row looks broken rather than animated.',
    },
    {
      name: 'resting opacity',
      value: '0.45',
      why: 'Low enough that the peak at 1.0 registers as a change, high enough that an inactive nav item is still readable. Below ~0.3 the dots vanish against a dark surface and the row appears to lose items.',
    },
    {
      name: 'active scale',
      value: '1.6',
      why: 'The current-page dot has to win against five siblings that are all moving. Under ~1.3 it is lost in the wave; over ~2 it stops reading as the same kind of object as its neighbours.',
    },
  ],

  pitfalls: [
    'Putting the lift at 0% of the keyframe. `animation-delay` freezes the element at its 0% pose, so on first paint the whole row sits raised and drops in sequence — the animation appears to run once backwards before starting.',
    'Animating `transform` for both the lift and the active scale. The last-declared transform wins, so the active dot either loses its lift or snaps back to scale 1 every cycle. Separate `translate` and `scale` properties compose instead.',
    'Driving the stagger from JavaScript with a timer or a per-item inline delay string. It costs a re-render per item, drifts out of phase with the CSS clock, and stops working the moment items are added dynamically.',
    'Letting the active dot dim with the rest. It is the only element on the page telling the user where they are; a marker at 45% opacity for most of every cycle is worse than no marker.',
    'Leaving `will-change: translate, opacity` on under reduced motion. The animation is gone but the compositor layer is not, so a nav that no longer moves still holds GPU memory on every dot.',
    'Removing the animation under reduced motion and removing the active state with it. The accent colour and the larger dot carry information, not decoration — only the crest should go.',
    'Keying the list by index while items reorder. The `--i` and the label desynchronise for one frame and a dot appears to jump across the row.',
  ],

  notes: [
    'Nothing here is JavaScript-driven: no rAF, no observers, no state. The component\'s entire runtime cost is one style element and one inline custom property per item, which is why it is safe in a header that mounts on every route.',
    'The `--i` pattern generalises. Any staggered CSS animation — list entrances, grid reveals, letter-by-letter text — can take its delay from an index custom property instead of from generated per-item rules or a JavaScript timeline.',
    'Set `activeIndex` from your router. `aria-current="page"` is applied to the matching link, so the state is announced as well as drawn.',
  ],

  apiSignature:
    'function NavDotWave(props: { items: readonly { label: string; href?: string }[]; activeIndex?: number; staggerMs?: number; durationMs?: number; lift?: number; size?: number; reverse?: boolean; className?: string }): JSX.Element',

  props: [
    { name: 'items', type: 'readonly NavDotWaveItem[]', description: 'Nav entries. Each is `{ label, href? }`; the label is also the React key.' },
    { name: 'activeIndex', type: 'number', default: '0', description: 'Index of the current page. Its dot grows, takes the accent colour and stops dimming.' },
    { name: 'staggerMs', type: 'number', default: '60', description: 'Milliseconds between one dot\'s phase and the next.' },
    { name: 'durationMs', type: 'number', default: '1400', description: 'Full cycle of a single dot, in milliseconds.' },
    { name: 'lift', type: 'number', default: '3', description: 'Peak lift in pixels.' },
    { name: 'size', type: 'number', default: '5', description: 'Dot diameter in pixels.' },
    { name: 'reverse', type: 'boolean', default: 'false', description: 'Negates the stagger so the crest runs right-to-left.' },
    { name: 'className', type: 'string', description: 'Merged onto the `nav` element.' },
  ],

  reducedMotion:
    'A `@media (prefers-reduced-motion: reduce)` block in the component\'s own stylesheet sets `animation: none` and `will-change: auto` on the dots, drops them to the resting opacity, and holds the active dot at full opacity. The accent colour and the 1.6x active scale stay, so the nav still shows where you are — only the travelling crest is removed.',

  cleanup:
    'Nothing imperative to tear down. The stylesheet is a React-managed `<style>` with an `href` key, so React owns its lifetime and deduplicates it across instances; unmounting the nav removes the elements and the animations with them.',

  acceptance:
    'A crest travels left-to-right along the dots once every 1.4 s and each dot is flat for most of that time. On first paint no dot is raised. The current item\'s dot is accent-coloured, 1.6x larger, and never dims while its neighbours do. Set `reverse` and the crest runs the other way. With reduced motion nothing moves, but the active dot is still larger and still accented.',

  criticalRegion: 'critical',
};

export default meta;
