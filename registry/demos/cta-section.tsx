'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "CTA Section" (boardui.com/).
 * No BoardUI source was used.
 */
import { RiBox3Line, RiLayoutGridLine } from "@remixicon/react";
import { ButtonLink } from "@/registry/ui/button";
import { CtaSection } from "@/registry/ui/cta-section";
import { AGENT_DASHBOARD_CARDS } from "@/registry/ui/stacked-card-fan-cards";

export default function Demo() {
  return (
    <div className="flex h-full min-h-full w-full flex-col justify-center bg-background-primary-default">
      <CtaSection
        cards={AGENT_DASHBOARD_CARDS}
        fanProps={{ expandLabel: "See all five", "aria-label": "Agent dashboard cards" }}
        title="Start building agentic interfaces with Kinetic"
        description="Agent dashboards, chat surfaces and the controls around them. Copy the pieces you need into your app and own every line."
        actions={
          <>
            <ButtonLink href="#components" leadingIcon={RiBox3Line}>
              Browse components
            </ButtonLink>
            <ButtonLink href="#ai-chat" variant="secondary" leadingIcon={RiLayoutGridLine}>
              See the AI Chat template
            </ButtonLink>
          </>
        }
      />
    </div>
  );
}
