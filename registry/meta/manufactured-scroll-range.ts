import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'manufactured-scroll-range',
  title: 'Manufactured Scroll Range',
  category: 'scroll',
  tags: ['scroll', 'sticky', 'progress', 'index', 'css-variables'],
  blurb: 'An empty box N screens tall turns a one-screen scene into a scrollable sequence, with progress as a CSS variable and the index as state.',
  cost: 'dom',
  motif: 'stack',

  files: [
    { path: 'registry/ui/manufactured-scroll-range.tsx', type: 'registry:ui', role: 'component' },
    { path: 'registry/hooks/use-raf.ts', type: 'registry:hook', role: 'shared rAF loop with clamped delta' },
    { path: 'registry/lib/damp.ts', type: 'registry:lib', role: 'clamp' },
  ],
  dependencies: [],
  registryDependencies: [],

  summary:
    'Some content has no height. A ring of projects, a canvas scene, a stack of captions — one screen of markup that wants to be a page of interaction. The fix is to manufacture the range: a container sized `count x viewports` screens with a sticky viewport inside it, and `scrolled / scrollable` as the single input. One screen of scroll then means exactly one item, with no per-item measurement to keep in sync.',

  mechanism: [
    'The container height is written in the scroller\'s own pixels — `hostHeight * (1 + count * viewports)` — and the sticky child is written at exactly `hostHeight`, so the difference between them is the scroll range and nothing else. Pixels rather than `vh` because inside a scrollable box, viewport units measure a different element entirely.',
    'Progress is `(hostTop - containerTop) / (total - hostHeight)`, read from live rects on the frame it is used. Nothing is cached, so a font swap, an image landing above, or a resize corrects itself on the next frame with no invalidation step.',
    'The two outputs are separated by cost. Continuous progress goes out as `--range-progress` and `--range-position` custom properties and to an optional `onFrame` callback — sixty times a second, never through React. The discrete index goes through `useState`, and only on the frame it changes.',
    'Progress is quantised to four decimals before writing. Below that nothing downstream can render differently, so a stationary scroller performs zero style writes rather than 60 per second.',
    'The index uses `floor`, not `round`, so item `i` owns `[i/count, (i+1)/count)` — equal slots, and the last item owns the end of the range instead of a half-slot.',
    'A hysteresis band of 0.04 of a slot guards the index commit. A trackpad resting exactly on a boundary otherwise flips the index every frame, and each flip is a full React re-render of the viewport contents.',
    'The render prop receives `{ index, count }`, so the child tree re-renders on item change only — the per-frame value is available to the same tree as an inherited custom property.',
  ],

  constants: [
    {
      name: 'viewports',
      value: '1',
      why: 'Screens of scroll per item. One is the value that makes the range legible: a full flick moves exactly one item, which is the mapping users infer within two gestures. Below ~0.6 items blur past; above ~2 the sequence feels padded.',
    },
    {
      name: 'HYSTERESIS',
      value: '0.04',
      why: 'Fraction of a slot the position must travel past a boundary before the index commits. Sized above trackpad jitter and sub-pixel rect noise, and far below anything a user could intend as a move.',
    },
    {
      name: 'progress quantisation',
      value: '4 decimal places',
      why: 'One ten-thousandth of the range is below the resolution of any downstream transform or colour mix, so comparing the formatted string lets an idle scroller skip the DOM write entirely.',
    },
    {
      name: 'range height',
      value: 'hostHeight * (1 + count * viewports)',
      why: 'The extra `1` is the sticky viewport\'s own screen. Without it the last item is only reachable at the exact bottom of the scroller and can never be centred.',
    },
  ],

  pitfalls: [
    'Sizing the spacer in `vh` while the component lives inside a scrollable box. The height comes from the window and the progress comes from the box, so the sequence finishes early or never finishes — and it looks correct only when the box happens to be full-height.',
    'Pushing continuous progress through `setState`. That is a React render per frame for a value that only ever feeds a transform; the tree re-reconciles 60 times a second to move one bar.',
    'Committing the index with no hysteresis. Resting on a boundary makes the index oscillate, which reads as flicker and, if items fetch anything, as a request storm.',
    'Using `round` for the index. Items 0 and count-1 get half-width slots, so the first and last feel twice as fast as the middle for no reason the user can see.',
    'Putting the spacer as a sibling *before* the sticky element. Sticky positioning is bounded by the parent, so the viewport unsticks as soon as the spacer scrolls past and the sequence stops halfway.',
    'Deriving progress from `scroller.scrollTop / scrollHeight`. That is the whole document\'s progress, not the section\'s, so the mapping breaks the moment anything is added above or below.',
    'Forgetting `overflow: hidden` on the sticky viewport. Content sized to the viewport bleeds over neighbouring sections during the range and paints outside its own box.',
  ],

  notes: [
    'The scroll container is auto-detected by walking ancestors for a scrollable `overflow-y`, so the component works unchanged on a normal page; pass `scroller` when the container is created later or ambiguous.',
    'Custom properties inherit, so anything inside the render prop can read `--range-progress` without prop drilling and without a re-render.',
    'For a ring rather than a list, replace the `clamp` on the index with `((i % count) + count) % count` and let the position wrap.',
  ],

  apiSignature:
    'function ManufacturedScrollRange(props: { count: number; viewports?: number; children: (state: { index: number; count: number }) => ReactNode; onFrame?: (state: { progress: number; position: number; index: number }) => void; scroller?: RefObject<HTMLElement | null>; className?: string }): JSX.Element',

  props: [
    { name: 'count', type: 'number', description: 'How many items the manufactured range represents.' },
    { name: 'viewports', type: 'number', default: '1', description: 'Screens of scroll per item.' },
    { name: 'children', type: '(state: { index: number; count: number }) => ReactNode', description: 'Rendered inside the sticky viewport; called again only when the index changes.' },
    { name: 'onFrame', type: '(state: ScrollRangeState) => void', description: 'Per-frame progress, for work that must not go through React.' },
    { name: 'scroller', type: 'RefObject<HTMLElement | null>', description: 'Scroll container. Omit to auto-detect the nearest scrollable ancestor.' },
    { name: 'className', type: 'string', description: 'Merged onto the outer container.' },
  ],

  reducedMotion:
    'The range is layout, not animation: it is how the sequence is navigated, so collapsing it would remove access to the content rather than remove motion. The component itself animates nothing — it publishes numbers. Consumers should read the discrete `index` under reduced motion and drive cuts, not `--range-progress` and continuous parallax.',

  cleanup:
    '`useRaf` unsubscribes from the shared loop on unmount and no other listener, observer or timer is registered. The inline height and the custom properties are written on nodes React owns and disappear with them.',

  acceptance:
    'One screen of scroll advances exactly one item. Resting the pointer on a slot boundary does not flip the index back and forth. The progress bar moves continuously while the item title changes in steps. Resizing the scroller keeps the current item on screen. React DevTools shows a render only when the item changes, not per frame.',

  criticalRegion: 'critical',
};

export default meta;
