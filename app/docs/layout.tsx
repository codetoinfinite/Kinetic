import type { ReactNode } from 'react';

import { DocsNav, DocsPager } from '@/components/docs/docs-nav';

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-[100rem] px-5 sm:px-8">
      {/* 13rem rail, then a measured column rather than the full remainder: at
          1440 an unconstrained prose column runs to ~110ch, which is roughly
          double a comfortable line length. `.prose` caps itself at 68ch, but
          code blocks and tables do not, so the cap belongs here too. */}
      <div className="grid gap-12 py-14 lg:grid-cols-[13rem_minmax(0,58rem)] lg:gap-20">
        {/* top-24 clears the sticky site header; self-start is what stops the
            aside stretching to the row height and taking the stickiness with
            it, which is the usual reason a sticky sidebar silently does
            nothing. */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <DocsNav />
        </aside>

        <div className="min-w-0">
          {children}
          <DocsPager />
        </div>
      </div>
    </div>
  );
}
