import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'browser-chrome-frame',
  title: 'Browser Chrome Frame',
  category: 'primitive',
  tags: ['chrome', 'clipboard', 'svg', 'confirmation', 'wrapper'],
  blurb:
    'A macOS window frame with hover-revealed traffic lights and an address pill whose check draws itself on copy.',
  cost: 'css',
  motif: 'stack',

  files: [
    { path: 'registry/ui/browser-chrome-frame.tsx', type: 'registry:ui', role: 'component' },
  ],
  dependencies: [],

  summary:
    'A title bar plus a content well, drawn entirely in CSS, wrapped around anything you want to present as a live site rather than a picture of one. The address pill copies the URL and confirms with a checkmark that draws along its own path and holds for 1600 ms. Every state change happens inside a fixed-width pill, so nothing in the bar ever reflows.',

  mechanism: [
    'The frame is a flex column: a `shrink-0` title bar and a `min-h-0 flex-1` content well. `min-h-0` is what lets the well actually shrink inside a flex parent — without it a tall child pushes the frame past its container and the rounded bottom corners leave the viewport.',
    'The three window buttons are `11px` circles filled with the real macOS values (`#ff5f57`, `#febc2e`, `#28c840`) holding a `7px` SVG glyph at `opacity: 0`. The cluster is one Tailwind `group`, so hovering anywhere in the title bar fades all three glyphs in together — which is how the system chrome behaves, and hovering one button to reveal only that button is the tell of a reimplementation.',
    'Copying goes through `navigator.clipboard?.writeText?.(url)`. That returns `undefined` outside a secure context and a rejecting promise when the document is not focused, so both branches resolve to an explicit `failed` state rather than a swallowed catch. A pill that silently does nothing reads as a broken button.',
    'The confirmation checkmark carries `pathLength="1"` and `strokeDasharray="1"`, so `strokeDashoffset` moves between exactly `1` and `0` regardless of the path coordinates, and a single 320 ms `cubic-bezier(0.22, 1, 0.36, 1)` transition draws it. The link icon it replaces crossfades over 180 ms in an absolutely-positioned 12 px box, so the icon slot never changes size.',
    'Both text labels — the URL and the confirmation — sit in the same CSS grid cell (`col-start-1 row-start-1`) and swap by opacity. The pill therefore cannot resize between states, so the URL never shifts sideways under the cursor that just clicked it.',
    'A single `setTimeout` ref holds the return to idle. Every entry point clears it first, so clicking the pill three times in a row extends one confirmation rather than queuing three overlapping ones.',
  ],

  constants: [
    {
      name: 'COPIED_MS',
      value: '1600',
      why: 'How long the confirmed state holds. Deliberately long: at the 600-800 ms most implementations use, a user who looks back at the pill after moving their eyes to the clipboard target has already missed it, and clicks again. 1600 ms survives a glance away and back.',
    },
    {
      name: 'DRAW_MS',
      value: '320',
      why: 'Stroke-draw duration for the check. Below ~200 ms the draw is indistinguishable from a hard appear, which throws away the only cue that says "this just happened now"; past ~450 ms the confirmation is still arriving after the user has moved on.',
    },
    {
      name: 'FADE_MS',
      value: '180',
      why: 'Crossfade for the icon and label swap, and the traffic-light glyph reveal. Shorter than the draw on purpose — the check should finish last, so the eye lands on the completed mark rather than on a half-drawn one under settled text.',
    },
    {
      name: 'traffic light fills',
      value: '#ff5f57 / #febc2e / #28c840',
      why: 'The actual macOS window-button values. This component reproduces a specific piece of system chrome, so these are content, not theme: recolouring them to the site palette turns the frame from "a browser" into "a diagram of a browser" and the recognition is gone.',
    },
    {
      name: 'dot size',
      value: '11px',
      why: 'Matches the system button diameter at 1x. At 8px the glyphs are unreadable; past ~14px the bar starts to read as a toy illustration rather than chrome.',
    },
  ],

  pitfalls: [
    'Swapping the icon element instead of stacking both. Replacing a link icon with a check changes the rendered width by a pixel or two, the flex row re-solves, and the URL text jumps sideways at the exact moment the user is reading the confirmation.',
    'Letting the label change the pill width. If the URL and "Copied" are the same node with different text, the pill resizes and the whole title bar reflows. Stacking them in one grid cell keeps the width pinned to the longer of the two, permanently.',
    'Hard-coding the measured path length for the dash animation. The first time anyone nudges a coordinate in the checkmark, the offset no longer matches the path and the stroke either starts partly drawn or never completes. `pathLength="1"` renormalises so the animation is coordinate-independent.',
    'Assuming `navigator.clipboard` exists. On `http://` origins and inside some embedded webviews it is `undefined`, and calling it throws a TypeError that takes the click handler down with it. On a secure origin it still rejects if the document is not focused — a case that happens constantly in dev tools.',
    'Not clearing the reset timer before starting a new one. Rapid clicks queue several timeouts and the confirmation flickers off at the first one\'s deadline rather than the last one\'s, so the state disappears while the user is still clicking.',
    'Leaving the timer pending on unmount. It fires into a disposed tree; React 19 no longer warns, which makes it quieter, not less of a leak.',
    'Reading the reduced-motion state and disabling the confirmation itself. The check is information, not decoration. Only the tweening is dropped.',
  ],

  notes: [
    'The `group-hover` glyph reveal has no touch equivalent, and correctly so: there is no hover on touch, and firing the reveal on press would light up three buttons the user cannot click.',
    'The content well sets `overflow-hidden` and `bg-bg`, which is what gives the embed its edge. Framing exists as much to bound the content as to decorate it.',
  ],

  apiSignature:
    'function BrowserChromeFrame(props: { url: string; children: ReactNode; label?: string; onCopy?: (url: string) => void; copiedDurationMs?: number; className?: string; bodyClassName?: string }): JSX.Element',

  props: [
    { name: 'url', type: 'string', description: 'Shown in the address pill and written to the clipboard on click.' },
    { name: 'children', type: 'ReactNode', description: 'The framed content. Sized by the frame, not by itself.' },
    { name: 'label', type: 'string', description: 'Display text for the pill. Defaults to `url` with the scheme stripped, which is what a browser shows.' },
    { name: 'onCopy', type: '(url: string) => void', description: 'Fires after a successful clipboard write, never on failure.' },
    { name: 'copiedDurationMs', type: 'number', default: '1600', description: 'How long the confirmed state holds before returning to idle.' },
    { name: 'className', type: 'string', description: 'Merged onto the outer frame.' },
    { name: 'bodyClassName', type: 'string', description: 'Merged onto the content well below the title bar.' },
  ],

  reducedMotion:
    'The state machine is untouched: clicking still copies, the check still replaces the link icon, and the confirmation still holds for the full 1600 ms. What goes to zero is `DRAW_MS` and `FADE_MS`, so the check appears already fully drawn and the labels hard-swap instead of crossfading. The traffic-light glyphs still reveal on hover, without the fade.',

  cleanup:
    'One `clearTimeout` on the single pending reset timer, via an effect that returns the same `reset` callback every entry point already uses. There are no listeners, no rAF and no tweens — all motion is CSS transitions on mounted nodes, which the browser discards with the node.',

  acceptance:
    'Hover the title bar and all three glyphs fade in together. Click the pill: the link icon fades out, a checkmark draws itself left to right, "Copied" replaces the URL, the pill does not change width by a single pixel, and the state returns to the URL 1600 ms later. Click three times quickly and you get one confirmation that ends 1600 ms after the last click. On an `http://` origin the pill shows "Press to copy" instead of a silent no-op. With reduced motion the check is fully drawn on the first frame it appears.',

  criticalRegion: 'critical',
};

export default meta;
