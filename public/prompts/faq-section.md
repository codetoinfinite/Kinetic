# Build: FAQ Section

A `<section>` that pairs a heading block (eyebrow, title, copy, an optional aside) with the kit `Accordion` in its `contained` variant: white question cards on a grey tray, each with a plus that turns into a close. Below 64rem of container width it stacks and centres like the landing page. From 64rem the heading block becomes a sticky left column and the questions fill the right. The question headers also answer to the arrow, Home and End keys.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Landing FAQ: heading block plus the kit accordion tray, two-column at wide container widths, with arrow-key navigation.

- Category: block
- Runtime cost: css
- Dependencies: react-aria-components@^1.22.1

## How it works

1. The root is `@container w-full`, and every responsive switch is a container variant (`@xl:`, `@5xl:`), not a media query. The section therefore lays out by the width it is given: a scaled preview, a docs column or a full page all get the right arrangement.
2. In the `split` layout the inner wrapper is `grid grid-cols-1`, which becomes `@5xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]` with a 64px gap inside a 1120px max width. The heading block switches from `items-center text-center` to `@5xl:items-start @5xl:text-start @5xl:sticky @5xl:top-10 @5xl:self-start`, so it stays in view while a long answer list scrolls past. `self-start` is what lets sticky work inside a grid cell. `stacked` keeps the single centred 760px column at every width.
3. Questions map to `AccordionItem`s inside `<Accordion variant="contained" indicator="plus">`. The expansion props (`expandedKeys`, `defaultExpandedKeys`, `onExpandedChange`, `allowsMultipleExpanded`) pass straight through to React Aria's DisclosureGroup, so the section can be controlled or uncontrolled. Each question heading is one level below the section title (`headingLevel + 1`), and the section is `aria-labelledby` the title.
4. Every answer body is wrapped in `[data-faq-answer]`. An `onKeyDown` on the list wrapper collects `button[aria-expanded]` elements that are not disabled and not inside an answer. ArrowDown and ArrowUp move focus with wrap-around, Home and End jump to the ends, and `preventDefault` stops the page from scrolling. Keys pressed inside an answer are ignored, so a nested control keeps its own keyboard behaviour.
5. The title runs from `text-display-4-medium` (32px) up to `@xl:text-display-2-medium` (48px), with letter-spacing tightened to -0.035em at the large size. The description is capped at 440px so it wraps to two balanced lines under the title.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `split breakpoint = @5xl (64rem of container width)`
  Below about 1024px a 5:7 split leaves the question column under 560px, and the longest questions start wrapping to three lines. Above it both columns read comfortably.
- `column ratio = minmax(0,5fr) minmax(0,7fr), gap 64px, max 1120px`
  The heading column only needs to fit a two-line display title and its copy. The extra width goes to the questions. `minmax(0, …)` stops a long unbroken answer from pushing the grid wider than its container.
- `title scale = 32px → 48px at @xl, tracking -0.02em → -0.035em`
  The two-line display title from the landing page needs tight tracking at 48px to read as one block. At 32px the same tracking crowds the letters, so it eases off.
- `answer measure = max-w-[60ch]`
  In the wide right column an unbounded answer runs over 100 characters per line. 60ch keeps answers readable without changing the card width.

## API

```ts
function FaqSection(props: { items: { id: string; question: ReactNode; answer: ReactNode; isDisabled?: boolean }[]; title?: ReactNode; description?: ReactNode; eyebrow?: ReactNode; layout?: "split" | "stacked"; variant?: "divided" | "contained" | "separated"; expandedKeys?: Iterable<Key>; defaultExpandedKeys?: Iterable<Key>; onExpandedChange?: (keys: Set<Key>) => void; allowsMultipleExpanded?: boolean; aside?: ReactNode; footer?: ReactNode; headingLevel?: 2 | 3 | 4 | 5; id?: string; className?: string }): JSX.Element
```

- `items: FaqEntry[]`
  Questions in order: `{ id, question, answer, isDisabled? }`. `id` is the key that `expandedKeys` holds.
- `title: ReactNode` — default `"Frequently asked questions"`
  Section title, rendered as `h{headingLevel}` and used as the section's accessible name.
- `description: ReactNode`
  Supporting copy under the title, capped at 440px.
- `eyebrow: ReactNode`
  Small uppercase label above the title.
- `layout: "split" | "stacked"` — default `"split"`
  `split` turns two-column from 64rem of container width; `stacked` stays a centred column.
- `variant: "divided" | "contained" | "separated"` — default `"contained"`
  Accordion look, forwarded to the kit Accordion.
- `expandedKeys: Iterable<Key>`
  Controlled open question ids.
- `defaultExpandedKeys: Iterable<Key>`
  Initially open question ids when uncontrolled.
- `onExpandedChange: (keys: Set<Key>) => void`
  Called with the new set of open ids.
- `allowsMultipleExpanded: boolean` — default `false`
  Allow several answers open at once. When false, opening one closes the other.
- `aside: ReactNode`
  Content under the heading block (left column when split).
- `footer: ReactNode`
  Content under the question list.
- `headingLevel: 2 | 3 | 4 | 5` — default `2`
  Title level. Questions use the next level down.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/** Question headers of this list only: answers may hold their own disclosure buttons. */
function questionButtons(list: HTMLElement) {
  return Array.from(list.querySelectorAll<HTMLButtonElement>("button[aria-expanded]")).filter(
    (button) => !button.disabled && button.closest("[data-faq-answer]") === null,
  );
}

function moveFocus(event: KeyboardEvent<HTMLDivElement>) {
  const target = event.target as HTMLElement;
  if (target.closest("[data-faq-answer]")) return;
  const buttons = questionButtons(event.currentTarget);
  const index = buttons.indexOf(target as HTMLButtonElement);
  if (index === -1 || buttons.length === 0) return;

  let next: number;
  switch (event.key) {
    case "ArrowDown":
      next = (index + 1) % buttons.length;
      break;
    case "ArrowUp":
      next = (index - 1 + buttons.length) % buttons.length;
      break;
    case "Home":
      next = 0;
      break;
    case "End":
      next = buttons.length - 1;
      break;
    default:
      return;
  }
  event.preventDefault();
  buttons[next]?.focus();
}

export function FaqSection({
  items,
  title = "Frequently asked questions",
  description,
  eyebrow,
  layout = "split",
  variant = "contained",
  expandedKeys,
  defaultExpandedKeys,
  onExpandedChange,
  allowsMultipleExpanded = false,
  aside,
  footer,
  headingLevel = 2,
  id,
  className,
}: FaqSectionProps) {
  const autoId = useId();
  const titleId = `${id ?? autoId}-title`;
  const TitleTag = TITLE_TAGS[headingLevel];
  const questionLevel = (headingLevel + 1) as 3 | 4 | 5 | 6;

  return (
    <section id={id} aria-labelledby={titleId} className={cx("@container w-full", className)}>
      <div className={styles.grid[layout]}>
        <div className={styles.head[layout]}>
          {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
          <TitleTag id={titleId} className={styles.title}>
            {title}
          </TitleTag>
          {description ? <p className={styles.description}>{description}</p> : null}
          {aside ? <div className="mt-2 w-full max-w-[440px] text-start">{aside}</div> : null}
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <div data-faq-list="" onKeyDown={moveFocus}>
            <Accordion
              variant={variant}
              indicator="plus"
              expandedKeys={expandedKeys}
              defaultExpandedKeys={defaultExpandedKeys}
              onExpandedChange={onExpandedChange}
              allowsMultipleExpanded={allowsMultipleExpanded}
            >
              {items.map((item) => (
                <AccordionItem
                  key={item.id}
                  id={item.id}
                  title={item.question}
                  headingLevel={questionLevel}
                  isDisabled={item.isDisabled}
                >
                  <div data-faq-answer="" className="max-w-[60ch] text-pretty">
                    {item.answer}
                  </div>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
          {footer}
        </div>
      </div>
    </section>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing to clean up. The section adds one React `onKeyDown` handler and no effects, timers or observers. React Aria owns the disclosure state.

**Reduced motion.** The only motion is the accordion's own: the panel height, the content fade-and-blur and the plus rotation. All of them carry `motion-reduce:transition-none`, so answers open and close instantly. Sticky positioning is not animation and stays.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Using viewport breakpoints (`lg:`) for the split. Inside a scaled preview, a dashboard column or a modal the viewport says "wide" while the section is narrow, and the two columns crush the questions. The layout must read the container.
- Dropping `self-start` from the sticky heading. Grid items stretch to the row height by default, so a sticky element as tall as the row has nowhere to stick and scrolls away with the page.
- Finding headers with a broad `button` selector. An answer that holds its own disclosure or button would join the arrow-key cycle. Filter by `aria-expanded` and exclude anything inside `[data-faq-answer]`.
- Keeping the question headings at the same level as the section title. Screen-reader heading lists then show the questions as siblings of the section instead of its children. Use `headingLevel + 1`.

## Notes

- Pass `layout="stacked"` for the exact centred column of the landing page at every width. The `aside` slot sits under the heading in either layout, which suits a contact card or an expand-all control.
- Collapsed answers use React Aria's `hidden="until-found"`, so the browser's find-in-page still searches them and opens the matching row.

## Definition of done

In a container at least 1024px wide the title and copy sit in a left column and the nine questions run down the right column. Below that width everything centres in one column. Clicking a question opens its answer and turns its plus into a close. With `allowsMultipleExpanded` false, opening a second question closes the first. With a header focused, ArrowDown and ArrowUp move focus to the next and previous header (wrapping), Home and End jump to the ends, and Enter toggles the focused one. Expanding all from controlled state shows every answer.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
