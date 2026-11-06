'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Support CTA Card" (boardui.com/).
 * No BoardUI source was used.
 */
import { useState } from "react";
import { RiDiscordFill, RiMailLine } from "@remixicon/react";
import { SupportCtaCard } from "@/registry/ui/support-cta-card";
import type { SupportPerson } from "@/registry/ui/support-cta-card";

const TEAM: SupportPerson[] = [
  { name: "Ada Park", initials: "AP", color: "blue" },
  { name: "Lin Okafor", initials: "LO", color: "lime" },
  { name: "Sam Ruiz", initials: "SR", color: "pink" },
  { name: "Noor Haddad", initials: "NH" },
  { name: "Theo Brandt", initials: "TB" },
];

export default function Demo() {
  const [asked, setAsked] = useState<"discord" | "email" | null>(null);

  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <div className="flex w-full max-w-[760px] flex-col items-center gap-6">
        <SupportCtaCard
          people={TEAM}
          actionLabel="Ask on Discord"
          actionIcon={RiDiscordFill}
          onAction={() => setAsked("discord")}
        />

        <SupportCtaCard
          className="max-w-[360px]"
          title="Need a hand with setup?"
          description="Write to the team and attach your config."
          people={TEAM.slice(0, 2)}
          actionLabel="Email support"
          actionIcon={RiMailLine}
          beam={false}
          onAction={() => setAsked("email")}
        />

        <p aria-live="polite" data-status="" className="min-h-5 text-body-regular text-text-tertiary">
          {asked === "discord"
            ? "Opening the #questions channel. Someone from the team will reply there."
            : asked === "email"
              ? "Opening a new email to support. Attach your config if you can."
              : "Pick either action to see its response here."}
        </p>
      </div>
    </div>
  );
}
