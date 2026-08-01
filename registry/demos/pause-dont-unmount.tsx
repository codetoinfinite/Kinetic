'use client';

import { PauseDontUnmount } from '@/registry/ui/pause-dont-unmount';

export default function Demo() {
  return (
    <div className="flex h-full w-full flex-col bg-bg">
      <div className="shrink-0 px-4 pt-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-faint">
          activity vs conditional
        </p>
        <p className="mt-1 max-w-[46ch] text-[13px] leading-snug text-muted">
          Hide, wait, show. Under <span className="font-mono">activity</span> the stack
          resumes at the angle it froze on and the build count climbs; under{' '}
          <span className="font-mono">unmount</span> it starts over and the count never
          moves. Both release the GL context on the way out.
        </p>
      </div>
      <div className="min-h-0 flex-1">
        <PauseDontUnmount />
      </div>
    </div>
  );
}
