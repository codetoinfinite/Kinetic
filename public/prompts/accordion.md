# Build: Accordion

Stacked sections for FAQs, settings groups and order details. `Accordion` is React Aria's `DisclosureGroup` and each `AccordionItem` is a `Disclosure`, so every header is a real button inside a heading with `aria-expanded`, and a collapsed panel stays searchable by find-in-page. Opening is pure CSS: React Aria measures the panel into `--disclosure-panel-height`, the panel eases to that height over 300ms while the body fades in, drops 4px and sharpens from a 4px blur, and the indicator turns with it. Three looks share the code: hairline-divided rows, the landing FAQ's tray of rounded cards, and one bordered card per item.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Sections that expand in place in divided, contained and separated styles, with an eased height and a blur-in body, on React Aria.

- Category: display
- Runtime cost: css
- Dependencies: @remixicon/react@^4.9.0, react-aria-components@^1.22.1

## How it works

1. `Accordion` renders `AriaDisclosureGroup` with all props passed through (`defaultExpandedKeys`, `expandedKeys`, `allowsMultipleExpanded`, `onExpandedChange`) and puts `{ variant, indicator }` in a context, so items style themselves without prop drilling.
2. `AccordionItem` renders `AriaDisclosure` with `group/item`, then an `AriaHeading` (level 3 by default) holding an `AriaButton slot="trigger"`: optional icon, title in `text-headline-medium`, optional description, and the indicator icon. Keyboard focus shows an inset 2px focus ring.
3. The indicator is `RiArrowDownSLine` or `RiAddLine`. On `group-data-[expanded]/item` it rotates 180deg (chevron) or 45deg (plus turns into a close) and darkens from tertiary to primary icon colour, over 300ms.
4. `AriaDisclosurePanel` gets `h-(--disclosure-panel-height) overflow-clip transition-[height] duration-300`. React Aria's `useDisclosure` writes the measured content height into that custom property, so the height eases between 0 and the real size.
5. The body inside starts at `opacity-0` and, when motion is allowed, `-translate-y-1 blur-[4px]`. On expand it goes to `opacity-100 translate-y-0 blur-[0px]` with the same 300ms curve.
6. Variant classes come from a `sortCx` map: `divided` uses `divide-y divide-separator-border`; `contained` is a `rounded-[26px]` tray with 3px gaps holding `rounded-[23px]` cards (surfaces swap in dark mode); `separated` is `gap-2` between `rounded-2xl` bordered cards with `shadow-xs`.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `EASE = cubic-bezier(0.22, 1, 0.36, 1), 300ms`
  A fast-out, soft-landing curve shared with the agent limits card and Tree View, used on the height, the body fade and the indicator turn so they move as one.
- `body entrance = opacity 0 → 1, translate-y -4px → 0, blur 4px → 0`
  The text settles into place as the panel opens instead of being revealed by the clip edge alone.
- `contained radii = tray rounded-[26px] p-[3px]; card rounded-[23px]`
  The card radius is the tray radius minus its 3px padding, so the curves stay concentric.
- `indicator turn = chevron rotate-180; plus rotate-45`
  A chevron points back up; a plus rotated 45deg reads as a close mark.

## API

```ts
type AccordionVariant = "divided" | "contained" | "separated"
interface AccordionProps extends Omit<DisclosureGroupProps, "className" | "children"> { variant?: AccordionVariant; indicator?: "chevron" | "plus"; className?: string; children: ReactNode }
interface AccordionItemProps extends Omit<DisclosureProps, "className" | "children"> { title: ReactNode; description?: ReactNode; icon?: ComponentType<{ className?: string }>; headingLevel?: 2 | 3 | 4 | 5 | 6; className?: string; children: ReactNode }
function Accordion(props: AccordionProps): JSX.Element
function AccordionItem(props: AccordionItemProps): JSX.Element
```

- `variant: "divided" | "contained" | "separated"` — default `"divided"`
  Accordion: hairline rows, a tray of cards, or one bordered card per item.
- `indicator: "chevron" | "plus"` — default `"chevron"`
  Accordion: chevron that flips, or plus that turns into a close.
- `defaultExpandedKeys / expandedKeys: Iterable<Key>`
  Accordion: uncontrolled or controlled open items (React Aria).
- `allowsMultipleExpanded: boolean` — default `false`
  Accordion: let several items stay open (React Aria).
- `id: Key`
  AccordionItem: key matched by the expanded keys.
- `title: ReactNode`
  AccordionItem: header text inside the trigger button.
- `description: ReactNode`
  AccordionItem: supporting line under the title.
- `icon: ComponentType`
  AccordionItem: Remix Icon shown before the title.
- `headingLevel: 2 | 3 | 4 | 5 | 6` — default `3`
  AccordionItem: heading level wrapping the trigger.
- `isDisabled: boolean`
  AccordionItem: dims to 50% and blocks toggling (React Aria).

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function AccordionItem({
  title,
  description,
  icon: Icon,
  headingLevel = 3,
  className,
  children,
  ...props
}: AccordionItemProps) {
  const { variant, indicator } = useContext(AccordionContext);
  const Indicator = indicator === "plus" ? RiAddLine : RiArrowDownSLine;

  return (
    <AriaDisclosure
      {...props}
      className={cx("group/item data-[disabled]:opacity-50", styles.item[variant], className)}
    >
      <AriaHeading level={headingLevel} className="flex">
        <AriaButton
          slot="trigger"
          className={({ isFocusVisible }) =>
            cx(
              "group/trigger flex w-full cursor-pointer items-center gap-3 text-start outline-none",
              "disabled:cursor-not-allowed",
              isFocusVisible && "ring-2 ring-border-focus-ring ring-inset",
              styles.trigger[variant],
            )
          }
        >
          {Icon ? <Icon className="size-5 shrink-0 text-foreground-icon-secondary" aria-hidden /> : null}
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-headline-medium text-text-primary">{title}</span>
            {description ? <span className="text-body-regular text-text-secondary">{description}</span> : null}
          </span>
          <Indicator
            aria-hidden
            className={cx(
              "size-5 shrink-0 text-foreground-icon-tertiary transition-[rotate,color] duration-300 motion-reduce:transition-none",
              EASE,
              "group-hover/trigger:text-foreground-icon-secondary group-data-[expanded]/item:text-foreground-icon-primary",
              indicator === "plus" ? "group-data-[expanded]/item:rotate-45" : "group-data-[expanded]/item:rotate-180",
            )}
          />
        </AriaButton>
      </AriaHeading>
      <AriaDisclosurePanel
        className={cx("h-(--disclosure-panel-height) overflow-clip transition-[height] duration-300 motion-reduce:transition-none", EASE)}
      >
        <div
          className={cx(
            "text-body-regular text-text-secondary",
            "opacity-0 transition-[opacity,translate,filter] duration-300 motion-reduce:transition-none",
            "motion-safe:-translate-y-1 motion-safe:blur-[4px]",
            "group-data-[expanded]/item:translate-y-0 group-data-[expanded]/item:opacity-100 group-data-[expanded]/item:blur-[0px]",
            EASE,
            styles.content[variant],
          )}
        >
          {children}
        </div>
      </AriaDisclosurePanel>
    </AriaDisclosure>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing to clean up. React Aria owns the expanded state and the panel measurement; the component adds no listeners or timers.

**Reduced motion.** Every transition carries `motion-reduce:transition-none`, and the body's 4px drop and blur are applied only under `motion-safe:`. With reduced motion the panel snaps open, the text appears in place, and the indicator jumps to its turned angle.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Give every `AccordionItem` a stable `id`. `defaultExpandedKeys` and `expandedKeys` match on it.
- Do not animate the panel with `max-height` or JS. The height comes from `--disclosure-panel-height`, which React Aria keeps up to date when the content changes.
- The group allows one open item at a time by default. Pass `allowsMultipleExpanded` for settings groups where several can stay open.
- Pick `headingLevel` to fit the page outline; the default h3 is wrong under an h1-only page.
- Do not put interactive controls inside `title` or `description`. They render inside the trigger button.

## Notes

- A collapsed panel uses `hidden="until-found"` (set by React Aria's `useDisclosure`), so the browser's find-in-page can reach hidden text and expand its section.
- The `separated` card uses `bg-background-full` (the modal ground) rather than the card surface, so inputs and switch tracks inside keep an edge in dark mode.

## Definition of done

A contained accordion with `indicator="plus"` and `defaultExpandedKeys={["billing"]}` shows three rounded cards on a tray with the first open and its plus turned into a close. Clicking the second header closes the first and opens the second: its height eases over about 300ms and its text fades in from a slight blur while dropping 4px. Each header is a button with `aria-expanded` inside an h3, Enter and Space toggle it, and find-in-page for text in a closed panel opens that panel. With reduced motion everything snaps.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
