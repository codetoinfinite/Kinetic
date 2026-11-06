/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "AI Profile" (boardui.com/templates/ai-profile).
 * No BoardUI source was used.
 */

import {
  RiAsterisk,
  RiBankLine,
  RiCalendarLine,
  RiChatAiLine,
  RiHomeLine,
  RiImageAiLine,
  RiKanbanView2,
  RiMegaphoneLine,
  RiUserSmileLine,
} from "@remixicon/react";
import type { RemixiconComponentType } from "@remixicon/react";
import type { AgentMonth, AgentUsage } from "@/registry/ui/agents-bar-card";
import type { ProfileCoverTone } from "@/registry/ui/profile-cover-header";
import type { TokenPeriod } from "@/registry/ui/tokens-chart-card";

/* ------------------------------------------------------------------ nav */

export type ProfileView =
  | "home"
  | "board"
  | "marketing"
  | "calendar"
  | "finance"
  | "medical"
  | "chat"
  | "images"
  | "profile";

export interface NavEntry {
  id: ProfileView;
  label: string;
  icon: RemixiconComponentType;
}

export const PROFILE_NAV: NavEntry[] = [
  { id: "home", label: "Home", icon: RiHomeLine },
  { id: "board", label: "Project board", icon: RiKanbanView2 },
  { id: "marketing", label: "Marketing", icon: RiMegaphoneLine },
  { id: "calendar", label: "Calendar", icon: RiCalendarLine },
  { id: "finance", label: "Finance", icon: RiBankLine },
  { id: "medical", label: "Medical Report", icon: RiAsterisk },
  { id: "chat", label: "AI Chat", icon: RiChatAiLine },
  { id: "images", label: "AI Image Generation", icon: RiImageAiLine },
  { id: "profile", label: "Profile", icon: RiUserSmileLine },
];

export const PROFILE_TEAMS = [
  { id: "board", name: "Board team", email: "board@example.com", initials: "B", color: "blue" as const },
  { id: "harbor", name: "Harbor Studio", email: "harbor@example.com", initials: "H", color: "lime" as const },
];

export interface ProfileDraft {
  name: string;
  /** Without the leading @. */
  handle: string;
  bio: string;
  coverTone: ProfileCoverTone;
}

export const SEED_PROFILE: ProfileDraft = {
  name: "Mara Ellison",
  handle: "maraellison",
  bio: "",
  coverTone: "sky",
};

/* ------------------------------------------------------------ seeded data */

/** Mulberry32: a small deterministic PRNG so every render draws the same numbers. */
function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export const ACTIVITY_WEEKS = 38;

/** The 266 days from Mon, Mar 30 to Sun, Dec 20 ("today"), built without Date. */
const DAYS: { short: string; long: string }[] = (() => {
  const out: { short: string; long: string }[] = [];
  let month = 2;
  let day = 30;
  for (let i = 0; i < ACTIVITY_WEEKS * 7; i++) {
    const short = `${MONTHS[month]} ${day}`;
    out.push({ short, long: `${WEEKDAYS[i % 7]}, ${short}` });
    day += 1;
    if (day > (MONTH_DAYS[month] ?? 31)) {
      day = 1;
      month += 1;
    }
  }
  return out;
})();

/* ------------------------------------------------------------- heatmap */

export type HeatRangeId = "weekly" | "monthly" | "yearly";

export interface HeatRange {
  id: HeatRangeId;
  label: string;
  rows: number;
  cols: number;
  /** Column-major: cell i sits in column floor(i / rows), row i % rows. */
  values: number[];
  cellLabel: (index: number) => string;
  span: string;
}

const dayRng = seeded(7);
const DAILY_RUNS = DAYS.map((_, i) => {
  const weekend = i % 7 >= 5;
  if (dayRng() < (weekend ? 0.45 : 0.16)) return 0;
  return Math.round(1 + dayRng() * (weekend ? 5 : 11));
});

const weekRng = seeded(11);
const WEEKLY_RUNS = Array.from({ length: 48 }, (_, i) => {
  const month = Math.floor(i / 4);
  if (month < 2) return Math.round(weekRng() * 6);
  return Math.round(14 + weekRng() * 42);
});

const ACTIVITY_YEARS = ["2024", "2025", "2026"] as const;
const yearRng = seeded(23);
const MONTHLY_RUNS = Array.from({ length: 36 }, (_, i) => {
  const year = i % 3;
  const month = Math.floor(i / 3);
  if (year === 0 && month < 4) return 0;
  const base = [24, 80, 150][year] ?? 0;
  return Math.round(base * (0.45 + yearRng() * 0.9));
});

export const HEAT_RANGES: HeatRange[] = [
  {
    id: "weekly",
    label: "Weekly",
    rows: 7,
    cols: ACTIVITY_WEEKS,
    values: DAILY_RUNS,
    cellLabel: (i) => DAYS[i]?.long ?? "",
    span: `the last ${ACTIVITY_WEEKS} weeks`,
  },
  {
    id: "monthly",
    label: "Monthly",
    rows: 4,
    cols: 12,
    values: WEEKLY_RUNS,
    cellLabel: (i) => `${MONTHS[Math.floor(i / 4)] ?? ""}, week ${(i % 4) + 1}`,
    span: "2026, week by week",
  },
  {
    id: "yearly",
    label: "Yearly",
    rows: 3,
    cols: 12,
    values: MONTHLY_RUNS,
    cellLabel: (i) => `${MONTHS[Math.floor(i / 3)] ?? ""} ${ACTIVITY_YEARS[i % 3] ?? ""}`,
    span: "2024 to 2026, month by month",
  },
];

/* -------------------------------------------------------------- agents */

const AGENT_NAMES = [
  "Atlas", "Beacon", "Cinder", "Delta", "Echo", "Fable", "Garnet", "Harbor", "Iris", "Juniper",
  "Kestrel", "Lumen", "Marlow", "Nimbus", "Onyx", "Pilot", "Quill", "Rune", "Sable", "Tide",
  "Umber", "Vesper", "Willow", "Wren", "Yarrow", "Zephyr", "Aster", "Bramble", "Comet", "Drift",
  "Ember", "Flint", "Grove", "Haze", "Indigo", "Jet", "Koi", "Lark", "Moss", "Nova",
] as const;

const AGENT_COLORS: NonNullable<AgentUsage["color"]>[] = ["neutral", "blue", "lime", "pink"];

function agentMonth(id: string, label: string, count: number, idle: number[], seed: number): AgentMonth {
  const rnd = seeded(seed);
  return {
    id,
    label,
    agents: AGENT_NAMES.slice(0, count).map((name, i) => ({
      id: name.toLowerCase(),
      name,
      color: AGENT_COLORS[i % AGENT_COLORS.length],
      value: idle.includes(i) ? 0 : Math.round(12 + rnd() * 140),
    })),
  };
}

/** Active agents (value > 0): October 28, November 30, December 32. */
export const AGENT_MONTHS: AgentMonth[] = [
  agentMonth("oct", "October", 34, [4, 9, 10, 17, 25, 30], 31),
  agentMonth("nov", "November", 37, [2, 11, 12, 13, 21, 28, 33], 37),
  agentMonth("dec", "December", 40, [3, 7, 8, 9, 16, 23, 24, 35], 41),
];

export const MONTH_SPAN: Record<string, [string, string]> = {
  oct: ["Oct 1", "Oct 31"],
  nov: ["Nov 1", "Nov 30"],
  dec: ["Dec 1", "Today"],
};

/* -------------------------------------------------------------- tokens */

const tokenRng = seeded(5);
/** One 90-day series; the shorter periods are its tail, so they always agree. */
const TOKEN_DAYS = DAYS.slice(-90).map((day, i) => ({
  label: day.short,
  value: (i >= 22 && i <= 25) || (i >= 64 && i <= 70) ? 0 : Math.round((4 + tokenRng() * 44) * 1e6),
}));

export const TOKEN_PERIODS: TokenPeriod[] = [
  { id: "7d", label: "7D", points: TOKEN_DAYS.slice(-7), trend: -3.2 },
  { id: "30d", label: "30D", points: TOKEN_DAYS.slice(-30), trend: 9.4 },
  { id: "90d", label: "90D", points: TOKEN_DAYS, trend: 21.6 },
];

/* --------------------------------------------------------- stats + feed */

export const PROFILE_TILES = [
  { id: "lifetime", label: "Lifetime tokens", value: "9B", detail: "Every token your agents have spent since you joined in 2023." },
  { id: "peak", label: "Peak tokens", value: "562.7M", detail: "Your busiest day was Oct 14, split across six agents." },
  { id: "longest", label: "Longest task", value: "12h 54m", detail: "Fable ran a full codebase migration in one sitting." },
  { id: "streak", label: "Top streak", value: "62 days", detail: "At least one run every day from Jul 2 to Sep 1." },
];

export interface ProfileEvent {
  id: string;
  kind: "agent" | "image" | "tokens" | "streak";
  title: string;
  meta: string;
}

export const PROFILE_EVENTS: ProfileEvent[] = [
  { id: "e1", kind: "agent", title: "Atlas finished “Refactor billing webhooks”", meta: "Today · 42 min · 1.8M tokens" },
  { id: "e2", kind: "image", title: "Generated 4 images for the spring campaign", meta: "Today · AI Image Generation" },
  { id: "e3", kind: "tokens", title: "Crossed 9B lifetime tokens", meta: "Yesterday" },
  { id: "e4", kind: "agent", title: "Fable opened a pull request in web-app", meta: "Yesterday · 12 files changed" },
  { id: "e5", kind: "streak", title: "Started a new streak", meta: "Dec 14 · 7 days so far" },
  { id: "e6", kind: "agent", title: "Nimbus summarised 38 support tickets", meta: "Dec 12 · 9 min" },
  { id: "e7", kind: "image", title: "Saved “Harbor at dusk” to the gallery", meta: "Dec 9" },
  { id: "e8", kind: "agent", title: "Quill drafted the Q1 release notes", meta: "Dec 6 · 1h 12m" },
  { id: "e9", kind: "tokens", title: "Peak week: 3.1B tokens", meta: "Nov 30" },
];

/* ---------------------------------------------------------- other views */

export interface WorkspacePageData {
  title: string;
  blurb: string;
  rows: { id: string; title: string; meta: string }[];
}

export const WORKSPACE_PAGES: Record<Exclude<ProfileView, "profile">, WorkspacePageData> = {
  home: {
    title: "Home",
    blurb: "Updates across your workspace.",
    rows: [
      { id: "h1", title: "Atlas finished “Refactor billing webhooks”", meta: "Agent run · 12 min ago" },
      { id: "h2", title: "Priya commented on “Launch checklist”", meta: "Project board · 1 h ago" },
      { id: "h3", title: "Invoice #2041 was paid", meta: "Finance · 3 h ago" },
      { id: "h4", title: "Spring campaign reached 12k views", meta: "Marketing · Yesterday" },
    ],
  },
  board: {
    title: "Project board",
    blurb: "Seven cards in progress across three columns.",
    rows: [
      { id: "b1", title: "Launch checklist", meta: "In progress · due Dec 22" },
      { id: "b2", title: "Billing webhooks", meta: "In review · Atlas" },
      { id: "b3", title: "Onboarding emails", meta: "To do · 3 subtasks" },
    ],
  },
  marketing: {
    title: "Marketing",
    blurb: "Two live campaigns and one draft.",
    rows: [
      { id: "m1", title: "Spring campaign", meta: "Live · 12.4k views" },
      { id: "m2", title: "Agent showcase video", meta: "Live · 3.1k views" },
      { id: "m3", title: "January newsletter", meta: "Draft" },
    ],
  },
  calendar: {
    title: "Calendar",
    blurb: "Three events this week.",
    rows: [
      { id: "c1", title: "Design review", meta: "Mon · 10:00" },
      { id: "c2", title: "Agent retro", meta: "Wed · 14:30" },
      { id: "c3", title: "Release sync", meta: "Fri · 09:00" },
    ],
  },
  finance: {
    title: "Finance",
    blurb: "Token spend and invoices for December.",
    rows: [
      { id: "f1", title: "Token spend", meta: "$1,284 this month" },
      { id: "f2", title: "Invoice #2041", meta: "Paid · $640" },
      { id: "f3", title: "Invoice #2042", meta: "Due Dec 28 · $812" },
    ],
  },
  medical: {
    title: "Medical Report",
    blurb: "Latest summaries prepared by your agents.",
    rows: [
      { id: "r1", title: "Quarterly wellness summary", meta: "Ready · Dec 18" },
      { id: "r2", title: "Lab results digest", meta: "Ready · Dec 2" },
    ],
  },
  chat: {
    title: "AI Chat",
    blurb: "Recent conversations.",
    rows: [
      { id: "a1", title: "Plan the Q1 roadmap", meta: "Fable · 2 h ago" },
      { id: "a2", title: "Explain the billing webhook retries", meta: "Atlas · Yesterday" },
      { id: "a3", title: "Draft a launch tweet", meta: "Quill · Dec 16" },
    ],
  },
  images: {
    title: "AI Image Generation",
    blurb: "Recent generations from your image threads.",
    rows: [
      { id: "i1", title: "Harbor at dusk", meta: "Saved to gallery · Dec 9" },
      { id: "i2", title: "Spring campaign hero", meta: "4 variations · Today" },
      { id: "i3", title: "Robot portrait, risograph", meta: "Draft · Dec 4" },
    ],
  },
};
