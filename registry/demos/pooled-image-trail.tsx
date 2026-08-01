'use client';

import { PooledImageTrail } from '@/registry/ui/pooled-image-trail';

export default function Demo() {
  return (
    <PooledImageTrail className="h-full w-full bg-bg" tileWidth={188} tileHeight={128}>
      <div className="flex h-full w-full flex-col justify-between p-6 sm:p-8">
        <p className="meta">Archive — 2019/2025</p>
        <h2 className="max-w-md text-3xl leading-[0.95] tracking-tight sm:text-5xl">
          Six years
          <br />
          of looking
          <br />
          closely.
        </h2>
        <p className="meta">Move across the panel</p>
      </div>
    </PooledImageTrail>
  );
}
