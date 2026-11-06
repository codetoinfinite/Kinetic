'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Steps Card" (boardui.com/components/steps-card).
 * No BoardUI source was used.
 */

import { StepsCard } from '@/registry/ui/steps-card';

export default function Demo() {
  return (
    <div className="w-full max-w-[576px]" data-demo>
      <StepsCard />
    </div>
  );
}
