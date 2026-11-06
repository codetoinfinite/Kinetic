import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'rekey-caption-replay',
  title: 'Re-Key Caption Replay',
  category: 'transition',
  tags: ['react-key', 'css-animation', 'stagger', 'slideshow', 'caption'],
  blurb:
    'A caption block whose staggered entrance replays on every index change, restarted by a changed React key.',
  cost: 'css',
  motif: 'stack',

  files: [
    { path: 'registry/ui/rekey-caption-replay.tsx', type: 'registry:ui', role: 'component' },
  ],
  dependencies: [],

  summary:
    'A wrapper that replays a staggered entrance every time its `entryKey` changes. It does it by being a different node: React unmounts the old caption and mounts a new one, and a freshly mounted element starts its CSS animation at frame zero. No forced reflow to restart the animation, no tween to kill, and a fast prev/next cannot leave the block half-entered because the half-entered node no longer exists.',

  mechanism: [
    'The children are wrapped in a single `<div key={entryKey}>`. Changing `entryKey` makes React discard that subtree and mount a fresh one; a new element runs its `animation` from frame zero, which is the entire replay mechanism. The key goes on the wrapper, not on each child — keyed individually, only the children whose own identity changed would replay, which for a caption is usually none of them.',
    'One keyframe, `kinetic-rekey-in`, runs `opacity: 0` and `translateY(var(--kx-rekey-from))` to `opacity: 1` and `translateY(0)` over 0.5 s on `cubic-bezier(0.22, 1, 0.36, 1)`. Because the offset is a custom property rather than a literal, flipping its sign on the root turns a rise into a drop — both directions from one set of keyframes.',
    'The stagger is a generated ladder of `:nth-child(n) { animation-delay: calc(var(--kx-rekey-stagger) * (n - 1)) }` rules, built once at module scope for the first eight children. A ninth-and-beyond rule pins the tail to the eighth delay, so an overlong block degrades to "the tail arrives together" rather than "the tail arrives first at delay zero".',
    '`animation-fill-mode: both` is what makes the delay usable. Without it a delayed line is painted at its normal full-opacity style for the length of its own delay, then snaps to the from-frame to begin animating — every line flashes before it enters.',
    'The stylesheet is emitted once through React 19\'s `<style href precedence>` hoisting, so duration, stagger and offset are read from CSS custom properties set on the wrapper. Ten captions on a page share one rule block and differ only in their variables.',
  ],

  constants: [
    {
      name: 'duration',
      value: '0.5',
      why: 'Seconds per line. With the 0.06 s stagger, a four-line block finishes in 0.68 s — under the ~0.7 s where a caption change starts to feel like waiting. Halve it and the ease has no room to decelerate, so the rise reads as a jump.',
    },
    {
      name: 'distance',
      value: '14',
      why: 'Pixels travelled. Roughly one line of leading at caption size: enough for the eye to register direction, small enough that the text is never far from where it lands. Past ~30 px the block reads as flying in from off-panel.',
    },
    {
      name: 'stagger',
      value: '0.06',
      why: 'Seconds between lines. At 0 the block is one object; past ~0.12 s the metadata is still arriving after the title has settled, which reads as a slow network rather than a sequence.',
    },
    {
      name: 'ease',
      value: 'cubic-bezier(0.22, 1, 0.36, 1)',
      why: 'An out-quart. It covers about 80% of the distance in the first third of the duration, so the line appears to arrive fast and then settle — which is what hides the fact that nothing is actually decelerating.',
    },
    {
      name: 'MAX_STAGGERED_LINES',
      value: '8',
      why: 'How many nth-child rules are generated. Eight covers eyebrow, title, two metadata rows and a counter with room spare. The number exists because CSS cannot do arithmetic on the child index, so the ladder has to be finite.',
    },
  ],

  pitfalls: [
    'Restarting the animation by toggling a class off and on. The browser coalesces both mutations into one style recalculation and the animation never restarts, which is why that approach always ends up with a `void el.offsetWidth` forced reflow wedged between the two lines.',
    'Tweening the caption with an animation library instead. A fast prev/next leaves two opposing tweens on the same node and the text jitters between them; a remount cannot have that problem because the contended node is gone.',
    'Omitting `animation-fill-mode: both`. Every delayed line paints at full opacity for the length of its delay, then snaps to invisible to start animating. The block flickers, and it flickers worse the larger the stagger.',
    'Putting the key on the individual lines. Their identities usually do not change between captions, so React reuses the nodes and nothing replays — the most common way this technique silently does nothing.',
    'Wrapping anything focusable or stateful. The remount destroys DOM state and moves focus to the body: an input inside this loses its caret and its value on every key change. This is for display content only.',
    'Animating both directions with a second keyframe block. The two drift apart the first time someone tunes the offset. One keyframe reading a signed custom property cannot.',
  ],

  notes: [
    'Pairs with a counter badge and prev/next controls to make a slideshow caption, which is where the technique was observed. The same wrapper works for a filter result header, a hovered-row detail panel, or a step label in a multi-step form summary.',
    'Direction is a prop rather than something derived internally, because only the caller knows whether an index change was forward, backward, or a jump from a thumbnail strip.',
    'For the media beside the caption, a CSS `transition` on the background beats a tween: an index change is a discrete event with one start and one end state, which is exactly what a transition is for.',
  ],

  apiSignature:
    'function RekeyCaptionReplay(props: { entryKey: string | number; children: ReactNode; duration?: number; distance?: number; stagger?: number; direction?: "up" | "down"; className?: string }): JSX.Element',

  props: [
    { name: 'entryKey', type: 'string | number', description: 'Identity of the current caption. Any change replays the entrance.' },
    { name: 'children', type: 'ReactNode', description: 'Direct children each get their own delay, in source order.' },
    { name: 'duration', type: 'number', default: '0.5', description: 'Seconds one line\'s entrance lasts.' },
    { name: 'distance', type: 'number', default: '14', description: 'Pixels a line travels. Signed by `direction`.' },
    { name: 'stagger', type: 'number', default: '0.06', description: 'Seconds between successive lines. 0 makes the block arrive as one piece.' },
    { name: 'direction', type: '"up" | "down"', default: '"up"', description: '`up` enters from below; `down` enters from above, for a step backward.' },
    { name: 'className', type: 'string', description: 'Merged onto the keyed wrapper via `cn`.' },
  ],

  reducedMotion:
    '`animation: none` on the children, which re-exposes their base styles — full opacity, no offset. The caption is fully rendered on the first frame after the key change, in its final position. This is the one case where dropping the animation is the correct still state rather than a cop-out, because the from-frame is the only thing the animation adds.',

  cleanup:
    'Nothing to clean up. There are no listeners, no timers, no rAF and no tweens — the animation is CSS and the nodes running it are removed by React itself on every key change.',

  acceptance:
    'Step forward and the eyebrow, title and metadata rise into place one after another, roughly 60 ms apart. Step backward and they drop in from above instead. Click next four times as fast as you can and every caption plays its full entrance from the start with no jitter or stuck line. With reduced motion the new caption is simply there, complete, on the first frame.',

  criticalRegion: 'critical',
};

export default meta;
