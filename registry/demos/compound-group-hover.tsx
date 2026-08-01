'use client';

import { CompoundGroupHover } from '@/registry/ui/compound-group-hover';

/* Hand-drawn 24x24 marks rather than an icon package — the registry ships no
   assets and no dependencies it does not need. */
function Compass() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="12" cy="12" r="8.5" />
      <path d="m15 9-2.2 4.8L8 16l2.2-4.8Z" strokeLinejoin="round" />
    </svg>
  );
}

function Grid() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="4" y="4" width="6.5" height="6.5" rx="1" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1" />
      <path d="M13.5 16.75h6.5" strokeLinecap="round" />
    </svg>
  );
}

export default function Demo() {
  return (
    <div className="grid h-full w-full grid-cols-1 items-stretch gap-4 p-6 sm:grid-cols-2">
      <CompoundGroupHover
        eyebrow="01"
        title="Discover"
        description="Two weeks of reading the analytics nobody has opened since the launch."
        icon={<Compass />}
        href="#discover"
        action="See the method"
      />
      <CompoundGroupHover
        eyebrow="02"
        title="Design"
        description="Drawn at the size it ships at, in the browser, against real copy."
        icon={<Grid />}
        href="#design"
        action="See the method"
        accent="oklch(0.78 0.15 95)"
      />
    </div>
  );
}
