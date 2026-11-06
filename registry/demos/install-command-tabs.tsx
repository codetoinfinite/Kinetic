'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Install Command Tabs" (boardui.com/components/line-chart-card).
 * No BoardUI source was used.
 */

import { useState } from 'react';

import { InstallCommandTabs, InstallStep, InstallSteps } from '@/registry/ui/install-command-tabs';
import type { PackageManager } from '@/registry/ui/install-command-tabs';

export default function Demo() {
  // One shared value keeps every block on the reader's package manager.
  const [manager, setManager] = useState<PackageManager>('pnpm');
  const [copied, setCopied] = useState<string | null>(null);

  return (
    <div className="flex w-full max-w-[640px] flex-col gap-6" data-demo>
      <InstallSteps>
        <InstallStep step={1} title="Add the component" description="Copies the source into your project, next to your other components.">
          <InstallCommandTabs
            run="boardui@latest add line-chart-card"
            value={manager}
            onValueChange={setManager}
            onCopied={setCopied}
          />
        </InstallStep>
        <InstallStep step={2} title="Install its peers" description="Charts and motion come from two small packages.">
          <InstallCommandTabs install={['recharts', 'motion']} value={manager} onValueChange={setManager} onCopied={setCopied} />
        </InstallStep>
      </InstallSteps>
      <p className="ps-11 text-caption-1-regular text-text-tertiary" aria-live="polite">
        {copied ? `Copied: ${copied}` : `Both steps follow the selected manager (${manager}).`}
      </p>
    </div>
  );
}
