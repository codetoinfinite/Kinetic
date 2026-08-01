'use client';

import { AnalyticDiscPicking } from '@/registry/ui/analytic-disc-picking';

export default function Demo() {
  return (
    <div className="flex h-full w-full flex-col bg-bg">
      <div className="shrink-0 px-4 pt-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-faint">
          ray · plane · radius
        </p>
        <p className="mt-1 max-w-[46ch] text-[13px] leading-snug text-muted">
          No raycast. The pointer ray meets each disc&rsquo;s plane and the hit is measured
          against the radius. The second readout is what a real Raycaster claims, testing
          the flat square the vertex shader already turned to face you.
        </p>
      </div>
      <div className="min-h-0 flex-1">
        <AnalyticDiscPicking compare />
      </div>
    </div>
  );
}
