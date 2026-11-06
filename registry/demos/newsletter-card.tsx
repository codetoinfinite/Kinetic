'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Newsletter Card" (boardui.com/).
 * No BoardUI source was used.
 */
import { useState } from "react";
import { NewsletterCard } from "@/registry/ui/newsletter-card";
import type { NewsletterStatus } from "@/registry/ui/newsletter-card";

/* No network: the card's own 1.2s timer stands in for the request, and
   `onSubscribe` only refuses the reserved example.com domain so the error
   state can be reached. */
function subscribe(email: string) {
  if (email.toLowerCase().endsWith("@example.com")) {
    throw new Error("example.com is reserved for documentation and can't receive mail. Use a real inbox.");
  }
}

export default function Demo() {
  const [trail, setTrail] = useState<NewsletterStatus[]>(["idle"]);

  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <div className="flex w-full max-w-[760px] flex-col items-center gap-4">
        <NewsletterCard
          onSubscribe={subscribe}
          onStatusChange={(status) => setTrail((prev) => [...prev.slice(-4), status])}
        />
        <p data-trail="" className="text-center text-caption-1-regular text-text-tertiary">
          <span className="text-text-secondary">State:</span> {trail.join(" → ")}
          <span className="mx-2" aria-hidden>
            ·
          </span>
          Try name@example.com for the error state.
        </p>
      </div>
    </div>
  );
}
