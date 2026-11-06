/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Chat Starter" (boardui.com/components/chat-starter).
 * No BoardUI source was used.
 */
"use client";

import {
  RiArrowDownSLine,
  RiArrowUpLine,
  RiChatAiLine,
  RiCheckLine,
  RiDashboardLine,
  RiEditBoxLine,
  RiLayoutGridLine,
  RiLoginBoxLine,
  RiUserAddLine,
  type RemixiconComponentType,
} from "@remixicon/react";
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";

import { cx } from "@/registry/lib/cx";
import { AgentThinking } from "@/registry/ui/agent-thinking";
import { Button } from "@/registry/ui/button";
import { DashboardSidebar, type DashboardNavItem } from "@/registry/ui/dashboard-sidebar";
import {
  Dropdown,
  DropdownGroup,
  DropdownItem,
  DropdownPopover,
  DropdownTrigger,
} from "@/registry/ui/dropdown";

export interface ChatStarterSuggestion {
  /** Chip text. */
  label: string;
  /** Text placed in the composer. Defaults to `label`. */
  prompt?: string;
  icon?: RemixiconComponentType;
  /** Scripted answer used when exactly this prompt is sent. */
  reply?: string;
}

export interface ChatStarterProps {
  /** Show the "Add an API key to start" setup card instead of the composer. */
  apiKeyMissing?: boolean;
  /** Called when "Skip, show me the demo" is pressed. The card hides either way. */
  onSkip?: () => void;
  greeting?: string;
  subtitle?: string;
  suggestions?: ChatStarterSuggestion[];
  placeholder?: string;
  models?: string[];
  /** Called with the trimmed text on every send. */
  onSubmit?: (text: string) => void;
  /** Scripted answer for prompts that match no suggestion. */
  fallbackReply?: string;
  /** Delay before the scripted answer lands, in ms. */
  replyDelay?: number;
  /** Sidebar rows. Pass `null` to hide the sidebar. */
  navItems?: DashboardNavItem[] | null;
  className?: string;
}

export const CHAT_STARTER_NAV: DashboardNavItem[] = [
  { key: "chat", label: "Chat", icon: RiChatAiLine, href: "#" },
  { key: "dashboard", label: "Dashboard", icon: RiDashboardLine, href: "#" },
  { key: "components", label: "Components and Blocks", icon: RiLayoutGridLine, href: "#" },
  { key: "sign-in", label: "Sign in", icon: RiLoginBoxLine, href: "#" },
  { key: "sign-up", label: "Sign up", icon: RiUserAddLine, href: "#" },
];

const DEFAULT_MODELS = ["Swift 2", "Swift 2 Mini", "Deep 1"];
const DEFAULT_FALLBACK =
  "This starter is running without a model, so here is a scripted answer. Add a provider key and the same screen streams real replies.";
const MAX_LINES = 6;
const LINE_HEIGHT = 20;
/** py-2 on the textarea, counted by scrollHeight. */
const FIELD_PADDING_Y = 16;

type Message = { id: number; role: "user" | "assistant"; text: string };

function SetupCard({ onSkip }: { onSkip: () => void }) {
  return (
    <div className="w-full max-w-md rounded-2xl bg-background-primary-default p-6 shadow-card">
      <h2 className="text-headline-medium text-text-primary">Add an API key to start</h2>
      <p className="mt-2 text-body-regular text-text-secondary">
        The chat is wired up and ready. It needs a model provider key before it can answer.
      </p>
      <ol className="mt-4 flex list-decimal flex-col gap-1.5 ps-5 text-body-regular text-text-secondary">
        <li>Open your project on Vercel, then Settings, then Environment Variables.</li>
        <li>
          Add{" "}
          <code className="rounded-sm bg-background-tertiary-default px-1 font-mono text-caption-1-medium text-text-primary">
            AI_API_KEY
          </code>{" "}
          with a key from OpenAI, Anthropic, Google, OpenRouter, or Vercel AI Gateway.
        </li>
        <li>Redeploy.</li>
      </ol>
      <p className="mt-4 text-caption-1-regular text-text-tertiary">
        Running locally? Put the same variable in{" "}
        <code className="font-mono text-text-secondary">.env.local</code> and restart the dev server.
      </p>
      <Button variant="primary" size="medium" className="mt-5 w-full" onClick={onSkip}>
        Skip, show me the demo
      </Button>
    </div>
  );
}

export function ChatStarter({
  apiKeyMissing = false,
  onSkip,
  greeting = "What can I help with?",
  subtitle = "Ask anything, or start from one of these.",
  suggestions = [],
  placeholder = "Ask me anything",
  models = DEFAULT_MODELS,
  onSubmit,
  fallbackReply = DEFAULT_FALLBACK,
  replyDelay = 900,
  navItems = CHAT_STARTER_NAV,
  className,
}: ChatStarterProps) {
  const [skipped, setSkipped] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [thinking, setThinking] = useState(false);
  const [model, setModel] = useState(models[0] ?? "");
  const [modelOpen, setModelOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextId = useRef(0);
  const caretToEnd = useRef(false);

  const showSetup = apiKeyMissing && !skipped;
  const empty = messages.length === 0;
  const canSend = draft.trim().length > 0 && !thinking;

  // Grow the field with its content, up to MAX_LINES, then scroll.
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_LINES * LINE_HEIGHT + FIELD_PADDING_Y)}px`;
    if (caretToEnd.current) {
      caretToEnd.current = false;
      el.setSelectionRange(el.value.length, el.value.length);
    }
  }, [draft, showSetup]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, thinking]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  // #region critical
  const fillFromSuggestion = (s: ChatStarterSuggestion) => {
    const text = s.prompt ?? s.label;
    setDraft(text);
    // Focus now; the layout effect parks the caret at the end once the value lands.
    caretToEnd.current = true;
    inputRef.current?.focus();
  };

  const send = () => {
    const text = draft.trim();
    if (!text || thinking) return;
    onSubmit?.(text);
    const match = suggestions.find((s) => (s.prompt ?? s.label) === text);
    setMessages((m) => [...m, { id: nextId.current++, role: "user", text }]);
    setDraft("");
    setThinking(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setThinking(false);
      setMessages((m) => [
        ...m,
        { id: nextId.current++, role: "assistant", text: match?.reply ?? fallbackReply },
      ]);
    }, replyDelay);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends, Shift+Enter breaks the line; never send mid IME composition.
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };
  // #endregion

  const reset = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setThinking(false);
    setMessages([]);
    setDraft("");
    inputRef.current?.focus();
  };

  const skip = () => {
    setSkipped(true);
    onSkip?.();
  };

  return (
    <div className={cx("flex h-full w-full gap-3 bg-background-full p-3", className)}>
      {navItems && <DashboardSidebar items={navItems} selected="chat" className="hidden lg:flex" />}

      <section
        aria-label="Chat"
        className="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden rounded-3xl bg-background-secondary-default"
      >
        <header className="flex h-12 shrink-0 items-center justify-between gap-3 ps-5 pe-3">
          <h1 className="truncate text-headline-medium text-text-primary">New chat</h1>
          <button
            type="button"
            aria-label="Start a new chat"
            onClick={reset}
            disabled={showSetup || (empty && !draft)}
            className="grid size-8 place-items-center rounded-2lg text-foreground-icon-secondary outline-none transition-colors duration-150 ease-out hover:bg-background-tertiary-default hover:text-foreground-icon-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring disabled:pointer-events-none disabled:text-text-disabled motion-reduce:transition-none"
          >
            <RiEditBoxLine className="size-[18px]" aria-hidden />
          </button>
        </header>

        {showSetup ? (
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto p-4">
            <SetupCard onSkip={skip} />
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            {!empty && (
              <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4">
                <ol aria-label="Messages" className="mx-auto flex max-w-[720px] flex-col gap-5 py-6">
                  {messages.map((m) =>
                    m.role === "user" ? (
                      <li
                        key={m.id}
                        className="ms-auto max-w-[80%] whitespace-pre-wrap rounded-2xl bg-background-primary-default px-4 py-2.5 text-body-regular text-text-primary shadow-xs"
                      >
                        {m.text}
                      </li>
                    ) : (
                      <li
                        key={m.id}
                        data-role="assistant"
                        className="max-w-[90%] whitespace-pre-wrap text-body-regular text-text-primary motion-safe:animate-[row-fade-in_240ms_ease-out]"
                      >
                        {m.text}
                      </li>
                    ),
                  )}
                  {thinking && (
                    <li aria-live="polite">
                      <AgentThinking variant="wave" label="Thinking" />
                    </li>
                  )}
                </ol>
              </div>
            )}

            <div className={cx("mx-auto w-full max-w-[720px] px-4 pb-4", empty && "my-auto pb-10")}>
              {empty && (
                <div className="mb-6 text-center">
                  <h2 className="text-title-2-medium text-text-primary">{greeting}</h2>
                  {subtitle && <p className="mt-1.5 text-body-regular text-text-secondary">{subtitle}</p>}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
                className="flex items-end gap-2 rounded-[26px] bg-background-primary-default p-2 shadow-sm ring-1 ring-transparent transition-shadow duration-150 ease-out focus-within:ring-border-focus-ring motion-reduce:transition-none"
              >
                <textarea
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={onKeyDown}
                  rows={1}
                  aria-label="Message"
                  placeholder={placeholder}
                  className="block min-h-9 min-w-0 flex-1 resize-none self-center bg-transparent px-3 py-2 text-body-regular text-text-primary outline-none placeholder:text-text-placeholder"
                />
                <Dropdown isOpen={modelOpen} onOpenChange={setModelOpen}>
                  <DropdownTrigger
                    aria-label={`Model: ${model}`}
                    className="flex h-9 shrink-0 items-center gap-0.5 rounded-full px-2.5 text-body-medium text-text-secondary outline-none transition-colors duration-150 ease-out hover:bg-background-secondary-hover focus-visible:ring-2 focus-visible:ring-border-focus-ring"
                  >
                    <span className="max-[420px]:hidden">{model}</span>
                    <RiArrowDownSLine className="size-4 text-foreground-icon-tertiary" aria-hidden />
                  </DropdownTrigger>
                  <DropdownPopover aria-label="Choose a model" placement="top end" className="w-[220px]">
                    <DropdownGroup label="Model">
                      {models.map((m) => (
                        <DropdownItem
                          key={m}
                          className="text-body-regular"
                          selected={m === model}
                          onSelect={() => {
                            setModel(m);
                            setModelOpen(false);
                          }}
                        >
                          <span className="flex-1 text-start">{m}</span>
                          {m === model && (
                            <RiCheckLine className="size-4 text-foreground-icon-primary" aria-hidden />
                          )}
                        </DropdownItem>
                      ))}
                    </DropdownGroup>
                  </DropdownPopover>
                </Dropdown>
                <button
                  type="submit"
                  aria-label="Send message"
                  disabled={!canSend}
                  className="grid size-9 shrink-0 place-items-center rounded-full bg-button-primary text-text-white outline-none transition-[opacity,transform] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-border-focus-ring active:scale-95 disabled:text-button-primary-disabled-foreground disabled:active:scale-100 motion-reduce:transition-none motion-reduce:active:scale-100"
                >
                  <RiArrowUpLine className="size-[18px]" aria-hidden />
                </button>
              </form>

              {empty && suggestions.length > 0 && (
                <ul aria-label="Suggestions" className="mt-4 flex flex-wrap justify-center gap-2">
                  {suggestions.map((s) => {
                    const Icon = s.icon;
                    return (
                      <li key={s.label}>
                        <button
                          type="button"
                          onClick={() => fillFromSuggestion(s)}
                          className="flex items-center gap-1.5 rounded-full bg-background-primary-default px-3.5 py-2 text-body-regular text-text-secondary shadow-xs outline-none transition-colors duration-150 ease-out hover:bg-background-primary-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring motion-reduce:transition-none"
                        >
                          {Icon && <Icon className="size-4 text-foreground-icon-tertiary" aria-hidden />}
                          {s.label}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
