# Build: Typography

A docs specimen for the kit composite text utilities (`text-{family}-{weight}`). Each family gets a heading with its size, line height and tracking, a one-line usage note, and a bordered card with one row per weight: the sample sentence on the left, and the class name and weight on the right. The numbers are not typed into the component. They are read with `getComputedStyle` from the rendered rows, so the specimen always shows what the theme CSS resolves to. Clicking a class name copies it.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Type-scale specimen of the 13 kit text families in four weights, with size and line height read from the live CSS and copyable class names.

- Category: display
- Runtime cost: css
- Dependencies: @remixicon/react@^4.9.0

## How it works

1. `TYPE_SCALE` lists the 13 families from Large Title to Caption 2. Each has its four class names written out in full (`text-body-medium`, not `text-body-${w}`), because Tailwind only emits utilities it finds as literal strings in the source.
2. `TypeFamilySection` renders one `<li>` per requested weight. The sample `<p>` gets the composite class and a callback ref stored in `sampleRefs[i]`.
3. After mount, and again whenever the family or the weight list changes, an effect runs `readTypeMetrics` on every sample element. It turns `fontSize`, `lineHeight`, `letterSpacing` and `fontWeight` into numbers and stores them in state. A window `resize` listener re-reads them, because zoom and responsive root sizes arrive that way.
4. `formatFamilyMetrics` builds the header string from the measured rows, for example `18px / 24–26px` for Title 3. It shows a range when the weights have different line heights, and adds `· tracking 0.15px` when letter spacing is not zero. Each row shows its own measured weight number next to the weight name.
5. `TokenCopy` is a mono button holding the class name. It copies through `useCopyToClipboard` and shows a lime check for 1.4s. `Typography` stacks one section per family id with a 40px gap.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `families = 13 × 4 weights = 52 utilities`
  This mirrors the `@theme` block in boardui-theme.css. A family missing from `TYPE_SCALE` would never be emitted, because its class names would appear nowhere in the source.
- `row = px-4 py-4, 1px border-button-default between rows, rounded-2xl card`
  This matches the reference card. The divider and corner radius are the same ones the code block and install box use.
- `metric header = font-mono caption-1, text-tertiary`
  Measured numbers read as data next to the title-2 family name, the same as the reference "64px / 80px".
- `copy reset = 1400 ms`
  The check only needs to confirm the click, and many class names get copied in a row.

## API

```ts
type TypeWeight = "regular" | "medium" | "semibold" | "bold";
function Typography(props: { families?: readonly string[]; weights?: readonly TypeWeight[]; sample?: string; headingLevel?: 2 | 3 | 4; className?: string; ref?: Ref<HTMLDivElement> }): JSX.Element
function TypeFamilySection(props: { family: TypeFamily; weights?: readonly TypeWeight[]; sample?: string; headingLevel?: 2 | 3 | 4; className?: string }): JSX.Element
function readTypeMetrics(element: Element): { fontSize: number; lineHeight: number; letterSpacing: number; fontWeight: number }
const TYPE_SCALE: readonly TypeFamily[]
```

- `families: readonly string[]` — default `all 13`
  Family ids to show (`large-title`, `display-1` … `caption-2`), kept in scale order.
- `weights: readonly TypeWeight[]` — default `["regular", "medium", "semibold", "bold"]`
  Weights shown in each family card.
- `sample: string` — default `"The five boxing wizards jump quickly."`
  Sentence rendered in every row.
- `headingLevel: 2 | 3 | 4` — default `3`
  Heading level of each family name.
- `className: string`
  Extra classes on the outer stack.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
// Metrics come from getComputedStyle on the rendered sample, not from a
// table in this file, so the specimen always shows what the theme CSS
// really resolves to (including a rem change or an overridden token).
useEffect(() => {
  const read = () =>
    setMetrics(
      weightKey.split(",").map((_, i) => {
        const el = sampleRefs.current[i];
        return el ? readTypeMetrics(el) : null;
      }),
    );
  read();
  // Page zoom and responsive root sizes arrive as a resize; re-read then.
  window.addEventListener("resize", read);
  return () => window.removeEventListener("resize", read);
}, [family.id, weightKey]);
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Each family section adds one window `resize` listener in its effect and removes it on unmount or before the next run. The copy reset timer in `useCopyToClipboard` is cleared on unmount.

**Reduced motion.** Nothing moves. Only the copy button hover colour transitions, and it has `motion-reduce:transition-none`.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Building class names with template strings (`text-${family}-${weight}`). Tailwind never sees them, the utilities are not generated, and every row renders in the inherited body size.
- Measuring in render or during SSR. `getComputedStyle` only exists after layout. Measuring in an effect means the server and the first client render both show a placeholder, so hydration still matches.
- Trusting a hard-coded metrics table. Title 3 uses a 24px line height for regular and 26px for heavier weights, and a table drifts as soon as a token changes. Reading the CSS keeps the specimen correct.

## Notes

- `readTypeMetrics` and `formatFamilyMetrics` are exported for other token docs, for example a size badge next to a heading in a design review.
- Pass `families={["body", "body-2"]}` and `weights={["regular", "medium"]}` to show a focused subset in a component page.

## Definition of done

Rendering `<Typography families={["title-3"]} />` shows a "Title 3" heading followed by `18px / 24–26px`, and four rows whose samples are visibly 18px regular, medium, semibold and bold. The rows are labelled `text-title-3-regular` … `text-title-3-bold` with "Regular · 400" … "Bold · 700". Caption 1 shows `12px / 16px · tracking 0.15px`. Clicking a class name puts that exact string on the clipboard and shows a check. Changing `sample` updates every row, and switching families re-measures the header.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
