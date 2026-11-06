'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Chat Starter" (boardui.com/components/chat-starter).
 * No BoardUI source was used.
 */
import { RiSparklingLine, RiLightbulbLine, RiQuillPenLine } from "@remixicon/react";

import { ChatStarter, type ChatStarterSuggestion } from "@/registry/ui/chat-starter";

const SUGGESTIONS: ChatStarterSuggestion[] = [
  {
    label: "Explain this starter",
    prompt: "Explain what this starter does",
    icon: RiLightbulbLine,
    reply:
      "It is a chat screen with a sidebar, a pill composer and a model picker. Messages render here, and one server route would stream the answers once a key is set.",
  },
  {
    label: "Write a product update",
    prompt: "Write a product update in three sentences",
    icon: RiQuillPenLine,
    reply:
      "We shipped a faster composer this week. Suggestions now fill the field so you can edit before sending. Model choice sticks between chats.",
  },
  {
    label: "Name a scheduling app",
    prompt: "Give me five names for a scheduling app",
    icon: RiSparklingLine,
    reply: "Slotwise, Dayline, Tandem, Quorum and Nook.",
  },
];

export default function Demo() {
  return (
    <div className="h-full w-full bg-background-full">
      <ChatStarter apiKeyMissing suggestions={SUGGESTIONS} />
    </div>
  );
}
