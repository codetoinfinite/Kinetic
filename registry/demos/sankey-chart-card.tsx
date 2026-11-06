'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Sankey Chart Card" (boardui.com/components/sankey-chart-card).
 * No BoardUI source was used.
 */

import { SankeyChartCard } from '@/registry/ui/sankey-chart-card';

/* A week of tracked time: what the hours were spent on (left) and in which
   apps (right). Hover a node or a ribbon to isolate its path; tab across the
   labels for the same with the keyboard. Change the period and the ribbons
   sweep in again. */
export default function Demo() {
  return (
    <div className="w-full max-w-[672px]" data-demo>
      <SankeyChartCard />
    </div>
  );
}
