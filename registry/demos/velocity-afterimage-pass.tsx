'use client';

import { VelocityAfterimagePass } from '@/registry/ui/velocity-afterimage-pass';

export default function Demo() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-bg">
      <VelocityAfterimagePass hue={188} satellites={4} />

      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-5 sm:p-7">
        <div className="flex items-baseline justify-between">
          <span className="meta">Afterimage</span>
          <span className="meta">Ping-pong, half float</span>
        </div>
        <p className="max-w-[26ch] text-sm leading-snug tracking-tight text-fg">
          Move slowly and it stays sharp. Move fast and it remembers.
        </p>
      </div>
    </div>
  );
}
