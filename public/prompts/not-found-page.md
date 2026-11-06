# Build: Not Found Page

The page a site shows when a link leads nowhere. A large gradient error code sits over a small "Error 404 · /the/path" line, so the visitor sees what they asked for. Below them come the title, a plain explanation and two ways out: Back home and Browse components. A grid of suggested destination cards follows, and an optional footnote, here machine-readable entry points for agents. Every link reports through `onNavigate`, so a client router can take over.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A 404 block: big error code, the missing path, home and browse actions, suggested page cards and an agent footnote, staggered in.

- Category: block
- Runtime cost: css
- Dependencies: @remixicon/react@^4.9.0

## How it works

1. The root is an `@container` `<section>` with a centred `max-w-[672px]` column, so the block sizes by its own width, not the viewport. The destination grid goes from one column to two at `@xl`. The code grows from Display 2 to the 4rem Large Title, and the title from Display 4 to Display 3, at the same breakpoint.
2. The code is decorative (`aria-hidden`) and painted with `bg-linear-to-b from-text-primary to-text-tertiary bg-clip-text text-transparent`. Both stops are theme tokens, so the fade flips with dark mode. The readable "Error 404" and the path in `<code>` sit on the caption line under it.
3. The entry is pure CSS. Each band gets `transition-[opacity,translate] duration-500 ease-out` with `starting:opacity-0 starting:translate-y-2`, so the browser animates from the `@starting-style` values on first render. A step index picks a static `delay-*` class (0 to 500ms): the code, then the caption and title, the description, the actions, the card rows and the footnote.
4. Destination cards are `<a>` elements in a `<ul>` inside `<nav aria-label="Suggested pages">`. The whole card is the link target, hover lifts the surface to `background-secondary-hover`, and the arrow after the title nudges 2px (mirrored under RTL with `directionalIconClass`).
5. The actions are kit `ButtonLink`s: primary with a leading back arrow (which flips in RTL) and secondary with a grid icon. The footnote styles any `<code>` and `<a>` in its body through arbitrary child variants, and renders its links as mono underlined entries followed by "— description".

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `column = max-w-[672px], py-12 → py-20 at @3xl`
  At this width the description stays under about 75 characters a line at the 20px size, and two cards sit side by side at about 320px each.
- `entry = 500ms ease-out, 8px rise, delays 0, 75, 150, 200, 300, 400, 500ms`
  Short enough that the page is settled before the visitor has read the title, and the stagger reads top to bottom without feeling like a sequence to wait for.
- `code size = Display 2 (3rem) → Large Title (4rem) at @xl`
  The code is the first thing the eye lands on, but it stays smaller than a hero headline, so the title and the ways out keep the weight.

## API

```ts
function NotFoundPage(props: { code?: string; path?: string; title?: ReactNode; description?: ReactNode; homeAction?: { label: string; href: string } | false; browseAction?: { label: string; href: string } | false; destinations?: { title: string; description: string; href: string; icon?: ComponentType }[]; footnote?: { title: string; body?: ReactNode; links?: { label: string; href: string; description?: string }[] }; onNavigate?: (href: string, event: MouseEvent<HTMLAnchorElement>) => void; className?: string }): JSX.Element
```

- `code: string` — default `"404"`
  The big error code, also shown as "Error {code}" in the caption.
- `path: string`
  The requested path, shown in mono after the code.
- `title: ReactNode` — default `"Page not found"`
  The h1.
- `description: ReactNode`
  The explanation under the title.
- `homeAction: { label, href } | false` — default `{ label: "Back home", href: "/" }`
  Primary button with a back arrow.
- `browseAction: { label, href } | false` — default `{ label: "Browse components", href: "/components" }`
  Secondary button with a grid icon.
- `destinations: NotFoundDestination[]` — default `[]`
  `{ title, description, href, icon? }` cards in a two-column grid.
- `footnote: NotFoundFootnote`
  `{ title, body?, links?: { label, href, description? }[] }`, shown under a divider.
- `onNavigate: (href, event) => void`
  Called for every link the block renders. `preventDefault()` there to route client-side.
- `className: string`
  Classes for the root section.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/** Entry stagger: each band starts 8px low and transparent, then settles. Static strings so Tailwind sees them. */
const STEP_DELAYS = ["delay-0", "delay-75", "delay-150", "delay-200", "delay-300", "delay-[400ms]", "delay-500"] as const;

function rise(step: number) {
  return cx(
    "transition-[opacity,translate] duration-500 ease-out starting:translate-y-2 starting:opacity-0 motion-reduce:transition-none",
    STEP_DELAYS[Math.min(step, STEP_DELAYS.length - 1)],
  );
}

function DestinationCard({
  item,
  step,
  onNavigate,
}: {
  item: NotFoundDestination;
  step: number;
  onNavigate?: NotFoundPageProps["onNavigate"];
}) {
  const Icon = item.icon;
  return (
    <li className={rise(step)}>
      <a
        href={item.href}
        data-destination=""
        onClick={(event) => onNavigate?.(item.href, event)}
        className="group flex h-full items-start gap-3 rounded-xl border border-border-component-detail-container bg-background-secondary-default p-4 outline-none transition-colors duration-150 ease-out hover:bg-background-secondary-hover focus-visible:ring-2 focus-visible:ring-border-focus-ring motion-reduce:transition-none"
      >
        {Icon ? (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border-button-default bg-background-primary-default shadow-xs">
            <Icon aria-hidden className="size-[18px] text-foreground-icon-secondary" />
          </span>
        ) : null}
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1 text-headline-semibold text-text-primary">
            {item.title}
            <RiArrowRightLine
              aria-hidden
              className={cx(
                "size-4 text-foreground-icon-tertiary transition-[translate,color] duration-150 ease-out group-hover:translate-x-0.5 group-hover:text-foreground-icon-secondary motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 rtl:group-hover:-translate-x-0.5",
                directionalIconClass(RiArrowRightLine),
              )}
            />
          </span>
          <span className="mt-1 block text-body-regular text-text-secondary">{item.description}</span>
        </span>
      </a>
    </li>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** There are no effects, timers or listeners. The entry is CSS `@starting-style` transitions, and the only handlers are React `onClick` props on the links.

**Reduced motion.** Every band has `motion-reduce:transition-none`, so under prefers-reduced-motion the `@starting-style` values never animate and the page renders settled. The card arrow nudge is removed (`motion-reduce:group-hover:translate-x-0`) and hover colours change instantly.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Building the stagger delay with string interpolation (`delay-${n}`). Tailwind only generates classes it can see, so the delays silently vanish. The delays live in a static array.
- Making the big code the only place the error appears. It is decorative and `aria-hidden`, so screen readers would never hear "404". The caption line carries it as text.
- Returning a 404 page with a 200 status. The block is visual only. In Next.js render it from `not-found.tsx` (or call `notFound()`), so the response status is 404 and crawlers drop the URL.
- Running the entry with JavaScript on mount. A hydration-timed fade flashes the content in and out on slow devices. `@starting-style` runs on first style resolution, with no effect and no state.

## Notes

- Pass `onNavigate={(href, e) => { e.preventDefault(); router.push(href) }}` for client routing. It covers the actions, the cards and the footnote links. Links inside a custom `footnote.body` are yours to wire.
- Pass the requested pathname as `path` (for example from `usePathname()`), so visitors can spot a typo.
- Set `homeAction={false}` or `browseAction={false}` to drop a button, and leave `destinations` empty to hide the grid.

## Definition of done

At 1280px a gradient "404" sits over "Error 404 · /charts/bubble-chart", then "Page not found", the explanation, and Back home and Browse components buttons. Four cards follow in two columns (Components, Documentation, Installation, MCP server), then the "Reading this site as an agent" footnote with four mono links. On load the bands rise in top to bottom. Clicking any link calls `onNavigate` with its href (the demo status reads "Would open /components"). Under reduced motion nothing moves. At 360px the cards stack in one column.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
