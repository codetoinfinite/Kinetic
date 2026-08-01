'use client';

import { RealtimeCubeEnvmap } from '@/registry/ui/realtime-cube-envmap';

export default function Demo() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-bg">
      <RealtimeCubeEnvmap shape="knot" panelCount={7} spinSpeed={0.2} hue={206} />

      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-5">
        <div className="flex items-start justify-between">
          <span className="meta">Materials</span>
          <span className="meta text-faint">04 / 12</span>
        </div>
        <div className="max-w-[24ch]">
          <p className="text-sm leading-snug tracking-tight text-fg">
            Polished steel, captured in the room it is standing in.
          </p>
          <p className="mt-1 text-xs text-faint">Six faces, every other frame</p>
        </div>
      </div>
    </div>
  );
}
