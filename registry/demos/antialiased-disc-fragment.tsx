'use client';

import { AntialiasedDiscFragment } from '@/registry/ui/antialiased-disc-fragment';

export default function Demo() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-bg">
      <AntialiasedDiscFragment count={4200} maxRadius={9} />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-5">
        <p className="max-w-[18ch] text-sm leading-snug tracking-tight text-fg">
          Every dot the same weight, every display.
        </p>
        <span className="meta">4200 pts / 1 draw</span>
      </div>
    </div>
  );
}
