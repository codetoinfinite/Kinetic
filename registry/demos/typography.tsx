'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Typography" (boardui.com/components/typography).
 * No BoardUI source was used.
 */

import { useState } from 'react';

import { cx } from '@/registry/lib/cx';
import { Input } from '@/registry/ui/input';
import { SegmentedControl, SegmentedControlItem } from '@/registry/ui/segmented-control';
import { TYPE_SCALE, TYPE_WEIGHTS, TypeFamilySection } from '@/registry/ui/typography';
import type { TypeWeight } from '@/registry/ui/typography';

const ALL_WEIGHTS: readonly TypeWeight[] = ['regular', 'medium', 'semibold', 'bold'];

export default function Demo() {
  const [familyId, setFamilyId] = useState('title-1');
  const [weight, setWeight] = useState<TypeWeight | 'all'>('all');
  const [sample, setSample] = useState('The five boxing wizards jump quickly.');

  const family = TYPE_SCALE.find((f) => f.id === familyId) ?? TYPE_SCALE[0]!;
  const weights = weight === 'all' ? ALL_WEIGHTS : [weight];

  return (
    <div
      className="flex h-[512px] w-full max-w-[1040px] flex-col overflow-hidden rounded-2xl border border-border-button-default bg-background-primary-default md:flex-row"
      data-demo
    >
      <nav
        aria-label="Type families"
        className="flex shrink-0 gap-1 overflow-x-auto border-b border-border-button-default p-2 md:w-[188px] md:flex-col md:overflow-y-auto md:border-e md:border-b-0"
      >
        {TYPE_SCALE.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-current={f.id === familyId ? 'true' : undefined}
            onClick={() => setFamilyId(f.id)}
            className={cx(
              'shrink-0 cursor-pointer rounded-lg px-2.5 py-1.5 text-start text-body-regular whitespace-nowrap outline-none',
              'transition-colors duration-150 ease-out motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-border-focus-ring',
              f.id === familyId
                ? 'bg-background-secondary-default text-body-medium text-text-primary'
                : 'text-text-secondary hover:bg-background-secondary-default hover:text-text-primary',
            )}
          >
            {f.name}
          </button>
        ))}
      </nav>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex flex-col gap-2 border-b border-border-button-default p-3 lg:flex-row lg:items-center lg:justify-between">
          <Input
            aria-label="Sample text"
            value={sample}
            onChange={setSample}
            placeholder="Type a sample sentence"
            className="w-full lg:max-w-[340px]"
          />
          <div className="overflow-x-auto">
            <SegmentedControl
              aria-label="Weight"
              selectedKeys={new Set([weight])}
              onSelectionChange={(keys) => {
                const next = [...keys][0];
                if (typeof next === 'string') setWeight(next as TypeWeight | 'all');
              }}
            >
              <SegmentedControlItem id="all">All</SegmentedControlItem>
              {TYPE_WEIGHTS.map((w) => (
                <SegmentedControlItem key={w.id} id={w.id}>
                  {w.name}
                </SegmentedControlItem>
              ))}
            </SegmentedControl>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <TypeFamilySection
            key={family.id}
            family={family}
            weights={weights}
            sample={sample.trim() || 'The five boxing wizards jump quickly.'}
          />
        </div>
      </div>
    </div>
  );
}
