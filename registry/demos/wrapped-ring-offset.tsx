'use client';

import { WrappedRingOffset } from '@/registry/ui/wrapped-ring-offset';

export default function Demo() {
  return (
    <div className="flex h-full w-full flex-col bg-bg">
      <div className="shrink-0 px-4 pt-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-faint">
          wrappedOffset(i, p, n)
        </p>
        <p className="mt-1 max-w-[46ch] text-[13px] leading-snug text-muted">
          The struck-through number is what <span className="text-fg">i − p</span> would have said.
          It leaps by ten at the seam. The dot does not move.
        </p>
      </div>
      <div className="min-h-0 flex-1">
        <WrappedRingOffset />
      </div>
    </div>
  );
}
