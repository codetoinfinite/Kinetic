'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Color" (boardui.com/components/color).
 * No BoardUI source was used.
 */

import { RiSearchLine } from '@remixicon/react';
import { useState } from 'react';

import { ColorPalette, COLOR_GROUPS } from '@/registry/ui/color';
import { Input } from '@/registry/ui/input';
import { SegmentedControl, SegmentedControlItem } from '@/registry/ui/segmented-control';

export default function Demo() {
  const [group, setGroup] = useState('all');
  const [query, setQuery] = useState('');
  const [lastCopied, setLastCopied] = useState<string | null>(null);

  return (
    <div
      className="flex h-[512px] w-full max-w-[1040px] flex-col overflow-hidden rounded-2xl border border-border-button-default bg-background-primary-default"
      data-demo
    >
      <div className="flex flex-col gap-2 border-b border-border-button-default p-3 lg:flex-row lg:items-center lg:justify-between">
        <Input
          aria-label="Filter tokens"
          value={query}
          onChange={setQuery}
          placeholder="Filter, e.g. primary or chart"
          leadingIcon={RiSearchLine}
          className="w-full lg:max-w-[300px]"
        />
        <div className="overflow-x-auto">
          <SegmentedControl
            aria-label="Group"
            selectedKeys={new Set([group])}
            onSelectionChange={(keys) => {
              const next = [...keys][0];
              if (typeof next === 'string') setGroup(next);
            }}
          >
            <SegmentedControlItem id="all">All</SegmentedControlItem>
            {COLOR_GROUPS.map((g) => (
              <SegmentedControlItem key={g.id} id={g.id}>
                {g.title}
              </SegmentedControlItem>
            ))}
          </SegmentedControl>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">
        <ColorPalette
          groups={group === 'all' ? undefined : [group]}
          query={query}
          onCopied={setLastCopied}
          className="gap-8"
        />
      </div>
      <p
        className="truncate border-t border-border-button-default px-4 py-2 text-caption-1-regular text-text-tertiary"
        data-last-copied
      >
        {lastCopied ? (
          <>
            Copied <span className="font-mono text-text-secondary">{lastCopied}</span>. Use it as{' '}
            <span className="font-mono text-text-secondary">var({lastCopied})</span>.
          </>
        ) : (
          'Click a token to copy its variable name. Swatches follow the current theme.'
        )}
      </p>
    </div>
  );
}
