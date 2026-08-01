'use client';

import { TweenedCursorUniform } from '@/registry/ui/tweened-cursor-uniform';

export default function Demo() {
  return (
    <div className="relative h-full w-full">
      <TweenedCursorUniform />

      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-6 sm:p-8">
        <p className="meta">Field study 04</p>
        <div>
          <h2 className="max-w-sm text-2xl leading-tight tracking-tight sm:text-3xl">
            The grid bends where you look.
          </h2>
          <p className="meta mt-3">Pointer — tweened, not damped</p>
        </div>
      </div>
    </div>
  );
}
