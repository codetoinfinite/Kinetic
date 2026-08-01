'use client';

import { CpuMirrorPicking } from '@/registry/ui/cpu-mirror-picking';

export default function Demo() {
  return (
    <div className="flex h-full w-full flex-col bg-bg">
      <div className="shrink-0 px-4 pt-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-faint">
          compositor spin · cpu projection
        </p>
        <p className="mt-1 max-w-[46ch] text-[13px] leading-snug text-muted">
          The plates are inert to the pointer. The crosshair is where JavaScript computed
          the plate to be, recomputed every frame from the animation clock.
        </p>
      </div>
      <div className="min-h-0 flex-1">
        <CpuMirrorPicking />
      </div>
    </div>
  );
}
