'use client';

import { useEffect, useRef, useState } from 'react';

import { Button } from '@/registry/ui/button';
import { Spinner, type SpinnerSize } from '@/registry/ui/spinner';

/* The size ladder, then the spinner where it is used: on a primary surface
   (as on BoardUI's tile), muted beside a sync status, and inside a button
   that is saving. The button's spinner is aria-hidden, because the button
   itself announces the wait. */
const SIZES: SpinnerSize[] = ['xs', 'sm', 'md', 'lg', 'xl'];

export default function Demo() {
  const [saving, setSaving] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const save = () => {
    if (saving) return;
    setSaving(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setSaving(false), 2000);
  };

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="flex flex-wrap items-end justify-center gap-6">
        {SIZES.map((size) => (
          <div key={size} className="flex flex-col items-center gap-2">
            <div className="flex h-8 items-center">
              <Spinner size={size} />
            </div>
            <span className="text-caption-1-medium text-text-tertiary">{size}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-5">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-button-primary shadow-xs">
          <Spinner size="lg" className="text-white" aria-label="Uploading" />
        </span>

        <span className="inline-flex items-center gap-2 rounded-full bg-background-secondary-default px-3 py-1.5 text-body-medium text-text-secondary">
          <Spinner size="sm" className="text-text-tertiary" aria-hidden />
          Syncing 128 records
        </span>

        <Button onClick={save} className="min-w-[132px]">
          <span className="inline-flex items-center gap-2" aria-live="polite">
            {saving ? <Spinner size="sm" className="text-white" aria-hidden /> : null}
            {saving ? 'Saving' : 'Save changes'}
          </span>
        </Button>
      </div>
    </div>
  );
}
