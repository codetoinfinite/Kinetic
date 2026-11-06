'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Chat Message Bubble" (boardui.com/templates/ai-chat).
 * No BoardUI source was used.
 */

import { useState } from "react";

import { ChatMessageBubble, type ChatFeedback } from "@/registry/ui/chat-message-bubble";

const FIRST_REPLIES = [
  "Wrap the list in `AnimatePresence` and give every row a stable `key`. A removed row keeps rendering until its `exit` animation ends.\n\nIf the list can re-sort, add `layout` to the rows so the others slide into the gap.",
  "Rows vanish because React unmounts them at once. Put the `map` inside `AnimatePresence`, key each row by its id rather than the index, and give it `exit={{ opacity: 0, height: 0 }}`.",
  "Keep the rows mounted for a moment: render them in `AnimatePresence`, use the item id as `key`, and set an `exit` animation. Add `mode=\"popLayout\"` if the neighbours should move while it leaves.",
];

const SECOND_REPLIES = [
  "Yes. Call `useReducedMotion()` once and, when it returns `true`, swap the slide for `exit={{ opacity: 0 }}`. Rows still fade out, they just don't move.",
  "It does if you check for it. `useReducedMotion()` returns `true` for those users, so use a plain fade as the `exit` and drop the `layout` slide.",
];

const REPLIES = { first: FIRST_REPLIES, second: SECOND_REPLIES };

type Reply = keyof typeof REPLIES;
type Rating = Record<Reply, ChatFeedback>;

const RATING_WORD = { like: "good", dislike: "bad" } as const;

export default function Demo() {
  const [version, setVersion] = useState<Record<Reply, number>>({ first: 0, second: 0 });
  const [rating, setRating] = useState<Rating>({ first: null, second: "like" });
  const [status, setStatus] = useState("Hover or focus a message to copy, regenerate or rate it.");

  const rate = (key: keyof Rating, label: string) => (value: ChatFeedback) => {
    setRating((r) => ({ ...r, [key]: value }));
    setStatus(value ? `Rated ${label} as ${RATING_WORD[value]}.` : `Cleared the rating on ${label}.`);
  };

  const regenerate = (key: Reply) => () => {
    const count = REPLIES[key].length;
    const next = (version[key] + 1) % count;
    setVersion((v) => ({ ...v, [key]: next }));
    // A new reply has not been rated yet.
    setRating((r) => ({ ...r, [key]: null }));
    setStatus(`Regenerated the ${key} reply (version ${next + 1} of ${count}).`);
  };

  const copied = (who: string) => () => setStatus(`Copied ${who} to the clipboard.`);

  return (
    <div className="flex h-full w-full items-center justify-center p-3 sm:p-6">
      <section
        aria-label="Conversation"
        className="flex max-h-full w-full max-w-[720px] flex-col overflow-hidden rounded-3xl bg-background-primary-default shadow-sm"
      >
        <header className="flex items-center justify-between gap-3 px-5 pt-4 pb-2">
          <h2 className="truncate text-body-medium text-text-primary">Animating list removals</h2>
          <span className="shrink-0 text-caption-1-regular text-text-tertiary">Today</span>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-2 sm:px-5">
          <ChatMessageBubble
            from="user"
            name="Ada Park"
            time="10:41"
            dateTime="10:41"
            text="Rows vanish instantly when I remove them from `items`. How do I animate them out?"
            onCopy={copied("Ada's message")}
          />
          <ChatMessageBubble
            from="assistant"
            time="10:41"
            dateTime="10:41"
            text={FIRST_REPLIES[version.first] ?? ""}
            feedback={rating.first}
            onFeedbackChange={rate("first", "the first reply")}
            onRegenerate={regenerate("first")}
            onCopy={copied("the first reply")}
          />
          <ChatMessageBubble
            from="user"
            name="Ada Park"
            time="10:43"
            dateTime="10:43"
            text="Does that still work for people who turn on reduced motion?"
            onCopy={copied("Ada's question")}
          />
          <ChatMessageBubble
            from="assistant"
            time="10:43"
            dateTime="10:43"
            text={SECOND_REPLIES[version.second] ?? ""}
            feedback={rating.second}
            onFeedbackChange={rate("second", "the second reply")}
            onRegenerate={regenerate("second")}
            onCopy={copied("the second reply")}
          />
        </div>

        <p aria-live="polite" className="border-t border-border-button-default px-5 py-3 text-caption-1-regular text-text-tertiary">
          {status}
        </p>
      </section>
    </div>
  );
}
