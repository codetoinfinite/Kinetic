/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Multi Agent Chat" (boardui.com/components/multi-agent-chat).
 * No BoardUI source was used.
 */
import type { ComponentType, ReactNode } from "react";
import { Button as AriaButton } from "react-aria-components";

import { cx } from "@/registry/lib/cx";
import { AGENT_COLORS, DEFAULT_AGENT_DRAFT, type AgentDraft } from "@/registry/ui/agent-creator";
import { PaperAvatar, type AgentFaceId, type AgentShapeId } from "@/registry/ui/agent-creator-avatar";
import type { RepoTreeNode } from "@/registry/ui/repo-tree-nav";
import type { Workspace } from "@/registry/ui/workspace-switcher";
import { Tooltip, TooltipTrigger } from "@/registry/ui/tooltip";

/* ------------------------------------------------------------------ types */

export interface MacAgent extends AgentDraft {
  id: string;
}

export interface MacMessage {
  id: string;
  /** "user" or the id of the agent that wrote it. */
  from: string;
  text: string;
  time: string;
}

export interface MacConversation {
  id: string;
  workspaceId: string;
  title: string;
  agentIds: string[];
  messages: MacMessage[];
  time: string;
  pinned?: boolean;
  unread?: number;
}

export interface MacPlugin {
  id: string;
  name: string;
  description: string;
  installed: boolean;
}

/* --------------------------------------------------------------- fixtures */

/** Paper colour by kit colour id; the hex feeds the SVG avatars only. */
export const hexOf = (id: string) => AGENT_COLORS.find((c) => c.id === id)?.hex ?? AGENT_COLORS[0]!.hex;

const agent = (
  id: string,
  name: string,
  label: string,
  description: string,
  shape: AgentShapeId,
  face: AgentFaceId,
  color: string,
  speed = "1",
): MacAgent => ({ ...DEFAULT_AGENT_DRAFT, id, name, label, description, shape, face, color: hexOf(color), speed });

export const MAC_AGENTS: MacAgent[] = [
  agent("designer", "landing page designer", "Design", "Thoughtful layouts, clear hierarchy, and a little personality.", "shield", "determined", "lime"),
  agent("reviewer", "content reviewer", "Editing", "Reads every draft twice and cuts what does not earn its place.", "tile", "calm", "orange"),
  agent("marketing", "marketing bot", "Marketing", "Finds the angle, writes the hook, plans the launch.", "star", "cheerful", "cyan", "1.25"),
  agent("seo", "seo bot", "SEO", "Structures pages so people and search engines find them.", "hexagon", "calm", "violet"),
  agent("research", "research assistant", "Research", "Plans interviews and turns notes into findings.", "circle", "curious", "green", "0.75"),
  agent("security", "Security agent", "Security", "Checks permissions, secrets and anything that touches auth.", "shield", "focused", "teal"),
  agent("planner", "Product planner", "Product", "Turns ideas into scoped milestones with owners.", "diamond", "smiling", "blue"),
];

export const MAC_WORKSPACES: Workspace[] = [
  { id: "board", name: "Board team", plan: "Pro plan", detail: "8 members", tone: "blue" },
  { id: "personal", name: "Personal", plan: "Free plan", detail: "Only you", tone: "lime" },
];

const m = (id: string, from: string, text: string, time: string): MacMessage => ({ id, from, text, time });

export const MAC_CONVERSATIONS: MacConversation[] = [
  { id: "group", workspaceId: "board", title: "Design + Marketing + Product", agentIds: ["designer", "marketing", "planner"], messages: [], time: "now" },
  {
    id: "c-designer",
    workspaceId: "board",
    title: "landing page designer",
    agentIds: ["designer"],
    time: "4m",
    messages: [
      m("d1", "user", "Look at the hero on the new landing page.", "09:12"),
      m("d2", "designer", "Give the hero one clear action. Two buttons of equal weight split attention; keep Start free and move the demo link to the nav.", "09:12"),
    ],
  },
  {
    id: "c-reviewer",
    workspaceId: "board",
    title: "content reviewer",
    agentIds: ["reviewer"],
    time: "1h",
    messages: [
      m("r1", "user", "Does the intro paragraph work?", "08:20"),
      m("r2", "reviewer", "The shorter opening feels more confident. Cut the first sentence and lead with the second.", "08:21"),
    ],
  },
  {
    id: "c-marketing",
    workspaceId: "board",
    title: "marketing bot",
    agentIds: ["marketing"],
    time: "3h",
    messages: [
      m("k1", "user", "What angle should the launch email take?", "06:40"),
      m("k2", "marketing", "Lead with the problem your reader has today, then the one change that fixes it. Save the feature list for the second paragraph.", "06:41"),
    ],
  },
  {
    id: "c-seo",
    workspaceId: "board",
    title: "seo bot",
    agentIds: ["seo"],
    time: "Mon",
    messages: [
      m("s1", "user", "How should we structure the docs for search?", "Mon"),
      m("s2", "seo", "Start with a practical guide per task, one per page, with the task in the title. Link related guides at the end of each.", "Mon"),
    ],
  },
  {
    id: "c-research",
    workspaceId: "board",
    title: "research assistant",
    agentIds: ["research"],
    time: "Sun",
    messages: [
      m("q1", "user", "What should we ask in customer interviews?", "Sun"),
      m("q2", "research", "Ask about the last time they did the task, not what they would do. Past behaviour beats predictions.", "Sun"),
    ],
  },
  {
    id: "c-security",
    workspaceId: "board",
    title: "Security agent",
    agentIds: ["security"],
    time: "Fri",
    messages: [
      m("x1", "user", "Audit the new API keys page.", "Fri"),
      m("x2", "security", "Review access permissions first: keys inherit the creator's role today. Scope them per project and add an expiry.", "Fri"),
    ],
  },
  {
    id: "p-trip",
    workspaceId: "personal",
    title: "Research + SEO",
    agentIds: ["research", "seo"],
    time: "2d",
    messages: [
      m("t1", "user", "Help me write a guide comparing two note-taking methods.", "Wed"),
      m("t2", "research", "Interview three people who switched methods in the last year; their reasons will shape the comparison.", "Wed"),
      m("t3", "seo", "Title it with the question people actually search, then answer it in the first paragraph.", "Wed"),
    ],
  },
  { id: "p-plan", workspaceId: "personal", title: "Product planner", agentIds: ["planner"], time: "1w", messages: [] },
];

export const MAC_MARKET_BOTS: MacAgent[] = [
  agent("copy-chief", "copy chief", "Copy", "Tightens headlines, buttons and every line of microcopy.", "pebble", "smug", "pink"),
  agent("a11y", "accessibility checker", "Accessibility", "Flags contrast, focus order and missing labels.", "circle", "focused", "blue", "1.25"),
  agent("analyst", "data analyst", "Data", "Reads the numbers and says what changed and why.", "hexagon", "skeptical", "red"),
];

export const MAC_PLUGINS: MacPlugin[] = [
  { id: "repo", name: "Repository sync", description: "Agents read the workspace files and comment on changes.", installed: true },
  { id: "calendar", name: "Calendar", description: "Planners can book reviews and launch dates.", installed: false },
  { id: "saving", name: "Browser saving", description: "Keeps conversations in this browser between visits.", installed: true },
  { id: "voice", name: "Voice replies", description: "Agents read their answers aloud with their own voice.", installed: false },
];

export const MAC_TREE: RepoTreeNode[] = [
  {
    id: "app",
    name: "app",
    children: [
      { id: "app/page.tsx", name: "page.tsx", status: "modified", additions: 12, deletions: 4 },
      { id: "app/pricing/page.tsx", name: "pricing.tsx", status: "added", additions: 88 },
    ],
  },
  {
    id: "components",
    name: "components",
    children: [
      { id: "components/hero.tsx", name: "hero.tsx", status: "modified", additions: 24, deletions: 9 },
      { id: "components/nav.tsx", name: "nav.tsx" },
    ],
  },
  {
    id: "content",
    name: "content",
    children: [
      { id: "content/launch-email.md", name: "launch-email.md", status: "added", additions: 36 },
      { id: "content/getting-started.md", name: "getting-started.md", status: "modified", additions: 18, deletions: 6 },
    ],
  },
  { id: "lib", name: "lib", children: [{ id: "lib/api-keys.ts", name: "api-keys.ts", status: "modified", additions: 14, deletions: 3 }] },
  { id: "package.json", name: "package.json" },
];

/** Which agent last touched each file, for the Files tab. */
export const MAC_FILE_OWNERS: Record<string, string> = {
  "app/page.tsx": "designer",
  "app/pricing/page.tsx": "planner",
  "components/hero.tsx": "designer",
  "content/launch-email.md": "marketing",
  "content/getting-started.md": "seo",
  "lib/api-keys.ts": "security",
};

/* ------------------------------------------------------- simulated agents */

const ROLE_REPLIES: Record<string, (topic: string) => string> = {
  Design: (t) => `From the design side, "${t}" needs one focal point. I would lead with a single headline, keep one primary button and let the rest step back in weight.`,
  Editing: (t) => `I read "${t}" twice. The second sentence is the real opening; cut the first and the paragraph reads 30% shorter with nothing lost.`,
  Marketing: (t) => `For "${t}", lead with the problem your reader already feels, then the one change that fixes it. That is the hook for the email and the landing page.`,
  SEO: (t) => `Put the question people search for in the title of "${t}" and answer it in the first paragraph. Related guides go in a short list at the end.`,
  Research: (t) => `Before we commit to "${t}", let us talk to five people who did it recently. Ask about the last time, not what they would do.`,
  Security: (t) => `Nothing in "${t}" should widen access. Scope any new keys per project, add an expiry, and log who created them.`,
  Product: (t) => `I can scope "${t}" into two milestones: a small version this week we can show people, then the polish once we hear back.`,
};

export function replyFor(a: MacAgent, prompt: string, count: number, plan: boolean): string {
  const clean = prompt.replace(/\s+/g, " ").trim();
  const topic = clean.length > 48 ? `${clean.slice(0, 48).trimEnd()}…` : clean;
  const role = ROLE_REPLIES[a.label];
  const body = role
    ? role(topic)
    : [
        `As the ${a.label.toLowerCase() || "new"} voice here: "${topic}" is doable. I would start small and check it with one real user.`,
        `On "${topic}": ${a.description || "I will take the first pass"} I will share a draft in this thread.`,
      ][count % 2]!;
  return plan ? `Plan only, nothing changed yet. ${body}` : body;
}

/* --------------------------------------------------------------- helpers */

type IconComponent = ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;

/** 28px icon button with a kit tooltip. */
export function MacIconAction({
  label,
  icon: Icon,
  onPress,
  active,
  className,
}: {
  label: string;
  icon: IconComponent;
  onPress: () => void;
  active?: boolean;
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
      <Tooltip placement="bottom">{label}</Tooltip>
    </TooltipTrigger>
  );
}

/** One paper avatar, or up to three gathered into a cluster the same size. */
export function AvatarCluster({
  agents,
  size,
  animated = false,
  className,
}: {
  agents: MacAgent[];
  size: number;
  animated?: boolean;
  className?: string;
}): ReactNode {
  const shown = agents.slice(0, 3);
  const only = shown[0];
  if (shown.length <= 1) {
    return (
      <span aria-hidden className={cx("inline-grid shrink-0 place-items-center", className)} style={{ width: size, height: size }}>
        {only && <PaperAvatar shape={only.shape} face={only.face} color={only.color} size={size} animated={animated} grain={size >= 64} />}
      </span>
    );
  }
  const part = Math.round(size * 0.6);
  const spots = [
    { left: 0, top: 0 },
    { left: size - part, top: shown.length === 2 ? size - part : 0 },
    { left: (size - part) / 2, top: size - part },
  ];
  return (
    <span aria-hidden className={cx("relative inline-block shrink-0", className)} style={{ width: size, height: size }}>
      {shown.map((a, i) => (
        <span key={a.id} className="absolute" style={spots[i]}>
          <PaperAvatar shape={a.shape} face={a.face} color={a.color} size={part} animated={animated} grain={false} />
        </span>
      ))}
    </span>
  );
}
