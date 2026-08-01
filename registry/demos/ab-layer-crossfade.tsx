'use client';

import { useState } from 'react';
import { ABLayerCrossfade } from '@/registry/ui/ab-layer-crossfade';

const ROWS = [
  { id: 'harbour', title: 'Harbour Atlas', year: '2026', angle: 135, tint: 38 },
  { id: 'meridian', title: 'Meridian Type', year: '2025', angle: 55, tint: 26 },
  { id: 'foundry', title: 'Foundry Rebuild', year: '2025', angle: 200, tint: 46 },
  { id: 'pelago', title: 'Pelago Editions', year: '2024', angle: 320, tint: 18 },
];

/* Placeholder artwork, generated rather than fetched: an accent-tinted
   gradient at a per-row angle plus the row's own index. */
function Plate({ angle, tint, label }: { angle: number; tint: number; label: string }) {
  return (
    <div
      className="flex h-full w-full items-end p-3"
      style={{
        background: `linear-gradient(${angle}deg, color-mix(in oklch, var(--color-accent) ${tint}%, transparent), transparent 70%), var(--color-surface)`,
      }}
    >
      <span className="meta text-fg/80">{label}</span>
    </div>
  );
}

export default function Demo() {
  const [active, setActive] = useState(ROWS[0]);
  const row = active ?? ROWS[0];
  if (!row) return null;

  return (
    <div className="relative h-full w-full overflow-hidden bg-bg">
      {/* Full-bleed background: 1s, deliberately the slower of the two. */}
      <ABLayerCrossfade
        contentKey={row.id}
        duration={1}
        className="absolute inset-0 opacity-40"
      >
        <Plate angle={row.angle} tint={row.tint} label={row.title} />
      </ABLayerCrossfade>

      <div className="relative flex h-full w-full">
        <ul className="flex min-w-0 flex-1 flex-col justify-center px-4">
          {ROWS.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onMouseEnter={() => setActive(r)}
                onFocus={() => setActive(r)}
                className="flex w-full items-baseline gap-3 border-b border-line py-2.5 text-left"
              >
                <span
                  className={
                    r.id === row.id
                      ? 'text-sm tracking-tight text-accent'
                      : 'text-sm tracking-tight text-fg transition-colors'
                  }
                >
                  {r.title}
                </span>
                <span className="meta ml-auto">{r.year}</span>
              </button>
            </li>
          ))}
        </ul>

        {/* Thumbnail: 0.6s, so the thing nearest the cursor answers first. */}
        <div className="hidden w-[38%] shrink-0 items-center p-4 sm:flex">
          <ABLayerCrossfade
            contentKey={row.id}
            duration={0.6}
            className="aspect-[3/4] w-full rounded-md border border-line"
          >
            <Plate angle={row.angle} tint={row.tint + 20} label={row.year} />
          </ABLayerCrossfade>
        </div>
      </div>
    </div>
  );
}
