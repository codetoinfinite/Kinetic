'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Radar Comparison Card" (boardui.com/).
 * No BoardUI source was used.
 */

import { RadarComparisonCard } from '@/registry/ui/radar-comparison-card';

/* Hover an axis to read both series in the legend; click "Desktop" or "Mobile"
   to hide that outline (the last one left stays on), and open the "H1 2024"
   pill to switch ranges. */
export default function Demo() {
  return (
    <div className="w-full max-w-[448px]">
      <RadarComparisonCard />
    </div>
  );
}
