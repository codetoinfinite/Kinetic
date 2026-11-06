'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Typewriter Install" (boardui.com/).
 * No BoardUI source was used.
 */

import { useState } from 'react';

import { TypewriterInstall } from '@/registry/ui/typewriter-install';

/* Controlled so the caption can follow the tab. Each tab change remounts the
   line inside the component, so the command types again from the start. */
export default function Demo() {
  const [manager, setManager] = useState('pnpm');

  return (
    <div className="flex w-full max-w-[560px] flex-col items-center gap-6 text-center">
      <div className="flex flex-col items-center gap-1.5">
        <h3 className="text-title-2-semibold text-text-primary">Install the icon set</h3>
        <p className="max-w-[420px] text-body-regular text-text-secondary">
          Pick a package manager and the command types itself again. Copy always takes the whole line.
        </p>
      </div>

      <TypewriterInstall packageName="@remixicon/react" value={manager} onChange={setManager} className="text-start" />

      <p className="text-caption-1-medium text-text-tertiary">
        Package manager: <span className="font-mono text-text-secondary">{manager}</span>
      </p>
    </div>
  );
}
