/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "GitHub Stars CTA" (boardui.com/).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'github-stars-cta',
  title: 'GitHub Stars CTA',
  category: 'block',
  kit: 'boardui',
  tags: ['github', 'open-source', 'cta', 'landing', 'count-up', 'boardui'],
  blurb:
    'Open-source free tier section: copy and checklist beside a repo card with a counting star total, star button and repo facts.',
  cost: 'dom',
  motif: 'split',

  files: [
    { path: 'registry/ui/github-stars-cta.tsx', type: 'registry:ui', role: 'component' },
  ],
  dependencies: ['@remixicon/react@^4.9.0'],

  summary:
    'A two-column landing block. The left side has a pill eyebrow, a large heading ("The free tier lives on GitHub" by default), a paragraph, a checklist and an optional secondary link. The right side is a repo card: an accent gradient band with a faded dot grid, a repository glyph tile overlapping the band, the owner / name in mono with a Public pill, the description, a stats panel with a large star count and a Star button, and a row of forks, license and language.',

  mechanism: [
    'The section is a size container. Below `@4xl` the copy and card stack; from `@4xl` they sit in a `minmax(0,1fr) minmax(0,420px)` grid, so the layout follows the space it is given rather than the window.',
    'The star total counts up once: `useCountUp` resets the shown value to 0 in a layout effect (before first paint), then an `IntersectionObserver` at 40% visibility starts a `requestAnimationFrame` loop that eases from 0 to `stars` over `COUNT_MS` with an ease-out cubic, `1 - (1 - t)^3`. The observer disconnects on first sight, so scrolling back does not replay it.',
    'Only the small `StarCount` component re-renders per frame. Its visible digits are `aria-hidden`; a visually hidden sibling always holds the final "12,480 stars" text, so screen readers never hear the intermediate numbers.',
    'All numbers go through one `Intl.NumberFormat("en-US")`, so server and client format the same way and hydration matches whatever the visitor locale is.',
    'The band art is CSS only: a `bg-linear-to-br` accent gradient into the card surface, and a dot grid drawn with a `radial-gradient(currentColor ...)` background tinted `accent-500/35` and faded with `mask-l-from-10% mask-l-to-90%`.',
    'Repo facts are a `dl` with icon `dt`s carrying sr-only labels (Forks, License, Language); missing fields are left out.',
  ],

  constants: [
    { name: 'COUNT_MS', value: '1200', why: 'Long enough to read as counting, short enough to finish before the eye moves to the button.' },
    { name: 'IntersectionObserver threshold', value: '0.4', why: 'The count starts once the stats panel is clearly on screen, not while it is a sliver at the fold.' },
    { name: 'card column', value: 'minmax(0, 420px)', why: 'A repo card wider than this turns into a long, sparse strip; the copy column takes the rest.' },
  ],

  pitfalls: [
    'Starting the count in `useEffect` from the server-rendered final value. The real number paints for one frame and then jumps to 0; resetting in a layout effect avoids the flash.',
    'Formatting with the visitor locale (`toLocaleString()`). Server and browser can disagree ("12,480" vs "12.480") and React reports a hydration mismatch; the formatter is pinned to en-US.',
    'Announcing every frame of the count. The animated digits are hidden from assistive tech and the final total is exposed separately.',
  ],

  notes: [
    'Pass a real star count from your build step or an API route; the component does no fetching.',
    'Use the GitHub URL as `repo.href`; the Star button is a plain link, so add `target` handling in your app if you want a new tab.',
  ],

  apiSignature:
    'function GithubStarsCta(props: { repo: GithubRepo; eyebrow?: ReactNode; title?: ReactNode; description?: ReactNode; points?: ReactNode[]; secondaryAction?: { label: string; href: string }; className?: string }): JSX.Element\ninterface GithubRepo { owner: string; name: string; href: string; description?: string; stars: number; forks?: number; license?: string; language?: string }',

  props: [
    { name: 'repo', type: 'GithubRepo', description: 'Owner, name, link, star total and optional description, forks, license and language.' },
    { name: 'eyebrow', type: 'ReactNode', default: '"Open source"', description: 'Pill above the heading; pass null to hide it.' },
    { name: 'title', type: 'ReactNode', default: '"The free tier lives on GitHub"', description: 'Section heading.' },
    { name: 'description', type: 'ReactNode', description: 'Paragraph under the heading; a default about the public MIT repo is provided.' },
    { name: 'points', type: 'ReactNode[]', description: 'Checklist items under the paragraph.' },
    { name: 'secondaryAction', type: '{ label: string; href: string }', description: 'Secondary link button under the checklist.' },
    { name: 'className', type: 'string', description: 'Merged onto the section.' },
  ],

  reducedMotion:
    'With `prefers-reduced-motion: reduce` the star count shows the final number straight away and no animation frame is requested. Nothing else on the block moves.',

  cleanup:
    'The layout effect disconnects the IntersectionObserver and cancels any pending animation frame on unmount or when `stars` changes.',

  acceptance:
    'The block shows the heading, paragraph and three checks on the left and the repo card on the right at 1280px, stacked at narrow widths. When the card comes into view the star total counts from 0 to 12,480 in about a second and stops there. Forks read "642 forks", license "MIT license". The Star button and the secondary link are links with visible focus rings. With reduced motion the total is 12,480 from the start. Light and dark both keep the gradient band and dot grid visible.',

  criticalRegion: 'critical',
};

export default meta;
