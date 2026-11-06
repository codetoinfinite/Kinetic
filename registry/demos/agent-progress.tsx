'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Agent Progress" (boardui.com/components/agent-progress).
 * No BoardUI source was used.
 */

import { useState } from 'react';
import { RiRestartLine, RiSkipForwardLine } from '@remixicon/react';
import { AgentProgress } from '@/registry/ui/agent-progress';
import { Button } from '@/registry/ui/button';

/* A dark-mode task that checks itself off every 2.4s. Skip step jumps ahead,
   Restart remounts the block so the stagger plays again, and once the run
   finishes the agent's reply takes over below it. */
const STEPS = [
  'Read project files',
  'Update light mode tokens',
  'Implement dark mode tokens',
  'Register the theme toggle',
  'Run lint and production build',
];

export default function Demo() {
  const [run, setRun] = useState(0);
  const [step, setStep] = useState(0);
  const [replied, setReplied] = useState(false);

  const restart = () => {
    setStep(0);
    setReplied(false);
    setRun((r) => r + 1);
  };

  return (
    <div className="flex w-full items-center justify-center p-4">
      <div className="flex w-full max-w-[340px] flex-col gap-3">
        <AgentProgress
          key={run}
          steps={STEPS}
          step={step}
          onStepChange={setStep}
          stepDuration={2400}
          completionDelay={1000}
          onFinished={() => setReplied(true)}
        />
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="small"
            leadingIcon={RiSkipForwardLine}
            className="flex-1"
            onClick={() => setStep((s) => Math.min(STEPS.length, s + 1))}
            disabled={step >= STEPS.length}
          >
            Skip step
          </Button>
          <Button variant="secondary" size="small" leadingIcon={RiRestartLine} className="flex-1" onClick={restart}>
            Restart
          </Button>
        </div>
        <p
          role="status"
          className={
            replied
              ? 'rounded-2xl bg-background-secondary-default px-3.5 py-2.5 text-body-regular text-text-primary'
              : 'sr-only'
          }
        >
          {replied ? 'Dark mode is wired up: tokens for both themes, a toggle in the header, and a clean lint and build.' : ''}
        </p>
      </div>
    </div>
  );
}
