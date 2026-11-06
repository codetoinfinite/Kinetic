'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Models Picker" (boardui.com/).
 * No BoardUI source was used.
 */

import { useState } from 'react';

import { ModelsPicker, type ModelOption } from '@/registry/ui/models-picker';
import { Slider } from '@/registry/ui/slider';

/* Left: the agent's active model (a radio group) with an effort slider in
   the footer. Right: which models the composer offers (switches), with a
   search filter and the live "N of 8 enabled" count. */
const ACTIVE: ModelOption[] = [
  { id: 'composer', name: 'Composer 2.5', provider: 'Cursor', monogram: 'C' },
  { id: 'gpt-sol', name: 'GPT-5.6 Sol', provider: 'OpenAI', monogram: 'O', tone: 'teal' },
  { id: 'fable-5', name: 'Fable 5', provider: 'Anthropic', monogram: 'A', tone: 'orange' },
  { id: 'sonnet-5', name: 'Sonnet 5', provider: 'Anthropic', monogram: 'A', tone: 'orange' },
];

const ALL: ModelOption[] = [
  ...ACTIVE,
  { id: 'haiku-5', name: 'Haiku 5', provider: 'Anthropic', monogram: 'A', tone: 'orange' },
  { id: 'gpt-mini', name: 'GPT-5.6 Mini', provider: 'OpenAI', monogram: 'O', tone: 'teal' },
  { id: 'gemini', name: 'Gemini 3.5 Pro', provider: 'Google', monogram: 'G', tone: 'blue' },
  { id: 'grok', name: 'Grok 5', provider: 'xAI', monogram: 'X', tone: 'purple' },
];

const EFFORT = ['Low', 'Medium', 'High', 'Max'] as const;

export default function Demo() {
  const [active, setActive] = useState('fable-5');
  const [effort, setEffort] = useState(1);
  const [enabled, setEnabled] = useState(['composer', 'gpt-sol', 'fable-5', 'sonnet-5']);

  const activeName = ACTIVE.find((m) => m.id === active)?.name ?? '';
  const level = EFFORT[effort] ?? 'Medium';

  return (
    <div className="flex w-full max-w-[700px] flex-col gap-3">
      <div className="flex w-full flex-col items-start gap-3 sm:flex-row">
        <ModelsPicker models={ACTIVE} value={active} onChange={setActive} className="sm:max-w-[320px]">
          <div className="flex flex-col gap-1">
            <p className="text-body-medium text-text-secondary">
              Effort <span className="text-body-semibold text-text-primary">{level}</span>
            </p>
            <Slider
              aria-label="Effort"
              thumbLabel="Effort"
              showTooltip={false}
              minValue={0}
              maxValue={EFFORT.length - 1}
              step={1}
              value={effort}
              onChange={(v) => setEffort(v)}
            />
            <div className="flex justify-between text-caption-1-medium text-text-tertiary">
              <span>Faster</span>
              <span>Smarter</span>
            </div>
          </div>
        </ModelsPicker>

        <ModelsPicker
          selectionMode="multiple"
          label="In the composer"
          models={ALL}
          value={enabled}
          onChange={setEnabled}
          searchable
        />
      </div>
      <p className="px-1 text-caption-1-medium text-text-tertiary" aria-live="polite">
        Running {activeName} at {level.toLowerCase()} effort · {enabled.length} models offered
      </p>
    </div>
  );
}
