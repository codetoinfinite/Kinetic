'use client';

import { useRef } from 'react';
import { VelocityDeformCards } from '@/registry/ui/velocity-deform-cards';

const CARDS = [
  { code: 'A1', title: 'Tidal', depth: 1 },
  { code: 'A2', title: 'Ferrous', depth: 0.55 },
  { code: 'B1', title: 'Longwave', depth: 0.8 },
  { code: 'B2', title: 'Sandbar', depth: 1 },
  { code: 'C1', title: 'Nightjar', depth: 0.55 },
  { code: 'C2', title: 'Pilot', depth: 0.8 },
  { code: 'D1', title: 'Halyard', depth: 1 },
  { code: 'D2', title: 'Cinder', depth: 0.55 },
];

export default function Demo() {
  const scroller = useRef<HTMLDivElement>(null);

  return (
    <div ref={scroller} className="scrollbar-none h-full w-full overflow-y-auto bg-bg">
      <div className="flex h-24 items-end px-4 pb-3">
        <p className="meta">Scroll hard, then let go</p>
      </div>

      <VelocityDeformCards scroller={scroller} className="grid grid-cols-2 gap-3 px-4 pb-24">
        {CARDS.map((card) => (
          <article
            key={card.code}
            data-deform={card.depth}
            className="aspect-4/5 origin-center overflow-hidden border border-line bg-surface p-3 will-change-transform"
          >
            <div className="flex h-full flex-col justify-between">
              <p className="meta tabular-nums">{card.code}</p>
              <div
                className="h-16 w-full"
                style={{
                  backgroundImage:
                    'linear-gradient(150deg, color-mix(in oklab, var(--k-accent) 45%, transparent), transparent 70%)',
                }}
              />
              <p className="text-sm text-fg">{card.title}</p>
            </div>
          </article>
        ))}
      </VelocityDeformCards>
    </div>
  );
}
