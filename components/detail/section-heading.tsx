import type { ReactNode } from 'react';

/* ==========================================================================
   One heading treatment for every section of a component page, because the
   page's problem was never any single block — it was that six blocks of
   different importance were introduced identically.

   The index is the part that does the work: a numbered sequence tells you the
   page is a document with an order, and gives the eye something to count down
   as it scrolls. The rule then carries the number across to the title, so the
   heading occupies the full column width no matter how short the title is.
   ========================================================================== */

export interface SectionHeadingProps {
  /** Two digits, ordered by position on the page. */
  index: string;
  /** The heading's own id — the section points `aria-labelledby` at it. */
  id: string;
  title: string;
  /** One clause of orientation. Sits opposite the title from `sm` up. */
  hint?: string;
  /** A link or control belonging to the section, not to the page. */
  action?: ReactNode;
}

export function SectionHeading({ index, id, title, hint, action }: SectionHeadingProps) {
  return (
    <header className="mb-6">
      <div className="flex items-center gap-3">
        <span className="meta tabular-nums text-faint">{index}</span>
        <span className="h-px flex-1 bg-line" aria-hidden="true" />
        {action}
      </div>

      <div className="mt-3.5 flex flex-wrap items-baseline justify-between gap-x-8 gap-y-1.5">
        <h2 id={id} className="text-display-3 text-fg">
          {title}
        </h2>
        {hint === undefined ? null : (
          <p className="text-[0.8125rem] leading-relaxed text-faint">{hint}</p>
        )}
      </div>
    </header>
  );
}
