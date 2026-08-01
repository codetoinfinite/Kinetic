'use client';

import { useRef } from 'react';
import { MixedScrubLayers } from '@/registry/ui/mixed-scrub-depth-layers';

const TILES = [
  { id: 'a', depth: 3, label: 'Far' },
  { id: 'b', depth: 1, label: 'Near' },
  { id: 'c', depth: 2, label: 'Mid' },
  { id: 'd', depth: 0, label: 'Plate' },
  { id: 'e', depth: 2, label: 'Mid' },
  { id: 'f', depth: 3, label: 'Far' },
];

export default function Demo() {
  const scroller = useRef<HTMLDivElement>(null);

  return (
    <div ref={scroller} className="scrollbar-none h-full w-full overflow-y-auto bg-bg">
      <section className="flex h-full flex-col justify-end p-6">
        <p className="meta">Four distances</p>
        <h2 className="mt-3 max-w-[22ch] text-2xl leading-tight tracking-tight text-fg">
          The lag is the depth cue.
        </h2>
      </section>

      <MixedScrubLayers scroller={scroller} className="px-6 py-10">
        <div className="grid grid-cols-2 gap-4">
          {TILES.map((tile) => (
            <div
              key={tile.id}
              data-depth={tile.depth}
              className="flex aspect-4/5 flex-col justify-between rounded-sm border border-line p-3 will-change-transform"
              style={{
                backgroundImage: `linear-gradient(200deg, color-mix(in oklab, var(--k-accent) ${8 + tile.depth * 7}%, transparent), transparent 70%)`,
              }}
            >
              <span className="meta">{tile.label}</span>
              <span className="meta text-faint">{tile.depth}</span>
            </div>
          ))}
        </div>
      </MixedScrubLayers>

      <section className="flex h-full flex-col justify-start p-6">
        <div className="rule" />
        <p className="mt-4 max-w-[34ch] text-sm leading-relaxed text-muted">
          Stop scrolling and the plates settle back into one composition. Scroll
          hard and they separate again.
        </p>
      </section>
    </div>
  );
}
