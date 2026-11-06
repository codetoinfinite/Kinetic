'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Docs Callout" (boardui.com/components/typography).
 * No BoardUI source was used.
 */

import { useRef, useState } from 'react';
import { RiArrowGoBackLine } from '@remixicon/react';
import { DocsCallout } from '@/registry/ui/docs-callout';
import { Button } from '@/registry/ui/button';

export default function Demo() {
  const [dismissed, setDismissed] = useState(0);
  const [round, setRound] = useState(0);
  const restoreRef = useRef<HTMLButtonElement>(null);

  // The close button is about to unmount; keep keyboard users on a live control.
  const handleDismiss = () => {
    setDismissed((n) => n + 1);
    restoreRef.current?.focus();
  };

  return (
    <div data-demo className="flex w-full max-w-[880px] flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-title-3-medium text-text-primary">Typography</h2>
          <p className="hidden text-body-regular text-text-secondary sm:block">Four callout variants. Tip and Warning can be dismissed.</p>
        </div>
        <Button
          ref={restoreRef}
          type="button"
          variant="secondary"
          size="small"
          leadingIcon={RiArrowGoBackLine}
          aria-disabled={dismissed === 0 || undefined}
          onClick={() => {
            if (dismissed === 0) return;
            setDismissed(0);
            setRound((r) => r + 1);
          }}
        >
          Restore{dismissed > 0 ? ` (${dismissed})` : ''}
        </Button>
      </div>

      <div
        key={round}
        role="region"
        aria-label="Callout examples"
        tabIndex={0}
        className="grid max-h-[440px] gap-3 overflow-y-auto rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring md:max-h-none md:grid-cols-2 md:overflow-visible"
      >
        <DocsCallout variant="info">
          Type tokens bundle size, line height and weight. Use <code>text-body-regular</code> instead of setting each one.
        </DocsCallout>
        <DocsCallout variant="tip" dismissible onDismiss={handleDismiss}>
          Pair <code>text-title-3-medium</code> headings with body copy for docs sections.
        </DocsCallout>
        <DocsCallout variant="warning" title="Captions are for labels" dismissible onDismiss={handleDismiss}>
          Long paragraphs set in caption sizes are hard to read. Keep them to one line of metadata.
        </DocsCallout>
        <DocsCallout variant="danger">
          Never hard-code font sizes in components. Raw <code>px</code> values skip the token scale and break theming.
        </DocsCallout>
      </div>
    </div>
  );
}
