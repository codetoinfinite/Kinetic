'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type FocusEvent } from 'react';

import { NavLinks } from '@/components/nav/nav-links';
import { ThemeToggle } from '@/components/nav/theme-toggle';
import { Wordmark } from '@/components/nav/wordmark';
import { cn } from '@/lib/cn';
import { site } from '@/site.config';

/* ==========================================================================
   The bar.
   --------------------------------------------------------------------------
   Two pieces of state, and both of them are booleans on purpose.

   `condensed` — over the very top of the page the header has no background
   and no bottom rule, so the document starts at the top of the window rather
   than under a permanent grey strip. Once the first bar-height has scrolled
   past, a translucent backing, a hairline and one step of elevation fade in.

   `open` — the mobile disclosure. It also forces `condensed`, because a panel
   hanging off a transparent bar at scroll position zero would be a menu
   floating in mid-air.

   The bar's height never changes. A sticky header that resizes reflows every
   page underneath it at the moment it crosses the threshold, and the jump is
   far more noticeable than the 8px of "condensing" it buys.
   ========================================================================== */

const PANEL_ID = 'site-nav-panel';

/** Matches the `md` breakpoint the disclosure is gated on. */
const WIDE = '(min-width: 48rem)';

const SECONDARY = [
  { href: '/llms.txt', label: 'llms.txt' },
  { href: '/r/registry.json', label: 'registry.json' },
  { href: '/docs/theming', label: 'Theming' },
  { href: '/docs/licensing', label: 'Licensing' },
] as const;

export interface HeaderBarProps {
  /**
   * Passed down rather than imported. MANIFEST is ~130kB of generated data and
   * this file is a client component; `SiteHeader` stays on the server so the
   * count costs a number instead of the whole catalogue.
   */
  componentCount: number;
}

export function HeaderBar({ componentCount }: HeaderBarProps) {
  const pathname = usePathname();
  const [condensed, setCondensed] = useState(false);
  const [open, setOpen] = useState(false);

  const sentinel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  /* Scroll state comes from an IntersectionObserver watching a sentinel at the
     top of the document, not from a scroll handler. The observer fires twice
     per crossing — once on the way into the condensed state, once on the way
     out — where a listener, even a passive one that does nothing but set a
     boolean, is still invoked on every frame of every scroll to recompute a
     value that changed twice.

     The sentinel is `position: absolute`, so it adds no height to the layout,
     and it is a *sibling* of the header rather than a child: a child would
     stick to the top along with the header and could never leave the
     viewport. Its height is the bar's height, which is what makes the state
     flip exactly as the bar stops overlapping the document's first pixel. */
  useEffect(() => {
    const node = sentinel.current;
    if (node === null) return;

    const observer = new IntersectionObserver(([entry]) => {
      setCondensed(entry !== undefined && !entry.isIntersecting);
    });
    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, []);

  // A client-side navigation re-renders the page but not the header, so the
  // disclosure has to be told the route moved out from under it.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const node = panel.current;
    if (node !== null) {
      // The panel is `display: none` until `data-open` lands, and nothing in a
      // display:none subtree is focusable. Reading a layout property forces
      // that style change through before focus() goes looking for a target.
      void node.offsetHeight;
      node.querySelector<HTMLElement>('a[href]')?.focus();
    }

    /* Locking the page also removes the scrollbar, which widens the viewport
       and slides the whole document sideways. The replacement padding goes on
       <html> rather than <body> so that the sticky header, which lives inside
       body, moves with the content instead of tearing away from it. */
    const root = document.documentElement;
    const gutter = window.innerWidth - root.clientWidth;
    const overflow = root.style.overflow;
    const padding = root.style.paddingRight;
    root.style.overflow = 'hidden';
    if (gutter > 0) root.style.paddingRight = `${gutter}px`;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      setOpen(false);
      trigger.current?.focus();
    }

    function onPointerDown(event: PointerEvent) {
      if (!(event.target instanceof Node)) return;
      // The trigger is excluded because its own click handler toggles: closing
      // here first would let that toggle reopen the panel immediately.
      if (trigger.current?.contains(event.target) === true) return;
      if (node?.contains(event.target) === true) return;
      setOpen(false);
    }

    // Past the breakpoint the trigger itself is display:none, so an open panel
    // would leave the page's scroll locked with nothing on screen to release
    // it. Resizing across the boundary is rare; being stuck is not survivable.
    const wide = window.matchMedia(WIDE);
    function onWiden() {
      if (wide.matches) setOpen(false);
    }

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    wide.addEventListener('change', onWiden);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
      wide.removeEventListener('change', onWiden);
      root.style.overflow = overflow;
      root.style.paddingRight = padding;
    };
  }, [open]);

  /* Tab past the last link in the panel and focus lands on page content that
     is behind a locked scroll and possibly off screen. Closing when focus
     leaves the header keeps the keyboard path coherent, and does it without a
     focus trap — this is a dropdown under a bar, not a modal, and trapping
     inside it would be a lie about what is still reachable. */
  function onFocusOut(event: FocusEvent<HTMLElement>) {
    if (!open) return;
    const next = event.relatedTarget;
    if (next instanceof Node && event.currentTarget.contains(next)) return;
    setOpen(false);
  }

  return (
    <>
      <div
        ref={sentinel}
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-16"
      />

      <header
        data-condensed={condensed || open || undefined}
        onBlur={onFocusOut}
        className={cn(
          'sticky top-0 z-40 border-b border-b-transparent bg-transparent shadow-none',
          // The blur is unconditional: at the top of the page the header is
          // flush with the document and has nothing behind it to blur, so
          // leaving it on is visually identical to turning it off and avoids
          // interpolating `backdrop-filter` out of `none`.
          'backdrop-blur-xl backdrop-saturate-150',
          'transition-[background-color,border-color,box-shadow] duration-element',
          'ease-out-quart',
          'data-condensed:border-b-line data-condensed:bg-bg/80',
          'data-condensed:shadow-[var(--k-elev-1)]',
        )}
      >
        <div className="mx-auto flex h-16 max-w-[100rem] items-center gap-5 px-5 sm:px-8">
          <Link href="/" className="rounded-sm text-fg">
            <Wordmark />
          </Link>

          <span aria-hidden="true" className="hidden h-4 w-px bg-line lg:block" />
          <span className="meta hidden text-faint lg:block">{componentCount} components</span>

          <div className="ml-auto flex items-center gap-5">
            <NavLinks />

            <span aria-hidden="true" className="hidden h-4 w-px bg-line md:block" />
            <a
              href="/llms.txt"
              className="meta wipe hidden text-faint transition-colors duration-instant hover:text-fg md:inline-block"
            >
              llms.txt
            </a>

            <ThemeToggle />

            <button
              ref={trigger}
              type="button"
              aria-expanded={open}
              aria-controls={PANEL_ID}
              onClick={() => {
                setOpen((value) => !value);
              }}
              className={cn(
                'group -mr-1 grid size-9 place-items-center rounded-sm border border-line',
                'text-muted transition-colors duration-instant hover:border-line-strong',
                'hover:bg-surface-hover hover:text-fg md:hidden',
              )}
            >
              <span className="sr-only">Menu</span>
              {/* Two rules rather than three: at 16px a third line is noise,
                  and two of them fold into the close mark exactly. */}
              <span aria-hidden="true" className="relative block size-4">
                <span
                  className={cn(
                    'absolute inset-x-0 top-1/2 h-px translate-y-[-3.5px] bg-current',
                    'transition-transform duration-control ease-out-quart',
                    'group-aria-expanded:translate-y-0 group-aria-expanded:rotate-45',
                  )}
                />
                <span
                  className={cn(
                    'absolute inset-x-0 top-1/2 h-px translate-y-[2.5px] bg-current',
                    'transition-transform duration-control ease-out-quart',
                    'group-aria-expanded:translate-y-0 group-aria-expanded:-rotate-45',
                  )}
                />
              </span>
            </button>
          </div>
        </div>

        {/* The breakpoint gate lives on the wrapper so the panel's own display
            rules stay a plain open/closed pair, and so a resize past `md`
            cannot leave a stray panel painted on a desktop layout. */}
        <div className="md:hidden">
          <div
            id={PANEL_ID}
            ref={panel}
            data-open={open || undefined}
            inert={!open}
            className={cn(
              // Height animates through grid-template-rows because the panel's
              // content height is not knowable in CSS and `interpolate-size:
              // allow-keywords` — the direct way to animate to `auto` — is
              // Chrome-only. A 0fr→1fr row is the portable equivalent.
              'grid grid-rows-[0fr] overflow-hidden opacity-0',
              // `@starting-style` supplies the from-state for an element that
              // is arriving from `display: none`; `allow-discrete` holds
              // `display` at grid until the exit transition has finished, so
              // the panel can animate out instead of vanishing.
              'transition-[grid-template-rows,opacity,display] transition-discrete',
              'duration-element ease-out-expo',
              'hidden data-open:grid data-open:grid-rows-[1fr] data-open:opacity-100',
              'starting:data-open:grid-rows-[0fr] starting:data-open:opacity-0',
            )}
          >
            <div className="min-h-0 overflow-hidden">
              {/* Delegated close: everything actionable in here is a link, and
                  clicking the link for the route you are already on produces
                  no navigation for the pathname effect above to react to. */}
              <div
                onClick={() => {
                  setOpen(false);
                }}
                className={cn(
                  'max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain',
                  'border-t border-line px-5 pb-8 pt-1',
                )}
              >
                <NavLinks orientation="stack" />

                <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-3">
                  {SECONDARY.map((item) => (
                    <li key={item.href}>
                      <a
                        href={item.href}
                        className="meta wipe inline-block text-faint transition-colors duration-instant hover:text-fg"
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>

                <p className="meta mt-7 text-faint">
                  {componentCount} components · {site.license}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
