'use client';

import { useRef } from 'react';
import { ManufacturedScrollRange } from '@/registry/ui/manufactured-scroll-range';

const ITEMS = [
  { code: '01', title: 'Harbour Line', note: 'Identity, wayfinding, print' },
  { code: '02', title: 'Field Station', note: 'Product design, motion' },
  { code: '03', title: 'Cold Storage', note: 'Art direction, web' },
  { code: '04', title: 'Nightwatch', note: 'Brand system, editorial' },
];

export default function Demo() {
  const scroller = useRef<HTMLDivElement>(null);

  return (
    <div ref={scroller} className="scrollbar-none h-full w-full overflow-y-auto bg-bg">
      <ManufacturedScrollRange count={ITEMS.length} viewports={1} scroller={scroller}>
        {({ index, count }) => {
          const item = ITEMS[index];
          return (
            <div className="relative flex h-full w-full flex-col justify-between p-6">
              <div className="flex items-baseline justify-between">
                <p className="meta">Manufactured range</p>
                <p className="meta tabular-nums">
                  {String(index + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
                </p>
              </div>

              <div>
                <p className="meta tabular-nums text-accent">{item?.code}</p>
                <h2 className="mt-2 text-4xl leading-none font-medium tracking-tight text-fg">
                  {item?.title}
                </h2>
                <p className="mt-2 text-sm text-muted">{item?.note}</p>
              </div>

              {/* Continuous progress never reaches React: it arrives as an
                  inherited custom property and drives a composited scale. */}
              <div className="relative h-px w-full bg-line">
                <div
                  className="absolute inset-0 origin-left bg-accent"
                  style={{ transform: 'scaleX(var(--range-progress, 0))' }}
                />
              </div>
            </div>
          );
        }}
      </ManufacturedScrollRange>
    </div>
  );
}
