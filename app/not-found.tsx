import Link from 'next/link';

import { CATEGORY_COUNTS, CATEGORY_LABEL } from '@/__generated__/manifest';

/* ==========================================================================
   404.
   --------------------------------------------------------------------------
   Two panes: the apology on the left, an actual index on the right. A dead
   URL on a component library is almost always a mistyped or invented slug, so
   the useful response is the list of things that do exist, with counts, rather
   than a large number and a single "go home" button.

   Categories come from the generated manifest's own keys, not from
   `scripts/schema` — the schema module pulls zod into whatever imports it, and
   this page needs the labels, not the validator.
   ========================================================================== */

const CATEGORIES = Object.keys(CATEGORY_LABEL) as Array<keyof typeof CATEGORY_LABEL>;

export default function NotFound() {
  return (
    <div className="mx-auto max-w-[100rem] px-5 sm:px-8">
      <div className="grid items-start gap-12 py-20 lg:min-h-[62vh] lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-center lg:gap-20 lg:py-28">
        <div>
          <p className="meta text-faint">404 — not found</p>
          <h1 className="mt-5 max-w-[20ch] text-display-1 text-fg">
            That page does not exist.
          </h1>
          <p className="mt-6 max-w-[54ch] text-lead text-muted">
            Either the slug is wrong, or it is a component that has not been built yet. The
            catalogue is complete and searchable.
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
            {/* Not `.lift`: that class sets `border-color: var(--k-line-strong)`
                on hover, which would wash out this button's `border-fg`. Same
                gesture, spelled out, with the border left alone. */}
            <Link
              href="/components"
              className="group inline-flex items-center gap-2 rounded-sm border border-fg bg-fg px-4 py-2.5 text-[0.875rem] font-medium text-bg transition-[translate,box-shadow] duration-control ease-out-quart hover:-translate-y-px hover:shadow-[var(--k-elev-2)] active:translate-y-0 active:duration-instant"
            >
              Browse all components
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-3.5 transition-transform duration-control ease-out-quart group-hover:translate-x-0.5"
              >
                <path d="M2.5 8h11M9 3.5 13.5 8 9 12.5" />
              </svg>
            </Link>
            <Link
              href="/"
              className="inline-flex items-center rounded-sm border border-line bg-surface px-4 py-2.5 text-[0.875rem] text-fg shadow-[var(--k-highlight)] transition-colors duration-control ease-out-quart hover:border-line-strong hover:bg-surface-hover"
            >
              Home
            </Link>
          </div>
        </div>

        {/* `aria-label` rather than a visible heading, so the page keeps exactly
            one h1 and the panel's own label stays in the `meta` voice. */}
        <nav aria-label="Categories" className="panel rounded-md">
          <p className="meta border-b border-line px-4 py-3 text-faint">Browse by category</p>
          <ul>
            {CATEGORIES.map((category) => (
              <li key={category} className="border-b border-line last:border-b-0">
                {/* `data-category` re-points `--k-accent` at this category's own
                    accent inside the subtree, so each dot lights its own
                    colour on hover. */}
                <Link
                  href={`/components?category=${category}`}
                  data-category={category}
                  className="group flex items-center gap-3 px-4 py-3 text-[0.875rem] text-muted transition-colors duration-instant hover:bg-surface-hover hover:text-fg"
                >
                  <span
                    aria-hidden="true"
                    className="size-1.5 shrink-0 rounded-[1px] bg-line transition-colors duration-instant group-hover:bg-accent"
                  />
                  {CATEGORY_LABEL[category]}
                  <span className="meta ml-auto text-faint">
                    {String(CATEGORY_COUNTS[category] ?? 0).padStart(2, '0')}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
