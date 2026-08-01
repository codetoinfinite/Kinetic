'use client';

import { RadialMaskSpotlight } from '@/registry/ui/radial-mask-spotlight';

const rows = [
  ['01', 'Sodium vapour', '1932'],
  ['02', 'Carbon arc', '1878'],
  ['03', 'Tungsten halogen', '1959'],
  ['04', 'Low-pressure xenon', '1946'],
  ['05', 'Phosphor-coated LED', '1996'],
  ['06', 'Quantum dot', '2013'],
];

export default function Demo() {
  return (
    <div className="relative h-full w-full bg-bg">
      {/* Dim base copy, always present. */}
      <div className="absolute inset-0 p-6 sm:p-8">
        <Table className="text-faint" />
      </div>

      {/* The same table, bright, revealed only under the beam. */}
      <RadialMaskSpotlight className="absolute inset-0" radius={160}>
        <div className="h-full w-full p-6 sm:p-8">
          <Table className="text-fg" />
        </div>
      </RadialMaskSpotlight>
    </div>
  );
}

function Table({ className }: { className?: string }) {
  return (
    <div className={className}>
      <p className="font-mono text-[11px] uppercase tracking-[0.2em]">
        Illuminants
      </p>
      <ul className="mt-4 divide-y divide-line">
        {rows.map(([n, name, year]) => (
          <li key={n} className="flex items-baseline gap-4 py-2.5 text-sm">
            <span className="font-mono text-xs opacity-60">{n}</span>
            <span className="flex-1">{name}</span>
            <span className="font-mono text-xs opacity-60">{year}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
