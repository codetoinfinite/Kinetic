/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Not Found Page" (boardui.com (404 page)).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'not-found-page',
  title: 'Not Found Page',
  category: 'block',
  kit: 'boardui',
  tags: ['404', 'error', 'empty state', 'navigation', 'page', 'boardui'],
  blurb:
    'A 404 block: big error code, the missing path, home and browse actions, suggested page cards and an agent footnote, staggered in.',
  cost: 'css',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/not-found-page.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['@remixicon/react@^4.9.0'],

  summary:
    'The page a site shows when a link leads nowhere. A large gradient error code sits over a small "Error 404 · /the/path" line, so the visitor sees what they asked for. Below them come the title, a plain explanation and two ways out: Back home and Browse components. A grid of suggested destination cards follows, and an optional footnote, here machine-readable entry points for agents. Every link reports through `onNavigate`, so a client router can take over.',

  mechanism: [
    'The root is an `@container` `<section>` with a centred `max-w-[672px]` column, so the block sizes by its own width, not the viewport. The destination grid goes from one column to two at `@xl`. The code grows from Display 2 to the 4rem Large Title, and the title from Display 4 to Display 3, at the same breakpoint.',
    'The code is decorative (`aria-hidden`) and painted with `bg-linear-to-b from-text-primary to-text-tertiary bg-clip-text text-transparent`. Both stops are theme tokens, so the fade flips with dark mode. The readable "Error 404" and the path in `<code>` sit on the caption line under it.',
    'The entry is pure CSS. Each band gets `transition-[opacity,translate] duration-500 ease-out` with `starting:opacity-0 starting:translate-y-2`, so the browser animates from the `@starting-style` values on first render. A step index picks a static `delay-*` class (0 to 500ms): the code, then the caption and title, the description, the actions, the card rows and the footnote.',
    'Destination cards are `<a>` elements in a `<ul>` inside `<nav aria-label="Suggested pages">`. The whole card is the link target, hover lifts the surface to `background-secondary-hover`, and the arrow after the title nudges 2px (mirrored under RTL with `directionalIconClass`).',
    'The actions are kit `ButtonLink`s: primary with a leading back arrow (which flips in RTL) and secondary with a grid icon. The footnote styles any `<code>` and `<a>` in its body through arbitrary child variants, and renders its links as mono underlined entries followed by "— description".',
  ],

  constants: [
    {
      name: 'column',
      value: 'max-w-[672px], py-12 → py-20 at @3xl',
      why: 'At this width the description stays under about 75 characters a line at the 20px size, and two cards sit side by side at about 320px each.',
    },
    {
      name: 'entry',
      value: '500ms ease-out, 8px rise, delays 0, 75, 150, 200, 300, 400, 500ms',
      why: 'Short enough that the page is settled before the visitor has read the title, and the stagger reads top to bottom without feeling like a sequence to wait for.',
    },
    {
      name: 'code size',
      value: 'Display 2 (3rem) → Large Title (4rem) at @xl',
      why: 'The code is the first thing the eye lands on, but it stays smaller than a hero headline, so the title and the ways out keep the weight.',
    },
  ],

  pitfalls: [
    'Building the stagger delay with string interpolation (`delay-${n}`). Tailwind only generates classes it can see, so the delays silently vanish. The delays live in a static array.',
    'Making the big code the only place the error appears. It is decorative and `aria-hidden`, so screen readers would never hear "404". The caption line carries it as text.',
    'Returning a 404 page with a 200 status. The block is visual only. In Next.js render it from `not-found.tsx` (or call `notFound()`), so the response status is 404 and crawlers drop the URL.',
    'Running the entry with JavaScript on mount. A hydration-timed fade flashes the content in and out on slow devices. `@starting-style` runs on first style resolution, with no effect and no state.',
  ],

  notes: [
    'Pass `onNavigate={(href, e) => { e.preventDefault(); router.push(href) }}` for client routing. It covers the actions, the cards and the footnote links. Links inside a custom `footnote.body` are yours to wire.',
    'Pass the requested pathname as `path` (for example from `usePathname()`), so visitors can spot a typo.',
    'Set `homeAction={false}` or `browseAction={false}` to drop a button, and leave `destinations` empty to hide the grid.',
  ],

  apiSignature:
    'function NotFoundPage(props: { code?: string; path?: string; title?: ReactNode; description?: ReactNode; homeAction?: { label: string; href: string } | false; browseAction?: { label: string; href: string } | false; destinations?: { title: string; description: string; href: string; icon?: ComponentType }[]; footnote?: { title: string; body?: ReactNode; links?: { label: string; href: string; description?: string }[] }; onNavigate?: (href: string, event: MouseEvent<HTMLAnchorElement>) => void; className?: string }): JSX.Element',

  props: [
    { name: 'code', type: 'string', default: '"404"', description: 'The big error code, also shown as "Error {code}" in the caption.' },
    { name: 'path', type: 'string', description: 'The requested path, shown in mono after the code.' },
    { name: 'title', type: 'ReactNode', default: '"Page not found"', description: 'The h1.' },
    { name: 'description', type: 'ReactNode', description: 'The explanation under the title.' },
    { name: 'homeAction', type: '{ label, href } | false', default: '{ label: "Back home", href: "/" }', description: 'Primary button with a back arrow.' },
    { name: 'browseAction', type: '{ label, href } | false', default: '{ label: "Browse components", href: "/components" }', description: 'Secondary button with a grid icon.' },
    { name: 'destinations', type: 'NotFoundDestination[]', default: '[]', description: '`{ title, description, href, icon? }` cards in a two-column grid.' },
    { name: 'footnote', type: 'NotFoundFootnote', description: '`{ title, body?, links?: { label, href, description? }[] }`, shown under a divider.' },
    { name: 'onNavigate', type: '(href, event) => void', description: 'Called for every link the block renders. `preventDefault()` there to route client-side.' },
    { name: 'className', type: 'string', description: 'Classes for the root section.' },
  ],

  reducedMotion:
    'Every band has `motion-reduce:transition-none`, so under prefers-reduced-motion the `@starting-style` values never animate and the page renders settled. The card arrow nudge is removed (`motion-reduce:group-hover:translate-x-0`) and hover colours change instantly.',

  cleanup:
    'There are no effects, timers or listeners. The entry is CSS `@starting-style` transitions, and the only handlers are React `onClick` props on the links.',

  acceptance:
    'At 1280px a gradient "404" sits over "Error 404 · /charts/bubble-chart", then "Page not found", the explanation, and Back home and Browse components buttons. Four cards follow in two columns (Components, Documentation, Installation, MCP server), then the "Reading this site as an agent" footnote with four mono links. On load the bands rise in top to bottom. Clicking any link calls `onNavigate` with its href (the demo status reads "Would open /components"). Under reduced motion nothing moves. At 360px the cards stack in one column.',

  criticalRegion: 'critical',
};

export default meta;
