import Link from 'next/link';
import type { ReactNode } from 'react';

import { CATEGORY_COUNTS, CATEGORY_LABEL, MANIFEST } from '@/__generated__/manifest';
import { Wordmark } from '@/components/nav/wordmark';
import { site } from '@/site.config';

/* ==========================================================================
   Site footer.
   --------------------------------------------------------------------------
   Stays a server component: it reads the generated manifest for its category
   counts and has nothing to react to, so none of this needs to ship as JS.

   The whole block sits on `bg-subtle` with a top hairline and a highlight
   inset, which is the site's depth grammar for "this surface is behind the
   page". That, plus the tall `pt-20`, is what makes the page read as ending
   rather than as running out.
   ========================================================================== */

const CATEGORIES = Object.keys(CATEGORY_LABEL) as Array<keyof typeof CATEGORY_LABEL>;

const DOCS = [
  { href: '/docs/installation', label: 'Installation' },
  { href: '/docs/theming', label: 'Theming' },
  { href: '/docs/prompts', label: 'Using the prompts' },
  { href: '/docs/licensing', label: 'Licensing' },
] as const;

/* Contact and social rows are opt-in: an empty string in `site.config.ts`
   removes the link rather than shipping a dead one. A footer with a `mailto:`
   pointing at `you@example.com` is worse than a footer with no contact at
   all. */
const ELSEWHERE = [
  site.social.github === '' ? null : { href: site.social.github, label: 'Source' },
  site.author.url === '' ? null : { href: site.author.url, label: site.author.name },
  site.author.email === '' ? null : { href: `mailto:${site.author.email}`, label: 'Contact' },
].filter((item): item is { href: string; label: string } => item !== null);

/**
 * The machine-readable surface. Kept in the `meta` voice — mono, uppercase,
 * faint — because these are endpoints, not reading material, and the contrast
 * between the two voices is what tells a human which column is theirs.
 */
const AGENTS = [
  { href: '/llms.txt', label: 'llms.txt' },
  { href: '/llms-full.txt', label: 'llms-full.txt' },
  { href: '/r/registry.json', label: 'registry.json' },
] as const;

const LINK = 'wipe text-[0.875rem] text-muted transition-colors duration-instant hover:text-fg';
const META_LINK = 'meta wipe inline-block transition-colors duration-instant hover:text-fg';

function Column({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      {/* h2, not a styled <p>: these are real sections of the document, and the
          404 and docs pages both assert a single h1 elsewhere on the page. */}
      <h2 className="meta text-faint">{title}</h2>
      <ul className="mt-5 space-y-3">{children}</ul>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-32 border-t border-line bg-bg-subtle shadow-[var(--k-highlight)]">
      <div className="mx-auto max-w-[100rem] px-5 pb-12 pt-20 sm:px-8">
        {/* The brand cell is wider than the link columns at lg so the sentence
            sets on a comfortable measure instead of being squeezed into a
            quarter of a 1600px page. */}
        <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))] lg:gap-x-12">
          <div className="sm:col-span-2 lg:col-span-1">
            <Wordmark className="text-fg" />
            <p className="mt-5 max-w-[36ch] text-[0.875rem] leading-relaxed text-muted">
              {site.description}
            </p>
            <p className="meta mt-7 text-faint">
              {MANIFEST.length} components · {site.license} licensed
            </p>
            {ELSEWHERE.length === 0 ? null : (
              <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-3">
                {ELSEWHERE.map((item) => (
                  <li key={item.href}>
                    {/* Plain anchors: these leave the site, so the router has
                        nothing to prefetch. */}
                    <a
                      href={item.href}
                      rel="noreferrer noopener"
                      className={`${META_LINK} text-muted`}
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Column title="Catalogue">
            {CATEGORIES.map((category) => (
              <li key={category}>
                <Link href={`/components?category=${category}`} className={LINK}>
                  {CATEGORY_LABEL[category]}
                </Link>
                <span className="ml-2 font-mono text-[0.75rem] text-faint">
                  {CATEGORY_COUNTS[category] ?? 0}
                </span>
              </li>
            ))}
          </Column>

          <Column title="Documentation">
            {DOCS.map((doc) => (
              <li key={doc.href}>
                <Link href={doc.href} className={LINK}>
                  {doc.label}
                </Link>
              </li>
            ))}
          </Column>

          <Column title="For agents">
            {AGENTS.map((item) => (
              <li key={item.href}>
                {/* Plain anchors: these are static files served outside the
                    router, so a <Link> prefetch would fetch a payload that
                    does not exist. */}
                <a href={item.href} className={`${META_LINK} text-muted`}>
                  {item.label}
                </a>
              </li>
            ))}
          </Column>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-[100rem] flex-wrap items-center justify-between gap-x-8 gap-y-3 px-5 py-6 sm:px-8">
          <p className="meta text-faint">
            {site.author.name === ''
              ? `${site.license}, except third-party licences noted per component`
              : `© ${site.author.name} · ${site.license}, except third-party licences noted per component`}
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link href="/docs/licensing" className={`${META_LINK} text-faint`}>
              Licensing
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
