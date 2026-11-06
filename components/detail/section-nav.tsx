'use client';

import { useEffect, useRef, useState, type MouseEvent } from 'react';

import { cn } from '@/lib/cn';

/* ==========================================================================
   In-page navigation.
   --------------------------------------------------------------------------
   A component page is six screens tall — preview, install, prompt, source,
   API, mechanism, behaviour — and until now the only way to reach the prompt
   was to scroll for it and recognise it on the way past. This bar sticks under
   the site header and always says which section is being read.

   The current section comes from one IntersectionObserver watching a thin band
   just below the sticky chrome, not from a scroll handler. A `scroll` listener
   fires on every frame of every scroll and reads layout while doing it, which
   is the usual reason a page with a sticky nav janks; the observer costs
   nothing between crossings.

   Leaving the band does not clear the selection. The band is deliberately
   thinner than a section, so there are moments when nothing is inside it, and a
   nav that blanks between sections reads as broken rather than as precise.
   ========================================================================== */

export interface SectionLink {
  id: string;
  label: string;
}

/* Site header (4rem, fixed by design — see header-bar.tsx) plus this bar
   (~3.25rem). Sections carry `scroll-mt-32`, which is slightly more, so an
   anchor jump lands just inside the band rather than under the chrome. */
const BAND_TOP = 120;

/** Honoured per call rather than read once: the preference can change mid-visit. */
function behaviour(): ScrollBehavior {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

export function SectionNav({
  sections,
  title,
}: {
  sections: readonly SectionLink[];
  title: string;
}) {
  const [active, setActive] = useState(() => sections[0]?.id ?? '');
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const nodes = sections
      .map((section) => document.getElementById(section.id))
      .filter((node): node is HTMLElement => node !== null);
    if (nodes.length === 0) return;

    const inBand = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) inBand.add(entry.target.id);
          else inBand.delete(entry.target.id);
        }
        // Document order, not observation order: when a short section and the
        // one after it are both crossing, the higher one is the one being read.
        const current = sections.find((section) => inBand.has(section.id));
        if (current !== undefined) setActive(current.id);
      },
      { rootMargin: `-${BAND_TOP}px 0px -78% 0px` },
    );

    for (const node of nodes) observer.observe(node);
    return () => observer.disconnect();
  }, [sections]);

  // Below `lg` the strip scrolls, so the current item has to be brought into it
  // as the page moves. `block: 'nearest'` is what keeps this from scrolling the
  // page as well: the bar is already in view vertically, so only the strip runs.
  useEffect(() => {
    const current = listRef.current?.querySelector(`[data-section="${active}"]`);
    current?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: behaviour() });
  }, [active]);

  function jump(event: MouseEvent<HTMLAnchorElement>, id: string) {
    const target = document.getElementById(id);
    // No target means the href is still the browser's problem, which is the
    // correct fallback rather than a dead click.
    if (target === null) return;

    event.preventDefault();
    setActive(id);
    target.scrollIntoView({ behavior: behaviour(), block: 'start' });
    window.history.replaceState(null, '', `#${id}`);

    // `preventDefault` cancels the browser's fragment navigation, and with it
    // the move of the sequential-focus starting point. Left alone, the page
    // scrolls to the section but the next Tab resumes from the nav link, so a
    // keyboard user is put in front of content they cannot then read forwards
    // from. Sections are not focusable in their own right, hence `-1`; the
    // scroll has already happened, hence `preventScroll`.
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }

  return (
    <div className="sticky top-16 z-30 border-b border-line bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[100rem] items-center gap-5 px-5 sm:px-8">
        <p className="hidden shrink-0 truncate font-mono text-[0.8125rem] text-faint lg:block lg:max-w-[16rem] xl:max-w-[22rem]">
          {title}
        </p>
        <span className="hidden h-4 w-px shrink-0 bg-line lg:block" aria-hidden="true" />

        <nav aria-label="On this page" className="min-w-0 flex-1">
          <ul ref={listRef} className="scrollbar-none flex items-stretch gap-6 overflow-x-auto">
            {sections.map((section) => {
              const current = section.id === active;
              return (
                <li key={section.id} className="shrink-0">
                  <a
                    href={`#${section.id}`}
                    data-section={section.id}
                    aria-current={current ? 'location' : undefined}
                    onClick={(event) => jump(event, section.id)}
                    className={cn(
                      'relative block py-3.5 font-mono text-[0.8125rem] transition-colors duration-instant',
                      current ? 'text-fg' : 'text-muted hover:text-fg',
                    )}
                  >
                    {section.label}
                    {/* Colour already carries the state; this only has to make
                        the change legible as movement rather than as a blink. */}
                    <span
                      aria-hidden="true"
                      className={cn(
                        'absolute inset-x-0 bottom-0 h-px origin-left bg-accent transition-transform duration-control ease-out-quart',
                        current ? 'scale-x-100' : 'scale-x-0',
                      )}
                    />
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}
