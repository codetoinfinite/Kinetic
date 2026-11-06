# Build: GitHub Stars CTA

A two-column landing block. The left side has a pill eyebrow, a large heading ("The free tier lives on GitHub" by default), a paragraph, a checklist and an optional secondary link. The right side is a repo card: an accent gradient band with a faded dot grid, a repository glyph tile overlapping the band, the owner / name in mono with a Public pill, the description, a stats panel with a large star count and a Star button, and a row of forks, license and language.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Open-source free tier section: copy and checklist beside a repo card with a counting star total, star button and repo facts.

- Category: block
- Runtime cost: dom
- Dependencies: @remixicon/react@^4.9.0

## How it works

1. The section is a size container. Below `@4xl` the copy and card stack; from `@4xl` they sit in a `minmax(0,1fr) minmax(0,420px)` grid, so the layout follows the space it is given rather than the window.
2. The star total counts up once: `useCountUp` resets the shown value to 0 in a layout effect (before first paint), then an `IntersectionObserver` at 40% visibility starts a `requestAnimationFrame` loop that eases from 0 to `stars` over `COUNT_MS` with an ease-out cubic, `1 - (1 - t)^3`. The observer disconnects on first sight, so scrolling back does not replay it.
3. Only the small `StarCount` component re-renders per frame. Its visible digits are `aria-hidden`; a visually hidden sibling always holds the final "12,480 stars" text, so screen readers never hear the intermediate numbers.
4. All numbers go through one `Intl.NumberFormat("en-US")`, so server and client format the same way and hydration matches whatever the visitor locale is.
5. The band art is CSS only: a `bg-linear-to-br` accent gradient into the card surface, and a dot grid drawn with a `radial-gradient(currentColor ...)` background tinted `accent-500/35` and faded with `mask-l-from-10% mask-l-to-90%`.
6. Repo facts are a `dl` with icon `dt`s carrying sr-only labels (Forks, License, Language); missing fields are left out.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `COUNT_MS = 1200`
  Long enough to read as counting, short enough to finish before the eye moves to the button.
- `IntersectionObserver threshold = 0.4`
  The count starts once the stats panel is clearly on screen, not while it is a sliver at the fold.
- `card column = minmax(0, 420px)`
  A repo card wider than this turns into a long, sparse strip; the copy column takes the rest.

## API

```ts
function GithubStarsCta(props: { repo: GithubRepo; eyebrow?: ReactNode; title?: ReactNode; description?: ReactNode; points?: ReactNode[]; secondaryAction?: { label: string; href: string }; className?: string }): JSX.Element
interface GithubRepo { owner: string; name: string; href: string; description?: string; stars: number; forks?: number; license?: string; language?: string }
```

- `repo: GithubRepo`
  Owner, name, link, star total and optional description, forks, license and language.
- `eyebrow: ReactNode` — default `"Open source"`
  Pill above the heading; pass null to hide it.
- `title: ReactNode` — default `"The free tier lives on GitHub"`
  Section heading.
- `description: ReactNode`
  Paragraph under the heading; a default about the public MIT repo is provided.
- `points: ReactNode[]`
  Checklist items under the paragraph.
- `secondaryAction: { label: string; href: string }`
  Secondary link button under the checklist.
- `className: string`
  Merged onto the section.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/** Counts from 0 to `target` the first time `ref` is 40% visible. Reduced motion shows the target at once. */
function useCountUp(target: number, ref: RefObject<HTMLElement | null>) {
  const [value, setValue] = useState(target);

  // Layout effect: the reset to 0 lands before the first paint, so the final number never flashes first.
  useLayoutEffect(() => {
    const node = ref.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!node || reduce || typeof IntersectionObserver === "undefined") {
      setValue(target);
      return;
    }
    setValue(0);
    let frame = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, Math.max(0, (now - start) / COUNT_MS));
          setValue(Math.round(target * (1 - (1 - t) ** 3)));
          if (t < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [target, ref]);

  return value;
}

function StarCount({ stars }: { stars: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const value = useCountUp(stars, ref);
  return (
    <>
      <span ref={ref} aria-hidden className="tabular-nums">
        {numberFormat.format(value)}
      </span>
      <span className="sr-only">{numberFormat.format(stars)} stars</span>
    </>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The layout effect disconnects the IntersectionObserver and cancels any pending animation frame on unmount or when `stars` changes.

**Reduced motion.** With `prefers-reduced-motion: reduce` the star count shows the final number straight away and no animation frame is requested. Nothing else on the block moves.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Starting the count in `useEffect` from the server-rendered final value. The real number paints for one frame and then jumps to 0; resetting in a layout effect avoids the flash.
- Formatting with the visitor locale (`toLocaleString()`). Server and browser can disagree ("12,480" vs "12.480") and React reports a hydration mismatch; the formatter is pinned to en-US.
- Announcing every frame of the count. The animated digits are hidden from assistive tech and the final total is exposed separately.

## Notes

- Pass a real star count from your build step or an API route; the component does no fetching.
- Use the GitHub URL as `repo.href`; the Star button is a plain link, so add `target` handling in your app if you want a new tab.

## Definition of done

The block shows the heading, paragraph and three checks on the left and the repo card on the right at 1280px, stacked at narrow widths. When the card comes into view the star total counts from 0 to 12,480 in about a second and stops there. Forks read "642 forks", license "MIT license". The Star button and the secondary link are links with visible focus rings. With reduced motion the total is 12,480 from the start. Light and dark both keep the gradient band and dot grid visible.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
