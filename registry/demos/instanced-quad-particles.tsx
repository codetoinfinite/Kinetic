'use client';

import { InstancedQuadParticles } from '@/registry/ui/instanced-quad-particles';

export default function Demo() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-bg">
      <InstancedQuadParticles density={1000} sizeRange={[4, 26]} spin={0.6} opacity={0.6} />

      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-6">
        <div className="flex items-start justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-fg mix-blend-difference">
          <span>Field</span>
          <span>One draw call</span>
        </div>
        <div className="mix-blend-difference">
          <h2 className="max-w-[13ch] text-3xl leading-[0.95] tracking-tight text-fg">
            Eighteen hundred, drawn once
          </h2>
          <p className="mt-2 max-w-[38ch] text-xs leading-relaxed text-fg/70">
            Quads, not point sprites — so each one has its own size, spin and silhouette.
          </p>
        </div>
      </div>
    </div>
  );
}
