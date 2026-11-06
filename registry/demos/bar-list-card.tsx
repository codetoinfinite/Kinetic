'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Bar List Card" (boardui.com/components/bar-list-card).
 * No BoardUI source was used.
 */

import { useState } from 'react';

import { BarListCard, type BarListItem } from '@/registry/ui/bar-list-card';
import { Switch } from '@/registry/ui/switch';

const PAGES: BarListItem[] = [
  { label: '/', value: 12480 },
  { label: '/pricing', value: 6210 },
  { label: '/components', value: 4880 },
  { label: '/blog/launch', value: 2140 },
  { label: '/docs/installation', value: 1720 },
  { label: '/changelog', value: 960 },
];

/* Left: traffic broken down four ways. Switch tabs, click the caption's % / #
   to swap shares for counts, hover a row for the other number, and open the
   pill under a long list. Right: one list of pages in raw views. */
export default function Demo() {
  const [mono, setMono] = useState(false);

  return (
    <div className="flex w-full max-w-[920px] flex-col gap-3" data-demo>
      <div className="flex justify-end">
        <Switch size="sm" isSelected={mono} onChange={setMono}>
          Mono
        </Switch>
      </div>
      <div className="grid items-start gap-4 md:grid-cols-2">
        <BarListCard title="Traffic" limit={4} mono={mono} />
        <BarListCard title="Pages" items={PAGES} metricLabel="Views" defaultMetric="value" limit={3} mono={mono} />
      </div>
    </div>
  );
}
