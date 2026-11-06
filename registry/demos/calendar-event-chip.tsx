'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Calendar Event Chip" (boardui.com/templates/calendar).
 * No BoardUI source was used.
 */

import { useState } from 'react';

import { CalendarEventChip } from '@/registry/ui/calendar-event-chip';
import type { CalendarEventColor } from '@/registry/ui/calendar-event-chip';

/* Every colour token in both variants. Compact chips sit in month-cell sized
   boxes (the second column is a narrow cell, so titles truncate while the
   time stays); full chips are time-grid blocks. Click any chip to select it. */

type Sample = { id: string; title: string; color: CalendarEventColor; start: [number, number]; end: [number, number] };

const SAMPLES: Sample[] = [
  { id: 'retro', title: 'Retro', color: 'blue', start: [15, 0], end: [16, 0] },
  { id: 'haircut', title: 'Haircut', color: 'emerald', start: [16, 0], end: [16, 45] },
  { id: 'coffee', title: 'Coffee with Lena', color: 'lime', start: [9, 30], end: [10, 0] },
  { id: 'standup', title: 'Stand-up', color: 'pink', start: [11, 30], end: [11, 45] },
  { id: 'lunch', title: 'Team lunch', color: 'purple', start: [13, 0], end: [14, 0] },
];

const t = ([hour, minute]: [number, number]) => ({ hour, minute });

export default function Demo() {
  const [selected, setSelected] = useState<string | null>('lunch');
  const toggle = (id: string) => setSelected((cur) => (cur === id ? null : id));

  return (
    <div className="flex w-full max-w-[1000px] flex-col gap-4 rounded-3xl bg-background-secondary-default p-3 sm:p-4">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)]">
        <section aria-label="Compact" className="flex flex-col gap-1.5 rounded-2xl bg-background-primary-default p-3">
          <h3 className="mb-1 text-caption-1-medium text-text-secondary">Compact</h3>
          {SAMPLES.map((s) => (
            <CalendarEventChip
              key={s.id}
              title={s.title}
              color={s.color}
              start={t(s.start)}
              selected={selected === s.id}
              aria-pressed={selected === s.id}
              onClick={() => toggle(s.id)}
            />
          ))}
          <CalendarEventChip title="Payday" color="lime" allDay aria-label="Payday, all day" />
        </section>

        <section aria-label="Narrow cell" className="flex flex-col gap-1.5 rounded-2xl bg-background-primary-default p-3">
          <h3 className="mb-1 text-caption-1-medium text-text-secondary">Narrow cell</h3>
          <div className="flex w-[104px] flex-col gap-1.5">
            {SAMPLES.map((s) => (
              <CalendarEventChip
                key={s.id}
                title={s.title}
                color={s.color}
                start={t(s.start)}
                selected={selected === s.id}
                tabIndex={-1}
                aria-hidden
                onClick={() => toggle(s.id)}
              />
            ))}
          </div>
        </section>

        <section aria-label="Full" className="flex flex-col gap-1.5 rounded-2xl bg-background-primary-default p-3">
          <h3 className="mb-1 text-caption-1-medium text-text-secondary">Full</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {SAMPLES.map((s, i) => (
              <div key={s.id} className={i === 0 ? 'h-[104px]' : i === 3 ? 'h-9' : 'h-[72px]'}>
                <CalendarEventChip
                  variant="full"
                  title={s.title}
                  color={s.color}
                  start={t(s.start)}
                  end={t(s.end)}
                  hourCycle={i % 2 === 0 ? 24 : 12}
                  selected={selected === s.id}
                  tabIndex={-1}
                  aria-hidden
                  onClick={() => toggle(s.id)}
                />
              </div>
            ))}
          </div>
        </section>
      </div>
      <p data-demo="status" className="px-1 text-body-2-regular text-text-secondary">
        {selected ? `Selected: ${SAMPLES.find((s) => s.id === selected)?.title}` : 'Nothing selected'}
      </p>
    </div>
  );
}
