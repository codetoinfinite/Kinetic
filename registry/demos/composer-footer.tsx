'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Composer Footer" (boardui.com/components/ai-chat).
 * No BoardUI source was used.
 */

import { useEffect, useRef, useState } from "react";

import { ComposerAttachments, attachmentsFromFiles, type ComposerAttachment } from "@/registry/ui/composer-attachments";
import { COMPOSER_TOOLS, ComposerFooter } from "@/registry/ui/composer-footer";
import { Kbd } from "@/registry/ui/kbd";
import { MODEL_OPTIONS, ModelSelect } from "@/registry/ui/model-select";

interface Turn {
  id: number;
  role: "user" | "assistant";
  text: string;
  stopped?: boolean;
}

const REPLIES = [
  "Here is a plan. First I will read the theme tokens and list every colour that is missing a dark value. Then I will add the missing pairs, run the type check and show you the diff before anything is committed.",
  "Short answer: yes. The footer keeps one button for both jobs, so the pointer never has to move to stop a reply. The ring around it spins only while text is still arriving.",
  "I looked at the three failing tests. Two expect the old date format and one mocks a timer that no longer exists. I can update the fixtures or bring the old format back behind a flag.",
];

/** Words per tick and tick length: a 40-word reply streams in a little over two seconds. */
const WORDS_PER_TICK = 1;
const TICK_MS = 55;

export default function Demo() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [files, setFiles] = useState<ComposerAttachment[]>([]);
  const [tools, setTools] = useState<string[]>(["web"]);
  const [model, setModel] = useState("swift-2");
  const [generating, setGenerating] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const nextId = useRef(0);
  const batch = useRef(0);
  const listRef = useRef<HTMLOListElement>(null);
  const fieldRef = useRef<HTMLTextAreaElement>(null);

  const clearTimer = () => {
    if (timer.current !== null) clearInterval(timer.current);
    timer.current = null;
  };
  useEffect(() => clearTimer, []);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns]);

  const canSend = draft.trim().length > 0;

  const send = () => {
    if (!canSend || generating) return;
    const userId = ++nextId.current;
    const replyId = ++nextId.current;
    const name = MODEL_OPTIONS.find((m) => m.id === model)?.name ?? "the model";
    const toolNames = COMPOSER_TOOLS.filter((t) => tools.includes(t.id)).map((t) => t.label.toLowerCase());
    const lead = `${name}${toolNames.length ? `, ${toolNames.join(" and ")} on` : ""}. `;
    const words = (lead + (REPLIES[(replyId >> 1) % REPLIES.length] ?? "")).split(" ");
    const attached = files.length ? ` [${files.map((f) => f.name).join(", ")}]` : "";

    setTurns((prev) => [
      ...prev,
      { id: userId, role: "user", text: draft.trim() + attached },
      { id: replyId, role: "assistant", text: "" },
    ]);
    setDraft("");
    setFiles([]);
    setGenerating(true);

    let shown = 0;
    clearTimer();
    timer.current = setInterval(() => {
      shown = Math.min(words.length, shown + WORDS_PER_TICK);
      const text = words.slice(0, shown).join(" ");
      setTurns((prev) => prev.map((t) => (t.id === replyId ? { ...t, text } : t)));
      if (shown >= words.length) {
        clearTimer();
        setGenerating(false);
      }
    }, TICK_MS);
  };

  const stop = () => {
    clearTimer();
    setGenerating(false);
    setTurns((prev) => prev.map((t, i) => (i === prev.length - 1 && t.role === "assistant" ? { ...t, stopped: true } : t)));
    fieldRef.current?.focus();
  };

  return (
    <div className="flex h-full w-full items-center justify-center p-3 sm:p-6">
      <div className="flex h-full max-h-[512px] w-full max-w-[680px] flex-col gap-4">
        {turns.length === 0 ? (
          <p className="m-auto max-w-xs text-center text-body-regular text-text-tertiary">
            Send a prompt to watch the send button turn into stop while the reply streams in.
          </p>
        ) : (
          <ol ref={listRef} aria-label="Conversation" className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-1 py-1">
            {turns.map((t) =>
              t.role === "user" ? (
                <li key={t.id} className="ms-auto max-w-[85%] whitespace-pre-wrap break-words rounded-2xl bg-background-tertiary-default px-4 py-2.5 text-body-regular text-text-primary">
                  {t.text}
                </li>
              ) : (
                <li key={t.id} data-role="assistant" className="max-w-[92%] text-body-regular text-text-primary">
                  {t.text}
                  {generating && t.id === turns[turns.length - 1]?.id && (
                    <span aria-hidden className="ms-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 rounded-sm bg-foreground-icon-tertiary motion-safe:animate-pulse" />
                  )}
                  {t.stopped && (
                    <span className="ms-2 rounded-sm bg-badge-neutral-background px-1.5 py-px text-caption-1-semibold text-text-secondary">
                      Stopped
                    </span>
                  )}
                </li>
              ),
            )}
          </ol>
        )}

        <div className="shrink-0 rounded-3xl bg-background-primary-default shadow-sm ring-1 ring-transparent transition-shadow duration-150 ease-out has-[textarea:focus-visible]:ring-border-focus-ring motion-reduce:transition-none">
          <ComposerAttachments
            attachments={files}
            onRemove={(id) => setFiles((prev) => prev.filter((f) => f.id !== id))}
            className="px-3 pt-3"
          />
          <textarea
            ref={fieldRef}
            aria-label="Prompt"
            rows={2}
            value={draft}
            placeholder="Ask me anything"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send();
              } else if (e.key === "Escape" && generating) {
                e.preventDefault();
                stop();
              }
            }}
            className="block w-full resize-none bg-transparent px-4 pt-3.5 pb-1 text-body-regular text-text-primary outline-none placeholder:text-text-placeholder"
          />
          <ComposerFooter
            onAttach={(picked) => {
              batch.current += 1;
              setFiles((prev) => [...prev, ...attachmentsFromFiles(picked, `f${batch.current}`)]);
            }}
            activeTools={tools}
            onToolsChange={setTools}
            model={<ModelSelect aria-label="Model" value={model} onChange={(id) => setModel(id)} className="min-w-0 @max-[26rem]:[&_[data-model-name]]:sr-only" />}
            hint={
              generating ? (
                <>
                  Writing a reply… <Kbd>Esc</Kbd> stops it
                </>
              ) : undefined
            }
            canSend={canSend}
            generating={generating}
            onSend={send}
            onStop={stop}
          />
        </div>
      </div>
    </div>
  );
}
