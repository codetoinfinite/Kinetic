'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Contributions Card" (boardui.com/components/contributions-card).
 * No BoardUI source was used.
 */

import { useState } from 'react';

import { ContributionsCard, type ContributionAccent } from '@/registry/ui/contributions-card';
import { cx } from '@/registry/lib/cx';

const ACCENTS: ContributionAccent[] = ['violet', 'indigo', 'blue', 'cyan', 'teal', 'emerald', 'green', 'amber', 'rose'];

export default function Demo() {
  const [accent, setAccent] = useState<ContributionAccent>('violet');
  return (
    <div className="flex w-full max-w-[680px] flex-col items-stretch gap-3" data-demo>
      <ContributionsCard accent={accent} />
      <div role="group" aria-label="Accent" className="flex flex-wrap items-center justify-center gap-1.5">
        {ACCENTS.map((a) => (
          <button
            key={a}
            type="button"
            aria-label={a}
            aria-pressed={accent === a}
            data-swatch={a}
            onClick={() => setAccent(a)}
            className={cx(
              'contributions-grid grid size-7 cursor-pointer place-items-center rounded-full outline-none transition-shadow duration-150 ease-out focus-visible:ring-2 focus-visible:ring-border-focus-ring motion-reduce:transition-none',
              accent === a && 'ring-2 ring-text-primary ring-offset-2 ring-offset-background-primary-default',
            )}
            data-accent={a}
          >
            <span data-tier={4} className="contribution-cell size-4 rounded-full" />
          </button>
        ))}
      </div>
    </div>
  );
}
