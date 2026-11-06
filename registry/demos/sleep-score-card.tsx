'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Sleep Score Card" (boardui.com/components/sleep-score-card).
 * No BoardUI source was used.
 */

import { SleepScoreCard } from '@/registry/ui/sleep-score-card';

export default function Demo() {
  return (
    <div className="w-full max-w-[448px]" data-demo>
      <SleepScoreCard />
    </div>
  );
}
