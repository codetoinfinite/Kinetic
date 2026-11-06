'use client';

import { StatCards } from '@/registry/ui/stat-cards';

/* Both looks on one dashboard: the footer variant (gradient icon tile, info
   tooltip, caption band) for the two headline numbers, and the compact plain
   row underneath. Hover or tap the info glyph on a footer card for its hint. */
export default function Demo() {
  return (
    <div className="flex w-full max-w-[760px] flex-col gap-4">
      <StatCards variant="footer" count={2} columns={2} />
      <StatCards variant="plain" />
    </div>
  );
}
