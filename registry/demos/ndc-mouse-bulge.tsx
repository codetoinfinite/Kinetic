'use client';

import { NdcMouseBulge } from '@/registry/ui/ndc-mouse-bulge';

export default function Demo() {
  return (
    <div className="relative h-full w-full bg-bg">
      <NdcMouseBulge />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-4">
        <p className="text-sm tracking-tight text-fg">Plate 07</p>
        <p className="meta">Move the cursor</p>
      </div>
    </div>
  );
}
