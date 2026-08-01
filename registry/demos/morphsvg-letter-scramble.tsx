'use client';

import { LetterScramble } from '@/registry/ui/morphsvg-letter-scramble';

const ROWS = [
  { label: 'Sample rate', value: '48.2 KHZ' },
  { label: 'Link', value: 'STABLE' },
];

export default function Demo() {
  return (
    <div className="flex h-full w-full flex-col justify-between p-5 sm:p-7">
      <span className="meta">Ground station 07</span>

      <h2 className="text-3xl leading-none tracking-tight text-fg sm:text-5xl">
        <LetterScramble text="TRANSMIT" seed="transmit" />
      </h2>

      <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-2 border-t border-line pt-4">
        {ROWS.map((row) => (
          <div key={row.label} className="col-span-2 grid grid-cols-subgrid items-baseline">
            <dt className="meta">{row.label}</dt>
            <dd className="font-mono text-xs tracking-[0.12em] text-accent">
              <LetterScramble
                text={row.value}
                seed={row.label}
                flips={4}
                stagger={0.05}
                settle={0.3}
              />
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
