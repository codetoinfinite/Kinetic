'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Stacked Card Fan" (boardui.com/).
 * No BoardUI source was used.
 */
import { StackedCardFan } from "@/registry/ui/stacked-card-fan";
import { AGENT_DASHBOARD_CARDS } from "@/registry/ui/stacked-card-fan-cards";

export default function Demo() {
  return (
    <div className="flex min-h-full w-full flex-col items-center justify-center gap-5 p-6">
      <div className="w-full max-w-[900px]">
        <StackedCardFan
          items={AGENT_DASHBOARD_CARDS}
          expandLabel="See all five"
          aria-label="Agent dashboard cards"
        />
      </div>
      <p className="text-center text-caption-1-regular text-text-tertiary">
        Hover to fan out. Click the front card or use the arrow keys to cycle.
      </p>
    </div>
  );
}
