'use client';

import { ConicBorder } from '@/registry/ui/conic-property-border';

export default function Demo() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 px-6">
      <ConicBorder className="px-5 py-2" glow="var(--color-accent)">
        <span className="meta">Now in private beta</span>
      </ConicBorder>

      <ConicBorder
        radius="10px"
        thickness="1px"
        durationMs={6500}
        className="w-full max-w-sm flex-col items-start gap-2 px-6 py-5"
      >
        <span className="text-sm tracking-tight text-fg">Realtime index</span>
        <span className="text-xs leading-relaxed text-muted">
          Rebuilt continuously from the write-ahead log. The ring is the only thing on this
          card that moves, and it costs one property per frame.
        </span>
      </ConicBorder>
    </div>
  );
}
