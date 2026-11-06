'use client';

import { useEffect, useRef, useState } from 'react';
import { I18nProvider } from 'react-aria-components';

import { Button } from '@/registry/ui/button';
import { ProgressBar, ProgressCircle } from '@/registry/ui/progress';

/* BoardUI's tile (a determinate bar, an indeterminate sweep and rings), with
   an upload you can run so the eased fill is visible as the value changes. */
const STEPS = [8, 21, 34, 47, 58, 72, 86, 100];

export default function Demo() {
  const [step, setStep] = useState(-1);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearInterval(timer.current), []);

  const value = step < 0 ? 0 : (STEPS[step] ?? 100);
  const running = step >= 0 && step < STEPS.length - 1;

  const start = () => {
    if (running) return;
    window.clearInterval(timer.current);
    let next = 0;
    setStep(next);
    timer.current = window.setInterval(() => {
      next += 1;
      setStep(next);
      if (next >= STEPS.length - 1) window.clearInterval(timer.current);
    }, 550);
  };

  // React Aria formats dates and numbers in the browser's language; pin it to
  // en-US so the values match this demo's English copy and the server render.
  return (
    <I18nProvider locale="en-US">
      <div className="grid w-full max-w-[620px] grid-cols-1 items-center gap-8 sm:grid-cols-[1fr_auto]">
        <div className="flex flex-col gap-5">
          <ProgressBar
            label="Uploading Q3-report.pdf"
            value={value}
            description={value === 100 ? 'Upload complete' : '2.4 MB of 3.8 MB'}
          />
          <ProgressBar label="Preparing export" isIndeterminate description="This can take a minute for large boards" />
          <ProgressBar aria-label="Storage used" value={64} size="sm" />
          <div>
            <Button variant="secondary" size="small" onClick={start} aria-disabled={running || undefined}>
              {running ? 'Uploading' : value === 100 ? 'Upload again' : 'Start upload'}
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 sm:flex-col sm:items-start">
          <div className="flex items-center gap-4">
            <ProgressCircle aria-label="Onboarding" value={25} />
            <ProgressCircle aria-label="Upload" value={70} />
            <ProgressCircle aria-label="Syncing" isIndeterminate />
          </div>
          <div className="flex items-center gap-4">
            <ProgressCircle aria-label="Small ring" size="sm" value={value} />
            <ProgressCircle aria-label="Large ring" size="lg" value={value} />
          </div>
        </div>
      </div>
    </I18nProvider>
  );
}
