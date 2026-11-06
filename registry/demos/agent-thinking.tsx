'use client';

import { useState } from 'react';
import { RiRefreshLine } from '@remixicon/react';
import { AgentThinking } from '@/registry/ui/agent-thinking';
import type { AgentThinkingTone, AgentThinkingVariant } from '@/registry/ui/agent-thinking';
import { Button } from '@/registry/ui/button';
import { SegmentedControl, SegmentedControlItem } from '@/registry/ui/segmented-control';
import { Switch } from '@/registry/ui/switch';

/* BoardUI's preview stacks the four indicators with their timers off. Next
   to it, one live instance sits in a chat thread above the composer, where it
   belongs, with its timer on and controls for variant, tone and shimmer. */
const STATES: { variant: AgentThinkingVariant; label: string }[] = [
  { variant: 'wave', label: 'Thinking' },
  { variant: 'spin', label: 'Searching the docs' },
  { variant: 'stars', label: 'Reading files' },
  { variant: 'infinity', label: 'Writing the answer' },
];

const VARIANT_NAMES: Record<AgentThinkingVariant, string> = {
  wave: 'Wave',
  spin: 'Spin',
  stars: 'Stars',
  infinity: 'Infinity',
};

const TONES: { id: AgentThinkingTone | 'auto'; name: string }[] = [
  { id: 'auto', name: 'Auto' },
  { id: 'subtle', name: 'Subtle' },
  { id: 'primary', name: 'Primary' },
  { id: 'accent', name: 'Accent' },
];

export default function Demo() {
  const [variant, setVariant] = useState<AgentThinkingVariant>('wave');
  const [tone, setTone] = useState<AgentThinkingTone | 'auto'>('auto');
  const [shimmer, setShimmer] = useState(true);
  const [showTimer, setShowTimer] = useState(true);
  const [run, setRun] = useState(0);

  const label = STATES.find((s) => s.variant === variant)?.label ?? 'Thinking';

  return (
    <div className="flex w-full items-center justify-center p-4 sm:p-8">
      <div className="grid w-full max-w-[880px] gap-4 md:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
        <section
          aria-labelledby="states-title"
          className="flex flex-col rounded-2xl border border-border-table bg-background-primary-default p-5"
        >
          <h3 id="states-title" className="text-headline-semibold text-text-primary">
            Thinking states
          </h3>
          <p className="mt-0.5 text-caption-1-medium text-text-tertiary">One per kind of work</p>
          <div className="flex flex-1 items-center py-6">
            <div className="flex flex-col items-start gap-3.5">
              {STATES.map((s) => (
                <AgentThinking key={s.variant} variant={s.variant} label={s.label} showTimer={false} />
              ))}
            </div>
          </div>
        </section>

        <section
          aria-labelledby="thread-title"
          className="flex min-w-0 flex-col rounded-2xl border border-border-table bg-background-primary-default"
        >
          <header className="flex items-center justify-between gap-3 border-b border-border-table px-5 py-3.5">
            <div className="min-w-0">
              <h3 id="thread-title" className="text-headline-semibold text-text-primary">
                Research assistant
              </h3>
              <p className="truncate text-caption-1-medium text-text-tertiary">Q3 churn interviews</p>
            </div>
            <Button
              variant="secondary"
              size="xs"
              leadingIcon={RiRefreshLine}
              onClick={() => setRun((n) => n + 1)}
            >
              Restart
            </Button>
          </header>

          <div className="flex flex-1 flex-col gap-4 px-5 py-5">
            <p className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-background-secondary-default px-3.5 py-2.5 text-body-regular text-text-primary">
              Pull the churn reasons from last quarter&apos;s exit interviews and group them by plan.
            </p>
            <AgentThinking
              key={run}
              variant={variant}
              label={label}
              tone={tone === 'auto' ? undefined : tone}
              shimmer={shimmer}
              showTimer={showTimer}
            />
            <div
              aria-hidden
              className="mt-auto rounded-xl border border-border-table bg-background-secondary-default px-3.5 py-3 text-body-regular text-text-tertiary"
            >
              Ask a follow-up…
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-border-table px-5 py-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
              <SegmentedControl
                aria-label="Indicator"
                selectedKeys={[variant]}
                onSelectionChange={(keys) => {
                  const next = STATES.find((s) => keys.has(s.variant));
                  if (next) setVariant(next.variant);
                }}
              >
                {STATES.map((s) => (
                  <SegmentedControlItem key={s.variant} id={s.variant}>
                    {VARIANT_NAMES[s.variant]}
                  </SegmentedControlItem>
                ))}
              </SegmentedControl>
              <SegmentedControl
                aria-label="Tone"
                variant="plain"
                selectedKeys={[tone]}
                onSelectionChange={(keys) => {
                  const next = TONES.find((t) => keys.has(t.id));
                  if (next) setTone(next.id);
                }}
              >
                {TONES.map((t) => (
                  <SegmentedControlItem key={t.id} id={t.id}>
                    {t.name}
                  </SegmentedControlItem>
                ))}
              </SegmentedControl>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <Switch size="sm" isSelected={shimmer} onChange={setShimmer}>
                Shimmer
              </Switch>
              <Switch size="sm" isSelected={showTimer} onChange={setShowTimer}>
                Timer
              </Switch>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
