'use client';

import { FullscreenTrianglePass } from '@/registry/ui/fullscreen-triangle-pass';

export default function Demo() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-bg">
      <FullscreenTrianglePass />

      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-6">
        <div className="flex items-start justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          <span>Pass 01</span>
          <span>3 vertices</span>
        </div>
        <div>
          <h2 className="max-w-[16ch] text-3xl leading-[0.95] tracking-tight text-fg">
            One triangle, no seam
          </h2>
          <p className="mt-2 max-w-[38ch] text-xs leading-relaxed text-muted">
            The clipped triangle covers the viewport exactly. Move the cursor to bring the fine
            grid into focus.
          </p>
        </div>
      </div>
    </div>
  );
}
