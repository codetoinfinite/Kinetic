/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "AI Chat" (boardui.com/templates/ai-chat).
 * No BoardUI source was used.
 */
import type { ComponentType, ReactNode } from "react";
import { Button as AriaButton } from "react-aria-components";

import { cx } from "@/registry/lib/cx";
import { Tooltip, TooltipTrigger } from "@/registry/ui/tooltip";

/* ------------------------------------------------------------------ types */

export type AiChatMode = "agent" | "ask" | "plan";
export type AiChatView = "chat" | "automations" | "customize";

export interface AiChatTurn {
  id: string;
  from: "user" | "assistant";
  text: string;
  time: string;
}

export interface AiChatThread {
  id: string;
  title: string;
  folderId: string;
  /** Short relative age shown in the sidebar chip, e.g. "34m". */
  age: string;
  turns: AiChatTurn[];
  pinned?: boolean;
}

export interface AiChatFolder {
  id: string;
  name: string;
}

export interface AiChatFile {
  id: string;
  path: string;
  added: number;
  removed: number;
  isNew: boolean;
  code: string;
}

/* --------------------------------------------------------------- fixtures */

export const AI_CHAT_FOLDERS: AiChatFolder[] = [
  { id: "boardui", name: "boardui" },
  { id: "vibl", name: "vibl coding project" },
  { id: "strider", name: "strider landing page work" },
  { id: "pirate", name: "pirate mini game iOS" },
];

const t = (id: string, from: AiChatTurn["from"], text: string, time: string): AiChatTurn => ({ id, from, text, time });

export const AI_CHAT_THREADS: AiChatThread[] = [
  {
    id: "pro-badge",
    title: "pro badge restyle",
    folderId: "boardui",
    age: "2h",
    turns: [
      t("pb1", "user", "The pro badge disappears on dark cards. Can you give it more contrast?", "08:41"),
      t("pb2", "assistant", "Done. The badge now uses `status-purple-background` with a 1px inner border, so it holds up on both card surfaces.", "08:42"),
    ],
  },
  {
    id: "install-docs",
    title: "installation docs page",
    folderId: "boardui",
    age: "1d",
    turns: [
      t("id1", "user", "Draft the installation page: requirements, install, first component.", "Tue"),
      t("id2", "assistant", "Drafted three sections with copyable commands. The first-component step links to the button page.", "Tue"),
    ],
  },
  {
    id: "landing",
    title: "landing page design",
    folderId: "vibl",
    age: "34m",
    turns: [
      t("lp1", "user", "Tighten the hero. One headline, one supporting line, one button.", "09:20"),
      t("lp2", "assistant", "The hero now has a 48px headline, a 17px line under it and a single primary button. The secondary link moved to the nav.", "09:21"),
    ],
  },
  {
    id: "image-gen",
    title: "image generation",
    folderId: "vibl",
    age: "now",
    turns: [
      t("ig1", "user", "Add a placeholder state for the image generator while a render is queued.", "09:52"),
      t("ig2", "assistant", "Queued renders now show a dithered placeholder with the prompt underneath and a cancel button.", "09:53"),
    ],
  },
  {
    id: "coding",
    title: "coding scenario",
    folderId: "vibl",
    age: "now",
    turns: [
      t(
        "cs1",
        "user",
        "update our color tokens for dark mode and add a reusable theme toggle to the registry. run lint and a production build when you're done.",
        "09:58",
      ),
    ],
  },
  {
    id: "mobile",
    title: "mobile app for vuejs starter",
    folderId: "vibl",
    age: "5h",
    turns: [
      t("ma1", "user", "Can the starter share tokens with the web app?", "05:10"),
      t("ma2", "assistant", "Yes. Export the tokens as a JSON file and read it from both builds; I added a script that writes it on install.", "05:11"),
    ],
  },
  {
    id: "refactor",
    title: "code refactor dropdown",
    folderId: "vibl",
    age: "18h",
    turns: [
      t("rf1", "user", "Split the dropdown into trigger, popover and item.", "Mon"),
      t("rf2", "assistant", "Split into three parts that share one context. The public API did not change.", "Mon"),
    ],
  },
  {
    id: "hero",
    title: "hero section animation",
    folderId: "strider",
    age: "3d",
    turns: [
      t("hs1", "user", "Make the hero headline rise in on load, but respect reduced motion.", "Sat"),
      t("hs2", "assistant", "The words rise 8px with a 40ms stagger. Under reduced motion they appear at once.", "Sat"),
    ],
  },
  {
    id: "pricing",
    title: "pricing table copy",
    folderId: "strider",
    age: "4d",
    turns: [
      t("pt1", "user", "Rewrite the pricing table copy so each plan says who it is for.", "Fri"),
      t("pt2", "assistant", "Each plan now opens with one line: solo makers, small teams, and companies with review rules.", "Fri"),
    ],
  },
  {
    id: "cannon",
    title: "cannon physics tuning",
    folderId: "pirate",
    age: "1w",
    turns: [
      t("cp1", "user", "Cannonballs fly too far. Tune the arc.", "Oct 29"),
      t("cp2", "assistant", "Gravity went from 9.8 to 14 and launch speed from 22 to 19. Shots land inside the visible map.", "Oct 29"),
    ],
  },
  {
    id: "sprites",
    title: "sprite sheet cleanup",
    folderId: "pirate",
    age: "2w",
    turns: [
      t("ss1", "user", "Remove the unused frames from the ship sprite sheet.", "Oct 22"),
      t("ss2", "assistant", "Removed 14 unused frames. The sheet went from 2048px to 1024px wide.", "Oct 22"),
    ],
  },
];

export const AI_CHAT_INITIAL_STEPS = [
  "Read project files",
  "Update and install light mode tokens",
  "Implement dark mode tokens",
  "Add reusable registered theme toggle",
  "Run registry, lint and production build",
];

export const AI_CHAT_FILES: AiChatFile[] = [
  {
    id: "button",
    path: "boardui/app/components/button.tsx",
    added: 74,
    removed: 0,
    isNew: true,
    code: `import type { Metadata } from "next";
import Link from "next/link";
import { ComponentDetail } from "@/components/docs/component-detail";
import { PreviewFrame } from "@/components/docs/preview-frame";

export const metadata: Metadata = {
  title: "Button",
  description:
    "Buttons in four variants and three sizes, with icons, a busy state and a link form.",
};

const PREVIEW_CODE = \`import { Button } from "@/registry/ui/button";\`;

export default function ButtonPage() {
  // Preview first, then props and the copyable source.
  return (
    <ComponentDetail slug="button" code={PREVIEW_CODE}>
      <PreviewFrame height={320} />
      <Link href="/components">All components</Link>
    </ComponentDetail>
  );
}`,
  },
  {
    id: "tokens",
    path: "boardui/styles/theme-tokens.css",
    added: 48,
    removed: 12,
    isNew: false,
    code: `/* Dark surfaces step up in lightness, never in saturation. */
.dark {
  --background-primary: var(--neutral-800);
  --background-secondary: var(--neutral-900);
  --text-primary: var(--neutral-50);
  --text-secondary: var(--neutral-400);
  --border-default: var(--neutral-700);
}`,
  },
  {
    id: "toggle",
    path: "boardui/registry/theme-toggle.tsx",
    added: 34,
    removed: 11,
    isNew: false,
    code: `"use client";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);
  return (
    <button type="button" aria-pressed={dark} onClick={() => setDark((d) => !d)}>
      {dark ? "Light" : "Dark"}
    </button>
  );
}`,
  },
];

/* ------------------------------------------------------- simulated agent */

const REPLIES: { match: RegExp; text: string }[] = [
  {
    match: /token|dark|theme|color/i,
    text: "Dark mode tokens are in place and the new `ThemeToggle` is registered. Surfaces step up in lightness instead of saturation, so cards stay readable. Lint passed with 0 problems and the production build finished in 41s.",
  },
  {
    match: /test|lint|build/i,
    text: "Lint passed with 0 problems. The production build finished in 38s and every route rendered without warnings.",
  },
  {
    match: /refactor|split|clean/i,
    text: "I split the file into three smaller modules and kept the exports the same, so nothing that imports it has to change.",
  },
];

const FALLBACK_REPLIES = [
  "Done. I read the related files first, made the smallest change that covers it, and left a note in the changes panel for each file I touched.",
  "Here is what changed: the logic moved into one helper, the UI only renders state, and the edge case with an empty list now shows a message instead of a blank panel.",
  "I checked the call sites before editing. Two places needed the new argument; both are updated and the build is green.",
];

export function replyFor(prompt: string, mode: AiChatMode, count: number): string {
  if (mode === "plan") {
    return "Plan: 1. Read the files the request touches. 2. List the smallest set of edits. 3. Apply them behind the existing API. 4. Run lint and a production build. Switch to Agent mode and send again to run it.";
  }
  const hit = REPLIES.find((r) => r.match.test(prompt));
  if (hit) return hit.text;
  return FALLBACK_REPLIES[count % FALLBACK_REPLIES.length] ?? FALLBACK_REPLIES[0]!;
}

export function stepsFor(prompt: string, mode: AiChatMode): string[] {
  if (mode === "ask") return [];
  if (mode === "plan") return ["Read project files", "Outline the edits"];
  const short = prompt.length > 28 ? `${prompt.slice(0, 28).trimEnd()}…` : prompt;
  return ["Read project files", `Apply: ${short}`, "Run lint and production build"];
}

/** File an agent run leaves behind in the changes panel. */
export function fileFor(prompt: string, run: number): AiChatFile {
  const safe = prompt.replace(/[`\\$]/g, "").slice(0, 60);
  return {
    id: `run-${run}`,
    path: `boardui/lib/agent-run-${run}.ts`,
    added: 9 + (prompt.length % 17),
    removed: run % 3,
    isNew: true,
    code: `// Written by the agent for: ${safe}
export const changeLog = [
  { run: ${run}, status: "applied", lint: "passed" },
];

export function lastRun() {
  return changeLog[changeLog.length - 1];
}`,
  };
}

/* --------------------------------------------------------------- helpers */

type IconComponent = ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;

/** 28px icon button with a kit tooltip. Shared by the sidebar, thread and changes panel. */
export function IconAction({
  label,
  icon: Icon,
  onPress,
  active,
  tip,
  className,
}: {
  label: string;
  icon: IconComponent;
  onPress: () => void;
  active?: boolean;
  /** Tooltip text when it differs from the accessible name. */
  tip?: ReactNode;
  className?: string;
}) {
  return (
    <TooltipTrigger>
      <AriaButton
        aria-label={label}
        aria-pressed={active}
        onPress={onPress}
        className={cx(
          "grid size-7 shrink-0 cursor-pointer place-items-center rounded-lg text-foreground-icon-secondary outline-none",
          "transition-[background-color,color] duration-150 ease-out motion-reduce:transition-none",
          "hover:bg-background-tertiary-default hover:text-foreground-icon-primary",
          "data-[focus-visible]:ring-2 data-[focus-visible]:ring-border-focus-ring",
          active && "bg-background-tertiary-default text-foreground-icon-primary",
          className,
        )}
      >
        <Icon className="size-4" aria-hidden />
      </AriaButton>
      <Tooltip placement="bottom">{tip ?? label}</Tooltip>
    </TooltipTrigger>
  );
}
