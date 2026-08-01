# Build: Browser Chrome Frame

A title bar plus a content well, drawn entirely in CSS, wrapped around anything you want to present as a live site rather than a picture of one. The address pill copies the URL and confirms with a checkmark that draws along its own path and holds for 1600 ms. Every state change happens inside a fixed-width pill, so nothing in the bar ever reflows.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A macOS window frame with hover-revealed traffic lights and an address pill whose check draws itself on copy.

- Category: primitive
- Runtime cost: css
- Dependencies: none beyond React

## How it works

1. The frame is a flex column: a `shrink-0` title bar and a `min-h-0 flex-1` content well. `min-h-0` is what lets the well actually shrink inside a flex parent — without it a tall child pushes the frame past its container and the rounded bottom corners leave the viewport.
2. The three window buttons are `11px` circles filled with the real macOS values (`#ff5f57`, `#febc2e`, `#28c840`) holding a `7px` SVG glyph at `opacity: 0`. The cluster is one Tailwind `group`, so hovering anywhere in the title bar fades all three glyphs in together — which is how the system chrome behaves, and hovering one button to reveal only that button is the tell of a reimplementation.
3. Copying goes through `navigator.clipboard?.writeText?.(url)`. That returns `undefined` outside a secure context and a rejecting promise when the document is not focused, so both branches resolve to an explicit `failed` state rather than a swallowed catch. A pill that silently does nothing reads as a broken button.
4. The confirmation checkmark carries `pathLength="1"` and `strokeDasharray="1"`, so `strokeDashoffset` moves between exactly `1` and `0` regardless of the path coordinates, and a single 320 ms `cubic-bezier(0.22, 1, 0.36, 1)` transition draws it. The link icon it replaces crossfades over 180 ms in an absolutely-positioned 12 px box, so the icon slot never changes size.
5. Both text labels — the URL and the confirmation — sit in the same CSS grid cell (`col-start-1 row-start-1`) and swap by opacity. The pill therefore cannot resize between states, so the URL never shifts sideways under the cursor that just clicked it.
6. A single `setTimeout` ref holds the return to idle. Every entry point clears it first, so clicking the pill three times in a row extends one confirmation rather than queuing three overlapping ones.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `COPIED_MS = 1600`
  How long the confirmed state holds. Deliberately long: at the 600-800 ms most implementations use, a user who looks back at the pill after moving their eyes to the clipboard target has already missed it, and clicks again. 1600 ms survives a glance away and back.
- `DRAW_MS = 320`
  Stroke-draw duration for the check. Below ~200 ms the draw is indistinguishable from a hard appear, which throws away the only cue that says "this just happened now"; past ~450 ms the confirmation is still arriving after the user has moved on.
- `FADE_MS = 180`
  Crossfade for the icon and label swap, and the traffic-light glyph reveal. Shorter than the draw on purpose — the check should finish last, so the eye lands on the completed mark rather than on a half-drawn one under settled text.
- `traffic light fills = #ff5f57 / #febc2e / #28c840`
  The actual macOS window-button values. This component reproduces a specific piece of system chrome, so these are content, not theme: recolouring them to the site palette turns the frame from "a browser" into "a diagram of a browser" and the recognition is gone.
- `dot size = 11px`
  Matches the system button diameter at 1x. At 8px the glyphs are unreadable; past ~14px the bar starts to read as a toy illustration rather than chrome.

## API

```ts
function BrowserChromeFrame(props: { url: string; children: ReactNode; label?: string; onCopy?: (url: string) => void; copiedDurationMs?: number; className?: string; bodyClassName?: string }): JSX.Element
```

- `url: string`
  Shown in the address pill and written to the clipboard on click.
- `children: ReactNode`
  The framed content. Sized by the frame, not by itself.
- `label: string`
  Display text for the pill. Defaults to `url` with the scheme stripped, which is what a browser shows.
- `onCopy: (url: string) => void`
  Fires after a successful clipboard write, never on failure.
- `copiedDurationMs: number` — default `1600`
  How long the confirmed state holds before returning to idle.
- `className: string`
  Merged onto the outer frame.
- `bodyClassName: string`
  Merged onto the content well below the title bar.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
const COPIED_MS = 1600;
const DRAW_MS = 320;
const FADE_MS = 180;

type CopyState = 'idle' | 'copied' | 'failed';

export function BrowserChromeFrame({
  url,
  children,
  label,
  onCopy,
  copiedDurationMs = COPIED_MS,
  className,
  bodyClassName,
}: BrowserChromeFrameProps) {
  const [state, setState] = useState<CopyState>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduced = useReducedMotion();

  const notify = useRef(onCopy);
  notify.current = onCopy;

  const reset = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  // A pending timer outlives the component unless it is cleared. Left alone it
  // calls setState on an unmounted tree — React 19 no longer warns about that,
  // which makes it quieter, not less of a leak.
  useEffect(() => reset, [reset]);

  const copy = useCallback(() => {
    // `navigator.clipboard` is undefined outside a secure context and its
    // promise rejects when the document is not focused. Both are ordinary, so
    // the failure has a state of its own rather than a swallowed catch: a pill
    // that silently does nothing reads as a broken button.
    const write = navigator.clipboard?.writeText?.(url);
    if (!write) {
      reset();
      setState('failed');
      timer.current = setTimeout(() => setState('idle'), copiedDurationMs);
      return;
    }

    void write.then(
      () => {
        reset();
        setState('copied');
        notify.current?.(url);
        timer.current = setTimeout(() => setState('idle'), copiedDurationMs);
      },
      () => {
        reset();
        setState('failed');
        timer.current = setTimeout(() => setState('idle'), copiedDurationMs);
      },
    );
  }, [url, copiedDurationMs, reset]);

  const copied = state === 'copied';
  const failed = state === 'failed';

  // Reduced motion keeps the state change and drops only the tweening: the
  // check is already fully drawn on the frame it appears, and the two labels
  // hard-swap instead of crossfading. The confirmation is still legible for
  // the same 1600 ms — the information was never the animation.
  const drawMs = reduced ? 0 : DRAW_MS;
  const fadeMs = reduced ? 0 : FADE_MS;
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** One `clearTimeout` on the single pending reset timer, via an effect that returns the same `reset` callback every entry point already uses. There are no listeners, no rAF and no tweens — all motion is CSS transitions on mounted nodes, which the browser discards with the node.

**Reduced motion.** The state machine is untouched: clicking still copies, the check still replaces the link icon, and the confirmation still holds for the full 1600 ms. What goes to zero is `DRAW_MS` and `FADE_MS`, so the check appears already fully drawn and the labels hard-swap instead of crossfading. The traffic-light glyphs still reveal on hover, without the fade.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Swapping the icon element instead of stacking both. Replacing a link icon with a check changes the rendered width by a pixel or two, the flex row re-solves, and the URL text jumps sideways at the exact moment the user is reading the confirmation.
- Letting the label change the pill width. If the URL and "Copied" are the same node with different text, the pill resizes and the whole title bar reflows. Stacking them in one grid cell keeps the width pinned to the longer of the two, permanently.
- Hard-coding the measured path length for the dash animation. The first time anyone nudges a coordinate in the checkmark, the offset no longer matches the path and the stroke either starts partly drawn or never completes. `pathLength="1"` renormalises so the animation is coordinate-independent.
- Assuming `navigator.clipboard` exists. On `http://` origins and inside some embedded webviews it is `undefined`, and calling it throws a TypeError that takes the click handler down with it. On a secure origin it still rejects if the document is not focused — a case that happens constantly in dev tools.
- Not clearing the reset timer before starting a new one. Rapid clicks queue several timeouts and the confirmation flickers off at the first one's deadline rather than the last one's, so the state disappears while the user is still clicking.
- Leaving the timer pending on unmount. It fires into a disposed tree; React 19 no longer warns, which makes it quieter, not less of a leak.
- Reading the reduced-motion state and disabling the confirmation itself. The check is information, not decoration. Only the tweening is dropped.

## Notes

- The `group-hover` glyph reveal has no touch equivalent, and correctly so: there is no hover on touch, and firing the reveal on press would light up three buttons the user cannot click.
- The content well sets `overflow-hidden` and `bg-bg`, which is what gives the embed its edge. Framing exists as much to bound the content as to decorate it.

## Definition of done

Hover the title bar and all three glyphs fade in together. Click the pill: the link icon fades out, a checkmark draws itself left to right, "Copied" replaces the URL, the pill does not change width by a single pixel, and the state returns to the URL 1600 ms later. Click three times quickly and you get one confirmation that ends 1600 ms after the last click. On an `http://` origin the pill shows "Press to copy" instead of a silent no-op. With reduced motion the check is fully drawn on the first frame it appears.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
