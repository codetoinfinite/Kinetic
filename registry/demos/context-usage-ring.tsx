'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Context Usage Ring" (boardui.com/templates/ai-chat).
 * No BoardUI source was used.
 */

import {
  RiArrowGoBackLine,
  RiAttachment2,
  RiChat3Line,
  RiCollapseDiagonalLine,
  RiFolderLine,
  RiGitBranchLine,
  RiTerminalBoxLine,
} from "@remixicon/react";
import { useState } from "react";

import { Button } from "@/registry/ui/button";
import {
  ContextUsageRing,
  contextLevel,
  formatTokens,
  type ContextSlice,
} from "@/registry/ui/context-usage-ring";

const LIMIT = 128_000;

interface Usage {
  system: number;
  messages: number;
  files: number;
  tools: number;
}

const START: Usage = { system: 3_200, messages: 14_000, files: 22_000, tools: 6_000 };

const total = (u: Usage) => u.system + u.messages + u.files + u.tools;

const slicesOf = (u: Usage): ContextSlice[] => [
  { label: "System prompt", tokens: u.system, tone: "accent" },
  { label: "Messages", tokens: u.messages, tone: "purple" },
  { label: "Files", tokens: u.files, tone: "cyan" },
  { label: "Tool output", tokens: u.tools, tone: "lime" },
];

const EXAMPLES: { title: string; used: number; breakdown: ContextSlice[] }[] = [
  {
    title: "Fresh chat",
    used: 15_400,
    breakdown: [
      { label: "System prompt", tokens: 3_200, tone: "accent" },
      { label: "Messages", tokens: 12_200, tone: "purple" },
    ],
  },
  {
    title: "Long session",
    used: 104_000,
    breakdown: [
      { label: "System prompt", tokens: 3_200, tone: "accent" },
      { label: "Messages", tokens: 41_800, tone: "purple" },
      { label: "Files", tokens: 59_000, tone: "cyan" },
    ],
  },
  {
    title: "Near the limit",
    used: 121_000,
    breakdown: [
      { label: "System prompt", tokens: 3_200, tone: "accent" },
      { label: "Messages", tokens: 52_800, tone: "purple" },
      { label: "Files", tokens: 48_000, tone: "cyan" },
      { label: "Tool output", tokens: 17_000, tone: "lime" },
    ],
  },
];

const LEVEL_WORD = { normal: "plenty of room", warning: "filling up", danger: "almost full" } as const;

export default function Demo() {
  const [usage, setUsage] = useState<Usage>(START);
  const used = total(usage);

  // Each action adds tokens to one slice, never past the window.
  const add = (key: keyof Usage, tokens: number) =>
    setUsage((u) => ({ ...u, [key]: u[key] + Math.max(0, Math.min(tokens, LIMIT - total(u))) }));

  // Compacting swaps old turns for a summary and drops stale tool output.
  const compact = () => setUsage((u) => ({ ...u, messages: Math.round(u.messages * 0.2), tools: 0 }));

  return (
    <div className="flex h-full w-full items-center justify-center p-3 sm:p-6">
      <div className="flex w-full max-w-[580px] flex-col gap-4">
        <section aria-label="Chat session" className="rounded-3xl bg-background-primary-default p-2 shadow-sm">
          <div className="flex items-center gap-1 px-2 py-1">
            <span className="flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 text-body-2-medium text-text-secondary">
              <RiGitBranchLine aria-hidden className="size-4 shrink-0 text-foreground-icon-tertiary" />
              <span className="truncate">main</span>
            </span>
            <span className="flex min-w-0 items-center gap-1.5 rounded-full px-2 py-1 text-body-2-medium text-text-secondary">
              <RiFolderLine aria-hidden className="size-4 shrink-0 text-foreground-icon-tertiary" />
              <span className="truncate">kinetic-web</span>
            </span>
            <ContextUsageRing used={used} limit={LIMIT} breakdown={slicesOf(usage)} className="ms-auto" />
          </div>

          <div className="mt-1 flex flex-col gap-3 rounded-2xl bg-background-secondary-default p-4">
            <p aria-live="polite" className="text-body-2-regular text-text-secondary">
              <span className="text-text-primary tabular-nums">{formatTokens(used)}</span> of {formatTokens(LIMIT)} tokens
              used, {LEVEL_WORD[contextLevel(used / LIMIT)]}.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="small" variant="secondary" leadingIcon={RiAttachment2} onClick={() => add("files", 18_000)}>
                Attach file
              </Button>
              <Button size="small" variant="secondary" leadingIcon={RiTerminalBoxLine} onClick={() => add("tools", 9_000)}>
                Run tool
              </Button>
              <Button size="small" variant="secondary" leadingIcon={RiChat3Line} onClick={() => add("messages", 4_000)}>
                Send message
              </Button>
              <Button size="small" variant="ghost" leadingIcon={RiCollapseDiagonalLine} onClick={compact}>
                Compact
              </Button>
              <Button
                size="small"
                variant="ghost"
                iconOnly
                leadingIcon={RiArrowGoBackLine}
                aria-label="Reset"
                onClick={() => setUsage(START)}
              />
            </div>
          </div>
        </section>

        <ul aria-label="Examples" className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {EXAMPLES.map((ex) => (
            <li
              key={ex.title}
              className="flex items-center justify-between gap-3 rounded-2xl bg-background-primary-default px-4 py-3 shadow-xs"
            >
              <span className="flex flex-col">
                <span className="text-body-2-medium text-text-primary">{ex.title}</span>
                <span className="text-caption-1-semibold text-text-tertiary tabular-nums">
                  {formatTokens(ex.used)} / {formatTokens(LIMIT)}
                </span>
              </span>
              <ContextUsageRing used={ex.used} limit={LIMIT} breakdown={ex.breakdown} hideLabel size={20} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
