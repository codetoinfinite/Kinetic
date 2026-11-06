'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Model Select" (boardui.com/components/composer-panel).
 * No BoardUI source was used.
 */

import { RiArrowUpLine } from "@remixicon/react";
import { useState } from "react";

import { MODEL_OPTIONS, ModelSelect } from "@/registry/ui/model-select";

const nameOf = (id: string) => MODEL_OPTIONS.find((m) => m.id === id)?.name ?? id;

export default function Demo() {
  const [chatModel, setChatModel] = useState("atlas-3");
  const [newChatModel, setNewChatModel] = useState("swift-2-mini");
  const chat = MODEL_OPTIONS.find((m) => m.id === chatModel);

  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <div className="flex w-full max-w-[560px] flex-col gap-6">
        <section aria-label="Composer" className="rounded-3xl bg-background-primary-default p-2 shadow-sm">
          <p className="px-3 pt-2.5 pb-4 text-body-regular text-text-placeholder">Ask me anything</p>
          <div className="flex items-center justify-end gap-2">
            <ModelSelect aria-label="Model for this chat" value={chatModel} onChange={(id) => setChatModel(id)} />
            <span
              aria-hidden
              className="grid size-9 shrink-0 place-items-center rounded-full bg-background-tertiary-default text-foreground-icon-tertiary"
            >
              <RiArrowUpLine className="size-[18px]" />
            </span>
          </div>
        </section>

        <div className="flex flex-col gap-4 rounded-2xl border border-border-button-default bg-background-primary-default p-4 sm:flex-row sm:items-end sm:justify-between">
          <ModelSelect
            label="Default for new chats"
            variant="outline"
            size="sm"
            defaultValue="swift-2-mini"
            onChange={(id) => setNewChatModel(id)}
          />
          <p aria-live="polite" className="text-body-2-regular text-text-secondary sm:max-w-[260px] sm:text-end">
            This chat runs on <span className="font-medium text-text-primary">{chat?.name}</span>
            {chat?.description ? ` (${chat.description.toLowerCase()})` : ""}. New chats start on{" "}
            <span className="font-medium text-text-primary">{nameOf(newChatModel)}</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
