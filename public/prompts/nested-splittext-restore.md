# Build: Nested Split With True Restore

Splitting text destroys the markup inside it: a paragraph containing an `<em>` and an `<a>` goes into SplitText as semantic HTML and comes out as a flat pile of divs. This component splits into masked lines that rise into view, preserves each child element's own tag through the split, and on teardown restores the container's `innerHTML` byte-identically to what it was before anything touched it.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Splits rich markup into masked lines and restores the original innerHTML byte-for-byte on teardown.

- Category: text
- Runtime cost: dom
- Dependencies: gsap@^3.15.0

## How it works

1. `const originalHTML = el.innerHTML` is captured **before** any pre-processing. This string is the contract — everything else is arranged so it can be reapplied exactly.
2. The nested pre-pass walks the container's element children. Each child is split to lines on its own with a throwaway `new SplitText(child, { type: "lines" })`; the line markup is read while that split is live, the split is reverted, and each line is re-emitted inside a **shallow clone** of the child (`child.cloneNode(false)`) before the child is removed. A shallow clone carries the tag and every attribute and none of the content — `cloneNode(true)` would duplicate the child's entire text into every line.
3. The container is then split for real with `new SplitText(el, { type, mask: "lines", linesClass, aria: "auto" })`, and `gsap.from(split.lines, { yPercent: 110, duration: 0.9, stagger: 0.08, ease: "power3.out" })` runs inside a `gsap.context` scoped to the element.
4. The build is deferred behind `document.fonts.ready`, because line boxes measured against the fallback face break in the wrong places and never re-flow when the real font arrives. A `cancelled` flag closes the async gap so a build cannot start after unmount.
5. Teardown runs in a fixed order: `ctx.revert()` first, so the tween's inline styles are removed while the split nodes still exist; then `split.revert()`; then `if (el.innerHTML !== originalHTML) el.innerHTML = originalHTML`.
6. That last line is the whole point. GSAP's `revert()` restores the string SplitText itself captured at construction time — which, after a nested pre-pass, is the *intermediate* markup, not the original. The explicit restore is what makes the guarantee real.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `Y = 110`
  Percent of a line's own height it starts below the mask. Past 100 rather than at it, because `mask: "lines"` clips to the line box and descenders on the first frame otherwise peek below the mask edge on tall faces.
- `DURATION = 0.9`
  Seconds per line. Long enough that `power3.out` has room for its deceleration; below ~0.5s the ease flattens and the lines read as snapping into place.
- `STAGGER = 0.08`
  Seconds between lines. About a tenth of the duration, so five or six lines are always in motion together and the block reads as one rising mass rather than as a queue.
- `VIEW_THRESHOLD = 0.25`
  Fraction of the block visible before splitting and revealing. A paragraph is tall, so requiring more than about a quarter means it must be nearly centred before anything happens.
- `cloneNode(false) = false`
  Shallow, always. `true` copies the child's descendants, so every line of a five-line paragraph contains the whole paragraph and the block renders five times its own height.

## API

```ts
function NestedSplitRestore(props: { children: ReactNode; type?: string; mask?: boolean; nested?: boolean; y?: number; duration?: number; stagger?: number; delay?: number; startOnView?: boolean; className?: string }): JSX.Element
```

- `children: ReactNode`
  Markup to split. Element children keep their own tags and attributes through the pre-pass.
- `type: string` — default `'lines'`
  SplitText `type`. Lines are what the mask and the reveal use.
- `mask: boolean` — default `true`
  Wrap each line in an overflow-hidden box so it rises out of nothing.
- `nested: boolean` — default `true`
  Run the per-child pre-pass. Turn off for a single flat paragraph.
- `y: number` — default `110`
  Percent of a line's height it starts below the mask.
- `duration: number` — default `0.9`
  Seconds per line.
- `stagger: number` — default `0.08`
  Seconds between lines.
- `delay: number` — default `0`
  Seconds before the first line moves.
- `startOnView: boolean` — default `true`
  Split and reveal when scrolled into view rather than on mount.
- `className: string`
  Merged onto the container via `cn`.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
const Y = 110;
const DURATION = 0.9;
const STAGGER = 0.08;
const VIEW_THRESHOLD = 0.25;

/**
 * Replace each element child of `host` with one shallow clone per visual line.
 * Text nodes sitting directly under `host` are left alone — they have no tag
 * to preserve, so the outer split handles them correctly already.
 */
function flattenChildrenToLines(host: HTMLElement): void {
  for (const child of Array.from(host.children)) {
    if (!(child instanceof HTMLElement)) continue;

    const inner = new SplitText(child, { type: 'lines' });
    // Read the line markup while the split is live, then put the child back
    // exactly as it was. Reading after revert would read the un-split child.
    const lines = inner.lines.map((line) => line.innerHTML);
    inner.revert();

    for (const markup of lines) {
      // cloneNode(false) — the tag and every attribute, none of the content.
      // cloneNode(true) would duplicate the child's entire text into each line.
      const clone = child.cloneNode(false);
      if (!(clone instanceof HTMLElement)) continue;
      clone.innerHTML = markup;
      host.insertBefore(clone, child);
    }
    host.removeChild(child);
  }
}

export function NestedSplitRestore({
  children,
  type = 'lines',
  mask = true,
  nested = true,
  y = Y,
  duration = DURATION,
  stagger = STAGGER,
  delay = 0,
  startOnView = true,
  className,
}: NestedSplitRestoreProps) {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { inView } = useInView(root, { threshold: VIEW_THRESHOLD, once: true });

  useEffect(() => {
    const el = root.current;
    // Reduced motion never splits at all. The markup React rendered is the
    // finished state, and leaving it untouched is both the accessible answer
    // and the fast one.
    if (!el || reduced) return;
    if (startOnView && !inView) return;

    gsap.registerPlugin(SplitText);

    // Captured before the pre-pass, not after. This string is the contract.
    const originalHTML = el.innerHTML;

    let cancelled = false;
    let split: SplitText | null = null;
    let ctx: gsap.Context | null = null;

    const build = () => {
      if (cancelled) return;

      if (nested) flattenChildrenToLines(el);

      const s = new SplitText(el, {
        type,
        mask: mask ? 'lines' : undefined,
        linesClass: 'kinetic-split-line',
        // SplitText restores the original text to the accessibility tree
        // itself; without this the reveal is read out one line per node.
        aria: 'auto',
      });
      split = s;

      ctx = gsap.context(() => {
        gsap.from(s.lines, {
          yPercent: y,
          duration,
          stagger,
          delay,
          ease: 'power3.out',
        });
      }, el);
    };

    // Measuring line boxes before the webfont arrives measures the fallback,
    // so the lines break in the wrong places and never re-flow. See
    // `font-safe-text-split` for the full resize and late-font lifecycle.
    void document.fonts.ready.then(build);

    return () => {
      cancelled = true;
      // Order matters. The context reverts the tween's inline styles while the
      // split nodes still exist; reverting the split first would leave those
      // styles orphaned on nodes GSAP can no longer find.
      ctx?.revert();
      split?.revert();
      // The true restore. Only writes when something actually differs, so the
      // no-pre-pass case hands React back the very nodes it created.
      if (el.innerHTML !== originalHTML) el.innerHTML = originalHTML;
    };
  }, [
    children,
    type,
    mask,
    nested,
    y,
    duration,
    stagger,
    delay,
    startOnView,
    inView,
    reduced,
  ]);
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** A `cancelled` flag guards the async `document.fonts.ready` boundary. Teardown then runs `ctx.revert()` (kills the tweens and strips their inline styles while the split nodes still exist), `split.revert()`, and finally an explicit `el.innerHTML = originalHTML` when the two differ — the true restore.

**Reduced motion.** No split happens at all — the effect returns before touching the DOM. The markup React rendered is the finished state, so the text is fully visible and fully semantic on first paint, with every `<em>` and `<a>` intact. This is both the accessible answer and the fast one.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Trusting `revert()` to restore the original markup after a nested pre-pass. SplitText snapshots `innerHTML` at construction, which by then is your intermediate line markup — `revert()` faithfully restores the wrong thing, and the `<em>` and `<a>` are gone for good.
- Splitting before the webfont loads. Lines are measured against the fallback face, so they break in the wrong places and never re-flow; the mask then clips text that has moved outside its line box. See `font-safe-text-split`.
- Using `cloneNode(true)` in the pre-pass. Each line inherits the child's full contents and the block explodes to several times its height.
- Reading the line markup after reverting the inner split. Revert restores the child to its unsplit state, so you read the whole child back and produce one "line" containing everything.
- Reverting the split before the context. GSAP's inline styles are then orphaned on nodes the context can no longer find, so a remount starts from a half-animated state.
- Letting SplitText's line divs into the accessibility tree. Without `aria: "auto"` a screen reader announces one fragment per line, mid-sentence; with it SplitText restores the original text for assistive technology.
- Splitting at all under reduced motion. There is nothing to gain and a whole DOM tree to rebuild — the markup React rendered is already the finished state.

## Notes

- This is one of the two components that deliberately use GSAP `SplitText`, because the technique *is* SplitText: nested splitting and the shortcomings of its `revert()`. `SplitText` ships inside the main `gsap` package and is free to use; it is imported from `gsap/SplitText` rather than vendored, so this is a use grant and no redistribution is involved. The other text components here split declaratively in JSX so consumers are not forced into GSAP for effects that do not need it.
- The acceptance criterion is exact and testable: after teardown, `element.innerHTML` is byte-identical to what it was before the split — tags, attributes and whitespace included, not merely visually equivalent.
- The `nested` prop can be turned off for a single flat paragraph, in which case the pre-pass is skipped and the restore write never fires because the strings already match.

## Definition of done

Record `element.innerHTML` before mounting, unmount, and compare: the two strings are byte-identical, including the `<em>` and `<a>` tags and their attributes. Visually, lines rise from behind their own mask edge, staggered, with no character visible below the mask on the first frame. A screen reader reads the paragraph as continuous prose rather than as one fragment per line. With reduced motion enabled the paragraph is fully rendered on first paint and the DOM is never modified.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
