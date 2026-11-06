'use client';

import { useState } from 'react';

import { CloseButton } from '@/registry/ui/close-button';

const SIZES = [
  { size: '2xs', px: 16 },
  { size: 'xs', px: 20 },
  { size: 'sm', px: 24 },
  { size: 'md', px: 32 },
] as const;

/* The four sizes side by side so the per-size stroke weights can be compared,
   then the xs button doing its real job in the corner of an announcement. */
export default function Demo() {
  const [open, setOpen] = useState(true);

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-6">
      <div className="flex items-end gap-6">
        {SIZES.map(({ size, px }) => (
          <div key={size} className="flex flex-col items-center gap-2">
            <CloseButton size={size} aria-label={`Close (${size})`} />
            <span className="text-caption-1-medium text-text-tertiary">
              {size} · {px}px
            </span>
          </div>
        ))}
      </div>

      <div className="flex h-[92px] w-full items-center justify-center">
        {open ? (
          <div className="relative w-full rounded-xl border border-border-button-default bg-background-primary-default p-4 pe-10 shadow-xs">
            <p className="text-body-medium text-text-primary">Workspace analytics is live</p>
            <p className="mt-1 text-body-2-regular text-text-secondary">
              Weekly reports now include retention and funnel charts.
            </p>
            <CloseButton
              size="xs"
              aria-label="Dismiss announcement"
              className="absolute end-3 top-3"
              onClick={() => setOpen(false)}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-md px-2 py-1 text-body-medium text-accent-600 underline-offset-3 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
          >
            Show announcement again
          </button>
        )}
      </div>
    </div>
  );
}
