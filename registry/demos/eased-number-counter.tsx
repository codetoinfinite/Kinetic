'use client';

import { EasedNumberCounter } from '@/registry/ui/eased-number-counter';

const STATS = [
  { value: 128, decimals: 0, suffix: '', label: 'Editions printed' },
  { value: 4200, decimals: 0, suffix: '', label: 'Sheets folded by hand' },
  { value: 96.4, decimals: 1, suffix: '%', label: 'Delivered inside the week' },
];

export default function Demo() {
  return (
    <div className="flex h-full w-full flex-col justify-center gap-6 bg-bg px-6 py-8">
      <div>
        <p className="meta">Since 2019</p>
        <h2 className="mt-1 max-w-[22ch] text-lg leading-tight tracking-tight text-fg">
          A small press, measured.
        </h2>
      </div>

      <div className="rule" />

      <dl className="grid grid-cols-3 gap-4">
        {STATS.map((stat) => (
          <div key={stat.label}>
            <dd className="text-[clamp(24px,5vw,44px)] leading-none tracking-tight text-fg">
              <EasedNumberCounter
                to={stat.value}
                decimals={stat.decimals}
                suffix={stat.suffix}
              />
            </dd>
            <dt className="mt-2 max-w-[14ch] text-xs leading-snug text-muted">
              {stat.label}
            </dt>
          </div>
        ))}
      </dl>
    </div>
  );
}
