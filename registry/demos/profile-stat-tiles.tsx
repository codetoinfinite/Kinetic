'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Profile Stat Tiles" (boardui.com/templates/ai-profile).
 * No BoardUI source was used.
 */

import { useState } from 'react';

import { ProfileStatTiles } from '@/registry/ui/profile-stat-tiles';
import type { StatTile } from '@/registry/ui/profile-stat-tiles';
import { SegmentedControl, SegmentedControlItem } from '@/registry/ui/segmented-control';

type Year = '2024' | '2025' | '2026';

const DATA: Record<Year, { value: number; trend: number; tiles: StatTile[] }> = {
  '2026': {
    value: 7462,
    trend: 14.8,
    tiles: [
      { id: 'lifetime', label: 'Lifetime tokens', value: '9B', trend: 12.4 },
      { id: 'peak', label: 'Peak tokens', value: '562.7M', trend: 8.1 },
      { id: 'longest', label: 'Longest task', value: '12h 54m', trend: -3.2 },
      { id: 'streak', label: 'Top streak', value: '62 days', trend: 21 },
    ],
  },
  '2025': {
    value: 6501,
    trend: 9.2,
    tiles: [
      { id: 'lifetime', label: 'Lifetime tokens', value: '6.1B', trend: 7.5 },
      { id: 'peak', label: 'Peak tokens', value: '418.2M', trend: 4.9 },
      { id: 'longest', label: 'Longest task', value: '13h 20m', trend: 11 },
      { id: 'streak', label: 'Top streak', value: '41 days', trend: 0 },
    ],
  },
  '2024': {
    value: 5954,
    trend: -2.5,
    tiles: [
      { id: 'lifetime', label: 'Lifetime tokens', value: '3.4B', trend: -1.8 },
      { id: 'peak', label: 'Peak tokens', value: '211.9M', trend: -6.4 },
      { id: 'longest', label: 'Longest task', value: '9h 05m', trend: 2.3 },
      { id: 'streak', label: 'Top streak', value: '28 days', trend: -12 },
    ],
  },
};

const HINTS: Record<string, string> = {
  lifetime: 'Every token your agents processed since you joined.',
  peak: 'The busiest single day of the year, in tokens.',
  longest: 'The longest uninterrupted agent run.',
  streak: 'Most consecutive days with at least one run.',
};

export default function Demo() {
  const [year, setYear] = useState<Year>('2026');
  const [selected, setSelected] = useState<string | null>(null);
  const data = DATA[year];
  const tile = data.tiles.find((t) => t.id === selected);

  return (
    <div className="flex w-full max-w-[680px] flex-col gap-3">
      <SegmentedControl
        aria-label="Year"
        className="self-start"
        selectedKeys={new Set([year])}
        onSelectionChange={(keys) => {
          const next = [...keys][0];
          if (next === '2024' || next === '2025' || next === '2026') setYear(next);
        }}
      >
        {(['2024', '2025', '2026'] as const).map((y) => (
          <SegmentedControlItem key={y} id={y}>
            {y}
          </SegmentedControlItem>
        ))}
      </SegmentedControl>

      <section
        aria-label="Contributions"
        className="flex flex-col gap-3 rounded-2xl border border-border-ai-profile-card bg-background-primary-default p-4"
      >
        <ProfileStatTiles
          label={year === '2026' ? 'Contributions this year' : `Contributions in ${year}`}
          value={data.value}
          trend={data.trend}
          tiles={data.tiles}
          tilesLabel={`${year} stats`}
          selectedId={selected}
          onSelectionChange={setSelected}
        />
        <p aria-live="polite" data-testid="tile-hint" className="min-h-5 text-body-2-regular text-text-tertiary">
          {tile ? (
            <>
              <span className="text-text-primary">
                {tile.label}: {tile.value}
              </span>{' '}
              · {HINTS[tile.id]}
            </>
          ) : (
            'Select a tile to see what it counts.'
          )}
        </p>
      </section>
    </div>
  );
}
