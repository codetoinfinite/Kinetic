'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/cn';

export const NAV_LINKS = [
  { href: '/components', label: 'Components' },
  { href: '/docs/installation', label: 'Install' },
  { href: '/docs/prompts', label: 'Prompts' },
  { href: '/docs/licensing', label: 'Licensing' },
] as const;

/**
 * `/c/<slug>` is a component page, so the Components link stays lit while you
 * are reading one — the nav should describe where you are, not which URL
 * matched exactly.
 */
function isCurrent(pathname: string, href: string): boolean {
  if (href === '/components') {
    return pathname === '/components' || pathname.startsWith('/c/');
  }
  return pathname.startsWith(href);
}

export interface NavLinksProps {
  /**
   * `row` is the bar at md and up, `stack` is the mobile disclosure. One list,
   * one active rule, two presentations — and only ever one of them in the
   * accessibility tree, because whichever does not apply at the current width
   * is `display: none`, which removes its landmark along with it.
   */
  orientation?: 'row' | 'stack';
}

export function NavLinks({ orientation = 'row' }: NavLinksProps) {
  const pathname = usePathname();

  if (orientation === 'stack') {
    return (
      <nav aria-label="Main" className="flex flex-col">
        {NAV_LINKS.map((link) => {
          const current = isCurrent(pathname, link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={current ? 'page' : undefined}
              className={cn(
                'group flex items-center justify-between gap-4 border-b border-line py-4',
                'text-[0.9375rem] transition-colors duration-instant',
                current ? 'text-fg' : 'text-muted hover:text-fg',
              )}
            >
              {/* The wipe is driven by the row rather than by the text, so the
                  whole 44px-tall target carries the hover, not just the
                  glyphs. */}
              <span
                className={cn(
                  'wipe',
                  current
                    ? 'after:origin-left after:bg-accent after:transform-[scaleX(1)]'
                    : 'group-hover:after:origin-left group-hover:after:transform-[scaleX(1)]',
                )}
              >
                {link.label}
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  'size-1.5 rounded-[1px] transition-colors duration-instant',
                  current ? 'bg-accent' : 'bg-transparent group-hover:bg-line-strong',
                )}
              />
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav aria-label="Main" className="hidden items-center gap-6 md:flex">
      {NAV_LINKS.map((link) => {
        const current = isCurrent(pathname, link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={current ? 'page' : undefined}
            className={cn(
              'wipe text-[0.8125rem] transition-colors duration-instant',
              current
                ? // Utilities land in a later cascade layer than `.wipe`, so
                  // these pin its underline open in the accent rather than
                  // leaving it hover-only. `transform`, not `scale-x-100`:
                  // Tailwind's scale utilities write the `scale` property,
                  // which composes with `.wipe`'s `transform: scaleX(0)`
                  // instead of replacing it, and the line would stay invisible.
                  'text-fg after:origin-left after:bg-accent after:transform-[scaleX(1)]'
                : 'text-muted hover:text-fg',
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
