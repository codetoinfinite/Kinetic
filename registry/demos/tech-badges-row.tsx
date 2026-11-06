'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Tech Badges Row" (boardui.com/).
 * No BoardUI source was used.
 */

import { DEFAULT_TECH_BADGES, TechBadgesRow } from '@/registry/ui/tech-badges-row';
import type { TechBadge } from '@/registry/ui/tech-badges-row';

/* Two densities of the same data: the labelled strip that sits under a hero,
   and glyph tiles for a tight footer or card, where the tooltip carries the
   name. Hover or Tab onto any badge to lift it and read its tooltip. */
const STACK: TechBadge[] = [
  ...DEFAULT_TECH_BADGES,
  { id: 'tanstack', name: 'TanStack Table', version: '8.21', monogram: 'TT', tone: '#ea580c', description: 'Headless tables' },
  { id: 'recharts', name: 'Recharts', version: '3.1', monogram: 'Rc', tone: '#16a34a', description: 'Charts' },
];

export default function Demo() {
  return (
    <div className="flex w-full max-w-[880px] flex-col items-center gap-10 text-center">
      <div className="flex flex-col items-center gap-4">
        <p className="text-caption-1-medium tracking-wide text-text-tertiary uppercase">Built with</p>
        <TechBadgesRow />
      </div>

      <div className="flex w-full max-w-[680px] flex-col items-center gap-4 rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-card sm:flex-row sm:justify-between sm:text-start">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-body-semibold text-text-primary">Under the hood</h3>
          <p className="text-body-2-regular text-text-secondary">Hover a tile for its name.</p>
        </div>
        <TechBadgesRow variant="icon" badges={STACK} label="Stack" className="sm:justify-end" />
      </div>
    </div>
  );
}
