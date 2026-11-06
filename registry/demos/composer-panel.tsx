'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Composer Panel" (boardui.com/components/composer-panel).
 * No BoardUI source was used.
 */

import { RiAttachment2 } from "@remixicon/react";
import { useEffect, useRef, useState } from "react";

import { formatBytes } from "@/registry/ui/composer-attachments";
import { ComposerPanel, ComposerStatusTab, COMPOSER_PERMISSIONS, type ComposerPanelMessage } from "@/registry/ui/composer-panel";

interface Sent extends ComposerPanelMessage {
  id: number;
}

/** Each turn eats a little more of the window, so the tab's ring visibly moves. */
const BASE_CONTEXT = 57;
const CONTEXT_PER_TURN = 6;

export default function Demo() {
  const [sent, setSent] = useState<Sent[]>([]);
  const [voice, setVoice] = useState(false);
  const nextId = useRef(0);
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [sent.length]);

  const context = Math.min(99, BASE_CONTEXT + sent.length * CONTEXT_PER_TURN);

  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <div className="flex h-full max-h-[512px] w-full max-w-[640px] flex-col gap-4">
        {sent.length === 0 ? (
          <p className="m-auto max-w-xs text-center text-body-regular text-text-tertiary">
            Messages you send land here. Enter sends, Shift+Enter starts a new line.
          </p>
        ) : (
          <ol ref={listRef} aria-label="Sent messages" className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-1 py-1">
            {sent.map((m) => (
              <li
                key={m.id}
                className="ms-auto flex max-w-[85%] flex-col items-end gap-1 motion-safe:animate-[row-fade-in_240ms_ease-out_both]"
              >
                <p className="whitespace-pre-wrap break-words rounded-2xl bg-background-tertiary-default px-4 py-2.5 text-body-regular text-text-primary">
                  {m.text}
                </p>
                {m.attachments.length > 0 && (
                  <ul aria-label="Attached" className="flex flex-wrap justify-end gap-1">
                    {m.attachments.map((a) => (
                      <li
                        key={a.id}
                        className="flex items-center gap-1 rounded-full border border-composer-panel-tile-border px-2 py-0.5 text-body-2-regular text-text-secondary"
                      >
                        <RiAttachment2 className="size-3.5 text-foreground-icon-tertiary" aria-hidden />
                        {a.name}
                        <span className="text-text-tertiary tabular-nums">{formatBytes(a.size)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <span className="text-body-2-regular text-text-tertiary">
                  {m.model.name} · {COMPOSER_PERMISSIONS.find((p) => p.id === m.permission)?.label}
                </span>
              </li>
            ))}
          </ol>
        )}

        <ComposerPanel
          status={<ComposerStatusTab branch="Main" project="harbor-app" context={context} />}
          onSubmit={(message) => {
            nextId.current += 1;
            setSent((prev) => [...prev, { ...message, id: nextId.current }]);
          }}
          onVoice={() => setVoice((v) => !v)}
          voiceActive={voice}
          className="shrink-0"
        />
      </div>
    </div>
  );
}
