'use client';

import { CursorReactiveShaderGlow } from '@/registry/ui/cursor-reactive-shader-glow';

export default function Demo() {
  return (
    <div className="h-full w-full">
      <CursorReactiveShaderGlow>
        <div className="flex h-full w-full flex-col justify-between p-7">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-fg/70">
              Halcyon
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-fg/40">
              Vol. 04
            </span>
          </div>

          <div>
            <h2 className="max-w-[16ch] text-[clamp(1.9rem,5.5vw,3.1rem)] font-medium leading-[0.94] tracking-tight text-fg">
              Light follows the hand
            </h2>
            <p className="mt-3 max-w-[42ch] text-xs leading-relaxed text-fg/60">
              A field of warped noise, drifting on its own. The glow is damped toward the
              pointer rather than pinned to it, and the whole frame is held under a
              luminance budget so this line stays readable wherever the light goes.
            </p>
            <div className="mt-6 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-fg/45">
              <span>Damped follow</span>
              <span aria-hidden className="h-px w-6 bg-fg/25" />
              <span>Luminance ceiling</span>
            </div>
          </div>
        </div>
      </CursorReactiveShaderGlow>
    </div>
  );
}
