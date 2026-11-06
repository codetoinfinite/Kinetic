'use client';

import { useState } from 'react';
import { RiRefreshLine } from '@remixicon/react';
import { Button } from '@/registry/ui/button';
import { LogRow, ShimmerText, WorkingRow, useLogMotion, useRevealTicker } from '@/registry/ui/agent-log';

/* The machinery as Task List uses it: an agent's steps arriving one by one on
   a curved guide, the newest line shimmering until the next lands, and the
   stars indicator trailing loose underneath while the run continues. */
const STEPS = [
  'Read the brief: Q3 churn review for the Growth team',
  'Queried billing events from 1 Jul to 30 Sep',
  'Grouped 412 cancellations by plan and seat count',
  'Compared each segment against the Q2 baseline',
  'Found churn concentrated in 1-3 seat Starter workspaces',
  'Drafted three findings with supporting charts',
];

/* Real steps take uneven time: dwell on the query and the comparison. */
const DELAYS = [400, 900, 1500, 1000, 1300, 900];
const delayFor = (index: number) => DELAYS[index] ?? 850;

function Run({ onReplay }: { onReplay: () => void }) {
  const reduce = useLogMotion();
  const [done, setDone] = useState(false);
  const revealed = useRevealTicker({ total: STEPS.length, delayFor, onComplete: () => setDone(true) });

  return (
    <section
      aria-labelledby="agent-log-title"
      className="flex w-full max-w-[520px] flex-col gap-4 rounded-2xl border border-border-table bg-background-primary-default p-5"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id="agent-log-title" className="text-headline-semibold text-text-primary">
            Q3 churn review
          </h3>
          <p className="text-caption-1-medium text-text-tertiary" aria-live="polite">
            {done ? `Finished · ${STEPS.length} steps` : `Research agent · step ${Math.max(revealed, 1)} of ${STEPS.length}`}
          </p>
        </div>
        <Button variant="secondary" size="xs" leadingIcon={RiRefreshLine} disabled={!done} onClick={onReplay}>
          Replay
        </Button>
      </header>

      <div className="min-h-[248px]">
        <ol className="flex flex-col">
          {STEPS.slice(0, revealed).map((step, index) => {
            const isLast = index === revealed - 1;
            return (
              <LogRow key={step} first={index === 0} last={isLast} reduce={reduce}>
                <div className="py-1 text-body-regular text-text-secondary">
                  {isLast && !done ? <ShimmerText>{step}</ShimmerText> : step}
                </div>
              </LogRow>
            );
          })}
        </ol>
        {/* Mounted only after the first row, so nothing motion-driven is on the
            hydration pass while the reduced-motion preference is unknown. */}
        {revealed > 0 && !done ? <WorkingRow label="Working" reduce={reduce} className="mt-1" /> : null}
      </div>
    </section>
  );
}

export default function Demo() {
  const [runId, setRunId] = useState(0);

  return (
    <div className="flex w-full items-center justify-center p-4 sm:p-8">
      <Run key={runId} onReplay={() => setRunId((n) => n + 1)} />
    </div>
  );
}
