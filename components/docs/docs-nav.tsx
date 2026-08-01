'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/cn';

export const DOCS = [
  { href: '/docs/installation', label: 'Installation' },
  { href: '/docs/theming', label: 'Theming' },
  { href: '/docs/prompts', label: 'Prompts' },
  { href: '/docs/licensing', label: 'Licensing' },
] as const;

export function DocsNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Documentation">
      <p className="meta mb-4 text-faint">Docs</p>

      {/* The rail is drawn once on the list rather than per item, so the active
          indicator can sit on top of a continuous line instead of being one
          segment of a dashed one. */}
      <ul className="relative border-l border-line">
        {DOCS.map((item, index) => {
          const active = pathname === item.href;
          return (
            <li key={item.href} className="relative">
              {/* The indicator is a sibling, not a border on the link: a border
                  cannot animate its own length, and this can. */}
              <span
                aria-hidden
                className={cn(
                  'absolute -left-px top-0 h-full w-px origin-top bg-accent',
                  'transition-transform duration-control ease-out-quart',
                  active ? 'scale-y-100' : 'scale-y-0',
                )}
              />
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-baseline gap-2.5 py-2 pl-3 text-[0.875rem]',
                  'transition-colors duration-instant',
                  active ? 'text-fg' : 'text-muted hover:text-fg',
                )}
              >
                <span className="meta w-3 shrink-0 text-faint">
                  {String(index + 1).padStart(2, '0')}
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Previous/next across `DOCS` in reading order. Rendered at the foot of every
 * docs page so the set reads as a sequence rather than as five unrelated
 * pages — which is the whole reason the order in `DOCS` is deliberate.
 */
export function DocsPager() {
  const pathname = usePathname();
  const index = DOCS.findIndex((item) => item.href === pathname);

  // A route that is not in the list (or a mismatch after a rename) should show
  // nothing rather than a pager pointing at the wrong pages.
  if (index === -1) return null;

  const previous = index > 0 ? DOCS[index - 1] : undefined;
  const next = index < DOCS.length - 1 ? DOCS[index + 1] : undefined;

  return (
    <nav
      aria-label="Documentation pages"
      className="mt-20 grid gap-px border-t border-line pt-10 sm:grid-cols-2"
    >
      {previous === undefined ? (
        <span />
      ) : (
        <Link
          href={previous.href}
          className="panel lift group flex flex-col gap-2 p-5 sm:items-start"
        >
          <span className="meta text-faint">Previous</span>
          <span className="text-display-3 text-fg">{previous.label}</span>
        </Link>
      )}

      {next !== undefined && (
        <Link
          href={next.href}
          className="panel lift group flex flex-col gap-2 p-5 sm:col-start-2 sm:items-end sm:text-right"
        >
          <span className="meta text-faint">Next</span>
          <span className="text-display-3 text-fg">{next.label}</span>
        </Link>
      )}
    </nav>
  );
}
