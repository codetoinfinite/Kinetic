'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Most Active Days Card" (boardui.com/components/most-active-days-card).
 * No BoardUI source was used.
 */

import { useMemo, useState, useSyncExternalStore } from 'react';
import { parseDate, type CalendarDate } from '@internationalized/date';

import { ActivityRingsCard } from '@/registry/ui/activity-rings-card';
import { MostActiveDaysCard, formatLongDate, sampleDayActivity } from '@/registry/ui/most-active-days-card';

const TODAY = parseDate('2026-07-10');
const NARROW = '(max-width: 639px)';

// Stacked on a phone, both cards shrink a little so the pair still fits the frame.
function subscribe(onChange: () => void) {
  const mql = window.matchMedia(NARROW);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}
const useNarrow = () =>
  useSyncExternalStore(subscribe, () => window.matchMedia(NARROW).matches, () => false);

export default function Demo() {
  const [day, setDay] = useState<CalendarDate>(TODAY);
  const activity = useMemo(() => sampleDayActivity(day), [day]);
  const narrow = useNarrow();

  return (
    <div className="grid w-full max-w-[744px] gap-3 sm:grid-cols-2" data-demo>
      <MostActiveDaysCard today={TODAY} selected={day} onSelectedChange={setDay} height={narrow ? 168 : 232} />
      <ActivityRingsCard
        title={`Activity for ${formatLongDate(day)}`}
        rings={activity.rings}
        size={narrow ? 120 : 184}
      />
    </div>
  );
}
