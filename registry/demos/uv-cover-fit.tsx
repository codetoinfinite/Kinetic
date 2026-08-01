'use client';

import { UvCoverFit } from '@/registry/ui/uv-cover-fit';

export default function Demo() {
  return (
    <div className="relative flex h-full w-full flex-col bg-bg">
      <div className="flex items-baseline justify-between border-b border-line px-4 py-3">
        <p className="text-sm tracking-tight text-fg">Editorial Crop</p>
        <p className="meta">1200 x 675 source</p>
      </div>
      <div className="min-h-0 flex-1">
        <UvCoverFit />
      </div>
    </div>
  );
}
